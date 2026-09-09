# GALANTARA — Changelog
> Semua perubahan signifikan dicatat di sini.
> Format: `[versi] YYYY-MM-DD — Deskripsi`

---

## [v0.7.0] · 2026-09-09
> **Benteng Fase 0 — peran bot nyata, dan alat ukurnya**

### Added
- `src/games/benteng/BotDirector.js` — otak bot terpisah dari aturan main.
  Peran (`penjaga` / `penyerang`) ditentukan tiap tick dari roster hidup,
  bukan dari ID unit. Serbu hanya dilakukan kalau muatan sanggup membayar
  perjalanan **plus** 3 detik channel di benteng lawan. Bot terpojok memotong
  di depan pengejar alih-alih lari pulang.
- `tools/benteng-sim.mjs` — harness balance headless: 100 match tanpa browser,
  6 arketipe pemain (termasuk `--policy bot` sebagai kontrol setara), gate
  Fase 0 yang bisa diukur mesin, `--set` / `--sweep` untuk menguji dial tanpa
  menyentuh `config.js`, dan `--csv`.
- `config.match.startJitter` — sebaran posisi awal berseed. Default **0**
  (perilaku lama); harness menaikkannya supaya sederet match jadi sampel nyata,
  bukan satu lintasan yang diulang.
- 5 test baru untuk BotDirector: jumlah penjaga, rotasi peran, unit bebas
  terakhir berhenti jaga, kelayakan serbu, dan simetri elak antar tim.

### Changed
- `BentengGame` mendelegasikan keputusan bot ke `BotDirector`; `_chooseBotTarget`
  menyusut dari ~85 baris jadi 9.
- Peran ditetapkan saat `reset()` supaya frame pembuka sudah punya penjaga.
- Profil temperamen bot kini identik untuk kedua tim (`BOT_PROFILE_ORDER`);
  sebelumnya diturunkan dari indeks unit sehingga komposisi kedua tim berbeda.

### Fixed
- Penjaga tidak lagi dikunci ke `unit.id === 'B1' || unit.id === 'M0'` —
  tambalan yang gagal begitu jumlah pemain berubah, dan tetap meninggalkan
  benteng kosong.
- Efek domino "satu tim habis dalam 10 detik": selesai-karena-tim-habis turun
  dari **60% → 2%**, durasi median naik **77 s → 180 s**.
- Keputusan pulang-saat-kritis naik **2,0% → 29,0%** — inti Sistem Muatan
  praktis tidak pernah terpicu sebelumnya.

### Belum lulus
- Near-miss **2,20/match** dari target 3. Melebarkan `nearMiss.distance` ke 0,5
  akan lulus (3,60) tapi itu melonggarkan definisi, bukan memperbaiki permainan —
  keputusan rasa, menunggu Fahmi. Lihat `docs/BENTENG_BALANCE_LOG.md`.

---

## [v0.6.6] · 2026-04-13
> **Spot visual registry + Monas POC** — satu jalur `Game._spotRuntime`

### Added
- `src/world/spotVisualRegistry.js` — map `bogor` / `monas` → kelas runtime.
- `src/world/spots/MonasSpotRuntime.js` — plaza + obelisk stilized + volume foto / kiosk.
- `assets/spots/monas/manifest.json` — manifest GLB kosong (konsisten Bogor).

### Changed
- `SpotRuntime.js` — typedef **`ISpotRuntime`** dilengkapi (`root`, `interactionVolumes`, dll.).
- `Game.js` — `_bogorSpot` → **`_spotRuntime`**; `_syncSpotVisuals` memakai registry + manifest `assets/spots/<id>/manifest.json`.

---

## [v0.6.5] · 2026-04-13
> **Avatar warna persist + export peta unduhan**

### Added
- `src/data/avatarPreferences.js` — `localStorage` indeks warna avatar (`galantara_avatar_color_idx`).

### Changed
- `Avatar.js` — terapkan warna tersimpan saat `build()`; `setColor` menulis ke `localStorage`.
- `Panels.js` — swatch profil selaras `colorIdx`; tamu tanpa login tetap bisa buka profil & ganti warna; `_syncProfileColorSwatches`.
- `World.js` — muat `mapData.procedural_props` (generator) saat rebuild island.
- `MapBuilder.js` — tiap penempatan menambah entri ke `mapData.procedural_props` (dengan `paletteId`).
- `Game.js` — `exportMap` mengunduh `galantara_map_<timestamp>.json` (Blob), bukan hanya `console.log`.

