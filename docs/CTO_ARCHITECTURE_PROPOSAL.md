# Galantara — CTO Architecture Proposal

> **Tanggal:** 2026-04-09
> **Author:** Claude (acting CTO)
> **Untuk:** Fahmi (Founder, Tiranyx)
> **Status:** Living Document — akan diupdate seiring eksekusi

---

## 1. Premis Utama

Platform virtual world yang sukses tidak pernah sukses karena pembuatnya membangun semuanya sendiri.

- **Roblox** besar karena 9.5 juta developer membangun game di atasnya.
- **Minecraft** besar karena komunitas modder menciptakan pengalaman yang Mojang sendiri tidak pernah bayangkan.
- **Gather Town** tumbuh karena perusahaan-perusahaan membangun office mereka sendiri di dalamnya.

Pola yang sama berulang: **platform yang tumbuh adalah platform yang mudah dibangun oleh orang lain.**

Galantara harus didesain dari hari pertama dengan premis ini. Bukan "kita bangun dunia, lalu orang datang." Tapi "kita bangun fondasi, lalu orang lain membangun dunia di atasnya."

Ini bukan fitur. Ini arsitektur.

---

## 2. Tiga Masalah Platform

Setiap platform yang ingin tumbuh via kontributor eksternal harus menyelesaikan tiga masalah fundamental:

### 2.1 Cold Start Problem

> Siapa yang membangun duluan kalau belum ada user?

**Jawaban Galantara:** Tiranyx adalah builder pertama. Kita membangun 3 Spot awal (Monas, Malioboro, Kuta Beach) sebagai showcase. Ini bukan hanya konten — ini adalah template yang menunjukkan apa yang mungkin.

Tanpa Spot awal yang menarik, tidak akan ada user. Tanpa user, tidak akan ada developer yang tertarik. Kita harus memecah lingkaran ini dengan menjadi developer pertama dan terbaik di platform sendiri.

### 2.2 Contribution Incentive

> Kenapa orang mau membangun di platform kita?

Dua alasan yang harus ada sejak awal:

1. **Distribution** — Galantara harus bisa mendatangkan traffic ke kreasi developer. Kalau developer bikin modul tapi tidak ada yang lihat, mereka pergi.
2. **Monetization** — Developer harus bisa menghasilkan uang. Revenue share 70/30 (developer/platform) di Marketplace. Travel fee share untuk Spot owner.

Tanpa distribution dan monetization, contribution hanyalah charity. Dan charity tidak scalable.

### 2.3 Trust & Quality

> Bagaimana menjaga kualitas tanpa membunuh kreativitas?

Dua mekanisme:

1. **Sandbox** — Setiap modul dan Spot berjalan di sandbox terisolasi. Tidak bisa akses data user lain. Tidak bisa modifikasi core engine. Kalau crash, hanya modul itu yang mati.
2. **Permission System** — Modul harus mendeklarasikan permission yang dibutuhkan (akses lokasi, akses inventory, akses Mighan Coin). User approve sebelum modul aktif. Mirip Android permission model.

---

## 3. Arsitektur 3 Layer

Galantara dibangun dalam tiga lapisan yang jelas terpisah:

```
┌─────────────────────────────────────────────────┐
│  LAYER 3: EKOSISTEM (Community-Built)           │
│  Spots, Modul, Asset 3D, NPC Custom,            │
│  Mini Games, Integrasi Pihak Ketiga             │
├─────────────────────────────────────────────────┤
│  LAYER 2: PLATFORM (Proprietary / Tiranyx)      │
│  Auth, Mighan Ledger, Marketplace, Moderation,  │
│  Admin Panel, KYC, Analytics, Payment Gateway   │
├─────────────────────────────────────────────────┤
│  LAYER 1: CORE ENGINE (Open Source / MIT)        │
│  Three.js Renderer, Avatar System, Grid System, │
│  Proximity Engine, Camera, SDK, Asset Format     │
└─────────────────────────────────────────────────┘
```

### Layer 1 — Core Engine (Open Source, MIT License)

Ini adalah fondasi teknis yang **semua orang boleh pakai, fork, dan modifikasi**.

