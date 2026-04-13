# GALANTARA — To-Do & Backlog
> Diupdate setiap sesi. Prioritas berdasarkan dampak terbesar untuk user + revenue.
> Update terakhir: **2026-04-13** (tambah proposal arsitektur 3D modular — review founder)

---

## 🔴 Mighan Coin & wallet — **BELUM SELESAI** (eksplisit)

> Dicatat ulang 2026-04-13 (Cursor): fitur koin & dompet **belum** selesai; jangan anggap sudah jalan di produksi.

- [ ] **Wallet / saldo di game** — HUD “Token” masih placeholder; tidak ada sync saldo EMAS/PERAK/PERUNGGU/BERLIAN dari backend.
- [ ] **Ledger Mighan** — connect API ledger ke `galantara.io` (lihat Sprint 7); repo lokal `bank-tiranyx-temp/` saat ini **tidak** memuat stack ledger lengkap — cek VPS / repo Tiranyx jika ledger hidup di sana.
- [ ] **Top-up & payment** — Midtrans/Xendit belum di UI.
- [ ] **Schema DB** — migrasi Supabase (`supabase/migrations/`) sudah dirancang; **`supabase db push` / wiring app** belum diselesaikan di sesi ini.

**Rujukan:** `docs/GALANTARA_EKONOMI_KOIN.md`, PRD Bab 6, `TODO.md` § Sprint 7 di bawah.

---

## 🔴 URGENT — Harus Selesai Minggu Ini

- [ ] **Perpanjang VPS Hostinger** — batas periode tercatat **2026-04-23**; founder bayar/renew rencana **2026-04-20** (masih oke jika selesai tepat waktu)
- [x] **Deploy statis otomatis** — push `main` → GitHub Actions `deploy-vps.yml` (Secrets SSH) menggantikan upload manual berkala untuk `index.html` / `src/` / `data/`.
- [ ] Upload Sprint 4 ke VPS (Chat + Voice + Ghost avatar fix):
  ```powershell
  scp D:\Projects\Galantara\index.html root@72.62.125.6:/www/wwwroot/galantara.io/
  scp D:\Projects\Galantara\src\ui\Chat.js root@72.62.125.6:/www/wwwroot/galantara.io/src/ui/
  scp D:\Projects\Galantara\src\multiplayer\VoiceChat.js root@72.62.125.6:/www/wwwroot/galantara.io/src/multiplayer/
  scp D:\Projects\Galantara\src\core\Game.js root@72.62.125.6:/www/wwwroot/galantara.io/src/core/
  scp D:\Projects\Galantara\galantara-server\index.js root@72.62.125.6:/www/galantara-server/
  # Lalu SSH: pm2 restart galantara-mp
  ```
- [ ] Test ghost avatar fix — buka 2 tab, switch tab, cek apakah masih muncul duplikat
- [ ] Test voice chat — 2 browser, login, dekat-dekatan, cek volume falloff

---

## 🟡 Sprint 5 — Spot Monas + Mapbox

### World / Instance
- [x] Room Socket.io per Spot (`oola` vs `spot:<id>`) + warp klien + deep link `?spot=` (v0.6.1)
- [x] Warp transition — fade overlay (load scene 3D per Spot = backlog teardown `World`)
- [x] **SpotRuntime / modular scene** — `worldRoot` + `disposeContent` / `BogorSpotRuntime` (v0.6.2); manifest GLB = next
- [x] Scene POC satu Spot — **Bogor** mesh ringkas (warung + bangku); GLB kit = next
- [ ] JSON schema Spot — loader dinamis + manifest asset (bukan hanya `default_oola.json`)
- [ ] Travel fee dummy UI (debit Perak — billing beneran Sprint 7)

### Map
- [ ] Mapbox GL JS integration — peta Indonesia interaktif
- [ ] Marker per Spot yang aktif di peta
- [ ] Klik marker → info Spot → tombol warp

---

## 📐 Arsitektur 3D modular — **proposal co-founder (minta review)**

