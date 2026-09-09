# Riset 3D Nusantara — bentuk, batas, dan terjemahan procedural

**Tanggal:** 2026-09-10  
**Tujuan:** memberi dasar bentuk untuk archetype 3D Galantara, bukan membuat
rekonstruksi arsitektur adat yang mengaku presisi.

---

## 1. Pagar arah: Oola dan Spot bukan tempat yang sama

PRD BAB 2.1 dan BAB 4.2 mengunci Oola sebagai pulau kedatangan bergaya surga:
putih, emas, lavender; tenang, pastel, dan fantasi. Karena itu rumah Joglo,
Sulah Nyanda, rumah panggung Bugis–Makassar, sawah, dan rumpun bambu **tidak
diletakkan di Oola**. Oola hanya memakai pohon fantasi, taman, bangku, lampu,
portal, serta bangunan utilitasnya sendiri.

Ke-Nusantara-an masuk melalui katalog builder dan Spot yang tepat. Pembagian
ini mencegah kesalahan paling mudah: menganggap “Indonesia” sebagai satu desa
generik lalu menempelkan atap dan motif dari daerah yang berlainan.

## 2. Prinsip rupa yang diterjemahkan ke 3D

Referensi Fahmi mengarah pada miniatur yang dibaca dari siluet: alas bundar
atau oval, massa bangunan sederhana, atap dominan, warna matte, dan cahaya
lembut. Tautan 80 Level yang diberikan sebenarnya memuat artikel **Fabledom**,
bukan “Bellemont Peaks”; jadi yang dapat dipakai dari sana hanyalah kualitas
arah yang terlihat/disebut—city-builder santai, dunia dongeng, bentuk stylized—
bukan klaim identitas game atau detail arsitektur Indonesia.

Terjemahan yang dipakai:

- bentuk besar harus terbaca dari kamera orbit; detail kecil hanya penguat;
- atap mengambil sekitar 35–55% tinggi visual rumah, menurut archetype;
- tepi dibuat tebal lewat overhang, lis, atau susunan bidang, bukan tekstur;
- material memakai `MeshStandardMaterial`, roughness 0,72–0,9 dan metalness
  rendah;
- variasi seed mengubah tinggi tiang, lebar teritis, arah/tinggi vegetasi, dan
  warna dalam rentang kecil—tidak mengubah identitas siluet;
- tidak ada pola “batik” prosedural tanpa nama, lokasi, dan sumber yang jelas.

## 3. Rumah Joglo — rumpun Spot Yogyakarta

### Dasar yang dapat dipertanggungjawabkan

Data Cagar Budaya Kemendikbud menempatkan contoh rumah Joglo di Sleman,
Yogyakarta dan menyebut rangka kayu, elemen bambu, serta bubungan. Balai
Pelestarian Cagar Budaya Yogyakarta juga mencatat atap Joglo yang ditopang
empat **saka guru** dan tumpangsari tiga susun. Contoh Joglo Peniung mencatat
bangunan kayu dengan atap genting.

Karena hubungan wilayah dan bentuknya langsung, archetype ini tepat untuk
keluarga visual **Malioboro/Yogyakarta**. Ia tidak ditempatkan di Oola.

### Siluet procedural

- pendhapa terbuka berbentuk bujur sangkar;
- empat saka guru lebih tebal daripada tiang tepi;
- alas rendah berundak;
- atap tiga massa: emper lebar dan landai, penanggap mengecil, lalu brunjung
  paling curam sebagai mahkota;
- warna kayu gelap-hangat, genting amber/terakota, alas batu krem.

Ukuran game pada skala 1:1: tapak kira-kira 4,8 × 4,2 m dan tinggi 4,1 m.
Angka ini adalah **abstraksi untuk keterbacaan kamera**, bukan ukuran baku
rumah Joglo. Saya belum menemukan dasar bahwa satu rasio universal berlaku
untuk semua tipe Joglo, jadi seed hanya mengubahnya sedikit.

## 4. Sulah Nyanda — Baduy/Kanekes, Banten

### Dasar yang dapat dipertanggungjawabkan

Sulah Nyanda adalah rumah tradisional Baduy di Banten. Literatur yang ditemukan
secara konsisten menyebut rumah panggung, tiang di atas batu/umpak yang
mengikuti kontur, rangka kayu, lantai serta dinding bambu, dan penutup atap
daun/ijuk. Bentuknya rumah persegi panjang dengan atap kampung dan **sosoran**
di salah satu sisi; “nyanda” merujuk kesan bidang yang bersandar atau merebah.

Ini penting untuk penempatan: Sulah Nyanda boleh menjadi archetype
**Sunda–Banten/Baduy**, tetapi **bukan ikon Braga/Bandung**. Hubungan kota Braga
dengan rumah ini belum punya dasarnya. Jika kelak dipakai di wilayah Bandung,
perlu alasan naratif (misalnya pameran arsitektur) alih-alih mengaku sebagai
rumah khas kota tersebut.

