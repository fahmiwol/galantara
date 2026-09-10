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

### P0.1 · Pasang Meja Nongkrong di Braga dan Malioboro — STUB
Dua stub berbunyi "Duduk lesehan + proximity chat" dan "Duduk di trotoar +
proximity chat". `src/world/MejaNongkrong.js` sudah melakukan bagian duduknya.
Braga bahkan **Spot nongkrong menurut riset kita sendiri**
(`docs/RISET_3D_NUSANTARA.md` §14).

Yang perlu: panggil `new MejaNongkrong(...)` di kedua runtime, daftarkan
`interactionVolumes` dan `getLampu()`, hapus toastnya. Malioboro perlu varian
**lesehan** (tikar, tanpa dingklik) — parameter, bukan modul baru.

*Biaya kecil, menutup dua janji, dan langsung memberi Braga alasan untuk
dikunjungi selain melihat-lihat.*

### P0.2 · Mode duduk Bogor — STUB
`BogorSpotRuntime.js` masih memunculkan "Mode duduk — animasi & pose menyusul".
Bangku Bogor sudah punya `InteractionVolume`. Sambungkan ke jalur duduk yang
sama.

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
| Deploy CI dimatikan | Belum ada server. Workflow-nya sudah benar dan sudah diperbaiki (`87f4451`), tinggal dinyalakan. |
| sRGB + ACES tone mapping | Pernah dicoba dan dibalik: materi dan lampu disetel tanpa itu, jadi menyalakannya memucatkan seluruh dunia. Satu paket perubahan, bukan satu baris. |
| Koin di daily challenge | Sengaja tanpa koin sampai P2.1 nyata. |

---

## Alat & infrastruktur

| Hal | Status |
| --- | --- |
| Server deploy | **Belum ada.** Build dan periksa di lokal: `npx serve -p 4000 .` |
| Codex CLI | **Buntu.** Akun ChatGPT hanya punya `gpt-5.6-sol`, dan model itu menuntut CLI lebih baru daripada rilis npm terakhir (0.153.4). **Pakai `tools/tanya-gpt.mjs`** — API langsung tidak kena batasan itu. |
| Ollama laptop | **Sengaja mati.** Inferensi pindah ke Bmax `192.168.1.78`. Cek dengan `curl .../api/tags`, **bukan `ping`** (ICMP diblokir firewall Bmax). |
| Root repo | Tidak punya lockfile, jadi `npm audit` menolak jalan (`ENOLOCK`). Hanya `galantara-server/` yang bisa diaudit. Layak diperbaiki kalau dependency klien pernah ditambah. |

---

## Kalau harus memilih satu

**P0.1 — pasang Meja Nongkrong di Braga dan Malioboro.**

Biayanya paling kecil (modulnya sudah ada dan sudah teruji, 15 uji), menutup
dua janji yang sudah terlanjur dibuat ke pemain, dan memberi dua Spot yang
sekarang cuma pemandangan sebuah alasan untuk berhenti dan tinggal.

Menambah Spot ketujuh tidak akan menambah siapa pun yang bertahan.
