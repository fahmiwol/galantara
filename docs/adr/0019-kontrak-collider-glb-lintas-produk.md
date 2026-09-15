# ADR-0019 — Kontrak collider GLB lintas produk: `asset.extras.rupa3d.collider` v1

**Status:** Diterima
**Tanggal:** 2026-09-16
**Konteks proyek:** Galantara × Rupa3D × Mighan Studio

## Konteks

Rupa3D mengukur proksi tabrakan dengan Rapier, Galantara menjalankannya dengan
Rapier, dan Mighan Studio mengekspor metadata lewat `userData.mighan`. Tanpa satu
format pertukaran, proksi yang diukur di Rupa3D berperilaku sebagai benda lain di
runtime.

Codex mengusulkan formatnya pada 15 Sep (OMIGA `L9ba5eaebf1`). Galantara sudah
membacanya sejak `5a32875` (berkas pendamping rumah panggung dan joglo). Yang
belum ada: keputusan bahwa format itu kontrak. Fahmi, 16 Sep: "putuskan, saya
tidak paham." Sesi Rupa3D menerimanya tanpa keberatan dan menambahkan dua catatan
(butir 7 dan 8).

## Keputusan

1. **Letak:** `asset.extras.rupa3d.collider` di JSON GLB. Cadangannya
   `<nama>.collider.json` di sebelah GLB dengan objek yang sama. Pembaca
   mendahulukan yang di dalam GLB.
2. **Objek:** `{ "versi": 1, "jenis": "statis", "bagian": [ … ] }`. Pembaca
   menolak versi selain 1, jenis selain `statis`, dan `bagian` kosong.
3. **Bagian:** `bentuk` ∈ `kotak | bola | kapsul | silinder | cembung`.
   - `ukuran`: ukuran PENUH `[x, y, z]` dalam meter.
   - `letak`: `[x, y, z]`.
   - `putar`: kuaternion `[x, y, z, w]` dengan norma > 0.
   - `titik`: `[x, y, z, …]` untuk `cembung`, paling banyak 4.096 titik, finite,
     dan membentang 3D.

   Kosakatanya sama dengan Rupa3D `fisika.mjs` dan Galantara `src/fisika/bentuk.js`.
4. **Ruang:** akar GLB, meter, Y ke atas, sebelum transform node atau manifest.
   Pembaca menerapkan transform induk tepat sekali. Di Galantara itu berarti skala
   seragam dan `rotationY` dari entri manifest.
5. **Penulis wajib memakai `putar` kuaternion.** Euler X/Z ditolak. `putarY` hanya
   diterima Galantara untuk berkas pendamping yang ditulis tangan.
6. **Setiap penulis `asset.extras.rupa3d` wajib mempertahankan `collider`.**
   Rupa3D memakai `KUNCI_KONTRAK = ['collider']`: sertifikat lama diganti utuh
   kecuali kunci kontrak. Sengaja bukan `{...lama, ...sertifikat}`, yang akan
   menyisakan bidang sertifikat basi.
7. Pembaca membaca `extras.rupa3d.collider` **langsung**, tidak lewat objek
   sertifikat.
8. **Operasi yang mengubah geometri** (LOD, decimate, Draco, perbaikan mesh)
   tidak boleh membawa collider lama begitu saja, karena collider bisa tidak cocok
   lagi dengan mesh. Collider ditulis ulang atau dihapus.

## Konsekuensi

### Yang didapat

- Proksi yang diukur di Rupa3D menjadi volume yang sama di Galantara.
- Tidak bergantung pada nama objek, dan satu aset bisa membawa beberapa bagian.
- Sertifikat dan collider hidup berdampingan tanpa saling menghapus (diuji di
  Rupa3D: dua kali tempel sertifikat, collider selamat).

### Yang dibayar

- Ada dua tempat (di dalam GLB dan berkas pendamping) yang bisa menyimpang. Kalau
  keduanya ada, yang di GLB menang tanpa peringatan.
- v1 hanya statis: tanpa sensor, badan dinamis, atau collider per node. Aset yang
  bergerak (pintu, kendaraan) butuh v2.
- Transform node di dalam GLB diabaikan karena collider berada di ruang akar.
  Penulis harus memanggang transform node ke `letak`/`putar`.

## Alternatif yang ditolak

**Konvensi nama `-col` (Godot) / `UCX_` (Unreal).** Ditolak: bergantung pada
nama objek, satu collider per mesh, dan tidak bisa membawa aturan. Boleh jadi
masukan adapter authoring, tetapi bukan sumber kebenaran kedua.

**Hull otomatis dari mesh.** Ditolak: kotak batas otomatis salah untuk pohon dan
benda rendah (ADR-0016).

**`userData.mighan`.** Ditolak sebagai kontrak lintas produk: khusus Studio dan
tidak tersimpan di `asset`.

## Bukti

- Galantara: `src/world/AssetLibrary.js` (`_bacaCollider`),
  `src/fisika/bentuk.js` (`bacaKontrakCollider`), `tests/assetCollider.test.mjs`,
  `assets/models/{rumah_panggung,joglo}.collider.json`. Live sejak `4a9c6d2`:
  Losari 35 collider termasuk GLB.
- Rupa3D (repo privat): `glb.mjs` `KUNCI_KONTRAK`, uji merah dulu, suite
  298/298, masuk rilis 1.6.3 (laporan sesi Rupa3D, 16 Sep).
