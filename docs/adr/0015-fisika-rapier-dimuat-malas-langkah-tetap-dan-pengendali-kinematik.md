# ADR-0015 — Fisika Rapier: dimuat malas, langkah tetap, pengendali kinematik

**Status:** Diterima
**Tanggal:** 2026-09-15
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Sampai 14 Sep, satu-satunya "fisika" Galantara adalah clamp radial di
`Avatar.update()`: posisi dipotong kembali ke 17 m dari pusat. Pemain menembus
pohon, rumah, meja, dan dinding. Tiga masalah turunan yang terukur:

- `SPEED = 0.09` **per bingkai**, bukan per detik — di ponsel 30 fps avatar
  berjalan setengah kecepatan.
- Spot jalanan (Malioboro, Braga, Kuta, Losari) berbentuk persegi; clamp 17 m
  membiarkan pemain berjalan di udara di luar jalan.
- `berdiri()` tidak memindahkan posisi. Keterisian kursi diturunkan dari posisi
  (ADR-0003), jadi pemain yang berdiri tapi belum melangkah tetap terlihat
  **duduk** di layar orang lain.

Rupa3D sudah mengukur proksi tabrakannya dengan Rapier, dan Mighan-3D-Studio
menjalankan player controller-nya dengan Rapier.

## Keputusan

1. **Rapier 0.20.0** (`@dimforge/rapier3d-compat`, **Apache-2.0** — permisif dan
   boleh didistribusikan bersama proyek MIT selama berkas lisensinya ikut;
   `vendor/rapier3d-compat.LICENSE.txt`) di-vendor sebagai
   `vendor/rapier3d-compat.0.20.0.js`. Ekstensi `.js`, bukan `.mjs`: modul ES
   wajib dilayani dengan MIME JavaScript, dan tidak semua `mime.types` server
   memetakan `.mjs`.
2. **Dimuat malas** setelah dunia tampil (`Game._muatFisika`). Selama memuat —
   atau kalau gagal — gerak lama tetap jalan, sekarang dalam m/s × dt. Saat
   fisika menyambung, pemain yang sedang berdiri di dalam sesuatu dipindah ke
   titik bebas terdekat.
3. **Pengendali kinematik** (`KinematicCharacterController`), porting dari
   `Rupa3D/karakter.mjs`: sapu lalu meluncur, naik anak tangga 0,35 m, menempel
   tanah, lereng 50°. Bentuk yang sama dengan Godot `move_and_slide`, Unity
   `CharacterController`, Unreal `CharacterMovementComponent`.
4. **Langkah tetap 1/60** dengan akumulator (maks 5 langkah per bingkai, sisa
   dibuang), **interpolasi** posisi gambar, dan epsilon 1e-9 pada perbandingan.
5. **Tanpa gravitasi saat menapak.** Menyimpang dari Rupa3D, dengan angka:
   dorongan 5 mm per langkah membuat 12 dari 596 langkah bergerak nol.
6. **Duduk dan berdiri adalah perpindahan keadaan**: duduk mematikan kapsul;
   berdiri memilih titik keluar pertama yang lolos uji ruang kapsul, tanah
   setinggi lantai, dan aturan kursi. Tidak ada yang muat → tetap duduk.
7. **Tanah dan batas bawaan** untuk Spot yang belum menyatakan miliknya: lantai
   datar y = 0 dan cincin 17 m — semantik yang sama dengan clamp lama, supaya
   fisika tidak pernah membuat Spot lebih buruk daripada sebelumnya.
8. Pemain lain dan NPC **tidak** bertabrakan dengan pemain. Dunia sosial yang
   bisa saling menghalangi pintu adalah dunia yang bisa dijahili.

## Konsekuensi

### Yang didapat

- Pohon, rumah, meja, dan tepi pulau menahan pemain dan pemain meluncur di
  sepanjang permukaannya. Terukur di browser: jarak minimum ke sumbu batang
  pohon ungu 0,895 m = jari batang 0,475 + kapsul 0,40 + offset 0,02.
