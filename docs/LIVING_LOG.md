# LIVING LOG — Galantara

Catatan berjalan. **Bukan** changelog (itu mencatat apa yang dirilis) dan bukan
handoff (itu untuk menyerahkan pekerjaan). Ini mencatat **apa yang dipelajari**,
termasuk yang salah.

Aturan berkas ini:

1. **Yang salah ditulis dengan nama dan angkanya.** Log yang hanya berisi
   keberhasilan tidak berguna bagi siapa pun.
2. **Yang biasa saja ditulis "biasa saja".**
3. Entri baru **di atas**. Yang lama tidak pernah diedit untuk terlihat lebih
   baik — kalau ternyata keliru, ditulis koreksinya sebagai entri baru.

---

## 2026-09-16 · Batas yang dilanggar di hari ia ditulis, dan alat ukur yang menghitung lebih sedikit dari namanya

**Koreksi entri 15 Sep.** Di sana tertulis dingklik "dinaikkan ke 0,60 dan
diberi uji". Itu salah: 0,40 diukur dari DEPAN saja. Agen Braga mendekat dari
arah miring dan kapsul naik 0,50. Saya sapu 32 arah × 5 geseran dari deskriptor
produksi: silinder sempit sekali naik 0,60. Aturannya jadi **benda rendah yang
tidak boleh dinaiki ≥ 0,70 m**. Monas dan Malioboro sempat menyalin alas portal
0,45 yang bisa dinaiki; alas portal sekarang satu deskriptor bersama
(`FISIKA_ALAS_PORTAL`) dan `tests/panjat.test.mjs` menyapu dari deskriptor yang
benar-benar dipakai.

**KEPUTUSAN.md menulis "draw call ≤ 150" dan Oola 153 di hari yang sama.**
Batas di dokumen tidak menghentikan apa pun. `flower_patch` membuat 8 mesh per
petak kecil; sekarang 2 InstancedMesh (warna per instans). Oola 153 → 123.
Dibuktikan tiga cara, bukan satu: posisi 20 bunga dibandingkan dengan versi
lama dari `git show HEAD` (selisih maksimum 1,7e-8 m), menyembunyikan lima petak
di browser menurunkan `renderer.info.render.calls` tepat 10, dan tangkapan
layar. Batasnya sekarang dijaga `tests/anggaranSpot.test.mjs`, yang memanggil
fungsi ukur yang SAMA dengan `tools/anggaran-spot.mjs`, supaya angka dokumen
dan angka uji tidak bisa berbeda definisi.

**Periksa instrumen: "draw call" alat itu hanya pass utama.** Satu bingkai
Oola dari kamera ikhtisar = 139 pass utama + **70 pass bayangan = 209**.
`renderer.info.render.calls` r128 juga tidak menghitung bayangan: `render()`
memanggil `shadowMap.render()` sebelum `info.reset()`. Angka 209 didapat dengan
mematikan `autoReset` selama satu bingkai. Ini ketiga kalinya minggu ini angka
yang tampak resmi ternyata mengukur hal yang lebih sempit dari namanya: warna
(pulau putih, ADR-0017), ambang panjat (satu arah), sekarang draw call. Pass
bayangan belum dianggarkan karena belum ada satu pun angka dari ponsel. Kolom
kaster ditampilkan: Braga 74 dan Kuta 63 paling besar.

**Temuan sampingan:** rumah GLB dari manifest tidak memancarkan bayangan sama
sekali (`AssetLibrary` tidak menyalakan `castShadow`).

**GLB kini punya collider** lewat berkas pendamping `<nama>.collider.json`,
dengan bentuk yang sama dengan usulan kontrak `extras.rupa3d.collider`. Angkanya
dibaca dari batas accessor GLB, bukan dari generatornya. Tangga depan rumah
panggung ternyata tidak bisa didaki (tapak 0,21 m, 55°); uji yang saya tulis
mengharapkan bisa, jadi ujinya yang dikoreksi, bukan collider-nya.

**Laporan "kapsul tenggelam saat snap" tidak tereproduksi.** Pengukuran pertama
saya sendiri tercemar: kapsul berjalan keluar dari lantai uji 30 m lalu jatuh,
dan itu terbaca sebagai tenggelam. Dengan lantai 80 m: 0 dari 10.800 langkah.

