#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# Deploy multiplayer Galantara ke /www/galantara-server di VPS-2 (trx-alt).
# Paket hanya index.js, package.json, package-lock.json dari commit di origin.
# Staging memasang dependensi dan menguji Socket.IO di port 39005 dahulu.
#
# ATURAN sakelar: stop galantara-mp, tukar direktori, bangunkan lewat URL
# publik /mp/. JANGAN pm2 restart aplikasi yang online (lihat docs/DEPLOY.md).
# Dua rename dalam filesystem yang sama; bila rename kedua gagal, pulihkan
# nama direktori lama. Backup berisi dependensi, jadi pulih tidak perlu npm ci.
#
# Pakai:
#   bash tools/deploy-mp-galantara.sh coba
#   bash tools/deploy-mp-galantara.sh jalankan
#   bash tools/deploy-mp-galantara.sh pulihkan [galantara-server.lama-YYYYmmdd-HHMMSS]
# Variabel: GALANTARA_SSH (bawaan trx-alt), TANPA_UJI=1 (lewati npm test).
# Tidak ada kredensial di sini; SSH memakai konfigurasi laptop Fahmi.
# ═══════════════════════════════════════════════════════
set -euo pipefail
MODE="${1:-}"
SSH_ALIAS="${GALANTARA_SSH:-trx-alt}"
ISI=(galantara-server/index.js galantara-server/package.json galantara-server/package-lock.json)
SHA=-; PAKET_REMOTE=-; PULIH=-; KERJA=
SSH_OPSI=(-o BatchMode=yes -o ConnectTimeout=20)
gagal() { printf '!! %s\n' "$*" >&2; exit 1; }
trap '[ -z "$KERJA" ] || rm -rf -- "$KERJA"' EXIT
cd "$(dirname "$0")/.."
case "$MODE" in
  coba|jalankan) [ "$#" -eq 1 ] || gagal 'Mode ini tidak menerima argumen tambahan.' ;;
  pulihkan)
    [ "$#" -le 2 ] || gagal 'Pakai: pulihkan [direktori-backup]'
    if [ "$#" -eq 2 ]; then
      PULIH=${2#/www/}
      [[ "$PULIH" =~ ^galantara-server\.lama-[0-9]{8}-[0-9]{6}$ ]] || gagal 'Nama direktori backup tidak sah.'
    fi ;;
  *) sed -n '2,19p' "$0"; exit 2 ;;
esac

if [ "$MODE" != pulihkan ]; then
  if [ -n "$(git status --porcelain -- "${ISI[@]}")" ]; then
    echo '!! Ada perubahan belum di-commit di berkas multiplayer:' >&2
    git status --short -- "${ISI[@]}" >&2
    exit 1
  fi
  git fetch -q origin
  SHA=$(git rev-parse --short HEAD)
  git branch -r --contains HEAD | grep -q 'origin/' || gagal "HEAD $SHA belum ada di origin; push dulu."
  if [ "${TANPA_UJI:-0}" != 1 ]; then
    echo '== npm test'
    npm test --silent >/dev/null || gagal 'Uji gagal, deploy multiplayer dibatalkan.'
  fi
  KERJA=$(mktemp -d)
  PAKET="galantara-mp-$SHA-$$.tgz"
  PAKET_REMOTE="/tmp/$PAKET"
  # Git archive di Windows menerapkan konversi checkout; paksa LF agar paket
  # sama bita dengan blob commit, bukan dengan working tree ber-CRLF.
  git -c core.autocrlf=false -c core.eol=lf -c tar.umask=022 \
    archive --format=tar.gz -o "$KERJA/$PAKET" HEAD "${ISI[@]}"
  echo "== Mengirim paket multiplayer $SHA ke staging."
  (cd "$KERJA" && scp -q "${SSH_OPSI[@]}" "$PAKET" "$SSH_ALIAS:$PAKET_REMOTE")
fi

