# BACKLOG — Galantara

> Disusun 10 Sep 2026. Diturunkan dari PRD, dari kode yang benar-benar ada, dan
> dari audit `docs/GALANATARA_CURRENT_STATE.md` — bukan dari daftar keinginan.
>
> Kalau berkas ini bertentangan dengan `git log` atau `node tests/*.mjs`,
> **yang di repo yang benar**.

---

## Cara membaca

| Tanda | Artinya |
| --- | --- |
| **STUB** | Ada tombolnya, ada zonanya, tapi menekan hanya memunculkan toast "menyusul". Pemain sudah dijanjikan sesuatu. |
| **KOSONG** | Belum ada apa-apa. Tidak ada janji yang dilanggar. |
| **DITUNDA** | Sengaja belum dikerjakan, alasannya ditulis. Bukan kelupaan. |
| **FAHMI** | Hanya dia yang bisa menutupnya. |

Prioritas dinilai dari satu pertanyaan: **apa yang membuat orang bertahan dan
kembali?** Bukan dari mana yang paling menarik dibangun.

---

## Temuan yang membentuk backlog ini

Enam Spot sudah `status: 'live'` dan semuanya sudah dibangun 3D-nya. Tetapi
**sepuluh titik interaksi di dalamnya hanya memunculkan toast "menyusul"**:

| Spot | Interaksi yang masih toast |
| --- | --- |
| Bogor | Warung katalog · Mode duduk |
| Braga | Duduk di trotoar + proximity chat · Galeri karya warga |
| Kuta | Sewa papan + mini-game selancar |
| Losari | Jajan pisang epe |
| Malioboro | Duduk lesehan + proximity chat · Katalog batik |
| Monas | Mode foto + pose · Katalog oleh-oleh |

Ditambah tiga di HUD utama: Audio, Private Spot, Buat Spot Baru
(`src/core/Game.js`).

> **Ini masalah yang berbeda dari "fitur belum ada".** Pemain sudah berjalan ke
> sana dan menekan `[F]`. Janji yang tidak ditepati lebih merusak kepercayaan
> daripada tempat yang jelas-jelas kosong. Menutup stub lebih berharga daripada
> menambah Spot ketujuh.

Kabar baiknya: **dua dari sepuluh stub itu sekarang bisa ditutup nyaris tanpa
kerja baru**, karena `MejaNongkrong` sudah jadi dan bisa dipakai ulang.

---

## P0 — Menutup janji yang sudah terlanjur dibuat

### ~~P0.1 · Pasang Meja Nongkrong di Braga dan Malioboro~~ — **SELESAI 11 Sep**
Commit `129fde5`. Malioboro dapat tikar pandan dari Rupa3D (GLB 348 segitiga)
dengan tiga social node lesehan; Braga dapat empat meja kafe yang bisa diduduki.
Detail di bawah ini dipertahankan sebagai catatan alasannya.

<details><summary>Rencana aslinya</summary>

**P0.1 · Pasang Meja Nongkrong di Braga dan Malioboro — STUB**
Dua stub berbunyi "Duduk lesehan + proximity chat" dan "Duduk di trotoar +
proximity chat". `src/world/MejaNongkrong.js` sudah melakukan bagian duduknya.
Braga bahkan **Spot nongkrong menurut riset kita sendiri**
(`docs/RISET_3D_NUSANTARA.md` §14).

Yang perlu: panggil `new MejaNongkrong(...)` di kedua runtime, daftarkan
`interactionVolumes` dan `getLampu()`, hapus toastnya. Malioboro perlu varian
**lesehan** (tikar, tanpa dingklik) — parameter, bukan modul baru.

*Biaya kecil, menutup dua janji, dan langsung memberi Braga alasan untuk
dikunjungi selain melihat-lihat.*

</details>

### ~~P0.2 · Mode duduk Bogor~~ — **SELESAI 11 Sep**
Dua bangku Bogor jadi social node bergaya `bangku`: geometri sosial yang
BERBEDA dari meja — orang duduk bersebelahan menghadap arah yang sama, bukan
berhadapan.

> **Seluruh stub duduk kini tertutup.** Yang tersisa di Spot hanya katalog
> toko (P2.2) dan galeri/foto/selancar, dan semuanya menunggu ekonomi nyata.

### P0.3 · Gate playtest Benteng — FAHMI
20 match manusia (10 varian A, 10 varian B), ±1 jam. Semua perkakas siap;
progresnya tampil di layar hasil dan tersimpan lintas reload.

