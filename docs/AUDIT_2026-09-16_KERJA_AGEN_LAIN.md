# Audit kerja agen lain (GPT/Codex) — 16 Sep 2026

> Diminta Fahmi: "GPT melakukan beberapa optimasi saat kamu limit, coba kamu
> validasi, audit, review… sesuaikan biar seamless dengan galantara asset dan
> suasananya… konsep gambar dibanding hasil developmentnya."
>
> Audit **hanya-baca**. Tidak ada berkas kode atau dokumen milik agen lain yang
> diubah, karena worktree masih ditulisi saat audit berjalan (berkas Benteng
> berubah 05:58, dokumen dan PNG masih berubah 06:05). Semua angka di bawah
> diukur sendiri, bukan dikutip dari dokumen yang diaudit.

## 1. Keadaan terukur (16 Sep, 05:59–06:05)

| Ukuran | Hasil |
| --- | --- |
| `npm test` | **229 lulus, 0 gagal**, 9,86 detik |
| `periksa:tautan` | 87 Markdown, 73 tautan relatif, semua ada |
| Anggaran Kuta | 2.026 segitiga / 86 draw call / 64 kaster / 2 PointLight / 31 collider (sebelumnya 1.882 / 81 / 63 / 2 / 27) |
| Anggaran Oola | 11.057 / 123 / 56 / 3 / 59 — tidak berubah |
| Scene Benteng (halaman terpisah) | 4.788 segitiga / 92 draw call / 0 PointLight / 28 kaster |
| Belum di-commit | 25 berkas berubah, 40 berkas baru |

Semua Spot masih di dalam anggaran KEPUTUSAN.md (≤ 20.000 segitiga, ≤ 150 draw
call pass utama, ≤ 3 PointLight). Angka draw call di sini **tidak** termasuk pass
bayangan (ADR-0018 §koreksi instrumen).

**Yang terbukti baik:** ADR-0001 bersih (tidak ada `import 'three'`;
`BentengScene` menerima THREE sebagai parameter). Collider Kuta sesuai ADR-0016
(undak candi 0,11 m, kursi tetap volume 0,70 m). `joglo.glb` cocok dengan hash
bita nyata dan sidecar collider-nya ada (ADR-0019). Daftar paket deploy tetap
identik di workflow, `tools/deploy-galantara.sh`, dan penerima (ADR-0020).

## 2. Temuan kode

Tidak ada bloker. Yang mayor:

| Berkas | Masalah | Tindakan |
| --- | --- | --- |
| `index.html` (kartu `#arena-door` dihapus) + `src/world/World.js` | Satu-satunya pintu ke Benteng kini rantai runtime Room → GLB → collider → zona → panel yang gagal **tanpa suara** (hanya `console.error`) | Jalur cadangan di menu HUD atau toast saat mount gagal, sebelum kartu lama dihapus dari live |
| `src/games/benteng/BentengRenderer.js` | `shadowMap.enabled` diubah setelah render pertama tanpa `material.needsUpdate`; r128 tidak mengompilasi ulang shader, jadi mode "Ringan" mungkin tidak benar-benar mematikan bayangan | Ukur di browser; set `needsUpdate` atau bangun ulang view |
| `src/core/Game.js` (jalur NPC) | Membaca `world.balaiRoomData` langsung, melewati intent/capability interpreter; terkunci ke satu Room | Rutekan lewat intent |
| `tests/bentengRenderer3d.test.mjs` | Penambat `indexOf('_updateEffects')` sudah tidak ada (`-1`), jadi uji lolos secara kebetulan dan akan selalu hijau | Penambat eksplisit atau uji perilaku (ADR-0012) |
| `src/data/roomContract.js` | "Bukti aset terikat hash" sebenarnya hanya konsistensi antar-field dokumen; bita aset tidak pernah di-hash ulang | Tulis batas itu di ADR-0021; verifikasi bita saat Room pihak ketiga |

Minor yang perlu dibereskan sebelum Room dibuka ke warga: `personaId` dipakai
sebagai kunci objek biasa (`__proto__` merusak state), fixture Room di
`src/data/` ikut terkirim ke produksi, tiga field kontrak (`returnSpawnId`,
`knowledgeScope`, `provider`) tidak dibaca kode mana pun, enum mode berbeda
antara `activityRegistry` (`team`) dan `roomContract` (`party`/`spectator`),
`innerHTML` dengan nama unit, `buildGameReturnState` melempar di subdirektori,
dan `scene.traverse` di `src/games/benteng/BentengScene.js` (ADR-0002 — alat ukur
harus di `tools/`).

## 3. Temuan dokumen

