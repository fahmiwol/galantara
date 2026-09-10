# ADR-0009 — Atap sengkuap, menolak arahan pelana dangkal

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Arahan seni (gpt-5.6-sol) meminta atap **pelana dangkal** untuk mengubah rangka
dua tiang + palang dari "gawang" jadi "warung": nok 2,12 m di atas bibir 1,92 m,
kemiringan 20 derajat.

Dicoba dua kali. Dari jarak kamera Galantara kemiringan itu **tidak terbaca sama
sekali**, dan atapnya tampak sebagai papan nama mendatar — persis siluet yang
sedang dihindari.

## Keputusan

Diganti **sengkuap** (satu bidang miring): tepi belakang 2,30 m di tiang yang
sudah ada, menjulur 1,95 m ke depan turun ke 1,72 m, dengan empat kasau terlihat
di bawahnya.

Tiga alasan, ketiganya bisa diperiksa:

1. Dari kamera atas-serong hanya **satu** bidang atap yang terlihat, jadi pelana
   tidak memberi keuntungan siluet apa pun atas sengkuap.
2. Pelana menuntut tiang depan supaya tidak melayang, dan tiang depan berdiri
   **tepat di tempat orang duduk**.
3. Sengkuap adalah bentuk paling lazim untuk warung dan kaki lima. Ini bukan
   penyederhanaan, melainkan yang benar.

## Konsekuensi

### Yang didapat

- Siluetnya terbaca sebagai warung, diverifikasi lewat render.
- Ditopang dua tiang yang sudah ada; tidak ada tiang di jalur duduk.
- Kasau memberi struktur di bawah atap, jadi ia tidak membaca sebagai lempeng.

### Yang dibayar

- Menolak arahan seni yang diminta sendiri berarti memikul beban pembuktian.
  Alasannya ditulis di kode dan di sini supaya bisa dibantah, bukan disembunyikan.
- Sengkuap kurang megah dibanding pelana. Untuk landmark yang lebih besar nanti,
  keputusan ini tidak berlaku otomatis.

## Alternatif yang ditolak

**Pelana dangkal 20 derajat** — dicoba, tidak terbaca.

**Pelana curam 46 derajat** — dicoba, terbaca sebagai papan besar karena hanya
satu bidangnya yang terlihat, dan tetap butuh tiang depan.

**Papan nama atau gantungan sachet** — lebih murah, tapi siluet dasarnya tetap
gawang. Ini penilaian art director-nya sendiri dan saya setuju.

## Bukti

`src/world/MejaNongkrong.js` (`_pasangAtap`, alasannya di komentar). Empat
putaran render tersimpan sebagai bukti perbandingan selama sesi 2026-09-10.