### Siluet procedural

- badan rumah ringan dan memanjang, terangkat dari tanah;
- tiang berdiri di atas batu umpak; tinggi dibuat sedikit berbeda oleh seed
  untuk memberi kesan menyesuaikan kontur tanpa membuat medan palsu;
- atap pelana curam menjadi massa utama;
- sosoran depan lebih rendah dan memanjang, sehingga profil “bersandar” tetap
  terbaca dari sisi;
- dinding bambu ditunjukkan lewat warna dan beberapa bilah besar, bukan pola
  anyaman berfrekuensi tinggi.

Ukuran game: tapak kira-kira 4,4 × 3,0 m dan tinggi 3,6 m. Hiasan atau motif
khusus pada dinding **belum punya dasarnya**, maka tidak dibuat.

## 5. Rumah panggung pesisir — Losari/Sulawesi Selatan

### Dasar yang dapat dipertanggungjawabkan

Balai Pelestarian Nilai Budaya Sulawesi Selatan menjelaskan rumah
Bugis–Makassar sebagai rumah panggung dengan atap pelana. Bidang segitiga pada
ujung atap disebut **timpalaja**; jumlah susunannya dapat menandai status sosial.
Sumber yang sama membagi bangunan secara vertikal menjadi kolong/tiang, badan,
dan atap.

Untuk Spot **Losari/Makassar**, dasar regionalnya kuat. Namun model generik
Galantara tidak boleh memberi pangkat sosial palsu. Karena itu timpalaja dibuat
sebagai dua lis sederhana yang memperjelas bidang gable, bukan jumlah susunan
yang diklaim mewakili status tertentu.

### Siluet procedural

- kolong tinggi dan terbuka dengan enam sampai delapan tiang;
- badan rumah persegi panjang dari kayu;
- tangga depan yang jelas dari kamera orbit;
- atap pelana lebar dengan overhang besar;
- bidang timpalaja di muka atap diperkuat dua lis horizontal;
- palet Losari: kayu/merah-oranye, bayangan navy, aksen pasir pucat.

Ukuran game: tapak kira-kira 4,2 × 3,0 m dan tinggi 4,2 m. Bentuk ukiran lokal
tertentu **belum punya dasarnya**, maka tidak dibuat.

## 6. Vegetasi dan bentuk lahan

### Pisang

Pisang bukan pohon berkayu. Kew dan BRIN menjelaskan batangnya sebagai
**batang semu** dari pelepah daun, dengan daun sangat besar, memanjang, dan
tersusun spiral. Model karena itu memakai batang berlapis warna muda, mahkota
daun lebar yang memancar, serta satu anakan kecil menurut seed. Bentuk ini
berguna sebagai vegetasi kebun tropis di Kuta dan area permukiman Spot; bukan
penanda eksklusif satu daerah.

### Bambu rumpun

Ciri yang aman dimodelkan adalah buluh silindris, ruas/nodus yang terbaca, daun
lanset sempit, dan pertumbuhan berkelompok. Model memakai 6–8 buluh dengan
tinggi/kemiringan berseed serta beberapa nodus besar. Nama spesies tidak
ditetapkan karena **belum punya dasarnya** untuk memilih spesies per Spot.

### Padi dan terasering

UNESCO menjelaskan lanskap budaya Bali sebagai sawah terasering yang terhubung
kanal, bendung, desa, dan pura air dalam sistem subak. Karena itu “terasering”
tidak diterjemahkan menjadi sekadar bukit hijau bertangga: archetype memakai
empat petak berundak, pematang tanah, permukaan air dangkal, dan rumpun padi.
Untuk produksi Spot Kuta/Bali nanti, ia harus hadir sebagai bagian lanskap air,
bukan dekorasi tunggal yang mengaku mewakili seluruh subak.

### Kelapa

Kelapa yang sudah ada tetap cocok untuk Kuta/pesisir, tetapi bentuk daunnya
perlu dibaca sebagai mahkota radial, bukan kotak silang. Pass ini memprioritaskan
enam archetype baru; penyempurnaan kelapa lama dicatat sebagai pekerjaan lanjut.

## 7. Pemetaan Spot yang disarankan

| Spot | Elemen yang punya dasar | Elemen yang tidak boleh diasumsikan |
|---|---|---|
| Oola | alas diorama surgawi, pohon fantasi lavender, taman putih-emas | seluruh rumah adat, sawah, bambu sebagai “kampung” |
| Monas | lanskap metropolitan/monumental dari PRD | rumah adat tertentu sebagai ikon Jakarta |
| Kuta | kelapa, pisang, pasir; terasering hanya bila konteks Bali diperluas | Joglo atau Sulah Nyanda |
| Malioboro | Joglo/pendhapa, kayu, genting amber | motif batik tanpa sumber |
| Braga | massa art-deco dari PRD; vegetasi dataran tinggi perlu riset lanjut | Sulah Nyanda sebagai rumah “khas Bandung” |
| Losari | rumah panggung Bugis–Makassar, palet maritim, vegetasi pesisir | jumlah timpalaja yang mengklaim status sosial |

