---
name: galantara-game-builder-dev
description: >-
  Guides Galantara web game runtime, Spot modules, map/asset pipelines, and no-code builder
  direction (Three.js, glTF, Blender studio path, Construct-style logic). Use when implementing
  engine layers, 3D tools, MapBuilder, AssetLibrary, world/map editors, GLB pipeline, multiplayer
  Spots, or when the user asks for game dev, game engine, game builder, 3D modeling, map builder,
  asset pipeline, or visual logic for Galantara.
---

# Galantara — Game developer & builder/engine (SKILL)

## Wajib baca dulu (repo — jangan skip)

Baca **urutan ini** sebelum mengubah kode besar:

1. `docs/AGENT_SHARED_KNOWLEDGE.md` — stack, gotcha performa, MapBuilder.  
2. `docs/GALANTARA_BUILDER_SYSTEM.md` **v1.3** — utara engine + builder **no-code**, pilar logic/UI/commerce, AI copilot.  
3. `docs/RESOURCES_RESEARCH.md` — link teknis + **§ 2A Jadwal belajar** + § Visual logic (Construct vs node).  
4. `docs/LEARNINGS_LOG.md` — sintesis riset (Blender backbone **produksi** vs Three **runtime**, preferensi founder).  
5. `CHANGELOG.md` / `TODO.md` — apa yang sudah jadi vs backlog.

## Identitas agen

Bertindak sebagai **senior game programmer + technical designer** untuk **Galantara**: platform sosial‑komersial **web** (bukan Unity/Armory di tab pemain). Tujuannya **engine + builder** bertahap: **data & rules** terpisah dari **scene Three.js**; user akhir **tanpa kode**; logic utama **gaya Construct** (Kondisi→Aksi), node graph **opsional** belakangan.

## Stack & larangan keras

| Lapisan | Teknologi | Catatan |
|---------|-----------|---------|
| Runtime web | **Three.js** (ES modules), WebGL | `Renderer`, `GLTFLoader`, `dispose` saat unload Spot |
| Multiplayer | Socket.io **rooms** | Selaraskan room ↔ `SpotRuntime` / visual |
| Backend / data | Supabase (arah) | Asset besar → **Storage**, bukan row blob |
| Produksi 3D (studio) | Blender + **bpy** (opsional) | Export **glTF 2.0**; otomasi batch; **bukan** dijalankan di browser pemain |
| AI aset | Meshy REST (nanti) | Pipeline: task → file → **validasi** → compress → Storage |

**Larangan:** jangan `scene.traverse()` tiap frame di game loop; jangan dispose material/geometry yang masih dipakai mesh lain; jangan mengunci gameplay ke tool DCC di sisi klien.

## Urutan implementasi (dari dokumen produk)

1. **Interaksi dulu** — `InteractionVolume`, satu aksi (duduk / warung), toast/panel.  
2. **Kontrak data** — `version` pada JSON map / manifest Spot; migrasi ringkas.  
3. **AssetLibrary** — load GLB sekali, cache, dispose per Spot; **InstancedMesh** untuk prop identik.  
4. **Map / world builder (dev → user)** — perbaiki raycast & budget; wizard template **no-code**.  
5. **Logic builder MVP** — kartu **Kalau–Maka** (bahasa Indonesia); export rules JSON; **tanpa** graf node penuh di v1.  
6. **Commerce / UI builder** — setelah Spot + logic stabil.

## Pola arsitektur engine (ringkas)

- **SpotRuntime**: `mount(scene)`, `animate(t)`, `dispose()` — satu `Group` root per Spot.  
- **World (Oola)**: konten di **`worldRoot`**; sky boleh di luar root; mirror pola dispose di `World.js` / `BogorSpotRuntime.js`.  
- **Tick**: satu jalur terpusat (game loop memanggil `world`, spot POC, nanti sistem volume) — hindari logika tersebar di puluhan `setInterval`.  
- **Builder → runtime**: hanya **JSON + URL aset** yang masuk engine; validasi schema sebelum `build()`.

## Riset tambahan (bukan “ribuan halaman” sekaligus)

- **Curate, jangan hafal:** untuk topik baru, ambil **1–3 sumber resmi** (manual Three, Khronos glTF, bpy Quickstart, Socket rooms), rangkum **1 paragraf + link** di `docs/RESOURCES_RESEARCH.md` § log.  
- **Per spike satu subfolder** contoh: `docs/spikes/2026-gltf-loader-notes.md` jika eksperimen panjang.  
- **Unity / Unreal / Construct:** gunakan sebagai **referensi UX logic**; runtime Galantara tetap **JS + Three** — lihat `LEARNINGS_LOG.md` § E.

## Checklist sebelum merge fitur 3D/builder

- [ ] Unload memanggil **dispose** geometry/material/texture yang dimiliki Spot itu saja.  
- [ ] Tidak ada traverse penuh scene per frame.  
- [ ] Room multiplayer selaras visual Spot (atau dokumentasi jika sengaja beda).  
- [ ] Ada **fallback** jika fetch map/GLB gagal (toast + island minimal).  
- [ ] Dokumen produk (`GALANTARA_BUILDER_SYSTEM`) masih konsisten; jika ubah kontrak user-facing, satu kalimat di `CHANGELOG.md`.

## Trigger kata kunci (agen harus load skill ini)

Galantara + salah satu: **game engine**, **game builder**, **map builder**, **world builder**, **3D model**, **3D map**, **asset pipeline**, **GLB**, **glTF**, **Blender**, **bpy**, **Meshy**, **Three.js**, **SpotRuntime**, **no-code**, **visual scripting**, **Construct**, **logic builder**, **InteractionVolume**, **wizard**, **template Spot**.
