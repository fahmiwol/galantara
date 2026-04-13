# Galantara — Style Contract & dokumen alignment (v0)

**Tanggal:** 2026-04-13  
**Sumber:** `galantara_world.md` (v1), `galantara_world_v2.md` (v2), `galantara_master_v3.md` (v3), `galantara_master_v4.md` (v4), referensi visual proyek (`assets/…png`), kode repo `D:\Projects\Galantara`.

---

## 1. Jalur visual utama (wajib konsisten)

**Nama gaya produk:** *Galantara Soft City* (bukan voxel LEGO, bukan fotorealisme).

| Aspek | Kontrak | Catatan |
|--------|---------|---------|
| Geometri | Stylized **low–mid poly**, **siluet tebal**, **bevel halus** pada bentuk organik & prop | Mirip referensi kota senja + pulau + shrine isometrik; hindari detail frekuensi tinggi. |
| Permukaan | **Matte / semi-matte**, PBR `roughness` tinggi (≈0.65–0.9), `metalness` rendah (≈0–0.15) kecuali aksen emas/kaca | Sudah dekat dengan `MeshStandardMaterial` di `World.js` (`roughness` ~0.7–0.8). |
| Proporsi | **Diorama / toy world**, sedikit **chibi**; landmark boleh lebih besar dari skala “real” | Selaras header `World.js`: *Soft · Bubbly · Playful · Low Poly · Semi-3D · Chibi*. |
| Warna | **Hangat dominan** + aksen hijau/toska air; saturasi **tinggi tapi harmonis** (bukan abu-abu cinematic) | Avatar preset & `SPOTS[].theme` di `config.js` — jadikan subset dari palet dunia. |
| Cahaya | **Golden hour** sebagai referensi emosional; siklus hari mengikuti jam lokal | `DayNight.js` + `Renderer.js` (matahari `0xfff4c0`, ambient hangat). |
| Perspektif gameplay | **Semi-isometrik / orbit tinggi** (bukan FPS) | Sesuai kamera saat ini (`PHI_*`, `CAM_RADIUS` di `config.js`). |

### 1.1 Varian yang **bukan** inti (opsional / skin pack)

- **LEGO / plastic brick** (satu referensi gambar): hanya boleh jika dipaketkan sebagai **tema terpisah** (`theme_id: lego_compat`) dengan material & grid snap sendiri — **tidak** dicampur bebas dengan *Soft City*.

---

## 2. Parameter numerik (token — untuk tools & generator)

Selaraskan dengan **v1 scale** di mana masuk akal untuk konten kota; hub **Oola** boleh tetap skala “pulau tutorial” sampai Monas scene ada.

| Token | Nilai v1 (dokumen) | Repo saat ini | Aksi |
|--------|-------------------|---------------|------|
| `unit_world` | 1 unit = **1 m** | Diasumsikan sama untuk movement | Tetap |
| `tile_size` | **4 m** (grid modular) | Belum ada grid data | Tambah saat map builder / Monas |
| `monas_bounds` | **64×64 m**, **16×16** tile | — | Scene terpisah atau chunk |
| `poly_budget_prop_small` | v1: **≤ 5k** tri per asset kecil | Belum diverifikasi di pipeline | Linter asset nanti |
| `poly_budget_avatar` | TBD (rendah, konsisten NPC) | NPC/avatar primitive | Naik saat pakai GLB |

**Material token (contoh — diselaraskan dengan kode):**

- `grass`: `#7BC67E` family (`World.js` ground)
- `water`: toska transparan (`0x38BDF8`, opacity ~0.7)
- `wood_trunk`: `#6B3F1A`
- `accent_purple` (Oola landmark): `#7C3AED` … (canopy layers)

---

## 3. Indikator kualitas / “style pass”

Alat atau skrip validasi nanti harus bisa menghitung / menampilkan:

1. **Palette adherence** — % warna material yang masuk tabel palet Galantara (+ spot theme).
2. **Roughness / metalness compliance** — tidak ada metalness tinggi kecuali tag `metal_accent`.
3. **Scale compliance** — bbox dalam rentang per kategori (`prop`, `building`, `landmark`).
4. **Triangle budget** — per kategori vs v1/v3.
5. **Silhouette simplicity** — heuristik kerapatan vertex / sudut tajam (opsional).

