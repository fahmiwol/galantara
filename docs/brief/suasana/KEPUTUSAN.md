# Keputusan atas bentrok brief suasana

> 16 Sep 2026. Menjawab `SINTESIS.md` §2 (bentrok) dan §3 (klise yang lolos)
> **sebelum** apa pun dibangun dari brief. Diminta Fahmi lewat sesi Rupa3D:
> "bentroknya diselesaikan dulu sebelum membangun".
>
> Keputusan diambil dengan kewenangan teknis yang diberikan Fahmi (hak veto
> tetap padanya). Setiap keputusan menyebut angka yang dipakai. Yang tidak
> punya angka ditulis begitu.

## Isi Spot sekarang (terukur)

Diukur dengan `node --experimental-default-type=module tools/anggaran-spot.mjs`
(geometri prosedural + GLB manifest; avatar dan NPC tidak dihitung). Sejak
16 Sep batasnya dijaga `tests/anggaranSpot.test.mjs` dengan fungsi ukur yang
sama:

| Spot | Segitiga | Draw call | Kaster bayangan | PointLight | Collider |
| --- | ---: | ---: | ---: | ---: | ---: |
| Oola | 11.057 | 123 (153 sebelum 0a) | 56 | 3 | 59 |
| Bogor | 852 | 15 | 7 | 0 | 38 |
| Braga | 5.472 | 131 | 74 | 3 | 39 |
| Kuta | 1.882 | 81 | 63 | 2 | 27 |
| Losari | 2.116 | 86 | 6 | 3 | 35 |
| Malioboro | 3.380 | 71 | 18 | 3 | 41 |
| Monas | 2.290 | 61 | 11 | 0 | 41 |

Losari 5 → 3 PointLight dan Oola 8 → 3 sudah dikerjakan 16 Sep; Braga dan
Malioboro 10 → 3 pada 15 Sep. Semuanya dijaga uji.

## §2 — Bentrok

### 1. Anggaran: "tambahan ≤ 20.000" vs "20.000 segitiga per Spot"

**Keputusan: anggaran TOTAL per Spot, tiga batas sekaligus, diukur alat di atas:**

| Batas | Nilai | Kenapa |
| --- | --- | --- |
| Segitiga | ≤ 20.000 total | Semua Spot hari ini 852–11.057. Brief terbesar (Malioboro +14.400) masih muat: 3.380 + 14.400 = 17.780. "Tambahan" tanpa batas total tidak bisa diperiksa. |
| Draw call | ≤ 150 | **Ini batas yang lebih dulu jebol, bukan segitiga.** three r128 tanpa batching membayar tiap mesh; Oola sudah 153 dengan 11 rb segitiga. Sesi 9 Sep menurunkan Braga 254 → 139 lewat InstancedMesh — pola yang sama wajib untuk prop berulang. |
| PointLight | ≤ 3 dibuat | r128 menghitung setiap PointLight di shader tiap material walau intensitasnya 0. |

Aturan turunan: prop yang muncul ≥ 3 kali di satu Spot memakai InstancedMesh;
kit betah bersama (SINTESIS §1) wajib menyatakan draw call-nya, bukan cuma
segitiganya. Oola **melanggar** batas draw call hari keputusan ini ditulis —
`flower_patch` membuat 8 mesh per petak (40 draw call untuk lima petak bunga).
**Sudah diinstansi** (16 Sep): 2 InstancedMesh per petak, Oola 153 → 123.
Letak dan warna 20 bunga dibandingkan dengan versi lama: selisih posisi
maksimum 1,7e-8 m (Float32), warna sama semua. Di browser, menyembunyikan
kelima petak menurunkan `renderer.info.render.calls` tepat 10.

**Koreksi instrumen (16 Sep).** "Draw call" di tabel ini = pass utama isi Spot
saja. Yang tidak terhitung, diperiksa di browser dari kamera ikhtisar Oola:

- **Pass bayangan.** Tiap mesh `castShadow` digambar sekali lagi ke peta
  bayangan. `renderer.info.render.calls` r128 juga tidak menghitungnya:
  `render()` memanggil `shadowMap.render()` sebelum `info.reset()`. Satu
  bingkai Oola nyata = **139 pass utama (dengan avatar/NPC) + 70 pass bayangan
  = 209**, diukur dengan `autoReset` dimatikan selama satu bingkai (tanpa
  bayangan: 139).
- **Mesh di luar pohon Spot** — avatar, NPC, dan sisanya: 24 mesh di adegan
  Oola hari ini (147 di adegan, 123 di pulau), bertambah per pemain.

Keputusan: batas 150 tetap untuk pass utama isi Spot, karena itu yang bisa
dijaga uji tanpa browser. **Pass bayangan belum dianggarkan** — belum ada
satu pun angka dari ponsel, dan bayangan PCFSoft 1024² menyala di semua
perangkat tanpa tingkat mutu. Kolom kaster ditampilkan supaya keputusan itu
nanti tidak buta; Braga (74) dan Kuta (63) paling besar. Temuan sampingan:
rumah GLB dari manifest **tidak memancarkan bayangan sama sekali**
(`AssetLibrary` tidak menyalakan `castShadow`) — rumah panggung Losari dan
toko Malioboro tampak tidak menapak.

### 2. Monas: kontrak `64×64 m` vs rumput luar Ø56 di brief

