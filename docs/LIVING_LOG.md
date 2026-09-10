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