**Dicatat, belum diperbaiki:** fasad Braga menghadap portal, bukan jalan. Di
Kuta pasir menutupi laut, tangga gerbang terbalik dan melayang, kelapa condong
sejajar pantai, dan kursinya tanpa kaki.

**Yang dibayar:** uji anggaran membangun tujuh Spot setiap `npm test`
(+0,5 detik). Instansi membuat petak bunga tidak bisa lagi diubah per mesh
lewat inspektor; untuk benda sebesar telapak tangan itu harga yang wajar.

---

## 2026-09-15 · Enam agen, enam Spot — dan dua temuan yang lebih besar dari Spot-nya

Collider enam Spot dikerjakan paralel oleh enam agen, satu berkas runtime
masing-masing, dengan aturan ADR-0016 dan uji wajib yang sama. Yang paling
berguna bukan collider-nya, tapi dua temuan tentang MESIN yang tidak akan
ketahuan dari Oola:

**Ambang naik nyata 0,40 m** (agen Bogor). Parameter `naikTangga` 0,35, tapi
ujung kapsul bundar masih menaiki benda 0,40. Dingklik warung Oola — yang
collider-nya setinggi dudukan, 0,40 — ternyata bisa dinaiki. Diukur ulang,
benar; dinaikkan ke 0,60 dan diberi uji.

**Tembus dinding sesaat** (agen Malioboro): sampai 9 cm dari ±1,5 juta langkah.
Saya ukur lima nilai `normalNudgeFactor` — dan hasilnya tidak monoton. Di set
lintasan pertama 5e-3 terlihat terbaik; di set kedua 3e-3 jelas terbaik dan
5e-3 kalah. Kalau saya berhenti di set pertama, saya akan memasang nilai yang
salah dengan bukti yang tampak meyakinkan. Dipilih 3e-3 dari dua set, dengan
metrik tersendat dan getar sekaligus.

Satu laporan agen **tidak** tereproduksi (collider basi setelah teleport). Tetap
dipasang pengamannya karena murah, dan komentarnya bilang terus terang bahwa
belum tereproduksi.

Agen Monas menemukan tiga cacat visual dengan mengukur, bukan melihat: atap
rumah kebaya terbalik (tepi luar 3,105 di atas tepi dalam 2,335, sementara
gigi balang digantung di 2,34 — hanya cocok kalau tandanya dibalik), tiang
teras yang tidak menopang apa pun, dan tugu melayang 8 cm. Diperbaiki.

Agen Malioboro mengikuti letak lampu dari brief GPT, lalu mencatat sendiri
bahwa letak itu membuat kedua kios gelap. Saya menyimpang dari brief: cahaya
untuk tempat orang berhenti, bukan untuk ritme hiasan. Uji "lampu bergantian
sisi" diganti uji "tiap titik kumpul ≤ 5 m dari lampu".

**Yang dibayar:** tiap agen menghabiskan 280–360 rb token dan 20–30 menit.
Enam salinan angka alas portal di enam runtime — dipusatkan setelah semua
selesai.

---

## 2026-09-15 · Pulau yang putih — instrumen yang salah selama berminggu-minggu

Saat menilai hasil brief suasana di browser, tanah Oola jam 15.30 tampak nyaris
putih. Saya hampir menganggapnya efek jam emas. Diukur dari framebuffer
(render → `readPixels` di 12 titik tanah → median): **jam 12:00 dan 13:30
`#ffffff`**. Seluruh siang, pulau putih.

Keputusan warna tanah sebelumnya — "#a8d5a2 lolos di semua fase langit, dE 35–85"
— dihitung dari warna MATERIAL. Angka itu benar dan tidak berguna: pemain
melihat material × cahaya. Ini kali kelima di proyek ini alat ukur dipercaya
karena hasilnya cocok dengan dugaan (lihat memori "periksa instrumen dulu").

Dua bug di baliknya, dua-duanya tidak mungkin terlihat dari angka material:
`AmbientLight` 0,6 sebagai variabel lokal di Renderer yang tak pernah disentuh
DayNight, dan kubah langit yang diserahkan ke DayNight sebelum World
membangunnya (undefined → langit macet satu warna).