- Jarak per detik identik di 30, 60, 120, dan 144 fps (dijaga uji).
- Berdiri dari kursi memindahkan pemain 0,62 m keluar kursi; hint meja turun ke
  0/4 di klien yang sama, dan klien lain membaca posisi yang sama.
- Satu kosakata collider dengan Rupa3D (lihat ADR-0016).
- Tampilan collider (`?kolisi`, `G_Fisika.lihat()`) dari `world.debugRender()`.

### Yang dibayar

- **2,86 MB mentah, 1,08 MB gzip.** Unduhan ideal 8,6 / 1,7 / 0,9 detik di
  1 / 5 / 10 Mbps. Lazy loading memindahkan biaya ini, tidak menghapusnya.
  Terukur di laptop: muat 235 ms pertama, 23 ms dari cache; init WASM 17–24 ms.
  **Ponsel belum diukur.** Gzip produksi belum dibuktikan dari header respons.
- **Dua jalur gerak** selama pemuatan: gerak lama menembus apa saja. Ditebus
  dengan pencarian titik bebas saat menyambung, bukan dihilangkan.
- Satu langkah keterlambatan visual (≤ 16,7 ms) dari interpolasi.
- Tiap penambahan collider memicu satu `world.step()` sebelum query berikutnya
  (Rapier 0.20 tidak melihat collider baru sebelum step). Murah untuk collider
  statis; akan perlu ditinjau kalau ada ratusan badan dinamis.
- Kanopi pohon terendah (±1,1 m) menembus kepala avatar yang lewat di bawahnya.
  Dipilih, bukan terlewat — lihat ADR-0016.
- Tinggi kaki dari fisika (anak tangga, terasering) **tidak** disinkronkan ke
  pemain lain; mereka melihat semua orang di y = 0.
- Spot selain Oola baru punya tanah dan batas bawaan; collider bangunannya
  belum dinyatakan.

## Alternatif yang ditolak

**Solver lingkaran/OBB XZ buatan sendiri.** Codex menilai ini cukup untuk 31
prop di pulau datar, dan penilaian itu benar untuk hari ini. Ditolak karena
Rupa3D mengukur proksinya dengan Rapier: solver lain membuat setiap angka
`rupa_proksi` tidak berlaku begitu asetnya masuk Galantara. Tangga rumah
panggung dan terasering di katalog prop juga sudah butuh sumbu Y.

**Menahan gerak sampai fisika siap** (usul Codex: satu solver saja). Ditolak:
di 1 Mbps itu berarti ±9 detik dunia terlihat tapi tidak bisa dijalani, dan
pemain baru membaca itu sebagai rusak.

**Badan dinamis + `setLinvel`** (pola Mighan-3D-Studio). Ditolak: terpeleset di
tanjakan, terpental di tangga, dan "menapak" ditebak dari kecepatan vertikal
yang salah di puncak lompatan.

**Gravitasi selalu, seperti Rupa3D.** Ditolak dengan angka: 12/596 langkah
tersendat, 1,04 m hilang per 10 detik. `setNormalNudgeFactor(1e-2)` hanya
menurunkannya ke 3.

**Rapier dari CDN.** Ditolak oleh ADR-0010.

## Bukti

- `src/fisika/{bentuk,Fisika,Karakter,LihatCollider}.js`
- `tests/fisika.test.mjs` (25 uji, Rapier asli), `tests/fisikaDunia.test.mjs`
  (24 uji, THREE r128 + Rapier asli, pulau Oola lengkap)
- Pengukuran yang bisa diulang: `tools/fisika/ukur-tersendat.mjs` (keputusan 5),
  `tools/fisika/ukur-jam.mjs` (keputusan 4), `tools/fisika/langkah-pertama.mjs`
  (`Fisika.segarkan`)
- Tinjauan Codex CLI 0.154.0 atas Rupa3D, Mighan-3D-Studio, dan rancangan ini
