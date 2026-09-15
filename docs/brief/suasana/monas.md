## 1. Cerita tempat

Pukul lima kurang, saya duduk menghadap Monas sambil memegang teh botol berembun. Dua anak menghitung rusa dari balik pagar rendah; ibunya membuka rantang dan merapikan sandal di tepi tikar. Di dekat gerobak, pedagang memutar kerak telor di atas anglo. Sendok mengenai wajan, roda gerobak berdecit, lalu azan mulai terdengar jauh **(nanti)**. Bau arang, kelapa sangrai, dan rumput yang baru disiram datang bergantian. Sepasang ondel-ondel berdiri dekat rumah kebaya, tetapi orang lebih lama berkumpul di bawah pohon. Ada jeda kosong antarkelompok, cukup untuk melihat orang lewat tanpa merasa sedang dipamerkan.

## 2. Suasana

- **Waktu terbaik:** 16.45–17.35.
- **Matahari:** dari barat–barat daya; directional light `#F2A65A`, elevasi visual sekitar 18°.
- **Fill langit:** `#F4EAD6`; bayangan tidak lebih gelap dari `#4A3B63`.
- **Gerak lambat:** tajuk bergeser maksimum 2°, kain gerobak 3°, kepala rusa menunduk tiap 9–14 detik, asap anglo berupa 3 plane yang naik 0,35 m/detik.
- **Kepadatan:** 8–14 avatar terlihat; kelompok 2–4 orang; sisakan koridor kosong selebar 5–6 m.
- **Penanda tempat nyata:** tiga tambalan paving berbeda warna, bukan pola lantai yang seragam.

## 3. Yang kurang di kode sekarang

1. `plaza` hanya berdiameter sekitar 34 m, sementara kontrak Monas menetapkan area 64×64 m. Hasilnya terasa seperti podium bundar, bukan lapangan tempat orang menyebar.
2. `base` BoxGeometry + `cap` ConeGeometry membuat Monas terbaca sebagai obelisk generik. Tidak ada podium/cawan atau perubahan profil pada pangkal yang menahan siluet.
3. `monas_oleh` hanya `InteractionVolume` di `(5.5, -2)`. Tidak ada kiosk atau pedagang visual, sehingga prompt terasa menempel pada ruang kosong.
4. Rumah kebaya dan ondel-ondel sudah cukup dominan, tetapi tidak dikelilingi aktivitas sehari-hari. Saat ini keduanya terbaca sebagai pajangan kebudayaan.
5. `getLampu()` mengembalikan array kosong. Selepas matahari turun, tidak ada kantong cahaya yang menandai tempat berkumpul.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---:|---|---:|---|---|---|
| Lapangan rumput luar | hero | `RingGeometry`, 48 segmen, radius 17–28 | Ø56 × 0,06 | `#6F7F4A`, bercak `#8A6B4F` | 200 | — | PADAT | Mengelilingi `plaza`; tambahkan ke raycast target |
| Profil pangkal Monas | hero | 3 Box bertingkat + 1 Cylinder oktagonal | 4,8 × 0,75 × 4,8 | `#F4F1E8`, sisi `#D8D4C8` | 80 | — | PADAT | Tepat di pusat; `base` lama dinaikkan 0,75 m |
| Gerobak kerak telor | pendukung | Box berbevel sederhana, 2 roda Cylinder, kanopi miring | 2,2 × 2,15 × 1,05 | `#F4F1E8`, `#B0483F`, `#6B3F1A` | 700 | kain ±3° | PADAT | Pusat `(5.5, 0, -2)`, mengisi volume `monas_oleh` |
| Anglo, wajan, dan asap | detail | Cylinder 10 sisi, mangkuk setengah bola, 3 crossed-plane | 0,65 × 1,05 × 0,65 | `#8A6B4F`, `#3F3730`, asap `#D8D4C8` | 180 | asap naik berulang | Anglo PADAT; asap TEMBUS | Sisi kiri gerobak, jarak 0,35 m |
| Papan harga tulis tangan | detail | Box tipis pada 2 kaki; 4 garis geometri datar | 0,72 × 1,0 × 0,08 | `#2F6B3A`, tulisan `#F4EAD6` | 60 | — | PADAT | 0,8 m di depan gerobak; jangan menutup koridor |
| Tujuh pohon peneduh | pendukung | batang Cylinder 7 sisi; tiap tajuk 3 Icosahedron | tinggi 4,8–6,2; tajuk Ø3,2 | `#2F6B3A`, `#557943`, batang `#6B3F1A` | 1.500 | tajuk ±2° | PADAT | Busur radius 21–25 m; jangan di depan kamera foto `(0,3.2)` |
| Tiga modul `MejaNongkrong` | pendukung | Pakai modul yang sudah ada; alokasi tapak 3×3 | 3 tapak, masing-masing 3 × 3 | Palet modul disetel ke `#F4F1E8`, `#2F6B3A` | 0 geometri baru | sesuai modul | sesuai modul | `(−8,−8)`, `(1,−10)`, `(9,−7)`; orientasi menghadap pusat |
| Perlengkapan piknik | detail | 2 rantang Cylinder, 2 termos, 6 sandal Box/wedge | tapak 1,8 × 0,35 × 1,4 | `#D4A537`, `#BFE3D0`, `#C05E3C` | 420 | — | TEMBUS | Mengitari dua modul lesehan; bukan di atas titik duduk |
| Kantong taman rusa | pendukung | patch rumput ShapeGeometry + pagar kayu 12 ruas | 9 × 0,65 × 7 | `#557943`, pagar `#8A6B4F` | 500 | — | Pagar PADAT; rumput PADAT | Kuadran barat laut, pusat sekitar `(−17,−12)` |
| Dua rusa stylized | pendukung | badan ellipsoid, kaki tapered Box, kepala low-poly, tanduk bercabang sederhana | masing-masing 1,25 × 1,45 × 0,45 | `#A98055`, dada `#D8C49E` | 1.200 | kepala turun tiap 9–14 dtk | PADAT | Di dalam kantong taman; collider badan tetap |
| Tiga lampu taman natrium | pendukung | tiang Cylinder 8 sisi + kap setengah bola | tinggi 3,6; kap Ø0,45 | `#3F4A3D`, nyala `#FFB35C` | 240 | nyala tetap | PADAT | `(−10,−6)`, `(7,−8)`, `(−14,10)`; 3 PointLight tanpa bayangan |
| Tambalan paving dan got | detail | 3 ShapeGeometry tak beraturan + 1 grate Box bergaris | area total 4,5 × 0,02 × 2,5 | `#C8C1B2`, `#AFA99E`, got `#7D848C` | 120 | — | TEMBUS | Di plaza bagian selatan, antara foto dan area duduk |

