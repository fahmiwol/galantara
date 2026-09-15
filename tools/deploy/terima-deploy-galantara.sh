#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# Penerima deploy statis Galantara, dipasang sebagai root di:
# /usr/local/sbin/terima-deploy-galantara
#
# Manual dan CI memakai jalur staging, backup, dan verifikasi yang sama.
# Kunci CI memakai command="/usr/local/sbin/terima-deploy-galantara",restrict.
# SSH_ORIGINAL_COMMAND hanya boleh berisi: coba <sha> atau jalankan <sha>.
# Pulihkan hanya tersedia melalui argv dari akses administrator biasa.
# Lihat docs/DEPLOY.md. Tidak ada kredensial di skrip ini.
# ═══════════════════════════════════════════════════════
set -euo pipefail
umask 077
export LC_ALL=C
unset TAR_OPTIONS

ROOT=/www/wwwroot/galantara.io
CADANGAN=/root/galantara-backup
FOLDER=(vendor assets data src)
HTML=(about.html admin.html benteng.html index.html) # index.html TERAKHIR
MODE=-; SHA=-; JUMLAH=0; BEDA=0; BACKUP=-; SUMBER=manual
STAGE=; T=

info() { printf '== %s\n' "$*"; }
gagal() { printf '!! %s\n' "$*" >&2; exit "${KODE_GAGAL:-1}"; }
bersihkan() {
  local kode=$?
  trap - EXIT
  set +e
  if [ "$kode" -ne 0 ]; then
    printf '!! Penerima berhenti dengan kode %s.\n' "$kode" >&2
  fi
  [ -z "$STAGE" ] || rm -rf -- "$STAGE"
  [ -z "$T" ] || rm -rf -- "$T"
  printf 'HASIL mode=%s sha=%s berkas=%s beda=%s backup=%s\n' \
    "$MODE" "$SHA" "$JUMLAH" "$BEDA" "$BACKUP"
  exit "$kode"
}
trap bersihkan EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Jangan eval perintah dari SSH: pecah sebagai data, tanpa ekspansi shell.
if [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then
  SUMBER=ci
  PERINTAH=${SSH_ORIGINAL_COMMAND//$'\n'/ }
  IFS=$' \t\r' read -r -a KATA <<< "$PERINTAH"
  [ "${#KATA[@]}" -eq 2 ] || gagal 'Perintah SSH harus tepat dua kata: coba|jalankan <sha>.'
  [ "${KATA[0]}" != pulihkan ] || gagal 'Mode pulihkan tidak diizinkan untuk kunci CI.'
  set -- "${KATA[@]}"
fi
[ "$#" -eq 2 ] || gagal 'Pakai: coba|jalankan <sha> atau pulihkan <nama-backup>.'
case "$1" in
  coba|jalankan)
    [[ "$2" =~ ^[0-9a-f]{7,40}$ ]] || gagal 'SHA tidak sah: wajib 7–40 angka heksadesimal kecil.'
    MODE=$1; SHA=$2 ;;
  pulihkan)
    [[ "$2" =~ ^galantara\.io-[0-9]{8}-[0-9]{6}\.tgz$ ]] || gagal 'Nama backup tidak sah.'
    MODE=$1; BACKUP=$2 ;;
  *) gagal 'Mode tidak dikenal; pilih coba, jalankan, atau pulihkan.' ;;
esac
[ "$EUID" -eq 0 ] || gagal 'Penerima harus dijalankan sebagai root.'
exec 9>/run/lock/galantara-deploy.lock
flock -n 9 || { KODE_GAGAL=75; gagal 'Deploy lain masih berjalan; coba lagi nanti.'; }
[ -d "$ROOT" ] && [ ! -L "$ROOT" ] || gagal 'Web root harus berupa direktori biasa.'
T=$(mktemp -d /www/wwwroot/.galantara-terima-XXXXXX)

