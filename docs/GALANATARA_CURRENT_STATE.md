# Galantara — Current State

**Audit:** 2026-09-08  
**Sumber:** repo kanonik `fahmiwol/galantara`, snapshot produksi privat
`fahmiwol/galantara-io-vps`, situs live, serta GDD/SPEC Benteng 2026-09-07.

## Ringkasan eksekutif

Galantara sudah nyata sebagai **pasar malam digital Indonesia di browser**:
pengunjung masuk sebagai tamu, berjalan di Oola, melihat NPC, berpindah Spot,
dan bertemu pemain lain lewat Socket.io. Ia bukan repo kosong dan bukan konsep
Unity. Identitas produk yang konsisten adalah **platform sosial-komersial ringan
berbasis Web/Three.js**, dengan mini-game sebagai alasan orang datang dan
berinteraksi.

Repo publik adalah sumber kanonik. Repo privat `galantara-io-vps` adalah snapshot
penyelamat vhost, bukan tempat pengembangan. Pada audit ini, seluruh file runtime
yang sama-sama ada di kedua repo memiliki hash yang sama; snapshot hanya menambah
artefak server seperti `three.min.js`, halaman error, dan challenge ACME. Artinya
repo publik cukup aman dijadikan dasar kerja tanpa menimpa perubahan produksi
yang lebih baru.

## Yang sudah ada dan berjalan

- Shell web statis `index.html` + modul ES di `src/`.
- Dunia 3D Three.js r128, kamera orbit/isometrik, avatar, NPC, day/night, zona,
  serta procedural props Indonesia.
- Guest-first onboarding: tamu boleh masuk dan bergerak tanpa login.
- Auth Supabase, multiplayer Socket.io rooms, chat, dan relay WebRTC.
- Oola hub, Spot modular Bogor dan Monas, warp portal, deep link `?spot=`.
- `SpotRuntime`, `InteractionVolume`, `AssetLibrary`, MapBuilder, Generator3D,
  map JSON, serta manifest aset per Spot.
- Server realtime Express + Socket.io di `galantara-server/`.
- 15 migrasi Supabase untuk arah sosial-komersial; status push/wiring produksi
  belum boleh dianggap selesai.
- Situs `https://galantara.io` bisa dimuat pada 2026-09-08 dan menampilkan Oola,
  guest gate, peta Spot, Developer Hub, serta 3D Generator.

## Stack yang benar menurut kode aktif

| Lapisan | Kondisi nyata |
|---|---|
| Client | Vanilla JavaScript ES modules + Three.js r128 |
| UI | HTML/CSS/DOM; bukan React aktif |
| Realtime | Express 4.21 + Socket.io 4.7 |
| Auth/data | Supabase (auth ada; migrasi/wiring commerce belum seluruhnya terbukti live) |
| Deploy | Static vhost + Node realtime; GitHub Actions tersedia |
| Authoring | JSON map, procedural mesh, GLB manifest, builder internal |

PRD lama masih menyebut React Three Fiber, Fastify, Vercel/Railway, LiveKit, dan
beberapa layanan managed. Itu adalah arah lama/aspirasi. Berdasarkan `AGENTS.md`,
`SPRINT_LOG.md`, `CHANGELOG.md`, dan kode aktif, pilihan di tabel di atas yang
menang sampai ada keputusan migrasi baru.

## Keputusan arsitektur yang sudah terkunci

1. Runtime pemain tetap web, ringan, dan guest-first.
2. Core engine memakai Three.js/data; Blender/AI mesh adalah supply chain aset,
   bukan runtime browser.
3. Spot memakai lifecycle `mount / animate / dispose` dan satu root group.
4. Interaksi lebih penting daripada kompleksitas visual.
5. Builder ditujukan no-code, pola sederhana **Kalau → Maka**.
6. Scene/rules dipisah dari rendering; format harus berversi.
7. Jangan `scene.traverse()` setiap frame; disposal hanya untuk resource milik
   Spot yang di-unload.

## Yang masih kosong atau belum terbukti

- Belum ada mini-game yang menjadi anchor retensi sosial.
- Benteng/Sistem Muatan belum diimplementasikan atau diuji rasa.
- Room registry, party, matchmaking, dan server-authoritative Benteng belum ada.
- Mighan Coin/wallet/top-up belum end-to-end; HUD masih placeholder.
- Moderasi sosial lengkap, report/block, creator publish flow, dan SDK stabil
  belum selesai.
- Klaim performa Android/HP kelas menengah untuk Benteng belum dapat dibuat
  sebelum ada build dan playtest perangkat nyata.

## Kesimpulan audit

Langkah dengan rasio nilai/risiko terbaik bukan membangun platform baru atau
memindahkan Galantara ke Unity. Langkah berikutnya adalah menambahkan **Benteng
Fase 0 sebagai vertical slice web yang terisolasi**: playable offline 4v4 melawan
bot, sangat ringan, memakai konfigurasi dan log playtest, lalu baru diangkat
menjadi jenis room bila Sistem Muatan terbukti seru.