Perbaikannya bukan menurunkan satu angka. Siklus jadi tabel keyframe; tiap
keyframe dikalibrasi dengan pencarian biner terhadap piksel tanah; cahaya isi
hemisphere mengambil warna langit — tanpa itu jam emas tetap dirender hijau
kebiruan (`#8eb27c`) walau intensitasnya sudah benar. Hasil yang dilihat di
tangkapan layar: siang hijau dengan bayangan, jam emas dengan bayangan panjang,
magrib ungu dengan lampu mulai menyala, malam biru tinta dengan kolam cahaya
di tiap tiang lampu.

**Satu penyimpangan dari brief GPT**, dengan angka: layar Dev Hub `#BFE3D0`
hanya dE 17,4 terhadap badan gadingnya — hilang. Dipakai `#5E8C7A` (43,7).

**Yang biasa saja:** hanya tanah Oola yang dikalibrasi. Prop, avatar, dan tanah
enam Spot lain belum punya angka piksel di tiap fase. Ponsel belum.

---

## 2026-09-15 · Kolisi — empat rancangan saya yang salah, dan satu dari Rupa3D

Tujuan hari ini: pemain tidak lagi menembus dunia, dengan mesin yang sama
dengan Rupa3D. Hasilnya bekerja di browser. Yang lebih berguna dicatat adalah
berapa kali rancangan pertama saya keliru sebelum sampai ke sana.

**1. Dua uji saya salah, mesinnya benar.** Uji pohon mengharapkan pemain
BERHENTI di depan batang; ia meluncur memutarinya — itu perilaku yang benar.
Uji tangga membaca tinggi setelah pemain berjalan 8 m melewati anak tangga 4 m.
Dilacak per langkah sebelum diubah, bukan dilonggarkan.

**2. Batas hull 8.000 titik.** Tepat di ambang convexHull Rapier rusak diam-diam.
Rupa3D memakai 4.096. Ditemukan Codex, bukan saya.

**3. Collider baru tak terlihat sampai `world.step()`.** Rancangan saya
mendaftarkan collider lalu langsung memakai pengendali. Codex menemukannya;
diukur ulang: gerak 2 m menembus dinding baru (2,000 m), setelah satu step
0,580 m. `tools/fisika/langkah-pertama.mjs`.

**4. Pemain didirikan DI ATAS dingklik.** Raycast "cari tanah" mengenai
permukaan dudukan 0,40 m, dan kapsul di atasnya memang bebas. Ditangkap uji;
diperbaiki dengan jendela tinggi terhadap lantai acuan.

**Yang dari Rupa3D: gravitasi saat menapak.** Uji jam gagal dengan cara yang
aneh — jarak IDENTIK di 30, 60, dan 120 fps, tapi 0,18 m kurang dari harapan.
Jamnya benar; ada langkah fisika yang bergerak nol. Dorongan gravitasi 5 mm per
langkah masuk ke kulit offset, lalu tanah terbaca toi = 0 dan seluruh gerak
dibuang. 12 dari 596 langkah. Enam varian diukur (`tools/fisika/ukur-tersendat.mjs`);
tanpa gravitasi saat menapak = 0. Rupa3D kemungkinan besar punya hitch yang
sama; dicatat ke Omiga untuk Rupa3D dan Studio.

**Bug lama yang terbuka oleh pekerjaan ini:** berdiri tidak memindahkan posisi,
jadi klien lain tetap melihat pemain duduk. Dan tombol arah tersangkut saat
jendela kehilangan fokus — terlihat karena pemain berjalan sendiri sampai
menabrak cincin tepi saat verifikasi.

**Keputusan yang saya ambil melawan Codex**, dan alasannya di ADR-0015: gerak
lama tetap jalan selama Rapier dimuat. Codex benar bahwa itu dua jalur gerak;
saya menilai dunia yang tidak bisa dijalani ±9 detik di koneksi lambat lebih
buruk.

**Yang biasa saja:** 62 collider untuk pulau datar tidak butuh mesin fisika 3D.
Rapier dibenarkan oleh Rupa3D dan katalog prop bertangga, bukan oleh Oola.

**Belum:** ponsel, collider bangunan di enam Spot, collider dari GLB, sinkron
tinggi kaki. `npm test` 115/115.

---

