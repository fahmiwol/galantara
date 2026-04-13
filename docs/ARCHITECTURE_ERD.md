# Galantara — Database Architecture & ERD
> Rancangan sistem database untuk commerce, world, dan ekosistem.
> Author: Claude (acting CTO) · Review: Fahmi (Tiranyx)
> Tanggal: 2026-04-12 · Status: Living Document

---

## 1. Prinsip Arsitektur

### Satu Platform, Dua Engine

```
┌────────────────────────────────────────────────────────────┐
│                    GALANTARA PLATFORM                      │
├──────────────────────────┬─────────────────────────────────┤
│   GAME ENGINE            │   FINANCIAL ENGINE              │
│   Supabase PostgreSQL    │   bank-tiranyx                  │
│                          │   (Fastify + Prisma + PG)       │
│   • Users / Profiles     │   • Wallets                     │
│   • Spots & World        │   • Ledger (immutable)          │
│   • Booths & Products    │   • Coin identity (crypto)      │
│   • Orders & COD         │   • Top-up (Midtrans/Xendit)   │
│   • Land Leases          │   • Withdrawal to bank          │
│   • Advertisements       │   • Supply management           │
│   • Quests & Dungeons    │   • P2P transfer                │
│   • Cosmetics            │   • BERLIAN rewards             │
│   • Moderation           │                                 │
│   • Notifications        │   API: POST /transfer           │
│                          │        POST /mint/topup         │
│   Auth: Supabase Auth    │        POST /withdraw           │
│         (Google OAuth)   │        GET /wallet/:userId      │
└──────────────────────────┴─────────────────────────────────┘
```

**Komunikasi:** Galantara backend memanggil bank-tiranyx REST API untuk semua operasi keuangan. Financial engine TIDAK PERNAH mengakses Supabase secara langsung. Supabase TIDAK PERNAH mengakses wallet database secara langsung.

### Prinsip Desain

1. **Revenue-first** — Setiap tabel punya jalur yang jelas ke revenue stream
2. **Audit trail everywhere** — Semua transaksi dan perubahan status dicatat (immutable ledger di bank-tiranyx, `*_timeline` tables di Supabase)
3. **Offline-ready** — COD flow harus bisa berjalan tanpa internet stabil (kode unik, verify nanti)
4. **Privacy by design** — Koordinat GPS user tidak disimpan, hanya status "dalam radius / luar radius"
5. **OJK-compliant framing** — Mighan Coin = token utilitas, bukan e-money. Field naming harus konsisten dengan framing ini.
6. **Visioner** — Schema harus support fitur Sprint 5-10 tanpa major breaking changes

---

## 2. Revenue Flow Diagram

```
User Top-up (Rp 10.000)
      │
      ▼ Midtrans/Xendit
bank-tiranyx: mint 1 EMAS → auto-convert → 1 PERAK (Rp 8.000)
      │                                   Margin: +Rp 2.000 ✓
      │
      ├──── Travel Fee ─────────► Platform Wallet (+PERAK)
      │     (0.5-2 PERAK)           Margin: 100% ✓
      │
      ├──── Sewa Lahan ─────────► Platform Wallet (+PERAK)
      │     (N PERAK/hari)          Margin: 100% ✓
      │
      ├──── Beli Produk ────────► Seller (+PERUNGGU)
      │     (N PERAK)               Cut Platform: 3-5% ✓
      │                             Seller withdraw min 10 PERUNGGU = Rp 50.000
      │
      ├──── Iklan Billboard ────► Platform Wallet (+PERAK)
      │     (N PERAK/hari)          Margin: 100% ✓
      │
      ├──── Sawer/Tip ──────────► Performer (+PERUNGGU)
      │     (BERLIAN/PERAK)         Cut Platform: 10% ✓
      │
      └──── Avatar Cosmetic ────► Platform Wallet (+PERAK)
            (N PERAK)               Margin: 100% ✓

BERLIAN (engagement coin):
User aktif → dapat BERLIAN → unlock cosmetic / boost / badge
BERLIAN tidak bisa dibeli, tidak bisa dicairkan → pure engagement driver
```

---

## 3. Entity Relationship Diagram (ERD)

```
USERS & AUTH
────────────
profiles ──────────────┬──── user_kyc
   │ 1                 │
   │                   └──── user_cosmetics ──── cosmetics
   ├── wallets* (bank-tiranyx, linked by user_id)
   │
   ├── 1:N ── land_leases ──── land_parcels ──── spots
   │               │
   │               └── 1:1 ── booths ─── products
   │                                         │
   ├── 1:N ── orders ──────────────────── (buyer)
   │               │
   │               └── order_timeline
   │               └── reviews
   │
   ├── 1:N ── travel_passes ──── spots
   ├── 1:N ── advertisements ──── ad_slots ──── spots
   ├── 1:N ── quest_progress ──── quests
   ├── 1:N ── dungeon_participants ──── dungeons ──── spots
   ├── 1:N ── sawer_transactions (as sender/receiver)
   ├── 1:N ── notifications
   └── 1:N ── reports (as reporter)

SPOTS & WORLD
─────────────
spots ──── spot_zones
   │           │
   │           ├── land_parcels
   │           ├── ad_slots
   │           └── npc_configs
   │
   ├── dungeons
   ├── spot_analytics (daily aggregated)
   └── module_installs ──── modules

COMMERCE
─────────
booths ──── booth_schedule
   │
   └── products ──── product_images
           │         product_category_map ──── product_categories
           │
           └── order_items ──── orders
```