# Semua argumen berasal dari whitelist/nama buatan skrip; isi heredoc tidak
# diekspansi laptop. Pekerjaan di bawah hanya dijalankan saat Fahmi memakai skrip.
ssh "${SSH_OPSI[@]}" "$SSH_ALIAS" bash -s -- "$MODE" "$SHA" "$PAKET_REMOTE" "$PULIH" <<'SERVER'
set -euo pipefail
umask 022
export LC_ALL=C
unset TAR_OPTIONS
MODE=$1; SHA=$2; PAKET=$3; PULIH=$4
ROOT=/www/galantara-server
CADANGAN=/root/galantara-backup
BAWAAN=/root/.nvm/versions/node/v20.20.2/bin
URL='https://galantara.io/mp/socket.io/?EIO=4&transport=polling'
STAGE=; T=; PID_ASAP=; BACKUP=-; PERLU_PULIH=0
info() { printf '== %s\n' "$*"; }
gagal() { printf '!! %s\n' "$*" >&2; exit 1; }
matikan_asap() {
  if [ -n "$PID_ASAP" ]; then
    kill "$PID_ASAP" 2>/dev/null || true
    # Jangan menunggu proses yang mengabaikan SIGTERM tanpa batas.
    for ((i=0; i<10; i++)); do
      kill -0 "$PID_ASAP" 2>/dev/null || break
      sleep 0.1
    done
    kill -KILL "$PID_ASAP" 2>/dev/null || true
    wait "$PID_ASAP" 2>/dev/null || true
    PID_ASAP=
  fi
}
bersihkan() {
  local kode=$?
  trap - EXIT
  set +e
  matikan_asap
  [ -z "$STAGE" ] || rm -rf -- "$STAGE"
  [ -z "$T" ] || rm -rf -- "$T"
  [ "$PAKET" = - ] || rm -f -- "$PAKET"
  if [ "$kode" -ne 0 ]; then
    printf '!! Deploy multiplayer berhenti dengan kode %s.\n' "$kode" >&2
    if [ "$PERLU_PULIH" -eq 1 ]; then
      printf '!! Pulihkan: bash tools/deploy-mp-galantara.sh pulihkan %s\n' "${BACKUP##*/}" >&2
    fi
  fi
  exit "$kode"
}
trap bersihkan EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[ "$EUID" -eq 0 ] || gagal 'Deploy multiplayer harus berjalan sebagai root.'
exec 9>/run/lock/galantara-mp-deploy.lock
flock -n 9 || { echo '!! Deploy multiplayer lain masih berjalan.' >&2; exit 75; }
[ -d "$ROOT" ] && [ ! -L "$ROOT" ] || gagal 'Direktori multiplayer tidak ada atau berupa symlink.'
T=$(mktemp -d /www/.galantara-mp-XXXXXX)
mkdir -p "$CADANGAN"