## 2026-09-11 · UNIT 5 SELESAI — titik aman untuk Claude

HANDOFF root baru ditautkan dari README; handoff/riset/ADR lama dipertahankan.
Memuat alasan pilihan, lima unit, batas uji, tiga kandidat berurutan, pertanyaan
roadmap publik yang tidak memblokir, petunjuk restart lokal dan jebakan tes/lease.

**Verifikasi akhir:** `npm test` **62/62 pass, 0 skip**; **58 Markdown/36 tautan**
lolos. `node --check` server dan dua tes baru lolos; `git diff --check` lolos.
Tidak ada build step. Versi root, metadata lockfile, README dan CHANGELOG
selaras 0.8.1. Tidak ada fitur baru atau dependency komersial yang ditambahkan.

**Risiko tersisa:** instalasi bersih, auth/voice, multiplayer dua pemain,
ponsel/performa, gate match manusia dan deploy belum diuji sesi ini. Server
lama port 4000 tidak diubah. Batas ini tertulis di HANDOFF, bukan dianggap lulus.
Unit 1–4 sudah commit/push sebelum unit ini; penutupan unit 5 dengan commit/push
akhir dan catatan Brain/mailbox Claude. **Berhenti setelah pendaratan ini.**

---

## 2026-09-11 · Pilihan UNIT 5 — mendarat, bukan membuka pekerjaan baru

Unit 4 sudah push `1e70af5`. Tulis HANDOFF root dan tautkan dari README agar
Claude menemukan konteks terbaru tanpa menimpa handoff lama. Jalankan suite,
pemeriksa tautan, pemeriksaan sintaks dan diff terakhir; commit/push lalu
berhenti. Tidak mengimplementasikan kandidat lanjutan pada unit ini.

---

## 2026-09-11 · UNIT 4 SELESAI — rilis dicatat tanpa klaim berlebih

CHANGELOG 0.8.1 mencatat dua perbaikan, tes, dan batas verifikasi. README kini
menjelaskan server loopback, restart setelah patch, port uji, 62 tes dan skip
jika dependency belum tersedia. **Verifikasi:** `npm test` 62/62 pass, 0 skip;
57 Markdown/31 tautan lolos; `git diff --check` lolos. Tidak ada perubahan
runtime pada unit ini; batas uji tetap sama. Berikutnya hanya handoff akhir.

---

## 2026-09-11 · Pilihan UNIT 4 — catatan rilis yang sesuai bukti

Unit 3 sudah push `cb2025c`. Lengkapi ritual pendaratan dengan CHANGELOG 0.8.1
dan README: URL server loopback, kebutuhan restart proses lama, serta cakupan
tes HTTP versus kontrak deploy. Tidak mengubah dokumen riset/ADR lama atau
mengklaim deploy/fitur baru. Setelah unit ini hanya handoff akhir.

---

## 2026-09-11 · UNIT 3 SELESAI — metadata 0.8.1 selaras

Root package dan metadata paket induk di lockfile server kini **0.8.1**.
Tidak ada dependency baru atau perubahan resolusi. `npm test` **62/62 pass,
0 skip**, 57 Markdown/31 tautan lolos; assertion Node memverifikasi dua versi
sama. Belum menguji instalasi bersih dependency (yang berubah hanya metadata
versi paket link lokal). CHANGELOG/README masih 0.8.0 sampai unit 4 pendaratan.

---

## 2026-09-11 · Pilihan UNIT 3 — versi patch dan metadata paket

Unit 2 sudah push `dcd4f84`. Dua perbaikan selesai; mulai pendaratan.
Menurut ADR-0014, hasil kecil ini menaikkan 0.8.0 ke **0.8.1**, bukan MINOR.
Selaraskan juga metadata paket induk `packages[".."]` dalam lockfile server
yang masih 0.5.1. Tidak mengubah versi/dependency server atau resolusi paket.
Catatan rilis/README menyusul unit 4; unit 5 khusus handoff akhir.

---

## 2026-09-11 · UNIT 2 SELESAI — vendor ikut paket statis

Workflow manual sekarang menyalin seluruh `vendor/` ke URL yang sama, termasuk
font dan lisensi. Komentar pembuka diperjelas: tidak ada trigger push.
Tes kontrak membaca baris rsync aktif, memastikan tujuan mempertahankan path,
dan memeriksa aset dari empat HTML serta font CSS; juga menjaga manual-only.