---

## 4. Full Database Schema (Supabase PostgreSQL)

> Semua UUID menggunakan `gen_random_uuid()`.
> Semua timestamp menggunakan `TIMESTAMPTZ` (timezone-aware).
> Konvensi: snake_case, plural table names.

---

### BLOCK 1: USERS & AUTH

```sql
-- ─────────────────────────────────────────────
-- profiles: extends Supabase Auth (auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,          -- @handle, immutable setelah set
  display_name    TEXT NOT NULL,
  avatar_color    INT  NOT NULL DEFAULT 9175231, -- hex 0x8C0AFF
  avatar_outfit   UUID,                          -- FK cosmetics (nullable)
  bio             TEXT,
  role            TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('guest','user','merchant','developer','moderator','admin')),
  kyc_status      TEXT NOT NULL DEFAULT 'none'
                  CHECK (kyc_status IN ('none','pending','verified','rejected')),
  is_banned       BOOL NOT NULL DEFAULT FALSE,
  -- Presence (updated by Socket.io server via service account)
  current_spot_id UUID,                          -- FK spots
  last_seen_at    TIMESTAMPTZ,
  -- Stats (cached, updated by triggers)
  total_purchases INT NOT NULL DEFAULT 0,
  total_sales     INT NOT NULL DEFAULT 0,
  total_spots_visited INT NOT NULL DEFAULT 0,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- user_kyc: KYC data merchant (encrypted)
-- Terpisah dari profiles untuk privacy + akses terbatas
-- ─────────────────────────────────────────────
CREATE TABLE user_kyc (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES profiles(id),
  real_name       TEXT NOT NULL,                 -- encrypted at app level
  id_type         TEXT NOT NULL DEFAULT 'ktp'
                  CHECK (id_type IN ('ktp','sim','passport')),
  id_number       TEXT NOT NULL,                 -- encrypted at app level
  phone           TEXT NOT NULL,                 -- encrypted
  phone_verified  BOOL NOT NULL DEFAULT FALSE,
  selfie_url      TEXT,                          -- Supabase Storage
  id_photo_url    TEXT,                          -- Supabase Storage
  reviewed_by     UUID REFERENCES profiles(id),
  review_note     TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  CONSTRAINT kyc_status_check CHECK (
    (reviewed_by IS NULL) = (reviewed_at IS NULL)
  )
);
```

---

### BLOCK 2: WORLD & SPOTS

```sql
-- ─────────────────────────────────────────────
-- spots: virtual locations tied to real coordinates
-- ─────────────────────────────────────────────
CREATE TABLE spots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,          -- "bogor-alun-alun"
  name            TEXT NOT NULL,                 -- "Alun-Alun Bogor"
  city            TEXT NOT NULL,
  province        TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'ID',
  -- Real-world location (privacy: only approximate stored)
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  radius_km       DECIMAL(5,2) NOT NULL DEFAULT 1.0,  -- untuk local merchant check
  -- Type & ownership
  type            TEXT NOT NULL DEFAULT 'landmark'
                  CHECK (type IN ('hub','landmark','private','dungeon_zone','event')),
  owner_id        UUID REFERENCES profiles(id),  -- null = platform-owned
  -- World config
  grid_width      INT NOT NULL DEFAULT 50,
  grid_height     INT NOT NULL DEFAULT 50,
  cell_size       DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  spawn_x         INT NOT NULL DEFAULT 25,
  spawn_z         INT NOT NULL DEFAULT 25,
  scene_config    JSONB NOT NULL DEFAULT '{}',   -- Three.js scene, fog, sky colors
  -- Commerce config
  travel_fee_slv  INT NOT NULL DEFAULT 0,        -- PERAK untuk Tourist masuk
  land_base_rent_slv_per_day INT NOT NULL DEFAULT 5, -- harga dasar per cell per hari
  -- Access
  max_players     INT NOT NULL DEFAULT 50,
  is_public       BOOL NOT NULL DEFAULT TRUE,
  access_password TEXT,                          -- untuk private spot
  -- Status
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('draft','active','maintenance','closed')),
  is_featured     BOOL NOT NULL DEFAULT FALSE,
  -- Cached stats (updated by background job)
  player_count    INT NOT NULL DEFAULT 0,
  booth_count     INT NOT NULL DEFAULT 0,
  -- Media
  thumbnail_url   TEXT,
  banner_url      TEXT,
  description     TEXT,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- spot_zones: special areas within a spot
-- ─────────────────────────────────────────────
CREATE TABLE spot_zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN (
                    'booth_area','warp_portal','npc_zone',
                    'dungeon_portal','billboard_zone','stage',
                    'pvp_zone','quest_area'
                  )),
  -- Grid position & size
  grid_x          INT NOT NULL,
  grid_z          INT NOT NULL,
  width           INT NOT NULL DEFAULT 1,
  depth           INT NOT NULL DEFAULT 1,
  -- Premium pricing multiplier (1.0 = base price)
  rent_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  -- Type-specific config (warp target, npc_id, dungeon config, etc)
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- npc_configs: NPC dialog trees per spot
-- ─────────────────────────────────────────────
CREATE TABLE npc_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'guide',
  avatar_color    INT NOT NULL,
  position_x      DECIMAL(6,2) NOT NULL,
  position_z      DECIMAL(6,2) NOT NULL,
  idle_message    TEXT,
  dialog_tree     JSONB NOT NULL DEFAULT '[]', -- multi-step dialog
  -- Sponsored NPC: brand script
  sponsor_id      UUID REFERENCES profiles(id),
  is_ai_powered   BOOL NOT NULL DEFAULT FALSE, -- future: Claude-powered
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### BLOCK 3: LAND & LEASES

```sql
-- ─────────────────────────────────────────────
-- land_parcels: grid cells available for rent
-- ─────────────────────────────────────────────
CREATE TABLE land_parcels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  zone_id         UUID REFERENCES spot_zones(id),
  -- Grid position
  grid_x          INT NOT NULL,
  grid_z          INT NOT NULL,
  -- Size (lapak=1x1, booth=2x2, gedung=3x3, landmark=5x5)
  size_w          INT NOT NULL DEFAULT 1,
  size_d          INT NOT NULL DEFAULT 1,
  parcel_type     TEXT NOT NULL DEFAULT 'lapak'
                  CHECK (parcel_type IN ('lapak','booth','gedung','landmark')),
  -- Pricing
  rent_slv_per_day INT NOT NULL,               -- base price * zone multiplier
  is_premium      BOOL NOT NULL DEFAULT FALSE,
  -- Status
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','leased','reserved','platform_use')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(spot_id, grid_x, grid_z)               -- satu titik = satu parcel
);

