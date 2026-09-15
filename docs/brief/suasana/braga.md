## 1. Cerita tempat

Saya memilih meja kedua, dekat etalase toko roti. Dua mahasiswa berbagi buku gambar; satu memegang gelas kopi, satu lagi menahan kertas agar tidak terangkat angin. Seorang anak menunggu ayahnya membuka kunci sepeda di seberang. Terdengar sendok menyentuh tatakan, roda melewati sambungan aspal, dan percakapan yang putus-putus **(nanti)**. Dari pintu kafe keluar bau kopi, roti mentega, dan trotoar selepas gerimis. Lampu jalan belum terang penuh. Di bawah gelas saya ada nota karbon kecil yang sudutnya sudah basah. Orang tidak berkumpul di satu titik; mereka tersebar di empat meja, depan galeri, dan bawah dua pohon.

## 2. Suasana

- **Waktu terbaik:** 17.10–17.45.
- **Cahaya:** datang dari barat/`x negatif`, menyilang jalan; matahari `#F2A65A`, bayangan `#5B7A8C`, langit atas `#4A3B63`.
- **Gerak:** tajuk pohon berayun `±2°/5 detik`, bibir tenda `±1,5°/4 detik`, dua lembar uap naik `0,22 m/3 detik`.
- **Kepadatan:** nyaman pada `6–10 avatar`; sisakan jalur bersih minimum `1,8 m` di tiap trotoar.
- **Penanda tempat nyata:** satu nota karbon `0,09 × 0,14 m` terselip di bawah tatakan meja, bukan dekorasi yang disebar merata.

## 3. Yang kurang di kode sekarang

1. `_ruko()` membangun muka bangunan pada sumbu `z`, sementara deret ditempatkan di sisi `x`; fasad praktis tidak menghadap badan jalan. Ini harus dibetulkan sebelum menambah detail.
2. `alas` berakhir di `y=0`, sedangkan permukaan `aspal` berakhir di `y=0,02`; komentar mengatakan jalan lebih rendah, tetapi geometrinya justru `2 cm` lebih tinggi.
3. Sepuluh kepala lampu masing-masing membuat `PointLight`. Ini melampaui batas Spot dan mahal; cukup tiga lampu aktif, tujuh lainnya emissive saja.
4. Ruko, tiang, dan tenda terlihat padat tetapi tidak didaftarkan ke fisika. Hanya `MejaNongkrong` yang jelas memanggil `daftarkanFisika()`.
5. Sepuluh ruko memakai formula etalase–kanopi–alur yang sama. Tanpa pintu, ambang, papan nama, atau isi galeri, hasilnya terasa seperti **paket aset “art deco street”**: kategorinya terbaca, tetapi tidak ada usaha yang berbeda.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---:|---|---:|---|---|---|
| Koreksi arah 10 ruko + collider kotak | Pendukung | Putar/refaktor sumbu fasad `90°`; collider per badan | Sesuai ruko: lebar `4,6–5,8`, tinggi `5–7,5`, dalam `5` | Eksisting | `0` tambahan | — | PADAT | Deret pada `x=±10,2`; fasad wajib menghadap pusat jalan |
| Dua bidang trotoar dan bibir jalan | Pendukung | 2 box strip + curb bevel 1 segmen | Masing-masing `4,2 × 36 × 0,14`; beda tinggi `0,12` | `#8D9AA5`, sisi `#5B7A8C` | 48 | — | PADAT | Di atas `alas`; aspal tetap pada `x=-4…4` dan dibuat lebih rendah |
| Muka “Kopi & Roti” tiga bidang | **Hero** | Pintu cekung, 2 jendela, transom, rak 6 balok roti | `3,8 × 0,32 × 2,35` | `#D9D3C6`, `#54402E`, cahaya `#F2A65A` | 320 | Emissive `0,15→0,55` | PADAT | Fasad barat sekitar `x=-7,7, z=-1,2`, di belakang meja ke-3 |
| Isi etalase galeri warga | Pendukung | 3 panel gambar, 2 pedestal, 1 bentuk patung | Bidang `3,2 × 0,25 × 1,7` | `#5B7A8C`, `#E8836B`, `#F4EAD6` | 120 | — | TEMBUS | Fasad timur dekat volume `braga_galeri`, sekitar `x=7,7, z=-1,2` |
| Empat papan nama usaha | Pendukung | Plane berbingkai; tekstur Canvas: “KOPI & ROTI”, “TOKO BUKU”, “PHOTO”, “GALERI WARGA” | Masing-masing `1,6 × 0,08 × 0,42` | `#2E8B84`, teks `#F4EAD6` | 120 | — | TEMBUS | Empat fasad berbeda, tinggi bawah `2,3`; jangan semua sejajar |
| Dua pohon trotoar + planter oktagonal | Pendukung | Batang silinder 8 sisi, 3 massa tajuk, planter 8 sisi | Tinggi `4,4`; tajuk Ø`2,1`; planter Ø`0,85 × 0,42` | `#6F7F4A`, `#6B3F1A`, `#5B7A8C` | 900 | Tajuk `±2°/5 dtk` | PADAT | Trotoar timur `x=6,2`, pada `z=-9,5` dan `z=8,5`; bebas jalur `1,8 m` |
| Enam grill drain | Detail | Plane bergaris 5 batang, tanpa cekungan | `0,65 × 0,02 × 0,32` | `#2F3A42` | 72 | — | TEMBUS | Sepanjang curb pada `x=±4,08`; hindari kaki lampu |
| Lima bekas gerimis | Detail | Shape datar tak beraturan, 6–8 vertex | `0,35–0,9 × 0,006` | `#5B7A8C`, opacity `0,28` | 50 | — | TEMBUS | Tiga dekat drain, dua di bawah tenda; jangan menutup seluruh jalan |
| Perangkat empat meja existing | Detail | 4 gelas silinder 8 sisi, 4 tatakan, 2 teko, 4 nota plane | Tinggi gelas `0,11`; tatakan Ø`0,14` | `#F4EAD6`, `#54402E`, `#E8836B` | 520 | — | TEMBUS | Tepat di atas empat `braga_kafe_*`; maksimum 3 benda per meja |
| Penyangga dan bibir dua tenda existing | Pendukung | 4 lengan box + valance Shape bergelombang 5 lekuk | Lengan `0,05 × 0,05 × 1,4`; valance `3,4 × 0,28` | `#E8836B`, rangka `#2F3A42` | 160 | Valance `±1,5°/4 dtk` | TEMBUS | Menempel pada dua slab tenda di `z=-6,5` dan `z=1,9` |
| Satu sepeda harian dengan rak belakang | Detail | Torus 10 sisi, rangka silinder 6 sisi, box rak | `1,65 × 0,48 × 1,05` | `#2E8B84`, ban `#2F3A42`, jok `#54402E` | 700 | — | PADAT | Bersandar pada fasad timur sekitar `x=7,45, z=5,8`; bukan di jalur utama |
| Dua kartu uap kopi | Detail | 2 plane silang per gelas, alpha lembut | `0,08 × 0,28` | `#F4EAD6`, opacity `0,18` | 24 | Naik `0,22 m/3 dtk`, lalu ulang | TEMBUS | Meja ke-2 dan ke-3 saja |