> Tujuan: pecah `World.js` + `Game.js` supaya **interaction > visual**, file kecil, lifecycle jelas.  
> Tiga arah kreatif + satu arsitektur disarankan sudah dijabarkan di chat Cursor terbaru; ringkasannya di sini sebagai backlog.

### Arah kreatif (pilih / campur)
1. **Spot = modul runtime** — tiap Spot = kelas `SpotRuntime` dengan `mount(scene)`, `animate(t)`, `dispose()`; root `Group` per Spot; `Game` hanya swap modul saat warp.
2. **Social graph first-class** — `SocialNode` (warung, bangku, panggung) + `InteractionVolume` (sphere/box); satu registry event (`onApproach`, `onUse`); NPC = node khusus.
3. **Asset kit GLB + manifest** — `assets/manifest.json` per Spot (url, pos, scale, `instanced: true`); `AssetLibrary` cache `GLTFLoader`; procedural tetap fallback.

### Arsitektur disarankan (layer tipis)
- `src/engine/` — resize, clock, stats opsional, batas draw calls
- `src/world/SpotRuntime.js` + `src/world/spots/OolaSpot.js` (dll.) — satu file per Spot atau per “kit”
- `src/world/AssetLibrary.js` — load/dispose GLB, dedupe material/geometry
- `src/interaction/` — volume + prompt UI (bukan cuma `Zones.js` string id)
- `World.js` — orchestrator tipis atau dihapus bertahap; JSON map → factory

### To-do teknis (urutan masuk akal)
- [x] Ekstrak `rootGroup` dunia dari `World` — `worldRoot` + `disposeContent` (v0.6.2)
- [x] `BogorSpotRuntime` + wiring `Game` warp / URL / logout (v0.6.2)
- [x] `AssetLibrary` + manifest `assets/spots/bogor/manifest.json` (siap isi `glbs[]`; GLTFLoader dimuat dari CDN) — v0.6.3
- [x] Interface `ISpotRuntime` formal (`SpotRuntime.js` typedef) + **Monas** POC + `spotVisualRegistry.js` — v0.6.6
- [x] `InteractionVolume` minimal: overlap avatar → HUD hint + **[F]** aksi (warung / bangku Bogor POC) — v0.6.3
- [ ] Budget per frame: freeze shadow updates di mesh statis; `frustumCulled`; hindari `scene.traverse` per frame

---

## 🟡 Sprint 6 — Avatar & Visual Polish

- [x] Avatar warna persist per perangkat (`localStorage` + panel profil / tamu) — v0.6.5; sync Supabase = nanti
- [ ] `MeshToonMaterial` cel-shading — chibi look lebih khas
- [ ] Fog color pasar malam: `0x1a0a2e`
- [ ] Nametag remote player lebih stabil (3D label yang tidak goyang)
- [ ] Emote system — wave, dance, sit (keyboard shortcut Z/X/C)
- [ ] Freeze NPC saat dialog dibuka (bug: NPC masih jalan)

---

## 🟡 Sprint 7 — Mighan Coin & Commerce

- [ ] Connect `bank-tiranyx` ledger ke galantara.io
- [ ] Top-up flow UI dengan Midtrans/Xendit
- [ ] Travel fee live (debit Perak saat masuk Spot luar radius)
- [ ] Booth basic — merchant listing produk
- [ ] COD radius check (GPS + IP verify)
- [ ] Wallet panel di HUD — tampilkan saldo Perak/Berlian

---

## 🟢 Sprint 8 — Object "Jiwa" System

- [ ] Programmable Object SDK spec di-freeze (breaking changes setelah ini tidak boleh)
- [ ] Door object: `free` / `paid(n coins)` / `token-gated`
- [ ] NPC object: dialog via JSON config (bukan hardcode)
- [ ] Booth object: e-commerce integration hook
- [ ] `G.registerModule({...})` API stable
- [ ] Sandbox mode — test spot tanpa publish ke prod

---

## 🟢 Sprint 9 — Developer Ecosystem

