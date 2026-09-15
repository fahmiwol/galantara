## 1. Cerita tempat

Hujan baru lewat ketika saya duduk di bangku dekat warung. Penjual tanaman merapikan pot suplir sambil memegang gembor seng; dua anak masih membawa tas sekolah, berbagi gorengan dari kertas cokelat. Seorang bapak menaruh termos kecil di samping kakinya. Air menetes dari ujung talang ke ember enamel biru dengan jeda tidak teratur. Dari warung terdengar radio kecil dan sendok membentur gelas **(nanti)**. Udara mencium tanah basah, daun kenari, minyak goreng, dan kopi sachet. Jalan tengah tetap kosong; orang memilih tepi yang dinaungi pohon. Lampu warung menyala sebelum langit benar-benar gelap.

## 2. Suasana

- **Waktu terbaik:** 16.45–17.25, sekitar 10 menit setelah hujan.
- **Cahaya:** dari barat–barat daya; tetapkan barat sebagai `-X`. Warna matahari `#F2A65A`, pantulan langit basah `#BFE3D0`.
- **Kabut:** linear fog `#CBD8C9`, mulai 24 m, penuh 46 m; tanpa partikel.
- **Gerak:** rumpun daun berayun `±1,2°` selama 7–11 detik; tirai warung `±2°`; aliran talang berupa UV-scroll `0,015 m/detik`.
- **Kepadatan:** 6–10 avatar; maksimal 4 berdiri di pusat, sisanya di warung, bangku, dan tanaman.
- **Detail nyata:** satu ember enamel diletakkan tidak tepat di bawah talang, sehingga sebagian tetesan masih mengenai tanah.

## 3. Yang kurang di kode sekarang

1. `ground` berupa silinder radial 30 m dan `soil` berupa cincin sempurna. Simetri ini terasa seperti basis diorama/aset toko, bukan ruang yang terbentuk oleh jalur kaki dan genangan.
2. Warung hanya terdiri dari satu kubus, satu slab kanopi, dan papan kosong. Tidak ada bukaan pelayanan, rak barang, talang, atau bekas pemakaian yang menjelaskan kegiatan di sana.
3. `_awning.rotation.y` membuat seluruh atap padat berputar. Atap tidak seharusnya melambai; gerak perlu dipindahkan ke tirai kain tipis.
4. Pohon di `(5, 3)` memakai satu batang lurus dan bola hijau `#22C55E`. Siluet bola tunggal, ukuran 3,15 m, dan warna mentah membuatnya generik serta tidak terbaca sebagai kenari tua.
5. `getLampu()` kosong dan permukaan seluruhnya kering. Akibatnya kode belum membawa kondisi “sore setelah hujan” atau alasan visual untuk bertahan sampai magrib.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---:|---|---:|---|---|---|
| Jalur tanah basah tak simetris | pendukung | `ShapeGeometry`, 7–9 titik, tepi tidak konsentris | 12 × 7 × 0,04 | `#765D43`, tepi `#8A6B4F` | 80 | diam | PADAT; dapat diinjak | Ganti fungsi visual `soil` ring; pusat tetap terbuka |
| Dua kenari tua | hero | 3 batang silinder 7 sisi/pohon, 6 cabang, 8 gumpal tajuk/pohon | tinggi 6,2; tajuk Ø4,6 | batang `#60452E`, daun `#536F43`, pucuk `#6F7F4A` | 2.800 | tajuk `±1,2°` | PADAT | Upgrade pohon `(5,3)` dan tambah pasangan di `(-6,-3)` |
| Area tukang tanaman | hero | 2 rak bertingkat + 14 pot cylinder 6 sisi + daun cone/shape | 3,6 × 1,5 × 1,6 | rak `#6B4B31`, pot `#C05E3C`, daun `#3F6B4F`; aksen `#10B981` | 2.300 | 4 daun `±1°` | PADAT | Di kiri warung, sekitar `(-6,0,0.5)` |
| Gerobak dorong tanaman | pendukung | box kayu, 2 roda cylinder 8 sisi, 5 pot | 1,8 × 0,85 × 1,25 | `#8A6B4F`, roda `#4A3728`, pegangan `#7D848C` | 620 | diam | PADAT | `(-6,-1.2)`, menghadap jalur tengah |
| Muka warung terbuka | pendukung | ganti kubus depan dengan 3 box yang menyisakan bukaan 1,25 × 0,7 | 2,2 × 1,35 × 1,6 | dinding `#7A4E2B`, ambang `#5B3924` | 72 | diam | PADAT | Rekonstruksi `body` warung existing di `(-4,2)` |
| Isi meja warung | detail | 3 stoples cylinder 8 sisi, termos, 6 bungkus berupa box | area 1,1 × 0,35 × 0,45 | `#F4EAD6`, `#B85C3F`, `#6F7F4A` | 310 | diam | PADAT | Di dalam bukaan warung; tidak menambah tempat duduk |
| Papan menu tulisan tangan | detail | papan existing + `CanvasTexture` “KOPI / TEH / GORENGAN” tiga baris | 0,9 × 0,35 × 0,06 | dasar `#F2E2BE`, teks `#49382C` | 12 | diam | PADAT | Gunakan mesh `sign` yang sudah ada |
| Talang dan pipa warung | pendukung | half-cylinder 8 sisi + pipa cylinder 6 sisi | panjang 2,5; Ø0,09 | `#7D848C` | 110 | strip air UV-scroll | PADAT | Sepanjang sisi depan `_awning`, turun di sudut timur |
| Tirai plastik gulung | detail | 3 bidang transparan vertikal, tepi bawah tidak rata | total 2,2 × 0,55 | `#BFE3D0`, opacity `0,28` | 18 | `±2°`, 8 detik | TEMBUS | Di bawah kanopi; pindahkan animasi `_awning` ke tirai |
| Ember enamel penadah | detail | cylinder 10 sisi + gagang torus sederhana | Ø0,38 × 0,32 | badan `#4F8F9D`, bibir `#F4EAD6` | 120 | diam | PADAT; tinggi dapat dinaiki | Depan kanan warung, sekitar `(-3.1,2.9)` |
| Tiga genangan | pendukung | `ShapeGeometry` 7–11 titik, bidang ganda transparan | Ø0,7–1,8; tebal 0,01 | `#557E78`, opacity `0,42` | 54 | skala highlight `±2%` | TEMBUS | `(0.5,4.5)`, `(-1,-3.5)`, `(5,-0.5)`; jauh dari kursi |
| Selokan dan dua kisi | pendukung | parit dangkal 3 box + kisi 6 bilah | 6 × 0,32 × 0,12 | bibir `#81735F`, kisi `#596064` | 170 | air UV-scroll `0,015 m/detik` | PADAT | Tepi timur jalur, dari `(6,5)` ke `(6,-1)`; jangan menuju portal |
| Lampu jalan lengan bengkok | pendukung | pole cylinder 8 sisi, lengan 6 sisi, kap lampu cone | tinggi 4,4; jangkauan 1,1 | tiang `#66665F`, lampu `#FFB35C` | 230 | menyala bertahap | PADAT | `(0,-6.5)`, tidak menghalangi portal `(9.5,-5.2)` |
| Sebelas daun gugur | detail | bidang segitiga ganda, 3 ukuran | 0,12–0,24 | `#8A7847`, `#A98055`, `#6F7F4A` | 44 | 3 daun bergeser 0,03 m | TEMBUS | 7 di bawah kenari existing, 4 dekat selokan |