**Verifikasi:** tes baru merah pada baseline dengan pesan kehilangan
`vendor/three.r128.min.js`, kemudian hijau setelah satu baris rsync ditambahkan.
`npm test` **62/62 pass, 0 skip**; 57 Markdown/31 tautan lolos.
**Belum diuji/risiko:** parser kontrak sengaja hanya mendukung bentuk rsync
satu baris saat ini, bukan parser YAML/shell umum. Tidak menjalankan SSH,
rsync, workflow maupun deploy nyata; belum ada server tujuan. Hasilnya kecil:
menutup paket aset yang pasti tidak lengkap, bukan membuktikan deploy siap.

---

## 2026-09-11 · Pilihan UNIT 2 — paket deploy tidak boleh kehilangan vendor

Unit 1 sudah push `6ba93f0`. Prioritas berikutnya masih perbaikan jalur rusak:
workflow statis belum menyalin `vendor/` yang diperlukan index. Tambahkan
direktori itu dan tes kontrak paket. Tes ini **struktural**, bukan simulasi
SSH/rsync atau bukti deploy sukses. Pemicu tetap manual-only (ADR-0007), tidak
membaca Secrets dan tidak menjalankan workflow. Maksimal tiga file termasuk log.

---

## 2026-09-11 · UNIT 1 SELESAI — boot lokal memakai vendor

Allowlist Express `--local` sekarang menyajikan `vendor/`, tetap menolak
dotfile dan tidak membuka root repo. `GALANTARA_LOCAL_PORT=0` memungkinkan
tes memakai port dari OS; default tetap 4000/loopback. Health melaporkan port
aktual. Tes HTTP menjalankan server sungguhan, memeriksa byte pustaka/font,
halaman/aset utama, serta penolakan berkas internal.

**Verifikasi:** `npm test` **61/61 pass, 0 skip**, 57 Markdown/31 tautan lolos;
`git diff --check` lolos. Smoke browser: Oola tampil, pintu Benteng terbuka,
masuk arena dan kembali ke Oola; tidak ada console error/warning. Proses dan
tab uji ditutup, proses lama port 4000 tidak diubah.

**Belum diuji/risiko:** bukan uji gameplay realtime, multiplayer dua pemain,
auth/voice atau deploy. Server lama perlu dimulai ulang untuk memakai patch.
Tes HTTP memberi skip eksplisit jika dependency server belum dipasang.

**Yang salah:** ekstraktor awal hanya membaca atribut HTML sehingga melewatkan
loader `muat('/vendor/...')`; guard jumlah path menangkapnya, regex diperbaiki.
Bridge berganti sesi: satu patch terlanjur berjalan dalam batch setelah
heartbeat gagal. Edit kemudian dihentikan sampai lease lama kedaluwarsa dan
claim baru berhasil. Jangan batch heartbeat dengan edit tanpa memeriksa hasil;
gunakan lease 600 detik, bukan 1800. Temuan disimpan di Omiga `Lc142aa5037`
dan `L927abfa07d`.

**Penyesuaian batas sesi:** lima unit, tetap maksimal tiga file per unit.
Unit 3 menyelaraskan package + metadata lockfile; unit 4 catatan rilis/README;
unit 5 hanya HANDOFF dan verifikasi akhir. Tidak menambah fitur.

---

## 2026-09-11 · Sesi GPT — Fase 0, STATE SEKARANG

**Sebelum menulis kode:** checkout C:\galantara bersih pada `8e133d0`, sama
dengan origin/main. README, PRD utama v4, rekonsiliasi Benteng/web, rencana
Fase 0, builder v1.3, CHANGELOG, log ini, TODO, BACKLOG, 14 ADR dan handoff
terbaru dibaca; 20 commit terakhir diperiksa. GitHub issue terbuka: **0**
(`gh issue list --repo fahmiwol/galantara --state open`).

**North Star, bukan arah karangan:** PRD §1.1: “Pasar Malam Digital Indonesia
-- Tempat Nongkrong, Jualan, dan Main Bareng.” README: “Pasar malam digital
Indonesia di browser.” Builder §Final Goal: “Build Galantara as a creator
platform, not just a game”. Ini tujuan platform yang bertahap, bukan izin
mengganti runtime atau langsung membuat builder penuh.

