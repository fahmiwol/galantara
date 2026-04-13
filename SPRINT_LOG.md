# GALANTARA — Sprint Log
> Sumber kebenaran utama semua progress Galantara.
> Update terakhir: **2026-04-13** · Founder: Fahmi (Tiranyx) · Dokumentasi diselaraskan dengan sesi Claude + Cursor (Sprint 4 polish, ERD, migrations).
> Konflik dengan dokumen lain → **file ini yang menang.**

---

## Status Platform Sekarang

| Komponen | Status | Keterangan |
|----------|--------|-----------|
| galantara.io | ✅ LIVE + SSL | VPS 72.62.125.6 |
| Arsitektur modular | ✅ DONE | `D:\Projects\Galantara\src\` |
| Map Builder (God Mode) | ✅ DEPLOYED (v0.6.0) | `src/tools/MapBuilder.js` |
| Indonesian Assets Factory | ✅ DEPLOYED (v0.6.0) | `proceduralMeshFactory.js` (Gerobak, Gazebo, etc.) |
| Three.js r128 | ✅ Self-hosted | `/www/wwwroot/galantara.io/` |
| Google OAuth (Supabase) | ✅ WORKING | Project: saflkdcfhslrcszdbggt |
| Day/night + Stars + Fog | ✅ DEPLOYED | `src/world/DayNight.js` |
| Avatar movement + zoom | ✅ DEPLOYED | `src/entities/Avatar.js` |
| NPC + Dialog tree | ✅ DEPLOYED | `src/entities/NPC.js` |
| Hamburger menu + HUD | ✅ DEPLOYED | `src/ui/HUD.js` |
| Multiplayer server | ✅ LIVE port 3005 | PM2, nginx proxy /mp/ → :3005 |
| Socket.io client | ✅ CODE READY | `src/multiplayer/Socket.js` |
| Chat (sidebar + collapse + WASD-safe) | ✅ DEPLOYED (Apr 2026) | `src/ui/Chat.js`, `index.html` — `stopPropagation` di input |
| Voice (WebRTC P2P) | ✅ DEPLOYED | `src/multiplayer/VoiceChat.js` + server relay |
| Ghost avatar bug | ✅ FIX + QA | grace 8s + `socket.recovered` + `addAll()` clear |
| Supabase commerce schema | ✅ SQL DI REPO | `supabase/migrations/` (001–015) — **pending** `supabase db push` ke project |
| ERD & parameter MVP | ✅ LOCKED | `docs/ARCHITECTURE_ERD.md` §10 + `supabase/README.md` |
| VPS Hostinger | ⚠️ EXPIRES **2026-04-23** | **PERPANJANG SEBELUM TANGGAL INI** |

---

## Sprint 0 — Prototype Foundation ✅ SELESAI
**Tanggal:** 2026-04-09 · **Versi:** v0.1.0

- [x] Isometric 3D world dengan Three.js r128
- [x] Avatar chibi low-poly + movement relatif kamera
- [x] Proximity zones (trigger event saat avatar dekat objek)
- [x] Login gate di bottom bar (non-blocking, tidak paksa login)
- [x] Camera clamp PHI: `Math.PI * 0.18` → `Math.PI * 0.42`
- [x] Camera lerp: 0.18 (gerak), 0.10 (diam)
- [x] Grid snap 1×1 untuk semua objek
- [x] Rebranding: WRAP City → Galantara, The Nexus → Oola

**Catatan:** File masih monolith ~82KB (`wrapcity-nexus-v3.html`). Engine Three.js vanilla JS.

---

## Sprint 1 — Avatar & Communication ✅ SELESAI
**Tanggal:** 2026-04-09 · **Versi:** v0.2.0

- [x] Profile Panel — klik user icon → nama + avatar color picker 8 preset
- [x] `G.displayName` dinamis di label avatar
- [x] Chat bar — hanya muncul setelah login, bubble di atas avatar (local, belum broadcast)
- [x] Dev Hub → AI 3D Studio button

---

## Sprint 2 — World Enrichment ✅ SELESAI
**Tanggal:** 2026-04-09 · **Versi:** v0.3.0

- [x] Day/night cycle — mengikuti timezone user real (`new Date().getHours()`)
- [x] Skybox, pencahayaan, ambient dinamis sesuai waktu
- [x] 6 NPC dengan dialog tree multi-step (Guide, Budi, Maya, Sari, Dev, Dewi)
- [x] Warp Portal — 6 kota Indonesia (Bogor, Monas, Kuta, Malioboro, Braga, Losari)
- [x] Ambient sound toggle (looping, volume per zona)
- [x] Dungeon countdown timer (FOMO mechanic)
- [x] **Deploy galantara.io** — SSL Let's Encrypt aktif
- [x] Google Analytics GA4 — `G-WNDQL8J455`
- [x] SEO meta tags + OG tags

---

## Sprint 3 — Auth + Modular Architecture ✅ SELESAI
**Tanggal:** 2026-04-12 · **Versi:** v0.4.0

Refactor besar dari monolith HTML ke arsitektur modular ES6.

- [x] Supabase Google OAuth — login beneran dengan akun Google
- [x] `src/auth/auth.js` — G_Auth module (singleton)
- [x] `src/core/Renderer.js` + `Camera.js`
- [x] `src/world/World.js` + `DayNight.js` + `Zones.js`
- [x] `src/entities/Avatar.js` + `NPC.js`
- [x] `src/ui/Toast.js` + `HUD.js` + `LoginModal.js` + `Panels.js`
- [x] `src/core/Game.js` — orchestrator (game loop, state machine)
- [x] `src/main.js` — bootstrap
- [x] `index.html` — shell HTML bersih, semua logic di JS modules

**Catatan Teknis:**
- Avatar children: 0=torso, 1=head, 2-3=eyes, 4-5=cheeks, 6=leg-L, 7=leg-R, 8=arm-L, 9=arm-R
- DILARANG: `scene.traverse()` di animate loop
- Camera lerp 0.18 (move) / 0.10 (idle) — jangan ubah

---

## Sprint 4 — Multiplayer, Chat & Voice ✅ SELESAI
**Tanggal:** 2026-04-12 · **Polish + deploy:** 2026-04-13 · **Versi:** v0.5.0+

**Ini adalah MVP Publik sesungguhnya — 2+ user bisa bertemu, ngobrol, voice proximity.**

### Multiplayer Server (`galantara-server/index.js`)
- [x] Socket.io server port **3005** (PM2 id:12)
- [x] nginx reverse proxy `/mp/` → `localhost:3005` (WebSocket upgrade)
- [x] `connectionStateRecovery` — session recovery 2 menit
- [x] Grace period 8 detik sebelum player dianggap pergi (anti ghost-on-tab-switch)
- [x] Deduplication per `user.id` saat reconnect
- [x] WebRTC relay: `rtc_offer`, `rtc_answer`, `rtc_ice`
- [x] Event: `join`, `sync`, `move`, `chat`, `disconnect`
- [x] `/health` endpoint

### Multiplayer Client (`src/multiplayer/`)
- [x] `Socket.js` — wrapper reconnect Infinity, checks `socket.recovered` → emit `sync` (bukan `join` ulang)
- [x] `RemotePlayers.js` — render avatar remote + LERP 0.15, `addAll()` clear sebelum repopulate
- [x] `VoiceChat.js` — WebRTC P2P proximity voice:
  - Radius 8 unit Three.js
  - STUN: `stun.l.google.com:19302`
  - Volume falloff linear: `vol = 1 - dist / VOICE_RADIUS`
  - AudioContext gainNode per-peer
  - Update proximity throttled 300ms

### Chat UI (`src/ui/Chat.js`)
- [x] Panel chat full (bukan sekadar bar) — muncul dari bawah
- [x] Badge notif saat panel tertutup
- [x] Max 60 pesan, auto-scroll
- [x] HTML sanitization (`_esc()`) — XSS safe
- [x] Enter = kirim
- [x] `setName()` — sinkron nama user setelah login

### Game.js — Diupdate
- [x] Import + init `Chat` dan `VoiceChat`
- [x] `G_UI.toggleChat()` dan `G_UI.toggleVoice()` exposed ke window
- [x] Voice proximity diupdate di setiap frame (throttled internal)

### index.html — Diupdate
- [x] `#chat-panel` (full panel dengan message history)
- [x] Voice button 🎤 dengan pulse animation saat aktif
- [x] Bottom bar: Chat tab dengan badge support

