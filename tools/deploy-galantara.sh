#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# tools/deploy-galantara.sh — deploy klien statis ke galantara.io (VPS-2)
#
# Kenapa skrip ini ada: 10–15 Sep 2026 kami mengira "belum ada server" karena
# workflow CI gagal `ssh ... port 22: Connection timed out`. Servernya ada
# (VPS-2, 187.77.116.139); SSH-nya di port 2222. Deploy pertama sejak 13 April
# dikerjakan 16 Sep dengan langkah di bawah, lalu dijadikan skrip supaya tidak
# perlu ditemukan ulang. Lihat docs/DEPLOY.md dan ADR-0018.
#
# Yang dijamin:
# - Yang dikirim = commit HEAD yang SUDAH ada di origin (bukan working tree).
# - Backup web root sebelum ada yang ditimpa.
# - Folder dulu, HTML terakhir: index.html baru merujuk /vendor/*.js baru.
# - --checksum tanpa -t: berkas yang isinya sama tidak disentuh, jadi ETag-nya
#   tetap dan pengunjung mendapat 304, bukan unduh ulang.
# - Setiap berkas paket dibandingkan bita per bita dengan yang dilayani.
#
# Tidak ada kredensial di sini: akses lewat alias SSH di ~/.ssh/config
# (bawaan `trx-alt`: HostName 187.77.116.139, Port 2222).
#
# Pakai:
#   tools/deploy-galantara.sh coba               # paket + staging + ringkasan, web root tidak disentuh
#   tools/deploy-galantara.sh jalankan           # uji → backup → sinkron → verifikasi
#   tools/deploy-galantara.sh pulihkan <berkas>  # kembalikan backup dari /root/galantara-backup/
# Variabel: GALANTARA_SSH (alias, bawaan trx-alt), TANPA_UJI=1 (lewati npm test).
# ═══════════════════════════════════════════════════════
set -euo pipefail

MODE="${1:-}"
SSH_ALIAS="${GALANTARA_SSH:-trx-alt}"
ROOT_WEB=/www/wwwroot/galantara.io
PEMILIK=sidix:sidix
ISI=(index.html about.html admin.html benteng.html src data assets vendor)
FOLDER=(vendor assets data src)
HTML=(about.html admin.html benteng.html index.html)   # index.html TERAKHIR

cd "$(dirname "$0")/.."
ssh_() { ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_ALIAS" "$@"; }

case "$MODE" in
  coba|jalankan) ;;
  pulihkan)
    BERKAS="${2:?pakai: pulihkan /root/galantara-backup/galantara.io-YYYYmmdd-HHMMSS.tgz}"
    ssh_ "bash -s" <<EOF
set -euo pipefail
test -f "$BERKAS"
T=\$(mktemp -d /www/wwwroot/.galantara-pulih-XXXX)
tar xzf "$BERKAS" -C "\$T"
rsync -rlpgoD --checksum --delete --exclude .user.ini --exclude .well-known "\$T/galantara.io/" "$ROOT_WEB/"
rm -rf "\$T"
echo "\$(date -Is) pulihkan $BERKAS" >> /root/galantara-backup/DEPLOY.log
echo "== dipulihkan dari $BERKAS"
EOF
    exit 0 ;;
  *) sed -n '2,30p' "$0"; exit 2 ;;
esac

# ── 1. Yang dikirim harus commit yang bisa ditunjuk di GitHub ─────────
if [ -n "$(git status --porcelain -- "${ISI[@]}")" ]; then
  echo "!! Ada perubahan belum di-commit di berkas yang dideploy:"; git status --short -- "${ISI[@]}"; exit 1
fi
git fetch -q origin
SHA=$(git rev-parse --short HEAD)
if ! git branch -r --contains HEAD | grep -q "origin/"; then
  echo "!! HEAD $SHA belum ada di origin. Push dulu — live harus bisa ditunjuk ke commit GitHub."; exit 1
fi

if [ "$MODE" = jalankan ] && [ "${TANPA_UJI:-0}" != 1 ]; then
  echo "== npm test"; npm test --silent >/dev/null || { echo "!! uji gagal, deploy dibatalkan"; exit 1; }
fi

# ── 2. Paket dari HEAD ──────────────────────────────────────────────
KERJA=$(mktemp -d)
trap 'rm -rf "$KERJA"' EXIT
PAKET="galantara-$SHA.tgz"
# tar.umask 022: berkas 644 / folder 755, sama dengan isi web root sebelumnya.
# core.autocrlf=false + core.eol=lf: di Windows `git archive` MENERAPKAN konversi
# checkout, jadi deploy pertama (16 Sep, dfe86d2) mengirim HTML/JS ber-CRLF —
# jalan di browser, tapi tidak lagi sama bita dengan commit di GitHub. Tidak
# ketahuan karena pembandingnya berkas working tree yang juga CRLF.
git -c core.autocrlf=false -c core.eol=lf -c tar.umask=022 \
  archive --format=tar.gz -o "$KERJA/$PAKET" HEAD "${ISI[@]}"