---

## [v0.6.4] · 2026-04-13
> **README publik** — value prop disepakati (builder + open + realistis soal art)

### Added
- `README.md` (root) — tagline, ID + EN, bullet diferensiator, tautan ke `docs/PUBLIC_VALUE_PROP.md` & dokumen arah.

---

## [v0.6.3] · 2026-04-13
> **Interaksi Spot + manifest aset** — fondasi builder (volume + GLB path)

### Added
- `src/interaction/InteractionVolume.js` — zona **sphere/box** di XZ; `onUse` + hint untuk **[F]**.
- `src/world/AssetLibrary.js` — fetch **manifest** JSON, load `glbs[]` via **GLTFLoader**, `detachBatch` saat unload Spot.
- `assets/spots/bogor/manifest.json` — schema v1 (`glbs` kosong; siap isi URL GLB).

### Changed
- `BogorSpotRuntime` — volume **warung** + **bangku**; `mount(scene, { toast })`.
- `Game.js` — `_updateSpotInteractions`, prioritas **[F]** ke volume Spot lalu zona Oola; `AssetLibrary.applyManifest` saat Bogor; `Zones.suspendForSpotWorld()` saat masuk Bogor (hindari hint portal Oola di koordinat sama).
- `Zones.js` — `suspendForSpotWorld()`.
- `src/main.js` — muat **GLTFLoader** r128 dari CDN setelah `THREE` siap.

### Documentation
- `TODO.md` — centang InteractionVolume + AssetLibrary/manifest backlog arsitektur.

---

## [v0.6.2] · 2026-04-13
> **Modular Spot visual (POC)** — `worldRoot` + dispose; scene ringkas **Bogor** saat warp / `?spot=bogor`

### Added
- `src/world/SpotRuntime.js` — kontrak modul Spot (base tipis).
- `src/world/spots/BogorSpotRuntime.js` — plaza hijau + warung + bangku + pohon (low poly).
- `config.spotIdFromSocketRoom()` — parse id dari room Socket.

### Changed
- `World.js` — konten island di `worldRoot`; `disposeContent()` / `rebuildContent()`; sky tetap di scene.
- `Game.js` — `_syncSpotVisuals` + `getPlacementRaycastTargets`; warp & logout & load awal selaras visual ↔ room.
- `MapBuilder.js` — raycast ke target dari `Game` saat Bogor aktif.
- `NPC.js` — `setHubVisible()` sembunyikan NPC Oola di Spot Bogor.

### Documentation
- `docs/RESOURCES_RESEARCH.md` — kurasi link (Three.js dispose, glTF, Socket.io rooms, Supabase) + prioritas lanjut & tema riset; dirujuk dari `AGENT_SHARED_KNOWLEDGE.md` & `GALANTARA_BUILDER_SYSTEM.md`.
- `docs/GALANTARA_BUILDER_SYSTEM.md` **v1.2** — § *Utara produk*: arah **game engine + game builder**; tabel lapisan (render kernel / engine / builder / platform); final goal diperjelas.
- `docs/RESOURCES_RESEARCH.md` — intro & §2 diselaraskan dengan utara engine/builder.
- `docs/RESOURCES_RESEARCH.md` — § **2A Jadwal belajar** (kurikulum praktik menuju engine + builder).
- `docs/GALANTARA_BUILDER_SYSTEM.md` **v1.3** — § **Visi creator**: peta builder (Main & Terbit, Tanah & Jalur, Dunia & Spot, Prop & Avatar, Gerak & Emote, Cahaya); 13 pilar tambahan (logic, UI, commerce, audio, wizard, template, a11y, kolab, moderasi, versi, l10n, analitik); lapisan AI; metrik no-code.
- `docs/RESOURCES_RESEARCH.md` — intro utara diselaraskan ke v1.3 no-code.
- `docs/LEARNINGS_LOG.md` — log **2026-04-13**: sintesis pembelajaran hari ini; Blender sebagai backbone **produksi** vs Three **runtime**; Babylon, PlayCanvas, Needle, Godot, Mixamo, USD; rujukan ke sumber yang sudah dibaca.
- `docs/LEARNINGS_LOG.md` § **E** + `RESOURCES_RESEARCH.md` § **Visual logic** — Unity/Unreal (node) vs **Construct** (event sheet); preferensi founder; `GALANTARA_BUILDER_SYSTEM` v1.3: logic builder = **Construct-style** dulu, node opsional.

---