-- ─────────────────────────────────────────────
-- land_leases: rental agreements (binding contract)
-- ─────────────────────────────────────────────
CREATE TABLE land_leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       UUID NOT NULL REFERENCES land_parcels(id),
  tenant_id       UUID NOT NULL REFERENCES profiles(id),
  -- Lease period
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_days   INT NOT NULL,
  -- Pricing locked at lease time
  rent_slv_per_day INT NOT NULL,
  total_slv_paid  INT NOT NULL,
  -- Options
  auto_renew      BOOL NOT NULL DEFAULT FALSE,
  subletting_allowed BOOL NOT NULL DEFAULT FALSE,
  -- Status
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','terminated','pending')),
  terminated_by   UUID REFERENCES profiles(id),
  terminated_at   TIMESTAMPTZ,
  termination_reason TEXT,
  -- ledger reference (bank-tiranyx transaction ID)
  payment_tx_id   TEXT,                        -- bank-tiranyx txId
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- sub_leases: subletting (sewa dari penyewa)
-- ─────────────────────────────────────────────
CREATE TABLE sub_leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_lease_id UUID NOT NULL REFERENCES land_leases(id),
  sub_parcel_id   UUID NOT NULL REFERENCES land_parcels(id),
  sub_tenant_id   UUID NOT NULL REFERENCES profiles(id),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  rent_slv_per_day INT NOT NULL,
  total_slv_paid  INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','terminated')),
  payment_tx_id   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### BLOCK 4: BOOTHS & PRODUCTS

```sql
-- ─────────────────────────────────────────────
-- booths: merchant stalls on leased land
-- ─────────────────────────────────────────────
CREATE TABLE booths (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id        UUID NOT NULL REFERENCES land_leases(id),
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  parcel_id       UUID NOT NULL REFERENCES land_parcels(id),
  -- Identity
  name            TEXT NOT NULL,
  tagline         TEXT,
  description     TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  -- 3D appearance
  asset_id        TEXT DEFAULT 'default_booth',  -- 3D object identifier
  object_config   JSONB NOT NULL DEFAULT '{}',   -- colors, sign, decorations
  -- Verification
  is_local_verified BOOL NOT NULL DEFAULT FALSE, -- merchant within spot radius
  -- Status
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','closed','suspended','setup')),
  -- Cached stats
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  total_sales_count INT NOT NULL DEFAULT 0,
  total_sales_slv INT NOT NULL DEFAULT 0,
  -- Operating hours flag
  has_schedule    BOOL NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- booth_schedule: jam operasional
-- ─────────────────────────────────────────────
CREATE TABLE booth_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id        UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  open_time       TIME NOT NULL,
  close_time      TIME NOT NULL,
  is_closed       BOOL NOT NULL DEFAULT FALSE   -- tutup di hari ini
);

-- ─────────────────────────────────────────────
-- product_categories: taxonomy produk
-- ─────────────────────────────────────────────
CREATE TABLE product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES product_categories(id),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  icon            TEXT,
  sort_order      INT NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────
-- products: items di dalam booth
-- ─────────────────────────────────────────────
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id        UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  -- Identity
  name            TEXT NOT NULL,
  description     TEXT,
  -- Pricing
  price_slv       INT NOT NULL,                -- PERAK — harga utama
  price_idr       INT,                         -- IDR reference untuk COD
  -- Stock
  stock           INT,                         -- NULL = unlimited
  stock_alert_at  INT DEFAULT 5,               -- notif kalau stock tinggal N
  -- Type
  product_type    TEXT NOT NULL DEFAULT 'physical'
                  CHECK (product_type IN ('physical','digital','service','experience')),
  delivery_type   TEXT NOT NULL DEFAULT 'cod'
                  CHECK (delivery_type IN ('cod','digital_delivery','pickup','shipping')),
  -- Content
  digital_url     TEXT,                        -- untuk digital product
  -- Status
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','sold_out','suspended','archived')),
  -- Cached stats
  total_sold      INT NOT NULL DEFAULT 0,
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  -- Boost (iklan produk)
  is_boosted      BOOL NOT NULL DEFAULT FALSE,
  boost_ends_at   TIMESTAMPTZ,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- product images (bisa multiple)
CREATE TABLE product_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  is_primary      BOOL NOT NULL DEFAULT FALSE
);

-- product-category junction
CREATE TABLE product_category_map (
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
```

