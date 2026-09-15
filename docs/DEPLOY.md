# Deploy galantara.io

> Berlaku sejak **16 Sep 2026**. Menggantikan `docs/DEPLOY_PROMPT.md` dan
> `apps/web/README-DEPLOY.md`: IP di sana, `72.62.125.6`, adalah VPS-1 yang mati
> sejak 26 Jul 2026. Keputusan dan alasannya: [ADR-0018](adr/0018-deploy-manual-terverifikasi-revalidasi-cache-dan-gzip.md).

## Di mana

| | |
| --- | --- |
| Server | VPS-2 "trx", `187.77.116.139`, Ubuntu, nginx 1.24 |
| SSH | **port 2222**. Port 22 timeout, dan itulah penyebab workflow CI gagal sejak April, bukan "server belum ada". Alias `trx-alt` di `~/.ssh/config` laptop Fahmi. |
| Web root | `/www/wwwroot/galantara.io` (pemilik `sidix:sidix`) |
| Vhost | `/etc/nginx/sites-enabled/galantara.io` |
| Multiplayer | `/mp/` → `127.0.0.1:7999` = **sakelar** (`/opt/sakelar`, penyala aplikasi saat dibutuhkan) → PM2 `galantara-mp` (`/www/galantara-server`, port 3005). |
| Backup | `/root/galantara-backup/galantara.io-<waktu>.tgz`, riwayat di `DEPLOY.log` |

## Cara

```bash
npm test
git push
bash tools/deploy-galantara.sh coba
bash tools/deploy-galantara.sh jalankan
```

`coba` membuat paket, menaruhnya di staging server, dan menampilkan jumlah berkas
baru, berubah, dan terhapus, tanpa menyentuh web root. `jalankan` melakukan hal
yang sama, lalu:

1. menolak kalau ada perubahan yang belum di-commit, kalau HEAD belum di-push,
   atau kalau uji gagal;
2. mem-backup web root;
3. menyinkronkan folder dulu, `index.html` terakhir (index baru merujuk
   `/vendor/*.js` yang harus sudah ada);
4. memakai `--checksum` tanpa `-t`, jadi berkas yang isinya sama tidak disentuh
   (ETag-nya tetap, pengunjung mendapat 304);
5. membandingkan setiap berkas paket bita per bita dengan yang dilayani;
6. mencocokkan tiga berkas live lewat HTTPS dengan **blob** commit
   (`git cat-file`), bukan dengan working tree.

**Jebakan Windows:** `git archive` menerapkan konversi checkout, jadi dengan
`core.autocrlf=true` paketnya berisi CRLF. Deploy pertama (`dfe86d2`) begitu,
dan lolos pemeriksaan karena pembandingnya working tree yang juga CRLF. Skrip
memaksa `-c core.autocrlf=false -c core.eol=lf`.

Yang dikirim: `index.html`, `about.html`, `admin.html`, `benteng.html`, `src/`,
`data/`, `assets/`, `vendor/`. Berkas lain di web root (`404.html`, `502.html`,
`.user.ini`, `.well-known/`, `three.min.js` lama) dibiarkan.

## Kembali ke versi sebelumnya

```bash
bash tools/deploy-galantara.sh pulihkan /root/galantara-backup/galantara.io-YYYYmmdd-HHMMSS.tgz
```

Nama berkasnya ada di keluaran `jalankan` dan di `DEPLOY.log`.

## Memeriksa di live

- `curl -sI https://galantara.io/src/main.js` → `Cache-Control: no-cache`.
- `curl -s -o /dev/null --compressed -D - https://galantara.io/vendor/three.r128.min.js`
  → `Content-Encoding: gzip`.
- Di konsol browser: `G_Fisika.status()` → `siap: true`, `kelompok.oola: 59`.
  Dengan `?spot=losari`: `kelompok.spot: 35`.
- Tidak ada permintaan gagal:
  `performance.getEntriesByType('resource').filter(e => e.responseStatus >= 400)`.
- `window._game` **tidak ada** di live. `src/main.js` hanya memasangnya di
  localhost.

## Cache dan kompresi

Diubah di vhost pada 16 Sep (backup:
`/root/nginx-backup/galantara-gzip-cache-20260916-010645/`):

- **`Cache-Control: no-cache`.** Modul ES dan aset tidak ber-hash di namanya.
  Tanpa header, browser memakai kesegaran heuristik, yaitu 10 % dari umur
  `Last-Modified`. Build April yang berumur 5 bulan dianggap segar sekitar 15
  hari, sehingga deploy baru tidak terlihat. Sekarang tiap muat merevalidasi
  (304 kalau sama).
- **gzip untuk JS/CSS/JSON.** `nginx.conf` server hanya mengompres `text/html`.
  Terukur di live: Rapier 2.857.590 → 1.084.995 bita, three 603.445 → 149.202,
  `Game.js` 39.375 → 11.648.

**Pengunjung yang pernah membuka galantara.io sebelum 16 Sep perlu Ctrl+Shift+R
sekali.** Salinan April di browser mereka sudah dianggap segar sebelum header
baru ada, jadi header baru tidak menjangkaunya.

Sesudah `systemctl reload nginx`, worker baru terlihat 24 detik kemudian
(reload 01:06:54, worker 01:07:18). Verifikasi setelah worker baru hidup, jangan
dari satu respons pertama.

## CI

`.github/workflows/deploy-vps.yml` sekarang mendukung `SSH_PORT`, tetapi pemicu
`push:` tetap mati. Menyalakannya berarti menaruh kunci server bersama (19
aplikasi) di GitHub Secrets. Itu keputusan risiko untuk Fahmi; kalau dinyalakan,
pakai user deploy yang hanya bisa menulis ke web root, bukan `root`. Workflow itu
juga tidak punya backup dan tidak memverifikasi bita.

## Belum dideploy

- **Server multiplayer** (`galantara-server/`). Produksi masih menjalankan kode
  April. Protokol klien tidak berubah (`/mp/socket.io` sama sejak April). Yang
  tertinggal: `rooms = Object.create(null)` (ruang bernama `__proto__` tidak lagi
  menyentuh prototipe) dan versi dependensi. Kalau dideploy: **jangan**
  `pm2 restart galantara-mp` saat online. sakelar memperingatkan statusnya bisa
  terjebak `errored`. Urutannya ada di Omiga `L2b0903ff93`.