## [v0.6.1] · 2026-04-13
> **Sprint 5 (partial)** — multiplayer **room per Spot**, deep link `?spot=`, warp dari peta

### Added
- `index.html` — overlay `#warp-overlay`, label `#hud-spot` di HUD.
- `src/ui/HUD.js` — `setSpotLabel()` untuk nama room / Spot.
- `src/entities/Avatar.js` — `teleport(x, z, facing)` untuk reset posisi setelah warp.
- `G_UI.warpToSpot` / `G_UI.warpToOolaHub` — transisi singkat, matikan voice, reconnect Socket dengan room baru.

### Changed
- `src/core/Game.js` — room dari `parseInitialSocketRoomFromUrl()`; toast join pakai `spotLabelFromSocketRoom`; guest & login pakai `this._socketRoom`.
- `src/ui/Panels.js` — kartu **Oola Hub** di atas daftar Spot; warp live memanggil `G_UI.warpToSpot`.
- `galantara-server/index.js` — (lanjutan Sprint 5) pindah room: leave room lama + broadcast count.

### Notes
- Dunia 3D masih map Oola; isolasi multiplayer per Spot sudah jalan. Reload map per Spot mengikuti teardown `World` (backlog).

---

## [v0.6.0] · 2026-04-13
> **Oola Builder & Indonesian Assets** — God Mode map builder + Indonesian procedural props

### Added
- `src/tools/MapBuilder.js` — Sistem penempatan objek real-time dengan grid snapping (God Mode).
- `src/world/World.js` — Refactor ke sistem data-driven; memuat map dari `src/data/maps/default_oola.json`.
- `src/tools/proceduralMeshFactory.js` — Archetype baru: **Gerobak Bakso, Gazebo Bambu, Pagar Kayu, Pohon Kelapa**.
- `index.html` — Tombol **Pasang di Dunia** di generator panel dan **Export Map JSON** di Dev Hub.
- `docs/AGENT_SHARED_KNOWLEDGE.md` — Inisialisasi dokumentasi pengetahuan bersama antar AI Agen.

### Changed
- `src/core/Game.js` — Integrasi `MapBuilder`, expose `G_UI.placeInWorld` dan `G_UI.exportMap`.
- `src/data/styleTokens.js` — Registrasi pendaftaran archetype baru.

---

## [v0.5.10] · 2026-04-13
> **3D Generator MVP** — procedural stylized + preview WebGL + export JSON + prompt stub AI

### Added
- `src/data/styleTokens.js` — palet slot (`jakarta_warm`, `kampung_green`, `coastal_calm`), factory material matte PBR
- `src/tools/proceduralMeshFactory.js` — archetype: pohon bulat, warung blok, bangku, tiang lampu (seed + skala)
- `src/tools/Generator3DPanel.js` — panel preview terpisah, indikator tri/style vs budget 5k, salin prompt, unduh JSON preset
- `index.html` — panel `#generator3d-panel`, CSS `.pbox-wide` / `.gen3d-*`
- Developer Hub: tombol **3D Generator (MVP)** menggantikan toast “coming soon”

### Changed
- `src/ui/Panels.js` — `openPanel`: hentikan preview generator saat panel lain dibuka
- `src/core/Game.js` — `Generator3DPanel`, `G_UI.openGenerator3D`, `stopGeneratorPreview`, `closeGenerator3dPanel`, `exportGeneratorPreset`, `copyGeneratorAiPrompt`

---

## [v0.5.9] · 2026-04-13
> Dokumentasi — selaras dengan sesi Claude (Sprint 4 polish, ERD, migrations)

### Changed
- `SPRINT_LOG.md` — status deploy chat/voice; blok polish (sidebar, collapse height, WASD `stopPropagation`, fog); Sprint 5–7 realign ke commerce path + Bogor POC; Known Issues & stack DB
- `docs/ARCHITECTURE_ERD.md` — §10 jadi **keputusan MVP terkunci** + referensi `supabase/migrations/` (bukan daftar pertanyaan terbuka)
- `docs/SESSION_LOG.md` — catatan sinkron Claude → Cursor

---

## [v0.5.8] · 2026-04-13
> Landing **about.html** — narasi movement, struktur storytelling, tone visioner

### Changed
- `about.html` — hero & alur: problem → visi → beda → siapa → status → build in public → kontribusi → dewan → investor → changelog → FOMO → kotak saran + gate penutup; tipografi Syne + grid halus; Three.js diselaraskan warna cyan/violet; CTA ke `index.html`, mailto early/kontributor/support, placeholder Discord/GitHub