**Total tambahan:** sekitar **6.940 segitiga**, belum termasuk geometri internal `MejaNongkrong` yang sudah ada.

## 5. Cahaya dan waktu

| Waktu | Cahaya global relatif | Warna | Lampu Spot |
|---|---:|---|---|
| Siang mendung, 14.00 | sun `0,65`, ambient `0,70` | sun `#FFE2B8`, ambient `#C9D7C2` | Semua PointLight mati |
| Magrib, 17.25 | sun `0,22`, ambient `0,45` | sun `#F2A65A`, ambient `#A9B9A8` | Warung: intensitas `0,75`, `#FFE0A3`, jarak 5 m. PJU: `0,9`, `#FFB35C`, jarak 7 m |
| Malam, 19.00 | sun `0,03`, ambient `0,25` | langit `#4A3B63`, ambient `#71877F` | Warung `1,0`; PJU `1,2`. Keduanya tanpa bayangan |

Arah sun datang dari `(-8, 7, -6)` menuju pusat. Jangan menambah lampu ketiga kecuali keterbacaan avatar di rak tanaman gagal pada perangkat uji.

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Ubah pohon existing menjadi kenari tua dan tambah satu pasangan.**  
   Saat ini bola hijau adalah penanda paling generik. Dua tajuk besar langsung membentuk ruang teduh di tepi. **±2.800 tri.**

2. **Buka muka warung, isi enam jenis prop, tulisi papan, dan pindahkan animasi ke tirai.**  
   Warung berubah dari kubus dekorasi menjadi tempat yang tampak dipakai. **±410 tri.**

3. **Ganti cincin tanah dengan jalur tak simetris, lalu tambah tiga genangan dan ember talang.**  
   Ini menyampaikan Bogor setelah hujan tanpa partikel atau post-processing. **±260 tri.**

## 7. Jangan

1. **Tulisan raksasa “BOGOR”.** Itu mengganti pengalaman ruang dengan latar swafoto.
2. **Motif batik pada kanopi, pot, atau paving.** Tidak punya hubungan fungsi dengan warung dan tukang tanaman di sini.
3. **Payung warna-warni dalam jumlah banyak.** Bentuk berulang dan warna primer membuatnya terlihat seperti paket aset kafe.
4. **Hijau neon `#22C55E` untuk seluruh tanaman.** Semua spesies menyatu menjadi satu massa plastik; pakai 4–5 hijau teredam.
5. **Gapura atau monumen historis yang diklaim spesifik Alun-alun Bogor.** **Belum punya dasarnya** dari materi yang diberikan; jangan mengarang landmark.