Komponen:
- **Three.js Isometric Renderer** — Engine rendering utama
- **Avatar System** — Chibi avatar, color system, label, animasi dasar
- **Grid System** — Sistem petak untuk penempatan objek dan booth
- **Proximity Engine** — Deteksi kedekatan avatar ke objek/NPC/portal
- **Camera System** — Isometric camera dengan clamp PHI
- **Galantara SDK** — API untuk developer membuat modul
- **Asset Format Spec** — Format standar untuk 3D asset (.glb + manifest.json)

Kenapa open source? Karena developer butuh **kepercayaan bahwa platform tidak akan berubah secara sepihak.** Open source = transparansi. Dan transparansi = kepercayaan.

### Layer 2 — Platform (Proprietary, Tiranyx)

Ini adalah **mesin bisnis** yang menghasilkan revenue dan menjaga keamanan.

Komponen:
- **Auth System** — Google OAuth via Supabase, session management
- **Mighan Coin Ledger** — Sistem koin internal (EMAS, PERAK, PERUNGGU, BERLIAN)
- **Marketplace** — Tempat jual beli modul, asset, dan Spot template
- **Moderation System** — Content review, report system, auto-filter
- **Admin Panel** — god.galantara.io untuk manajemen platform
- **KYC System** — Verifikasi identitas untuk merchant
- **Analytics** — Tracking user behavior, Spot popularity, revenue
- **Payment Gateway** — Midtrans/Xendit untuk top-up Mighan Coin

Layer ini **tidak di-open-source** karena berisi logika bisnis, keamanan, dan data user.

### Layer 3 — Ekosistem (Community-Built)

Ini adalah **konten dan fitur yang dibangun oleh komunitas.**

Komponen:
- **Galantara Spots** — Ruang virtual yang terhubung ke lokasi nyata
- **Modul** — Plugin yang menambah fungsionalitas (mini game, voting, music player)
- **Asset 3D** — Model, texture, animasi yang bisa dipakai di Spot manapun
- **NPC Custom** — NPC dengan dialog dan behavior custom
- **Integrasi** — Koneksi ke layanan pihak ketiga (Tokopedia, Gojek, dll)

Layer ini tumbuh secara organik. Semakin banyak developer, semakin kaya ekosistemnya.

---

## 4. Yang Harus Dikunci Sekarang

Ada empat hal yang **sangat sulit diubah setelah developer mulai membangun di atasnya.** Ini harus difinalisasi sebelum SDK dirilis:

### 4.1 SDK Contract

```
G.registerModule({
  id: "modul-voting",
  name: "Voting Booth",
  version: "1.0.0",
  permissions: ["ui.overlay", "coin.read"],
  onLoad: (ctx) => { ... },
  onProximity: (avatar, distance) => { ... },
  onInteract: (avatar) => { ... },
  onUnload: () => { ... }
});
```

Lifecycle hooks ini adalah **kontrak.** Kalau berubah, semua modul yang sudah dibuat akan rusak. Harus benar dari awal.

### 4.2 Asset Format

```json
{
  "format": "galantara-asset-v1",
  "model": "booth.glb",
  "thumbnail": "booth-thumb.png",
  "dimensions": { "width": 2, "depth": 2, "height": 3 },
  "anchor": "bottom-center",
  "handler": "handler.js",
  "permissions": ["ui.overlay"]
}
```

Format ini menentukan bagaimana semua asset 3D di-package. Sekali dirilis, tidak bisa diubah tanpa migrasi massal.

### 4.3 Grid/Room Schema

```json
{
  "spot_id": "monas-jakarta",
  "grid_size": [50, 50],
  "cell_size": 1.0,
  "spawn_point": [25, 25],
  "zones": [
    { "type": "warp_portal", "position": [10, 10], "target": "oola" },
    { "type": "booth_area", "rect": [20, 20, 30, 30] },
    { "type": "npc", "position": [15, 25], "npc_id": "guide-monas" }
  ]
}
```

Schema ini menentukan bagaimana Spot disimpan dan diload. Semua Spot builder tool akan bergantung pada schema ini.