bandingkan() {
  local asal=$1 pulih=${2:-0} f
  JUMLAH=0; BEDA=0
  find "$asal" -type f -print0 > "$T/berkas"
  while IFS= read -r -d '' f; do
    f=${f#"$asal/"}
    if [ "$pulih" = 1 ]; then
      case "/$f/" in */.user.ini/*|*/.well-known/*) continue ;; esac
    fi
    JUMLAH=$((JUMLAH+1))
    if ! cmp -s -- "$asal/$f" "$ROOT/$f"; then
      info "BEDA: $f"
      BEDA=$((BEDA+1))
    fi
  done < "$T/berkas"
  info "Dibandingkan bita per bita: $JUMLAH berkas, beda: $BEDA"
}
catat() {
  printf '%s mode=%s sha=%s berkas=%s beda=%s backup=%s sumber=%s\n' \
    "$(date -Is)" "$MODE" "$SHA" "$JUMLAH" "$BEDA" "$BACKUP" "$SUMBER" >> "$CADANGAN/DEPLOY.log"
}

if [ "$MODE" = pulihkan ]; then
  [ -f "$CADANGAN/$BACKUP" ] && [ ! -L "$CADANGAN/$BACKUP" ] || gagal 'Backup tidak ditemukan atau berupa symlink.'
  mkdir "$T/pulih"
  tar xzf "$CADANGAN/$BACKUP" -C "$T/pulih"
  [ -d "$T/pulih/galantara.io" ] && [ ! -L "$T/pulih/galantara.io" ] || gagal 'Backup tidak berisi direktori galantara.io.'
  rsync -rlpgoD --checksum --delete --exclude .user.ini --exclude .well-known \
    "$T/pulih/galantara.io/" "$ROOT/"
  bandingkan "$T/pulih/galantara.io" 1
  catat
  [ "$BEDA" -eq 0 ] || gagal 'Verifikasi pemulihan gagal; lihat DEPLOY.log.'
  info "Dipulihkan dari $BACKUP"
  exit 0
fi

# Baca paling banyak 64 MiB + 1 bita agar paket berlebih tidak menghabiskan disk.
BATAS=$((64*1024*1024))
head -c "$((BATAS+1))" > "$T/paket.tgz"
UKURAN=$(stat -c %s "$T/paket.tgz")
[ "$UKURAN" -gt 0 ] || gagal 'Paket tar.gz kosong.'
[ "$UKURAN" -le "$BATAS" ] || gagal 'Paket melebihi batas 64 MiB.'

# Daftar harus selesai dan sah sebelum ada ekstraksi. Escape membuat nama
# berkontrol/backslash terlihat; nama ambigu tersebut sengaja ditolak.
tar --quoting-style=escape -tzf "$T/paket.tgz" > "$T/nama" 2> "$T/galat-tar" || gagal 'Paket tar.gz tidak sah.'
tar --quoting-style=escape -tvzf "$T/paket.tgz" > "$T/jenis" 2> "$T/galat-tar" || gagal 'Jenis anggota tar tidak dapat dibaca.'
[ -s "$T/nama" ] || gagal 'Paket tar.gz tidak berisi anggota.'
while IFS= read -r f; do
  [[ "$f" =~ ^(index\.html|about\.html|admin\.html|benteng\.html|(src|data|assets|vendor)(/.*)?)$ ]] || gagal 'Ada anggota tar di luar daftar yang diizinkan.'
  case "$f" in /*|*\\*) gagal 'Nama anggota tar absolut atau ambigu ditolak.' ;; esac
  case "/$f/" in */../*) gagal 'Komponen .. di dalam tar ditolak.' ;; esac
done < "$T/nama"
while IFS= read -r baris; do
  case "${baris:0:1}" in
    -) JUMLAH=$((JUMLAH+1)) ;;
    d) ;;
    *) gagal 'Tar hanya boleh berisi berkas biasa dan direktori; tautan/perangkat ditolak.' ;;
  esac
done < "$T/jenis"

CALON_STAGE="/www/wwwroot/.galantara-stage-$SHA-$$"
mkdir -m 0700 "$CALON_STAGE"
STAGE=$CALON_STAGE
tar xzf "$T/paket.tgz" -C "$STAGE" --no-same-owner --no-same-permissions
# Paket wajib lengkap supaya --delete tidak berjalan dengan folder yang hilang.
for d in "${FOLDER[@]}"; do
  [ -d "$STAGE/$d" ] || gagal "Paket tidak lengkap: folder $d tidak ada."
  [ ! -L "$ROOT/$d" ] || gagal "Tujuan $d berupa symlink."
done
for f in "${HTML[@]}"; do
  [ -f "$STAGE/$f" ] || gagal "Paket tidak lengkap: $f tidak ada."
done
find "$STAGE" -type f -exec chmod 644 {} +
find "$STAGE" -type d -exec chmod 755 {} +
chown -R sidix:sidix "$STAGE"

info 'Ringkasan perubahan (baru / ubah / hapus):'
for d in "${FOLDER[@]}"; do
  rsync -rlpgoD --checksum --delete --dry-run --itemize-changes "$STAGE/$d/" "$ROOT/$d/" | awk -v d="$d" '
    /^\*deleting/ {h++; if (h<=20) print "== hapus " d "/" $2}
    /^>f\+\+\+/ {b++} /^>f[^+]/ {u++}
    END {printf "== %-7s baru=%d ubah=%d hapus=%d\n", d, b, u, h}'
done
for f in "${HTML[@]}"; do
  if [ ! -f "$ROOT/$f" ]; then info "$f baru";
  elif ! cmp -s "$STAGE/$f" "$ROOT/$f"; then info "$f berubah"; fi
done
if [ "$MODE" = coba ]; then
  # beda pada coba menunjukkan perbedaan saat ini, bukan kegagalan deploy.
  bandingkan "$STAGE"
  info 'Coba selesai, web root tidak disentuh.'
  exit 0
fi

mkdir -p "$CADANGAN"
BACKUP="galantara.io-$(date +%Y%m%d-%H%M%S).tgz"
[ ! -e "$CADANGAN/$BACKUP" ] || gagal 'Nama backup sudah ada; ulangi pada detik berikutnya.'
tar czf "$CADANGAN/$BACKUP" -C /www/wwwroot galantara.io
info "Backup: $CADANGAN/$BACKUP"
# Nama baku berurutan menurut waktu; jangan hapus arsip lain di direktori ini.
find "$CADANGAN" -maxdepth 1 -type f -name 'galantara.io-*.tgz' -printf '%f\n' | \
  LC_ALL=C sort -r > "$T/backup"
n=0
while IFS= read -r f; do
  [[ "$f" =~ ^galantara\.io-[0-9]{8}-[0-9]{6}\.tgz$ ]] || continue
  n=$((n+1))
  [ "$n" -le 10 ] || rm -- "$CADANGAN/$f"
done < "$T/backup"

# --checksum tanpa -t menjaga ETag berkas yang isinya tidak berubah.
for d in "${FOLDER[@]}"; do rsync -rlpgoD --checksum --delete "$STAGE/$d/" "$ROOT/$d/"; done
for f in "${HTML[@]}"; do rsync -rlpgoD --checksum "$STAGE/$f" "$ROOT/"; done
bandingkan "$STAGE"
catat
[ "$BEDA" -eq 0 ] || gagal "Verifikasi gagal; pulihkan dengan backup $BACKUP."
info 'Deploy statis selesai.'
