## 1. Cerita tempat

Jam lima lewat, saya duduk menghadap laut sambil memegang pisang epe dalam piring kertas. Di sebelah, seorang bapak membuka botol minum anaknya; dua remaja berbagi tempat duduk sambil menunjuk pinisi. Penjual membalik pisang di atas bara lalu menekan permukaannya dengan papan kayu. Bau arang bercampur gula merah dan angin asin. Terdengar sendok mengenai stoples, percakapan yang terputus-putus, air memukul sisi dermaga, dan motor dari jalan belakang **(nanti)**. Orang tidak membentuk antrean; mereka datang, duduk, lalu baru memesan. Saat lampu pertama menyala, piring kosong masih dibiarkan sebentar di pangkuan.

## 2. Suasana

- **Waktu terbaik:** 17.20–18.10 WITA.
- **Arah cahaya:** dari laut `-Z` menuju darat `+Z`, elevasi 8°–12°.
- **Warna:** ufuk `#F2A65A`, cahaya samping `#E8874F`, langit atas `#4A3B63`, bayangan `#31506A`.
- **Gerak:** pita air naik-turun 0,025 m; kain gerobak bergeser 2°; tiga bidang asap naik 0,4 m selama 4 detik; pinisi tetap memakai ayunan yang sudah ada.
- **Kepadatan:** 6–10 avatar pada anjungan 30 × 13 m; sisakan jalur bebas selebar 1,6 m dari warp ke dermaga.
- **Penanda tempat nyata:** satu stoples saus memakai tutup merah yang tidak sama dengan dua stoples lain.

## 3. Yang kurang di kode sekarang

1. **Anjungan `BoxGeometry(30, 0.9, 13)` hanya satu warna.** Bidang 390 m² tanpa sambungan, tambalan, atau bekas pakai terbaca seperti lantai aset dasar, bukan ruang kota.
2. **Gerobak hanya kotak dan tungku.** Tidak ada roda, pemukul pisang, stoples saus, pisang mentah, atau area kerja; bentuknya bisa menjadi gerobak apa saja.
3. **Pinisi memakai lambung kotak dan dua `ConeGeometry`.** Layar kerucut adalah siluet perahu fantasi generik; belum terbaca sebagai kapal dua tiang.
4. **Laut adalah satu bidang navy statis dengan roughness `0.42`.** Nilai ini juga di bawah kontrak matte `0.65–0.9`; buih lurus sepanjang 36 m membuat tepi air seperti garis pembatas arena.
5. **Empat lampu identik dan lima `PointLight` aktif potensial.** Repetisi bola-di-tiang terasa seperti kit promenade; jumlah lampu juga melampaui batas tiga. Belum ada penempatan `MejaNongkrong` dalam file ini.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---:|---|---:|---|---|---|
| Revisi siluet pinisi | Hero | Lambung prismatik, 2 tiang, 3 boom, 4 bidang layar `Shape` | 5,2 × 1,7 × 5,0 | `#5A3A24`, `#E8D9BD` | 320 | Ikuti animasi pinisi lama | PADAT | Ganti geometri `_pinisi`, tetap di `(6.5, -0.1, -17.5)` |
| Jalur pantulan senja | Hero | 7 pita `Shape` tidak sejajar | 5,5 × 0,02 × 17 | `#D98552`, `#E6A15E` | 112 | Y ±0,025 m, fase berbeda | TEMBUS | Laut antara `x=3–8`, `z=-9 sampai -26` |
| Kanopi gerobak epe | Pendukung | 4 tiang kotak, atap kain 2 bidang melendut | 2,5 × 1,7 × 2,35 | `#C2410C`, `#E6C89C` | 84 | Kain rotasi ±2°/5 dtk | Tiang PADAT; kain TEMBUS | Di atas gerobak `(8, 0, 2.5)` |
| Perangkat kerja pisang epe | Pendukung | Pemukul papan, grill 6 bilah, 3 stoples silinder, baki | 1,5 × 0,55 × 0,28 | `#6B3F1A`, `#7D848C`, `#8B3F2F` | 260 | Tidak ada | PADAT | Di atas kotak gerobak; sisakan tungku lama terlihat |
| Peti pisang | Pendukung | Peti kisi 5 papan, 8 pisang berupa kurva prismatik sederhana | 0,65 × 0,42 × 0,28 | `#8A6B4F`, `#D8A83E` | 210 | Tidak ada | PADAT; dapat dinaiki | `(6.85, 0.14, 2.9)`, di sisi kiri gerobak |
| Papan menu cat tangan | Detail | Papan miring dengan tekstur 256²: “PISANG EPE / GULA MERAH / KEJU” | 0,75 × 0,06 × 0,95 | `#1E3A5F`, teks `#F4EAD6` | 12 | Ayun ±1,5° | TEMBUS | Menempel pada tiang kanopi sisi `+Z` |
| Asap tungku | Detail | 3 bidang `Shape`, tanpa partikel | 0,35 × 0,02 × 0,9 | `#C9B8A4`, opacity 0,22 | 18 | Naik 0,4 m/4 dtk, fade | TEMBUS | Mulai di `(8, 1.15, 2.5)` |
| Tambatan dermaga | Pendukung | 2 bollard oktagonal dan tali 8 segmen | Bollard Ø0,24 × 0,42; tali 2,2 | `#493321`, `#A98055` | 144 | Tali bergeser ±0,015 m | Bollard PADAT; tali TEMBUS | Ujung dermaga sekitar `(-7, 0.35, -14.8)` |
| Tambalan paving | Detail | 9 poligon datar, masing-masing 5–7 sisi | 0,35–1,1 × 0,015 | `#A86445`, `#B96D48`, `#85513C` | 54 | Tidak ada | PADAT; dapat diinjak | Sebar di anjungan; jangan masuk radius warp 2,7 m |
| Bekas pasang pada lis | Detail | 6 pita pendek tak beraturan | 0,8–2,2 × 0,02 × 0,16 | `#596F69`, `#8C765D` | 48 | Tidak ada | TEMBUS | Menempel pada sisi laut lis di `z=-6.76` |
| Penempatan `MejaNongkrong` yang sudah ada | Pendukung | Pakai modul existing: 2 bangku + 2 dingklik, tanpa aset baru | Tapak total maks. 7 × 3 | Palet existing; aksen maks. `#C2410C` | 0 baru | Sesuai sistem existing | PADAT | Bangku di `(4.2, 0.8)` dan `(11.6, 0.8)`, menghadap `-Z`; dingklik di `(6.3, 3.4)` dan `(9.8, 3.5)` |
| Tudung lampu enamel | Detail | Setengah kerucut 8 sisi pada 4 bohlam existing | Ø0,52 × 0,22 | `#1E3A5F`, bawah `#E8D9BD` | 64 | Tidak ada | TEMBUS | Retrofit empat lampu di `z=-5.1`; tidak menambah tiang |