### 4.4 URL Structure

```
galantara.io                    → Oola (landing/hub)
galantara.io/spot/monas         → Spot Monas Jakarta
galantara.io/spot/malioboro     → Spot Malioboro Yogya
galantara.io/u/fahmi            → User profile
galantara.io/m/voting-booth     → Modul page
dev.galantara.io                → Developer portal
god.galantara.io                → Admin panel
```

URL structure menentukan routing, SEO, dan sharing. Harus diputuskan sekarang.

---

## 5. Open Source Strategy

### Yang Dibuka (Open Source MIT)

| Komponen | Alasan |
|----------|--------|
| Core Engine (Three.js renderer, avatar, grid, proximity) | Developer butuh baca source untuk debug |
| SDK Specification | Kontrak harus transparan |
| Asset Format Spec | Interoperability |
| Oola Source Code | Showcase/template untuk Spot builder |
| CLI Tools | Developer experience |

### Yang Ditutup (Proprietary)

| Komponen | Alasan |
|----------|--------|
| Platform Layer (auth, ledger, marketplace) | Logika bisnis & keamanan |
| Admin Panel (god.galantara.io) | Kontrol internal |
| Moderation System | Anti-gaming |
| Analytics Pipeline | Competitive advantage |
| Mighan Coin Backend | Financial security |

### Prinsip

> "Buka yang membuat orang ingin membangun. Tutup yang membuat platform tetap aman dan menghasilkan uang."

---

## 6. Developer Flywheel

```
Tiranyx build 3 Spot awal
        ↓
    Showcase di galantara.io
        ↓
    Developer lihat dan tertarik
        ↓
    Developer build modul/Spot baru
        ↓
    Modul masuk Marketplace
        ↓
    Developer dapat revenue (70%)
        ↓
    Lebih banyak developer datang
        ↓
    Lebih banyak konten & fitur
        ↓
    Lebih banyak user datang
        ↓
    Lebih banyak revenue untuk semua
        ↓
    (loop)
```

**Kunci flywheel ini berputar:** Tiranyx harus membangun 3 Spot pertama yang cukup bagus untuk membuat developer berpikir "gue bisa bikin yang lebih keren."

Kalau Spot pertama jelek → developer tidak tertarik → flywheel tidak berputar.
Kalau Spot pertama terlalu bagus dan susah ditiru → developer takut → flywheel tidak berputar.

Sweet spot: **Spot yang menarik tapi jelas achievable oleh developer indie.**

---

## 7. Roblox Studio Equivalent

Roblox tidak besar hanya karena engine-nya. Roblox besar karena **Roblox Studio** — tool yang membuat siapapun bisa membangun game tanpa harus jadi programmer expert.

Galantara butuh equivalent-nya:

### Tool A: AI 3D Studio (Sudah Ada)

Ini tool untuk generate asset 3D menggunakan AI. Sudah terintegrasi di Dev Hub di Oola. User bisa generate model, texture, dan animasi tanpa skill 3D modeling.

**Status:** Prototype ada, perlu polish.

### Tool B: Spot Builder — god.galantara.io (Belum Ada)

Ini adalah **PR terbesar yang belum dikerjakan.**

Spot Builder adalah visual editor berbasis web yang memungkinkan:
- Drag & drop asset ke grid
- Set zona (booth area, NPC spot, portal)
- Preview real-time
- Publish langsung ke galantara.io

Tanpa Spot Builder, hanya programmer yang bisa bikin Spot. Dengan Spot Builder, siapapun bisa bikin Spot — termasuk UMKM yang mau bikin "toko virtual" sendiri.

**Ini prioritas tinggi.** Tapi juga effort tinggi. Harus dijadwalkan dengan realistis.

---

## 8. Minecraft Analogy

Untuk memudahkan komunikasi arsitektur ke developer:

