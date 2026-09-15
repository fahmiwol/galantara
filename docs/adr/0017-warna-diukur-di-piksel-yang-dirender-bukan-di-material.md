# ADR-0017 — Warna diukur di piksel yang dirender, bukan di material

**Status:** Diterima — mengoreksi *instrumen* ADR-0011, bukan metrik Delta-E-nya
**Tanggal:** 2026-09-15
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

ADR-0011 mengganti kontras luminansi dengan Delta-E, dan keputusan itu tetap
benar. Tetapi semua angka Delta-E sejak itu dihitung dari **warna material**:
tanah `#a8d5a2` terhadap langit `#87CEEB`, lalu disimpulkan pulau terbaca.

Pemain tidak melihat material. Pemain melihat material × cahaya. Diukur 15 Sep
2026 dengan membaca framebuffer (median 12 titik tanah pulau):

| Jam | Piksel tanah | |
| --- | --- | --- |
| 09:00 | `#ffffeb` | nyaris putih |
| 12:00 | `#ffffff` | putih |
| 13:30 | `#ffffff` | putih |
| 15:30 | `#f8ffe7` | nyaris putih |
| 18:00 | `#81ab7f` | baru terlihat hijau |

Sepanjang siang pulau dirender putih. Penyebabnya dua bug yang tidak terlihat
dari angka material mana pun: `AmbientLight` 0,6 yang tidak pernah disentuh
siklus hari, dan kubah langit yang diserahkan ke DayNight sebelum kubahnya
dibangun (macet di satu warna). Keputusan "hijau lolos di semua fase langit"
di `World.js` benar untuk material dan salah untuk layar.

## Keputusan

1. **Keputusan warna yang dilihat pemain diukur dari piksel yang dirender**, di
   fase cahaya yang relevan: render satu bingkai, `gl.readPixels` di titik yang
   diproyeksikan dari posisi dunia, ambil median beberapa titik. Delta-E
   (ADR-0011) dihitung dari piksel itu.
2. **Siklus cahaya adalah tabel keyframe yang dikalibrasi terhadap piksel**
   (`src/world/DayNight.js`): pencarian biner atas intensitas tiap keyframe
   sampai median kanal hijau tanah mengenai target fase. Ambient dan warna
   cahaya isi hemisphere ikut dikendalikan siklus.
3. **Uji tanpa browser memakai model Lambert r128 yang dijangkarkan** ke piksel
   terukur (`tests/dayNight.test.mjs`). Kalau jangkarnya meleset lebih dari 6 %,
   uji lainnya tidak boleh dipercaya.

## Konsekuensi

### Yang didapat

- Siang hijau segar (`#addca6` jam 12.30), jam emas benar-benar keemasan
  (`#b7ae57`), magrib ungu (`#61555e`), malam biru tinta (`#283b4c`) dengan
  kolam cahaya lampu yang terbaca — palet yang ditulis DayNight sejak awal tapi
  tidak pernah tampil.
- Regresi "pulau putih" tertangkap uji tanpa WebGL.

### Yang dibayar

- Kalibrasi terikat pada pipeline tanpa sRGB/tone mapping. Menyalakan colour
  pipeline berarti mengkalibrasi ulang seluruh tabel.
- Model uji mengabaikan kabut, bayangan, dan specular; jangkar ±6 % adalah
  batas kepercayaannya, bukan akurasi render.
- Hanya tanah Oola yang dikalibrasi. Prop, avatar, dan tanah Spot lain belum
  diukur; keterbacaannya di tiap fase belum punya angka.
- Diukur di satu mesin (Chrome, laptop). Layar ponsel dengan gamma berbeda
  belum.

## Alternatif yang ditolak

**Menurunkan ambient saja.** Ditolak: memperbaiki siang tapi tidak kubah
langit, tidak jam emas yang dirender hijau kebiruan, dan tidak mencegah
regresi berikutnya.

**Menyalakan sRGB + ACES tone mapping.** Ditolak lagi untuk sekarang: pernah
dicoba dan dibalik karena seluruh materi disetel tanpa itu (BACKLOG, "Ditunda
sadar"). Tetap pekerjaan satu paket, bukan satu baris.

**Menilai dengan mata di tangkapan layar.** Ditolak sebagai satu-satunya alat:
tangkapan layar dipakai untuk rasa, angka piksel untuk keputusan.

## Bukti

`src/world/DayNight.js` (tabel kalibrasi dan catatan dua bug),
`src/core/Renderer.js` (`this.ambient`), `src/core/Game.js`
(`dayNight.pakaiLangit`), `tests/dayNight.test.mjs`. Tangkapan layar jam 12.30,
17.12, 18.12, dan 21.00 sesi 15 Sep 2026.