**Sudah jadi:** Oola kota kedatangan + enam Spot, guest movement/presence,
bubble chat, Meja Nongkrong di Oola, tantangan harian tanpa koin, Benteng 4v4
bot dan alat playtest, vendor pustaka Oola, dokumentasi ADR. Baseline
`npm test`: **60/60 pass**, 57 Markdown/31 tautan relatif lolos. **Tidak ada
build step** menurut README dan ADR-0001; tidak mengarang perintah build.

**Rusak/tertahan:** pemeriksaan server Express `--local` pada port ephemeral
mereproduksi `/` **200**, tetapi `/vendor/three.r128.min.js`, `/vendor/nunito.css`,
`/vendor/socket.io.4.8.3.min.js`, `/vendor/supabase-js.2.min.js` semuanya **404**.
Direktori vendor belum masuk allowlist server. Workflow rsync juga belum
menyalin vendor, meskipun index memerlukannya. Artinya tes hijau belum menjamin
jalur `npm run dev` bisa membuka dunia. Sepuluh stub interaksi Spot, ekonomi,
moderasi, chat radius meja, dan gate 20 match manusia masih backlog.

**LOCKED:** THREE global r128/tanpa bundler (ADR-0001); kepemilikan resource
tanpa traverse (0002); kursi deterministik turunan posisi (0003); overlay
berdasarkan ukuran layar + toast cadangan (0004–5); daily challenge tanpa koin
palsu (0006); **deploy manual-only sampai ada server** (0007); lampu relatif dan
atap sengkuap (0008–9); vendor lokal dengan pengecualian layanan Supabase dan
analytics produksi (0010); instrumen sesuai objek yang diukur (0011–12);
review API hanya alat opsional, tidak dipakai sesi ini (0013); package.json
sumber versi, PATCH untuk perbaikan (0014). Benteng tetap harness web, tidak
migrasi Unity/Nakama dan tidak menyentuh kontrak CSV.

**Dokumen yang bertentangan:** PRD lama menulis R3F/Fastify/LiveKit dan TODO
April masih menyebut deploy otomatis/VPS. ADR September, README dan kode
menegaskan vanilla Three/Express/WebRTC + manual-only. Arsip lama tidak
ditulis ulang. Bukti server 404 tetap benar apa pun aspirasi platformnya.

**Pilihan sebelum mulai — UNIT 1:** perbaiki allowlist vendor lokal dan tambah
tes HTTP server sungguhan, termasuk batas akses file internal. Prioritas 1
(rusak), lebih defensible daripada P0.1 meja Braga/Malioboro. Port ephemeral
untuk tes tidak boleh mengganggu server/user pada port 4000.

**Batas sesi:** rencana empat unit kecil: (1) server lokal, (2) kelengkapan
vendor di workflow manual, (3) versi/changelog, (4) README/handoff/pendaratan.
Setiap unit maksimal tiga file termasuk log, diverifikasi lalu commit/push.
Tidak memulai fitur baru; push tidak menyalakan deploy sesuai ADR-0007.

---

## 2026-09-11 · Dokumentasi, dan membuat klaim "self-hosted" jadi benar

**Yang dikerjakan:** LICENSE (MIT), README ditulis ulang, `PAPER.md`, 14 ADR,
berkas ini, CHANGELOG dikonsolidasi ke 0.8.0.

**Temuan yang tidak diduga, dan yang paling berharga hari ini.** Sebelum menulis
"self-hosted, tanpa dependency ke API komersial" di README, saya memeriksa
apakah itu benar. **Tidak.** `index.html` memuat lima berkas dari lima domain:
Three.js (cdnjs), Supabase (jsdelivr), Socket.io (cdn.socket.io), Nunito (Google
Fonts), Google Analytics.

Lebih buruk: jalur Three.js menunjuk `/three.min.js` yang **tidak pernah ada di
repo ini**. Komentarnya berbunyi *"self-hosted di VPS, CDN fallback untuk dev
lokal"* — kenyataannya ia **selalu** jatuh ke CDN, dan dev offline tidak pernah
mungkin sejak awal.

