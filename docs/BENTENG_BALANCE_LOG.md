# Benteng — Log Balance Fase 0

Catatan terukur untuk tiap perubahan perilaku bot. Aturannya: **ukur dulu,
baru ubah**, dan simpan angkanya di sini supaya sesi berikutnya tidak
menebak ulang.

Alat: `node tools/benteng-sim.mjs --runs 100`
Gate: `docs/RECONCILIATION_v0.1.md`

---

## 2026-09-09 — Peran bot nyata menggantikan hardcode ID

### Indikator (narasi)

Sesi sebelumnya melaporkan "semua bot menyerbu sehingga benteng kosong dan
pertandingan terlalu cepat selesai", lalu menambal dengan satu penjaga
yang dikunci ke `unit.id === 'B1' || unit.id === 'M0'`. Tambalan itu tidak
menyelesaikan masalahnya, dan rusak begitu jumlah pemain berubah.

Setelah diukur, sebabnya lebih dalam daripada "bot terlalu agresif":

**Muatan adalah fungsi murni dari lama-di-luar-benteng.** Karena semua unit
berangkat dari benteng pada waktu yang hampir sama, muatan mereka nyaris
identik, dan pertarungan diputuskan oleh siapa yang keluar paling akhir —
bukan oleh keputusan pemain. Hasilnya efek domino: satu tag menang
melahirkan tag menang berikutnya, sampai satu tim habis dalam 10 detik.

### Parameter (angka, 100 match headless)

| Metrik | Sebelum | Sesudah | Gate |
|---|---|---|---|
| Durasi median | 77 s | 180 s | ≥ 90 s |
| Durasi tersingkat | 10,1 s | 9,4 s | — |
| Selesai karena tim habis | 60% | 2% | — |
| Near-miss / match | 0,53 | 2,20 | ≥ 3 ❌ |
| Pulang saat muatan <20 | 2,0% | 29,0% | 10–70% |
| Penyelamatan rantai / match | 0,07 | 0,25 | > 0 |
| Waktu bot menyerbu | 82,3% | 34,7% | — |
| Waktu bot bertahan | 1,6% | 16,9% | — |

Keputusan **kejar-atau-pulang** yang jadi inti Sistem Muatan naik dari
praktis tidak pernah terjadi (2%) menjadi 29% — itu perubahan jenis,
bukan sekadar angka.

### Faktor-X (kondisi yang bikin ini bekerja)

1. **Peran ditentukan tiap tick dari roster hidup**, bukan dari ID.
   Penjaga = unit yang sudah paling dekat rumah, dengan histeresis
   `guardStickiness` supaya tidak gonta-ganti. Karena ia duduk di benteng,
   muatannya tetap penuh — itulah yang membuatnya bisa menahan penyusup,
   yang selalu datang dengan muatan tekor.
2. **Serbu harus mampu dibayar.** Bot hanya berangkat ke benteng lawan
   kalau muatannya cukup untuk perjalanan **plus** 3 detik channel dengan
   pengurasan 3×. Satu syarat ini yang menghentikan serbuan bunuh diri
   delapan unit di pembukaan.
3. **Terpojok = memotong, bukan lari.** Bot membandingkan waktu-sampai-rumah
   dengan waktu-sampai-tertangkap. Kalau rumah tidak terkejar, ia menyilang
   di depan pengejar. Versi pertama saya menyuruh semua bot lari pulang; hasilnya
   arena jadi sepi — 40% waktu dipakai kabur dan nyaris tidak ada kontak.

### Yang masih gagal

**Near-miss 2,20 dari target 3.** Pita near-miss cuma 0,6–0,9 m: unit harus
berpapasan dalam celah selebar ~4 frame tanpa menyentuh. Sweep menunjukkan
melebarkan definisinya akan lulus:

| `nearMiss.distance` | near-miss / match |
|---|---|
| 0,3 (sekarang) | 2,40 |
| 0,4 | 2,90 |
| 0,5 | 3,60 |
| 0,6 | 4,22 |

Saya **tidak** mengubahnya. Melebarkan pita bukan memperbaiki permainan,
hanya melonggarkan definisi — dan near-miss memicu slow-motion, jadi ini
keputusan rasa yang harus diambil Fahmi, bukan agent. Dugaan saya 0,45–0,5
lebih terbaca di layar (0,3 m pada 5 m/detik cuma 60 milidetik), tapi itu
perlu dilihat, bukan dihitung.

Angka near-miss dari bot juga cuma proksi: gate ini ditulis untuk playtest
manusia, dan manusia mengelak dengan sengaja.

> **Ditindaklanjuti hari yang sama:** Fahmi memutuskan naikkan ke 0,5.
> Lihat entri "2026-09-09 (2)" di bawah untuk alasan terukurnya dan
> konsekuensi slow-motion yang ikut harus ditangani.

---

## Cacat metode yang ketahuan (jangan diulang)

Dua kali harness saya sendiri yang berbohong, bukan game-nya:

1. **30 match ternyata cuma ~15 skenario.** Simulasi ini deterministik, jadi
   mengulang match dengan konfigurasi sama menghasilkan lintasan identik.
   Sweep terlihat punya optimum tajam di satu nilai — itu bifurkasi, bukan
   respons. Diperbaiki dengan `match.startJitter` berseed (default 0; harness
   menaikkannya) supaya sederet match jadi sampel sungguhan.

