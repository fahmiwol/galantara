-- ═══════════════════════════════════════════════════════════════
-- Migration 001: Cosmetics & Product Categories
-- Dibuat lebih awal karena direferensikan oleh profiles & quests
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- cosmetics: item kosmetik avatar
-- Dibeli dengan PERAK atau didapat dari quest/achievement
-- ─────────────────────────────────────────────
CREATE TABLE cosmetics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  cosmetic_type   TEXT NOT NULL
                  CHECK (cosmetic_type IN ('outfit','hair','accessory','effect','title','frame','emote')),
  rarity          TEXT NOT NULL DEFAULT 'common'
                  CHECK (rarity IN ('common','rare','epic','legendary','limited')),
  -- Pricing (null = not for sale, hanya dari quest/event)
  price_slv       INT,                            -- harga dalam PERAK
  price_dia       INT,                            -- harga dalam BERLIAN (alternative)
  -- Availability
  is_limited      BOOL NOT NULL DEFAULT FALSE,
  available_from  TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  -- Assets (Three.js config)
  preview_url     TEXT NOT NULL,
  asset_config    JSONB NOT NULL DEFAULT '{}',    -- material overrides, mesh config
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cosmetics IS 'Item kosmetik avatar — dibeli PERAK, didapat quest/event, atau BERLIAN';
COMMENT ON COLUMN cosmetics.asset_config IS 'Three.js material/mesh config: { color, texture, mesh_url, scale }';

-- ─────────────────────────────────────────────
-- product_categories: taxonomy produk merchant
-- Hierarkis (parent_id untuk sub-kategori)
-- ─────────────────────────────────────────────
CREATE TABLE product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES product_categories(id),  -- null = root category
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  icon            TEXT,                           -- emoji atau icon name
  sort_order      INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE product_categories IS 'Kategori produk hierarkis untuk booth merchant';

-- Seed: Kategori default Galantara
INSERT INTO product_categories (slug, name, icon, sort_order) VALUES
  ('makanan-minuman',   'Makanan & Minuman',  '🍜', 1),
  ('fashion',           'Fashion & Pakaian',   '👗', 2),
  ('kerajinan',         'Kerajinan Tangan',    '🎨', 3),
  ('digital',           'Produk Digital',      '💻', 4),
  ('jasa',              'Jasa & Layanan',      '🔧', 5),
  ('elektronik',        'Elektronik',          '📱', 6),
  ('kesehatan',         'Kesehatan & Kecantikan', '💊', 7),
  ('hiburan',           'Hiburan & Event',     '🎭', 8),
  ('lainnya',           'Lainnya',             '📦', 99);

-- Sub-kategori makanan
INSERT INTO product_categories (parent_id, slug, name, sort_order)
SELECT id, 'makanan-berat', 'Makanan Berat', 1 FROM product_categories WHERE slug = 'makanan-minuman';
INSERT INTO product_categories (parent_id, slug, name, sort_order)
SELECT id, 'jajanan-pasar', 'Jajanan Pasar', 2 FROM product_categories WHERE slug = 'makanan-minuman';
INSERT INTO product_categories (parent_id, slug, name, sort_order)
SELECT id, 'minuman', 'Minuman', 3 FROM product_categories WHERE slug = 'makanan-minuman';