**Total tambahan:** sekitar **3.034 segitiga**, di luar geometri existing.

## 5. Cahaya dan waktu

| Waktu | Matahari/directional | Ambient | Lampu jalan | Etalase |
|---|---|---|---|---|
| Siang, 14.00 | Intensitas relatif `1,0`, `#FFF4C0`, dari `x negatif` | `0,55`, `#D8D3C2` | Semua PointLight `0`; emissive kepala `0,08` | Emissive `0,10` |
| Magrib, 17.30 | `0,35`, `#F2A65A`, sudut rendah | `0,38`, `#8D9AA5` | Hanya 3 PointLight pada `z=-11, 0, 11`, intensitas `0,35`, `#FFB35C`; tujuh kepala lain emissive `0,45` | Emissive `0,55`, `#F2A65A` |
| Malam, 19.00 | `0,06`, `#6F7690` | `0,22`, `#4A3B63` | Tiga PointLight intensitas `0,75`, radius `7,5 m`, tanpa shadow; semua kepala emissive `0,65` | Emissive `0,70`; tambah bidang dingin tunggal `#BFE3D0` di toko buku |

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Betulkan orientasi fasad, elevasi trotoar, dan collider.**  
   Tanpa ini, seluruh detail berikutnya menempel pada ruang yang salah arah. **±48 segitiga**.

2. **Bedakan empat usaha dengan papan nama dan satu etalase galeri.**  
   Menghapus rasa aset toko karena setiap lantai dasar mulai memiliki fungsi yang terbaca. **±240 segitiga**.

3. **Isi meja existing dengan gelas, tatakan, teko, dan satu nota per meja.**  
   Langsung menjelaskan bahwa orang baru saja duduk di sana tanpa menambah kursi atau sistem baru. **±520 segitiga**.

## 7. Jangan

1. **Batik pada kanopi, trotoar, atau lis ruko.** Tidak ada hubungan bentuk dengan fungsi bangunan Braga.
2. **Tulisan “Vintage Café” berlampu neon di setiap toko.** Generik karena nama, bahasa, warna, dan skala tandanya identik dengan paket aset kafe.
3. **Coral dan teal pada semua fasad.** Palet tema harus menjadi pengikat, bukan cat seragam; batasi coral pada dua tenda dan maksimal satu detail per etalase.
4. **Sepeda ontel dengan koper, bunga, dan papan arah.** Itu properti foto wisata; jika ada sepeda, bentuknya sepeda harian dengan rak dan kunci.
5. **Jalan batu basah mengilap seperti kota Eropa.** Kode sudah menetapkan aspal dan trotoar matte; cukup lima bekas gerimis kecil, tanpa refleksi layar penuh.