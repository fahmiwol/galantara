## 1. Cerita tempat

Menjelang magrib, seorang pemain baru berjalan dari portal sambil masih membuka peta. Di bawah pohon ungu, dua avatar membagi tempat di meja; satu memegang gelas enamel, satu lagi memutar termos pendek sebelum menuang. Tiga anak berdiri dekat papan pengumuman, membaca kartu yang dipasang miring. Daun bergerak pelan di atas kepala. Terdengar percakapan terputus, sendok menyentuh bibir gelas, dan dengung serangga **(nanti)**. Udara membawa aroma teh melati dan tanah yang baru disiram. Di atas nampan ada satu lingkar bekas gelas yang belum dibersihkan.

## 2. Suasana

- **Waktu terbaik:** 17.20–18.00 waktu lokal.
- **Cahaya:** datang rendah dari barat–barat daya; matahari `#F2A65A`, bayangan lavender `#6B5F8F`, pantulan gading `#F4EAD6`.
- **Gerak:** kanopi bergeser maksimum 1,5°, kain peneduh berombak 2–3 cm, daun lantai berputar maksimum 4°, cincin air bawah pulau mengembang 6% selama 7 detik. Tidak perlu asap.
- **Kepadatan:** 3 kelompok benda, masing-masing berjarak 4–7 m; minimal 55% area tengah tetap bebas berjalan. Jangan menyusun prop sebagai cincin merata di tepi pulau.
- **Tanda tempat nyata:** satu gelas ditaruh terbalik dan meninggalkan bekas lingkar `Ø 0,07 m` pada nampan.

## 3. Yang kurang di kode sekarang

1. `_buildPurpleTree()` memakai tiga bola ungu jenuh dan halo berputar sempurna. Siluetnya terbaca sebagai “fantasy tree asset”, bukan pohon tempat orang berlindung.
2. `default_oola.json` menyebar enam pohon, lima lampu, lima bunga, dan empat semak hampir merata di perimeter. Pengulangan archetype dan jarak seragam membuatnya terasa seperti demonstrasi katalog aset.
3. Oola memiliki tiga `_buildBench`, tiga `bench_park`, lalu `MejaNongkrong`. Jumlah duduk sudah cukup, tetapi tidak ada jejak kegiatan di sekitarnya; bangku menjadi benda pajangan.
4. `_buildDevHub()` berupa kotak gelap `#1E1040` dengan layar hijau `#00FF88`. Kontras neon ini memutus palet gading–emas–lavender dan tampak seperti kios teknologi generik.
5. `_buildSign()` mengabaikan `_label` dan hanya menghasilkan kubus `0,15 m`. Portal dan Dev Hub secara visual tidak punya informasi yang dapat dibaca.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---|---|---:|---|---|---|
| Kanopi pohon berlapis | hero | Ganti 3 sphere dengan 7 ellipsoid, masing-masing 8×5 segmen; pertahankan trunk | bentang 6,4 × 5,6; tinggi 6,6 | `#8067B7`, `#9B83C8`, `#B39AD5`, batang `#6B3F1A` | 900 | Rotasi cabang ±1,5°, periode 9 dtk | PADAT trunk; TEMBUS kanopi | Mengganti kanopi `_buildPurpleTree(0,0,0)`; halo diperkecil |
| Halo tidak sempurna | pendukung | Torus terputus 18° memakai `ShapeGeometry`, bukan lingkar utuh | Ø 3,8; tebal 0,10 | `#E9C86A` | 220 | Rotasi 0,04 rad/dtk | TEMBUS | Mengganti halo pohon pada y 7,1 |
| Tapak rumput aus | pendukung | 3 bidang oval tak sebangun, 14–18 titik | 4,8 × 3,1; tebal visual 0,01 | `#9CB98E`, `#A98055`, `#B59A70` | 48 | Tidak ada | TEMBUS | Di antara pohon dan `MejaNongkrong`, pusat sekitar `(-2,4, 2,6)` |
| Kain peneduh meja | pendukung | Satu bidang kain 12 vertex, 3 tiang silinder 8 sisi, 3 tali | 3,2 × 2,7 × 2,35 | kain `#F4EAD6`, tambalan `#C4B5FD`, tiang `#8A6B4F` | 180 | Sudut kain ±1°, periode 6 dtk | PADAT tiang; TEMBUS kain/tali | Menaungi `MejaNongkrong` di `(-4,6, 4,4)` tanpa mengubah kursi |
| Perangkat minum | detail | Termos 8 sisi, 3 gelas silinder 8 sisi, nampan box tipis | area 0,62 × 0,38 × 0,32 | `#D7C9A7`, `#F4EAD6`, lis `#C0553F`, tutup `#6B5F8F` | 420 | Tidak ada | PADAT, satu compound collider | Di atas meja yang sudah ada; satu gelas terbalik |
| Keranjang sampah plastik | detail | Kerucut terpancung 8 sisi dengan 10 bilah box | 0,38 × 0,38 × 0,48 | `#7F8B68` | 170 | Tidak ada | PADAT | `0,75 m` di belakang kain peneduh, sisi terjauh dari jalur |
| Papan pengumuman terpakai | pendukung | 2 tiang 6 sisi, papan bevel sederhana, 7 kartu bidang | 1,65 × 0,18 × 2,15 | kayu `#8A6B4F`, papan `#D7C39B`, kertas `#F4EAD6`, tinta `#4A3B63` | 280 | Dua sudut kertas bergerak ±2° | PADAT tiang/papan; TEMBUS kertas | Mengganti `_buildInfoBoard(1,0,0)`; kartu memakai atlas tekstur tunggal |
| Wajah baru Dev Hub | pendukung | Pertahankan box dasar; tambah bingkai jendela, ambang, atap miring 12° | tetap 2,8 × 2,3 × 2,2 | badan `#F4EAD6`, alas `#6B5F8F`, atap `#C4B5FD`, layar `#BFE3D0` | 240 | Layar berganti terang 5% tiap 4 dtk | PADAT bangunan | Mengulit ulang `_buildDevHub(8,0,-2.5)`; hapus `#00FF88` |
| Jalur pijakan tak rata | pendukung | 11 cylinder 8 sisi, skala dan rotasi berbeda | tiap batu 0,65–0,9 × 0,08–0,12 | `#D8CFB5`, `#C2B89D` | 350 | Tidak ada | PADAT; tinggi <0,35 m | Jalur patah dari portal `(-7,-2)` menuju papan lalu meja; lebar bebas ≥1,8 m |
| Rumpun bunga terkurasi | detail | Pakai geometri `flower_patch` yang sudah ada; 5 patch menjadi 3 rumpun | tiap rumpun Ø 1,2–1,8 | `#C05E3C`, `#E9C86A`, `#8F7AB8`, daun `#6F7F4A` | 0 baru | Goyang ±2° | TEMBUS | Satukan `flowers_portal`+`flowers_board`; satukan tiga patch selatan/timur; hindari sebaran merata |
| Daun jatuh menetap | detail | 9 bidang berbentuk tetes, 2 segitiga per daun | 0,10–0,18 | `#8067B7`, `#A98055`, `#D0B85F` | 18 | 3 daun berputar ±4°, bukan partikel | TEMBUS | 5 di tapak pohon, 3 dekat meja, 1 tersangkut di pijakan |
| Riak cakram bawah pulau | detail | 3 torus datar, 32×4 segmen | Ø 10, 15, dan 20; tebal 0,035 | `#C9E3E8`, opacity 0,18–0,28 | 768 | Skala 1,00–1,06, periode 7 dtk | TEMBUS | Tepat di atas `diorama_sky_pool`, y sekitar `-2,05` |

