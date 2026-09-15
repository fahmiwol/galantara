# ADR-0018 — Deploy manual yang terverifikasi, revalidasi cache, dan gzip di vhost

**Status:** Diterima — mengoreksi premis ADR-0007 ("belum ada server")
**Tanggal:** 2026-09-16
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

ADR-0007 mematikan pemicu deploy CI karena "server belum ada". **Premis itu
salah.** galantara.io tidak pernah mati: ia hidup di VPS-2 (`187.77.116.139`) dan
melayani build 13 April 2026. SSH server itu ada di **port 2222**, sedangkan
workflow mencoba port 22, sehingga `Connection timed out`. Fahmi, 16 Sep:
"galantara hidup ko di KVM 4 server 2." Diperiksa lewat SSH pada hari yang sama.

Deploy pertama sejak April (16 Sep, `dfe86d2`): 64 berkas baru, 37 berubah,
0 dihapus. Setelah deploy, dua masalah pengiriman terukur:

1. **Tanpa `Cache-Control`.** Browser memakai kesegaran heuristik (10 % umur
   `Last-Modified`). Build berumur 5 bulan dianggap segar sekitar 15 hari, jadi
   deploy tidak terlihat oleh pengunjung yang pernah datang.
2. **gzip hanya untuk `text/html`** (bawaan `nginx.conf` Ubuntu). JS klien
   dikirim mentah: 4,26 MB.

## Keputusan

1. **Deploy lewat `tools/deploy-galantara.sh`** dari mesin yang punya alias SSH.
   HEAD harus sudah ada di origin dan uji harus lulus. Web root di-backup
   sebelumnya, lalu setiap berkas dibandingkan bita per bita sesudahnya.
   Runbook: `docs/DEPLOY.md`.
2. **Pemicu CI tetap mati.** Workflow kini mendukung `SSH_PORT` supaya bisa
   dijalankan manual kalau Fahmi memilih jalur itu.
3. **Vhost galantara.io:** `Cache-Control: no-cache` untuk semua berkas statis
   (revalidasi, 304 kalau sama) dan gzip untuk JS/CSS/JSON.

## Konsekuensi

### Yang didapat

- Live bisa ditunjuk ke satu commit GitHub, dan kembali ke versi sebelumnya
  cukup satu perintah (`pulihkan`).
- JS di kabel turun sekitar 65 %. Terukur: Rapier 2.857.590 → 1.084.995 bita,
  three 603.445 → 149.202.
- Deploy berikutnya langsung terlihat tanpa hard refresh.

### Yang dibayar

- Deploy bergantung pada laptop yang memegang kunci; tidak ada deploy dari CI.
- Setiap muat halaman merevalidasi sekitar 60 berkas. Balasannya 304 tanpa
  badan, murah di HTTP/2, tapi tidak nol di ponsel berlatensi tinggi.
- Deploy tidak atomik: folder lalu HTML, beberapa detik isinya campuran.
- Pengunjung yang pernah memuat build April tetap melihatnya sampai kesegaran
  heuristiknya habis atau mereka menekan Ctrl+Shift+R. Header baru tidak bisa
  menjangkau salinan yang sudah dianggap segar.
- Vhost diubah di server bersama 19 aplikasi, dan `nginx reload` menyentuh semua.
  Risikonya diredam dengan backup vhost, `nginx -t`, dan pemeriksaan empat situs
  tetangga (semua 200).

## Alternatif yang ditolak

**Nyalakan lagi push-to-deploy dengan port 2222.** Ditolak untuk sekarang:
kunci server bersama di GitHub Secrets adalah keputusan risiko milik Fahmi, dan
workflow itu tidak punya backup maupun verifikasi bita.

**Nama berkas ber-hash atau folder berversi.** Ditolak: butuh build step
(ADR-0001). `?v=` di `main.js` tidak cukup, karena impor relatif modul ES tidak
mewarisi query string.

**Cache panjang untuk `vendor/`.** Ditunda: hanya sebagian nama vendor yang
berversi (`supabase-js.2.min.js` dan `GLTFLoader.js` tidak).

## Bukti

- Header live sebelum: tanpa `Cache-Control`, `Last-Modified: Mon, 13 Apr 2026`,
  JS tanpa `Content-Encoding`. Sesudah: `Cache-Control: no-cache`,
  `Content-Encoding: gzip`, dan revalidasi `If-None-Match` → 304.
- 102 berkas dibandingkan dengan `cmp`: 0 beda. SHA-256 `index.html` live =
  HEAD `dfe86d2`.
- Browser di live: `G_Fisika.status()` siap, Oola 59 collider, Losari 35 (GLB
  beserta `rumah_panggung.collider.json`), Kuta 27, 0 permintaan ≥ 400, 0 galat
  konsol.
- Backup: `/root/galantara-backup/galantara.io-20260916-010408.tgz`; vhost
  `/root/nginx-backup/galantara-gzip-cache-20260916-010645/`.
- `tools/deploy-galantara.sh coba` terhadap live: 102 berkas, 0 berubah.
