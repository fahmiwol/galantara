## 1. Cerita tempat

Saya duduk menghadap garis air menjelang magrib. Penjual kelapa berdiri di belakang peti biru, memegang satu kelapa yang sudah dibuka; dua anak berbagi sedotan sambil menaruh sandal tidak sejajar di pasir. Seorang peselancar menyandarkan papan basah pada rak kayu, lalu ikut duduk tanpa mengganti kaus. Ombak, gesekan pelepah, dan bunyi kelapa diletakkan di meja terdengar pelan **(nanti)**. Udara membawa garam, sabut basah, dan sedikit dupa dari canang di undakan gerbang. Orang tidak berkumpul di tengah, melainkan membentuk tiga kelompok kecil yang masih bisa saling menyapa.

## 2. Suasana

- **Waktu terbaik:** 17.25–18.10.
- **Cahaya:** datang rendah dari laut, arah `-Z → +Z`; matahari `#F2A65A`, highlight pasir `#F3D39A`, bayangan `#617F86`.
- **Gerak:** buih 0,45 m maju-mundur; pelepah ±2,6°; kain jemur ±3°; asap dupa berupa 2 pita transparan yang bergeser 0,08 m.
- **Kepadatan:** 3 kelompok nongkrong, masing-masing 2–4 avatar; sisakan koridor jalan selebar 2,2 m dari candi ke air.
- **Penanda tempat nyata:** sepasang sandal berbeda arah dan satu lingkar air kelapa di atas peti, bukan dekorasi simetris.

## 3. Yang kurang di kode sekarang

1. Empat papan pada blok `// Papan selancar...` masih berupa kotak tegak dengan jarak 0,95 m yang seragam. Ini terbaca sebagai display aset toko, bukan papan habis dipakai dan disandarkan.
2. Blok `// Payung + kursi berjemur` memakai dua set identik—cone oranye, kursi putih, jarak 3,2 m. Siluetnya lebih dekat ke resor generik daripada tempat nongkrong Kuta awal 2000-an.
3. `laut` adalah satu bidang datar dan `_buih` satu balok lurus sepanjang pantai. Pertemuan air-pasir terbaca seperti tepi kolam.
4. `kuta_candi_bentar` sudah punya tiga undakan, tetapi tidak ada canang atau jejak pemakaian. Gerbang akhirnya hanya menjadi landmark untuk tombol interaksi.
5. Belum ada penjual kelapa, wadah jualan, sampah sabut, atau kelompok aktivitas. Area yang luas terisi objek penanda, tetapi belum memiliki alasan untuk berhenti.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---:|---|---:|---|---|---|
| Lapak kelapa tanpa kursi | hero | Peti utama 3 box, kanopi datar 1 box, 2 tiang cylinder 6 sisi, cooler box | 2,4 × 1,2 × 2,1 | `#6B4A2F`, `#EFE2C8`, `#3D8FB8` | 180 | Kain kanopi ±2° | PADAT; 1 collider box | `x=-8, z=1,5`, tidak menutup portal `(-11, 5)` |
| Penjual kelapa chibi | pendukung | Kepala sphere 8×6, badan sphere, lengan cylinder 6 sisi, celemek bidang | tinggi 1,18 | `#C05E3F`, `#EFE2C8`, `#6F7F4A` | 420 | Kepala menoleh tiap 8–12 dtk; tangan bergeser 8° | TEMBUS | Di belakang lapak, `x=-8, z=2,0` |
| Tumpukan 7 kelapa muda | detail | Sphere 8×5 dipipihkan, ujung cone 5 sisi | Ø 0,28 per buah | `#8A9455`, `#6F7F4A` | 350 | Tidak ada | PADAT; 1 collider kelompok | Sisi laut lapak, `x=-7,1, z=0,9` |
| Rak papan + reposisi 4 papan existing | pendukung | 2 rangka A dari box; papan existing dimiringkan 8°–17° dan jarak tidak seragam | 2,9 × 0,65 × 1,45 | `#6B4A2F`; papan tetap `#E2703A`/`#D9EEF5` | 72 baru | Satu leash bergoyang ±0,04 m | PADAT; 1 collider box | Ganti susunan papan sekitar `x=-5,5…-2,65, z=-0,3` |
| Tiga canang + asap pita | detail | Nampan box tipis, 5 kelopak triangle, daun lipat; 2 crossed quads untuk asap | Ø 0,24 × 0,10 | `#8A9455`, `#EFE2C8`, `#E2703A`, asap `#D9EEF5` alpha 0,35 | 180 | Asap naik 0,25 m dalam loop 5 dtk | TEMBUS | Satu pada tiap undakan candi, bergeser ke `x=0,65` agar lorong tetap 1,9 m |
| Tali jemur 2 kain pantai | pendukung | 2 tiang cylinder 6 sisi, tali garis, kain plane 2×3 segmen | 2,6 × 0,25 × 1,65 | `#3D8FB8`, `#C05E3F`, `#EFE2C8` | 68 | Vertex kain ±0,05 m, fase berbeda | Tiang PADAT; kain TEMBUS | Di belakang lapak, `x=-7,5, z=3,2`, sejajar garis pantai |
| Sandal dan jejak kaki | detail | 4 sandal dari box bevel sederhana; 12 footprint plane/ShapeGeometry | sandal 0,26 × 0,11 | `#3D6B9E`, `#C0553F`, jejak `#D8C6A4` | 72 | Tidak ada | TEMBUS | Dekat area duduk existing, terutama sekitar payung `x=6,5, z=0…3,2` |
| Buih terputus-putus | pendukung | Ganti balok `_buih` dengan 6 strip ShapeGeometry, masing-masing 5–7 titik | total 38 × 1,1 | `#D9EEF5`, `#EFE2C8` | 96 | Fase maju-mundur berbeda, amplitudo 0,25–0,45 m | TEMBUS | Mengikuti `GARIS_AIR_Z`, bukan satu garis lurus |
| Tempat sabut dan botol | detail | Keranjang cylinder 8 sisi, 3 sabut sphere rendah, 2 botol cylinder | Ø 0,52 × 0,65 | `#8A6B4F`, `#6B4A2F`, `#3D8FB8` | 150 | Tidak ada | PADAT; collider cylinder | `x=-9,2, z=1,0`, menempel lapak agar tidak menjadi rintangan |
| Papan harga tulis tangan | detail | Box tipis, 2 kaki; tulisan “ES KELAPA MUDA” via CanvasTexture | 0,85 × 0,12 × 1,05 | `#EFE2C8`, `#E2703A`, `#6E6960` | 28 | Goyang maksimum 1° | PADAT; collider box | Muka lapak arah laut, `x=-7,0, z=0,25` |
| Bohlam lapak | pendukung | Kabel line, kap lampu cone 8 sisi, sphere emissive | Ø 0,28 | `#FFB35C`, kap `#3D8FB8` | 52 | Intensitas ±4% tiap 3–5 dtk | TEMBUS | Di bawah kanopi lapak; tambah 1 PointLight tanpa bayangan |
| 2 set lesehan `MejaNongkrong` existing | pendukung | Reuse sistem yang sudah ada; rotasi kedua set berbeda 18° | area 2,4 × 2,0 per set | `#EFE2C8`, `#E2703A`, `#6F7F4A` | 0 tambahan penempatan | Sesuai sistem existing | PADAT | Satu di `x=2,2, z=1,6`; satu di `x=3,6, z=-0,8`; koridor candi–air tetap 2,2 m |