Semua di-vendor ke `/vendor/` (1,3 MB). Diverifikasi di browser pada server
bersih: `skripLuar: []`, `linkLuar: []`, 76 prop, 16 lampu. **Nol permintaan
pihak ketiga.**

Dua efek samping yang lebih bernilai daripada niat awalnya:
- Socket.io klien naik 4.7.4 → **4.8.3, sama persis dengan server**. Sebelumnya
  beda versi, satu kelas ketidakcocokan yang gejalanya membingungkan.
- Font hanya subset latin + latin-ext. Bahasa Indonesia tidak memakai cyrillic
  maupun vietnamese.

**Dua kesalahan saya sendiri hari ini:**
1. Menjalankan `npx serve ... | head -20` di latar. `head` menutup pipe setelah
   20 baris dan **membunuh servernya**. Halaman lalu gagal separuh dan saya
   sempat mengira vendoring-nya yang rusak.
2. Heredoc Python untuk menulis 14 ADR gagal karena kutip yang tidak seimbang.
   Diselesaikan dengan menulis generatornya sebagai berkas, bukan menambal
   kuoting shell.

**Yang belum selesai dan disebut jujur:** Supabase tetap layanan komersial.
Pustakanya lokal, layanannya tidak. Dunia jalan penuh sebagai tamu tanpanya —
itu yang membuat pengecualian ini bisa diterima, dan itu yang harus tetap benar.

---

## 2026-09-10 · Meja Nongkrong, dan arah seni yang menolak diri sendiri

**Yang dikerjakan:** bubble chat di atas kepala (PRD 5.1.1), Meja Nongkrong v1,
dua alat baru (`tanya-gpt.mjs`, `penerima-render.mjs`), review silang dengan
GPT-5.6.

**Temuan terbaik hari ini bukan dari saya.** Saya membangun meja nongkrong dan
merasa sudah Indonesia karena menaruh teko gerabah dan memakai palet kayu jati.
Art director (gpt-5.6-sol, diberi render sungguhan) menolaknya:

> *"Kombinasi daun bundar + kaki tengah + dingklik bundar simetris + lampu globe
> adalah bahasa visual set patio/kafe taman. Teko gerabah sendiri belum cukup
> mengubahnya menjadi Indonesia."*

Itu tepat. Yang saya bangun adalah **meja bistro dengan properti Indonesia
ditempelkan**. Perbaikannya semua di bentuk, bukan warna.

Dua hal yang saya kira soal ukuran padahal bukan:
- Meja "tenggelam" bukan karena kecil — ukurannya benar terhadap avatar. Yang
  hilang **wilayah**: tanah terinjak, jalur kedatangan, naungan.
- Empat avatar chibi berkepala besar akan menutup daun meja **berapa pun
  ukurannya**. Solusinya susunan 2+1+1 dengan satu sisi dikosongkan.

**Satu angka arahan seni saya tolak, dan alasannya ditulis** (ADR-0009). Pelana
dangkal 20° tidak terbaca sama sekali dari jarak kamera Galantara; atapnya tampak
sebagai papan nama. Diganti sengkuap.

**Tiga bug yang hanya muncul di meja yang diputar:**
1. Rumus rotasi letak kursi **berlawanan arah dengan Three.js**
   (`x' = x·cos + z·sin`, bukan `x·cos − z·sin`). Di meja Oola yang diputar 45°,
   pemain didudukkan **di sebelah bangkunya**. Saya tidak menebak arahnya —
   dibuktikan terhadap `THREE.Object3D` asli.
2. Koordinat lokal kursi ikut diputar padahal grup mesh-nya juga diputar.
3. Bidang tanah menghadap ke **bawah** (`rotation.x = +π/2`), tidak pernah
   terlihat sama sekali.

**Kesalahan metode, ketiga kalinya hari ini:** review GPT melaporkan "CSS
`.chat-bubble` tidak ada". Salah — tapi bukan salahnya. Regex ekstraksi di skrip
review saya gagal, jadi modelnya benar-benar dikirimi `((tidak ketemu))`. Ia
melapor benar atas masukan yang salah.

**Deploy:** saya menyimpulkan VPS-nya mati dan menulis instruksi memeriksa tiga
hal yang tidak ada. Fahmi mengoreksi: **servernya memang belum ada.**
Infrastruktur yang gagal belum tentu infrastruktur yang rusak.