- [ ] `dev.galantara.io` portal — API docs + SDK download
- [ ] Plugin lifecycle: build → upload → auto-scan → deploy ke Spot
- [ ] Asset submission form
- [ ] Marketplace MVP — browse, install, rate modul
- [ ] Revenue dashboard developer (70% cut ditampilkan)

---

## 🟢 Sprint 10 — Social & Live

- [ ] Private message 1-on-1 (via Socket.io room unik)
- [ ] Live embed di atas avatar — TikTok Live / YouTube / Twitch
- [ ] Sawer animation — koin beterbangan dari observer ke performer
- [ ] Quest harian (repeatable, rewarding)
- [ ] Achievement system
- [ ] Referral system — invite friend = reward Berlian

---

## 💡 Nice to Have (Belum Dijadwalkan)

- [ ] Mini games: catur, ludo, tebak-tebakan (bisa taruhan Perak kecil)
- [ ] Sponsored Dungeon — reward voucher produk fisik
- [ ] Sponsored NPC — NPC ngobrol natural tentang brand
- [ ] Billboard 3D di Spot — slot iklan premium
- [ ] Konser hybrid — stage virtual + stream embed + sawer
- [ ] QR IRL → unlock konten eksklusif di Spot virtual
- [ ] Spot builder visual (drag-drop grid, layernya: ground/object/interactive)
- [ ] Sub-sewa lahan (user sewa 3×3, sub-sewakan sebagian)
- [ ] three-mesh-ui — nametag 3D lebih proper (reference: `notblox-ecs` pattern)
- [ ] GLTF avatar system — skeleton + skin swap (reference: `gltf-avatar-threejs`)

---

## ✅ Done (Referensi)

- [x] Isometric 3D world Three.js
- [x] Avatar chibi + movement + grid snap
- [x] Day/night + stars + fog
- [x] 6 NPC dialog tree
- [x] Warp Portal 6 kota
- [x] Dungeon countdown FOMO
- [x] Deploy galantara.io + SSL + GA4
- [x] Modular architecture refactor
- [x] Supabase Google OAuth
- [x] Socket.io multiplayer server (port 3005)
- [x] nginx WebSocket proxy (/mp/)
- [x] RemotePlayers LERP + label
- [x] Grace period ghost avatar fix
- [x] Text chat panel + broadcast
- [x] WebRTC proximity voice chat
- [x] Database Architecture ERD (15 migration files, 38 tabel)
- [x] Supabase migrations siap deploy (`supabase/migrations/`)
- [x] Semua keputusan bisnis awal dikunci (fee, escrow, KYC, limit produk)

---

## 🔴 URGENT — Sebelum Sprint 5

- [ ] **Perpanjang VPS Hostinger** — sama seperti § URGENT di atas (renew rencana **2026-04-20**, batas **2026-04-23**)
- [ ] Setup Supabase project baru di dashboard.supabase.com
- [ ] Jalankan `supabase db push` untuk migrations 001-015
- [ ] Buat `.env` di galantara-server dengan `SUPABASE_URL` dan keys

---

## Open Decisions (Sudah Diselesaikan)

| Topik | Keputusan | Lokasi |
|-------|-----------|--------|
| Platform fee | 5% | `orders.platform_fee_slv` |
| Travel fee default | 1 PERAK | `spots.travel_fee_slv DEFAULT 1` |
| Min sewa lahan | 3 hari | `check >= 3` constraint |
| KYC sewa | Phone verify wajib | `check_phone_verified_for_lease()` |
| Max produk | 20 biasa, 100 merchant | `check_product_limit()` |
| Sawer MVP | BERLIAN saja | Migration 009 |
| Dungeon reward | Rank-based | `distribute_dungeon_rewards()` |
| Escrow | 3 hari | `NOW() + INTERVAL '3 days'` |
| Dev revenue share | 70/30 | `modules.revenue_share DEFAULT 0.70` |
| Dungeon schedule | Semi-random | Bisa `scheduled` atau `random` |
