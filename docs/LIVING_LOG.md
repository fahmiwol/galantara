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