---

## 2026-09-10 (pagi) · Bubble chat, dan instrumen yang mati

**Kode mati yang hampir jadi mekanisme kedua.** `Avatar.js` punya `showChat()`
dan `updateBubble()` dengan komentar *"Dipanggil tiap frame dari Game.js"*.
`grep` menemukan **nol** pemanggil, dan CSS `.av-bubble` tidak pernah ada.
Komentar yang mengaku "dipanggil dari X" adalah klaim yang bisa diuji dengan
satu `grep`.

**Server sudah lama mengirim `socketId`**, kliennya yang cuma membaca
`{name, msg}` dan menyaring echo dengan cocok-cocokan nama.

**rAF beku.** Tes pertama melaporkan bubble "tidak hilang setelah 3,8 detik".
Diukur: **0 frame dalam 1 detik**, waktu simulasi maju 0,31 detik selama 88
detik halaman terbuka. Fiturnya benar; instrumennya mati.

**Nilai layout bisa 0.** Aturan penyembunyian sempat menyembunyikan *semua*
bubble karena `window.innerHeight` terbaca 0 — chat mati total tanpa satu pun
error. Aturan yang lahir: **nilai yang bisa 0 tidak boleh jadi alasan
menyembunyikan.**

---

## 2026-09-09 · Benteng, dan harness yang mengarang temuan

**Hasil balans** (terukur, `tools/benteng-sim.mjs`):

| | Sebelum | Sesudah |
| --- | ---: | ---: |
| Tim habis | 60% | 2% |
| Median panjang match | 77 dtk | 180 dtk |
| Pulang di bawah muatan kritis | 2,0% | 29,0% |
| Near-miss per match | 0,53 | 3,50 |

**Dua kegagalan instrumen dalam satu hari:**
1. Simulasi deterministik — 30 match ternyata ~15 lintasan berulang. Sapuan
   parameter tampak punya optimum tajam yang sebetulnya artefak.
2. **"Bias 87% ke tim biru"** — karangan harness saya sendiri. Kebijakan kontrol
   berpikir tiap frame (60 Hz) sementara bot tiap 0,5 detik, dan melewati
   `findRoute`. Disamakan → **29:23 dengan 28 seri**.

**Alat ukur yang salah.** Kontras luminansi WCAG memberi hijau lama nilai 1,14 —
"gagal" — padahal ia terbaca dengan sangat baik. ΔE-nya 48,1. Kontras luminansi
mengukur beda terang; yang membuat permukaan berwarna terbaca di atas latar
berwarna adalah beda **rona**.

**Satu gate yang tidak lulus, dan dicatat begitu.** "Tawanan menganggur ≤ 25
detik" selalu terbaca 0,0 detik karena semua policy skrip menarik rantai —
metriknya **tidak pernah bisa selain nol**. Status: **BELUM TERVALIDASI, bukan
lulus.** Sesi browser dengan pemain yang benar-benar tertawan mencatat 115,87
detik.

---

## Pola yang berulang lintas hari

Ditulis di sini karena baru terlihat setelah beberapa hari, bukan dalam satu
sesi.

**Empat kegagalan instrumen, satu bentuk.** Hard link (angka benar sudah tercetak
dan saya buang), simulasi deterministik, bias 87%, rAF beku. Dua di antaranya
**cocok dengan dugaan saya**, dan itu yang membuatnya lolos.

> Sebelum melaporkan hasil ukur — apalagi yang mengejutkan, dan **terutama** yang
> pas dengan dugaan — jalankan satu pemeriksaan bahwa alat ukurnya hidup dan adil.

**Tiga kali "sudah ada" ternyata "setengah jadi".** `Avatar.showChat` tanpa
pemanggil, `/three.min.js` tanpa berkas, `updateBubble` dengan komentar yang
bohong. Semua bisa diuji dengan satu `grep` atau satu `curl`.

**Dua kali saya menulis instruksi perbaikan untuk hal yang tidak ada.** VPS yang
belum pernah ada, dan CSS yang sebenarnya ada tapi tidak terkirim ke reviewer.
Keduanya karena saya tidak memeriksa premisnya sebelum menulis untuk orang lain.