2. **"Bias sisi 87% untuk Biru" tidak pernah ada.** Policy kontrol saya
   menghitung ulang keputusan tiap frame (60 Hz) sementara bot asli berpikir
   tiap 0,5 detik, dan ia berjalan lurus sementara bot memutari rintangan lewat
   `findRoute`. Dua keunggulan itu milik harness, bukan tim Biru. Setelah
   disetarakan: **29 : 23 dengan 28 seri dari 80 match** — seimbang.

   Uji cermin (`startJitter=0`, kedua tim berotak sama, keadaan harus tetap
   jadi bayangan) adalah cara tercepat menemukannya: simetri pecah pada
   detik 0,27 tepat di slot pemain.

> Sebelum melaporkan "ada bias", jalankan `--policy bot` sebagai kontrol.
> Kalau kontrolnya sendiri tidak setara, angkanya tidak berarti apa-apa.

---

## 2026-09-09 (2) — Dial near-miss dinaikkan, lalu polish keterbacaan

### Keputusan dial

`nearMiss.distance` **0,3 → 0,5**. Radius tag 0,6 m, jadi pita near-miss
lama adalah 0,6–0,9 m: pada 5 m/detik sebuah papasan melintasinya dalam
**~60 milidetik (±4 frame)** — terlalu singkat untuk terbaca. Pada 0,5 pita
jadi ~100 ms. Near-miss naik 2,20 → **3,50 per match**, dan **kelima gate
terukur Fase 0 lulus**.

### Konsekuensi yang harus ditangani

Menaikkan dial berarti slow-motion lebih sering terpicu. Diukur 40 match:
**100% near-miss terjadi antar-bot, nol melibatkan pemain.** Artinya game
menghentikan waktu untuk kejadian di pojok arena yang pemain tidak lihat.

Slow-motion adalah **umpan balik** — ia ada supaya momen *pemain* terasa
mendarat. Dipakai untuk kejadian NPC di luar perhatian, ia terbaca sebagai
tersendat, bukan hadiah. Ditambahkan `nearMiss.slowOnlyForPlayer: true`.
Percikan dan kilau lokal tetap muncul untuk semua near-miss — yang dicabut
hanya penghentian waktu global. Gate tetap lulus setelahnya (3,37).

Hitungan near-miss pemain dilacak terpisah di `PlaytestLogger.playerNearMisses`,
**sengaja tidak masuk CSV** karena kontrak 14 kolom sudah dikunci.

### Polish visual — diukur, bukan dikira

| Yang diperiksa | Acuan | Sebelum | Sesudah |
|---|---|---|---|
| Kontras teks | WCAG 2.2 SC 1.4.3 (4,5:1 / 3:1) | 38/38 lulus | 38/38 lulus |
| Kontras non-teks | WCAG 2.2 SC 1.4.11 (3:1) | semua lulus | semua lulus |
| Ukuran font terkecil | Material 3 label-small 11sp; Apple HIG min 11pt | **7 px** | **10 px** |
| Target sentuh | Apple HIG 44pt; WCAG 2.2 SC 2.5.5 | 6 di bawah 44 px | **0** |
| Target sentuh (AA) | WCAG 2.2 SC 2.5.8 (24×24) | 1 gagal (21×32) | **0** |
| Zoom halaman | WCAG 2.2 SC 1.4.4 (Resize Text 200%) | **dikunci** | terbuka |
| Panel jebol | scrollWidth vs clientWidth | — | 0 di 3 breakpoint |
| Label tawanan | lebar teks vs jarak di layar | 49 px teks / 44,7 px jarak | tidak digambar |

Catatan tiap perubahan:

1. **Palet TIDAK diubah.** `tools/benteng-visual-audit.mjs` menguji warna tim
   dan tangga aura di bawah simulasi protanopia/deuteranopia/tritanopia
   (matriks Machado dkk. 2009) dengan ambang CIE76 dE ≥ 20. Semua lulus;
   yang paling tipis `sedang → rendah` di deuteranopia (dE 24,2, kuning dan
   jingga memang saling mendekat) dan warna tim di protanopia (dE 42,3).
   Palet buatan sesi sebelumnya sudah kuat — mengecatnya ulang cuma akan
   merusak yang sudah benar.

2. **Lantai tipografi 10 px / 11 px.** 18 aturan CSS dinaikkan. Sapuan pertama
   melewatkan tiga ukuran karena ditulis sebagai shorthand `font:900 9px …`,
   bukan `font-size:` — ketahuan dari audit DOM, bukan dari membaca CSS.

3. **Zoom dibuka.** `maximum-scale=1,user-scalable=no` melanggar SC 1.4.4.
   Kanvas dan joystick sudah `touch-action:none`, jadi gestur zoom tidak
   mengganggu kendali; tombol diberi `touch-action:manipulation` supaya jeda
   tap-ganda 300 ms tetap hilang.

4. **Area sentuh 44×44 tanpa membesarkan kotak yang terlihat**, lewat `::after`
   yang melebar. Layout sesi sebelumnya sudah pas; yang kurang cuma area
   tangkapnya.

5. **Roster dilebarkan** 105/120/152 → 126/132/140 px karena teks yang lebih
   besar menjebolkannya 4 px, plus ellipsis untuk nama panjang.

6. **Nama tawanan tidak lagi digambar di arena.** Tawanan berjajar 1,2 unit
   dunia ≈ 44,7 px, sementara "Rajawali" selebar 49 px — labelnya menyatu jadi
   "KamuLenteraRajawali". Identitas tawanan sudah terbaca di roster lewat ikon
   rantai; yang perlu dibaca di arena adalah panjang rantai dan letak ujungnya.

### Cara memeriksa ulang

```
npm run sim:benteng      # gate Fase 0
npm run audit:visual     # kontras + buta warna
node --test tests/benteng.test.mjs
```

Audit DOM (ukuran font, target sentuh, panel jebol) dijalankan di browser
terhadap `benteng.html` pada 1280×720, 844×390, dan 640×360.