⚠️ Metrik **"tawanan menganggur ≤ 25 detik" statusnya BELUM TERVALIDASI, bukan
lulus** — lihat `docs/SESSION_2026-09-10_TEMUAN.md` §9. Semua policy skrip
menekan tarik-rantai sehingga metriknya tidak pernah bisa selain nol. Sesi
browser dengan pemain yang benar-benar tertawan mencatat 115,87 detik.

*Tanpa ini, klaim "Benteng seimbang" tidak punya dasar manusia.*

---

## P1 — Budaya berkumpul (yang membuat orang bertahan)

Urutan ini diambil dari arahan desain GPT-5.6 (10 Sep), dan alasannya sama
dengan alasan Meja Nongkrong dibangun lebih dulu: **mengubah orang yang
kebetulan berdekatan menjadi kelompok dengan batas sosial yang jelas.**

### P1.1 · Bahasa tubuh cepat — KOSONG
Menu radial: salam, angguk, dadah, ketawa, geser memberi tempat, duduk lesehan.
Di ponsel — tempat Galantara sebenarnya dimainkan — mengetik itu mahal; gestur
tidak.

**Ukur:** pemakaian per sesi, dan persentase gestur yang dibalas dalam 10 detik.
Angka kedua yang penting: gestur yang tidak pernah dibalas berarti tidak
terlihat, bukan tidak disukai.

### P1.2 · Balasan cepat Indonesia — KOSONG
Deretan frasa di atas kolom chat: "Monggo", "Ikut nimbrung ya", "Gas",
"Makasih", "Permisi", plus slot lokal per Spot. **Tetap sediakan teks bebas** —
kalau semua orang hanya bisa memilih dari daftar, dunia ini jadi karikatur.

**Ukur:** rasio pesan preset vs ketik bebas.

### P1.3 · Chat radius meja — KOSONG (butuh server)
Sengaja tidak dipalsukan saat Meja Nongkrong dibangun. Chat sekarang disiarkan
server ke seluruh room; membuatnya per-meja **butuh perubahan
`galantara-server/index.js`**, bukan trik klien.

### P1.4 · Aksi sosial bersama di warung — KOSONG
Pesan teh/kopi/gorengan, taruh di meja, **Tawari teman**. Ini juga jembatan
alami ke ekonomi koin (P2) tanpa harus membangun toko penuh dulu.

---

### ~~P1.5 · Kolisi di enam Spot~~ — **SELESAI 16 Sep**
Keenam Spot menyatakan tanah, batas, dan collider-nya sendiri (Bogor 38, Braga
39, Kuta 27, Losari 17 + 18 dari GLB, Malioboro 21, Monas 41), masing-masing
dengan uji `tests/fisikaSpot-*.test.mjs`. GLB manifest mendapat collider dari
`<aset>.collider.json`. Catatan asli di bawah dipertahankan.

<details><summary>Catatan asli</summary>

### P1.5 · Kolisi di enam Spot — STUB bawaan
Oola lengkap sejak 15 Sep (62 collider, ADR-0015/0016). Enam Spot lain baru
memakai **tanah dan batas BAWAAN** dari `Game._pasangFisikaBawaanSpot`: lantai
datar dan cincin 17 m, sama dengan perilaku lama. Artinya bangunan, kios, dan
monumen masih bisa ditembus, dan Spot jalanan (Malioboro, Braga, Kuta, Losari)
masih bisa dijalani di luar jalannya.

Tiap Spot perlu: `runtime.fisikaTanah = true`, tanah sesuai bentuknya
(`dindingPersegi` untuk jalan/pantai/anjungan, `cincinTepi` untuk alun-alun),
dan collider tiap bangunan di sebelah mesh-nya. Meja nongkrong Bogor, Braga,
dan Malioboro sudah punya collider. Uji yang harus ditambah: titik muncul tiap
Spot bebas, dan tidak ada arah keluar area jalan.

</details>

### P1.6 · Suasana betah per Spot — brief ADA, bentroknya DIPUTUSKAN 16 Sep
Sebelum membangun apa pun dari brief, baca `docs/brief/suasana/KEPUTUSAN.md`:
anggaran total per Spot (≤ 20.000 segitiga, ≤ 150 draw call, ≤ 3 PointLight,
diukur `tools/anggaran-spot.mjs`), keputusan atas delapan bentrok, dan cacat
Braga/Kuta yang harus diperbaiki lebih dulu. Oola hari ini 153 draw call.
Sudah: Oola (bangku lempeng dihapus, bunga jadi 3 rumpun, pohon dan Dev Hub
diredam, halo diam) dan kalibrasi cahaya dunia (ADR-0017). Belum: enam Spot,
panel label Dev Hub/portal, dan elemen bersegitiga dari tabel brief.
`docs/brief/suasana/*.md` (gpt-5.6-sol, 15 Sep): cerita tempat, suasana, dan
tabel elemen 3D berangka untuk ketujuh Spot. Temuan yang bisa langsung
dikerjakan tanpa geometri baru:
- **Malioboro membuat 10 PointLight** — di atas batas sehat ponsel (≤ 3).
  Pertahankan 3, sisanya emissive saja.
