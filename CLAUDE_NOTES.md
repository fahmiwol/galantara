# Claude Session Notes — Galantara
> Update terakhir: 2026-04-13 · Agent: Claude (acting CTO) + catatan Cursor

---

## Identitas Proyek

| Nama | Keterangan |
|------|------------|
| **Galantara** | Nama platform / brand |
| **Oola** | Kota permulaan — pulau melayang bergaya surga (dulu "The Nexus") |
| **Galantara Spot** | Ruang virtual terhubung ke lokasi fisik Indonesia |
| **Tiranyx** | Agency induk — pemilik platform + ekosistem Mighan |
| **Mighan Coin** | Token ekonomi (EMAS/PERAK/PERUNGGU/BERLIAN) — menggantikan WRC/WRP |
| **WRAP City** | Nama kerja lama — sudah tidak dipakai |

---

## Visi Besar (Dari Fahmi Sendiri)

> "Orang Indonesia yang nongkrong, ketawa, beli-beli, dan saling kenal — sekarang bisa dilakukan dari mana saja."

Galantara = **digitalisasi budaya berkumpul Indonesia**. Bukan metaverse. Bukan marketplace. Tapi pasar malam digital yang hidup — tempat orang nongkrong, jualan, ngamen, live, cari jodoh, main game, semua terhubung ke lokasi fisik nyata.

### DNA Produk (founding decisions yang tidak boleh diubah)
1. **Komersial dari hari pertama** — "tujuan komersial" ada di kalimat pertama Fahmi
2. **Avatar ≠ posisi fisik** — privacy by design. "Nanti orang bisa diculik kalau gitu."
3. **Platform, bukan aplikasi** — Roblox + WordPress Plugin + Zapier. Siapapun bisa build & jual
4. **Programmable Objects = "jiwa"** — model 3D sama, script logic (handler.js) yang beda
5. **Radius = trust** — seller beneran ada di lokasi. COD terverifikasi.
6. **No empty world** — NPC AI 24/7, challenge harian, dungeon tiba-tiba, pedagang/performer beneran
7. **No popup onboarding** — user langsung masuk Oola, jalan bebas sebagai guest

---

## Yang Bisa Dilakukan User di Galantara

### Jualan Produk
- Buka booth di Galantara Spot
- Harus dalam radius fisik (GPS + IP verified)
- COD dengan kode unik sesi — anti penipuan
- Rating wajib setelah transaksi
- Bayar pakai Mighan (Perak)

### Ngamen / Perform
- Live musik/perform dari HP
- Proximity voice: makin deket makin keras (LiveKit WebRTC)
- Avatar-avatar yang lewat bisa berhenti nonton
- Dapat sawer — animasi koin beterbangan

### Live Streaming
- Embed TikTok Live / YouTube Live / Twitch di atas avatar
- Sawer pakai Mighan langsung dari dalam app
- Live shopping: pin produk dari booth sambil live
- Penonton = avatar yang berdiri di depan kamu (bukan angka abstrak)

### Jual Jasa
- Offer Card system (penawaran formal, beda dari chat)
- Nego → deal → reveal lokasi opt-in
- Bayar setelah jasa selesai (proteksi buyer)
- Kode unik sesi untuk konfirmasi fisik saat meet-up

### Nongkrong & Sosial
- Text chat bubble di atas avatar
- Proximity voice chat
- Private message 1-on-1
- Mini games: catur, ludo, tebak-tebakan, fighting
- Quest & challenge harian

---

## Ekonomi Lahan & Iklan

### Sewa Tanah di Galantara Spot
- Grid = petak tanah. Sewa per petak, per durasi (harian/mingguan/bulanan)
- Ukuran: Lapak 1×1, Booth 2×2, Gedung 3×3, Landmark 5×5
- Setelah sewa bisa: buka toko, bangun bangunan 3D custom, install modul marketplace, live stage, kantor virtual, event space, pasang Programmable Object
- Lahan terbatas PER SPOT = kelangkaan = nilai ekonomi real
- Bisa sub-sewa (subletting): sewa 3×3, sewakan sebagian ke orang lain

### Iklan & Sponsorship
- Billboard 3D di posisi strategis (admin jual slot)
- Sponsored NPC — NPC yang ngobrol natural tentang brand
- Sponsored Quest — challenge harian disponsori brand (user dapat reward, brand dapat engagement)
- Sponsored Dungeon — dungeon bertema brand, reward = voucher produk fisik
- Penyewa lahan bisa pasang promo sendiri di area yang disewa

### Kenapa Spot Terbatas Areanya (by design)
1. Kelangkaan = nilai (lahan terbatas → harga ditentukan pasar)
2. Kepadatan = kehidupan (10 orang di 100 petak = rame. 10 di 10.000 = mati)
3. Pertumbuhan organik (Spot penuh → buka ekspansi/Spot baru karena demand)
4. Performa (sedikit objek = HP kentang tetap lancar)

