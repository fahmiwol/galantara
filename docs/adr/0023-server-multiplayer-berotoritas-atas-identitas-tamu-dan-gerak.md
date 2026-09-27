# ADR-0023 — Server multiplayer berotoritas atas identitas, status tamu, dan gerak

**Status:** Diterima
**Tanggal:** 2026-09-27
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

`galantara-server/index.js` (Socket.IO, port 3005 di balik `/mp/`) mempercayai
semua yang dikirim klien (RISIKO #9):

- **`id` di `join`** dipakai untuk "membersihkan sesi lama". Siapa pun yang
  mengirim `id` pemain lain membuat korban hilang dari roster semua orang.
- **`guest`** adalah klaim klien. Gerbang "tamu tidak boleh chat/voice" hanya ada
  di UI; `socket.emit('chat', …)` dari konsol melewatinya.
- **`socket.id`** disiarkan sebagai kunci pemain — dan socket.id adalah kunci
  pemulihan sesi (`connectionStateRecovery`).
- **Posisi** diteruskan apa adanya: teleport, koordinat `NaN`/`1e308`, string.
- **Tanpa batas laju** dan dengan batas pesan bawaan 1 MB: satu tab bisa
  membanjiri seluruh room.
- `sync` dengan nama room mana pun mengembalikan daftar pemain room itu.

## Keputusan

1. **Identitas diputuskan server, sekali, saat jabat tangan.** Setiap koneksi
   mendapat **id publik acak** (9 bita, base64url) — satu-satunya id yang dilihat
   klien lain. `id` dan `guest` dari klien diabaikan.
2. **Warga = token akses Supabase yang lolos verifikasi** (`identitas.cjs`),
   dikirim di `auth` jabat tangan. HS256 dengan `SUPABASE_JWT_SECRET`, atau
   ES256/RS256 dengan `SUPABASE_JWKS_URL`. Klaim wajib: `aud`/`role`
   `authenticated`, `exp` belum lewat (toleransi 30 dtk), `sub` berupa id alfanumerik ≤ 64 karakter,
   `iss` kalau `SUPABASE_URL` di-set; akun anonim Supabase = tamu. Nama warga
   diambil dari klaim token, bukan dari payload.
3. **Gagal-tertutup.** Tanpa kunci verifikasi, JWKS tidak terjangkau, atau token
   tidak sah → tamu. Tamu **tetap boleh** melihat dan berjalan; chat dan voice
   ditolak **di server**, dengan alasan yang ditampilkan klien (`rejected`).
4. **Gerak:** posisi server dimajukan ke arah klaim dengan jatah 8,1 m/dtk
   (1,5 × kecepatan jalan) dan cadangan 6 m, dijepit ke batas dunia per room.
   Klaim pertama sesudah join dan kembali ke titik muncul selalu diterima.
   Siaran paling sering 20/dtk per pemain. Angkanya dijaga sama dengan klien oleh
   `tests/serverParitas.test.mjs`.
5. **Laju per koneksi** (ember token) untuk move, chat, join, sync, rtc.
   Pelanggaran > 100 dalam 10 dtk = koneksi diputus. `maxHttpBufferSize` 64 KB.
6. **Input:** room hanya dari daftar `RUANG`; teks dibersihkan dari karakter
   kendali, pembalik arah, lebar-nol, Zalgo; chat ≤ 100 huruf; SDP/ICE hanya
   bidang yang dikenal; relay voice hanya ke warga di room yang sama.
7. **Klien** mengirim token, memakai id publik dari `welcome`, dan tunduk pada
   status tamu dari server. Tanpa `welcome` (server lama) klien kembali ke
   socket.id — klien baru jalan di server lama.

## Konsekuensi

**Yang didapat:** tidak ada lagi jalan bertindak sebagai pemain lain, mengusir
pemain lain, chat/voice sebagai tamu, teleport, atau membanjiri room. Setiap
penjaga dibuktikan dengan mutasi (`tools/mutasi-multiplayer.mjs`).

**Yang dibayar:**
- **Chat dan voice MATI di produksi sampai Fahmi memasang kunci verifikasi** di
  environment PM2. Itu disengaja: lebih baik chat mati daripada chat yang bisa
  dipalsukan.
- Klien lama (tab yang belum dimuat ulang) yang login dianggap tamu oleh server
  baru dan tidak menampilkan penolakan chat.
- Tamu mendapat id baru di setiap koneksi penuh (pulih < 2 menit mempertahankan
  id). Tidak ada identitas tamu yang bertahan antar kunjungan.
- Status warga diperiksa saat jabat tangan saja; token yang kedaluwarsa di
  tengah koneksi tidak memutus koneksi itu.
- Batas laju per koneksi, bukan per IP: banyak koneksi dari satu IP tetap bisa
  menambah beban. Belum ditangani.
- Angka batas dunia disalin dari klien; menambah Spot live wajib mengubah
  `RUANG` (uji paritas merah kalau lupa).

## Alternatif

- **Identitas tamu bertanda tangan (HMAC dari server) yang disimpan klien.**
  Ditolak untuk sekarang: tamu tidak punya hak apa pun yang perlu dipertahankan
  antar koneksi, dan pemulihan sesi Socket.IO sudah menutup putus sebentar.
- **Memanggil `GET /auth/v1/user` Supabase per koneksi.** Ditolak: satu
  permintaan jaringan per koneksi, dan Supabase yang lambat membuat semua orang
  menunggu. Verifikasi lokal tidak butuh jaringan (HS256) atau hanya sesekali
  (JWKS, di-cache 10 menit).
- **Menolak koneksi tanpa token.** Ditolak: tamu boleh melihat dunia yang ramai.

## Bukti

- `galantara-server/index.js`, `penjaga.cjs`, `identitas.cjs`
- `tests/penjaga.test.mjs`, `tests/serverMultiplayer.test.mjs` (server
  sungguhan), `tests/serverParitas.test.mjs`, `tests/klienMultiplayer.test.mjs`
- `docs/keamanan/PERBAIKAN-SERVER-2026-09-27.md` — angka uji dan mutasi
