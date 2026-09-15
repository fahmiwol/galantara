## 1. KIT BETAH BERSAMA

Bangun geometri sekali, tetapi jangan memakai preset yang sama. Variasi struktur—bukan sekadar warna—wajib menjadi parameter.

| Archetype | Dipakai di | Parameter utama | Ukuran default/rentang | ± segitiga | PADAT/TEMBUS |
|---|---|---|---|---:|---|
| `handpainted_sign` | Semua Spot | `mount: wall/freestanding/hanging`, `width`, `height`, `frame`, `line_count: 1–4`, `tilt`, `fade`, atlas teks | 0,55–1,65 × 0,04–0,12 × 0,35–1,05 m | 12–80 | Freestanding PADAT; wall/hanging TEMBUS |
| `tableware_cluster` | Oola, Bogor, Braga, Losari, Monas | `cup_count: 1–4`, `thermos_count: 0–1`, `jar_count: 0–3`, `tray`, `lid_palette`, `one_mismatch` | Tapak 0,35–1,10 × 0,25–0,55 m | 80–420 | PADAT sebagai satu compound collider |
| `cloth_shelter` | Oola, Bogor, Braga, Malioboro, Kuta, Losari | `support_count: 0–4`, `segments_x: 2–4`, `segments_y: 2–3`, `sag`, `valance`, `patch_count: 0–2` | 2,2–3,4 × 1,2–2,8 × 1,6–2,5 m | 60–300 | Tiang PADAT; kain/tali TEMBUS |
| `utility_cart_chassis` | Bogor, Malioboro, Losari, Monas | `wheel_count: 2/3`, `body_width`, `service_side`, `canopy`, `handle`, `shelf_count` | 1,4–2,5 × 0,7–1,7 × 1,1–2,3 m | 180–700 sebelum isi khas | Badan/roda PADAT; isi kecil TEMBUS |
| `asymmetric_tree` | Oola, Bogor, Braga, Malioboro, Monas | `trunk_split: 1–3`, `branch_count: 3–8`, `crown_count: 3–8`, skala tiap tajuk, kemiringan, profil spesies | Tinggi 4,4–6,6 m; tajuk Ø2,1–5,6 m | 350–1.400/pohon | Batang PADAT; cabang/tajuk TEMBUS |
| `surface_trace_patch` | Semua Spot | `point_count: 5–11`, `patch_count: 1–9`, `opaque/wet`, `edge_noise`, `rotation_seed`, `color_variants: 2–3` | 0,25–12 m; elevasi 0,006–0,04 m | 10–96/grup | TEMBUS; lantai dasar tetap PADAT |
| `warm_lamp_fixture` | Semua Spot | `mount: pole/wall/cable`, `pole_height`, `arm_segments: 0–3`, `shade: enamel/cone/hood`, `emissive`, `pointlight_index` | Tinggi 0,2–4,4 m; kap Ø0,28–0,55 m | 40–240 | Tiang PADAT; kepala TEMBUS |
| `ribbon_plane_fx` | Oola, Bogor, Braga, Malioboro, Kuta, Losari, Monas | `mode: smoke/steam/foam/reflection/runoff`, `strip_count: 2–7`, `segments: 2–7`, amplitudo, fase, opacity | 0,08–38 m sesuai mode | 8–112/grup | TEMBUS |

**Jangan masukkan** andong, pinisi, Monas, candi bentar, atau gerobak makanan lengkap ke kit bersama. Itu pembeda Spot; yang boleh dibagi hanya chassis dan helper geometrinya.

---

## 2. BENTROK

