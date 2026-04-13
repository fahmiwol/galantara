# GALANTARA BUILDER PLATFORM DOCUMENT (v1.3)

> Salinan repo — mirror dari `galantara_builder_system.md` (Downloads). Update keduanya saat revisi besar.

Generated: 2026-04-13 · Diperbarui: 2026-04-13 (Cursor — visi no-code creator + AI copilot)

------------------------------------------------------------------------

# 🧠 PURPOSE

Dokumen ini menjelaskan bagaimana membangun platform seperti:

- Roblox
- Sandbox
- Spline

Dengan pendekatan:

- Solo founder
- AI-assisted development
- Modular system

------------------------------------------------------------------------

# 🧭 UTARA PRODUK — Game engine & Game builder

**Keputusan arah:** Galantara harus **mampu tumbuh** sampai punya **game engine** (runtime yang mengatur scene, entity, sistem, tick, asset, I/O) dan **game builder** (alat creator: susun dunia, logika, publish) — bukan sekadar satu scene statis. Itulah sebabnya **tool riset** (Blender/bpy, Meshy, glTF, Wings3D, dll.) sangat berguna: mereka mengisi **rantai authoring → aset → runtime**.

### Definisi operasional (supaya tidak melebar tanpa ujung)

| Lapisan | Arti di Galantara | Contoh konkret |
|--------|-------------------|----------------|
| **Render kernel** | WebGL + Three.js; kamera, cahaya, load mesh | `Renderer`, `GLTFLoader`, dispose per Spot |
| **Engine layer** | Abstraksi di atas Three: entity/scene graph, event tick, sistem (input, audio, network sync) | Arah: `SpotRuntime`, volume interaksi, scheduler entitas |
| **Game builder** | UI + data: peta, objek, aturan, publish ke Spot | Map builder hari ini → inspector → logic JSON → publish |
| **Platform services** | Auth, ekonomi, moderation, CDN asset | Supabase, Socket.io, Storage |

**Prinsip:** kita **tidak** menulis physics engine AAA dari nol di tahun pertama; kita **menguatkan** lapisan engine yang *penting untuk social-commerce plaza*: entity lifecycle, interaksi, save, multi-user.

### Alat eksternal = bagian supply chain engine/builder

- **Blender + bpy** — sumber kebenaran mesh di studio; otomasi export & validasi sebelum masuk **manifest**.  
- **Meshy (dan sejenis)** — generator aset *batch* yang harus masuk pipeline **review + compress + Storage**.  
- **glTF / glTF Transform** — **format pertukaran** antara DCC dan engine web.  
- **Referensi engine lain** (mis. Armory) — belajar *boundary* modul, bukan menyalin stack.

Detail kurasi link: `docs/RESOURCES_RESEARCH.md`.

------------------------------------------------------------------------

# 🧩 CORE PLATFORM SYSTEM

Galantara bukan game, tapi **PLATFORM**.

## SYSTEM UTAMA

1. Map Builder
2. Object Builder
3. Asset Builder
4. Game Builder
5. Interaction Builder
6. Logic Builder
7. Social System
8. World System
9. Economy System
10. Creator System

------------------------------------------------------------------------

# 🎯 VISI CREATOR — Tanpa ngoding, tanpa skill desain (AI membantu)

**Janji produk:** user biasa bisa **membuat, mengubah, dan menerbitkan** Spot / dunia 3D sosial dengan **mudah dipakai, mudah dipahami**. Desain teknis dan kode **disembunyikan** di balik bahasa sehari-hari, preset, dan **AI copilot** (saran, bukan keputusan membabi buta).

### Prinsip UX (mengikat semua builder)

| Prinsip | Arti |
|--------|------|
| **Template dulu** | Mulai dari “plaza / warung / alun” siap pakai; edit pelan-pelan. |
| **Satu bahasa** | Istilah konsisten (Spot, Warung, Zona, Tamu) — hindari jargon engine di UI. |
| **Progres bertahap** | Mode **Sederhana** vs **Lanjutan**; jangan tampilkan semua slider sekaligus. |
| **Preview & undo** | Setiap aksi bisa dilihat langsung di 3D + **urung** jelas. |
| **AI = pembantu** | User menyetujui hasil; tampilkan **peringatan** (hak cipta, biaya API, berat file). |
| **Budget terlihat** | Meter sederhana: “ringan / sedang / berat” — jangan sampai publish merusak HP player lain. |