# PM2 perlu node di PATH bahkan sebelum exec_interpreter dapat dibaca.
export PATH="$BAWAAN:$PATH"
pm2 jlist > "$T/pm2.json"
NODE_BIN=$(python3 -c '
import json, os, sys
apps = [a for a in json.load(sys.stdin) if a.get("name") == "galantara-mp"]
if len(apps) != 1:
    sys.exit("!! Harus ada tepat satu aplikasi PM2 galantara-mp.")
p = apps[0].get("pm2_env", {}).get("exec_interpreter", "")
print(os.path.dirname(p) if isinstance(p, str) and os.path.isabs(p) else sys.argv[1])
' "$BAWAAN" < "$T/pm2.json")
if [ ! -x "$NODE_BIN/node" ] || [ ! -x "$NODE_BIN/npm" ]; then NODE_BIN=$BAWAAN; fi
[ -x "$NODE_BIN/node" ] && [ -x "$NODE_BIN/npm" ] || gagal 'Node/npm PM2 dan fallback tidak tersedia.'
export PATH="$NODE_BIN:$PATH"
NODE="$NODE_BIN/node"
NPM="$NODE_BIN/npm"
info "Node/npm: $NODE_BIN"

daftar_backup() {
  find /www -maxdepth 1 -type d -name 'galantara-server.lama-*' -printf '%f\n' | \
    LC_ALL=C sort -r > "$T/backup"
}
pangkas_backup() {
  local n=0 d
  daftar_backup
  while IFS= read -r d; do
    [[ "$d" =~ ^galantara-server\.lama-[0-9]{8}-[0-9]{6}$ ]] || continue
    n=$((n+1))
    [ "$n" -le 3 ] || rm -rf -- "/www/$d"
  done < "$T/backup"
}
bangunkan() {
  local akhir=$((SECONDS+90)) sisa batas jawaban
  info 'Membangunkan lewat URL publik sakelar (maksimal 90 detik).'
  while [ "$SECONDS" -lt "$akhir" ]; do
    sisa=$((akhir-SECONDS)); batas=$((sisa<5 ? sisa : 5))
    jawaban=$(curl -fsS --connect-timeout "$batas" --max-time "$batas" "$URL" 2>/dev/null) || jawaban=
    if [[ "$jawaban" == *'"sid"'* ]]; then
      if pm2 jlist > "$T/pm2.json" && python3 -c '
import json, sys
apps = [a for a in json.load(sys.stdin) if a.get("name") == "galantara-mp"]
sys.exit(0 if len(apps) == 1 and apps[0].get("pm2_env", {}).get("status") == "online" else 1)
' < "$T/pm2.json"; then
        info "Handshake publik: $jawaban"
        info 'PM2 galantara-mp online.'
        return 0
      fi
    fi
    [ "$SECONDS" -ge "$akhir" ] || sleep 1
  done
  return 1
}
tukar() {
  local asal=$1
  [ -d "$asal" ] && [ ! -L "$asal" ] || gagal 'Direktori pengganti tidak sah.'
  [ "$(stat -c %d "$asal")" = "$(stat -c %d "$ROOT")" ] && \
    [ "$(stat -c %d "$ROOT")" = "$(stat -c %d /www)" ] || gagal 'Pertukaran harus berada di filesystem yang sama.'
  BACKUP="/www/galantara-server.lama-$(date +%Y%m%d-%H%M%S)"
  [ ! -e "$BACKUP" ] && [ ! -L "$BACKUP" ] || gagal 'Nama backup sudah ada; ulangi pada detik berikutnya.'
  # Stop dahulu. Setiap mv adalah rename lokal, bukan salin lintas filesystem.
  pm2 stop galantara-mp
  if ! mv -T -- "$ROOT" "$BACKUP"; then
    bangunkan || true
    gagal 'Direktori lama gagal dipindahkan.'
  fi
  PERLU_PULIH=1
  if ! mv -T -- "$asal" "$ROOT"; then
    if mv -T -- "$BACKUP" "$ROOT"; then
      PERLU_PULIH=0
      bangunkan || echo '!! Direktori lama kembali, tetapi sakelar belum berhasil menyalakan.' >&2
    else
      echo "!! Nama direktori gagal dipulihkan; administrator perlu mengembalikan $BACKUP ke $ROOT." >&2
    fi
    gagal 'Pertukaran gagal; direktori baru belum aktif.'
  fi
  if [ "$asal" = "$STAGE" ]; then STAGE=; fi
}
catat() {
  printf '%s deploy-mp %s mode=%s hasil=%s backup=%s pulih=%s\n' \
    "$(date -Is)" "$SHA" "$MODE" "$1" "${BACKUP##*/}" "$PULIH" >> "$CADANGAN/DEPLOY.log"
}

if [ "$MODE" = pulihkan ]; then
  if [ "$PULIH" = - ]; then
    daftar_backup
    while IFS= read -r d; do
      [[ "$d" =~ ^galantara-server\.lama-[0-9]{8}-[0-9]{6}$ ]] || continue
      PULIH=$d; break
    done < "$T/backup"
  fi
  [ "$PULIH" != - ] || gagal 'Tidak ada backup multiplayer.'
  for f in index.js package.json package-lock.json; do
    [ -f "/www/$PULIH/$f" ] || gagal "Backup tidak lengkap: $f."
  done
  info "Memulihkan $PULIH"
  tukar "/www/$PULIH"
else
  [[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || gagal 'SHA multiplayer tidak sah.'
  CALON_STAGE="/www/.galantara-server-stage-$SHA"
  mkdir -m 0755 "$CALON_STAGE"
  STAGE=$CALON_STAGE
  tar xzf "$PAKET" -C "$STAGE" --strip-components=1 --no-same-owner --no-same-permissions
  (cd "$STAGE" && "$NPM" ci --omit=dev --no-audit --no-fund)
  info 'Uji asap Socket.IO di port 39005 (maksimal 15 detik).'
  # Tolak port yang sudah terpakai agar sid proses lain tidak meluluskan staging.
  python3 -c '
import socket, sys
try:
    with socket.socket() as s:
        s.bind(("0.0.0.0", 39005))
except OSError:
    sys.exit("!! Port uji asap 39005 sedang dipakai.")
'
  (cd "$STAGE" && exec env PORT=39005 "$NODE" index.js) > "$T/asap.log" 2>&1 9>&- &
  PID_ASAP=$!
  AKHIR=$((SECONDS+15)); SIAP=0
  while [ "$SECONDS" -lt "$AKHIR" ]; do
    kill -0 "$PID_ASAP" 2>/dev/null || break
    SISA=$((AKHIR-SECONDS)); BATAS=$((SISA<2 ? SISA : 2))
    JAWABAN=$(curl -s --max-time "$BATAS" 'http://127.0.0.1:39005/socket.io/?EIO=4&transport=polling') || JAWABAN=
    if [[ "$JAWABAN" == *'"sid"'* ]] && kill -0 "$PID_ASAP" 2>/dev/null; then SIAP=1; break; fi
    [ "$SECONDS" -ge "$AKHIR" ] || sleep 1
  done
  matikan_asap
  [ "$SIAP" -eq 1 ] || gagal 'Uji asap tidak mendapat sid; direktori produksi belum ditukar.'
  for f in index.js package.json; do
    LAMA=$(sha256sum "$ROOT/$f" | cut -c1-64)
    BARU=$(sha256sum "$STAGE/$f" | cut -c1-64)
    info "$f lama=$LAMA baru=$BARU"
  done
  if [ "$MODE" = coba ]; then info 'Coba selesai; staging dibersihkan.'; exit 0; fi
  tukar "$STAGE"
fi

if ! bangunkan; then
  catat gagal-bangun
  gagal 'Sakelar tidak berhasil membangunkan multiplayer dalam 90 detik.'
fi
catat online
PERLU_PULIH=0
pangkas_backup
info "Multiplayer selesai; backup ${BACKUP##*/}."
SERVER

if [ "$MODE" = jalankan ] || [ "$MODE" = pulihkan ]; then
  echo '== Handshake publik dari laptop:'
  HANDSHAKE=$(curl -fsS --max-time 15 'https://galantara.io/mp/socket.io/?EIO=4&transport=polling')
  [[ "$HANDSHAKE" == *'"sid"'* ]] || gagal 'Handshake publik dari laptop tidak memuat sid.'
  printf '== %s\n' "$HANDSHAKE"
fi
