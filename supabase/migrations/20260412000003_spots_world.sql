-- ═══════════════════════════════════════════════════════════════
-- Migration 003: Spots & World
-- Spot = virtual tempat (Alun-Alun, Pasar, Landmark)
-- Setiap spot punya grid world, zones, dan NPC sendiri
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- spots: virtual locations tied to real-world coordinates
-- ─────────────────────────────────────────────
CREATE TABLE spots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- URL: galantara.io/spot/bogor-alun-alun
  name            TEXT NOT NULL,                  -- "Alun-Alun Bogor"
  city            TEXT NOT NULL,
  province        TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'ID',
  -- Real-world anchor (disimpan approximate, bukan precise GPS)
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  radius_km       DECIMAL(5,2) NOT NULL DEFAULT 1.0, -- untuk local merchant verification
  -- Type & ownership
  type            TEXT NOT NULL DEFAULT 'landmark'
                  CHECK (type IN ('hub','landmark','private','dungeon_zone','event')),
  owner_id        UUID REFERENCES profiles(id),  -- null = platform-owned
  -- World grid config
  grid_width      INT NOT NULL DEFAULT 50,
  grid_height     INT NOT NULL DEFAULT 50,
  cell_size       DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  spawn_x         INT NOT NULL DEFAULT 25,
  spawn_z         INT NOT NULL DEFAULT 25,
  -- Three.js scene config (fog, sky, ambient, environment)
  scene_config    JSONB NOT NULL DEFAULT '{}',
  -- Commerce config (KEPUTUSAN: travel fee default 1 PERAK)
  travel_fee_slv  INT NOT NULL DEFAULT 1,         -- PERAK untuk masuk (1 PERAK = Rp 8.000 equivalent)
  land_base_rent_slv_per_day INT NOT NULL DEFAULT 5, -- base price 5 PERAK/hari per cell
  -- Access control
  max_players     INT NOT NULL DEFAULT 50,
  is_public       BOOL NOT NULL DEFAULT TRUE,
  access_password TEXT,                           -- untuk private spot (null = open)
  -- Status
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('draft','active','maintenance','closed')),
  is_featured     BOOL NOT NULL DEFAULT FALSE,   -- tampil di discover page
  -- Cached stats (diupdate oleh background job setiap 5 menit)
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

COMMENT ON TABLE spots IS 'Virtual tempat di Galantara. Setiap spot = instance room Socket.io tersendiri.';
COMMENT ON COLUMN spots.travel_fee_slv IS 'Biaya masuk tourist dalam PERAK. 0 = gratis. Default 1 PERAK (Rp ~8.000). Keputusan: MVP 1 PERAK.';
COMMENT ON COLUMN spots.scene_config IS 'Konfigurasi Three.js: { fog: { color, density }, sky: { topColor, bottomColor }, ambient: { color, intensity } }';

-- Add FK dari profiles ke spots (delayed karena circular dependency)
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_current_spot
  FOREIGN KEY (current_spot_id) REFERENCES spots(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- spot_zones: area spesial dalam sebuah spot
-- Contoh: "Zona Pasar", "Panggung Utama", "Dungeon Portal"
-- ─────────────────────────────────────────────
CREATE TABLE spot_zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN (
                    'booth_area',       -- area untuk booth merchant
                    'warp_portal',      -- teleport ke spot lain
                    'npc_zone',         -- area NPC aktif
                    'dungeon_portal',   -- pintu masuk dungeon
                    'billboard_zone',   -- area iklan premium
                    'stage',            -- panggung performer/sawer
                    'pvp_zone',         -- area PvP (future)
                    'quest_area'        -- area aktifasi quest
                  )),
  -- Grid position & size (dalam grid cells)
  grid_x          INT NOT NULL,
  grid_z          INT NOT NULL,
  width           INT NOT NULL DEFAULT 5,
  depth           INT NOT NULL DEFAULT 5,
  -- Premium multiplier untuk harga sewa di zona ini
  -- 1.0 = harga base, 1.5 = 50% lebih mahal (premium location)
  rent_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  -- Config fleksibel per tipe zona
  config          JSONB NOT NULL DEFAULT '{}',
  -- Contoh untuk warp_portal: { "target_spot_id": "uuid", "target_x": 10, "target_z": 10 }
  -- Contoh untuk billboard_zone: { "max_billboards": 3, "height": 5 }
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE spot_zones IS 'Area spesial dalam spot dengan multiplier harga dan config sendiri';

-- ─────────────────────────────────────────────
-- npc_configs: konfigurasi NPC per spot
-- NPC bisa jadi guide, info desk, atau sponsored character
-- ─────────────────────────────────────────────
CREATE TABLE npc_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                  -- "Pak Garuda" (Alun-Alun Guide)
  role            TEXT NOT NULL DEFAULT 'guide'
                  CHECK (role IN ('guide','merchant_rep','event_host','dungeon_boss','sponsored')),
  avatar_color    INT NOT NULL DEFAULT 5878132,   -- hex 0x59BF74 (hijau, beda dari player)
  -- Posisi di world (tidak pakai grid, pakai world units)
  position_x      DECIMAL(6,2) NOT NULL,
  position_z      DECIMAL(6,2) NOT NULL,
  idle_message    TEXT,                           -- pesan saat player mendekati NPC
  -- Dialog tree: array of { "text": "...", "options": [{ "label": "...", "next": 1 }] }
  dialog_tree     JSONB NOT NULL DEFAULT '[]',
  -- Sponsored NPC: brand/merchant bayar untuk NPC dengan script mereka
  sponsor_id      UUID REFERENCES profiles(id),
  -- Future: NPC yang ditenagai Claude API
  is_ai_powered   BOOL NOT NULL DEFAULT FALSE,
  ai_persona      TEXT,                           -- system prompt untuk AI-powered NPC
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE npc_configs IS 'NPC virtual di setiap spot. Bisa guide, sponsored, atau AI-powered (future).';
COMMENT ON COLUMN npc_configs.dialog_tree IS 'Array dialog: [{ "id": 0, "text": "Halo!", "options": [{ "label": "Info booth", "next": 1 }] }]';

-- TRIGGER: update updated_at di spots
CREATE TRIGGER spots_updated_at
  BEFORE UPDATE ON spots
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Seed: Spot default Galantara (Bogor sebagai MVP pertama)
INSERT INTO spots (slug, name, city, province, lat, lng, type, travel_fee_slv, description, status)
VALUES (
  'bogor-alun-alun',
  'Alun-Alun Bogor',
  'Bogor',
  'Jawa Barat',
  -6.5971,
  106.7960,
  'landmark',
  1,
  'Alun-alun virtual kota Bogor. Tempat berkumpul, belanja, dan ngobrol di jantung kota.',
  'active'
);