| Minecraft | Galantara | Keterangan |
|-----------|-----------|------------|
| Server | Private Spot | Satu instance dunia yang berjalan independen |
| Mod | Module (handler.js) | Script yang menambah behavior ke objek |
| Mod Pack | Bundle | Kumpulan modul yang saling kompatibel |
| Resource Pack | Asset Pack | Kumpulan model 3D, texture, sound |
| Plugin (Bukkit/Spigot) | SDK Module | Server-side logic yang extend platform |
| Creative Mode | Spot Builder | Visual editor untuk membangun |
| Survival Mode | Normal Mode | User experience biasa |
| Enchantment | Object Handler | "Jiwa" yang ditanam ke objek |
| Marketplace | galantara.io/marketplace | Tempat jual beli modul dan asset |

Analogi ini penting karena **jutaan orang sudah paham konsep Minecraft modding.** Kalau kita bisa bilang "Galantara itu seperti Minecraft tapi untuk bisnis nyata Indonesia", developer langsung paham arsitekturnya.

---

## 9. Gather Town Lesson

Gather Town gagal scale bukan karena teknologinya jelek. Gather Town gagal scale karena **tidak punya anchor use case yang kuat.**

"Virtual office" terdengar keren tapi:
- Perusahaan sudah punya Slack/Zoom
- Tidak ada alasan kuat untuk "duduk di virtual office"
- Novelty-nya hilang dalam 2 minggu

**Pelajaran untuk Galantara:** Kita butuh anchor use case yang jelas, kuat, dan sulit ditiru.

Anchor use case Galantara: **"Pasar Malam Digital Indonesia"**

Kenapa ini kuat:
1. **Budaya yang sudah ada** — Orang Indonesia suka pasar malam. Ini bukan behavior baru yang harus diajarkan.
2. **Revenue langsung** — Ada jual-beli nyata, bukan hanya "nongkrong virtual."
3. **Lokasi nyata** — Terhubung ke koordinat fisik, menciptakan trust.
4. **FOMO** — Dungeon timer, event terbatas, booth yang buka-tutup.
5. **Social proof** — Lihat avatar lain = tempat ini rame = menarik.

Setiap fitur yang kita bangun harus diukur terhadap pertanyaan: **"Apakah ini membuat Pasar Malam Digital lebih hidup?"**

---

## 10. Execution Order

### Phase 0 — Prototype Foundation (DONE)

- Isometric 3D world
- Avatar system
- Proximity zones
- NPC dialog
- Warp Portal
- Day/night cycle
- Deploy galantara.io

### Phase 1 — Foundation (Sprint 3-4)

**Goal:** Platform bisa dipakai secara nyata.

- Auth system (Supabase + Google OAuth)
- User persistence (save avatar, name, position)
- Multiplayer presence (Socket.io)
- Real-time chat
- Online counter
- Basic admin panel

**Milestone:** 2 orang bisa masuk Galantara bersamaan dan ngobrol.

### Phase 2 — Ekosistem Pertama (Sprint 5-6)

**Goal:** Satu Spot yang benar-benar berfungsi.

- Spot template system
- Spot Monas Jakarta
- Mighan Coin integration
- Travel fee
- Booth basic
- COD radius check

**Milestone:** User bisa masuk Spot Monas, lihat booth merchant, dan bayar pakai Mighan Coin.

### Phase 3 — Komunitas (Sprint 7)

**Goal:** Developer eksternal bisa mulai membangun.

- Developer portal (dev.galantara.io)
- SDK v1.0 release
- Asset submission flow
- Sandbox environment
- Marketplace MVP

**Milestone:** Developer non-Tiranyx berhasil publish modul pertama di Marketplace.

### Phase 4 — Viral Loop (Sprint 8)

**Goal:** Platform punya mekanisme pertumbuhan organik.

- Proximity voice
- Live embed (TikTok/YouTube)
- Sawer system
- Quest harian
- Referral system

**Milestone:** User invite user lain tanpa diminta.

---

## 11. Open Decisions

### 11.1 Token Naming

**Status: RESOLVED**

Nama token: **Mighan Coin**

Denominasi:
- BERLIAN (tertinggi)
- EMAS
- PERAK
- PERUNGGU (terendah)

Ledger: Vault system di Tiranyx backend.

### 11.2 Open Source Timing

**Status: OPEN**

Kapan kita open source Layer 1?