---

### BLOCK 5: ORDERS & TRANSACTIONS

```sql
-- ─────────────────────────────────────────────
-- orders: purchase records
-- ─────────────────────────────────────────────
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Parties
  buyer_id        UUID NOT NULL REFERENCES profiles(id),
  seller_id       UUID NOT NULL REFERENCES profiles(id),
  booth_id        UUID NOT NULL REFERENCES booths(id),
  -- Context
  spot_id         UUID NOT NULL REFERENCES spots(id),
  -- Pricing (locked at order time)
  unit_price_slv  INT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1,
  subtotal_slv    INT NOT NULL,               -- quantity * unit_price
  platform_fee_slv INT NOT NULL DEFAULT 0,   -- 3-5% platform cut
  total_slv       INT NOT NULL,               -- subtotal - platform_fee (buyer pays subtotal)
  seller_brz      INT NOT NULL,               -- PERUNGGU seller terima (total - fee converted)
  -- Delivery
  delivery_type   TEXT NOT NULL,
  -- COD flow
  cod_code        TEXT UNIQUE,                -- 6-digit unique code untuk verifikasi IRL
  cod_meet_location TEXT,                     -- agreed meeting point
  cod_verified_at TIMESTAMPTZ,
  -- Digital delivery
  digital_download_url TEXT,
  -- Status state machine
  status          TEXT NOT NULL DEFAULT 'pending_payment'
                  CHECK (status IN (
                    'pending_payment',    -- buyer belum bayar
                    'paid',              -- PERAK sudah di-escrow
                    'processing',        -- seller konfirmasi terima order
                    'ready',             -- siap untuk COD/pickup
                    'completed',         -- COD verified / digital delivered
                    'disputed',          -- ada sengketa
                    'refunded',          -- buyer dapat refund
                    'cancelled'          -- dibatalkan sebelum paid
                  )),
  -- Dispute
  dispute_reason  TEXT,
  dispute_by      UUID REFERENCES profiles(id),
  dispute_at      TIMESTAMPTZ,
  -- Financial ledger refs (bank-tiranyx transaction IDs)
  escrow_tx_id    TEXT,                       -- saat buyer bayar (PERAK ke escrow)
  release_tx_id   TEXT,                       -- saat seller dapat PERUNGGU
  refund_tx_id    TEXT,                       -- saat refund
  -- Buyer notes
  buyer_notes     TEXT,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- order_items: multi-item per order (future)
-- ─────────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    TEXT NOT NULL,              -- snapshot saat order (bisa berubah nanti)
  unit_price_slv  INT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1,
  subtotal_slv    INT NOT NULL
);

-- ─────────────────────────────────────────────
-- order_timeline: audit trail status changes
-- ─────────────────────────────────────────────
CREATE TABLE order_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  note            TEXT,
  created_by      UUID REFERENCES profiles(id), -- null = system
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- reviews: rating setelah transaksi selesai
-- ─────────────────────────────────────────────
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id),
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  reviewed_user_id UUID NOT NULL REFERENCES profiles(id), -- seller
  booth_id        UUID NOT NULL REFERENCES booths(id),
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_anonymous    BOOL NOT NULL DEFAULT FALSE,
  is_flagged      BOOL NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### BLOCK 6: TRAVEL SYSTEM

```sql
-- ─────────────────────────────────────────────
-- travel_passes: akses Tourist ke spot berbayar
-- ─────────────────────────────────────────────
CREATE TABLE travel_passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  pass_type       TEXT NOT NULL DEFAULT 'tourist'
                  CHECK (pass_type IN ('tourist','resident','vip')),
  fee_paid_slv    INT NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ NOT NULL,       -- default: NOW() + 24 hours
  payment_tx_id   TEXT,                       -- bank-tiranyx ref
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Composite unique: satu pass aktif per user per spot
  CONSTRAINT one_active_pass UNIQUE (user_id, spot_id, valid_until)
);

