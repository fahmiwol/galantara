# ADR-0011 — Jarak warna Delta-E menggantikan kontras luminansi untuk keterbacaan 3D

**Status:** Diterima — *instrumennya* dikoreksi ADR-0017: Delta-E dihitung dari piksel yang dirender, bukan dari warna material
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Saat mengaudit keterbacaan Benteng, saya memakai rasio kontras luminansi WCAG
(SC 1.4.3) untuk menilai apakah warna tim terbaca di atas tanah arena.

Alat ukurnya salah. Hijau lama mencetak kontras luminansi **1,14** — jauh di
bawah ambang 3:1 — padahal ia terbaca dengan sangat baik. Kontras luminansi
mengukur beda TERANG; yang membuat permukaan 3D berwarna terbaca di atas latar
berwarna adalah beda **RONA**.

## Keputusan

Keterbacaan warna di dunia 3D dinilai dengan **CIE76 Delta-E\*ab di ruang
CIELAB**, bukan rasio kontras luminansi. Ambang kerja: **Delta-E >= 20**,
diperiksa juga di bawah simulasi protanopia, deuteranopia, dan tritanopia
memakai matriks Machado, Oliveira & Fernandes (2009).

Kontras luminansi WCAG tetap dipakai untuk **teks pada latar solid** — di sana
ia memang alat yang benar.

## Konsekuensi

### Yang didapat

- Keputusan warna punya dasar yang cocok dengan pertanyaannya.
- Hijau lama yang tadinya "gagal" ternyata Delta-E 48,1 — terbaca, dan angkanya
  menjelaskan kenapa.
- Buta warna ikut terperiksa, bukan diasumsikan.

### Yang dibayar

- Dua alat ukur untuk dua pertanyaan; orang bisa memakai yang salah lagi.
  Diredam dengan menulis alasannya di `tools/benteng-visual-audit.mjs`.
- Delta-E 20 adalah ambang yang dipilih, bukan standar. Dipertahankan sebagai
  ambang kerja, bukan diklaim sebagai kepatuhan.

## Alternatif yang ditolak

**Kontras luminansi WCAG untuk semuanya.** Ditolak: menghasilkan vonis yang
bertentangan dengan apa yang jelas terlihat mata.

**Menilai dengan mata saja.** Ditolak: tidak menangkap buta warna, dan tidak
bisa dijalankan ulang setelah palet berubah.

## Bukti

`tools/benteng-visual-audit.mjs` (`npm run audit:visual`),
`docs/BENTENG_BALANCE_LOG.md`.
