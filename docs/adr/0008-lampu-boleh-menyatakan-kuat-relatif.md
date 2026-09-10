# ADR-0008 — Lampu boleh menyatakan kuat relatif

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

`DayNight` menyetel intensitas semua lampu dengan satu rumus: `lampGlow * 1.6`.
Semua lampu jadi sama terang.

Untuk Meja Nongkrong itu merusak maksudnya. Rasa hangat titik kumpul datang dari
**satu pusat terang dengan tepi gelap**, bukan dari deretan lampu yang sama
kuatnya — yang terakhir terbaca sebagai penerangan umum.

## Keputusan

Sebuah lampu (dan bohlamnya) boleh menyatakan `userData.kuatRelatif`. `DayNight`
mengalikannya. **Bawaannya 1**, jadi seluruh lampu yang sudah ada tidak berubah.

Meja memakainya: lampu utama 1,0; dua pendamping 0,3.

## Konsekuensi

### Yang didapat

- Komposisi cahaya jadi mungkin tanpa memecah `DayNight` per-Spot.
- Perubahan aditif murni; nol risiko regresi pada 16 lampu yang sudah ada.

### Yang dibayar

- Satu properti lagi yang harus diingat saat membuat lampu baru.
- Tidak menangani warna per lampu. Kalau nanti perlu, itu keputusan terpisah.

## Alternatif yang ditolak

**Intensitas absolut per lampu.** Ditolak: lampu harus tetap ikut siklus hari;
angka absolut akan lepas dari `lampGlow`.

**Grup lampu per-Spot dengan pengali sendiri.** Ditolak: lebih rumit daripada
masalahnya.

## Bukti

`src/world/DayNight.js`, `src/world/MejaNongkrong.js` (`_pasangRangkaLampu`).