Opsi A: Sekarang (sebelum SDK stable) — Risiko: API berubah, developer frustasi.
Opsi B: Setelah SDK v1.0 freeze — Lebih aman, tapi lebih lambat.
Opsi C: Setelah 3 Spot live — Paling aman, tapi mungkin terlalu lambat.

**Rekomendasi:** Opsi B. Open source setelah SDK contract di-freeze di Sprint 7.

### 11.3 Spot Builder Timing

**Status: OPEN**

Spot Builder (god.galantara.io) adalah komponen kritis tapi effort-nya besar.

Opsi A: Bangun sebelum developer portal — Developer bisa visual build, tapi delay SDK.
Opsi B: Bangun setelah SDK — Developer awal pakai code, Spot Builder datang belakangan.
Opsi C: MVP Spot Builder bersamaan dengan SDK — Paling ideal, tapi butuh resource lebih.

**Rekomendasi:** Opsi B dengan timeline Spot Builder di Sprint 8-9.

### 11.4 SDK Spec Owner

**Status: OPEN**

Siapa yang maintain SDK spec?

Saat ini: Claude (acting CTO) draft, Fahmi approve.
Idealnya: Ada satu technical lead manusia yang own SDK spec long-term.

---

## 12. Gap Analysis

Saat ini ada **3 gap kritis** antara kondisi sekarang dan visi platform:

### Gap 1: Spot Builder Belum Ada

Tanpa Spot Builder, hanya programmer yang bisa bikin Spot. Ini membatasi pool kontributor secara drastis. UMKM yang mau bikin toko virtual tidak akan bisa tanpa tool visual.

**Impact:** Tinggi
**Timeline fix:** Sprint 8-9

### Gap 2: SDK Belum Di-freeze

SDK contract (lifecycle hooks, permission model, asset format) belum final. Ini berarti developer belum bisa mulai membangun dengan confidence bahwa kode mereka tidak akan break.

**Impact:** Tinggi
**Timeline fix:** Sprint 7

### Gap 3: Belum Open Source

Core engine masih closed. Ini berarti developer tidak bisa inspect source, tidak bisa debug, dan tidak punya trust bahwa platform transparan.

**Impact:** Medium (bisa ditunda sampai SDK stable)
**Timeline fix:** Setelah Sprint 7

---

## 13. Tech Stack Summary

| Layer | Technology | Status |
|-------|-----------|--------|
| Rendering | Three.js | Production |
| Frontend | Vanilla JS (single HTML) | Production |
| Auth | Supabase (Google OAuth) | Planned |
| Real-time | Socket.io + Fastify | Planned |
| Database | Supabase (PostgreSQL) | Planned |
| Ledger | Mighan Coin (Tiranyx backend) | Designed |
| Payment | Midtrans / Xendit | Planned |
| Voice | LiveKit | Planned |
| Maps | Mapbox | Planned |
| Analytics | GA4 (G-WNDQL8J455) | Production |
| Hosting | Hostinger KVM 2 | Production |
| Domain | galantara.io | Live |
| SSL | Let's Encrypt via aaPanel | Active |

---

## 14. Conclusion

Galantara punya visi yang jelas dan prototype yang solid. Sprint 0-2 sudah membuktikan bahwa konsepnya bekerja secara teknis.

Tiga gap yang harus ditutup:
1. **Spot Builder** — agar non-programmer bisa membangun
2. **SDK freeze** — agar developer bisa membangun dengan confidence
3. **Open source** — agar developer punya trust

Urutan eksekusi: Foundation (auth + multiplayer) → Spot pertama (Monas) → Developer ecosystem (SDK + marketplace) → Viral loop (social + live).

Setiap fase punya milestone yang jelas dan terukur. Tidak ada fase yang bergantung pada asumsi yang belum divalidasi.

---

> **"Platform yang tumbuh sendiri bukan soal banyaknya fitur. Platform yang tumbuh sendiri adalah platform yang mudah untuk dibangun oleh orang lain."**

---

*Document version: 1.0*
*Last updated: 2026-04-09*
*Next review: Setelah Sprint 3 selesai*