**Tambahan perkiraan:** sekitar **6.900 segitiga**, di luar biaya render modul `MejaNongkrong` yang sudah ada.

## 5. Cahaya dan waktu

| Waktu | Matahari/ambient relatif | Warna | Lampu Spot |
|---|---:|---|---|
| Siang | directional `1,00`; ambient `0,55` | matahari `#FFF4C0`, ambient `#F4F1E8` | Ketiga lampu mati; material kap tidak emissive |
| Magrib | directional `0,45`; ambient `0,38` | matahari `#F2A65A`, ambient `#D8C9B8` | 3 PointLight `#FFB35C`, intensitas `0,70`, jarak 7 m, decay 2 |
| Malam | directional `0,15`; ambient `0,25` | langit/fill `#4A3B63`, ambient `#7E806F` | 3 PointLight intensitas `1,00`, jarak 8 m; lampu gerobak cukup emissive `#BFE3D0`, tanpa PointLight tambahan |

`getLampu()` perlu mengembalikan tepat **3 lampu taman**. Jangan memberi cahaya sendiri pada ujung emas Monas.

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Bangun gerobak kerak telor pada volume `monas_oleh`.**  
   Mengubah prompt kosong menjadi pusat aktivitas yang punya bentuk, bau, dan alasan untuk berhenti. **±940 segitiga** termasuk anglo, asap, dan papan.

2. **Pasang tujuh pohon serta tiga titik `MejaNongkrong` di bawah tajuk.**  
   Plaza mendapat tepi, naungan, dan jarak antarkelompok tanpa membuat bangunan baru. **±1.500 segitiga + modul existing**.

3. **Tambahkan tiga lampu natrium dan tambalan paving.**  
   Tempat tetap terbaca selepas magrib dan lantai berhenti terlihat seperti aset showroom. **±360 segitiga**, 3 PointLight tanpa bayangan.

## 7. Jangan

1. **Jangan menambah motif batik pada kanopi, tikar, pagar, dan UI sekaligus.** Itu menjadikan identitas sebagai tekstur tempelan.
2. **Jangan memenuhi tepi dengan skyline gedung Jakarta.** Kamera orbit akan mengubah lapangan menjadi miniatur brosur kota.
3. **Jangan membuat paving radial sempurna dan semua pohon berjarak sama.** Pengulangan identik adalah sidik jari aset toko.
4. **Jangan menambah lebih banyak ikon budaya di sekitar rumah kebaya dan ondel-ondel.** Yang kurang adalah aktivitas manusia, bukan simbol.
5. **Jangan memakai neon RGB atau lampu emas pada semua objek.** Malam cukup memakai tiga kantong cahaya natrium dan satu emissive dingin di gerobak.