# ADR-0003 — Keterisian kursi diturunkan dari posisi, bukan state server

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Meja Nongkrong perlu tahu siapa duduk di kursi mana. Cara biasa: server
menyimpan `{socketId -> kursi}` dan menyiarkan perubahannya.

Tapi posisi tiap pemain **sudah** disiarkan lewat `player_move`. Menambah pesan
socket untuk sesuatu yang sudah bisa diturunkan dari data yang ada berarti
menambah state kedua yang bisa tidak sinkron dengan yang pertama.

## Keputusan

Tidak ada state duduk di server. Tiap klien menghitung sendiri pemetaan
pemain-ke-kursi dari posisi yang sudah tersinkron, dengan aturan
**deterministik**: pasangan (pemain, kursi) berjarak terdekat menang lebih dulu,
seri dipatahkan `socketId` yang terurut.

Determinisme bukan bonus — ia **syarat kebenaran**, dan karena itu diuji paling
keras: masukan yang sama dalam urutan apa pun wajib menghasilkan peta yang sama.

Satu invarian geometris harus dijaga: `toleransiKursi x 2` lebih kecil daripada
`jarakKursiTerdekat`. Kalau tidak, satu posisi bisa masuk jangkauan dua kursi
dan hasilnya mulai bergantung urutan masukan.

## Konsekuensi

### Yang didapat

- Nol perubahan protokol. Tidak ada versi pesan baru, tidak ada migrasi.
- Tidak ada state yang bisa basi: peta kursi dihitung ulang tiap frame dari
  kebenaran yang sama yang menggerakkan avatar.
- Pemain yang putus koneksi otomatis mengosongkan kursinya. Tidak perlu timeout
  atau pembersihan.

### Yang dibayar

- Determinisme jadi tanggung jawab selamanya. Mengubah letak kursi atau
  toleransi tanpa memeriksa invariannya merusaknya **secara senyap** — dua
  pemain melihat orang yang sama di kursi berbeda, tanpa satu pun error.
- Tidak bisa dipakai untuk apa pun yang butuh otoritas server (kursi berbayar,
  reservasi).
- Toleransi kursi terikat geometri meja. Menaruh dua kursi di satu sisi memaksa
  toleransi turun 0,45 ke 0,34 m.

## Alternatif yang ditolak

**State duduk di server.** Ditolak untuk v1: menambah protokol untuk data
turunan. Akan dibutuhkan begitu duduk punya konsekuensi ekonomi.

**Klaim kursi lewat pesan klien.** Ditolak: itu state server dengan langkah
tambahan, plus balapan antar klien.

## Bukti

`src/world/MejaNongkrong.js` (`hitungKursi`), `tests/mejaNongkrong.test.mjs`
(15 uji). Yang menjaga keputusan ini: *"urutan masukan tidak mengubah hasil"*
dan *"meja 4 kursi: jangkauan kursi tidak saling tumpang tindih"*.
