#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# tools/deploy-galantara.sh — deploy klien statis ke galantara.io (VPS-2)
#
# Kenapa skrip ini ada: 10–15 Sep 2026 kami mengira "belum ada server" karena
# workflow CI gagal `ssh ... port 22: Connection timed out`. Servernya ada: web
# root galantara.io dipindah ke VPS-2 (187.77.116.139, SSH port 2222) pada
# 7 Mei 2026, sedangkan secret CI diisi 13 April untuk server sebelumnya dan
# kunci deploy April tidak terdaftar di VPS-2. Deploy pertama sejak 13 April
# dikerjakan 16 Sep, lalu dijadikan skrip. Lihat docs/DEPLOY.md, ADR-0018/0020.
#
# Yang dikirim = commit HEAD yang SUDAH ada di origin, dengan akhir baris LF.
# Penerima bersama manual/CI menangani staging, backup, ringkasan, sinkron
# checksum tanpa -t, HTML terakhir, dan pembandingan setiap berkas.
# Skrip lokal kemudian membandingkan HTTPS dengan blob commit Git.
# Akses memakai alias ~/.ssh/config, bawaan trx-alt; tidak ada kredensial.
#
# Pakai:
#   bash tools/deploy-galantara.sh pasang-penerima # pasang/perbarui penerima root
#   bash tools/deploy-galantara.sh coba            # paket + staging + ringkasan
#   bash tools/deploy-galantara.sh jalankan        # uji → backup → sinkron → verifikasi
#   bash tools/deploy-galantara.sh pulihkan galantara.io-YYYYmmdd-HHMMSS.tgz
# Variabel: GALANTARA_SSH (bawaan trx-alt), TANPA_UJI=1 (lewati npm test).
# ═══════════════════════════════════════════════════════
set -euo pipefail

MODE="${1:-}"
SSH_ALIAS="${GALANTARA_SSH:-trx-alt}"
PENERIMA=/usr/local/sbin/terima-deploy-galantara
ISI=(index.html about.html admin.html benteng.html src data assets vendor)
KERJA=
cd "$(dirname "$0")/.."
ssh_() { ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_ALIAS" "$@"; }
gagal() { printf '!! %s\n' "$*" >&2; exit 1; }
trap '[ -z "$KERJA" ] || rm -rf -- "$KERJA"' EXIT

case "$MODE" in
  coba|jalankan|pasang-penerima) [ "$#" -eq 1 ] || gagal 'Mode ini tidak menerima argumen tambahan.' ;;
  pulihkan)
    [ "$#" -eq 2 ] || gagal 'Pakai: pulihkan galantara.io-YYYYmmdd-HHMMSS.tgz'
    [[ "$2" =~ ^galantara\.io-[0-9]{8}-[0-9]{6}\.tgz$ ]] || gagal 'Gunakan nama backup saja, tanpa path.' ;;
  *) sed -n '2,23p' "$0"; exit 2 ;;
esac

if [ "$MODE" = pasang-penerima ]; then
  bash -n tools/deploy/terima-deploy-galantara.sh
  LOKAL=$(sha256sum tools/deploy/terima-deploy-galantara.sh | cut -c1-64)
  TUJUAN="/tmp/terima-deploy-galantara-$LOKAL-$$.sh"
  echo '== Memasang penerima deploy root.'
  scp -q -o BatchMode=yes -o ConnectTimeout=20 tools/deploy/terima-deploy-galantara.sh "$SSH_ALIAS:$TUJUAN"
  # Tidak ada logika deploy di sini; hanya pemasangan berkas penerima.
  ssh_ "bash -n '$TUJUAN' && install -m 0755 -o root -g root '$TUJUAN' '$PENERIMA' && rm -f -- '$TUJUAN'"
  TERPASANG=$(ssh_ sha256sum "$PENERIMA" | cut -c1-64)
  [ "$LOKAL" = "$TERPASANG" ] || gagal 'SHA256 penerima terpasang berbeda dari salinan lokal.'
  echo "== Penerima terpasang, SHA256 $TERPASANG"
  exit 0
