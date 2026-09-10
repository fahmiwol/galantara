# ADR-0010 — Vendor semua pustaka klien — Supabase tetap pengecualian yang disebut

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

`index.html` memuat lima berkas dari lima domain: Three.js (cdnjs), Supabase
(jsdelivr), Socket.io (cdn.socket.io), Nunito (Google Fonts), dan Google
Analytics.

Dokumen yang mengaku "self-hosted, tanpa dependency ke API komersial" sementara
kodenya memanggil lima domain adalah dokumen yang bohong. Ditambah: jalur
Three.js menunjuk `/three.min.js` yang **tidak pernah ada di repo ini**, jadi ia
selalu jatuh ke CDN dan dev offline tidak pernah mungkin.

## Keputusan

Semua pustaka klien di-vendor ke `/vendor/` (1,3 MB). Font hanya subset **latin
dan latin-ext** — bahasa Indonesia tidak memakai cyrillic maupun vietnamese.
Socket.io klien dinaikkan ke **4.8.3 agar sama persis dengan server**
(sebelumnya klien 4.7.4 dari CDN).

**Google Analytics dibiarkan menyala di produksi**, tetapi dikumpulkan di satu
tempat (`window.G_ANALITIK`) sehingga bisa dimatikan dengan satu baris.
Mematikan analitik pemilik produk secara diam-diam bukan keputusan teknis saya.

**Supabase tetap pengecualian yang disebut terang-terangan.** Pustakanya lokal;
*layanannya* komersial. Yang penting dan bisa diverifikasi: **dunia jalan penuh
sebagai tamu tanpa Supabase** — jalan-jalan, multiplayer, Benteng, Spot, meja
nongkrong. Yang butuh Supabase hanya login, chat, dan preferensi avatar.

## Konsekuensi

### Yang didapat

- Nol permintaan pihak ketiga dari klien saat dev — **diverifikasi**:
  `skripLuar: []`, `linkLuar: []`.
- Dev offline jadi mungkin untuk pertama kalinya.
- Klien dan server memakai Socket.io yang sama; satu kelas ketidakcocokan hilang.
- Alamat IP pengunjung tidak lagi mengalir ke Google Fonts.

### Yang dibayar

- 1,3 MB masuk repo. Diterima: dibayar sekali dan diketahui, bukan lima
  permintaan lintas domain tiap kunjungan.
- Pembaruan keamanan pustaka jadi tanggung jawab manual. Diredam dengan nama
  berkas bernomor versi dan tabel di `vendor/README.md`.
- Supabase belum terselesaikan. Jalur keluar paling masuk akal: **PostgREST +
  GoTrue self-hosted**, karena Supabase memang lapisan di atas keduanya, jadi
  bentuk APInya tidak berubah drastis.

## Alternatif yang ditolak

**Biarkan CDN.** Ditolak: membuat klaim self-hosted jadi bohong, dan dev offline
mustahil.

**Ganti Supabase sekarang.** Ditolak untuk sesi ini: itu pekerjaan auth dan
migrasi data, bukan efek samping pekerjaan dokumentasi. Dicatat di backlog.

**Hapus analytics.** Ditolak: keputusan produk pemiliknya, bukan saya. Dibuat
mudah dimatikan sebagai gantinya.

## Bukti

`vendor/README.md`, `index.html`. Diverifikasi di browser pada server bersih:
three r128, socket.io, dan supabase semuanya dari origin sendiri; 76 prop dan
16 lampu termuat; nol skrip dan nol link eksternal.
