# ADR-0001 — THREE global lewat script tag, tanpa build step

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Galantara adalah web statis: `index.html` plus modul ES di `src/`. Tidak ada
bundler, tidak ada langkah build. Three.js dimuat sebagai skrip klasik yang
memasang `window.THREE`.

Ini sudah berjalan sebelum ADR ini ditulis. Didokumentasikan karena
**pelanggarannya senyap dan mematikan**: menulis `import 'three'` di modul mana
pun membuat modul itu gagal dimuat tanpa satu pun pesan yang menunjuk sebabnya.
Halaman jadi biru kosong.

## Keputusan

Three.js tetap global (`window.THREE`), dimuat dari `/vendor/three.r128.min.js`
sebelum modul mana pun jalan. **Dilarang** `import ... from 'three'` di seluruh
`src/`. Versi dikunci di **r128**.

## Konsekuensi

### Yang didapat

- Tidak ada langkah build sama sekali. Klon repo, jalankan server statis, jadi.
  Kontributor tanpa Node tetap bisa mengubah dan melihat hasilnya.
- Tidak ada bundle yang basi, tidak ada `node_modules` di klien.
- Waktu dari mengubah berkas ke melihat hasilnya = satu refresh.

### Yang dibayar

- Tidak ada tree-shaking: 603 KB Three.js dimuat walau dipakai sebagian.
- Salah ketik nama kelas Three baru ketahuan saat dijalankan.
- Uji di Node harus menyediakan `globalThis.THREE` sendiri.

## Alternatif yang ditolak

**Bundler (Vite/esbuild).** Ditolak untuk sekarang: menambah langkah build
berarti menambah cara untuk gagal, dan proyek ini belum punya masalah yang
dipecahkan bundler. Layak ditinjau ulang kalau klien mulai memakai banyak paket.

**Import map + Three sebagai modul ES.** Ditolak: seluruh basis kode memakai
`THREE` global; migrasinya menyentuh tiap berkas tanpa manfaat yang bisa
ditunjuk hari ini.

## Bukti

`index.html`, `vendor/three.r128.min.js`. Kejadian nyata pelanggaran ini
tercatat di `docs/SESSION_LOG.md`.