---

## 4. Alignment: dokumen Downloads ↔ repo

### 4.1 `galantara_world.md` (v1)

| Item | Status repo |
|------|-------------|
| Konsep jaringan kota / diorama | Selaras `IDEATION.md` + `World.js` (pulau Oola). |
| Scale 1m, tile 4m, Monas 64m | **Belum** data tile / scene Monas; Oola radius `ISLAND_R = 18` (`config.js`) — beda skala hub. |
| Asset `.glb` (monas, warung, …) | **Belum** — dunia saat ini **procedural mesh** di `World.js`. |
| Interaksi kursi / warung / NPC | NPC + zona **F** / **E** ada; duduk / warung UI **parsial / roadmap**. |
| World map kota | **SPOTS** di `config.js` (Monas, Kuta, Malioboro, …) — selaras. |

### 4.2 `galantara_world_v2.md` (v2)

| Item | Status repo |
|------|-------------|
| Feel: tenang, hangat, intimate, slow | Didukung lighting & warna; konten gameplay “slow life” masih dibangun. |
| Struktur Indonesia → kota → spot | `SPOTS` + copy NPC; belum world map visual besar. |
| Lighting warm / sore | `DayNight.js` fajar & senja; sun warm di `Renderer.js`. |
| Asset: low poly, rounded, soft, matte, pastel | **Intent** tertulis di `World.js`; generator/prompt v4 harus mengikuti kontrak §1–2. |

### 4.3 `galantara_master_v3.md` (v3)

| Item | Status repo |
|------|-------------|
| Stack Three.js + Supabase | **Ada** (`Game.js`, auth, config URL/anon). |
| AI pipeline Meshy / Spline | **Belum** terautomasi di repo; tetap manual / eksternal. |
| Folder `/assets/models` | Struktur v3 ideal; saat ini fokus `src/` + sedikit `assets/` screenshot — **models GLB massal belum**. |

### 4.4 `galantara_master_v4.md` (v4)

| Item | Status repo |
|------|-------------|
| Prompt library | Gabung ke §6 + template prompt wajib menyertakan token §1–2. |
| MVP checklist | Sebagian terlewati (scene, movement, multiplayer tamu); interaksi duduk / GLB massal masih terbuka. |
| “Build fast” | Tetap; **style contract** mencegah utang visual saat AI scale-up. |

---

## 5. Referensi visual (file di repo)

Gunakan sebagai **golden reference** untuk review asset & lighting:

- `assets/c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_*.png`  
  (kota senja Monas-style, kampung low-poly, pantai, shrine isometrik, pulau tropis, floating island, desa golden hour)

Semua mengarah ke **§1**; yang bertabrakan (LEGO) → **§1.1**.

---

## 6. Prompt wajib (turunan v4 + kontrak)

Setiap generate (AI atau vendor) wajib menyertakan frasa inti:

> `stylized low poly indonesia, soft rounded edges, matte PBR, warm golden hour lighting, toy diorama scale, chunky silhouettes, no photorealism, no lego bricks unless theme lego_compat`

Tambahkan **kategori** + **poly budget** + **nama spot** (`monas`, `kuta`, …) agar warna aksen bisa dipetakan ke `SPOTS[].theme`.

---

## 7. Langkah implementasi berikutnya (urut)

1. **`src/data/styleTokens.js`** — ✅ v0.5.10: palet slot + material helper; dipakai **3D Generator** procedural.
2. **Scene Monas** — data grid 4m + zona v1; load `monas.glb` ketika asset siap.
3. **Asset linter** (CLI atau checklist) — §3 sebelum merge ke `assets/models`.
4. **God mode / map JSON** — simpan placement + tile flags; hot reload.

---

## 8. Changelog dokumen ini

| Versi | Isi |
|--------|-----|
| v0 | Konsolidasi v1–v4, referensi gambar, mapping kode, kontrak visual utama. |

Dokumen ini adalah **single source of truth** untuk arah visual sampai digantikan `v1` resmi berikutnya.