**Total tambahan:** sekitar **1.326 segitiga**, di luar geometri `MejaNongkrong` yang sudah tersedia.

## 5. Cahaya dan waktu

| Waktu | Matahari/ambient relatif | Warna utama | Lampu lokal |
|---|---:|---|---|
| Siang | Matahari `1,00`, ambient `0,55` | Matahari `#FFF1C7`, langit `#8EB6C8` | Semua `PointLight = 0`; emissive bohlam `0,05` |
| Magrib | Matahari `0,55`, ambient `0,38` | Matahari `#F2A65A`, ambient `#77667A` | Bara `0,35`; dua lampu anjungan `0,25`; bohlam lain emissive `0,35` |
| Malam | Matahari `0,12`, ambient `0,22` | Ambient `#263B55` | Maksimal 3 PointLight: bara `(8,1.2,2.5)` intensitas `0,45`; lampu `x=-11` dan `x=3.67` intensitas `0,70`, range 6,5 m. Dua bohlam lain emissive `0,7`, tanpa PointLight |

Gunakan warna lampu anjungan `#FFB35C`, bukan putih atau biru. Roughness air dinaikkan dari `0,42` menjadi `0,68`.

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Isi gerobak dengan alat kerja, stoples, peti pisang, dan papan menu.**  
   Membuat kotak existing terbaca sebagai penjual pisang epe, bukan gerobak generik. **±482 segitiga.**

2. **Tambah sembilan tambalan paving dan tujuh pita pantulan air.**  
   Memecah dua bidang besar tanpa model GLB atau tekstur resolusi tinggi. **±166 segitiga.**

3. **Ganti dua layar kerucut pinisi dengan dua tiang dan empat layar `Shape`.**  
   Memperbaiki hero yang sekarang paling terasa seperti aset toko. **±320 segitiga.**

## 7. Jangan

1. **Tulisan “LOSARI” raksasa.** Mengubah tempat menjadi latar foto brosur dan menutup pandangan laut.
2. **Pohon kelapa berjajar.** Losari adalah anjungan kota, bukan pantai pasir atau resor.
3. **Motif batik atau Toraja pada semua permukaan.** Tidak menjelaskan kegiatan di anjungan dan menjadi tempelan identitas.
4. **Jaring, jangkar, pelampung, dan kerang sekaligus.** Paket prop maritim seperti ini adalah sidik jari aset toko.
5. **Neon RGB dan refleksi mengilap.** Bertentangan dengan lampu natrium, material matte, serta suasana 90-an–awal 2000-an.