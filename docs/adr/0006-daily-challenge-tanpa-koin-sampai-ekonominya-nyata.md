# ADR-0006 — Daily challenge tanpa koin sampai ekonominya nyata

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

PRD BAB 5.5.1 meminta daily challenge dengan hadiah Mighan Coin. Koinnya belum
end-to-end: HUD menampilkan `0/500` tapi angkanya belum berarti apa-apa.

## Keputusan

Daily challenge dibangun **tanpa koin**. Yang diberikan runtutan (streak) dan
penyelesaian. Slot `reward` disiapkan supaya ekonomi tinggal disambungkan tanpa
menulis ulang.

Alasannya: memberi hadiah koin yang tidak nyata **lebih buruk** daripada tidak
memberi apa-apa — ia mengajari pemain bahwa mata uangnya tidak berarti, dan
pelajaran itu sulit dicabut setelah tertanam.

## Konsekuensi

### Yang didapat

- Loop retensi harian jalan sekarang, tanpa berbohong.
- Ketika koin nyata, hadiahnya punya arti sejak hari pertama.

### Yang dibayar

- Kurang menarik dibanding janji hadiah.
- Kemajuan di `localStorage`, jadi per-browser. Begitu ada akun, `muat()` dan
  `simpan()` pindah ke API dan sisanya tidak berubah.

## Alternatif yang ditolak

**Koin palsu sekarang, ditukar nanti.** Ditolak dengan alasan di atas.

**Tunda daily challenge sampai koin siap.** Ditolak: retensi harian tidak perlu
menunggu ekonomi, dan ekonomi masih jauh.

## Bukti

`src/data/dailyChallenge.js` (alasannya di kepala berkas),
`tests/dailyChallenge.test.mjs` (7 uji).
