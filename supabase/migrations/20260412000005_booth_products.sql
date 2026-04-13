-- ═══════════════════════════════════════════════════════════════
-- Migration 005: Booths & Products
-- Booth = toko merchant di atas parcel yang disewa
-- Products = item yang dijual di booth
--
-- KEPUTUSAN BISNIS:
--   Max produk per booth: 20 (user biasa), 100 (merchant verified)
--   Enforced di application layer, bukan DB constraint
--   (agar bisa diupgrade tanpa migration)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- booths: toko merchant
-- 1 lease = 1 booth
-- ─────────────────────────────────────────────
CREATE TABLE booths (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id        UUID NOT NULL REFERENCES land_leases(id),
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  parcel_id       UUID NOT NULL REFERENCES land_parcels(id),
  -- Identity
  name            TEXT NOT NULL,
  tagline         TEXT,                           -- "Kuliner Khas Bogor Sejak 1990"
  description     TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  -- 3D appearance (Three.js)
  asset_id        TEXT NOT NULL DEFAULT 'default_booth', -- identifier model 3D
  -- config: { color: 0xFF0000, sign_text: "WARUNG MBAK SRI", awning: true }
  object_config   JSONB NOT NULL DEFAULT '{}',
  -- Verifikasi: merchant benar-benar ada di lokasi
  is_local_verified BOOL NOT NULL DEFAULT FALSE,
  -- Status
  status          TEXT NOT NULL DEFAULT 'setup'
                  CHECK (status IN ('open','closed','suspended','setup')),
  -- Cached stats (diupdate oleh trigger saat order/review dibuat)
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  total_sales_count INT NOT NULL DEFAULT 0,
  total_sales_slv INT NOT NULL DEFAULT 0,
  has_schedule    BOOL NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE booths IS 'Toko merchant. Satu lease → satu booth. Setup dulu sebelum bisa open.';
COMMENT ON COLUMN booths.is_local_verified IS 'TRUE jika merchant verifikasi keberadaan di radius spot (via GPS/QR). Dapat badge "Merchant Lokal".';
COMMENT ON COLUMN booths.object_config IS 'Config tampilan 3D booth: { color, sign_text, awning_color, model_variant }';

-- ─────────────────────────────────────────────
-- booth_schedule: jam operasional per hari
-- ─────────────────────────────────────────────
CREATE TABLE booth_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id        UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 1=Senin, dst
  open_time       TIME NOT NULL,
  close_time      TIME NOT NULL,
  is_closed       BOOL NOT NULL DEFAULT FALSE,    -- override: tutup di hari ini
  UNIQUE(booth_id, day_of_week)                   -- satu record per hari per booth
);

COMMENT ON TABLE booth_schedule IS 'Jam operasional booth per hari. is_closed=TRUE untuk libur.';

-- ─────────────────────────────────────────────
-- products: item yang dijual di booth
-- Max 20 untuk user biasa, 100 untuk merchant verified
-- Enforcement di application layer (bukan DB constraint)
-- ─────────────────────────────────────────────
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id        UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  -- Identity
  name            TEXT NOT NULL,
  description     TEXT,
  -- Pricing
  price_slv       INT NOT NULL CHECK (price_slv > 0), -- PERAK, harga utama
  price_idr       INT,                            -- IDR reference (opsional, untuk display COD)
  -- Stock management
  stock           INT,                            -- NULL = unlimited (jasa/digital)
  stock_alert_at  INT DEFAULT 5,                  -- notif ke seller kalau stock <= N
  -- Type
  product_type    TEXT NOT NULL DEFAULT 'physical'
                  CHECK (product_type IN ('physical','digital','service','experience')),
  -- Delivery method
  delivery_type   TEXT NOT NULL DEFAULT 'cod'
                  CHECK (delivery_type IN ('cod','digital_delivery','pickup','shipping')),
  -- Digital product content
  digital_url     TEXT,                           -- URL setelah payment verified
  -- Status
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','sold_out','suspended','archived')),
  -- Cached stats
  total_sold      INT NOT NULL DEFAULT 0,
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  -- Boost (future: bayar untuk highlight di discover)
  is_boosted      BOOL NOT NULL DEFAULT FALSE,
  boost_ends_at   TIMESTAMPTZ,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Produk di booth. Max 20 (user) / 100 (merchant verified) — enforced di API layer.';
COMMENT ON COLUMN products.price_slv IS 'Harga dalam PERAK. Selalu > 0. Minimum 1 PERAK.';
COMMENT ON COLUMN products.stock IS 'NULL = stok tidak terbatas (untuk jasa/digital/service).';
COMMENT ON COLUMN products.digital_url IS 'URL konten digital. Hanya dikirim ke buyer setelah order.status = completed.';

-- ─────────────────────────────────────────────
-- product_images: foto produk (multiple per produk)
-- ─────────────────────────────────────────────
CREATE TABLE product_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,                  -- Supabase Storage URL
  sort_order      INT NOT NULL DEFAULT 0,
  is_primary      BOOL NOT NULL DEFAULT FALSE     -- gambar utama untuk thumbnail
);

-- Constraint: hanya satu gambar primary per produk
CREATE UNIQUE INDEX idx_product_images_primary
  ON product_images (product_id)
  WHERE is_primary = TRUE;

-- ─────────────────────────────────────────────
-- product_category_map: junction table produk ↔ kategori
-- Satu produk bisa masuk beberapa kategori
-- ─────────────────────────────────────────────
CREATE TABLE product_category_map (
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- TRIGGERS
CREATE TRIGGER booths_updated_at
  BEFORE UPDATE ON booths
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────
-- FUNCTION: check product limit per booth
-- Dipanggil dari API sebelum INSERT product
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_product_limit(p_booth_id UUID, p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_count INT;
  v_user_role TEXT;
  v_max_products INT;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = p_owner_id;

  -- Limit: 20 untuk user biasa, 100 untuk merchant verified
  v_max_products := CASE
    WHEN v_user_role IN ('merchant','developer','admin') THEN 100
    ELSE 20
  END;

  SELECT COUNT(*) INTO v_product_count
  FROM products
  WHERE booth_id = p_booth_id AND status != 'archived';

  IF v_product_count >= v_max_products THEN
    RAISE EXCEPTION 'Batas produk tercapai (%). Upgrade ke Merchant Verified untuk tambah hingga 100 produk.', v_max_products;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION check_product_limit IS 'Cek limit produk: 20 (user) atau 100 (merchant). Dipanggil dari API layer sebelum tambah produk.';
