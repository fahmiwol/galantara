# Galantara --- Master Context untuk Claude Baru

> **Tanggal:** April 2026
> **Status:** Prototype selesai + Sprint 1+2 done, siap Beta
> **Domain:** galantara.io (LIVE)
> **Founder:** Fahmi (Tiranyx agency)

Dokumen ini adalah satu-satunya file yang perlu dibaca oleh Claude baru untuk memahami
seluruh konteks project Galantara. Jangan buat asumsi di luar dokumen ini.
Jika ada konflik antara dokumen lain dengan file ini, file ini yang menang.

---

## Daftar Isi

1. [Apa Itu Galantara](#1-apa-itu-galantara)
2. [Nama dan Istilah](#2-nama-dan-istilah)
3. [Konsep Inti](#3-konsep-inti)
4. [Prototype Sekarang](#4-prototype-sekarang)
5. [Stack Teknologi](#5-stack-teknologi)
6. [Aturan Teknis Wajib](#6-aturan-teknis-wajib)
7. [File Penting](#7-file-penting)
8. [Subdomain Architecture](#8-subdomain-architecture)
9. [Open Decisions](#9-open-decisions)
10. [Infrastruktur](#10-infrastruktur)
11. [Referensi dan Inspirasi](#11-referensi-dan-inspirasi)

---

## 1. Apa Itu Galantara

Galantara adalah **platform social-commerce hyperlocal berbasis peta Indonesia**.

Ini BUKAN metaverse berat. Bukan VR headset. Bukan blockchain game.

Bayangkan seperti ini:
- **Pasar malam digital** --- setiap titik di peta Indonesia bisa jadi tempat jualan, nongkrong, atau event
- **Tongkrongan virtual** --- avatar chibi ketemu di spot isometrik, ngobrol, interaksi
- **Live commerce** --- merchant verified bisa jualan langsung di spot mereka
- **Open dev ecosystem** --- developer bisa bikin plugin, mini-app, dan integrasi

Analoginya: Gather Town meets Roblox meets WordPress Plugin Store,
tapi untuk konteks Indonesia --- budaya berkumpul, COD, dan trust radius.

**Domain:** galantara.io (sudah LIVE sejak 2026-04-09)
**Founder:** Fahmi, owner Tiranyx agency --- digital entrepreneur Indonesia multi-domain.

**Core philosophy:**
- Privacy by design
- Open platform (bukan walled garden)
- Budaya berkumpul Indonesia sebagai fondasi UX
- Mighan Coin sebagai value exchange internal (non-blockchain)

---

## 2. Nama dan Istilah

Project ini pernah bernama WRAP City. Semua nama lama sudah di-rename.
Kalau menemukan istilah lama di codebase, gunakan mapping ini:

| Nama Lama            | Nama Baru                                        |
|----------------------|--------------------------------------------------|
| WRAP City            | **Galantara**                                    |
| The Nexus            | **Oola**                                         |
| Wrap Spot            | **Galantara Spot**                               |
| WRC / WRP            | **Mighan Coin (EMAS/PERAK/PERUNGGU/BERLIAN)**    |
| wrap.on SDK          | **galantara.on SDK**                             |
| [domain.com]         | **galantara.io**                                 |

**Catatan penting:**
- Jika menemukan variabel `wrapCity`, `wrcToken`, atau `nexusHub` di code, itu legacy.
  Rename ke konvensi baru saat refactor.
- Oola adalah nama internal untuk hub utama (landing zone saat user pertama masuk).
- Mighan Coin adalah sistem token internal, BUKAN cryptocurrency.

---

## 3. Konsep Inti

| Konsep                  | Penjelasan                                                                                                                                              |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Peta hyperlocal**     | Setiap titik di peta = ruang virtual hidup yang bisa dimasuki. Peta Indonesia adalah canvas utama. Zoom in = masuk ke kota, zoom lagi = masuk ke spot. |
| **Galantara Spot**      | Ruang isometrik semi-3D yang terhubung ke koordinat fisik Indonesia. Setiap spot punya owner, rules, dan visual sendiri.                                |
| **Radius system**       | Merchant harus berada dalam radius fisik dari spot mereka. Ini menciptakan trust dan memungkinkan COD verification. Anti-fake-location.                 |
| **User hierarchy**      | Guest (lihat saja) -> Tourist (bisa chat) -> Lokal Resident (verified, punya spot) -> Merchant Verified (bisa jualan, punya storefront).                |
| **Non-blockchain**      | Pure ledger system. Tidak pakai blockchain. Mighan Coin system sudah dibangun di `bank-tiranyx-temp/`. Cepat, murah, terkontrol.                        |
| **Token system**        | Mighan Coin dengan tier: EMAS (premium), PERAK (standard), PERUNGGU (micro), BERLIAN (rare/reward). Semua tercatat di Mighan Ledger.                   |
| **Spot types**          | 3 jenis utama:                                                                                                                                          |
|                         | - **Landmark Pariwisata**: curated oleh tim, bisa di-request oleh komunitas. Representasi destinasi wisata nyata.                                       |
|                         | - **Private Spot**: dibuat user, bisa free atau paid entry. Seperti "rumah virtual" atau "toko".                                                        |
|                         | - **Dungeon**: spontaneous event spot. Muncul tiba-tiba, durasi terbatas, bisa berisi challenge/reward.                                                 |
| **Warp Portal**         | Teleportasi antar kota. User bisa warp dari Jakarta ke Bali dalam satu klik. Setiap kota punya portal hub.                                             |
| **NPC System**          | NPC dengan dialog tree, powered by Claude API. Bisa jadi guide, quest giver, atau merchant assistant.                                                   |
| **Day/Night Cycle**     | Visual cycle yang mengikuti waktu nyata Indonesia (WIB/WITA/WIT). Mempengaruhi mood dan event availability.                                            |

---

## 4. Prototype Sekarang

File utama prototype: **`wrapcity-nexus-v3.html`**

Single HTML file, ukuran sekitar 82KB. Ini adalah proof-of-concept yang sudah berjalan.

**Engine:** Three.js isometric view

**Fitur yang sudah jalan di prototype:**
- Avatar chibi (low-poly, customizable warna)
- Proximity zones (trigger event saat avatar mendekat)
- NPC dialog tree (multi-branch conversation)
- Camera orbit + clamp (tidak bisa rotate bebas, ada batasan angle)
- Login gate (harus login sebelum masuk dunia)
- Day/night cycle (gradual transition, mengikuti waktu nyata)
- Chat system (bubble chat di atas avatar)
- Profile panel (stats, inventory preview)
- Dungeon countdown (timer untuk spontaneous events)
- Warp portal 6 kota: Jakarta, Bandung, Surabaya, Bali, Yogyakarta, Makassar
- Ambient sound (looping, volume berubah berdasarkan zona)

**Catatan:** Prototype ini monolitik (satu file HTML). Migrasi ke component-based
architecture adalah bagian dari Sprint 3+.

---

## 5. Stack Teknologi

| Layer              | Teknologi                    | Catatan                                                            |
|--------------------|------------------------------|--------------------------------------------------------------------|
| **3D Engine**      | Three.js                     | Akan migrasi ke React Three Fiber (R3F) di Sprint 3+              |
| **Realtime**       | Socket.io                    | Untuk multiplayer presence, chat, dan event broadcast              |
| **Auth**           | Supabase Auth                | Magic link + Google OAuth. Tidak pakai password tradisional.       |
| **Database**       | PostgreSQL                   | Via Supabase. Schema: users, spots, transactions, events           |
| **AI / NPC**       | Claude API                   | Dialog tree generation, NPC personality, quest narrative            |
| **Token Ledger**   | Mighan Ledger                | Fastify + Prisma. Terpisah dari app utama. Lokasi: bank-tiranyx-temp/ |
| **Frontend**       | HTML/CSS/JS (akan React)     | Prototype masih vanilla. Target: Next.js + R3F                     |
| **Hosting**        | Hostinger VPS                | aaPanel untuk management                                           |
| **SSL**            | Let's Encrypt                | Auto-renew via aaPanel                                             |
| **Analytics**      | GA4                          | Tracking ID: G-WNDQL8J455                                         |

**Migrasi path:**
```
[Sekarang] Three.js monolith (vanilla HTML)
    |
    v
[Sprint 3-4] React + React Three Fiber + Socket.io client
    |
    v
[Sprint 5+] Next.js SSR + API routes + Supabase realtime
```

---

## 6. Aturan Teknis Wajib

Ini adalah aturan yang TIDAK BOLEH dilanggar saat coding di project ini.
Setiap Claude agent yang bekerja di Galantara HARUS mengikuti aturan ini.

### 6.1 PHI Clamp
Kamera harus di-clamp pada sudut phi tertentu. Jangan biarkan user melihat
dari bawah ground plane atau dari atas 90 derajat. Range: `0.3 < phi < 1.2` radian.

### 6.2 Movement Relatif Kamera
Gerakan avatar HARUS relatif terhadap arah kamera, bukan world axis.
Jika kamera menghadap timur laut, tombol "atas" harus gerakkan avatar ke timur laut.
Bukan ke world-north.

### 6.3 No scene.traverse
DILARANG menggunakan `scene.traverse()` untuk operasi per-frame.
Ini terlalu mahal untuk scene yang akan berkembang. Gunakan reference langsung
atau group-based selection.

### 6.4 Grid Snap
Semua objek dan spot HARUS snap ke grid isometrik. Tidak ada posisi floating.
Grid size: 1 unit = 1 tile. Posisi selalu integer.

### 6.5 Avatar != GPS
Avatar di peta BUKAN representasi GPS user. Avatar adalah representasi virtual.
Posisi avatar ditentukan oleh warp portal yang dipilih, bukan lokasi fisik.
Lokasi fisik hanya digunakan untuk radius verification merchant.

### 6.6 Handler Timeout
Semua event handler dan API call HARUS punya timeout maksimal 3 detik.
Jika tidak respond dalam 3 detik, fallback ke state sebelumnya.
Tidak ada infinite loading state.

### 6.7 Tambahan
- Semua asset harus < 500KB per file (optimized untuk koneksi Indonesia)
- Lazy load untuk zona yang belum terlihat
- Fallback 2D jika WebGL tidak tersedia
- Tidak ada autoplay audio tanpa user interaction

---

## 7. File Penting

Berikut adalah file-file kunci di project ini. Lokasi relatif dari root project.

### Core Application
```
wrapcity-nexus-v3.html          -- Prototype utama (monolith)
index.html                      -- Landing page galantara.io
```

### Documentation
```
WRAP_City_Master_Context.md     -- File ini. Master handoff document.
docs/                           -- Folder dokumentasi tambahan
```

### Mighan Coin / Bank System
```
bank-tiranyx-temp/              -- Mighan Ledger backend
bank-tiranyx-temp/prisma/       -- Prisma schema untuk ledger
bank-tiranyx-temp/src/          -- Fastify routes dan logic
```

### Configuration
```
.env                            -- Environment variables (JANGAN commit)
package.json                    -- Dependencies
```

### Assets
```
assets/                         -- Gambar, sound, sprite
assets/avatars/                 -- Avatar chibi assets
assets/sounds/                  -- Ambient dan SFX
assets/tiles/                   -- Isometric tile set
```

### Agent Hub Reference
```
D:\Projects\AGENT-HUB\START_HERE.md  -- Panduan wajib semua agent
D:\Projects\tiranyx\docs\            -- Docs ekosistem Tiranyx
```

---

## 8. Subdomain Architecture

Galantara menggunakan arsitektur subdomain untuk memisahkan concern:

| Subdomain          | Fungsi                                                                    | Status       |
|--------------------|---------------------------------------------------------------------------|--------------|
| **galantara.io**   | Main app. Landing page + entry point ke dunia virtual.                    | LIVE         |
| **adm.galantara.io** | Admin panel. Dashboard internal untuk tim Galantara.                   | Planned      |
| **god.galantara.io** | God mode. Super admin untuk monitoring real-time seluruh dunia.         | Planned      |
| **vip.galantara.io** | VIP area. Exclusive content dan early access untuk tier tertinggi.      | Planned      |
| **dev.galantara.io** | Developer portal. API docs, SDK download, plugin marketplace.           | Planned      |
| **api.galantara.io** | API endpoint. RESTful + WebSocket untuk semua client.                   | Planned      |
| **sandbox.galantara.io** | Sandbox environment. Testing ground untuk developer dan plugin.     | Planned      |
| **status.galantara.io** | Status page. Uptime monitoring dan incident reports.                 | Planned      |

**Prioritas deployment:**
1. galantara.io (DONE)
2. api.galantara.io (Sprint 3)
3. adm.galantara.io (Sprint 3-4)
4. dev.galantara.io (Sprint 5)
5. Sisanya sesuai kebutuhan

---

## 9. Open Decisions

Keputusan-keputusan yang belum final dan perlu didiskusikan:

### 9.1 Branding: Standalone vs Tiranyx
- **Opsi A:** Galantara sebagai brand standalone, tidak mention Tiranyx di public
- **Opsi B:** "Galantara by Tiranyx" --- leverage existing brand
- **Status:** Belum diputuskan. Saat ini lean ke Opsi A untuk clean positioning.

### 9.2 Revenue Share Model
- Berapa persen cut dari transaksi di Galantara Spot?
- Apakah Mighan Coin conversion rate fixed atau floating?
- Free tier vs premium tier untuk spot creation?
- **Status:** Perlu financial modeling.

### 9.3 Dungeon Scheduling
- Apakah dungeon muncul random atau scheduled?
- Siapa yang bisa create dungeon? Hanya system atau juga user?
- Reward structure untuk dungeon completion?
- **Status:** Gameplay design belum final.

### 9.4 Live Commerce Approach
- Embed live streaming di dalam spot (WebRTC)?
- Atau redirect ke platform lain (Shopee Live, TikTok Live)?
- Atau hybrid: preview di spot, full experience di external?
- **Status:** Perlu riset teknis dan cost analysis.

### 9.5 Plugin / Mini-App System
- Format plugin: iframe sandbox atau custom runtime?
- Review process: manual approve atau automated scan?
- Monetization: developer pays listing fee atau revenue share?
- **Status:** Sprint 5+ discussion.

### 9.6 Moderation
- Siapa yang moderasi chat dan spot content?
- AI moderation (Claude) + human moderator hybrid?
- Report system dan ban mechanism?
- **Status:** Perlu policy document.

---

## 10. Infrastruktur

### Server
- **Provider:** Hostinger VPS
- **IP:** 72.62.125.6
- **Panel:** aaPanel (web-based server management)
- **OS:** Ubuntu (via aaPanel)

### Domain
- **Domain:** galantara.io
- **Status:** LIVE sejak 2026-04-09
- **SSL:** Active (Let's Encrypt, auto-renew)
- **DNS:** Managed via Hostinger

### Analytics
- **Platform:** Google Analytics 4
- **Tracking ID:** G-WNDQL8J455
- **Events tracked:** page_view, spot_enter, warp_use, chat_send, login

### Monitoring (Planned)
- Uptime monitoring via status.galantara.io
- Error tracking: Sentry (belum setup)
- Performance: Lighthouse CI (belum setup)

### Backup
- Database: Supabase automatic backup
- Code: Git repository
- Assets: Manual backup (perlu automate)

---

## 11. Referensi dan Inspirasi

Galantara mengambil inspirasi dari berbagai platform, tapi BUKAN clone dari satupun.
Ini adalah referensi untuk memahami "vibe" yang dikejar:

| Referensi          | Apa yang diambil                                                          | Apa yang TIDAK diambil                          |
|--------------------|---------------------------------------------------------------------------|------------------------------------------------|
| **Gather Town**    | Konsep ruang virtual 2D/isometrik untuk interaksi sosial                  | Fokus meeting/corporate. Galantara lebih commerce + social |
| **Roblox**         | User-generated content, economy system, avatar customization              | Target anak-anak. Galantara untuk semua umur, fokus commerce |
| **WordPress Plugin Store** | Open ecosystem, developer marketplace, plugin review system      | Blogging platform. Galantara bukan CMS                      |
| **Zapier**         | Integration mindset, connect berbagai service                             | Pure automation. Galantara punya visual world                |
| **Spline.design**  | 3D web experience yang ringan dan accessible                              | Design tool. Galantara bukan tool, tapi platform             |
| **mIRC**           | Chat culture Indonesia era 2000an, channel system, nickname culture       | Text-only. Galantara visual-first                            |

### Kenapa referensi ini penting?
- **Gather Town** = proof bahwa virtual space untuk interaksi itu works
- **Roblox** = proof bahwa UGC economy bisa massive
- **WordPress Plugin Store** = model open ecosystem yang proven
- **Zapier** = mindset "connect everything" untuk plugin system
- **Spline.design** = benchmark untuk 3D web performance
- **mIRC** = cultural reference untuk chat behavior orang Indonesia

---

## Catatan untuk Claude Agent Baru

1. **Baca file ini PERTAMA** sebelum melakukan apapun di project Galantara.
2. **Jangan rename file/folder** tanpa diskusi dengan Fahmi.
3. **Ikuti aturan teknis di Section 6** tanpa exception.
4. **Cek AGENT-HUB** di `D:\Projects\AGENT-HUB\START_HERE.md` untuk panduan umum semua agent.
5. **Mighan Coin logic** ada di `bank-tiranyx-temp/` --- jangan bikin sistem token baru.
6. **Prototype adalah monolith** --- refactor ke component harus incremental, bukan big bang.
7. **Semua perubahan besar** harus melalui Sprint planning, bukan langsung dikerjakan.
8. **Domain sudah LIVE** --- hati-hati dengan production deployment.
9. **Bahasa komunikasi** dengan Fahmi: Bahasa Indonesia. Code dan docs: English.
10. **Jangan buat keputusan** untuk item di Section 9 (Open Decisions) tanpa approval Fahmi.

---

## Changelog

| Tanggal     | Perubahan                                    |
|-------------|----------------------------------------------|
| 2026-04-09  | Initial master context document created      |
| 2026-04-09  | galantara.io domain goes LIVE                |
| 2026-04-09  | Sprint 1+2 completed, prototype functional   |

---

*Dokumen ini di-maintain oleh Fahmi (Tiranyx). Update terakhir: April 2026.*
