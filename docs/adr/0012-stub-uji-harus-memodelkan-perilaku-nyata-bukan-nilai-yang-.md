# ADR-0012 — Stub uji harus memodelkan perilaku nyata, bukan nilai yang dipaksakan

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

`ChatBubbleLayer` dan `MejaNongkrong` diuji di Node dengan tiruan DOM dan THREE.
Tiruan yang terlalu longgar membuat uji **lulus tanpa menguji apa pun**.

Dua kejadian nyata:

1. Stub proyeksi mengembalikan `z = 0.9` untuk semua titik di depan kamera. Uji
   "titik di dalam near plane ditolak" lalu ditulis dengan menambal prototipe
   supaya `z = -1.5` — yaitu menguji tambalan, bukan perilaku.
2. Elemen tiruan tidak punya `offsetWidth`, jadi jalur pengukuran ulang tidak
   pernah tersentuh.

## Keputusan

Stub uji **memodelkan perilaku**, bukan mengembalikan nilai yang enak:

- Stub proyeksi mengembalikan NDC sungguhan di `[-1, 1]` dengan near/far.
- Elemen tiruan punya `offsetWidth`/`offsetHeight` yang bisa diubah, supaya
  "layout belum jadi lalu jadi" bisa diuji.
- Untuk `RemotePlayers` dipakai **Three.js sungguhan** dari
  `galantara-server/node_modules` — matematika proyeksi dan daur hidup resource
  memang yang sedang diuji. Impornya dijaga: kalau modulnya belum terpasang,
  uji **dilewati dengan pesan yang menyebut perintahnya**, bukan mematikan
  seluruh suite dengan `MODULE_NOT_FOUND`.

Aturan turunannya: **asersi menghitung nilai yang diharapkan, bukan
menghafalnya.** Uji yang mematok indeks kursi akan salah begitu tata letak
berubah, padahal perilakunya tetap benar.

## Konsekuensi

### Yang didapat

- Uji menangkap bug nyata. Uji rotasi menangkap rumus yang arahnya berlawanan
  dengan Three.js — bug yang hanya muncul di meja yang diputar.
- Uji tetap sahih ketika bentuk berubah.

### Yang dibayar

- Stub jadi lebih panjang.
- Ketergantungan pada `galantara-server/node_modules` untuk satu berkas uji.

## Alternatif yang ditolak

**Stub minimal.** Ditolak: menghasilkan uji hijau yang tidak menguji apa pun.

**Uji di browser saja.** Ditolak: lambat, dan `requestAnimationFrame` beku di
lingkungan otomasi sehingga uji berbasis waktu di sana palsu.

## Bukti

`tests/chatBubble.test.mjs`, `tests/mejaNongkrong.test.mjs`,
`tests/remotePlayers.test.mjs`.