-- ─────────────────────────────────────────────
-- location_verifications: bukti user ada di radius spot
-- Tidak simpan koordinat GPS asli — hanya status
-- ─────────────────────────────────────────────
CREATE TABLE location_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  method          TEXT NOT NULL
                  CHECK (method IN ('gps','ip_geolocation','manual_kyc','qr_scan')),
  is_within_radius BOOL NOT NULL,
  confidence      DECIMAL(3,2),               -- 0.0 - 1.0
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,       -- biasanya 1 hari
  -- Privacy: simpan hash koordinat, BUKAN koordinat asli
  location_hash   TEXT                        -- SHA256(lat_rounded + lng_rounded + date)
);
```

---

### BLOCK 7: ADVERTISEMENTS

```sql
-- ─────────────────────────────────────────────
-- ad_slots: posisi iklan yang tersedia di setiap spot
-- ─────────────────────────────────────────────
CREATE TABLE ad_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  zone_id         UUID REFERENCES spot_zones(id),
  name            TEXT NOT NULL,              -- "Billboard Utama Monas"
  slot_type       TEXT NOT NULL
                  CHECK (slot_type IN (
                    'billboard_3d',           -- papan billboard 3D
                    'sponsored_npc',          -- NPC berbayar (brand script)
                    'sponsored_dungeon',       -- dungeon bertema brand
                    'booth_boost',            -- highlight booth di proximity list
                    'sponsored_quest'         -- quest harian disponsori brand
                  )),
  -- 3D position di world
  position_x      DECIMAL(6,2),
  position_z      DECIMAL(6,2),
  position_y      DECIMAL(6,2) DEFAULT 0,
  -- Dimensions (untuk billboard)
  width           DECIMAL(4,2),
  height          DECIMAL(4,2),
  -- Pricing
  price_slv_per_day INT NOT NULL,
  -- Availability
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','booked','inactive','platform_reserved')),
  -- Constraints
  max_concurrent  INT NOT NULL DEFAULT 1,     -- berapa iklan bisa aktif sekaligus
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- advertisements: iklan yang dipasang
-- ─────────────────────────────────────────────
CREATE TABLE advertisements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id   UUID NOT NULL REFERENCES profiles(id),
  slot_id         UUID NOT NULL REFERENCES ad_slots(id),
  -- Content
  title           TEXT NOT NULL,
  creative_url    TEXT NOT NULL,              -- gambar/video (Supabase Storage)
  click_action    JSONB,                      -- {"type": "url"|"spot"|"booth", "target": "..."}
  -- Schedule
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_days   INT NOT NULL,
  -- Pricing (locked at purchase)
  price_slv_per_day INT NOT NULL,
  total_slv_paid  INT NOT NULL,
  payment_tx_id   TEXT,
  -- Moderation
  status          TEXT NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN (
                    'pending_review','active','paused','rejected','expired','cancelled'
                  )),
  review_note     TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  -- Analytics (aggregated per day)
  total_impressions INT NOT NULL DEFAULT 0,
  total_clicks    INT NOT NULL DEFAULT 0,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily analytics snapshot (untuk billing & reporting)
CREATE TABLE ad_analytics_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id),
  date            DATE NOT NULL,
  impressions     INT NOT NULL DEFAULT 0,
  clicks          INT NOT NULL DEFAULT 0,
  unique_viewers  INT NOT NULL DEFAULT 0,
  UNIQUE(advertisement_id, date)
);
```

---

### BLOCK 8: SAWER & TIPS

```sql
-- ─────────────────────────────────────────────
-- sawer_transactions: tip/sawer antar user
-- Performer (pengamen, live streamer) terima sawer dari penonton
-- ─────────────────────────────────────────────
CREATE TABLE sawer_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  receiver_id     UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  -- Amount (bisa BERLIAN atau PERAK)
  amount_dia      INT NOT NULL DEFAULT 0,     -- BERLIAN
  amount_slv      INT NOT NULL DEFAULT 0,     -- PERAK (opsional)
  -- Platform cut dari sawer PERAK
  platform_fee_slv INT NOT NULL DEFAULT 0,   -- 10% dari amount_slv
  receiver_brz    INT NOT NULL DEFAULT 0,    -- PERUNGGU yang receiver dapat
  -- UX
  message         TEXT,                       -- pesan dari pengirim (max 50 char)
  animation       TEXT NOT NULL DEFAULT 'coins', -- 'coins','flowers','stars','hearts'
  is_anonymous    BOOL NOT NULL DEFAULT FALSE,
  -- Ledger refs
  payment_tx_id   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### BLOCK 9: GAMIFICATION

