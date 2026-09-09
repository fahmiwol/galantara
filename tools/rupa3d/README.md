# Alat model Rupa3D — milik sendiri, bukan sekali pakai

Folder ini berisi **alatnya**, bukan cuma hasilnya. Tiap model dibangun dari
konstanta bernama, dibuktikan dengan angka, dan dilihat dengan mata sebelum
dinyatakan selesai. Kalau proporsinya salah, yang diubah **konstanta di blok
SPEK** — bukan menambal verteks. Itu yang membuatnya bisa disetel ulang tanpa
dibangun ulang.

## Alur yang dipakai

```
bangun  ->  rupa_ukur (angka)  ->  rupa_lihat (mata)  ->  ubah SPEK  ->  ulang
                                                                          |
                                                                    rupa_ekspor
```

Dua aturan yang tidak boleh dilanggar:

- **Jangan mengaku selesai tanpa `rupa_lihat`.** Angka tidak bisa membaca komposisi.
- **Jangan mengaku ukurannya benar tanpa `rupa_ukur`.** Mata tidak bisa membaca skala.

Keduanya terbukti perlu di model pertama: angka bilang bangunannya berdiri,
render bilang ketiga massa atapnya menyatu jadi satu lereng — cacat yang tidak
akan terlihat dari angka mana pun.

## Cara menjalankan ulang

Butuh Blender (terdeteksi 5.2.1 LTS) dan MCP `rupa3d`.

```
rupa_baru   ruang="galantara-joglo"
rupa_skrip  ruang="galantara-joglo"  kode=<muat tools/rupa3d/joglo.py, panggil bangun()>
rupa_ukur   ruang="galantara-joglo"
rupa_lihat  ruang="galantara-joglo"  sudut=["depan","hero"]
rupa_ekspor ruang="galantara-joglo"  berkas="C:\galantara\assets\models\joglo.glb"
```

Skrip dimuat dari berkas repo, bukan ditempel inline — jadi berkas di sini
selalu jadi sumber kebenarannya.

## Model

### `joglo.py` — Rumah Joglo (rumpun Spot Yogyakarta)

**Terukur:**

| | |
|---|---|
| Segitiga | **168** (anggaran prop kecil: ≤5.000) |
| Kotak batas | 5,48 × 4,88 × 4,15 m |
| Tinggi vs sasaran | 4,145 m vs 4,10 — meleset 1,1% |
| Tepi tak-manifold | 0 |
| Simpul lepas | 0 |
| Skala diterapkan | ya, ke verteks (bukan ke node) |
| Berkas GLB | 21 KB |

**Bukti render:** `assets/models/bukti/joglo-depan.png`, `joglo-hero.png`.

**Riwayat iterasi**, supaya tidak diulang:

1. Bangunan berdiri, angka wajar, tapi render tampak depan memperlihatkan
   ketiga massa atap **menyatu jadi satu lereng menerus**. Tumpangsari Joglo
   justru dikenali dari garis patahan antar tingkat.
2. Ditambahkan `TUMPANG_LUBER = 1.22` — tiap tingkat menjorok keluar dari
   puncak tingkat di bawahnya, sehingga patahannya terlihat. `BRUNJUNG_SUDUT`
   dinaikkan 52° → 58° supaya mahkotanya dominan.
3. Hasilnya tinggi ikut naik 3,54 → 4,15 m, kebetulan mendekati sasaran.

**Yang TIDAK diklaim:** angka tapak dan tinggi adalah abstraksi supaya terbaca
di kamera Galantara (phi 18–76°), bukan ukuran baku rumah Joglo. Yang bersumber
adalah **susunannya** — tiga massa atap, empat saka guru, alas berundak — bukan
rasio pastinya. Rujukan di `docs/RISET_3D_NUSANTARA.md` §3.

### `sulah_nyanda.py` — Sulah Nyanda (Baduy/Kanekes, Banten)

| | |
|---|---|
| Segitiga | **236** |
| Kotak batas | 5,24 × 5,24 × 3,60 m |
| Tinggi vs sasaran | 3,602 m vs 3,60 — meleset **0,06%** |
| GLB | 29 KB |

**Riwayat iterasi:**

1. Sudut atap ditebak 46° → tinggi meleset **15%** (4,15 m vs 3,60).
2. Render tampak kiri memperlihatkan **sosoran melayang terpisah** dari
   rumahnya — dibuat sebagai prisma pelana kedua yang diletakkan di samping.
   Cacat ini tidak muncul di angka mana pun.
3. Sudut dihitung **mundur** dari tinggi sasaran: `atan(1,48 / 1,96)` = 37,1°.
   Sosoran diganti jadi satu bidang miring yang menempel di tepi atap utama.

**Pelajaran yang dibawa ke model berikutnya:** jangan menebak sudut lalu
mengecek tingginya. Hitung sudut DARI tinggi sasaran.

### `rumah_panggung.py` — Rumah panggung Bugis–Makassar (Spot Losari)

| | |
|---|---|
| Segitiga | **236** |
| Kotak batas | 5,50 × 4,67 × 4,20 m |
| Tinggi vs sasaran | 4,20 m vs 4,20 — **tepat** |
| GLB | 29 KB |

Sudut atap (33,6°) dihitung sendiri dari tinggi sasaran sejak awal — pelajaran
dari sulah_nyanda langsung dipakai.

**Dua cacat yang hanya render bisa tunjukkan:**

1. Lis **timpalaja menempel di bidang miring atap**, bukan di muka gable. Di
   `prisma_pelana` bubungan membujur arah **X**, jadi segitiga gable ada di
   ±X — bukan ±Y seperti yang saya tulis.
2. Setelah arahnya benar, lis diletakkan 4 cm ke **dalam** dengan tebal 7 cm,
   jadi hampir seluruhnya terkubur di mesh atap dan cuma tersisa titik kecil.
   Sekarang menempel di luar muka gable.

**Batas yang disengaja:** jumlah susunan timpalaja dapat menandai status
sosial. Model generik tidak boleh memberi pangkat palsu, jadi dibuat **dua lis
sederhana** yang memperjelas bidang gable — bukan jumlah yang mengaku mewakili
status tertentu.

## Terbukti termuat di mesin gamenya

Bukan cuma di Blender. Ketiga GLB diuji lewat `THREE.GLTFLoader` di halaman
Galantara yang sebenarnya (Three.js r128):

```
joglo.glb          OK | 5.48 x 4.15 x 4.88 m | 14 mesh | 168 tri
sulah_nyanda.glb   OK | 5.24 x 3.60 x 5.24 m | 20 mesh | 236 tri
rumah_panggung.glb OK | 5.50 x 4.20 x 4.67 m | 20 mesh | 236 tri
```

Angkanya sama persis dengan laporan `rupa_ekspor`, dan konversi Y-up benar
(tinggi jadi komponen Y). Skala diterapkan ke verteks, jadi tidak ada skala
tersisa di node — manual three.js menyebut itu sumber masalah runtime.

## Kenapa GLB, bukan mesh procedural di klien

Mesh procedural di `src/tools/proceduralMeshFactory.js` bagus untuk bentuk
sederhana yang perlu variasi seed. Untuk bangunan dengan siluet khas, GLB lebih
tepat: bentuknya sudah dibuktikan sekali di sini, klien tinggal memuat, dan
21 KB jauh lebih murah daripada puluhan mesh yang disusun saat runtime.