fi

if ! ssh_ test -x "$PENERIMA"; then
  gagal 'Penerima belum tersedia atau SSH gagal. Jalankan: bash tools/deploy-galantara.sh pasang-penerima'
fi
if [ "$MODE" = pulihkan ]; then
  ssh_ "$PENERIMA" pulihkan "$2"
  exit 0
fi

# ── 1. Yang dikirim harus commit yang bisa ditunjuk di GitHub ─────────
if [ -n "$(git status --porcelain -- "${ISI[@]}")" ]; then
  echo '!! Ada perubahan belum di-commit di berkas yang dideploy:' >&2
  git status --short -- "${ISI[@]}" >&2
  exit 1
fi
git fetch -q origin
SHA=$(git rev-parse --short HEAD)
if ! git branch -r --contains HEAD | grep -q 'origin/'; then
  gagal "HEAD $SHA belum ada di origin. Push dulu — live harus bisa ditunjuk ke commit GitHub."
fi
if [ "$MODE" = jalankan ] && [ "${TANPA_UJI:-0}" != 1 ]; then
  echo '== npm test'
  npm test --silent >/dev/null || gagal 'Uji gagal, deploy dibatalkan.'
fi

# ── 2. Paket dari HEAD ──────────────────────────────────────────────
KERJA=$(mktemp -d)
PAKET="galantara-$SHA.tgz"
# tar.umask 022: berkas 644 / folder 755, sama dengan isi web root sebelumnya.
# core.autocrlf=false + core.eol=lf: di Windows `git archive` MENERAPKAN konversi
# checkout, jadi deploy pertama (16 Sep, dfe86d2) mengirim HTML/JS ber-CRLF —
# jalan di browser, tapi tidak lagi sama bita dengan commit di GitHub. Tidak
# ketahuan karena pembandingnya berkas working tree yang juga CRLF.
git -c core.autocrlf=false -c core.eol=lf -c tar.umask=022 \
  archive --format=tar.gz -o "$KERJA/$PAKET" HEAD "${ISI[@]}"
JUMLAH=$(tar -tzf "$KERJA/$PAKET" | grep -vc '/$')
echo "== Paket $PAKET: $JUMLAH berkas, $(du -h "$KERJA/$PAKET" | cut -f1)"

# ── 3. Paket lewat stdin langsung ke penerima ────────────────────────
ssh_ "$PENERIMA" "$MODE" "$SHA" < "$KERJA/$PAKET"
[ "$MODE" = coba ] && exit 0

# ── 4. Dari luar, lewat HTTPS ────────────────────────────────────────
# Pembanding = blob commit (git cat-file), BUKAN berkas working tree: di Windows
# working tree ber-CRLF dan akan "cocok" dengan paket yang salah.
for f in index.html src/main.js src/fisika/Karakter.js; do
  u="/$f"; [ "$f" = index.html ] && u=/
  BLOB=$(git cat-file -p "HEAD:$f" | sha256sum | cut -c1-64)
  LIVE=$(curl -fsS --max-time 30 "https://galantara.io$u" | sha256sum | cut -c1-64)
  [ "$BLOB" = "$LIVE" ] || gagal "$f live BERBEDA dari blob HEAD."
  echo "== $f live = blob HEAD $SHA"
done
for u in /src/main.js /vendor/three.r128.min.js /vendor/rapier3d-compat.0.20.0.js /assets/spots/losari/manifest.json; do
  printf '== %-40s %s\n' "$u" "$(curl -s -o /dev/null --compressed --max-time 60 -w '%{http_code} %{size_download}B' "https://galantara.io$u")"
done
echo '== Selesai. Pengunjung build April perlu Ctrl+Shift+R sekali (lihat docs/DEPLOY.md).'
