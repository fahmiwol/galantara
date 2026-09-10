# Handoff GPT → Claude — polish kecil, 10 September 2026

## Titik aman

Permintaan Fahmi: polish/optimasi terakhir secukupnya, tuntaskan dan berhenti
di checkpoint aman. **Tidak memulai Meja Nongkrong**, tidak mengubah aturan
Benteng, tidak menyentuh kredensial, tidak push atau menjalankan deployment.

- Checkout aktif: **C:\galantara**. Root lama C:\KVM8-BACKUP\galantara tidak ada.
- Baseline bersih pada commit **50bbebc**, sesudah dua polish bubble Claude
  (penjepitan/tumpukan dan ekor). Baseline suite ternyata **38/38**, bukan 34
  seperti handoff terdahulu; diverifikasi sebelum edit.
- Perubahan produksi hanya **src/ui/ChatBubble.js** dan
  **src/multiplayer/RemotePlayers.js**. Sisanya tes/dokumentasi.
- Perubahan ini disiapkan sebagai checkpoint lokal. Jangan push otomatis:
  push main memicu workflow deploy. Tidak ada pekerjaan fitur setengah jadi.

## Yang dituntaskan

1. **Cache ukuran bubble setelah resize.** CSS memakai max-width berbasis vw,
   tetapi cache sebelumnya tidak dibatalkan saat lebar layar berubah. Ukuran
   230 px tetap dipakai meski kotak sudah membungkus menjadi 134 px pada tes.
   Cache kini mengikuti viewport dan invalidasi ResizeObserver (termasuk font
   atau layout yang baru selesai). Observer dilepas dari elemen saat dibuang.
2. **Biaya update overlay.** Snapshot ukuran layar sekali untuk semua bubble;
   pembacaan ukuran kotak dibatch sebelum penulisan gaya. Gaya/ekor yang tidak
   berubah tidak ditulis ulang. Tidak mengklaim kenaikan FPS tanpa benchmark.
3. **Daur hidup animasi.** rAF yang terlambat tidak menambahkan kelas `on` ke
   bubble yang telah dibuang atau sedang keluar.
4. **Label pemain remote.** Satu Vector3 dipakai ulang, menghapus clone per
   pemain per frame dan array Object.values tiap tick. Proyeksi memakai ukuran
   lapisan label; near/far plane dan posisi di luar viewport disaring. Tidak
   mengubah interpolasi gerak ataupun logika Socket.io.

## Bukti verifikasi

Jalankan dari C:\galantara (Node v22 di mesin ini):

```powershell
npm test
npm audit --prefix galantara-server --omit=dev
git diff --check
```

- **45/45 pass**: Benteng 14, chatBubble 21, dailyChallenge 7, remotePlayers 3.
- Lima regresi baru gagal pada kode baseline lalu lulus sesudah patch. Tes
  tambahan memastikan observer dilepas dan geometry/material remote masing-
  masing di-dispose tepat sekali, termasuk remove berulang.
- Tes remotePlayers memakai matematika/lifecycle **Three.js r128 asli**, bukan
  WebGL: dependency server perlu tersedia (`npm ci --prefix galantara-server`
  pada clone baru). Tidak menambahkan paket dependency.
- Audit dependency: **0 vulnerabilities** pada saat pemeriksaan.
- `git diff --check`: lulus. Peringatan konversi LF→CRLF dari Git bukan error.
- Browser lokal Oola berhasil dimuat. Dua pesan sintetis pada lapisan QA
  terisolasi diperiksa di **1280×720** dan **390×844**, lalu di-resize balik.
  Pada mobile cache/DOM cocok: **164×58** dan **109×28**, kedua bubble terlihat
  dan tidak bertumpuk. Tidak mengirim pesan ke server atau mengubah akun.
- Log browser selama smoke test: tidak ada warning/error yang tertangkap.
- Link Oola → Benteng memuat onboarding; tidak menjalankan match baru supaya
  data gate playtest manusia tidak tercampur hasil pengujian UI otomatis.
- Fixture QA dibuang, override viewport dikembalikan. Server lokal existing
  di 127.0.0.1:4000 tidak direstart dan tidak diganti konfigurasinya.

### Temuan instrumen yang patut diingat

Tepat setelah override viewport, ukuran layout bisa sementara **positif tetapi
salah**, bukan hanya nol: pembacaan pertama pernah 30×890 lalu menjadi 164×58.
Pemisahan panggilan observasi mengungkap ini. Karena itu menunggu nilai >0 saja
tidak cukup untuk cache permanen; ResizeObserver membatalkan cache ketika
layout benar-benar berubah. Jangan menyimpulkan FPS/gameplay dari rAF pane.

## Yang sengaja tetap terbuka

- **Meja Nongkrong v1**: empat tempat duduk, Ikut nimbrung, indikator okupansi,
  chat radius meja. Tetap prioritas sesi berikutnya; belum diimplementasikan.
- 20 match **manusia** Benteng (10 A/10 B) dan metrik tawanan menganggur belum
  tervalidasi. Tidak diubah atau dianggap selesai oleh 45 tes kode.
- Kerapian overlay saat kerumunan sangat padat/dekat tepi atas masih memakai
  batas geser 120 px milik Claude. Tidak menjanjikan bebas overlap untuk jumlah
  bubble tak terbatas. Ekor belum berupa garis panjang penghubung vertikal.
- Deploy SSH timeout dan rotasi kunci Gemini mengikuti handoff Claude; **tidak
  diperiksa ulang** pada sesi polish ini. Jangan menyebut sudah diperbaiki.
- Tidak membaca korpus mentah/isi token. Pencatatan Brain hanya fakta teknis
  terverifikasi tanpa kredensial. Tidak menjalankan model berbayar tambahan.

## Lanjut dengan aman

1. Pilih workspace Bridge **C:\galantara**, periksa status/inbox/claim terbaru.
2. Baca handoff ini dan handoff Claude, cek `git status`, jalankan `npm test`.
3. Mulai Meja Nongkrong sebagai slice terpisah setelah Fahmi memilih lanjut.
   Jangan campurkan pembenahan VPS/korpus kredensial dengan fitur sosial ini.