- **Dev Hub Oola** memakai neon `#00FF88` di kotak gelap — memutus palet
  gading-emas-lavender.
- Prop Oola disebar hampir merata di tepi pulau — terbaca sebagai katalog aset.
Sintesis lintas Spot (kit prop bersama + urutan bangun) di
`docs/brief/suasana/SINTESIS.md` kalau sudah jadi.

### P1.7 · Sinkron tinggi kaki — KOSONG
Fisika membuat pemain naik anak tangga dan terasering, tapi `player_move` hanya
membawa x/z. Pemain lain melihat semua orang di y = 0. Kecil sekarang (Oola
hampir datar), nyata begitu rumah panggung dan terasering dipakai.

## P2 — Ekonomi (PRD BAB 6)

### P2.1 · Mighan Coin end-to-end — KOSONG
HUD sudah menampilkan `0/500`, tapi angkanya belum berarti apa-apa.
`src/data/dailyChallenge.js` sengaja dibangun **tanpa koin** dan alasannya
ditulis di kepala berkasnya: memberi hadiah koin yang tidak nyata mengajari
pemain bahwa mata uangnya tidak berarti. Slot `reward` sudah disiapkan.

Butuh: ledger (BAB 6.3), konversi antar tier (6.2), top-up. **Ini pekerjaan
server, bukan klien.**

### P2.2 · Katalog toko — STUB ×4
Bogor (warung), Malioboro (batik), Monas (oleh-oleh), Losari (pisang epe).
Semuanya menunggu P2.1; membangun katalog sebelum koin berarti hanya
memindahkan janji kosong ke tempat yang lebih dalam.

### P2.3 · Lepas dari Supabase — KOSONG

Lahir dari ADR-0010. Setelah semua pustaka klien di-vendor, **Supabase adalah
satu-satunya layanan komersial yang tersisa di runtime**. Pustakanya sudah
lokal; layanannya tidak.

Yang menahannya jadi masalah kecil: **dunia jalan penuh sebagai tamu tanpa
Supabase** — jalan-jalan, multiplayer, Benteng, Spot, meja nongkrong. Yang butuh
Supabase hanya login, chat, dan preferensi avatar.

Jalur keluar paling masuk akal: **PostgREST + GoTrue self-hosted**. Supabase
memang lapisan di atas keduanya, jadi bentuk APInya tidak berubah drastis.
Butuh server — jadi ini menunggu hal yang sama dengan deploy.

---

## P0.5 — MEMBLOKIR peluncuran publik: keselamatan

Ditambahkan 11 Sep setelah pertanyaan "kapan launching, harus ramah anak".
Analisis lengkap: **[KESIAPAN_PELUNCURAN.md](KESIAPAN_PELUNCURAN.md)**.

Chat sekarang **terbuka, tanpa saring, tanpa lapor, tanpa blokir, tanpa gerbang
umur**. Ini satu-satunya butir di seluruh backlog yang **memblokir, bukan
menunda** — kalau anak-anak masuk ke keadaan ini dan sesuatu terjadi, yang rusak
bukan retensi.

| Butuh | Ada? |
| --- | :---: |
| Tombol lapor pemain/pesan | ✗ |
| Blokir pemain | ✗ |
| Bisukan per-pemain | ✗ |
| Saring kata + batas laju chat | ✗ |
| Antrean laporan + jejak audit admin | ✗ |
| Gerbang umur 13+ | ✗ |
| ToS + kebijakan privasi (UU PDP) | ✗ |

Server sekarang merelai apa pun; batasnya cuma "≤ 100 huruf" dan "tamu tidak
boleh chat", dan tidak ada yang mencatat siapa mengirim apa.

**Rekomendasi:** luncurkan sebagai **13+ dengan jujur**, dan jadwalkan "semua
usia" hanya setelah ada anggaran moderator manusia. Mengaku ramah anak tanpa
penopangnya adalah risiko terbesar di proyek ini.

---

## P3 — Yang belum punya dasar sama sekali (PRD)

Diambil dari `docs/GALANATARA_CURRENT_STATE.md` §"Yang masih kosong":

