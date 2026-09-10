# ADR-0005 — Satu pesan satu kanal — toast hanya cadangan

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Sebelum bubble chat ada, pesan masuk ditampilkan di panel chat **dan** sebagai
toast. Setelah bubble dibangun, pesan yang sama tampil **tiga kali** sekaligus,
dan toast menutupi dunia justru saat pemain sedang menatap orang yang bicara.

## Keputusan

Toast hanya muncul kalau bubble pengirimnya **tidak terlihat**: di luar layar,
di belakang kamera, terlalu jauh, atau belum ada di roster.

Urutannya mengikat: `ucap()` dipanggil dulu — ia sekaligus memproyeksikan bubble
dan menetapkan keterlihatan — baru toast diputuskan dari `bubble.terlihat(id)`.

Prinsip ke depan: **tiap kali menambah kanal tampilan untuk informasi yang sudah
punya kanal, periksa apakah kanal lama masih perlu.** Kanal lama dipertahankan
hanya sebagai jaring pengaman untuk kasus yang kanal baru tidak bisa layani.

## Konsekuensi

### Yang didapat

- Pesan dari orang yang terlihat tidak lagi menutupi dunia.
- Pesan dari orang yang tidak terlihat tetap sampai.

### Yang dibayar

- Keputusan toast bergantung pada keadaan proyeksi bubble. Urutan pemanggilan
  yang terbalik membuatnya salah tanpa error.
- Pemain yang menutup panel chat dan menghadap arah lain bisa melewatkan pesan
  yang bubble-nya sempat terlihat sepersekian detik.

## Alternatif yang ditolak

**Selalu toast.** Ditolak: itu keadaan sebelumnya, dan itulah masalahnya.

**Tidak pernah toast.** Ditolak: pesan dari orang di belakang kamera hilang sama
sekali kalau panel chat tertutup.

## Bukti

`src/core/Game.js`, handler `.on('chat')`. Diverifikasi tiga kasus: pengirim
terlihat -> tanpa toast; pengirim tidak di roster -> toast; pengirim di luar
layar -> toast.
