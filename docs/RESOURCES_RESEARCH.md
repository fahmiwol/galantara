# Galantara — Resource & arah riset

> Dokumen hidup: kurasi link + tema riset — stack web (**Three.js**, Socket.io, Supabase) **plus** alat authoring 3D (Blender, Meshy, dll.).  
> Update saat menemukan sumber baru yang **langsung dipakai** di jalan builder / Spot / commerce.  
> **Log harian / sintesis pembelajaran:** `docs/LEARNINGS_LOG.md` (mis. entri **2026-04-13**: sumber dibaca, observasi Blender-as-backbone, alternatif Babylon/PlayCanvas/Godot, dll.).

### Utara produk (selaras founder)

Kita **harus bisa sampai** ke **game engine** + **game builder** (bukan sekadar satu peta), dengan jalur **no-code + AI copilot** untuk user awam. Alat di §3 (Blender/bpy, Meshy, glTF, …) mengisi **supply chain** *mesh → aset → manifest → runtime web*. Lihat **`docs/GALANTARA_BUILDER_SYSTEM.md`** v1.3: § *Utara produk* + § *Visi creator*.

---

## 1. Apa yang bisa dilanjutkan di kode (prioritas dekat)

Urutan yang masuk akal untuk **interaction > visual** dan dokumen builder v1.1:

| Prioritas | Item | Kenapa |
|-----------|------|--------|
| P1 | **`InteractionVolume`** + satu aksi (bangku “duduk” / warung toast) | Jadi “betah” tanpa nambah mesh |
| P2 | **Zones per Spot** atau matikan hint Oola saat `BogorSpotRuntime` | Hilangkan cognitive mismatch |
| P3 | **`AssetLibrary` + load GLB** dari manifest JSON per Spot | Pintu ke creator + kontrol memori |
| P4 | **Schema map v1** (version field + migrasi ringan) | Save/load aman antar rilis |
| P5 | **Object builder**: gizmo move/rotate/scale | Lanjutan MapBuilder yang sudah ada |

Detail backlog: `TODO.md`, arsitektur: `docs/GALANTARA_BUILDER_SYSTEM.md`.

---

## 2. Tema riset berkelanjutan (bukan sekali baca)

- **Lifecycle WebGL** — pola dispose saat ganti Spot; cegah leak saat creator undo banyak kali.  
- **GLB pipeline** — kompresi (Draco/Meshopt), dedupe material, instancing untuk prop berulang.  
- **Social presence** — radius voice, cap concurrent per room, degradasi graceful (sudah sebagian).  
- **Authoring UX** — referensi “small hub” MMO / plaza games (bukan AAA open world).  
- **Supabase** — RLS untuk `spots` / map metadata; Storage untuk asset besar, bukan bytea di row.  
- **Engine abstraksi** — entity ID, spawn/despawn, sistem event per tick (bahkan sebelum UI builder lengkap).  
- **Builder contract** — versi file scene + rules; migrasi agar engine lama masih buka konten lama.

---

## 2A. Jadwal belajar — supaya **bisa bikin** (engine + builder)

Ini **bukan** kuliah teori panjang; urutan supaya otak dan repo sama jalurnya. Tiap fase: baca ringkas → **satu latihan kecil** yang bisa diverifikasi.

### Fase A — Runtime web (fondasi engine kamu sekarang)