---

## [v0.5.7] · 2026-04-13
> Landing **Tentang** (tema Oola + Three.js) + **Konsol maintainer** + API admin server

### Added
- `about.html` — ulang: suasana malam / pulau terapung, hero **Three.js** (pulau + orb + partikel, parallax pointer), dewan kontributor dari `data/contributors.json`, link ke konsol
- `admin.html` — panel maintainer: token `ADMIN_API_TOKEN`, ringkasan room online & (opsional) hitung user Supabase Auth
- `data/contributors.json` — daftar maintainer/kontributor untuk landing + konsol
- `galantara-server` — `GET /api/admin/summary` (Bearer token), CORS untuk `/api/*`, opsional `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### Changed
- `apps/web/README-DEPLOY.md` — deploy sertakan `about.html`, `admin.html`, folder `data/`

---

## [v0.5.6] · 2026-04-13
> Halaman **Tentang** (landing statis) + wiring menu & zona

### Added
- `about.html` — landing: penjelasan proyek, changelog ringkas, kontribusi, sponsor/donasi, kotak saran (mailto), CTA kembali ke game

### Changed
- `src/data/config.js` — item menu **Tentang Galantara** membuka `about.html` (bukan toast)
- `src/core/Game.js` — zona **Papan Informasi** (`info`) dan **Kotak Saran** (`saran`): [F] mengarah ke `about.html` / `#kotak-saran`; toast hint saat memasuki zona

---

## [v0.5.5] · 2026-04-13
> Dokumentasi — `AGENT_SHARED_KNOWLEDGE`: §6 snippet API + §7 template prompt agent

### Changed
- `docs/AGENT_SHARED_KNOWLEDGE.md` — tambah kontrak Socket join/move, guard tamu server, hook Supabase, placeholder ledger; template prompt singkat / tugas / ekonomi

---

## [v0.5.4] · 2026-04-13
> Dokumentasi — pengetahuan bersama untuk agent lain / reuse proyek

### Added
- `docs/AGENT_SHARED_KNOWLEDGE.md` — perubahan kunci, skill continual-learning, temuan, referensi dokumen, artefak (index, npm), modul `src/` + server; tanpa rahasia

### Changed
- `docs/AGENT_HANDOFF_CURSOR.md`, `CLAUDE_NOTES.md` — pointer ke file di atas

---

## [v0.5.3] · 2026-04-13
> Dokumentasi saja — status **Mighan Coin & wallet belum selesai** (bukan bug baru)

### Changed
- `CLAUDE_NOTES.md`, `TODO.md`, `docs/SESSION_LOG.md`, `docs/AGENT_HANDOFF_CURSOR.md` — catatan eksplisit: ledger/wallet/top-up belum terhubung ke game; `bank-tiranyx-temp/` di repo ini minimal

---

## [v0.5.2] · 2026-04-13
> Dependency hygiene — satu entry point npm di root, lockfile server

### Added
- `package.json` (repo root, nama paket `galantara-repo` agar tidak bentrok npm di Windows) — `engines.node >=18`, scripts `install:server`, `server`, `server:dev` memakai `cd galantara-server && …`
- `.gitignore` — `node_modules/`, `.env*`, log umum

### Changed
- `galantara-server/package.json` — `private`, `engines`, pin `express@4.21.2` + `socket.io@4.7.4` (selaras CDN client di `index.html`)
- `galantara-server/package-lock.json` — hasil `npm install` (reproducible install)

---

## [v0.5.1] · 2026-04-13
> Guest multiplayer — PRD “jalan-jalan dulu” tanpa login wall untuk presence

### Added
- `src/data/guestIdentity.js` — `guest:` id stabil + nama `Tamu ####` di `localStorage`
- `G_Auth.init` opsi `onInitialNoUser` — panggil setelah `getSession` jika tidak ada session Supabase

### Changed
- `src/core/Game.js` — auth init dipindah setelah `_initMultiplayer` + `chat.onSend`; tamu auto-`mp.connect`; login/logout swap koneksi; chat input disabled untuk tamu
- `src/multiplayer/Socket.js` — disconnect socket lama sebelum connect baru; `join` kirim `guest`; `setSpawnSnapshot` + emit posisi awal
- `galantara-server/index.js` — simpan `guest` per socket; tamu tidak bisa `chat`; WebRTC tidak di-relay jika pengirim atau penerima tamu
- `index.html` — teks login-gate menjelaskan boleh lihat warga dulu