```sql
-- ─────────────────────────────────────────────
-- quests: daily/weekly/story/sponsored quests
-- ─────────────────────────────────────────────
CREATE TABLE quests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identity
  title           TEXT NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  quest_type      TEXT NOT NULL DEFAULT 'daily'
                  CHECK (quest_type IN ('daily','weekly','story','event','sponsored')),
  -- Sponsor (untuk sponsored quest)
  sponsor_id      UUID REFERENCES profiles(id),
  sponsor_note    TEXT,
  -- Conditions (flexible JSONB)
  conditions      JSONB NOT NULL DEFAULT '[]',
  -- Example conditions:
  -- [{"type": "visit_spot", "count": 3},
  --  {"type": "buy_product", "count": 1},
  --  {"type": "send_sawer", "count": 1}]
  -- Rewards
  reward_dia      INT NOT NULL DEFAULT 0,
  reward_slv      INT NOT NULL DEFAULT 0,
  reward_brz      INT NOT NULL DEFAULT 0,
  reward_cosmetic_id UUID REFERENCES cosmetics(id),
  -- Schedule
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  is_repeatable   BOOL NOT NULL DEFAULT FALSE,
  repeat_cooldown_hours INT NOT NULL DEFAULT 24,
  -- Status
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quest_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  quest_id        UUID NOT NULL REFERENCES quests(id),
  -- Progress state (matches conditions structure)
  progress        JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','claimed','failed','expired')),
  completed_at    TIMESTAMPTZ,
  claimed_at      TIMESTAMPTZ,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, quest_id, started_at)  -- allow repeat after cooldown
);

-- ─────────────────────────────────────────────
-- achievements: milestone permanent
-- ─────────────────────────────────────────────
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  condition       JSONB NOT NULL,
  reward_dia      INT NOT NULL DEFAULT 0,
  rarity          TEXT NOT NULL DEFAULT 'common'
                  CHECK (rarity IN ('common','rare','epic','legendary')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_achievements (
  user_id         UUID NOT NULL REFERENCES profiles(id),
  achievement_id  UUID NOT NULL REFERENCES achievements(id),
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ─────────────────────────────────────────────
-- dungeons: special timed events
-- ─────────────────────────────────────────────
CREATE TABLE dungeons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  name            TEXT NOT NULL,
  dungeon_type    TEXT NOT NULL DEFAULT 'random'
                  CHECK (dungeon_type IN ('random','scheduled','sponsored')),
  sponsor_id      UUID REFERENCES profiles(id),
  -- World config
  scene_config    JSONB NOT NULL DEFAULT '{}',
  -- Timing
  announced_at    TIMESTAMPTZ,               -- kapan timer muncul di HUD
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  -- Access
  max_players     INT NOT NULL DEFAULT 20,
  entry_fee_slv   INT NOT NULL DEFAULT 0,
  -- Reward pool
  reward_pool_dia INT NOT NULL DEFAULT 0,
  reward_pool_slv INT NOT NULL DEFAULT 0,
  reward_items    JSONB DEFAULT '[]',        -- cosmetics, vouchers, dll
  -- Status
  status          TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming','active','ended','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dungeon_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dungeon_id      UUID NOT NULL REFERENCES dungeons(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score           INT NOT NULL DEFAULT 0,
  rank            INT,
  reward_dia_earned INT NOT NULL DEFAULT 0,
  reward_slv_earned INT NOT NULL DEFAULT 0,
  entry_fee_tx_id TEXT,
  UNIQUE(dungeon_id, user_id)
);
```

---

### BLOCK 10: COSMETICS & AVATAR

```sql
-- ─────────────────────────────────────────────
-- cosmetics: item kosmetik avatar
-- ─────────────────────────────────────────────
CREATE TABLE cosmetics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  cosmetic_type   TEXT NOT NULL
                  CHECK (cosmetic_type IN ('outfit','hair','accessory','effect','title','frame','emote')),
  rarity          TEXT NOT NULL DEFAULT 'common'
                  CHECK (rarity IN ('common','rare','epic','legendary','limited')),
  -- Pricing (null = not for sale)
  price_slv       INT,
  price_dia       INT,
  -- Availability
  is_limited      BOOL NOT NULL DEFAULT FALSE,
  available_from  TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  -- Assets
  preview_url     TEXT NOT NULL,
  asset_config    JSONB NOT NULL DEFAULT '{}', -- Three.js material config
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_cosmetics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  cosmetic_id     UUID NOT NULL REFERENCES cosmetics(id),
  acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT NOT NULL
                  CHECK (source IN ('purchase','quest','achievement','gift','event','airdrop')),
  is_equipped     BOOL NOT NULL DEFAULT FALSE,
  payment_tx_id   TEXT,
  UNIQUE(user_id, cosmetic_id)
);
```

---

### BLOCK 11: DEVELOPER ECOSYSTEM

```sql
-- ─────────────────────────────────────────────
-- modules: plugin dari developer komunitas
-- ─────────────────────────────────────────────
CREATE TABLE modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id    UUID NOT NULL REFERENCES profiles(id),
  -- Identity
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  -- Commerce
  price_slv       INT NOT NULL DEFAULT 0,     -- 0 = free
  revenue_share   DECIMAL(3,2) NOT NULL DEFAULT 0.70, -- 70% developer
  -- SDK
  permissions     TEXT[] NOT NULL DEFAULT '{}',
  manifest        JSONB NOT NULL DEFAULT '{}',
  bundle_url      TEXT,                       -- CDN URL module JS
  -- Review
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending_review','approved','rejected','deprecated')),
  review_note     TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  -- Stats
  install_count   INT NOT NULL DEFAULT 0,
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE module_installs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       UUID NOT NULL REFERENCES modules(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  installed_by    UUID NOT NULL REFERENCES profiles(id),
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOL NOT NULL DEFAULT TRUE,
  purchase_tx_id  TEXT,
  installed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, spot_id)
);
```