| Masalah | Bukti |
| --- | --- |
| **Status basi disalin ke delapan berkas**: "renderer masih 2D, 11 lolos/2 gagal" | Diukur di worktree yang sama: renderer sudah WebGL + kamera ortografik, `mapBentengPoint3d` ada, empat berkas uji itu 14/14, suite 229/229 |
| **Lima angka suite beredar dalam satu hari** (198 → 200 → 209 → 214), padahal 229 | HANDOFF, CHANGELOG, LIVING_LOG, ADR-0022 |
| **Status backlog basi di commit yang sama** | "P0-F1 Balai Main — KOSONG" padahal katalog sudah jalan; "P1-F2 Manifest game — KOSONG" padahal `activityRegistry.js` ada berikut ujinya |
| **Anggaran lampu bertentangan** | `BENTENG_GAMEPLAY_GUI_V1.md` §5 menulis ≤ 3 PointLight; gate R04 dan `BENTENG_SCENE_BUDGET` menulis 0. Ukuran nyata 0 |
| **Katalog menjanjikan yang belum ada** | Enam entri, satu bisa dimainkan; "Suit Kilat"/"Lempar Gelang" belum dibangun |
| **Klaim eksternal tidak terverifikasi** | Tabel audit tujuh repo luar dan kutipan regulasi (Permenkominfo 2/2024, PP 17/2025) dipakai untuk memagari fitur, tanpa sumber yang dibuka |
| **PRD ditulis ulang tanpa ADR** | Definisi Spot/Dungeon/Oola diganti; ADR dibuat untuk hal yang lebih kecil |
| **Scope creep** | 18 bab feature universe + R0–R5 Room ditulis saat Braga P0 belum diperbaiki, deploy CI belum pernah terbukti, ponsel belum diukur, trust & safety nol. HANDOFF bahkan menaruh "P0 produk" di atas "P0 cacat live" |

## 4. Alat ukur visual mengukur latar yang salah

`tools/benteng-visual-audit.mjs` menghitung kontras terhadap
`config.visual.ground` = `#3a2b20`, sedangkan `src/games/benteng/BentengScene.js`
menanam sendiri `#d7ad73` (pasir), `#7ca85a` (rumput), `#578c87` (air) dan latar
`#efc693`. Saya periksa langsung kedua berkas: warna itu memang tidak pernah
bertemu. Karena itu laporan "semua ambang lulus" tidak berlaku; terhadap pasir
yang benar-benar dirender, aura 1,01–1,88:1 dan warna tim 1,08–1,18:1, sedangkan
syaratnya ≥ 3:1.

Ini keluarga yang sama dengan ADR-0017 (warna diukur dari piksel, bukan dari
material) dan dengan koreksi draw call ADR-0018: **alat yang namanya menjanjikan
lebih luas daripada yang diukurnya**.

## 5. Gambar konsep dibanding hasil development

Acuan Fahmi (`docs/design/benteng-hybrid/reference-1.png`, `reference-2.png`):
kamera perspektif ~35–40°, ada bingkai depan dan langit, lapangan mengisi 75–85 %
bingkai, avatar ~6 % lebar bingkai, siluet vertikal kuat (atap joglo, tiang panji,
bambu), jam emas dengan bayangan panjang, pasir hangat dan kayu jati.

**Konsep GPT** mengikuti komposisi dan memakai GUI Galantara dengan benar, tetapi
mengarang detail aturan (rantai, satu penjara, label "YOU") dan kepadatan
dekornya jauh di atas anggaran MVP.

**Runtime** paling jauh dari acuan:

1. **Framing.** Kamera ortografik tetap; di potret arena hanya ~23 % tinggi layar
   (desktop ~50 %), sisanya bidang kosong.
2. **Skala avatar** ~2 % lebar bingkai, sekitar tiga kali lebih kecil dari acuan;
   labelnya lebih besar daripada karakternya.
3. **Siluet datar**: benteng tanpa atap, bambu satu balok, gerobak kotak pipih.
4. **Palet dingin** (`#578c87`, `#7ca85a`) justru yang ditolak
   `docs/RISET_VISUAL_SENJA_90AN.md`; kontras tim terhadap pasir 1,0–1,9:1.
5. **Cahaya rata**, bukan jam emas.

**Lima perubahan dengan dampak terbesar** (semua muat di r128 dan di dalam
anggaran; tiga pertama nol segitiga baru):

1. Kamera difit ke arena, bukan ke lebar layar: tilt ~35°, `halfH` dihitung dari
   kedalaman arena ÷ cos(tilt). Target: dunia 75–85 % bingkai di lanskap dan
   ≥ 70 % di potret 390 px.
2. Palet dikunci ke token senja (tanah `#8a6b4f`, rumput `#6f7f4a`, tim nila
   `#3d6b9e` vs bata `#c0553f`), lalu audit kontras dijalankan ulang terhadap
   piksel yang dirender; lulus = ≥ 3:1.
3. Avatar diperbesar ke ~2,2–2,5 unit dan label dikurangi (hanya pemain).
4. Siluet dikembalikan: atap joglo bertiang untuk dua benteng (pakai
   `assets/models/joglo.glb`, 168 segitiga), dua tiang panji, rumpun bambu,
   sangkar penjara. Perkiraan +2.000 segitiga, +10–15 draw call.
