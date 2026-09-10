# KESIAPAN PELUNCURAN — Galantara

> Disusun 11 Sep 2026, atas pertanyaan: *"kapan bisa kita launching? harus se
> candu Roblox, ramah anak, semua usia bisa main, banyak pilihan, cara monetize
> jelas."*
>
> **Tidak ada tanggal di dokumen ini.** Tanggal yang saya karang akan salah dan
> lebih buruk lagi, akan dipercaya. Yang ada di sini **syarat** — apa yang harus
> benar sebelum tiap tingkat peluncuran, dan mana yang belum ada.

---

## Ringkas: tiga hal, dan yang satu bisa menghentikan proyek

**1. Mesin kecanduan Roblox itu BUKAN dunianya. Itu buatan pemainnya.**
Galantara punya 6 Spot dan 1 minigame. Habis dalam satu jam. Roblox tidak punya
6 tempat — ia punya puluhan juta pengalaman buatan pemain, dan orang kembali
karena selalu ada yang baru **yang dibuat orang lain**. PRD sudah merancangnya
(BAB 8 Asset Standard, BAB 9 Developer Ecosystem). **Yang dibangun: nol.**

**2. "Ramah anak" bukan fitur. Itu kewajiban, dan sekarang nol.**
Saat ini chat **terbuka, tanpa saring, tanpa tombol lapor, tanpa blokir, tanpa
gerbang umur**. Kalau anak-anak masuk ke keadaan seperti ini dan sesuatu terjadi,
yang rusak bukan retensi — proyeknya bisa berhenti. Ini satu-satunya butir di
dokumen ini yang bersifat **memblokir, bukan menunda**.

**3. Monetisasi sudah dirancang, belum dibangun, dan satu barisnya berisiko.**
PRD BAB 6.4 lengkap. Tapi **Travel Fee 35%** — baris pendapatan TERBESAR —
menarik biaya untuk berpindah antar kota. Itu memungut pajak atas hal yang
membuat dunia terasa luas. Perlu ditinjau ulang; alasannya di §4.

---

## 1. Empat tingkat peluncuran, bukan satu tanggal

Menyebut "launching" sebagai satu peristiwa membuat semuanya terasa jauh.
Dipecah, sebagian besar sudah dekat.

| Tingkat | Untuk siapa | Yang menghalangi |
| --- | --- | --- |
| **T0 · Uji tertutup** | Tautan pribadi, orang yang kamu kenal | **Hampir tidak ada.** Butuh server. |
| **T1 · Beta terbuka 13+** | Publik, tautan bebas, **bukan untuk anak** | Moderasi minimum, gerbang umur, ToS/privasi, server |
| **T2 · Ramah anak, semua usia** | Termasuk di bawah 13 | Semua T1 + persetujuan orang tua, chat terbatas untuk anak, **kapasitas moderator manusia** |
| **T3 · "Se-candu Roblox"** | Ekosistem kreator | Builder UGC, penemuan konten, bagi hasil kreator |

**T0 bisa minggu ini** kalau ada server. Nilainya nyata: gate playtest Benteng
(20 match manusia) baru bisa ditutup dengan orang sungguhan, dan itu satu-satunya
klaim "seimbang" yang punya dasar.

**T2 bukan T1 + sedikit.** Menerima anak-anak mengubah kelas kewajibannya,
bukan menambah ceklis. Lihat §3.

---

## 2. T1 — beta terbuka 13+

### Yang sudah ada
Dunia, gerak, enam Spot, multiplayer tamu, chat + bubble, meja nongkrong,
Benteng dengan bot, tantangan harian, 66 uji, dokumentasi lengkap.

### Yang menghalangi

**a. Moderasi — nol.** Ini yang terbesar.

| Butuh | Kenapa | Ada? |
| --- | --- | --- |
| Tombol **lapor** pemain/pesan | Tanpa ini, korban tidak punya jalan apa pun | ✗ |
| **Blokir** pemain | Menghentikan pelaku tanpa menunggu admin | ✗ |
| **Bisukan** per-pemain | Untuk gangguan yang belum layak lapor | ✗ |
| Saring kata + **batas laju** chat | Spam dan pelecehan paling dasar | ✗ |
| Antrean laporan + jejak audit | Admin butuh alat, bukan cuma wewenang | ✗ |
| Larangan berbagi kontak/tautan | Vektor grooming yang paling umum | ✗ |

Server sekarang **merelai apa pun** — batasnya cuma "pesan ≤ 100 huruf" dan
"tamu tidak boleh chat". Tidak ada yang mencatat siapa mengirim apa.