---

## [v0.6.0-pre] · 2026-04-12
> Architecture & Database Design Sprint — Foundation sebelum Sprint 5 (Spot Instance System)

### Added
- `docs/ARCHITECTURE_ERD.md` — Full database architecture document: 2-engine (Supabase + bank-tiranyx), ERD ASCII, 13 SQL blocks, 38 tabel, revenue flow diagram, migration order, RLS policies, 8 open questions
- `docs/SESSION_LOG.md` — Technical documentation: cara kerja sistem, flow diagram, skills table, architecture tree
- `supabase/migrations/` — 15 migration files Supabase PostgreSQL siap deploy:
  - `001` cosmetics & product categories (dengan seed data default)
  - `002` users & auth (trigger auto-create profile, updated_at triggers)
  - `003` spots & world (seed Bogor Alun-Alun sebagai MVP spot)
  - `004` land system (min sewa 3 hari, GIST exclude overlap, phone verify check)
  - `005` booth & products (max 20/100 produk via function, unique primary image)
  - `006` orders (state machine, COD code 6-digit, escrow 3 hari, auto-timeline, rating trigger)
  - `007` travel system (`check_spot_access()` function, privacy-first location hash)
  - `008` advertisements (review wajib, `active_advertisements` view)
  - `009` sawer (BERLIAN MVP, leaderboard view)
  - `010` gamification (quests, achievements, dungeons rank-based reward)
  - `011` developer ecosystem (70/30 revenue share)
  - `012` moderation (auto-suspend 3 laporan, ban escalation)
  - `013` notifications & analytics (platform_revenue_summary view, notify triggers)
  - `014` indexes (35+ performance indexes dengan COMMENT)
  - `015` RLS policies (semua tabel, prinsip minimal access)
- `supabase/README.md` — Panduan setup, environment variables, aturan emas

### Decisions Made
| # | Keputusan | Nilai |
|---|-----------|-------|
| Platform fee | 5% per transaksi | `CEIL(subtotal × 0.05)` |
| Travel fee | 1 PERAK default | Konfigurasi per spot |
| Min sewa | 3 hari | DB constraint |
| KYC sewa | Phone verify wajib | DB function |
| Max produk | 20 / 100 merchant | App-layer function |
| Sawer MVP | BERLIAN saja | PERAK diaktifkan Sprint 7+ |
| Dungeon | Rank-based reward | Semua dapat participation 10 BERLIAN |
| Escrow | 3 hari auto-release | Trigger + cron job |

---

## [v0.5.0] · 2026-04-12
> Sprint 4: Multiplayer real-time, text chat sidebar, proximity voice, WASD fix, fog polish

### Added
- `src/ui/Chat.js` — Full chat panel dengan message history, badge notif, max 60 pesan, HTML sanitization
- `src/multiplayer/VoiceChat.js` — WebRTC P2P proximity voice, radius 8 unit, volume falloff linear, AudioContext gainNode per-peer
- `galantara-server/index.js` — WebRTC relay events: `rtc_offer`, `rtc_answer`, `rtc_ice`
- `galantara-server/index.js` — `sync` event untuk session recovery tanpa re-join
- Voice button 🎤 di chat bar dengan pulse animation saat aktif
- `#chat-panel` — Full panel (bukan sekadar bar), muncul dari bawah layar
- Badge notif pada chat toggle button saat ada pesan baru dan panel tertutup

### Changed
- `src/core/Game.js` — Import + init `Chat` dan `VoiceChat`, exposed `toggleChat` dan `toggleVoice` ke `window.G_UI`
- `index.html` — Ganti `#chat-bar` dengan `#chat-panel`, tambah voice button, refactor bottom bar

### Fixed
- Ghost avatar bug: tambah grace period 8s + `connectionStateRecovery` + `socket.recovered` check

### Changed (polishing session)
- Chat panel: dari bottom-center popup → **left sidebar bottom-anchored**
- Collapse behavior: slide kiri → **height transition dari atas ke bawah**
- WASD fix: `document.activeElement` check → **`e.stopPropagation()`** (lebih reliable)
- Fog density: 0.012 → **0.006** (world lebih jelas)
- Chat tab icon: `❮❯` → `▼▲ OOLA CHAT`

### QA
- Verified via `preview_eval`: WASD blocked ✅, collapsed height 148px ✅, height transition ✅
- Deployed ke galantara.io ✅

---

