# Deploy galantara.io

> Berlaku sejak **16 Sep 2026**. Menggantikan `docs/DEPLOY_PROMPT.md` dan
> `apps/web/README-DEPLOY.md` (IP di sana, `72.62.125.6`, adalah VPS-1 yang mati
> sejak 26 Jul 2026). Keputusan: [ADR-0018](adr/0018-deploy-manual-terverifikasi-revalidasi-cache-dan-gzip.md)
> (verifikasi, cache, gzip) dan [ADR-0020](adr/0020-deploy-otomatis-lewat-kunci-berperintah-paksa.md)
> (CI dengan kunci ber-perintah-paksa, multiplayer).

## Di mana

| | |
| --- | --- |
| Server | VPS-2 "trx" / "KVM 4", `187.77.116.139`, Ubuntu, nginx 1.24, 4 vCPU |
| SSH | port **2222**, alias `trx-alt` di `~/.ssh/config` laptop Fahmi. Port 22 timeout. |
| Web root | `/www/wwwroot/galantara.io` (pemilik `sidix:sidix`), **dipindah ke VPS-2 pada 7 Mei 2026** (`stat %w`) |
| Vhost | `/etc/nginx/sites-enabled/galantara.io` |
| Penerima deploy | `/usr/local/sbin/terima-deploy-galantara` (sumber `tools/deploy/terima-deploy-galantara.sh`) |
| Multiplayer | `/mp/` → `127.0.0.1:7999` = **sakelar** (`/opt/sakelar`: menyalakan aplikasi saat ada permintaan dan menidurkannya setelah 30 menit tanpa akses) → PM2 `galantara-mp` (`/www/galantara-server`, port 3005) |
| Backup | statis: `/root/galantara-backup/galantara.io-*.tgz` (10 terakhir); multiplayer: `/www/galantara-server.lama-*` (3 terakhir); riwayat: `/root/galantara-backup/DEPLOY.log` |

**Kenapa CI lama gagal** (koreksi 16 Sep; versi pertama dokumen ini menyebut
port 22): secret CI diisi 13 April untuk server sebelum migrasi, dan kunci deploy
April tidak terdaftar di VPS-2.

## Situs statis

### Otomatis (setelah kunci CI dipasang)

Push ke `main` yang mengubah `index.html`, `about.html`, `admin.html`,
`benteng.html`, `src/`, `data/`, `assets/`, `vendor/`, workflow, atau
`tools/deploy/` → `.github/workflows/deploy-vps.yml`: uji → paket → penerima →
bandingkan hash live dengan blob. Deploy manual lewat GitHub: Actions → Deploy
galantara.io → Run workflow (mode `coba` atau `jalankan`).

**Belum aktif sampai Fahmi menjalankan sekali** (Git Bash di `C:\galantara`):

```bash
bash tools/deploy/pasang-kunci-ci.sh
```

Skrip itu membuat kunci khusus CI dan memasangnya di server dengan perintah paksa
(kunci hanya bisa memanggil penerima). Ia juga mengisi `SSH_PRIVATE_KEY` (secret)
dan `SSH_HOST`/`SSH_PORT`/`SSH_USER`/`SSH_KNOWN_HOSTS` (variabel), menghapus
secret April yang basi, dan menghancurkan salinan kunci di laptop. Sebelum itu,
setiap push tetap hijau dengan notice "Deploy dilewati".

### Manual (dari laptop)

```bash
npm test
git push
bash tools/deploy-galantara.sh coba
bash tools/deploy-galantara.sh jalankan
```

`pasang-penerima` memasang atau memperbarui penerima di server; jalankan setiap
kali `tools/deploy/terima-deploy-galantara.sh` berubah. Skrip lokal menolak deploy
kalau ada perubahan yang belum di-commit, HEAD belum di-push, atau uji gagal.
Penerima lalu:

1. memvalidasi paket: hanya berkas biasa dan direktori di dalam daftar paket, maksimal 64 MiB;
2. mem-backup web root;
3. menyinkronkan folder dulu, `index.html` terakhir;
4. memakai `rsync --checksum` tanpa `-t` (ETag berkas yang isinya sama tidak berubah);
5. membandingkan setiap berkas dengan `cmp` dan menulis `DEPLOY.log`.

