# HANDOFF — Galantara · 16 Sep 2026

> Sesi berikutnya cukup membaca berkas ini. Buka dokumen lain hanya kalau
> ditunjuk di sini. Handoff lama: `docs/HANDOFF-2026-09-11.md`.

## Keadaan

- Repo `C:\galantara`, branch `main` = `origin` (`999fefd`). Uji: `npm test` → 198 lulus.
- **Live di galantara.io:** statis `4a9c6d2`, multiplayer `6650744` (VPS-2 `trx-alt`, SSH 2222).
- Versi rilis terakhir 0.10.0; `CHANGELOG [Unreleased]` berisi deploy CI, ADR-0019/0020, dan perbaikan crash multiplayer.
- Deploy: `docs/DEPLOY.md`. Anggaran Spot: `node --experimental-default-type=module tools/anggaran-spot.mjs`.

## Tugas Fahmi

1. **Pasang kunci CI** (Git Bash di `C:\galantara`): `bash tools/deploy/pasang-kunci-ci.sh`.
   Sebelum ini, push tidak men-deploy (job deploy dilewati, tetap hijau).
2. **Opsional, API admin** (sekarang 503): di server, jalankan
   `read -rs ADMIN_API_TOKEN; export ADMIN_API_TOKEN; pm2 stop galantara-mp; pm2 start galantara-mp --update-env; pm2 save`.
   Pakai `stop` lalu `start`, **bukan** `restart`.
3. **Ctrl+Shift+R sekali** di galantara.io, supaya build April yang tersimpan di browser hilang.

## Sisa kerja agen (urut)

**P0 — cacat yang terlihat di live** (rincian: `docs/brief/suasana/KEPUTUSAN.md`, bagian "Cacat")
1. **Kuta** `src/world/spots/KutaSpotRuntime.js`: pasir menutupi laut 2,2 m; tangga gerbang naik menjauhi gerbang dan melayang; kelapa condong sejajar pantai; kursi tanpa kaki.
2. **Braga** `src/world/spots/BragaSpotRuntime.js`: kedua deret ruko menghadap +Z (harus menghadap jalan); kanopi menembus punggung tetangga 0,1–0,3 m di 6 celah; Spot perlu bisa menyatakan sudut kamera awalnya sendiri.

**P1**
3. Setelah kunci CI dipasang: jalankan workflow mode `coba`, lalu `jalankan`. Deploy CI sungguhan **belum pernah terbukti**.
4. Rumah GLB tanpa bayangan (`src/world/AssetLibrary.js`, `castShadow`). Putuskan dulu anggaran pass bayangan (sekarang kaster: Braga 74, Kuta 63, Oola 56).
5. Ukur di ponsel: belum ada angka apa pun (FPS, draw call nyata, waktu muat Rapier 4,7 detik di laptop).
6. Panel chat menutupi layar sempit (~700 px).
7. `docs/brief/suasana/SINTESIS.md` §4 langkah 1–10. Ukur anggaran sebelum dan sesudah tiap langkah (batas ≤20.000 segitiga, ≤150 draw call, ≤3 PointLight).
8. Oola: panel label diegetik (KEPUTUSAN §8); P1.7 sinkron tinggi kaki (`docs/BACKLOG.md`).

**P2**
9. `pulihkan` statis dan multiplayer belum pernah diuji sungguhan.
10. Multiplayer belum masuk CI (masih `bash tools/deploy-mp-galantara.sh`).
11. Rupa3D menulis collider saat ekspor (sisi Rupa3D, rilis 1.6.3). Galantara sudah membaca (ADR-0019).

## Aturan yang sering dilanggar

- Klaim penyebab = dugaan sampai diperiksa. Tulis perintah dan hasilnya (dua koreksi 16 Sep: "tidak ada server", "port 22").
- Verifikasi di **galantara.io**: `G_Fisika.status()`, "N online". `window._game` hanya ada di localhost.
- Benda rendah yang tidak boleh dinaiki: collider ≥ 0,70 m. Warna diukur dari piksel (ADR-0017).
- Multiplayer di belakang sakelar: jangan `pm2 restart` aplikasi yang online.
- Delegasi ke Codex: sandbox Windows-nya tidak bisa menjalankan bash, jadi uji sendiri.
- Catat: CHANGELOG + `docs/LIVING_LOG.md` + OMIGA (`brain_learn`), lalu commit dan push.

## Prompt sesi berikutnya

```
Lanjut Galantara. Baca C:\galantara\HANDOFF.md saja. Kerjakan "Sisa kerja agen"
mulai P0 no.1. Tiap perbaikan: ukur (tools/anggaran-spot.mjs + npm test),
verifikasi di galantara.io, catat CHANGELOG/LIVING_LOG/OMIGA, commit + push,
deploy (CI kalau kunci sudah dipasang; kalau belum: bash tools/deploy-galantara.sh jalankan).
Perbarui HANDOFF.md sebelum berhenti. Hemat token: delegasi tugas penulisan besar ke Codex.
```