## [v0.4.0] · 2026-04-12
> Sprint 3: Modular architecture refactor + Auth nyata

### Added
- `src/auth/auth.js` — G_Auth module singleton (Supabase Google OAuth)
- `src/core/Renderer.js` — Three.js WebGL setup
- `src/core/Camera.js` — Orbital camera + lerp + clamp
- `src/core/Game.js` — Orchestrator: game loop, state machine, semua module terikat
- `src/world/World.js` — Oola island scene
- `src/world/DayNight.js` — Cycle siang/malam + stars
- `src/world/Zones.js` — Proximity zone detection
- `src/entities/Avatar.js` — Player avatar chibi
- `src/entities/NPC.js` — NPC manager + patrol
- `src/ui/Toast.js` — Notifikasi popup
- `src/ui/HUD.js` — Heads-up display + hamburger menu
- `src/ui/LoginModal.js` — Modal login Supabase
- `src/ui/Panels.js` — Profile, settings, dan panel-panel lain
- `src/multiplayer/Socket.js` — Socket.io client wrapper (reconnect Infinity)
- `src/multiplayer/RemotePlayers.js` — Render avatar player lain + LERP 0.15
- `src/main.js` — Bootstrap entry point
- `galantara-server/index.js` — Socket.io server port 3005, PM2, nginx proxy `/mp/`
- Grace period 8s pada disconnect player
- Deduplication by `user.id` saat reconnect
- `connectionStateRecovery` maxDisconnectionDuration 2 menit

### Changed
- Arsitektur: dari monolith single HTML (`wrapcity-nexus-v3.html`) → modular ES6 modules
- Server port: 3001 → **3005** (3001 dipakai tiranyx Next.js)
- Multiplayer server menggunakan Socket.io v4.7.4 (bukan Fastify)

### Removed
- `wrapcity-nexus-v3.html` — monolith digantikan oleh `index.html` + `src/`

---

## [v0.3.0] · 2026-04-09
> Sprint 2: World enrichment + Deploy ke production

### Added
- Day/night cycle mengikuti timezone user (`new Date().getHours()`)
- Stars di langit malam
- 6 NPC dengan dialog tree multi-step (Guide, Budi, Maya, Sari, Dev, Dewi)
- Warp Portal ke 6 kota Indonesia: Bogor, Monas, Kuta, Malioboro, Braga, Losari
- Ambient sound toggle (looping)
- Dungeon countdown timer (FOMO mechanic)
- Google Analytics GA4 — `G-WNDQL8J455`
- SEO meta tags + OpenGraph tags
- **galantara.io LIVE** — SSL Let's Encrypt, aaPanel, Nginx

### Changed
- Fog, skybox, lighting — sesuai waktu nyata
- Warp Portal menampilkan info merchant count, vibe, dan status kota

---

## [v0.2.0] · 2026-04-09
> Sprint 1: Avatar identity + komunikasi dasar

### Added
- Profile Panel — klik user icon → nama + avatar color picker 8 preset
- Avatar label dinamis dari `G.displayName`
- Chat bar post-login — bubble percakapan di atas avatar (local, belum broadcast)
- Dev Hub → AI 3D Studio button

---

## [v0.1.0] · 2026-04-09
> Sprint 0: Prototype foundation

### Added
- Isometric 3D world dengan Three.js r128
- Avatar chibi low-poly (torso, head, eyes, cheeks, legs, arms)
- Movement relatif kamera (sin/cos dari theta) + grid snap 1×1
- Proximity zones (trigger event saat avatar dekat objek)
- Login gate bottom bar (non-blocking)
- Camera clamp PHI `Math.PI * 0.18` → `Math.PI * 0.42`
- Camera lerp 0.18 (gerak) / 0.10 (diam)

### Rebranding
- WRAP City → **Galantara**
- The Nexus → **Oola**
- WRC/WRP → **Mighan Coin**

---

## Versi Roadmap (Target)

| Versi | Sprint | Target |
|-------|--------|--------|
| v0.5.0 | Sprint 4 | ✅ Chat + Voice — perlu deploy |
| v0.6.0 | Sprint 5 | Spot Monas + Mapbox |
| v0.7.0 | Sprint 6 | Avatar visual polish + emote |
| v0.8.0 | Sprint 7 | Mighan Coin + Commerce |
| v0.9.0 | Sprint 8 | Object "Jiwa" + SDK |
| v1.0.0 | Sprint 9-10 | Developer Ecosystem + Live → **Public Launch** |