---

### BLOCK 12: MODERATION & TRUST

```sql
-- ─────────────────────────────────────────────
-- reports: laporan konten/user
-- ─────────────────────────────────────────────
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES profiles(id),
  -- Target (polymorphic)
  target_type     TEXT NOT NULL
                  CHECK (target_type IN ('user','booth','product','order','chat','module','advertisement')),
  target_id       UUID NOT NULL,
  -- Report content
  reason          TEXT NOT NULL
                  CHECK (reason IN ('spam','fraud','fake_product','inappropriate','harassment','scam','other')),
  description     TEXT,
  evidence_urls   TEXT[],                     -- screenshot URLs
  -- Resolution
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','investigating','resolved','dismissed')),
  resolved_by     UUID REFERENCES profiles(id),
  resolution      TEXT,
  resolved_at     TIMESTAMPTZ,
  -- Auto-flag threshold (3 reports = auto-suspend)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  banned_by       UUID NOT NULL REFERENCES profiles(id),
  ban_type        TEXT NOT NULL DEFAULT 'warning'
                  CHECK (ban_type IN ('warning','temp_ban','permanent_ban')),
  reason          TEXT NOT NULL,
  reference_report_id UUID REFERENCES reports(id),
  expires_at      TIMESTAMPTZ,               -- null = permanent
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### BLOCK 13: NOTIFICATIONS & ANALYTICS

```sql
-- ─────────────────────────────────────────────
-- notifications: in-app notification queue
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  notif_type      TEXT NOT NULL
                  CHECK (notif_type IN (
                    'order_new','order_update','order_completed',
                    'payment_received','withdrawal_done',
                    'quest_available','quest_complete',
                    'dungeon_alert','dungeon_starting',
                    'lease_expiring','lease_expired',
                    'review_received','report_resolved',
                    'system','promo'
                  )),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  action_url      TEXT,                       -- deep link
  data            JSONB DEFAULT '{}',
  is_read         BOOL NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- spot_analytics: daily aggregated stats per spot
-- ─────────────────────────────────────────────
CREATE TABLE spot_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  date            DATE NOT NULL,
  -- Traffic
  unique_visitors INT NOT NULL DEFAULT 0,
  total_sessions  INT NOT NULL DEFAULT 0,
  avg_duration_mins DECIMAL(6,2) NOT NULL DEFAULT 0,
  peak_concurrent INT NOT NULL DEFAULT 0,
  -- Commerce
  orders_count    INT NOT NULL DEFAULT 0,
  orders_slv      INT NOT NULL DEFAULT 0,
  travel_fees_slv INT NOT NULL DEFAULT 0,
  -- Engagement
  chat_messages   INT NOT NULL DEFAULT 0,
  sawer_count     INT NOT NULL DEFAULT 0,
  UNIQUE(spot_id, date)
);
```

---

## 5. Critical Indexes

```sql
-- Lookup harian yang paling sering dipanggil
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_spots_slug ON spots(slug);
CREATE INDEX idx_spots_city ON spots(city);
CREATE INDEX idx_spots_status ON spots(status) WHERE status = 'active';
CREATE INDEX idx_land_parcels_spot ON land_parcels(spot_id, status);
CREATE INDEX idx_land_parcels_grid ON land_parcels(spot_id, grid_x, grid_z);
CREATE INDEX idx_land_leases_tenant ON land_leases(tenant_id, status);
CREATE INDEX idx_land_leases_expiry ON land_leases(ends_at) WHERE status = 'active';
CREATE INDEX idx_booths_spot ON booths(spot_id, status);
CREATE INDEX idx_products_booth ON products(booth_id, status);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('indonesian', name || ' ' || COALESCE(description,'')));
CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_travel_passes_active ON travel_passes(user_id, spot_id, valid_until);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_quest_progress_user ON quest_progress(user_id, status);
CREATE INDEX idx_advertisements_active ON advertisements(slot_id, status, starts_at, ends_at);
```

---

## 6. Supabase RLS Policies (Key Rules)

```sql
-- profiles: user bisa baca semua, tapi hanya edit miliknya sendiri
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- user_kyc: hanya diri sendiri + admin yang bisa akses
ALTER TABLE user_kyc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc_own_only" ON user_kyc FOR ALL
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator','admin')));

-- orders: buyer dan seller yang terlibat + admin
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_parties_only" ON orders FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- products: baca semua (publik), edit hanya pemilik booth
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_active" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "products_manage_own" ON products FOR ALL
  USING (owner_id = auth.uid());

-- notifications: hanya milik sendiri
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs_own_only" ON notifications FOR ALL
  USING (user_id = auth.uid());
```

---

## 7. Pembagian Database: Supabase vs bank-tiranyx

| Data | Database | Alasan |
|------|----------|--------|
| profiles, spots, booths, products | Supabase | Game data, RLS langsung di client |
| orders, reviews, leases | Supabase | Commerce data, akses dari client |
| notifications, analytics | Supabase | Real-time via Supabase subscriptions |
| wallets, ledger, coin identity | bank-tiranyx | Financial data, harus lewat API |
| top-up, withdrawal | bank-tiranyx | Diprotect internal-key, tidak boleh dari client |
| coin minting | bank-tiranyx | Highly secured, internal only |

**Aturan emas:** Client browser **tidak boleh** memanggil bank-tiranyx secara langsung. Semua operasi keuangan lewat Galantara server → bank-tiranyx API.

```
Browser ──→ Galantara API (Supabase Functions / Node.js)
                  │
                  ├──→ Supabase DB (untuk game data)
                  └──→ bank-tiranyx API (untuk semua financial ops)
                             │
                             └──→ bank-tiranyx DB (wallet, ledger)
