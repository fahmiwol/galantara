# Riset visual — Benteng, senja Indonesia 90-an

**Arahan Fahmi:** *"Bikin lebih Indonesia, suasana tahun 90 – awal 2000-an
yang syahdu."*

Dokumen ini alasannya. Setiap warna dan bentuk di `benteng.css` dan
`BentengRenderer.js` harus bisa ditunjuk ke salah satu bagian di sini.
Kalau tidak bisa, itu selera, dan selera bukan alasan.

---

## 1. Kenapa arahan ini pas, bukan tempelan

Benteng bukan game esports. **Bentengan adalah permainan anak di tanah
lapang**, dan waktunya adalah **sore sampai magrib** — dimainkan sampai
dipanggil pulang. Jadi "syahdu 90-an" bukan tema yang ditempelkan ke atas
game; itu *waktu kejadian yang sebenarnya* dari permainan ini.

Ini juga menyelesaikan pertentangan yang sudah ada di repo. Kontrak gaya
`docs/GALANTARA_STYLE_CONTRACT_v0.md` menulis:

> Warna: **Hangat dominan** + aksen hijau/toska air; saturasi tinggi tapi
> harmonis (**bukan abu-abu cinematic**).
> Cahaya: **Golden hour** sebagai referensi emosional.

Sementara `benteng.css` yang ada memakai navy `#111936` dengan aksen
`#0ea5e9` dan `#a855f7`. Itu **abu-abu cinematic** persis yang dilarang.

## 2. Diagnosis "terlalu AI banget" — ada sidik jarinya

Bukan perasaan. Palet lama adalah **warna default Tailwind mentah**:

| Dipakai | Nama Tailwind | Di mana |
|---|---|---|
| `#0ea5e9` | sky-500 | tombol utama |
| `#a855f7` | purple-500 | aksen |
| `#f59e0b` | amber-500 | eyebrow |
| `#fb7185` | rose-400 | tim merah |
| `#38bdf8` | sky-400 | tim biru |

Ditambah `Syne` + `Nunito` dari Google Fonts. Kombinasi ini yang keluar
sendiri dari perkakas AI kalau tidak ada arahan. Tidak ada satu pun warna
di situ yang dipilih karena Indonesia, atau karena sore, atau karena apa pun.

## 3. Sumber rupa — senja, bukan malam

Yang saya pakai sebagai acuan, dan alasannya:

**Langit magrib tropis.** Bukan gelap. Gradien dari jingga-kuning di ufuk,
naik ke merah-bata, lalu ungu-biru di puncak. Bagian bawah layar tetap
terang; yang gelap justru bagian atas. Ini kebalikan dari palet lama yang
gelap merata.

**Tanah lapang.** Permukaan mainnya bukan grid neon — itu tanah kering
kecoklatan dengan bercak rumput. Warna dasar oker/tanah, bukan hitam.

**Kapur.** Batas lapangan dan lingkaran benteng dalam permainan anak
digambar pakai kapur di tanah, dan garis kapur **tidak pernah lurus
sempurna** — ia bergoyang, putus-putus, tebal-tipis. Garis vektor yang
rapi justru yang membuat tampilan terasa dibuat mesin.

**Cahaya buatan sore.** Lampu natrium jalanan (jingga pekat), neon warung
(hijau-putih dingin), lampu bohlam gantung. Nyala hangat, bukan glow neon
sci-fi.

**Warna cetakan foto 90-an.** Cetak C41 yang menua bergeser: highlight
menguning, bayangan condong ke sian/hijau, kontras turun sedikit. Itu
sumber "syahdu"-nya — bukan filter sepia, tapi pergeseran warna yang
spesifik.

## 4. Tipografi — satu pilihan yang bisa dipertanggungjawabkan

**Body/UI: Plus Jakarta Sans.** Dirancang Tokotype (perancang huruf
Indonesia) dan dipakai sebagai huruf identitas kota Jakarta. Lisensi SIL
OFL, tersedia di Google Fonts. Ini pilihan yang punya asal-usul Indonesia
nyata — bukan huruf Barat yang saya klaim "terasa Indonesia".

**Angka besar & judul: Bitter.** Slab serif, OFL. Slab berbobot adalah
rasa cetakan 90-an; ia juga membuat angka skor dan penghitung waktu
terbaca tegas tanpa berteriak seperti Syne.

Yang saya **tidak** klaim: bahwa ada "font batik" atau bahwa slab serif itu
khas Indonesia. Yang benar cuma dua hal di atas.

## 5. Palet — dan kenapa tiap warna ada

Nama diambil dari bendanya, bukan dari kode heksanya.

| Token | Nilai | Dari mana |
|---|---|---|
| `senja_ufuk` | `#f2a65a` | jingga ufuk magrib |
| `senja_bata` | `#c05e3c` | genting tanah liat, batu bata |
| `senja_ungu` | `#4a3b63` | langit puncak saat magrib |
| `tanah` | `#8a6b4f` | tanah lapang kering |
| `tanah_terang` | `#a98055` | tanah kena cahaya rendah |
| `rumput` | `#6f7f4a` | rumput kering sore, bukan hijau menyala |
| `kapur` | `#f4ead6` | garis kapur di tanah |
| `bambu` | `#8a9455` | bambu hidup |
| `seng` | `#7d848c` | atap seng |
| `natrium` | `#ffb35c` | lampu jalan natrium |
| `neon_warung` | `#bfe3d0` | neon warung, satu-satunya warna dingin |

**Warna tim.** Bentengan anak-anak tidak punya seragam; yang dipakai
biasanya ikat kepala atau kaos. Dua kubu dibedakan sebagai:
- **Biru nila** `#3d6b9e` — warna celana/seragam, kain nila
- **Merah bata** `#c0553f` — batu bata, genting

Keduanya diredam dibanding neon lama, tapi **wajib tetap lolos ambang
keterbacaan** — lihat §6.

## 6. Pagar yang tidak boleh ditembus oleh estetika

Ini yang membedakan penggantian palet dari perusakan.

`tools/benteng-visual-audit.mjs` menguji, dan palet baru **harus tetap lulus**:

1. **Kontras ≥ 3:1** tiap warna penting terhadap latar arena
   (WCAG 2.2 SC 1.4.11, komponen non-teks).
2. **Warna tim terpisah dE ≥ 20** di bawah simulasi protanopia,
   deuteranopia, dan tritanopia (matriks Machado dkk. 2009, CIE76).
3. **Tiap anak tangga aura terpisah dE ≥ 20 dari tetangganya**, juga di
   bawah ketiga simulasi itu.

Ditambah yang sudah diukur sebelumnya dan tidak boleh mundur: tidak ada
teks HUD di bawah 10 px, target sentuh ≥ 44×44 px, zoom halaman tidak
dikunci, dan aura tetap punya penanda non-warna (ketebalan cincin).

**Latar arena berubah dari hampir hitam ke tanah hangat**, jadi seluruh
rasio kontras berubah. Konstanta `GROUND` di alat audit ikut diperbarui,
dan hasilnya diukur ulang — bukan diasumsikan.

## 7. Yang belum dikerjakan

- Dunia 3D Oola (`World.js`, `proceduralMeshFactory.js`) belum disentuh;
  token palet di §5 sengaja ditulis netral supaya bisa dipakai di sana.
- Aset Blender belum dibuat. Prop procedural yang ada masih bentuk dasar.
- Perbedaan rupa antar-Spot (Monas / Kuta / Malioboro / Bogor) belum
  dirumuskan — itu butuh riset regional tersendiri dan tidak boleh
  ditebak.