### Peta builder (menggabung daftar kamu — hindari nama ganda membingungkan)

| Arah kamu | Nama produk (disarankan) | Apa yang user kerjakan (no-code) |
|-----------|--------------------------|-----------------------------------|
| Game builder + **engine** | **Main & Terbit** | coba main, multiplayer, publish versi, rollback |
| Map builder + **3D map** | **Tanah & Jalur** | bentuk tanah, jalan, area, slot bangunan |
| **World** builder | **Dunia & Spot** | beberapa Spot, warp, cuaca/waktu, NPC slot |
| **3D model** + object + asset | **Prop & Avatar** | preset bentuk, warna, ukuran; unggah / AI-generate |
| **Animation** builder | **Gerak & Emote** | idle, jalan, duduk, emote; loop; transisi singkat |
| *(implisit di atas)* | **Cahaya & Suasana** | preset siang/malam, lampu, kabut ringan |

### Apalagi yang **wajib** — supaya benar-benar “semua orang”

Tanpa blok berikut, builder 3D saja tidak cukup untuk platform sosial-ekonomi.

1. **Perilaku / Logic** — *Kalau … maka …* dengan kartu/kamus (bukan kode), **mengutamakan gaya event sheet** (seperti [Construct 3](https://www.construct.net/en)); graf node (gaya Unity Visual Scripting / Unreal Blueprint) **opsional** untuk mode lanjutan. Contoh: “kalau pemain dekat warung → buka panel dagang”.  
2. **UI & teks** — susun **panel**, harga, tombol, dialog warung (blok seperti slide).  
3. **Commerce** — katalog, harga, stok, promo; terhubung **dompet / transaksi** (fase ekonomi).  
4. **Audio** — backsound zona, efek klik, volume otomatis saat voice.  
5. **Cerita ringan / urutan** — langkah misi sederhana (opsional): “ambil → antar → selesai”.  
6. **Wizard pertama kali** — “Buat Spot pertamamu dalam 5 menit” (obligatory untuk retensi).  
7. **Template & remix** — duplikasi Spot orang lain (izin) → edit sendiri.  
8. **Aksesibilitas** — teks besar, kontras, navigasi keyboard.  
9. **Kolaborasi** — undang teman **sunting bersama**, komentar, kunci bagian.  
10. **Keamanan & moderasi** — lapor, filter AI, batas unggah.  
11. **Versi & riwayat** — simpan revisi; kembalikan ke kemarin.  
12. **Lokalisasi** — salin string per bahasa (Indonesia dulu, lainnya menyusul).  
13. **Analitik ringan** — kunjungan, titik ramai (opsional, privacy-aware).

### Lapisan **AI** (satu pintu, banyak tugas)

| Modul AI | Bantu user seperti apa |
|----------|-------------------------|
| **Bahasa → layout** | “Buat warung sederhana depan alun” → usulkan blok + posisi. |
| **Bahasa → prop** | prompt → mesh stylized (Meshy / sejenis) → **review** → compress → pasang. |
| **Gambar → gaya** | foto referensi → palet & bentuk mirip (dengan batas lisensi). |
| **Bahasa → aturan** | jelaskan interaksi → draft kartu *Kalau–Maka* + deteksi konflik. |
| **Jelaskan** | tooltip “ini untuk apa?” dalam bahasa awam. |

**Catatan teknis:** AI selalu lewat **pipeline** (validasi ukuran, format glTF, moderasi) — lihat `docs/RESOURCES_RESEARCH.md` (Meshy, dispose GPU).

## TAMBAHAN WAJIB (gap yang harus kita punya)

Agar dokumen ini match **clean architecture** + **multi-Spot** + **performance**, seksi berikut adalah **kontrak** produk/teknik, bukan opsional.

### A. Spot & scene lifecycle

- **SpotRuntime** (atau setara): setiap Spot punya `mount(scene)`, `animate(t)`, `dispose()` — **satu root `THREE.Group` per Spot**.
- **World root** untuk hub Oola: semua mesh gameplay di **`worldRoot`**, bukan tersebar `scene.add` — supaya **unload satu kali** saat ganti Spot.
- **Sinkron**: room multiplayer (`oola` vs `spot:<id>`) ↔ visual Spot (jangan room beda tapi mesh masih dunia lain).

### B. Asset pipeline

- **Manifest per Spot** (JSON): daftar asset (path GLB / procedural id), posisi, rotasi, scale, flag **instanced** / LOD.
- **AssetLibrary**: cache `GLTFLoader`, dedupe material/geometry, **dispose** saat Spot unload.
- **Format export** map: versi schema + checksum — kompatibel mundur satu major version.

### C. Builder → runtime bridge

- **MapBuilder** (dev): raycast ke **target yang benar** per Spot (ground layer), bukan asumsi satu dunia.
- **Validasi placement**: radius Spot, collision sederhana, budget tri count per chunk.
- **Mode dev vs production**: flag build — object builder penuh hanya di dev / permission creator.

### D. Interaction & logic (urutan prioritas produk)

- **InteractionVolume** (sphere/box): `onEnter` / `onExit` / `onUse` — duduk, warung, portal.
- **SocialNode registry**: warung, bangku, panggung = node pertama, bukan dekorasi terakhir.
- **Logic Builder**: rules JSON — mulai dari **IF proximity / IF click → THEN toast / THEN open UI**; jangan langsung visual scripting penuh.

### E. World system & persistence

- **Save/load scene**: versi file + migrasi ringan; opsi **authoring JSON** (sudah ada arah di `default_oola.json`) vs **binary** nanti.
- **Supabase (atau DB)**: metadata Spot, versi map, ACL creator — jangan simpan mesh besar di row Postgres mentah tanpa storage object.

### F. Creator & governance

- **Creator roles**: viewer → contributor → spot owner (ACL per Spot).
- **Review pipeline**: publish Spot = moderation ringkas + limit ukuran asset.
- **Plugin contract** (Object "Jiwa" / Sprint 8+): izin eksplisit (`ui.overlay`, `economy.read`, dll.).

### G. Observability & safety

- **Health**: server multiplayer + CDN asset.
- **Rate limit** placement / save.
- **Fallback**: load map gagal → island minimal + toast (jangan layar hitam).

------------------------------------------------------------------------

# 🏗️ ARCHITECTURE (selaras repo saat ini)

Struktur target (evolusi dari monolit `World.js`):

```text
/project
  /assets
    /models      ← GLB per kit Spot
    /textures
  /src
    /core        ← Game, Renderer, Camera
    /world       ← World.js (hub), SpotRuntime.js, spots/*.js
    /builder     ← MapBuilder, Generator3D, proceduralMeshFactory (arah)
    /interaction ← (belum) volume + prompt
    /systems     ← (arah) economy, presence
    /multiplayer
    /ui
    /panels
  /galantara-server
```

**Prinsip:** interaction > visual complexity; **satu tanggung jawab per modul**.

------------------------------------------------------------------------

# 🎮 PHASE DEVELOPMENT (STEP BY STEP)

Fase di bawah diselaraskan dengan **builder document** + **backlog** `TODO.md` / `SPRINT_LOG.md`.

## PHASE 1 — MAP BUILDER

- [x] setup Three.js scene (ada: `Renderer`, `Game`)
- [ ] load GLB asset (pipeline manifest + `AssetLibrary` — backlog)
- [x] implement click placement (ada: `MapBuilder` — grid snap, raycast)
- [x] add grid system (implisit di placement snap)

## PHASE 2 — OBJECT BUILDER

- [ ] move / rotate / scale (gizmo — backlog)
- [ ] UI panel khusus inspector object (bukan hanya generator preset)

## PHASE 3 — INTERACTION BUILDER

- [x] raycasting (MapBuilder + `getPlacementRaycastTargets` per Spot)
- [ ] click action (umum — selain placement dev)
- [ ] hover highlight

## PHASE 4 — LOGIC BUILDER

- [ ] IF → THEN system
- [ ] JSON rules (versi 1: trigger + aksi sederhana)

## PHASE 5 — SOCIAL SYSTEM

- [x] avatar
- [x] chat (+ guest read-only policy)
- [x] presence (Socket.io room + count)
- [x] voice proximity (login)

## PHASE 6 — WORLD SYSTEM

- [x] save/load scene (arah: JSON map + export console; **versi schema + DB** = next)
- [ ] database (Supabase migrations di repo — **push & wiring** backlog)

## PHASE 7 — GAME BUILDER

- [ ] event system (global + per Spot)
- [ ] trigger system (volume + rule)

## PHASE 8 — ECONOMY

- [ ] marketplace
- [ ] donation
- [ ] asset selling

------------------------------------------------------------------------

# 🤖 CURSOR MASTER PROMPT

Build a modular 3D builder platform using Three.js with drag-drop,
interaction, logic, and save/load system.

**Tambahan instruksi (v1.3):** UI builder **no-code** (preset + wizard + bahasa sederhana); setiap fitur punya **mode Sederhana**; AI hanya **mengusulkan** — user **menyetujui**; dokumentasikan **istilah produk** konsisten. Engine: data/rules pisah dari scene Three. **Social + commerce builders** setara pentingnya dengan 3D.

------------------------------------------------------------------------

# 🚀 FINAL GOAL

Build Galantara as a creator platform, not just a game — dengan **kemampuan bertahap** menuju **game engine** (runtime terstruktur) + **game builder** (alat creator end-to-end).

**Metric jangka dekat:** creator bisa publish **satu Spot kecil** yang *betah dikunjungi* (interaksi jelas).  
**Metric jangka panjang:** satu alur **authoring → simulasi → publish** tanpa fork manual kode inti; engine layer bisa ditambah sistem baru (ekonomi, quest, plugin) tanpa rewrite penuh.  
**Metric no-code:** orang baru bisa **Spot pertama yang playable** (bukan hanya kosong) lewat wizard + template, **tanpa** membuka editor kode dan **tanpa** software desain eksternal wajib.

------------------------------------------------------------------------

# 📌 CATATAN IMPLEMENTASI (yang sudah dilakukan di repo — Cursor)

Ringkasan agar dokumen ini tidak “tinggal di aspirasi”; cek `CHANGELOG.md` untuk detail.

| Versi / tanggal | Isi |
|-----------------|-----|
| **v0.6.1** | Room Socket per Spot (`spot:<id>`), warp + fade, `?spot=`, HUD label, `Avatar.teleport`, server `leave` room lama. |
| **v0.6.2** | **`World.worldRoot`** + `disposeContent` / `rebuildContent`; sky tetap; **`BogorSpotRuntime`** (POC plaza); **`Game._syncSpotVisuals`** + URL/logout/warp; **`getPlacementRaycastTargets`** untuk MapBuilder; **`NPC.setHubVisible`** di Bogor; **`SpotRuntime.js`** kontrak; helper **`spotIdFromSocketRoom`**. |
| Dokumen / backlog | `TODO.md` § arsitektur 3D modular; `SPRINT_LOG.md` Sprint 5 diperbarui. |

**Belum di dokumen fase di atas (next jelas):** `InteractionVolume`, manifest GLB, `AssetLibrary`, zones per Spot, gizmo object builder.

------------------------------------------------------------------------

# 🔗 REFERENSI DI REPO

- `CHANGELOG.md` — riwayat versi
- `TODO.md` — backlog + § Arsitektur 3D modular
- `SPRINT_LOG.md` — Sprint 5–8
- **`docs/RESOURCES_RESEARCH.md`** — kurasi link eksternal + prioritas riset/lanjut kode
- **`docs/LEARNINGS_LOG.md`** — log pembelajaran & observasi (Blender backbone, stack web, dll.)
- `src/world/World.js`, `src/world/spots/BogorSpotRuntime.js`, `src/core/Game.js`