JUMLAH=$( (cd "$KERJA" && tar -tzf "$PAKET") | grep -vc '/$')
echo "== paket $PAKET: $JUMLAH berkas, $(du -h "$KERJA/$PAKET" | cut -f1)"
(cd "$KERJA" && scp -q -o BatchMode=yes -o ConnectTimeout=20 "$PAKET" "$SSH_ALIAS:/tmp/$PAKET")

# ── 3. Di server: staging, ringkasan, (backup + sinkron + verifikasi) ─
ssh_ "bash -s" <<EOF
set -euo pipefail
SHA=$SHA; MODE=$MODE; ROOT=$ROOT_WEB
STAGE=/www/wwwroot/.galantara-stage-\$SHA
rm -rf "\$STAGE"; mkdir -p "\$STAGE"
tar xzf /tmp/$PAKET -C "\$STAGE"
chown -R $PEMILIK "\$STAGE"

echo "== ringkasan perubahan (baru / ubah / hapus):"
for d in ${FOLDER[*]}; do
  rsync -rlpgoD --checksum --delete --dry-run --itemize-changes "\$STAGE/\$d/" "\$ROOT/\$d/" | awk -v d="\$d" '
    /^\*deleting/ {h++; if (h<=20) print "   hapus " d "/" \$2}
    /^>f\+\+\+/ {b++} /^>f[^+]/ {u++}
    END {printf "   %-7s baru=%d ubah=%d hapus=%d\n", d, b, u, h}'
done
for f in ${HTML[*]}; do
  if [ ! -f "\$ROOT/\$f" ]; then echo "   \$f baru"; elif ! cmp -s "\$STAGE/\$f" "\$ROOT/\$f"; then echo "   \$f berubah"; fi
done

if [ "\$MODE" = coba ]; then rm -rf "\$STAGE" /tmp/$PAKET; echo "== coba selesai, web root tidak disentuh"; exit 0; fi

TS=\$(date +%Y%m%d-%H%M%S)
mkdir -p /root/galantara-backup
tar czf /root/galantara-backup/galantara.io-\$TS.tgz -C /www/wwwroot galantara.io
echo "== backup: /root/galantara-backup/galantara.io-\$TS.tgz"

for d in ${FOLDER[*]}; do rsync -rlpgoD --checksum --delete "\$STAGE/\$d/" "\$ROOT/\$d/"; done
for f in ${HTML[*]}; do rsync -rlpgoD --checksum "\$STAGE/\$f" "\$ROOT/"; done

beda=0; n=0
while IFS= read -r f; do n=\$((n+1)); cmp -s "\$STAGE/\$f" "\$ROOT/\$f" || { echo "   BEDA: \$f"; beda=\$((beda+1)); }; done < <(cd "\$STAGE" && find . -type f | sed 's#^\./##')
echo "== dibandingkan bita per bita: \$n berkas, beda: \$beda"
echo "\$(date -Is) deploy \$SHA (\$n berkas, beda \$beda), backup galantara.io-\$TS.tgz" >> /root/galantara-backup/DEPLOY.log
rm -rf "\$STAGE" /tmp/$PAKET
[ "\$beda" = 0 ]
EOF

[ "$MODE" = coba ] && exit 0

# ── 4. Dari luar, lewat HTTPS ─────────────────────────────────────────
# Pembanding = blob commit (git cat-file), BUKAN berkas working tree: di Windows
# working tree ber-CRLF dan akan "cocok" dengan paket yang salah.
for f in index.html src/main.js src/fisika/Karakter.js; do
  u="/$f"; [ "$f" = index.html ] && u=/
  BLOB=$(git cat-file -p "HEAD:$f" | sha256sum | cut -c1-64)
  LIVE=$(curl -s --max-time 30 "https://galantara.io$u" | sha256sum | cut -c1-64)
  [ "$BLOB" = "$LIVE" ] && echo "== $f live = blob HEAD $SHA" || { echo "!! $f live BERBEDA dari blob HEAD"; exit 1; }
done
for u in /src/main.js /vendor/three.r128.min.js /vendor/rapier3d-compat.0.20.0.js /assets/spots/losari/manifest.json; do
  printf "   %-40s %s\n" "$u" "$(curl -s -o /dev/null --compressed --max-time 60 -w '%{http_code} %{size_download}B' "https://galantara.io$u")"
done
echo "== selesai. Pengunjung yang pernah membuka build April perlu Ctrl+Shift+R sekali (lihat docs/DEPLOY.md)."