| Spot/baris | Bentrok | Koreksi terukur |
|---|---|---|
| **Semua Spot — PROMPT, “Tambahan per Spot ≤20.000”** vs batas tugas ini **“20.000 segitiga/Spot”** | Semua brief hanya menghitung **tambahan**, beberapa juga mengecualikan `MejaNongkrong` dan geometri existing. Jadi tidak ada dasar untuk menyatakan total Spot lolos. Malioboro paling berisiko: **14.400 tambahan**, menyisakan hanya 5.600 untuk seluruh existing scene jika batasnya total. | Tambahkan audit `existing_tri + new_tri + spawned_modules ≤ 20.000` per Spot sebelum produksi. |
| **Monas §3 butir 1**: kontrak `64×64 m`; **tabel “Lapangan rumput luar”**: `RingGeometry` Ø56 | Diameter 56 m tetap kurang 8 m dari kontrak. Selain itu ring sempurna mengulang masalah podium radial yang dikritik sendiri. | Ground minimum 64×64 m, atau radius minimum 32 m; pecah menjadi 4 bidang rumput tidak konsentris. |
| **Kuta §2**: koridor candi–air `2,2 m`; **baris “Tiga canang”**: “lorong tetap `1,9 m`” | Pelanggaran eksplisit sebesar 0,3 m. | Sisakan 2,2 m bersih; pindahkan canang ke sisi undakan, bukan tiga-tiganya pada sumbu lorong. |
| **Braga, baris “Perangkat empat meja”** | Inventarisnya 14 benda—4 gelas, 4 tatakan, 2 teko, 4 nota—tetapi baris yang sama menetapkan maksimum 3 benda × 4 meja = 12. | Jadikan gelas+tatakan satu compound visual, atau kurangi menjadi 4 gelas, 4 tatakan, 1 teko, 3 nota. |
| **Losari §2**: satu tutup stoples merah berbeda; **baris “Perangkat kerja pisang epe”** | Tiga stoples hanya diberi satu warna `#8B3F2F`; penanda khas yang dijanjikan tidak diterjemahkan. | Tutup: 1× `#B83F32`, 2× `#D8D4C8`; badan stoples `#E8D9BD`. |
| **Malioboro §2**: koridor tengah 3,2 m; **baris “Andong”**: pusat `x=2,3`, lebar 1,65 m | Jika 1,65 m adalah lebar sumbu X, tepi andong mencapai `x=1,475`; koridor butuh batas `x≥1,6`. Masuk sekitar 0,125 m. | Geser pusat andong minimal ke `x=2,45`, lebih aman `x=2,6`. |
| **Braga §3 butir 3** dan **Malioboro §3 butir 1** | Kode membuat 10 `PointLight`, sedangkan brief kemudian hanya mengatakan tiga “aktif”. Bila tujuh objek tetap dibuat dengan intensitas 0, batas jumlah objek lampu masih tidak jelas terpenuhi. | Factory lampu hanya membuat `PointLight` pada 3 indeks; tujuh lainnya hanya mesh emissive, bukan lampu berintensitas nol. |
| **Oola §3 butir 5** vs tabel terjemahan | Brief mengkritik portal dan Dev Hub yang tidak punya informasi terbaca, tetapi tabel hanya memperbaiki papan pengumuman; label Dev Hub/portal tetap tidak diselesaikan. | Tambah 1 panel `1,1×0,28 m`, 12–24 tri, teks maksimal dua kata; jangan menambah layar neon. |

---

## 3. KLISE YANG LOLOS

1. **Oola — pohon ungu + halo emas berputar + tiga cincin bawah pulau.**  
   Ini masih bahasa lobby game fantasi. Yang membuatnya generik: bentuk bercahaya melingkar, rotasi konstan, dan efek konsentris tanpa fungsi sosial. Hapus tiga torus bawah pulau; bila halo wajib, pakai satu busur diam 210°–240°, offset 0,35 m dari pusat.

2. **Bogor — 14 pot rapi, dua rak, gerobak tanaman, aksen `#10B981`.**  
   Terbaca sebagai paket “cozy plant market” karena inventaris bersih dan hijau aksen terlalu digital. Ganti komposisi menjadi 8 pot tanah, 4 polybag hitam, 2 kaleng bekas; tiga tinggi `0,18/0,27/0,42 m`; ganti `#10B981` dengan `#58734D`.

3. **Braga — empat papan usaha identik berwarna teal.**  
   “KOPI & ROTI / TOKO BUKU / PHOTO / GALERI WARGA” terasa seperti satu pengelola membuat theme street. Gunakan hanya dua papan berbingkai, satu tulisan langsung di kaca, satu nomor bangunan; ganti “PHOTO” menjadi “FOTO”; `#2E8B84` maksimal pada satu usaha.

4. **Malioboro — andong, dua kios batik, dua pengamen, sepuluh lampu antik dan enam toko sekaligus.**  
   Masing-masing dapat dibenarkan, tetapi gabungannya menjadi daftar ikon wisata. Tahap pertama sebaiknya tanpa dua NPC pengamen—hemat 2.200 tri—dan andong ditempatkan sebagai latar tepi, bukan hero pusat.

5. **Kuta — tiga canang, satu pada setiap undakan.**  
   Pola satu-per-anak-tangga terlihat seperti dressing kit pura. Gunakan dua: satu aktif Ø0,24 m pada sisi undakan kedua, satu bekas pipih Ø0,18 m dekat dinding; hanya yang aktif memakai asap.