Tambahan geometri sekitar **3.600 segitiga**, tanpa GLB dan tanpa PointLight baru.

## 5. Cahaya dan waktu

| Fase | Matahari/arah | Ambient relatif | Lampu aktif |
|---|---|---:|---|
| Siang | Intensitas `1,00`, `#FFF4C0`, dari barat daya dengan elevasi 48° | `0,62`, `#E5E3C7` | Semua lampu prop mati; bohlam hanya material matte |
| Magrib | Intensitas `0,55`, `#F2A65A`, elevasi 12° | `0,40`, `#C9A7C8` | Maksimal 3 PointLight: lampu `MejaNongkrong`, `lamp_board`, `lamp_portal`; masing-masing `0,55`, `#FFB35C`, radius 4,5 m |
| Malam | Directional `0,18`, `#AEB7D9` | `0,22`, `#4A3B63` | Tiga lampu yang sama menjadi `0,75`; lampu lain emissive-only `#D99A55`, tanpa PointLight |

`lamp_devhub`, `lamp_garden_w`, dan `lamp_garden_s` sebaiknya tidak menambah PointLight pada saat bersamaan. Layar Dev Hub memakai emissive rendah, bukan `MeshBasicMaterial` hijau penuh.

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Ganti warna pohon dan Dev Hub, kecilkan putaran halo.**  
   Menghapus dua sumber rupa paling generik: ungu fantasy jenuh dan kios neon. Perkiraan: **0 segitiga baru**.

2. **Ubah komposisi prop yang sudah ada.**  
   Gabungkan lima flower patch menjadi tiga rumpun, hapus tiga bangku box native yang menduplikasi `bench_park`, lalu arahkan bangku tersisa ke pohon atau meja. Perkiraan: **0 segitiga baru**, bahkan berkurang.

3. **Tambah tapak aus serta perangkat minum di meja.**  
   Dua elemen ini menunjukkan bahwa tempat telah dipakai, bukan baru didekorasi. Perkiraan: **±470 segitiga**.

## 7. Jangan

1. **Jangan menambah batik pada kain peneduh.** Motif kecil hilang dari kamera 16 m dan hanya menjadi penanda “Indonesia” tempelan.
2. **Jangan membuat gazebo simetris empat tiang.** Siluet itu mudah terbaca sebagai aset taman toko; satu kain dengan tiga tiang lebih spesifik.
3. **Jangan menambah lampion atau rangkaian bohlam keliling pulau.** Itu mengubah hub menjadi venue acara dan menambah titik cahaya tanpa fungsi.
4. **Jangan menyebar bunga, batu, dan pohon dengan jarak sama.** Pola perimeter seragam adalah sidik jari generator procedural.
5. **Jangan memakai neon ungu–hijau untuk menjelaskan portal atau teknologi.** Portal sudah terbaca dari bentuk; neon membuat Oola terasa seperti lobby game generik.