Skrip lokal kemudian mencocokkan tiga berkas live dengan **blob** commit.

**Jebakan Windows:** `git archive` menerapkan konversi checkout. Tanpa
`-c core.autocrlf=false -c core.eol=lf`, paketnya ber-CRLF, dan membandingkan
dengan working tree (juga CRLF) akan tetap "cocok".

Kembali ke versi sebelumnya:
`bash tools/deploy-galantara.sh pulihkan galantara.io-YYYYmmdd-HHMMSS.tgz`.

## Server multiplayer

```bash
bash tools/deploy-mp-galantara.sh coba
bash tools/deploy-mp-galantara.sh jalankan
bash tools/deploy-mp-galantara.sh pulihkan [galantara-server.lama-YYYYmmdd-HHMMSS]
```

`coba` memasang dependensi di staging (`npm ci --omit=dev`) dan menguji handshake
Socket.IO di port 39005. `jalankan` lalu `pm2 stop galantara-mp`, menukar
direktori secara atomik, menjalankan `pm2 start` kalau aplikasinya masih stopped,
dan menunggu handshake publik sampai 300 detik.

- **Jangan `pm2 restart` aplikasi yang online** di belakang sakelar; statusnya
  bisa terjebak (OMIGA `L2b0903ff93`).
- **Sakelar bisa terjebak saat deploy:** permintaan yang tiba selama `pm2 stop`
  membuatnya mencatat "SUDAH JALAN", lalu menunggu port 150 detik tanpa menyalakan
  apa pun. Karena itu skrip menyalakan sendiri aplikasi yang stopped.
- **VPS-2 bisa sangat sibuk:** 16 Sep load 62 di 4 vCPU (sakelar sedang
  menyalakan suite SIDIX), dan proses baru butuh sekitar 160 detik untuk membuka
  port. Pemain terputus selama itu; klien menyambung ulang sendiri.
- `three` dan `galantara-repo` (`file:..`) adalah devDependencies, hanya untuk mode
  `--local`. Di server, induk direktorinya bukan repo.
- **API admin** (`/mp/api/admin/summary`) menjawab **503** sampai `ADMIN_API_TOKEN`
  di-set di environment PM2 (opsional: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`). Itu rahasia, jadi Fahmi yang memasangnya.

## Memeriksa di live

- `curl -sI https://galantara.io/src/main.js` → `Cache-Control: no-cache`; JS
  dengan `Accept-Encoding: gzip` → `Content-Encoding: gzip`.
- `curl -s "https://galantara.io/mp/socket.io/?EIO=4&transport=polling"` →
  `0{"sid":…}`.
- Konsol browser: `G_Fisika.status()` → `siap: true`, `kelompok.oola: 59`; dengan
  `?spot=losari` → `kelompok.spot: 35`. Bar atas menampilkan "N online".
- Tidak ada permintaan gagal:
  `performance.getEntriesByType('resource').filter(e => e.responseStatus >= 400)`.
- `window._game` **tidak ada** di live; `src/main.js` hanya memasangnya di localhost.

## Cache dan kompresi (vhost)

Diubah 16 Sep (backup `/root/nginx-backup/galantara-gzip-cache-20260916-010645/`):

- **`Cache-Control: no-cache`.** Modul ES tidak ber-hash di namanya. Tanpa header,
  browser memakai kesegaran heuristik (10 % umur `Last-Modified`), sehingga build
  lama bisa tampil sampai sekitar 15 hari.
- **gzip JS/CSS/JSON.** `nginx.conf` hanya mengompres `text/html`. Rapier
  2.857.590 → 1.084.995 bita, three 603.445 → 149.202.

Pengunjung yang membuka galantara.io sebelum 16 Sep perlu **Ctrl+Shift+R sekali**.
Setelah `systemctl reload nginx`, worker baru muncul 24–40 detik kemudian.