**Total tambahan di luar `MejaNongkrong`: sekitar 1.670 segitiga dan 1 PointLight baru.**

## 5. Cahaya dan waktu

| Waktu | Cahaya global relatif | Warna utama | Lampu Spot |
|---|---:|---|---|
| Siang | matahari 1,00; ambient 0,55 | matahari `#FFF1CC`, ambient `#DCE8E2` | Dua obor dan bohlam lapak mati; emissive 0,05 |
| Magrib | matahari 0,55; ambient 0,38 | matahari `#F2A65A`, bayangan `#617F86` | Dua PointLight obor 0,55; bohlam lapak 0,45; radius masing-masing 7 m dan 5 m |
| Malam | cahaya arah 0,18; ambient 0,24 | arah `#7F9DB2`, ambient `#4A3B63` | Dua obor 0,75; bohlam lapak 0,70; emissive 0,45; semuanya tanpa bayangan |

Maksimum tetap **3 PointLight**: dua obor existing dan satu bohlam lapak.

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Pecah `_buih` menjadi 6 strip tidak sejajar.** Menghilangkan kesan tepi kolam tanpa menambah sistem baru. **±96 segitiga.**
2. **Tambahkan 3 canang pada undakan candi, plus sandal dan jejak kaki.** Landmark langsung terlihat dipakai manusia, bukan sekadar dipajang. **±252 segitiga.**
3. **Bangun lapak kelapa kecil, 7 kelapa, dan papan harga.** Memberi pusat aktivitas dan alasan konkret untuk berhenti di sisi pantai yang sekarang kosong. **±558 segitiga.**

## 7. Jangan

1. **Tulisan besar “BALI” atau “I ❤️ KUTA”.** Memindahkan suasana ke instalasi foto wisata.
2. **Batik pada payung, papan selancar, dan kain sekaligus.** Tidak punya hubungan fungsi dengan benda-benda itu dan terbaca sebagai tempelan identitas.
3. **Menambah deretan obor tiki.** Dua obor existing sudah cukup; pengulangan membuatnya seperti paket resor tropis generik.
4. **Papan selancar identik dengan jarak presisi.** Ciri aset toko: ukuran, rotasi, dan warna berulang tanpa jejak pemakaian.
5. **Menambah pura, patung barong, atau penjor tanpa fungsi ruang.** Candi bentar sudah menjadi penanda arsitektur; penambahan ikon hanya menumpuk simbol Bali.