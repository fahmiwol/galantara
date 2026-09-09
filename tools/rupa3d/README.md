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

## Kenapa GLB, bukan mesh procedural di klien

Mesh procedural di `src/tools/proceduralMeshFactory.js` bagus untuk bentuk
sederhana yang perlu variasi seed. Untuk bangunan dengan siluet khas, GLB lebih
tepat: bentuknya sudah dibuktikan sekali di sini, klien tinggal memuat, dan
21 KB jauh lebih murah daripada puluhan mesh yang disusun saat runtime.