### Sprint 4 — polish chat & dunia (Apr 2026, pasca-deploy)
- [x] Chat sidebar **floating** (`left: 12px`, radius penuh), **anchor bawah** (`bottom: 72px`)
- [x] Collapse **height-based** (bukan slide): expanded = `calc(100vh - 140px)`, collapsed = `148px` — sisanya input + ~3 baris pesan
- [x] **WASD aman saat ngetik:** `keydown` + `stopPropagation()` di `#chat-input` (`Chat.js`) — lebih andal dari sekadar cek `activeElement`
- [x] Fog lebih tipis: `FogExp2` density di `Renderer.js` (setengah dari sebelumnya)
- [x] QA sebelum deploy (preview / eval DOM); deploy via `scp` per file

**Sync cepat ke VPS (jika hanya ubah chat shell):** lihat `docs/DEPLOY_PROMPT.md`.

---

## Sprint 5 — Spot instance & POC dunia nyata 📋 NEXT
**Critical path commerce:** tanpa Spot terpisah, sewa lahan & booth tidak punya “tempat”.

- [ ] **Push migrations** ke Supabase (`supabase link` → `supabase db push`) — verifikasi RLS & seed Bogor di `003`
- [x] Socket.io **room per `spot_id`** (`oola` vs `spot:<id>`) + **client warp** + server leave room lama (v0.6.1)
- [x] Transisi warp — **fade overlay** (load scene 3D per Spot = backlog `World` teardown)
- [x] **Satu Spot POC** — **Bogor** `live` di `SPOTS`; world mesh tetap Oola sampai map swap
- [x] Deep link **`?spot=<id>`** (hanya Spot `live`) + `history.replaceState` saat warp dari peta
- [x] **Visual modular v0.6.2** — `World.worldRoot` + dispose; **Bogor** scene ringkas (warung/bangku); Spot lain & hub = island Oola
- [ ] Mapbox (atau peta) — marker Spot aktif di Indonesia

