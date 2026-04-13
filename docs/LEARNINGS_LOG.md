# Galantara — Log pembelajaran & riset (kronologis)

> Catatan agen/founder: apa yang **sudah dipelajari** (baca dokumen resmi / diskusi), **bukan** daftar fitur jadi.  
> Update: tambah entri **tanggal** di atas; jangan hapus entri lama tanpa alasan.

---

## 2026-04-13 — Ringkasan hari ini (belum tercatat di satu tempat sebelum file ini)

### A. Dokumen & arah produk (ditulis / diperbarui di repo)

- **`GALANTARA_BUILDER_SYSTEM.md`**: v1.1 → **v1.2** (utara **game engine + game builder**, tabel lapisan render / engine / builder / platform) → **v1.3** (visi **no-code**, wizard, template, **13 pilar** tambahan: logic, UI, commerce, audio, kolab, moderasi, versi, l10n, analitik, dll.; **lapisan AI**; metrik no-code).
- **`RESOURCES_RESEARCH.md`**: kurasi Three.js / glTF / Socket / Supabase; § Blender–Meshy–Wings–Armory–Bforartists–Dust3D–Blender 2.49 GE; **§ 2A Jadwal belajar** (fase A–E); intro diselaraskan no-code v1.3; **§ Spline.design** (peta AI V1, Spell/Gaussian, Hana, Omma, events+actions = “game builder”, export GLB, `llms.txt`) + perluasan **Blender** (manual glTF I/O resmi, Geometry Nodes / node-based tools, alur pasca-mesh AI → glTF Transform).
- **`AGENT_SHARED_KNOWLEDGE.md`**: pointer ke builder v1.3 + RESOURCES + §2A.
- **`CHANGELOG.md`**: entri dokumentasi terkait.

### B. Sumber eksternal yang **sudah dibaca / di-fetch** (inti, bukan salinan penuh)