**b. Gerbang umur + dasar hukum.** Belum ada gerbang umur, ToS, maupun kebijakan
privasi. Untuk pengguna Indonesia, **UU PDP (UU 27/2022)** berlaku. Saya bukan
penasihat hukum dan tidak akan berpura-pura jadi satu — yang bisa saya katakan
dengan yakin: **meluncurkan dunia sosial berchat tanpa ToS dan kebijakan privasi
itu keliru**, dan sebelum T2 ini wajib ditinjau orang yang memang ahlinya.

**c. Server.** Belum ada. Semua yang lain menunggu ini.

**d. Pengerasan multiplayer.** Benteng seluruhnya di klien; server tidak
mewasiti apa pun. Untuk T1 masih bisa diterima (tidak ada yang dipertaruhkan),
tapi **begitu ada koin, ini jadi lubang**.

---

## 3. T2 — "ramah anak, semua usia"

Ini yang kamu minta, dan ini bagian yang paling perlu jujur.

**Menerima anak di bawah 13 mengubah kelas proyeknya.** Bukan "T1 plus filter".

| Yang berubah | Kenapa |
| --- | --- |
| Persetujuan orang tua yang bisa diverifikasi | Data anak butuh dasar hukum tersendiri |
| Chat **terbatas** untuk anak (daftar frasa aman, bukan teks bebas) | Ini yang Roblox lakukan, dan alasannya bukan kesopanan |
| Moderasi **manusia**, bukan cuma alat | Saring otomatis akan lolos; yang lolos justru yang paling berbahaya |
| Kanal keselamatan + waktu tanggap | Kalau laporan tidak ditindak, alatnya cuma hiasan |
| Tinjauan konten UGC sebelum tayang | Begitu builder ada, orang akan mengunggah apa pun |

**Ini biaya operasional berjalan, bukan pekerjaan sekali jadi.** Moderator
manusia itu gaji bulanan. Kalau anggarannya belum ada, T2 belum realistis —
dan lebih baik **luncurkan T1 sebagai 13+ dengan jujur** daripada mengaku ramah
anak tanpa penopangnya.

> Rekomendasi saya: **T1 sebagai 13+**, dan T2 dijadwalkan hanya setelah ada
> anggaran moderasi. Mengaku "semua usia" lalu tidak sanggup menjaganya adalah
> risiko terbesar di seluruh proyek ini — lebih besar daripada gagal teknis
> mana pun.

---

## 4. Monetisasi — sudah dirancang, satu baris perlu ditinjau

PRD BAB 6.4:

| Sumber | % | Catatan saya |
| --- | ---: | --- |
| **Travel Fee** | 35% | ⚠️ **Perlu ditinjau ulang.** Lihat bawah. |
| Sewa Spot | 25% | Kuat. Pemilik Spot bayar karena dapat tempat dan trafik. |
| Fee transaksi | 15% | Wajar, mengikuti nilai yang benar-benar terjadi. |
| Marketplace kreator | 10% | Ini yang akan tumbuh kalau T3 jadi. |
| Kosmetik avatar | 8% | Aman dan terbukti di industri. |
| Iklan | 5% | Kecil, dan sebaiknya tetap kecil. |
| Potongan sawer | 2% | Wajar. |

**Kenapa Travel Fee berisiko.** Ia baris terbesar, dan ia **memungut biaya atas
penjelajahan**. Yang membuat dunia terasa luas justru berpindah-pindah melihat
tempat baru; memasang tarif di situ mengajari pemain untuk **tinggal diam**.
Pemain yang tinggal diam tidak menemukan Spot orang lain, tidak belanja di sana,
dan tidak mengundang teman. Tiga baris pendapatan lain ikut mengecil.

Alternatif yang lebih aman dan bisa diuji:
- Warp **gratis** ke Spot yang pernah dikunjungi, berbayar hanya untuk warp
  **instan** dari mana saja (menjual kenyamanan, bukan akses).
- Atau: gratis dengan jatah harian, berbayar untuk melebihi jatah.
- Atau: dipindahkan ke sewa Spot — pemilik Spot membayar agar warp ke tempatnya
  gratis bagi pengunjung. Insentifnya jadi searah.

Yang sudah **benar** di PRD dan patut dipertahankan: Mighan Coin diposisikan
sebagai **poin loyalti, non-blockchain, tidak bisa dicairkan** (risk register
PRD baris 833). Itu penempatan yang jauh lebih aman terhadap regulasi BI/OJK
daripada mata uang yang bisa ditarik.