### Travel Fee (est. 35% revenue)
- User di luar radius Spot → masuk sebagai Tourist → bayar travel fee (Perak)
- Tourist BISA: beli, chat, nonton, sawer, main game
- Tourist TIDAK BISA: buka toko, jual jasa COD, jadi Merchant Verified
- Tourist HARUS punya tanda visual (badge kuning, ikon koper, atau ring warna beda)
- Ini memperluas market merchant lokal ke se-Indonesia tanpa mengorbankan trust

### Mini Games Sosial
- Main bareng temen yang ketemu di Spot: catur, kartu, tebak-tebakan, suit, ludo, fighting, impostor
- Bisa taruhan kecil (Perak) — pemenang dapat, platform potong fee
- Mini game bisa DIBUAT developer komunitas → jual di Marketplace → Spot owner install

### Integrasi Event Dunia Nyata (Bridge Digital <> Fisik)
- QR di lokasi nyata → unlock konten eksklusif di Spot virtual
- Event fisik punya mirror virtual (vendor sama, live stream, booth virtual)
- Voucher dari quest → tukar di toko fisik beneran
- COD: transaksi mulai di virtual, selesai di fisik
- Dungeon treasure hunt IRL: clue di game + clue di lokasi fisik
- Konser hybrid: band live + stage virtual embed stream + sawer + merchandise

---

## Spot Hierarchy (Dikonfirmasi Fahmi)

```
Landmark Pariwisata (curated oleh Tiranyx)
  ├── Monas Jakarta, Kuta Beach Bali, Malioboro Yogya, dll
  ├── Bisa di-request oleh komunitas → admin approve
  └── Tema unik per lokasi: arsitektur, warna, atmosfer

Private Spot (siapapun bisa buat)
  ├── Free — untuk komunitas, gathering, kantor virtual
  └── Berbayar — event, konser, kelas online, paid gathering

Dungeon (surprise mechanic)
  ├── Muncul tiba-tiba, tidak diumumkan sebelumnya
  ├── Timer terbatas → FOMO mechanic
  └── Bisa brand-sponsored (voucher produk fisik sebagai reward)
```

---

## Detail Dunia yang Dikonfirmasi

### Timezone / Day-Night Cycle
- Dunia Galantara mengikuti timezone user
- Pagi, siang, malam berubah sesuai waktu nyata
- Skybox, pencahayaan, ambient dinamis
- Implementasi: `new Date().getHours()` → atur sun position, sky color, light intensity

### Visual Style
- Soft · Bubbly · Playful · Low Poly · Semi-3D · Chibi
- Referensi: Spline.design 3D cute
- Palette per Spot: sesuai lokasi (emas/lavender untuk Oola, hijau/emas untuk Monas, dll)

### Camera System (JANGAN DILANGGAR)
- PHI_MIN = Math.PI * 0.18, PHI_MAX = Math.PI * 0.42
- Movement RELATIF kamera (sin/cos dari theta)
- JANGAN scene.traverse() di animate loop — pakai direct refs
- Camera lerp: 0.18 (bergerak), 0.10 (diam)

---

## Token = Mighan Coin (Tiranyx Ecosystem)

| Koin | Fungsi |
|------|--------|
| EMAS | Top-up dari Rupiah (master currency) |
| PERAK | Spending coin — bayar jasa, travel fee, transaksi P2P |
| PERUNGGU | Fee transaksi platform |
| BERLIAN | Engagement coin — dapat dari aktivitas, tidak bisa diuangkan |

WRC/WRP adalah nama lama dari PRD awal. Mighan Ledger Vault sudah dibangun di `bank-tiranyx-temp/`.

---

## Arsitektur Platform (3 Layer)

```
LAYER 3 — EKOSISTEM (Community-Built)
  Galantara Spots · Modul · Asset · NPC Custom
  
LAYER 2 — PLATFORM (Galantara-Owned / Proprietary)
  Auth · Mighan Ledger · Marketplace · KYC · Analytics
  
LAYER 1 — CORE ENGINE (Open Source — MIT)
  Three.js Renderer · Avatar · Grid · Proximity · SDK Spec · Asset Format
```

---

## Infrastruktur VPS (Confirmed)

| Item | Detail |
|------|--------|
| Provider | Hostinger (KVM 2) |
| IP | 72.62.125.6 |
| Hostname | srv1521061.hstgr.cloud |
| Panel | aaPanel + Nginx 1.24.0 |
| Status | Running |
| **Expires** | **2026-04-23 (PERPANJANG!)** |
| Existing sites | tiranyx.co.id (:3001), apix.tiranyx.co.id (:8787), revolusitani.com (static) |
| **galantara.io** | **LIVE — deployed 2026-04-09** |
| Deploy path | /www/wwwroot/galantara.io/index.html |
| SSL | Aktif — Let's Encrypt, HTTPS |
| Analytics | GA4 — G-WNDQL8J455 |
| SEO | OG tags + meta description |

---

## Known Issues / PR