| Sumber | Inti pembelajaran |
|--------|-------------------|
| [developer.blender.org/docs](https://developer.blender.org/docs/) | Portal dev Blender: handbook build, modul, GSOC, **release notes** & compatibility. |
| [docs.blender.org/api/current](https://docs.blender.org/api/current/) | **bpy** Python API (versi dokumen: **Blender 5.1**); index + unduh ZIP offline. |
| [bpy Quickstart](https://docs.blender.org/api/current/info_quickstart.html) | `bpy.data` / collections, `bpy.context`, **operator + `poll()`**, contoh Operator & Panel, mathutils; data dibuat lewat `bpy.data.*.new`, bukan `Mesh()`. |
| [Blender 2.49 Game Engine API](https://docs.blender.org/api/2.49/GE/index.html) | Arsip; pelajaran: **jangan mengunci produk** ke runtime vendor yang dihentikan. |
| [docs.meshy.ai](https://docs.meshy.ai/) / [en](https://docs.meshy.ai/en) | REST API, base **`https://api.meshy.ai`**, quickstart integrasi. |
| [wings3d.com/documentation](https://www.wings3d.com/documentation/) | Modeler low-poly; manual user terpisah. |
| [github.com/armory3d/armory](https://github.com/armory3d/armory) | Engine game + integrasi Blender (stack lain, bukan web Galantara). |
| [bforartists.de/developer-docs](https://www.bforartists.de/developer-docs/) | Build Bforartists dari source, PDF workflow kontributor UI. |
| [Dust3D 10minuteseveryday](https://github.com/Dust3D-Modeling/10minuteseveryday) | Disiplin model ringkas harian. |
| [threejs.org manual dispose](https://threejs.org/manual/en/how-to-dispose-of-objects.html) | `dispose()` geometry/material/texture; remove dari scene ≠ bebas GPU. |

### C. Observasi founder (yang kamu sebut) — **Blender sebagai backbone** + yang kita tahu lebih

**Kenapa banyak alur builder menyentuh Blender**

- **Open source** + komunitas besar → tutorial & addon banyak.  
- **DCC lengkap** (model, UV, rig ringan, bake) → **ekspor glTF 2.0** jadi *lingua franca* ke web.  
- **bpy** memungkinkan **pipeline otomatis** (validasi, batch export, rename koleksi) di studio — backbone **produksi aset**, bukan backbone **runtime** di tab browser (runtime kita Three.js + data JSON).

**Stack umum di industri web 3D (selain Three.js)**

| Teknologi | Peran | Catatan untuk Galantara |
|-----------|--------|-------------------------|
| **WebGL** | API grafis di bawah Three | Sudah lewat `Renderer`; jarang sentuh langsung. |
| **[Babylon.js](https://www.babylonjs.com/)** | Alternatif engine web lengkap | Fitur editor built-in lebih agresif; trade-off bundle & filosofi tim. |
| **[PlayCanvas](https://playcanvas.com/)** | Engine web + editor online | Referensi UX **no-code**; bisa beda lisensi / hosting. |
| **[Needle Engine](https://needle.tools/)** | Unity → Three export | Pola “DCC besar → web”; inspirasi pipeline, bukan kewajiban. |
| **Godot** | Editor game open source | Banyak tim **model di Blender → export glTF → Godot**; paralel dengan Blender→Three. |
| **USD / Omniverse** | Interop enterprise | Berat untuk tahap Galantara sekarang; arah industri besar studio. |
| **Mixamo** (Adobe) | Rig + animasi humanoid cepat | Sering dipasangkan Blender untuk karakter; cek **lisensi** per proyek. |
| **glTF Transform** | CLI/lib kompresi & audit file | Sudah dirujuk di `RESOURCES_RESEARCH.md` — penting untuk **AI output** sebelum production. |
| **Khronos glTF** | Spesifikasi format | Satu format, banyak tool; **bukan** mengunci ke satu app. |

**Kesimpulan arsitektur Galantara:**  
**Backbone produksi** = Blender (opsional) + skrip + glTF + (opsional) AI **Meshy**.  
**Backbone runtime web** = **Three.js + data** (SpotRuntime, manifest) — supaya **creator & player** tidak bergantung pada instalasi Blender di mesin pemain.

**Link cepat (alternatif / referensi stack):**

- https://www.babylonjs.com/  
- https://playcanvas.com/  
- https://needle.tools/  
- https://godotengine.org/  
- https://www.mixamo.com/ (Adobe — cek syarat lisensi)  
- https://www.khronos.org/gltf/  

### E. Preferensi founder — **Construct** vs Unity / Unreal (visual scripting)

**Konteks industri:** **Unity** dan **Unreal** memang paling dikenal publik; keduanya menonjolkan **visual scripting** berbasis **graf node** (kabel antar blok).

**Preferensi kamu:** lebih sering memakai **Construct** untuk logika game — pola utamanya **lembar peristiwa** (*event sheet*): baris **Kondisi → Aksi** (mirip kalimat), sangat cocok orang yang **tidak** ingin berpikir dalam graf kabel besar di awal.

**Implikasi untuk Galantara (Logic / Behavior builder no-code):**

| Paradigma | Contoh produk | Cocok untuk |
|-----------|----------------|-------------|
| **Event sheet** (baris Kondisi–Aksi) | [Construct 3](https://www.construct.net/en) | User awam, logika sederhana bertumpuk, bahasa Indonesia di label kartu. |
| **Node graph** (kabel) | [Unity Visual Scripting](https://docs.unity3d.com/Packages/com.unity.visualscripting@latest/index.html), [Unreal Blueprints](https://docs.unrealengine.com/5.0/en-US/BlueprintsAndBlueprintVisualScriptingInUE5/) | Power user, alur bercabang kompleks; bisa jadi **mode lanjutan** nanti. |

**Keputusan arah (catatan produk):** utamakan **event-sheet / kartu “Kalau–Maka”** seperti Construct untuk **mode Sederhana**; node graph (gaya Unity/Unreal) **opsional** atau fase belakang — selaras `GALANTARA_BUILDER_SYSTEM.md` v1.3 (logic builder tanpa kode).

**Link referensi cepat**

- https://www.construct.net/en  
- https://www.construct.net/en/make-games/manuals/construct-3 (dokumentasi manual C3)  
- https://docs.unity3d.com/Packages/com.unity.visualscripting@latest/index.html  
- https://docs.unrealengine.com/5.0/en-US/BlueprintsAndBlueprintVisualScriptingInUE5/  

### D. Tindakan lanjut (bukan pembelajaran, tapi keluaran hari ini)

- Kode: Spot modular, Bogor POC, multiplayer room, warp, `worldRoot` dispose, dll. (detail di `CHANGELOG.md`).

### F. Spline (eksplorasi) + Blender — **saran arah**, bukan salinan docs

**Spline** mengikat tiga hal sekaligus: **AI aset** (text/image → mesh; Spell → world / Gaussian), **canvas** (Hana), dan **logic no-code** yang sebenarnya luas (**states + events + actions** + variabel + API/webhook). Itu patokan **bar UX**; detail URL ada di `docs/RESOURCES_RESEARCH.md` § *Spline.design* — **jangan** menggandakan tabel panjang di log ini.

**Saran produk Galantara:** jangan berpacu mengejar **seluruh** matriks event Spline di v1. **Subset** yang sejajar filosofi § E: **zona/trigger + beberapa aksi + variabel + conditional** + export/publish Spot; AI mesh lewat supplier (Meshy/dll.) + **rapih di Blender** (UV, PBR, decimate, **glTF I/O** + **glTF Transform**) sebelum runtime.

**Saran dokumen:** `LEARNINGS_LOG` = *narasi + keputusan*; `RESOURCES_RESEARCH` = *kurasi link + tabel referensi*. Kalau nambah riset baru: **1 paragraf di log** + **link cluster di RESOURCES** — cukup.

### G. Kendala operasi — **tanpa tim art** (Blender / model 3D)

**Konteks (2026-04-13, founder):** proyek hanya **founder + asisten AI** — tidak ada desainer/artist yang memproduksi mesh di Blender secara rutine. Tujuan produk tetap: **builder**, **objek**, **dunia**, **avatar custom** — setara “punya tim” dari sisi **kapabilitas yang dijual ke user**, bukan dari sisi **headcount studio**.

**Keputusan arah (substitusi tim art):**

| Jalur | Fungsi | Catatan |
|--------|--------|---------|
| **Procedural + archetype** (sudah ada) | `proceduralMeshFactory` / Generator3D — bangun bentuk dari parameter, bukan sculpt | Ini **tulang punggung** v1; kualitas naik lewat **preset**, **palet**, **variasi seed**, bukan model unik per frame. |
| **Kit + reuse** | Sedikit mesh “hero” (GLB), banyak **instancing** + variasi material/skala | Satu bangku / gerobak dipakai 20× dengan warna beda = dunia terasa penuh tanpa 20 file unik. |
| **AI mesh (Meshy, Tripo, dll.)** | Prompt → GLB → **validasi** (poly, UV) → manifest | **Supplier** menggantikan modeler junior; founder fokus **prompt + kurasi + ToS**. |
| **Aset CC0 / store** | Kenney, Poly Pizza, Khronos sample, dll. | Cek lisensi per paket; konsistenkan gaya lewat **post-process material** (roughness, warna). |
| **Tampilan “mahal” tanpa mesh mahal** | Cahaya, fog, UI, partikel ringan, audio | Sering lebih ROI daripada mengejar sculpt detail. |
| **Wizard user** | “Pilih template Spot → parameter” | User awam tidak butuh Blender; mereka butuh **varian** dari kit yang kita kurasi. |

**Implikasi untuk agen / roadmap:** jangan menganggap **Blender manual** sebagai blocker release; anggap **data + pipeline + preset** sebagai produk. Blender/bpy = **opsional** untuk merapikan hasil AI atau menyatukan kit, bukan gate untuk setiap fitur builder.

---

## Cara menambah entri baru

```markdown
## YYYY-MM-DD — Judul singkat

### Yang dibaca / dipelajari
- ...

### Kesimpulan / keputusan
- ...
```
