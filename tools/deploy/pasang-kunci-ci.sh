#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# DIJALANKAN FAHMI SENDIRI, sekali dari Git Bash laptop.
# Membuat kunci CI khusus dengan command paksa, lalu mengisi GitHub Actions.
# Kunci privat hanya lewat stdin gh; tidak pernah dicetak atau masuk repo.
# Penerima harus sudah dipasang dengan tools/deploy-galantara.sh pasang-penerima.
# Pakai: bash tools/deploy/pasang-kunci-ci.sh
# Variabel: REPO (bawaan fahmiwol/galantara). Lihat docs/DEPLOY.md.
# ═══════════════════════════════════════════════════════
set -euo pipefail
set +x # Kunci privat tidak boleh bocor walaupun pemanggil memakai bash -x.
umask 077
REPO="${REPO:-fahmiwol/galantara}"
T=$(mktemp -d)
bersihkan() {
  local kode=$?
  trap - EXIT
  set +e
  if command -v shred >/dev/null 2>&1; then
    [ ! -f "$T/kunci" ] || shred -u -- "$T/kunci" || true
    [ ! -f "$T/kunci.pub" ] || shred -u -- "$T/kunci.pub" || true
  fi
  rm -rf -- "$T"
  exit "$kode"
}
trap bersihkan EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
gagal() { printf '!! %s\n' "$*" >&2; exit 1; }
SSH_OPSI=(-o BatchMode=yes -o ConnectTimeout=20)

echo '== Memeriksa GitHub, akses administrator, dan penerima.'
gh auth status
ssh "${SSH_OPSI[@]}" trx-alt true
ssh "${SSH_OPSI[@]}" trx-alt test -x /usr/local/sbin/terima-deploy-galantara || \
  gagal 'Pasang penerima dahulu: bash tools/deploy-galantara.sh pasang-penerima'
ssh-keygen -t ed25519 -N '' -q -C "galantara-ci@github-actions-$(date +%Y%m%d)" -f "$T/kunci"

echo '== Memasang kunci PUBLIK ber-command paksa; authorized_keys dibackup.'
# Isi kunci publik dibaca dari stdin, bukan disisipkan sebagai argumen SSH.
ssh "${SSH_OPSI[@]}" trx-alt '
set -eu
umask 077
mkdir -p /root/.ssh
chmod 700 /root/.ssh
ASLI=/root/.ssh/authorized_keys
test ! -L "$ASLI" || { echo "!! authorized_keys berupa symlink." >&2; exit 1; }
touch "$ASLI"
CADANGAN="$ASLI.bak-$(date +%Y%m%d-%H%M%S)"
test ! -e "$CADANGAN" || { echo "!! Nama backup kunci sudah ada." >&2; exit 1; }
cp -p -- "$ASLI" "$CADANGAN"
chmod 600 "$CADANGAN"
IFS= read -r PUBLIK
case "$PUBLIK" in
  "ssh-ed25519 "*) ;;
  *) echo "!! Kunci publik tidak sah." >&2; exit 1 ;;
esac
BARU=$(mktemp /root/.ssh/.authorized_keys-XXXXXX)
trap "rm -f -- \"$BARU\"" EXIT
# grep boleh keluar 1 bila semua baris lama memang dihapus, bukan galat baca.
KODE=0
grep -v "galantara-ci@github-actions" "$ASLI" > "$BARU" || KODE=$?
test "$KODE" -le 1 || exit "$KODE"
printf "command=\"/usr/local/sbin/terima-deploy-galantara\",restrict %s\n" "$PUBLIK" >> "$BARU"
chmod 600 "$BARU"
chown root:root "$BARU"
mv -f -- "$BARU" "$ASLI"
echo "== Kunci publik dipasang; backup: $CADANGAN"
' < "$T/kunci.pub"

echo '== Mengisi variabel server dan known_hosts GitHub.'
ssh-keyscan -p 2222 187.77.116.139 2>/dev/null > "$T/known_hosts"
[ -s "$T/known_hosts" ] || gagal 'Host key tidak berhasil dibaca.'
gh variable set SSH_KNOWN_HOSTS --repo "$REPO" < "$T/known_hosts"
gh variable set SSH_HOST --repo "$REPO" --body 187.77.116.139
gh variable set SSH_PORT --repo "$REPO" --body 2222
gh variable set SSH_USER --repo "$REPO" --body root
echo '== Mengisi secret SSH_PRIVATE_KEY lewat stdin.'
gh secret set SSH_PRIVATE_KEY --repo "$REPO" < "$T/kunci"

echo '== Menghapus secret April SSH_HOST, SSH_USER, REMOTE_PATH yang menunjuk server lama.'
for nama in SSH_HOST SSH_USER REMOTE_PATH; do
  gh secret delete "$nama" --repo "$REPO" || true
done

echo '== Menguji kunci CI: tar kosong harus DITOLAK oleh penerima.'
KODE=0
ssh -i "$T/kunci" -p 2222 -o IdentitiesOnly=yes -o BatchMode=yes \
  -o ConnectTimeout=20 -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$T/known_hosts" \
  root@187.77.116.139 'coba 0000000' < /dev/null > "$T/uji.txt" 2>&1 || KODE=$?
cat "$T/uji.txt"
# Kegagalan autentikasi/koneksi bukan bukti bahwa command paksa bekerja.
[ "$KODE" -eq 1 ] && grep -Fxq '!! Paket tar.gz kosong.' "$T/uji.txt" && \
  grep -Eq '^HASIL mode=coba sha=0000000 berkas=0 beda=0 backup=-$' "$T/uji.txt" || \
  gagal 'Uji belum membuktikan penolakan tar kosong oleh penerima. Periksa keluaran di atas.'
echo '== Terbukti: kunci CI diarahkan ke penerima dan paket kosong ditolak.'
echo "== Berikutnya: gh workflow run deploy-vps.yml --repo $REPO -f mode=coba"