**Schema Spot (arah):** samakan field dengan `docs/ARCHITECTURE_ERD.md` + tabel `spots` / `spot_zones` di migration `003`.

---

## Sprint 6 — Wallet HUD + sewa lahan + booth 📋 PLANNED
**Commerce mulai terasa di client.**

- [ ] Wallet panel di HUD (saldo dari **bank-tiranyx** API — jangan panggil ledger dari browser)
- [ ] Grid parcel di Spot + UI sewa (pakai `land_parcels` / `land_leases`)
- [ ] Booth dasar + listing produk (`booths`, `products`) + limit 20/100
- [ ] Upload gambar produk → Supabase Storage atau R2 (putuskan)
- [ ] Avatar warna dari profile (masih hardcoded `0x8B5CF6`)

---

## Sprint 7 — Transaksi + travel fee + payment 📋 PLANNED
**Uang masuk loop.**

- [ ] Order flow + escrow COD (3 hari) — sinkron `orders` ↔ bank-tiranyx transfer id
- [ ] Travel fee aktif + tourist badge (`travel_passes`, `location_verifications`)
- [ ] Top-up real (Midtrans / Xendit)
- [ ] Withdraw merchant (policy min. nominal)

---

## Sprint 8 — Object "Jiwa" System (Killer Feature) 📋 PLANNED
**Target:** Objek 3D bisa punya logic (programmable world)

- [ ] Programmable Object SDK contract di-freeze
- [ ] Door object: free / paid / token-gated
- [ ] NPC object: custom dialog via JSON
- [ ] Booth object: e-commerce integration
- [ ] `G.registerModule({...})` API stable
- [ ] Sandbox mode (`sandbox.galantara.io`)

**SDK Contract Target:**
```js
G.registerModule({
  id: "my-module",
  version: "1.0.0",
  permissions: ["ui.overlay", "coin.read"],
  onLoad: (ctx) => {},
  onProximity: (avatar, distance) => {},
  onInteract: (avatar) => {},
  onUnload: () => {},
});
```

---

## Sprint 9 — Developer Ecosystem 📋 PLANNED
**Target:** Developer luar bisa mulai build di Galantara