---

## 5. T3 — "se-candu Roblox"

**Ini yang sebenarnya kamu tanyakan, dan ini produk yang berbeda.**

Roblox bertahan bukan karena grafis atau dunianya. Ia bertahan karena:

| Roblox | Galantara sekarang |
| --- | --- |
| Puluhan juta pengalaman buatan pemain | 6 Spot buatan tim |
| Konten baru tiap hari, dari orang lain | Konten baru saat tim sempat |
| Kreator dibayar → kreator terus membuat | Belum ada jalur bayar kreator |
| Penemuan konten (rekomendasi, tren) | Belum ada — belum ada yang ditemukan |
| Main bareng teman itu inti, bukan tambahan | Multiplayer ada, ajakan/party belum |

**Konsekuensinya keras:** tanpa UGC, tidak ada jumlah polish yang akan
menghasilkan retensi seperti Roblox. Menambah Spot ketujuh, kedelapan, kesembilan
buatan tim tidak menutup jarak ini — ia cuma memperpanjang jam pertama.

PRD sudah punya arsitekturnya: BAB 8 (dual layer `.glb` + `manifest.json` +
`handler.js`, sandbox, timeout 3 detik), BAB 9 (ekosistem developer, bagi hasil).
Rancangannya masuk akal. **Yang dibangun nol.**

Urutan yang saya sarankan untuk T3, dan alasannya:

1. **Builder penempatan dulu, bukan builder logika.** Biarkan orang menata prop
   yang sudah ada di Spot mereka dan menyimpannya. Ini 10% pekerjaan builder
   penuh, tapi memberi 80% rasa "ini punyaku".
2. **Penemuan sebelum kuantitas.** Sepuluh Spot buatan pemain yang tidak bisa
   ditemukan sama dengan nol. Daftar "Spot baru minggu ini" bernilai lebih besar
   daripada sepuluh Spot berikutnya.
3. **Bayar kreator lebih awal daripada terasa nyaman.** Kreator yang tidak
   dibayar akan berhenti, dan yang berhenti tidak kembali.
4. **Logika/SDK terakhir.** Di situ letak risiko keamanan (BAB 8.9), dan ia baru
   berguna setelah ada orang yang cukup peduli untuk memakainya.

---

## 6. Jawaban jujur atas "kapan"

**Yang bisa saya katakan dengan dasar:**

- **T0 uji tertutup** — penghalangnya cuma server. Semua yang lain siap.
- **T1 beta 13+** — penghalangnya moderasi + gerbang umur + ToS/privasi +
  server. Ini pekerjaan yang bentuknya jelas dan terbatas, bukan riset.
- **T2 semua usia** — penghalangnya **bukan teknis**, melainkan anggaran
  moderasi manusia yang berjalan terus. Jangan dijadwalkan sebelum itu ada.
- **T3 se-candu Roblox** — penghalangnya adalah **membangun produk kedua**
  (builder + penemuan + bagi hasil). Ini bukan sisa pekerjaan; ini pekerjaan
  utamanya.

**Yang TIDAK bisa saya katakan:** berapa lama tiap tingkat. Saya belum pernah
melihat kecepatanmu pada pekerjaan sebesar ini, dan menebaknya cuma akan jadi
angka yang dipercaya padahal karangan.

**Kalau harus memilih satu hal berikutnya:** bukan fitur — **server**, karena
ia menghalangi T0, dan T0 memberi hal yang paling kurang sekarang: **orang
sungguhan bermain, dan data tentang apa yang benar-benar mereka lakukan.**
Semua keputusan di dokumen ini akan lebih baik kalau diambil dengan data itu.

---

## 7. Yang perlu ditambahkan ke PRD

PRD-nya kuat pada dunia, ekonomi, dan arsitektur aset. Tiga lubang, dan
ketiganya soal orang, bukan teknologi:

1. **Tidak ada bab keselamatan & moderasi.** "Moderasi" hanya muncul sebagai
   kewenangan admin dan sebagai penawar penipuan merchant. Untuk dunia sosial
   berchat, ini seharusnya satu bab tersendiri.
2. **Tidak ada kebijakan umur.** Tidak ada gerbang umur, tidak ada penanganan
   di bawah 13, tidak ada persetujuan orang tua — padahal "semua usia" adalah
   tujuan yang dinyatakan.
3. **Tidak ada rencana konten pasca-peluncuran.** Apa yang dilihat pemain di
   minggu kedua? Sekarang jawabannya: hal yang sama.