```

---

## 8. Migration Order (Urutan Eksekusi)

Jalankan dalam urutan ini untuk menghindari FK constraint errors:

```
Step 1:  cosmetics                    (no deps)
Step 2:  product_categories           (no deps)
Step 3:  profiles                     (depends: auth.users, cosmetics)
Step 4:  user_kyc                     (depends: profiles)
Step 5:  user_cosmetics               (depends: profiles, cosmetics)
Step 6:  user_achievements            (depends: profiles, achievements)
Step 7:  spots                        (depends: nothing external)
Step 8:  spot_zones                   (depends: spots)
Step 9:  npc_configs                  (depends: spots)
Step 10: land_parcels                 (depends: spots, spot_zones)
Step 11: land_leases                  (depends: land_parcels, profiles)
Step 12: sub_leases                   (depends: land_leases, land_parcels, profiles)
Step 13: booths                       (depends: land_leases, profiles, spots)
Step 14: booth_schedule               (depends: booths)
Step 15: products                     (depends: booths, profiles)
Step 16: product_images               (depends: products)
Step 17: product_category_map         (depends: products, product_categories)
Step 18: orders                       (depends: profiles, booths, spots)
Step 19: order_items                  (depends: orders, products)
Step 20: order_timeline               (depends: orders, profiles)
Step 21: reviews                      (depends: orders, profiles, booths)
Step 22: travel_passes                (depends: profiles, spots)
Step 23: location_verifications       (depends: profiles, spots)
Step 24: ad_slots                     (depends: spots, spot_zones)
Step 25: advertisements               (depends: profiles, ad_slots)
Step 26: ad_analytics_daily           (depends: advertisements)
Step 27: sawer_transactions           (depends: profiles, spots)
Step 28: quests                       (depends: cosmetics)
Step 29: quest_progress               (depends: profiles, quests)
Step 30: achievements                 (no deps)
Step 31: dungeons                     (depends: spots, profiles)
Step 32: dungeon_participants         (depends: dungeons, profiles)
Step 33: modules                      (depends: profiles)
Step 34: module_installs              (depends: modules, spots, profiles)
Step 35: reports                      (depends: profiles)
Step 36: bans                         (depends: profiles, reports)
Step 37: notifications                (depends: profiles)
Step 38: spot_analytics               (depends: spots)
```

---

## 9. Revenue Stream → Database Mapping

| Revenue Stream | Table(s) | bank-tiranyx Call |
|---------------|----------|-------------------|
| Top-up | (bank-tiranyx only) | `POST /mint/topup` |
| Travel fee | `travel_passes` | `POST /transfer` (user → platform wallet) |
| Sewa lahan | `land_leases` | `POST /transfer` (user → platform wallet) |
| Transaksi produk | `orders` | `POST /transfer` (escrow → seller) |
| Platform fee per transaksi | `orders.platform_fee_slv` | (deducted during transfer) |
| Iklan billboard | `advertisements` | `POST /transfer` (advertiser → platform) |
| Sawer/tip fee | `sawer_transactions.platform_fee_slv` | `POST /transfer` |
| Modul marketplace | `module_installs` | `POST /transfer` (30% to platform) |
| Cosmetics | `user_cosmetics` | `POST /transfer` (user → platform) |
| Dungeon entry fee | `dungeon_participants.entry_fee_tx_id` | `POST /transfer` |

---

## 10. Keputusan MVP (terkunci)

Delapan parameter bisnis di bawah **disetujui** untuk MVP dan **dibaking** ke SQL migrations (`supabase/migrations/20260412000001` … `20260412000015`). Rincian nilai & lokasi kolom/fungsi: **`supabase/README.md`** bagian *Keputusan Bisnis yang Dibaked-in*.

| # | Parameter | Nilai terkunci |
|---|-----------|----------------|
| 1 | Platform fee transaksi | **5%** |
| 2 | Travel fee default | **1 PERAK** |
| 3 | Minimum sewa lahan | **3 hari** |
| 4 | KYC untuk sewa | **Phone verify wajib** |
| 5 | Max produk per booth | **20** (biasa) / **100** (verified) |
| 6 | Sawer MVP | **BERLIAN** |
| 7 | Dungeon reward | **Rank-based** |
| 8 | Escrow COD | **3 hari** |

Perubahan schema setelah ini: migration baru (jangan mengubah migration yang sudah pernah di-`push` ke produksi kecuali dengan rollback plan).

---

*Dokumen ini adalah single source of truth untuk database design Galantara.*
*Setiap perubahan schema harus direfleksikan di sini.*
*Implementasi SQL: `supabase/migrations/` + panduan `supabase/README.md`.*