**Keputusan: plaza yang bisa diinjak tetap Ø32 (jari 16).** `64×64` berasal
dari dokumen skala v1 (STYLE_CONTRACT §2) sebelum ada kamera orbit 16 m dan
kecepatan 5,4 m/s; plaza Ø32 sudah diberi batas dan collider (41). Rumput luar
dari brief boleh dibangun sebagai **latar di luar cincin batas**, bukan area
jalan, dan tidak sebagai cincin sempurna (brief mengkritik pola radial sendiri).

### 3. Kuta: koridor candi–air 2,2 m vs "lorong tetap 1,9 m"

**Keputusan: dua ukuran, dua tempat.** Celah candi bentar tetap 1,9 m (collider
terukur: lolos dari darat 25/25) — gerbang terbelah memang sempit. Koridor
SETELAH gerbang sampai air ≥ 2,2 m bersih: dua avatar (kapsul 0,84 m) bisa
berpapasan. Canang: dua, di sisi undakan, tidak di sumbu celah (sesuai SINTESIS §3).

### 4. Braga: 14 benda di meja vs maksimum 3 benda × 4 meja

**Keputusan: ≤ 3 benda per meja**: satu gelas-bertatakan per kursi sebagai
satu mesh (2), satu nota. Teko hanya di satu meja. Alasannya bukan segitiga
tapi draw call: 14 mesh kecil = 14 draw call untuk benda sebesar kepalan.

### 5. Losari: tiga stoples satu warna vs "tutup merah berbeda"

**Keputusan: ikut SINTESIS** — tutup 1× `#B83F32`, 2× `#D8D4C8`, badan
`#E8D9BD`. Ukur Delta-E dari piksel sebelum dipakai (ADR-0017): tutup merah di
atas badan krem harus terbaca di jam emas.

### 6. Malioboro: andong x = 2,3 menembus koridor tengah 3,2 m

**Keputusan: pusat andong x ∈ [2,6; 4,2].** 2,6 menjaga koridor (tepi andong
1,775 > 1,6); 4,2 menjaga badan andong di dalam dinding jalan (tepi dalam 5,5,
dengan collider padat). Andong di tepi sebagai latar, bukan pusat (SINTESIS §3).

### 7. Braga/Malioboro 10 PointLight

**Selesai** (15 Sep): 3 dibuat, sisanya emissive. Malioboro menyimpang dari
letak brief — pola bergantian kiri-kanan membuat kios gelap; yang diuji
sekarang "tiap titik kumpul ≤ 5 m dari lampu".

### 8. Oola: label portal dan Dev Hub

**Keputusan: panel diegetik 1,1 × 0,28 m, maksimal dua kata, tanpa neon.**
Belum dibangun. Label HUD yang sudah ada tetap sebagai cadangan
keterbacaan.

## §3 — Klise yang lolos: sikap

| Spot | Keputusan |
| --- | --- |
| Oola | Halo sudah jadi busur 225° yang diam; tiga cincin bawah pulau **tidak** dibangun. |
| Bogor | Pasar tanaman memakai pot tanah + polybag + kaleng bekas, aksen `#58734D` bukan `#10B981`. |
| Braga | Dua papan berbingkai, satu tulisan di kaca, satu nomor bangunan; "FOTO", bukan "PHOTO"; teal hanya di satu usaha. **Perbaikan arah fasad lebih dulu** (lihat bawah). |
| Malioboro | Tahap pertama tanpa NPC pengamen; satu modul toko percontohan dulu sebelum enam. |
| Kuta | Dua canang, bukan tiga. Perbaiki dulu pasir yang menutupi laut dan tangga gerbang yang terbalik (temuan agen Spot Kuta). |
| Losari | Empat pita pantulan terputus, bukan satu jalur 17 m. |
| Monas | Rusa dan pagarnya ditunda; dahulukan pohon naung dan tempat duduk. |

## Cacat yang ditemukan saat memasang collider — lebih dulu dari brief

Dicatat agen Spot 15–16 Sep, diverifikasi dari kode:

1. **Braga** — kedua deret ruko menghadap +Z (ke portal), bukan ke jalan; dua
   pembalikan tanda saling menghapus. Kanopi menembus punggung tetangga
   0,1–0,3 m di 6 celah. Memperbaikinya membuat deret timur membelakangi kamera
   bawaan θ = π/4 — keputusan: hadapkan ke jalan, dan beri Spot kemampuan
   menyatakan sudut kamera awalnya sendiri (menyusur jalan).
2. **Kuta** — pasir menutupi laut 2,2 m; tangga gerbang naik menjauhi gerbang
   dan melayang; kelapa condong sejajar pantai; kursi tanpa kaki.
3. **Monas** — atap rumah kebaya terbalik, tiang teras tanpa atap, tugu
   melayang: **sudah diperbaiki** 15 Sep.
4. **Losari** — rumah panggung menabrak portal, tangga menghadap tepi darat:
   **sudah diperbaiki** 16 Sep (manifest).

## Urutan bangun yang berlaku

SINTESIS §4 tetap acuan, dengan dua sisipan di depannya:

0a. ~~Instansi `flower_patch`~~ — selesai 16 Sep, Oola 123 draw call.
0b. Perbaiki cacat Braga dan Kuta di atas.

Lalu §4 langkah 1–10, masing-masing diukur dengan `tools/anggaran-spot.mjs`
sebelum dan sesudah.
