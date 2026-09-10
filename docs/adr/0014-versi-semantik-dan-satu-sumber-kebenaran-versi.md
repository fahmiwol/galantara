# ADR-0014 — Versi semantik dan satu sumber kebenaran versi

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

`package.json` menyebut `0.5.1` sementara `CHANGELOG.md` sudah sampai `v0.7.2`
dan punya blok `[Unreleased]`. Dua angka, dua kebenaran, dan tidak ada yang
memberi tahu kalau keduanya menyimpang.

## Keputusan

**`package.json` adalah sumber kebenaran versi.** CHANGELOG mencatatnya, tidak
menetapkannya.

Semantik selama pra-1.0:

- **MINOR** (`0.x.0`) — fitur pemain baru, atau perubahan cara dunia dibaca.
- **PATCH** (`0.x.y`) — perbaikan, polish, dokumentasi, perkakas.
- **MAJOR** ditahan di `0` sampai ekonomi dan moderasi ada. Menaikkannya ke 1.0
  sebelum itu akan menjanjikan kestabilan yang tidak dimiliki.

Versi dinaikkan ke **0.8.0**: bubble chat, Meja Nongkrong, dan vendoring seluruh
pustaka klien semuanya mengubah apa yang pemain lihat dan bagaimana proyek ini
dijalankan.

## Konsekuensi

### Yang didapat

- Satu angka yang bisa dipercaya.
- Blok `[Unreleased]` punya arti: apa yang belum masuk rilis bernomor.

### Yang dibayar

- Harus diingat menaikkannya. Tidak ada otomasi; menambahkannya sekarang berarti
  menambah CI untuk proyek yang CI-nya baru saja dimatikan.

## Alternatif yang ditolak

**CHANGELOG sebagai sumber kebenaran.** Ditolak: `package.json` yang dibaca
alat, jadi ia yang harus benar.

**Tanggal sebagai versi.** Ditolak: tidak menyampaikan besar perubahan.

## Bukti

`package.json`, `CHANGELOG.md`.
