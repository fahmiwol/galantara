# ADR-0004 — Overlay HTML disembunyikan berdasarkan ukuran di layar, bukan jarak

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Bubble chat dan name-tag adalah elemen HTML yang ditempel ke posisi dunia.
Berbeda dari objek 3D, **ukurannya tidak mengecil dengan jarak**. Pemain 400
unit jauhnya tetap mendapat bubble penuh di atas titik sebesar piksel.

Godaannya menetapkan "jarak maksimum 50 unit". Itu salah karena tidak ikut
berubah saat FOV atau tinggi viewport berubah: di layar tinggi atau FOV sempit,
tokoh yang sama tampak jauh lebih besar.

## Keputusan

Ambangnya diturunkan dari proyeksi perspektifnya sendiri:

```
px_per_unit     = (tinggi_viewport / (2 * tan(fov/2))) / jarak
tinggi_tokoh_px = TINGGI_TOKOH * px_per_unit
sembunyikan bila tinggi_tokoh_px < 24
```

24 px adalah **keputusan keterbacaan**, memakai ukuran target minimum WCAG 2.5.8
sebagai *pembanding besaran* — bukan klaim kepatuhan. SC 2.5.8 mengatur target
interaktif; avatar di sini bukan target klik. Klaim awal saya keliru dan
dikoreksi setelah ditolak review.

## Konsekuensi

### Yang didapat

- Ambangnya menyesuaikan diri: pada 1280x720 fov 45 jatuh di ~67 unit, dan
  bergeser sendiri di layar lain tanpa satu angka pun diubah.
- Berlaku sama untuk name-tag, dan akan berlaku untuk indikator jualan/ngamen.

### Yang dibayar

- Satu `distanceTo` per overlay per frame. Diabaikan untuk jumlah yang ada.
- Sahih hanya untuk kamera perspektif — dijaga `camera.isPerspectiveCamera`.
- Butuh tinggi viewport, dan nilai itu **bisa 0** sebelum layout jadi.
  Lihat ADR-0012.

## Alternatif yang ditolak

**Jarak tetap dalam unit dunia.** Ditolak: benar hanya di satu konfigurasi layar.

**Menskala bubble dengan jarak.** Ditolak: teks 11 px yang diperkecil tidak
terbaca, dan yang diperbesar merusak tata letak HUD.

## Bukti

`src/ui/ChatBubble.js` (`_tempatkan`), `tests/chatBubble.test.mjs`.
Diverifikasi di browser: 13,4 u -> 119,9 px tampil; 84,6 u -> 19,0 px
disembunyikan.