- [ ] `dev.galantara.io` portal (API docs, SDK download)
- [ ] Plugin lifecycle: build → upload → review → deploy ke Spot
- [ ] Asset submission flow
- [ ] Marketplace MVP
- [ ] Revenue split 70/30 (developer/platform)

---

## Sprint 10 — Live & Social 📋 PLANNED
**Target:** Viral loop — user organik narik user lain

- [ ] Private message 1-on-1
- [ ] Live embed (TikTok/YouTube/Twitch di atas avatar)
- [ ] Sawer animation (koin beterbangan)
- [ ] Quest harian + achievement
- [ ] Referral system
- [ ] Mini games (catur, ludo, tebak-tebakan)

---

## Known Issues

| # | Issue | Prioritas | Fix Sprint |
|---|-------|-----------|------------|
| 1 | VPS expires **2026-04-23** | 🔴 CRITICAL | SEKARANG |
| 2 | **Migrations Supabase** ada di repo tapi belum tentu ke-`push` ke project cloud | 🔴 HIGH | Sprint 5 (awal) |
| 3 | bank-tiranyx ↔ game: API contract & env produksi belum terikat end-to-end | 🔴 HIGH | Sprint 6–7 |
| 4 | Avatar color hardcoded `0x8B5CF6` | 🟡 Medium | Sprint 6 |
| 5 | Online count / label HUD — regression check pasca-deploy | 🟡 Medium | ongoing |
| 6 | NPC masih jalan saat dialog dibuka | 🟢 Low | Sprint 6 |
| 7 | Dungeon countdown belum punya aksi setelah timer | 🟢 Low | Sprint 5+ |
| 8 | Ambient audio CDN eksternal — risiko link mati | 🟢 Low | Sprint 5+ |

---

## Arsitektur Subdomain (Target)

| Subdomain | Fungsi | Status |
|-----------|--------|--------|
| galantara.io | Main app — Oola + entry point | ✅ LIVE |
| api.galantara.io | REST + WebSocket API | 📋 Sprint 7 |
| adm.galantara.io | Admin panel internal | 📋 Sprint 7 |
| dev.galantara.io | Developer portal + SDK | 📋 Sprint 9 |
| sandbox.galantara.io | Testing environment | 📋 Sprint 8 |
| status.galantara.io | Uptime monitoring | 📋 Sprint 5+ |

---

## Stack Teknologi

| Layer | Teknologi | Status |
|-------|-----------|--------|
| 3D Engine | Three.js r128 | ✅ Production |
| Frontend | Vanilla JS ES6 Modules (→ Next.js R3F nanti) | ✅ Production |
| Auth | Supabase Google OAuth | ✅ Production |
| Realtime | Socket.io v4.7.4 | ✅ Production |
| Voice | WebRTC P2P (native browser) | ✅ Production (Oola) |
| Database | Supabase PostgreSQL | ✅ Auth + **migrations commerce di repo** (push DB = Sprint 5) |
| Ledger | Mighan Coin (bank-tiranyx) | 🟡 Partial |
| Payment | Midtrans / Xendit | 📋 Sprint 7 |
| Maps | Mapbox GL JS | 📋 Sprint 5 |
| Analytics | GA4 — G-WNDQL8J455 | ✅ Production |
| Hosting | Hostinger KVM 2 VPS | ✅ Running |
| SSL | Let's Encrypt via aaPanel | ✅ Active |

---

## Open Decisions (Perlu Keputusan Fahmi)

| # | Topik | Opsi | Status |
|---|-------|------|--------|
| 0 | **Parameter commerce MVP** (fee, escrow, travel, dll.) | — | ✅ **Terkunci** — lihat `supabase/README.md` & `docs/ARCHITECTURE_ERD.md` §10 |
| 1 | Branding | "Galantara" standalone vs "Galantara by Tiranyx" | ❓ Belum final |
| 2 | Revenue share dev | 70/30 vs 80/20 | ❓ Belum final |
| 3 | Dungeon scheduling | Fully random vs semi-scheduled | ❓ Belum final |
| 4 | Live V1 | Native WebRTC vs embed dulu | ❓ Belum final |
| 5 | Open source timing | Sebelum atau sesudah SDK freeze? | Rekomendasi: setelah Sprint 9 |

---

*Dokumen ini di-maintain setiap sesi kerja oleh Fahmi (Tiranyx) + Claude (acting CTO).*
