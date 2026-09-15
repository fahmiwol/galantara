## 1. Cerita tempat

Saya duduk di tikar paling ujung saat matahari turun di sela pertokoan. Dua mahasiswa berbagi teh dalam gelas plastik; seorang bapak memegang penjepit sate di depan gerobak arang. Anak kecil menghitung roda andong yang berhenti dekat pohon. Pengamen membawa gitar dengan stiker mengelupas dan kencrung dari tutup botol. Terdengar petikan gitar, bel andong, serta sendok membentur gelas enamel **(nanti)**. Bau arang, kecap yang jatuh ke bara, bawang goreng, dan kain toko yang lama tersimpan bercampur di sisi jalan. Satu rolling door sudah setengah turun, tetapi penjualnya masih mengobrol dari balik meja.

## 2. Suasana

- **Waktu terbaik:** 17.20–18.10.
- **Arah cahaya:** dari `x=-1, z=+0.35`, rendah 14°–22°.
- **Warna utama:** ufuk `#F2A65A`, pantulan genting `#C05E3C`, bayangan `#4A3B63`.
- **Gerak lambat:** 4 tajuk pohon bergoyang ±1,5°; 3 bidang kain ±2°; 2 pita asap naik 0,35 m dalam 4 detik; ekor kuda ±4°.
- **Kepadatan:** isi 65% pada dua tepi; sisakan koridor tengah selebar 3,2 m. Target 10–14 avatar tanpa menutup lesehan.
- **Detail nyata:** satu rolling door bernomor cat tangan “17”, setengah tertutup dan warnanya berbeda dari pintu sebelah.

## 3. Yang kurang di kode sekarang

1. **Blok lampu membuat 10 `PointLight`.** Ini melewati batas Spot ≤3 dan menghasilkan sepuluh kolam cahaya seragam, bukan ritme jalan.
2. **Lampu berupa silinder lurus + bola.** Tidak ada lengan lengkung, kap, atau alas; bentuk ini terbaca sebagai lampu taman generik, bukan lampu jalan antik.
3. **Dua kios hanya `ConeGeometry` + `BoxGeometry`.** Generik karena tidak punya bukaan penjual, rak, roda, papan harga, barang, atau bekas pemakaian.
4. **Bidang jalan hanya diapit dua garis tepi.** Tidak ada muka toko, pohon, kanopi, pintu gulung, atau saluran air; ruang terasa belum diisi, bukan sengaja sepi.
5. Komentar menyebut **Rumah Joglo dari manifest**, tetapi `mount()` pada file ini tidak memuat manifest. Berdasarkan kode terlampir, keberadaan Joglo **belum punya dasarnya**.

## 4. Terjemahan 3D

| Elemen | Peran | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada |
|---|---|---|---:|---|---:|---|---|---|
| Deret muka toko, 6 modul | hero | Box bevel ringan; 3 modul per sisi, tinggi atap tidak rata ±0,25 m | tiap modul 3,6×0,45×2,8 | `#B45309`, `#8A6B4F`, `#F4EAD6` | 2.600 | — | PADAT | Pusat `x=±6,15`; `z=-9, 0, 9`, di luar tepi jalan |
| Rolling door, 4 buah | pendukung | Plane berbilah 10 strip; 2 tertutup, 2 setengah terbuka | 2,4×0,10×2,25 | `#7D848C`, `#6F665C` | 420 | — | PADAT | Menempel pada 4 modul toko; satu bernomor “17” |
| Kanopi kain, 3 bidang | pendukung | Plane 3×2 segmen, tepi turun 0,18 m | tiap bidang 2,4×1,35 | `#6B4C8A`, `#C05E3C` | 300 | Ayun ±2°, 6 dtk | TEMBUS | Satu di atas lesehan `x=-4,2, z=-4,1`; dua di muka toko |
| Andong parkir + kuda | hero | 2 silinder roda 12 sisi, kabin box, atap melengkung 5 segmen, kuda primitive | 4,2×1,65×2,25 | `#4A3220`, `#C4933F`, `#F4EAD6` | 3.500 | Ekor ±4°; kepala ±2° | PADAT | `x=2,3, z=-9,5`, sejajar arah jalan; tidak menutup portal |
| Gerobak arang | pendukung | Box, 2 roda 10 sisi, kaca 4 plane, panggangan 6 batang | 1,45×0,75×1,75 | `#4A3220`, `#7D848C`, `#C05E3C` | 1.200 | Tutup kipas ±8° | PADAT | `x=-4,0, z=-10,2`, menghadap tiga lesehan |
| Pohon peneduh, 4 buah | pendukung | Batang silinder 7 sisi; tajuk 3 massa ico-sphere | tinggi 4,4; tajuk Ø2,4 | `#6B3F1A`, `#6F7F4A` | 2.200 | Tajuk ±1,5°, 8 dtk | PADAT; collider batang | `(-4,5,3,5)`, `(-4,5,10,5)`, `(4,5,-10,5)`, `(4,5,-3,5)` |
| Kisi pohon + bibir tanah, 4 set | detail | Ring 8 sisi dan 6 bilah datar | 1,15×0,06×1,15 | `#7D6650`, `#4A3220` | 192 | — | PADAT | Mengelilingi batang; tinggi 0,06 m sehingga bisa dinaiki |
| Selubung lampu antik, 10 set | pendukung | Lengan lengkung 3 segmen, kap cone terpotong, alas 8 sisi | tambahan 0,65×0,55×0,55 | `#4A3220`, `#FFD98A` | 700 | — | PADAT | Retrofit pada tiang dan bohlam yang sudah ada; bukan tiang baru |
| Display kios batik | detail | 2 rel kayu, 4 kain gantung, 6 tumpuk kain berbentuk box | 2 set, masing-masing 1,7×0,5×1,6 | `#6B4C8A`, `#B45309`, `#F4EAD6` | 650 | Kain ±1° | Rel PADAT; kain TEMBUS | Menempel pada 2 kios existing di `KIOS_X`, tanpa menambah kios |
| Pengamen, 2 NPC | pendukung | Tubuh chibi primitive; gitar 8 sisi; kencrung 6 cakram | tinggi 1,18–1,23 | `#3D6B9E`, `#C0553F`, `#8A6B4F` | 2.200 | Tangan ±6°; badan ±1,5° | PADAT; capsule collider | `x=-1,7, z=-3,8`, berjarak ≥1,4 m dari tikar tengah |
| Papan harga dan nomor toko, 4 buah | detail | Plane matte dalam bingkai box 0,035 m | 0,55×0,04×0,75 | `#F4EAD6`, `#4A3220`, `#C0553F` | 180 | — | PADAT | 2 pada toko, 1 gerobak, 1 kios existing |
| Pita asap arang, 2 buah | detail | Dua strip silang, masing-masing 3 segmen | 0,28×0,02×0,85 | `#C9B9A3` opacity 0,28 | 24 | Naik 0,35 m/4 dtk | TEMBUS | Tepat di atas panggangan gerobak |
| Tutup drainase dan tambalan jalan, 6 set | detail | Box tipis; 4 celah gelap per drain | tiap set 0,65×0,04×0,35 | `#6A5137`, `#7D848C` | 240 | — | PADAT | Dekat garis tepi pada `z=-12,-5,2,10`; jangan di koridor tengah |

