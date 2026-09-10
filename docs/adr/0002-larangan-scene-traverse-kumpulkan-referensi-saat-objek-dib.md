# ADR-0002 — Larangan scene.traverse — kumpulkan referensi saat objek dibuat

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

PRD BAB 2.4 melarang `scene.traverse()`. Godaan memakainya muncul tiap kali ada
yang perlu menyapu scene: mencari lampu untuk siklus siang-malam, mencari mesh
untuk di-dispose saat Spot dilepas.

Biayanya bukan cuma performa. `traverse` menyembunyikan **kepemilikan**: kode
yang menyapu scene tidak tahu objek mana miliknya, jadi ia bisa mematikan lampu
Spot lain atau melepas mesh yang masih dipakai.

## Keputusan

Setiap objek yang perlu ditemukan lagi nanti **dicatat saat dibuat**, ke daftar
milik pembuatnya:

- `World.lampu` dan `MejaNongkrong.lampu` diisi di dalam `_pasang*()`
- `MejaNongkrong.objek` mengumpulkan mesh untuk `dispose()`
- `RemotePlayers` menyimpan `bagian: [body, head, tag]` saat `add()`

## Konsekuensi

### Yang didapat

- Kepemilikan jelas. `dispose()` hanya melepas milik sendiri.
- Tidak ada penyapuan per-frame.
- Bug "lampu Spot lama masih menyala" jadi tidak mungkin secara struktural,
  bukan sekadar dihindari.

### Yang dibayar

- Tiap pembuat objek harus ingat mencatat. Lupa mencatat = kebocoran yang tidak
  terlihat di sesi pendek.
- Lebih banyak kode daripada satu panggilan `traverse`.

## Alternatif yang ditolak

**`traverse` sekali saat build, bukan per frame.** Ditolak: masalah
kepemilikannya tetap ada. Pernah dipakai dan menghasilkan bug nyata.

## Bukti

`src/world/World.js`, `src/world/MejaNongkrong.js`,
`src/multiplayer/RemotePlayers.js`. Pelanggaran nyata dan perbaikannya: commit
`72ae085` dan `d54cc3a` — yang kedua ditemukan review GPT-5.6, bukan oleh saya.
