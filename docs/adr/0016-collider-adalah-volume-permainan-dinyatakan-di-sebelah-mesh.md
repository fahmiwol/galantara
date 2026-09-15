# ADR-0016 — Collider adalah volume permainan, dinyatakan di sebelah mesh-nya

**Status:** Diterima
**Tanggal:** 2026-09-15
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Begitu ada fisika (ADR-0015), tiap prop butuh collider. Cara termurah adalah
kotak batas otomatis dari mesh — dan itu cara Mighan-3D-Studio. Hasilnya salah
dengan cara yang langsung terasa:

- Kotak batas pohon selebar kanopinya (±2 m). Pemain tertahan jauh sebelum
  batang.
- Pengendali karakter menaiki apa pun yang lebih rendah dari 0,35 m. Bangku
  0,30 m dan dulang lesehan 0,16 m **terukur bisa dinaiki**.
- Cincin portal berputar di sumbu Y; collider tetap mana pun salah separuh waktu.

Rupa3D, Galantara, dan Mighan-3D-Studio perlu satu cara menyatakan collider
supaya proksi yang diukur di satu tempat berlaku di tempat lain.

## Keputusan

1. **Tiap pembuat prop menyatakan collider-nya sendiri**, di sebelah mesh yang
   diwakilinya, dengan angka yang sama:
   - prop prosedural: `g.userData.fisika` di tiap builder
     (`src/tools/proceduralMeshFactory.js`)
   - prop native Oola: `World._daftarFisika()` di sebelah mesh-nya
   - meja: `MejaNongkrong.deskriptorFisika()`
2. **Kosakata Rupa3D** (`src/fisika/bentuk.js`, identik dengan
   `Rupa3D/fisika.mjs:66-69`): `kotak | bola | kapsul | silinder | cembung`,
   `ukuran` PENUH, `letak` lokal, rotasi bagian `putarY` atau kuaternion
   `putar`. Euler dua sumbu ditolak. Hull ≤ 4.096 titik, finite, dan membentang
   tiga dimensi.
3. **Volume permainan, bukan salinan bentuk**:
   - batang, bukan kanopi;
   - penghalang dimulai dari tanah (kolong meja 0,68 m tidak bisa dilewati avatar
     1,30 m, jadi tidak dimodelkan);
   - benda rendah yang tidak boleh dinaiki diberi volume ≥ 0,60 m;
   - benda rapat (rumpun bambu, pagar bilah) jadi satu volume;
   - benda berputar tidak padat, alasnya padat;
   - benda di atas kepala (atap, papan nama, kanopi) tidak diberi collider.
4. **Kosong adalah keputusan**: `userData.fisika = []` untuk bunga dan semak.
   Prop yang tidak menyatakan apa pun memicu peringatan konsol
   `[fisika] prop "…" tidak menyatakan collider`.
5. **Satu tempat pendaftaran** untuk prop peta dan prop Game Builder:
   `World.addObject()`, dengan penanda `userData.fisikaTerdaftar`.

Konvensi untuk GLB (`extras.rupa3d.collider { versi, jenis, bagian[] }`, usul
Codex) **belum diputuskan** — tercatat di Omiga sebagai usulan yang menunggu
Fahmi. Galantara belum membaca collider dari GLB.

## Konsekuensi

### Yang didapat

- Pulau Oola: 62 collider, 0 peringatan, dijaga uji dengan THREE asli.
- Terasering bisa didaki undak demi undak; tangga rumah panggung bisa dinaiki
  dua anak tangga. Collider jadi alat desain level, bukan cuma penghalang.
- Tidak ada skala kedua: angka collider sudah dikali `scale` di builder.
- Proksi dari Rupa3D bisa dipasang tanpa terjemahan kosakata.

### Yang dibayar

- Tiap builder baru wajib menulis collider-nya. Lupa = peringatan konsol, bukan
  galat — cukup untuk ketahuan di pengembangan, tidak cukup untuk memblokir.
- Angka collider bisa menyimpang dari mesh kalau mesh diubah tanpa collider-nya.
  Belum ada uji yang membandingkan keduanya; tampilan `?kolisi` satu-satunya
  pemeriksaan visual.
- Kanopi yang menembus kepala avatar adalah harga "pohon tidak terasa seperti
  tembok".
- `putar` kuaternion didukung pembaca tapi belum dipakai prop mana pun.

## Alternatif yang ditolak

**Kotak batas otomatis dari mesh.** Ditolak: salah untuk semua prop organik dan
semua benda di bawah batas naik tangga.

**Konvensi nama Godot `-col` / Unreal `UCX_`.** Ditolak untuk prop prosedural
(tidak ada berkas yang dinamai), dan untuk GLB diserahkan ke keputusan kontrak
extras — nama objek adalah sumber kebenaran yang rapuh.

**Satu hull `rupa_proksi` untuk seluruh bangunan.** Ditolak: hull menutup
pintu, interior, dan kolong. `rupa_proksi` tetap dipakai sebagai pembuat
geometri per bagian.

## Bukti

`src/fisika/bentuk.js`, `src/tools/proceduralMeshFactory.js`,
`src/world/World.js`, `src/world/MejaNongkrong.js`,
`tests/fisikaDunia.test.mjs` ("setiap prop menyatakan collider-nya", "bangku dan
meja tidak bisa dinaiki").