**Total tambahan:** sekitar **14.400 segitiga**.

## 5. Cahaya dan waktu

| Waktu | Matahari | Ambient | Lampu jalan |
|---|---|---|---|
| Siang | intensitas relatif `1,0`, `#FFF4C0`, elevasi 48° | `0,65`, `#F4EAD6` | Semua bohlam emissive `0`; PointLight `0` |
| Magrib | `0,45`, `#F2A65A`, elevasi 16° | `0,42`, `#C9A6A0` | 10 bohlam emissive `0,55`; hanya 3 PointLight intensitas `0,65`, warna `#FFB35C` |
| Malam | `0,08`, `#4A3B63` | `0,28`, `#665A73` | 10 bohlam emissive `0,85`; 3 PointLight intensitas `0,9`, range `7 m`, decay `2`, tanpa bayangan |

Pertahankan hanya tiga PointLight di posisi bergantian: `(-4,4,-7)`, `(4,4,0)`, `(-4,4,7)`. Bohlam lain cukup emissive. Jenis lampu dari `MejaNongkrong.getLampu()` **belum punya dasarnya** dari kode terlampir; audit agar tidak menambah PointLight ke atas batas tiga.

## 6. Tiga langkah termurah dengan dampak rasa terbesar

1. **Buat enam muka toko dengan tinggi dan bukaan berbeda.** Mengubah bidang panjang menjadi jalan yang punya tepi dan skala manusia. **±2.600 tri.**
2. **Retrofit sepuluh lampu dan pangkas PointLight menjadi tiga.** Siluet langsung lebih spesifik sekaligus menurunkan beban GPU. **±700 tri.**
3. **Isi bekas pemakaian di sekitar aset existing:** papan harga, kain kios, drainase, nomor pintu, asap gerobak. Menghilangkan rasa “aset toko yang baru diletakkan”. **±1.100 tri.**

## 7. Jangan

1. **Jangan tempel motif batik pada trotoar, lampu, andong, dan semua kanopi.** Batik cukup hadir sebagai barang di kios; pemakaian merata menjadi tema dekorasi.
2. **Jangan menaruh Tugu besar di ujung jalan.** Itu mengubah Spot menjadi miniatur brosur dan mengecilkan fungsi duduk.
3. **Jangan memakai neon ungu-biru modern.** `#6B4C8A` dipakai sebagai kain atau cat, bukan glow.
4. **Jangan membuat dua sisi jalan simetris sempurna.** Tinggi toko, bukaan pintu, pohon, dan kanopi harus berbeda jumlah serta jaraknya.
5. **Jangan memenuhi tengah jalan dengan prop.** Pertahankan koridor 3,2 m; rasa betah datang dari tepi yang dihuni, bukan dari hambatan.