| Langkah | Apa dipelajari | Latihan konkret (Galantara) |
|--------|----------------|-----------------------------|
| A1 | Scene graph + `dispose` | Baca: [How to dispose of Objects](https://threejs.org/manual/en/how-to-dispose-of-objects.html); telusuri `World.disposeContent` / `BogorSpotRuntime.dispose` — pahami *urutan* traverse. |
| A2 | Load glTF | Baca: [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader); spike: satu kotak GLB export Blender → load di scene terpisah (branch kecil). |
| A3 | Instancing | Baca: [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh); nanti: 10 kursi identik dari manifest tanpa 10 draw mesh penuh. |

### Fase B — Kontrak data (game **builder** mulai dari sini)

| Langkah | Apa dipelajari | Latihan |
|--------|----------------|---------|
| B1 | JSON map yang sudah ada | Buka `src/data/maps/default_oola.json` — tulis di catatan: *field apa yang “hukum” untuk engine v1*. |
| B2 | Versi + migrasi | Tambah `version: 1` di schema; dokumentasi 1 paragraf “kalau version beda, engine lakukan apa”. |

### Fase C — Studio pipeline (Blender **bukan** di browser)

| Langkah | Apa dipelajari | Latihan |
|--------|----------------|---------|
| C1 | **bpy** data & konteks | Baca: [Quickstart](https://docs.blender.org/api/current/info_quickstart.html) — fokus `bpy.data`, `bpy.context`, `bpy.ops`, lalu **best practice** & **gotcha** di menu yang sama dari [API index](https://docs.blender.org/api/current/). |
| C2 | Operator & poll | Di Quickstart: bagian *Operators* + `poll()` — pahami kenapa skrip gagal kalau mode objek salah (sama pentingnya dengan “context” di game). |
| C3 | Export otomatis | Satu skrip `.py` dijalankan `blender -b file.blend -P export_spot.py` yang mengeluarkan `spot_kit.glb` ke folder `dist/` (boleh spike lokal, tidak wajib commit dulu). |

### Fase D — Aset AI (Meshy) sebagai **supplier**, bukan mesin utama

| Langkah | Apa dipelajari | Latihan |
|--------|----------------|---------|
| D1 | REST task flow | Baca [Meshy quickstart](https://docs.meshy.ai/en/api/quick-start) + base `https://api.meshy.ai` — diagram di kertas: *request → poll → file*. |
| D2 | Hukum produk | Baca ToS/billing Meshy; catat: lisensi output untuk **komersial** Spot Galantara. |

### Fase E — “Engine” di dalam repo (abstraksi bertahap)

| Langkah | Apa dipelajari | Latihan |
|--------|----------------|---------|
| E1 | Spot = modul | Baca `SpotRuntime.js` + `BogorSpotRuntime.js` — tambah **satu** `animate` atau **satu** mesh tanpa pecah pola dispose. |
| E2 | Tick & sistem | Sebelum UI builder besar: satu modul `systems/TickBus.js` (pseudocode OK) yang memanggil `world.animate` + spot + (nanti) volume interaksi — **satu tempat** update per frame. |

### Kunci supaya tidak overwhelmed

1. **Pisahkan** “jam Blender” vs “jam browser” — jangan campur dalam satu sesi kerja.  
2. Setiap fitur baru di engine: **data dulu** (JSON), **render** belakangan.  
3. Ulangi mantra dokumen: **interaction > visual** — belajar Armory/GE lama = sejarah & batasan, bukan stack baru.

---

## 3. Resource teknis (kurasi)

### Three.js — memori, dispose, performa

- **How to dispose of Objects** — panduan resmi kapan memanggil `dispose()` pada geometry, material, texture, render target: https://threejs.org/manual/en/how-to-dispose-of-objects.html  
- **Cleanup** (manual terkait): https://threejs.org/manual/en/cleanup.html  
- **Catatan:** `scene.remove(mesh)` **tidak** membebaskan GPU; traverse subtree Spot lalu `geometry`/`material`/`texture` dispose saat unload level — selaras `World.disposeContent` / `BogorSpotRuntime.dispose`.

### Three.js — load asset & format

- **GLTFLoader** (dokumentasi): https://threejs.org/docs/#examples/en/loaders/GLTFLoader  
- **Khronos glTF 2.0 spec** (kontrak format): https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html  
- **glTF Transform** (CLI/lib kompresi & inspeksi asset, cocok untuk pipeline CI): https://gltf-transform.donmccurdy.com/

### Three.js — instancing & banyak objek sama

- **InstancedMesh** (docs): https://threejs.org/docs/#api/en/objects/InstancedMesh  
- Cocok untuk: pohon identik, lampu jalan, kursi warung copy-paste — setelah manifest Spot.

### Visual logic & no-code authoring (referensi produk)

- **[Construct 3](https://www.construct.net/en)** — logika **event sheet** (Kondisi → Aksi); referensi UX untuk **Logic builder** Galantara mode sederhana. Manual: [Construct 3 documentation](https://www.construct.net/en/make-games/manuals/construct-3).  
- **[Unity Visual Scripting](https://docs.unity3d.com/Packages/com.unity.visualscripting@latest/index.html)** — graf node; bandingkan dengan kebutuhan **mode lanjutan**.  
- **[Unreal Engine — Blueprints](https://docs.unrealengine.com/5.0/en-US/BlueprintsAndBlueprintVisualScriptingInUE5/)** — standar industri desainer level AAA; inspirasi, bukan stack web.

**Preferensi founder (2026-04-13):** lebih familiar dengan **Construct** daripada node Unity/Unreal — lihat `docs/LEARNINGS_LOG.md` § E.

### Spline.design — peta produk (AI + “game” / experience tanpa kode)

Referensi kompetitor / **bar UX** untuk Galantara: editor web, AI aset, lalu **states + events + actions** (bukan sekadar embed GLB).

| Lapisan | Isi singkat | Tautan |
|---------|-------------|--------|
| **AI 3D Generation V1** | Text → 3D (beberapa varian), image → 3D (foto depan), remix; dari dashboard atau editor | https://spline.design/ai — [AI 3D Generation (docs)](https://docs.spline.design/spline-ai/ai-3d-generation) |
| **Spell — AI 3D Worlds** | Eksperimental: gambar/teks → “world”; output **Gaussian Splatting**; antrian; harga/akses terpisah | [Spell (docs)](https://docs.spline.design/spline-ai/spell-ai-3d-worlds) — https://spell.spline.design/ — [blog announcement](https://blog.spline.design/introducing-spell) |
| **Spline AI lain** | AI textures, style transfer | [indeks Spline AI](https://docs.spline.design/) → bagian *Spline AI* |
| **Hana** | Kanvas 2D/3D + interaktivitas (effects, 3D shapes, export) | [What is Hana?](https://docs.spline.design/hana-a-canvas-for-interactivity/what-is-hana) |
| **Omma** | Produk terpisah: pengalaman dari bahasa alami (dipromosikan dari halaman AI) | https://omma.build/ |
| **Interaksi = “game builder”** | Event (mouse, key, scroll, jarak, **trigger area**, collision, **game controls**, …) + aksi (suara, video, variabel, conditional, transisi scene, spawn/destroy, webhook, real-time API, …) | [Events & Interactivity](https://docs.spline.design/interaction-states-events-and-actions/events-interactivity) — daftar lengkap: [Getting started / docs](https://docs.spline.design/) |
| **Export ke stack kita** | **GLTF/GLB**, viewer web, kode | [Exporting as GLTF/GLB](https://docs.spline.design/exporting-your-scene/files/exporting-as-gtlf-glb) |

**Untuk agen / crawl terstruktur:** https://docs.spline.design/llms.txt

**Paralel Galantara:** subset v1 = **trigger zona + variabel + conditional + aksi terbatas** (buka panel, teleport Spot, suara) — jangan meniru seluruh matriks event Spline sebelum kontrak data (`InteractionVolume` / rules JSON) stabil.

### Realtime & backend (stack kita)

- **Socket.io Rooms** (isolasi channel per Spot sudah selaras konsep ini): https://socket.io/docs/v4/rooms/  
- **Supabase Realtime** (untuk presence / notifikasi ke depan, selain Socket game): https://supabase.com/docs/guides/realtime  
- **Supabase Storage** (asset GLB / thumbnail): https://supabase.com/docs/guides/storage  

### Web platform (input & audio)

- **Gamepad API (MDN)** — kalau nanti stick/controller: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API  
- **Web Audio spatial** — referensi konsep (voice spatial sudah custom; ini untuk efek SU ke depan): https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API  

### Desain produk — “social plaza” kecil

- Riset kualitatif: game/kumpulan yang fokus **lobby kecil + aktivitas singkat** (bukan map besar kosong). Kumpulkan screenshot + 1 kalimat “kenapa betah” — bisa folder `docs/references/` nanti (screenshot lokal, bukan hotlink gambar).

### Blender & ekosistem (authoring → glTF → web)

Ringkasan setelah membaca portal resmi (bukan menggantikan dokumentasi mereka).

- **[Blender Developer Documentation](https://developer.blender.org/docs/)** — handbook membangun Blender dari source, modul fitur, Summer of Code, **release notes** & **compatibility**. Berguna untuk kontributor core Blender atau memahami breaking change yang mempengaruhi pipeline ekspor. **Galantara:** tim pakai Blender sebagai **DCC**; runtime tetap browser.

- **[Blender Python API (bpy) — current](https://docs.blender.org/api/current/)** — Index: [api/current](https://docs.blender.org/api/current/). Mulai dari **[Quickstart](https://docs.blender.org/api/current/info_quickstart.html)** (`bpy.data`, `bpy.context`, operator, contoh Panel/Operator), lalu **best practice** & **gotchas** dari sidebar yang sama. Unduh ZIP dokumentasi offline dari halaman index. Cocok untuk **addon / skrip batch** ekspor glTF. **Tidak** di klien game.

- **glTF 2.0 (ekspor resmi ke web)** — addon bawaan *glTF 2.0 format*: opsi material, animasi, kompresi; baca manual sebelum mengunci konvensi nama koleksi/object untuk manifest Spot: https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html

- **Geometry Nodes & tool** — procedural / reusable; **Node-based tools** (grup GN jadi alat menu): [Geometry Nodes](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/index.html), [Node-Based Tools](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/tools.html). Bukan “AI Spline” di dalam Blender; dipakai untuk variasi aset, kitbash, dan otomasi mesh **setelah** impor dari Meshy/Tripo/dll.

- **Pasca-mesh AI → game-ready** — alur umum: impor GLB/OBJ → bersihkan manifold/normal → UV & material PBR → **decimate** selektif → validasi di **[glTF Transform](https://gltf-transform.donmccurdy.com/)** → upload Storage. Spline **Spell** (Gaussian) beda format/use-case; untuk Galantara fase awat tetap **mesh + glTF** sebagai default.

- **[Blender 2.49 Game Engine API (arsip)](https://docs.blender.org/api/2.49/GE/index.html)** — dokumentasi mesin game lawas Blender. **Pelajaran produk:** jangan mengunci world builder ke runtime vendor yang bisa di discontinue; arsitektur kita **data-driven + Three.js** mengurangi risiko serupa.

### Meshy (AI mesh / REST)

- **[Meshy Docs](https://docs.meshy.ai/en)** (root: [docs.meshy.ai](https://docs.meshy.ai/)) — API REST prediktif, base URL `https://api.meshy.ai`, JSON, quickstart integrasi. **Galantara (nanti):** alur “task AI → GLB → [glTF Transform](https://gltf-transform.donmccurdy.com/) validasi → Supabase Storage → `GLTFLoader`”; wajib cek **ToS, atribusi, dan billing** sebelum produksi.

### Modeler ringan & latihan workflow

- **[Wings 3D — Documentation](https://www.wings3d.com/documentation/)** — proyek dokumentasi pengguna; manual terpusat di [User Manual](https://www.wings3d.com/?page_id=252). Modeler winged-edge, cocok **low poly** cepat. Output ke format lain lalu **glTF 2.0** untuk web.

- **[Dust3D — 10minuteseveryday](https://github.com/Dust3D-Modeling/10minuteseveryday)** — repo latihan model singkat harian (#10minuteseveryday). **Nilai:** kebiasaan mesh **ringkas** selaras prinsip *interaction > visual complexity*.

### Game engine Blender-integrated (beda stack — awareness)

- **[Armory3D / armory](https://github.com/armory3d/armory)** — mesin game dengan integrasi Blender. **Perbandingan dengan Galantara:** target kita **web social + builder data**; Armory menarget native/game loop lain — ide node/logic bisa diinspirasi, bukan dipindah stack.

### Fork UI Blender (studio build)

- **[Bforartists — Developer Docs](https://www.bforartists.de/developer-docs/)** — build Bforartists dari source (Windows/Linux), PDF tutorial editor/ikon/PR; basisnya mengikuti Blender. Relevan untuk **workflow artist di studio**, bukan bundle `galantara.io`.

---

## 4. Cara memakai dokumen ini di workflow AI

- Prompt singkat: *“Ikuti `docs/GALANTARA_BUILDER_SYSTEM.md` + `docs/RESOURCES_RESEARCH.md`; jangan scene.traverse per frame; dispose saat ganti Spot.”*  
- Saat spike baru (mis. GLB): tambahkan **1 paragraf + link** di §3, jangan duplikasi tutorial panjang di repo.

---

## 5. Log pembaruan

| Tanggal | Perubahan |
|---------|-----------|
| 2026-04-13 | Dokumen dibuat: prioritas lanjut, tema riset, kurasi link Three.js / glTF / Socket / Supabase / Web API. |
| 2026-04-13 | § Blender / Meshy / Wings3D / Armory / Bforartists / Dust3D / Blender 2.49 GE — ringkasan pembelajaran dari URL founder; Meshy: API `https://api.meshy.ai`; Blender API halaman menunjuk **Blender 5.1** Python docs. |
| 2026-04-13 | Utara **game engine + game builder** dijelaskan di `GALANTARA_BUILDER_SYSTEM.md` v1.2; §2 di sini + intro dirapatkan ke supply chain aset. |
| 2026-04-13 | § **2A Jadwal belajar** — kurikulum fase A–E (Three dispose/GLTF, JSON contract, bpy quickstart+CLI export, Meshy flow, modul engine di repo); link eksplisit ke [bpy Quickstart](https://docs.blender.org/api/current/info_quickstart.html). |
| 2026-04-13 | **`docs/LEARNINGS_LOG.md`** — ringkasan pembelajaran hari ini + tabel **Blender sebagai backbone produksi** vs **Three runtime**; tambahan: Babylon.js, PlayCanvas, Needle, Godot glTF, Mixamo, USD. |
| 2026-04-13 | § **Visual logic**: Construct (event sheet), Unity Visual Scripting, Unreal Blueprints; preferensi founder → **Kondisi–Aksi** dulu di Galantara. |
| 2026-04-13 | `LEARNINGS_LOG` § **E** — Construct vs Unity/Unreal; keputusan produk: mode sederhana = event-sheet, node = opsional. |
| 2026-04-13 | § **Spline + Blender pipeline** — tabel peta Spline (AI V1, Spell/Gaussian, Hana, Omma, events/actions, export GLB); `docs.spline.design/llms.txt`; perluasan Blender: manual **glTF 2.0 I/O**, Geometry Nodes + node-based tools, alur pasca-mesh AI → glTF Transform. |
| 2026-04-13 | **Tanpa tim art** — strategi substitusi (procedural, AI mesh, CC0 kit, instancing) dicatat di `LEARNINGS_LOG` § **G** + `AGENT_SHARED_KNOWLEDGE.md` intro; builder tidak boleh terblokir menunggu sculpt manual. |
