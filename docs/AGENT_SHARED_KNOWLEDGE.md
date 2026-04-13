# AGENT SHARED KNOWLEDGE - Galantara

Platform: Social-Commerce Hyperlocal Digital Market (Pasar Malam Digital).
Tech Stack: Three.js (Vanilla ES Modules), Supabase, Socket.io.

**Utara produk:** **game engine** + **game builder** no-code (wizard, template, AI copilot) — lihat `docs/GALANTARA_BUILDER_SYSTEM.md` **v1.3** (§ *Utara produk*, § *Visi creator*). Riset & link: `docs/RESOURCES_RESEARCH.md` + **§ 2A Jadwal belajar**. **Log sintesis harian:** `docs/LEARNINGS_LOG.md`.

## Kendala operasi — tanpa tim art (founder + AI saja)

Tidak ada artist full-time untuk **Blender / sculpt / texture custom**. Strategi default proyek:

1. **Procedural + archetype** (`proceduralMeshFactory`, Generator3D) sebagai sumber bentuk utama.  
2. **Reuse + instancing** — sedikit aset “hero”, banyak variasi (material, skala, seed).  
3. **AI mesh API** (Meshy, dll.) + validasi ringan + masuk **manifest** / `AssetLibrary` — menggantikan modeler junior.  
4. **Aset CC0 / kit** bila perlu mesh siap pakai — lisensi dicek.  
5. **Polish non-mesh** — cahaya, UI, audio — untuk “rasa produk” tanpa mengejar sculpt.

**Agen:** jangan memblok fitur builder dengan “tunggu model Blender dulu”; utamakan **data, preset, wizard**, dan integrasi **AI / procedural**. Rujuk `docs/LEARNINGS_LOG.md` § **G** (2026-04-13).

## 🛠️ Current Project Activity (2026-04-13)

### Deploy & Spot UX (sesi sama)
- **CI deploy:** push `main` → GitHub Actions `deploy-vps.yml` → `rsync` ke `/www/wwwroot/galantara.io/` (Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `REMOTE_PATH`). Workflow strips CRLF from the PEM secret and probes SSH before rsync.
- **Spot warp portal:** `src/world/spotWarpPortal.js` (global `THREE` only) + `InteractionVolume` on Monas/Bogor opens `map-panel`; new spots should reuse the same pattern.
- **Spot-aware chrome:** `Game._applySpotChrome()` updates `hud-spot`, chat tab label, and `#bb-spot-pill` so Monas/Bogor sessions do not still read “Oola” everywhere.

### Game Builder & 3D Tools Sprint (v0.6.0)
**Owner:** Antigravity (Assistant)
**Status:** COMPLETED ✅

**Objectives Achieved:**
- **Map Builder (God Mode)**: Implementasi `src/tools/MapBuilder.js` untuk penempatan objek real-time dengan grid snapping.
- **Data-Driven World**: `World.js` telah direfaktorisasi untuk memuat data map dari JSON (`src/data/maps/default_oola.json`).
- **Enhanced Asset Factory**: Menambah 4 archetypes Indonesia: `gerobak_bakso`, `gazebo_bambu`, `pagar_kayu`, `pohon_kelapa`.

**New Modules:**
- `src/tools/MapBuilder.js`: Menangani raycasting, ghost preview, dan penempatan objek.
- `src/data/maps/default_oola.json`: Manifest data dunia pertama (Oola).

---

## 📚 Resource & riset (kurasi)

- **`docs/RESOURCES_RESEARCH.md`** — link teknis (dispose Three.js, glTF, Socket rooms, Supabase) + prioritas lanjut kode; update seiring spike.

---

## 🏗️ Architecture Patterns

### 1. Asset Pipeline
Assets follow a "Dual Layer Architecture" (PRD Bab 8):
- **Model Layer**: `.glb` file or **Procedural Generator**.
- **Logic Layer**: `manifest.json` + `handler.js` for behavior.

### 2. World System
- **Dynamic Loading**: Gunakan `world.init(path)` lalu `world.build()`.
- **Grid-based**: Penempatan objek disarankan snap ke 0.5 unit.
- **Coordinates**: Y-up, XZ-plane untuk mapping.
- **Camera**: Spherical, phi clamped (18-76 deg).
- **Spot visual POC (v0.6.6):** `spotVisualRegistry.js` — saat ini **bogor** & **monas**; `Game._spotRuntime` + manifest `assets/spots/<id>/manifest.json`. Sebelumnya hanya Bogor hardcoded.

### 3. State Management
- `Zustand` on HUD (React-like logic in Vanilla UI).
- `Game.js` as the main orchestrator (Singleton pattern). `window._game` tersedia untuk debugging.

---

## ⚠️ Known Gotchas & Rules
- **DO NOT** use `scene.traverse()` in `Game.js` loop (performance).
- **Multiplayer**: Guests can move but not chat/voice (Socket.io).
- **Placement Mode**: Aktifkan lewat `G_UI.placeInWorld()`. Klik kiri untuk pasang, `ESC` atau ganti panel untuk batal.

---

## 📜 Log Handover

| Date | Agent | Action | Result |
|---|---|---|---|
| 2026-04-13 | Antigravity | Implemented Builder & Assets | v0.6.0: Data-driven world, MapBuilder, and Indo assets. |
| 2026-04-13 | Cursor | (Active in parallel) | Beware of file overlaps. |
| 2026-04-13 | Cursor | v0.6.3 InteractionVolume + AssetLibrary manifest | Zona warung/bangku Bogor + **[F]**; GLTFLoader via `main.js`; manifest kosong siap isi GLB. |
| 2026-04-13 | Cursor | Kendala **tanpa tim art** | Catatan di intro + `LEARNINGS_LOG` § **G**: procedural + AI mesh + kit reuse sebagai substitusi tim desain. |
| 2026-04-13 | Cursor | v0.6.5 avatar + map export | Warna avatar `localStorage`; `procedural_props` di map + load di `World`; `G_UI.exportMap()` unduh JSON. |
| 2026-04-13 | Cursor | v0.6.6 Monas + registry | `spotVisualRegistry`; `MonasSpotRuntime`; `Game._spotRuntime` menggantikan `_bogorSpot`. |