6. **Losari — tujuh pita pantulan jingga.**  
   Itu efek “sunset waterfront” yang bisa dipasang di kota mana pun. Kurangi menjadi 4 pita terputus, panjang `1,2–3,8 m`, jangan satu jalur 17 m; identitas harus datang dari kerja pisang epe dan siluet pinisi.

7. **Monas — Monas + rumah kebaya + ondel-ondel + rusa + kerak telor.**  
   Ini mendekati katalog ikon Jakarta. Yang kurang sebenarnya naungan dan kegiatan biasa. Tunda dua rusa beserta pagar—hemat 1.700 tri—dan dahulukan pohon, tikar, rantang, serta gerobak existing-volume.

**Brief paling lemah: Losari dan Oola.** Losari belum benar-benar memecah lantai 390 m²—sembilan tambalan acak hanya menjadi decal generik—dan identitasnya terlalu bergantung pada dua ikon. Oola sangat rinci secara teknis, tetapi pohon-halo-riak masih mempertahankan rupa social-game fantasy yang justru dikritiknya sendiri.

---

## 4. URUTAN BANGUN

| Urut | Spot | Apa | ± segitiga | Kenapa lebih dulu |
|---:|---|---|---:|---|
| 1 | Oola | Hapus 3 bangku duplikat, gabungkan bunga menjadi 3 rumpun, mute pohon dan Dev Hub, matikan putaran halo | 0 baru; total turun | Menghilangkan tiga tanda katalog aset tanpa biaya geometri. |
| 2 | Kuta | Hapus satu set payung–kursi identik; ubah rotasi dan jarak 4 papan existing | 0 baru; total turun | Langsung menghapus rupa resor dan display toko. |
| 3 | Losari | Tempatkan 2 bangku + 2 dingklik existing menghadap laut | 0 baru | Saat ini belum ada tempat duduk visual; ini fungsi betah paling dasar. |
| 4 | Malioboro | Jangan buat 7 `PointLight`; kepala lampu tersebut emissive-only | 0 | Menghilangkan sepuluh kolam cahaya seragam sekaligus memastikan batas teknis. |
| 5 | Braga | Putar fasad 90°, turunkan aspal, tambah dua trotoar dan collider | 48 | Semua detail berikutnya akan salah hadap dan salah elevasi bila ini ditunda. |
| 6 | Kuta | Ganti balok buih dengan 6 strip tak sejajar | 96 | Dampak siluet besar: pantai berhenti terlihat seperti tepi kolam. |
| 7 | Bogor | Buka muka warung, tulis menu, tambah tirai tipis; pindahkan animasi dari atap | 102 | Dengan sekitar seratus tri, kubus berubah menjadi tempat pelayanan yang dipakai. |
| 8 | Losari | Tambah grill, pemukul, 3 stoples berbeda tutup, peti pisang dan menu | 482 | Memberi aktivitas yang hanya milik Losari, bukan gerobak generik. |
| 9 | Malioboro | Bangun satu modul toko percontohan dengan rolling door “17” setengah turun | ±583 | Uji bahasa tepi jalan sekali sebelum menggandakan enam modul; lebih aman dari membangun seluruh deret seragam. |
| 10 | Monas | Bangun klaster 3 pohon tidak segaris dan tempatkan 1 modul duduk existing di bawahnya | ±645 | Naungan dan jarak sosial memberi rasa betah lebih tinggi daripada memperindah monumen atau menambah rusa. |

---

## 5. SATU KALIMAT PER SPOT

- **Oola:** Hub komunal harus terbaca dari satu pohon naung asimetris, termos pendek, dan kartu pengumuman miring—bukan dari efek lingkaran fantasi.
- **Bogor:** Pusatnya tetap kosong dan basah, sementara hidup menempel di warung, rak tanaman campur polybag, dan bawah kenari tua.
- **Braga:** Identitasnya adalah dua tepi usaha yang benar-benar berbeda saling berhadapan melintasi aspal, dengan meja kecil sebagai jeda, bukan kawasan heritage seragam.
- **Malioboro:** Rasa datang dari pertokoan yang perlahan tutup dan tepi jalan yang dihuni lesehan serta arang, sementara koridor tengah tetap panjang dan lega.
- **Kuta:** Ini ambang candi–pasir–air yang dipakai penjual kelapa dan peselancar basah, bukan deretan fasilitas resor tropis.
- **Losari:** Ini anjungan kota keras yang menghadap laut, dengan kerja pisang epe di depan dan pinisi kecil di kejauhan—bukan pantai atau marina dekoratif.
- **Monas:** Monumen harus menjadi orientasi jauh di tengah lapangan luas, sedangkan rasa betah dibentuk oleh jarak kosong, naungan pohon, rantang, dan gerobak di tepi.