## 8. Alas diorama

Alas adalah bahasa visual global, bukan artefak adat. Untuk Oola bentuknya
menjadi tiga lapis konsentris:

1. permukaan gading/putih hangat;
2. bibir emas tipis yang terbaca dari kamera;
3. badan lavender di atas gumpalan awan.

Ini mempertahankan ukuran Oola 36 × 36 unit dan fungsi pulau melayang, sambil
mengubah kesan dari “tanah silinder” menjadi miniatur terpajang. Spot regional
kelak dapat memakai keluarga alas yang sama dengan warna kota masing-masing.

## 9. Keputusan pipeline dan anggaran

Engine Blender referensi di `C:\Mighan-3D\server\blender-engine.js` sudah aman
dan param-driven, tetapi template `house`-nya masih satu badan kotak dengan
atap limas generik. Untuk enam bentuk ini, procedural Three.js lebih tepat:
tidak menambah aset jaringan, seed langsung bekerja di builder, dan siluet
regional dapat ditulis eksplisit. Blender/GLB baru lebih unggul bila dibutuhkan
ukiran, interior, LOD, tekstur panggang, atau landmark hero.

Target tiap prop kecil tetap di bawah 5.000 segitiga. Target praktis pass ini:

- rumah: < 1.500 segitiga;
- vegetasi: < 1.000 segitiga;
- terasering: < 1.500 segitiga;
- lampu titik tidak memakai shadow;
- tidak ada `scene.traverse`; referensi lampu dikumpulkan saat grup dibuat.

## 10. Rujukan

1. Galantara, `Galantara PRD utama Read Me.md`, BAB 2–4.
2. Galantara, `docs/GALANTARA_STYLE_CONTRACT_v0.md`.
3. Direktorat Pelindungan Kebudayaan, [Rumah Joglo Milik Subardjo](https://budaya.data.kemdikbud.go.id/cagarbudaya/objek/KB003587).
4. BPCB D.I. Yogyakarta, [Semangat Pelestarian Cagar Budaya dari Rumah Tradisional di Godean](https://kebudayaan.kemdikbud.go.id/bpcbyogyakarta/semangat-pelestarian-cagar-budaya-dari-rumah-tradisional-di-godean/).
5. BPCB D.I. Yogyakarta, [Rumah Joglo Peniung](https://kebudayaan.kemdikbud.go.id/bpcbyogyakarta/rumah-joglo-peniung/).
6. Mustopa, [“Sulah Nyanda” Identitas Budaya Keharmonisan pada Masyarakat Baduy](https://jikom.uima.ac.id/jurnal-stikom/index.php/jikom1/article/view/285), 2023.
7. Nurlaily dkk., [Application of Tropical Architecture Concept in Sulah Nyanda House](https://vm36.upi.edu/index.php/jaz/article/view/77381/0).
8. BPNB Sulawesi Selatan, [Rumah Bugis–Makassar](https://kebudayaan.kemdikbud.go.id/bpnbsulsel/rumah-bugis-makassar/).
9. UNESCO World Heritage Centre, [Cultural Landscape of Bali Province: the Subak System](https://whc.unesco.org/en/list/1194).
10. Royal Botanic Gardens, Kew, [Musa — morphology](https://powo.science.kew.org/taxon/urn%3Alsid%3Aipni.org%3Anames%3A327926-2/general-information).
11. BRIN, [Keanekaragaman Tumbuhan Berguna](https://penerbit.brin.go.id/press/catalog/download/816/1024/26154?inline=1), uraian *Musa acuminata*.
12. 80 Level, [Relaxing City-Builder Game With Stylized Graphics & Fairytale Vibes](https://80.lv/articles/relaxing-city-builder-game-with-stylized-graphics-fairytale-vibes), 2024.

## 11. Yang sengaja belum diklaim

- proporsi arsitektural presisi dan sistem sambungan tiap subtipe rumah;
- motif dinding, ukiran, atau simbol regional yang belum punya sumber primer;
- rumah tradisional yang tepat untuk Braga/inti Bandung;
- spesies bambu, padi, dan pisang khusus per kota;
- hubungan langsung poster Bedugul yang disebut Fahmi dengan satu komposisi
  model tertentu, karena berkas gambarnya tidak ada di repo.

Semua itu perlu riset atau referensi gambar tambahan sebelum dijadikan detail
produksi. Sampai saat itu, siluet, material, dan konteks yang bersumber di atas
adalah batas implementasi.