5. Satu DirectionalLight hangat bersudut rendah + hemisphere hangat + gradien
   langit. Tetap 0 PointLight.

## 6. Rencana — milestone dan gate

Rencana ini menggantikan urutan di HANDOFF versi agen lain, yang menaruh fitur
baru di atas cacat live.

| Milestone | Isi | Gate (terukur) |
| --- | --- | --- |
| **M0 — Stabilkan dan buktikan** | Pecah worktree jadi commit terpisah; satukan angka status; tutup lima temuan MAYOR; audit kontras ulang; deploy CI dibuktikan | Suite hijau dengan satu angka resmi; CI `coba` lalu `jalankan` terbukti (hash live = blob) 2×; kontras ≥ 3:1; jalur ke Benteng punya cadangan yang teruji |
| **M1 — Vertical slice "Main"** | Lima perubahan visual §5 + QA browser desktop dan sentuh + return-state | 5 penguji: ≥ 4 paham tujuan setelah panduan ≤ 20 detik dan bisa kembali ke Oola; 0 galat konsol; dunia ≥ 70 % viewport di 390 px; draw call ≤ 150 termasuk pass bayangan |
| **M2 — Braga P0** | Fasad menghadap jalan, kanopi tidak menembus, Spot menyatakan sudut kamera awalnya | Terverifikasi di galantara.io, bukan lokal |
| **M3 — Ponsel** | Ukur perangkat nyata: frame pacing, first useful frame, memori | Ada angka; keputusan anggaran pass bayangan diambil dari angka itu |
| **M4 — Trust & safety minimum** | Report/block/mute/rate limit/age gate/audit | Uji negatif di server, bukan tombol yang disembunyikan |
| **M5 — Room private preview** | Save revision, preview as guest, rollback | Kriteria "Definisi selesai" di `GALANTARA_ROOM_BUILDER.md` |

**Ditunda, ditulis eksplisit:** Duel/Tim online, Suit Kilat, Lempar Gelang,
Kejutan Spot, Temu Kenal, commerce/COD, Avatar Builder, NPC AI, Room publik +
direktori + event, marketplace, dan perbaikan retrieval MiganCore (repo lain).

## 7. Urutan commit yang aman

`main` sekarang memicu deploy pada `index.html`, `benteng.html`, `src/**`
(ADR-0020) — **commit ke main berarti tayang** begitu kunci CI dipasang. Karena
itu:

1. `fix(kuta)` — runtime Kuta + ujinya.
2. `feat(room)` — `roomContract.js` + uji + ADR-0021, fixture dipindah dulu ke `tests/`.
3. `feat(room-runtime)` — `RoomSceneInterpreter.js`, `AssetLibrary.applyEntries`,
   `proceduralMeshFactory`, `styleTokens`, ADR-0022 + uji.
4. `feat(benteng-settings)` — `BentengSettings.js`, `gameReturn.js` + uji.
5. **Tunggu**: bundel GUI/shell (`index.html`, `benteng.html`, `main.js`,
   `BentengRenderer/Scene`, `HUD`, `Panels`, `Game.js`, `World.js`,
   `activityRegistry.js`) sampai temuan MAYOR 1–3 ditutup dan ada bukti browser.

## 8. Keputusan yang butuh Fahmi

1. **Target visual M1:** perbaiki framing, palet, dan siluet di scene yang ada
   (hitungan hari), atau pass aset penuh lewat Rupa3D (hitungan minggu)?
2. **Bekukan feature universe:** setuju menandai gacha, dating, commerce, dan
   Room publik sebagai "arah, belum dijadwalkan", dan mengembalikan Braga +
   bukti deploy + ukur ponsel sebagai P0 teratas?
3. **Kejujuran katalog:** sembunyikan judul yang belum bisa dimainkan, atau tetap
   tampil dengan label "Rencana"?

## 9. Batas audit ini

Belum diperiksa: perilaku di browser (mode Ringan, rantai mount Benteng, QA
sentuh), `benteng.css`, `AudioDirector`, isi seluruh dokumen baru baris demi
baris, dan klaim regulasi. Worktree masih berubah saat audit berjalan, jadi angka
bisa bergeser. Yang saya verifikasi sendiri di luar laporan agen: ketidakcocokan
warna tanah §4, dan keadaan berkas yang belum di-commit.

## 10. Serah terima

Langkah berikutnya, berurutan, saat agen lain berhenti menulis:

1. Gabungkan §6 ke `docs/BACKLOG.md` dan `HANDOFF.md` (keduanya sedang dipegang
   agen lain saat audit ini ditulis).
2. Jalankan `npm test` ulang, lalu commit menurut §7 nomor 1–4; jangan sentuh
   nomor 5.
3. Tutup MAYOR 1–3, ukur mode Ringan di browser, perbaiki penambat uji.
4. Perbaiki alat audit visual (§4), jalankan ulang, baru kerjakan §5 nomor 1–3.
5. Catat tiap langkah di CHANGELOG, LIVING_LOG, dan OMIGA.
