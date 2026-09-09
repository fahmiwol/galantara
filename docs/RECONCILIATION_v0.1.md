# Rekonsiliasi Galantara × Benteng v0.1

**Tanggal:** 2026-09-08  
**Status:** keputusan implementasi Fase 0

## SELARAS

- Galantara adalah tempat sosial; Benteng dapat menjadi alasan kuat orang datang,
  membentuk room, dan mengajak teman bermain lagi.
- Guest-first cocok dengan prototype tanpa login.
- Filosofi ringan, browser-first, visual procedural, dan tim founder + AI cocok
  dengan arena sederhana tanpa pipeline art mahal.
- `SpotRuntime`, interaction, lifecycle, dan room Socket.io adalah jalur evolusi
  alami setelah prototype offline lolos playtest.
- Kartu Momen Benteng nantinya cocok dengan papan sosial Galantara, tetapi tidak
  masuk Fase 0.
- Sistem Muatan punya identitas visual yang dapat hidup berdampingan dengan gaya
  kampung/pasar malam Nusantara.

## BERTENTANGAN

### Unity 6 LTS vs runtime Web/Three.js

`SPEC_BENTENG_FASE0_v1.1` mengunci Unity 6 LTS, sedangkan repo, skill internal,
deploy, dan builder Galantara mengunci browser + Three.js/data. Memaksakan Unity
sekarang membuat dua runtime, dua pipeline input, dua model deploy, dan membuang
reuse Spot/guest/web.

**Keputusan:** pertahankan **semantik gameplay** SPEC v1.1, tetapi adaptasikan
Fase 0 menjadi **web test harness** tanpa dependency baru. Rendering awal memakai
Canvas 2D agar deterministik, sangat ringan, mudah dites, dan tidak mengotori
scene Oola. Jika lolos gate rasa, renderer dapat dipindah ke Three.js sebagai
`BentengRoomRuntime` tanpa mengubah model aturan.

### “Galanatara adalah platform” vs “Galantara bukan game”

Keduanya tidak perlu dipertentangkan. Galantara adalah platform/tempat; Benteng
adalah game unggulan di dalamnya. Platform tanpa aktivitas terasa kosong, dan
game tanpa komunitas menghadapi masalah matchmaking. Keduanya saling mengisi.

### Downtown/Nakama vs Oola/Socket.io yang sudah ada

SPEC platform mengusulkan Nakama karena ditulis tanpa akses repo. Repo sudah
memiliki Oola, Socket.io rooms, auth direction, Spot lifecycle, dan deploy nyata.

**Keputusan:** jangan menambah Nakama pada Fase 0. Evaluasi backend otoritatif
hanya setelah prototype seru dan kebutuhan room multiplayer terukur.

### GLC/GLP vs Mighan Coin

Roadmap publik Tiranyx menyebut GLC/GLP, sedangkan repo menggunakan empat tier
Mighan Coin dan implementasinya belum end-to-end.

**Keputusan:** ekonomi keluar dari Fase 0. Jangan mengunci nama/token baru sampai
ledger, regulasi, dan positioning ekonomi direkonsiliasi terpisah.

## BARU

- Sistem Muatan 0–100, aura terbaca, dan laju luruh berbasis jarak dari benteng.
- Resolusi tag tunggal berdasarkan Muatan, termasuk hasil seri/terpental.
- Penjara, rantai tawanan, Tarik Rantai, dan penyelamatan massal.
- Dua model kecepatan A/B: “Sekarat” dan “Kepepet”.
- Near-miss, semburan keluar benteng, dan instrumentasi CSV 14 kolom.
- 4v4 offline dengan tujuh bot dan tiga profil agresivitas.
- Tiga kondisi menang: capture, total tawan, dan waktu.

## Batas Fase 0

**Masuk:** satu arena, 4v4 bot, Muatan, aura, tag, penjara/rantai, Tarik
Rantai, rescue, A/B speed, near-miss, burst, capture, timer, HUD, CSV.

**Keluar:** multiplayer, item, Bara, Tugu, Malam, ekonomi, iklan, auth, hero
skills, progression, skin, builder, dan server authority.

## Gate lanjut

Prototype baru layak menjadi room Galantara jika:

1. minimal 20 match playtest selesai (10 A, 10 B);
2. keputusan mengejar/pulang benar-benar muncul;
3. near-miss rata-rata minimal 3 per match;
4. tawanan tidak pasif lebih dari 25 detik per match;
5. pemain masih ingin mengulang setelah match kedelapan.

Kegagalan gate berarti tuning maksimum tiga putaran. Bukan alasan menambah fitur.