| Issue | Prioritas | Solusi |
|-------|-----------|--------|
| **Mighan Coin + wallet HUD belum nyata** — panel Token di UI placeholder; tidak ada saldo live, tidak ada API ledger ke game | **Tinggi (revenue path)** | Sprint 7: hubungkan ledger (Fastify+Prisma / Supabase sesuai arsitektur terpilih), wallet panel baca saldo PERAK/BERLIAN, top-up Midtrans/Xendit. Lihat `TODO.md` Sprint 7 + `docs/GALANTARA_EKONOMI_KOIN.md`. |
| Peta Indonesia SVG di Warp Portal jelek — bentuk pulau kasar, dot numpuk | Visual | Opsi 1: SVG path akurat. Opsi 2: Mapbox GL JS. Opsi 3: Ilustrasi custom. |
| Ambient audio CDN link bisa mati — perlu self-host atau fallback | Infra | Host file audio di Cloudflare R2 atau bundle base64 |
| Dungeon countdown belum punya "masuk dungeon" action — cuma timer | UX | Perlu zone/portal dungeon di world yang muncul saat timer aktif |
| NPC masih jalan-jalan random saat dialog dibuka — bisa aneh | Polish | Freeze NPC position saat dialog aktif |
| Online count di HUD (128) masih hardcoded | Data | Ganti ke real count saat Socket.io ready (Sprint 4) |

---

## File di Disk

| File/Folder | Isi | Status |
|-------------|-----|--------|
| `wrapcity-nexus-v3.html` | Game Oola (Three.js) — SEMUA fitur Sprint 0-2 | Recover dari VPS |
| `ai-3d-studio/ai3d-studio.html` | Tool pipeline 3D asset | ⚠️ Perlu cek |
| `bank-tiranyx-temp/` | Di workspace ini isinya **minimal** (mis. `wallet-ui.html`); ledger Mighan penuh mungkin di path/VPS lain — **belum ter-wire ke galantara.io** | ⚠️ Integrasi belum |
| `docs/AGENT_SHARED_KNOWLEDGE.md` | Perubahan, skill, temuan, referensi, artefak, modul — reuse agent / proyek lain | ✅ 2026-04-13 |
| `docs/CTO_ARCHITECTURE_PROPOSAL.md` | Proposal arsitektur platform | Recreated |
| `docs/GALANTARA_EKONOMI_KOIN.md` | Sistem koin Mighan | ✅ Ada (survived) |
| `Galantara PRD utama Read Me.md` | PRD v4.0 (Galantara branding) | Recreated |
| `WRAP_City_Master_Context.md` | Handoff doc | Recreated |
| `Masalah yang Diselesaikan _ READ ME.md` | Vision doc | Recreated |
| `SPRINT_PLAN.md` | Sprint plan 0-8 + backlog | Recreated |
| `apps/web/index.html` | Dev redirect ke game | Recreated |
| `apps/web/README-DEPLOY.md` | Panduan deploy galantara.io | Recreated |

---

## Yang Sudah Dikerjakan (Sprint 0 + Sprint 1 + Sprint 2)

### Sprint 0 — Prototype ✅
- Isometric 3D world Three.js
- Avatar chibi + movement relatif kamera
- Proximity zones
- Login gate bottom bar
- Camera clamp + performance fix
- Rebranding WRAP City → Galantara, The Nexus → Oola

### Sprint 1 — Avatar & Communication ✅
- Profile Panel (klik user → nama + avatar color picker 8 preset)
- G.displayName dinamis di label avatar
- Chat bar (post-login, bubble di atas avatar)
- Dev Hub → AI 3D Studio button

### Sprint 2 — World Enrichment ✅
- Day/night cycle (timezone user)
- NPC dialog tree (6 NPC: Guide, Budi, Maya, Sari, Dev, Dewi — multi-step)
- Warp Portal 6 kota (Bogor, Monas, Kuta, Malioboro, Braga, Losari)
- Ambient sound toggle
- Dungeon countdown timer FOMO
- Deploy galantara.io + SSL + GA4 + SEO

---

## Avatar Children Indices in makeAvatar()
0=torso, 1=head, 2-3=eyes(dm), 4-5=cheeks(bm), 6=leg-L(fm), 7=leg-R(fm), 8=arm-L(m), 9=arm-R(m)

## NPC Data (NPCS array)
- Guide: orange, x:-5, z:3 — Pemandu Oola
- Budi: teal, x:3, z:6 — Warga Oola
- Maya: pink, x:-8, z:-5 — Travel Guide
- Sari: purple, x:7, z:-3 — Dungeon Scout
- Dev: green, x:9, z:5 — Core Developer
- Dewi: red, x:6, z:-7 — Promo Kuta Spot

## Aturan Teknis Wajib
1. PHI_MIN = Math.PI * 0.18, PHI_MAX = Math.PI * 0.42
2. Movement RELATIF kamera (sin/cos dari theta)
3. JANGAN scene.traverse() di animate loop
4. Semua objek snap grid 1×1
5. Avatar ≠ posisi GPS user
6. Admin tidak kena token cost
7. handler.js max 3 detik, non-blocking

---

## Open Decisions

1. **Branding**: "Galantara by Tiranyx" atau "Galantara" standalone?
2. **Revenue share developer**: 70/30 atau 80/20?
3. **Dungeon**: totally random atau semi-scheduled?
4. **Live V1**: native atau embed dulu?

---

*Update file ini setiap sesi. Ini adalah sumber kebenaran utama untuk semua agent.*