- **Room registry, party, matchmaking** — KOSONG
- **Benteng server-authoritative** — KOSONG. Sekarang seluruhnya klien; artinya
  belum bisa dipercaya untuk kompetisi apa pun.
- **Moderasi sosial, report/block** — KOSONG. ⚠️ Ini bukan fitur tambahan.
  Dunia dengan chat terbuka dan tanpa report adalah kewajiban, bukan produk.
- **Creator publish flow + SDK** — KOSONG (PRD BAB 8)
- **Live Show & Sawer** (BAB 5.4), **Jasa & Negosiasi** (BAB 5.3) — KOSONG
- **Private Spot & Buat Spot Baru** — STUB di HUD
- **Klaim performa Android kelas menengah** — belum boleh dibuat sebelum ada
  build dan playtest di perangkat nyata

---

## Ditunda sadar — jangan diangkat ulang sebagai temuan

| Hal | Alasan |
| --- | --- |
| `sulah_nyanda.glb` belum ditempatkan | Menunggu Spot Banten atau konteks naratif yang jujur. Menaruhnya di Spot lain berarti berbohong soal asalnya. |
| Kunci Gemini di korpus omiga tidak dirotasi | Keputusan Fahmi 10 Sep: korpusnya tidak pernah meninggalkan laptopnya. Ditinjau ulang **hanya** kalau korpus dipindah ke VPS/dibagi, atau kuncinya diganti yang bernilai lebih tinggi. |
| Deploy CI dimatikan | Server ADA (VPS-2, SSH port 2222) — alasan "belum ada server" dikoreksi ADR-0018. Tetap mati: jalur yang berlaku `tools/deploy-galantara.sh`; menyalakan CI = kunci server bersama di GitHub Secrets, keputusan Fahmi. |
| sRGB + ACES tone mapping | Pernah dicoba dan dibalik: materi dan lampu disetel tanpa itu, jadi menyalakannya memucatkan seluruh dunia. Satu paket perubahan, bukan satu baris. |
| Koin di daily challenge | Sengaja tanpa koin sampai P2.1 nyata. |

---

## Alat & infrastruktur

| Hal | Status |
| --- | --- |
| Server deploy | **Live sejak 16 Sep 2026** (`dfe86d2`, pertama sejak 13 April). VPS-2 `187.77.116.139`, SSH port 2222, web root `/www/wwwroot/galantara.io`. Deploy: `bash tools/deploy-galantara.sh jalankan` — runbook `docs/DEPLOY.md`. Vhost kini `Cache-Control: no-cache` + gzip JS. **Server multiplayer belum dideploy** (produksi masih kode April; protokol klien sama). |
| Codex CLI | **Jalan lagi di 0.154.0** (15 Sep, dipakai untuk tinjauan fisika, mode read-only). `tools/tanya-gpt.mjs` tetap jalur untuk pendapat kedua lewat API; sejak 15 Sep memakai `node:https` dengan batas 20 menit. |
| Rapier | `vendor/rapier3d-compat.0.20.0.js`, dimuat malas. Ukur ulang di ponsel sebelum membuat klaim performa apa pun. |
| Ollama laptop | **Sengaja mati.** Inferensi pindah ke Bmax `192.168.1.78`. Cek dengan `curl .../api/tags`, **bukan `ping`** (ICMP diblokir firewall Bmax). |
| Root repo | Tidak punya lockfile, jadi `npm audit` menolak jalan (`ENOLOCK`). Hanya `galantara-server/` yang bisa diaudit. Layak diperbaiki kalau dependency klien pernah ditambah. |

---

## Kalau harus memilih satu

**Server.**

Bukan fitur. P0.1 dan P0.2 sudah selesai 11 Sep, dan seluruh stub duduk
tertutup — jadi yang paling kurang sekarang bukan lagi hal untuk dilakukan di
dunia, melainkan **orang sungguhan yang melakukannya**.

Server membuka T0 (uji tertutup), dan T0 memberi dua hal yang tidak bisa
didapat dengan cara lain: gate playtest Benteng bisa ditutup dengan pemain
manusia, dan setiap keputusan di backlog ini jadi bisa diambil dari data, bukan
dari dugaan saya.

Setelah itu: **P0.5 keselamatan**, karena ia memblokir semua peluncuran publik.

Menambah Spot ketujuh tidak akan menambah siapa pun yang bertahan — dan sesudah
membaca ulang PRD, menambah Spot buatan tim **berapa pun jumlahnya** juga tidak.
Yang membuat orang kembali adalah konten buatan pemain lain, dan itu T3.
