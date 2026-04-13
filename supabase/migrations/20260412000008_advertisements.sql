-- ═══════════════════════════════════════════════════════════════
-- Migration 008: Advertisement System
-- Ad slots = posisi iklan di world 3D (billboard, NPC, dungeon)
-- Platform ambil 100% dari iklan (pure revenue)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- ad_slots: posisi iklan yang tersedia per spot
-- Didefinisikan oleh platform (spot owner belum bisa buat sendiri)
-- ─────────────────────────────────────────────
CREATE TABLE ad_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  zone_id         UUID REFERENCES spot_zones(id),
  name            TEXT NOT NULL,                  -- "Billboard Utama Alun-Alun"
  -- Tipe slot iklan
  slot_type       TEXT NOT NULL
                  CHECK (slot_type IN (
                    'billboard_3d',               -- papan billboard 3D di world
                    'sponsored_npc',              -- NPC dengan script brand
                    'sponsored_dungeon',           -- dungeon bertema brand
                    'booth_boost',                -- highlight booth di proximity list
                    'sponsored_quest'             -- quest harian disponsori brand
                  )),
  -- Posisi 3D di world (untuk billboard)
  position_x      DECIMAL(6,2),
  position_z      DECIMAL(6,2),
  position_y      DECIMAL(6,2) NOT NULL DEFAULT 0,
  -- Dimensi (untuk billboard_3d)
  width           DECIMAL(4,2),
  height          DECIMAL(4,2),
  -- Pricing (per hari dalam PERAK)
  price_slv_per_day INT NOT NULL,
  -- Availability
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','booked','inactive','platform_reserved')),
  -- Berapa iklan bisa aktif sekaligus di slot ini
  max_concurrent  INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ad_slots IS 'Posisi iklan yang tersedia di dunia 3D. Platform yang define lokasi dan harga.';
COMMENT ON COLUMN ad_slots.slot_type IS 'billboard_3d: papan reklame. sponsored_npc: NPC branded. sponsored_quest: quest berhadiah brand.';

-- ─────────────────────────────────────────────
-- advertisements: iklan yang dipasang advertiser
-- Wajib review moderator sebelum tayang (prevent brand safety issues)
-- ─────────────────────────────────────────────
CREATE TABLE advertisements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id   UUID NOT NULL REFERENCES profiles(id),
  slot_id         UUID NOT NULL REFERENCES ad_slots(id),
  -- Konten iklan
  title           TEXT NOT NULL,
  creative_url    TEXT NOT NULL,                  -- Supabase Storage (gambar/video)
  -- Aksi saat diklik (flexible JSONB)
  -- { "type": "url", "target": "https://..." }
  -- { "type": "spot", "target": "spot-uuid" }
  -- { "type": "booth", "target": "booth-uuid" }
  click_action    JSONB,
  -- Periode tayang
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_days   INT NOT NULL,
  -- Pricing (locked saat booking)
  price_slv_per_day INT NOT NULL,
  total_slv_paid  INT NOT NULL,
  payment_tx_id   TEXT,
  -- Review moderation (wajib approve sebelum tayang)
  status          TEXT NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN (
                    'pending_review',             -- menunggu review moderator
                    'active',                     -- sedang tayang
                    'paused',                     -- dijeda oleh advertiser
                    'rejected',                   -- ditolak moderator
                    'expired',                    -- masa tayang habis
                    'cancelled'                   -- dibatalkan sebelum starts_at
                  )),
  review_note     TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  -- Cached analytics
  total_impressions INT NOT NULL DEFAULT 0,
  total_clicks    INT NOT NULL DEFAULT 0,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE advertisements IS 'Iklan yang dipasang. Wajib review moderator sebelum status = active.';
COMMENT ON COLUMN advertisements.click_action IS '{"type": "url"|"spot"|"booth", "target": "..."}. Dieksekusi saat player klik billboard di 3D world.';
COMMENT ON COLUMN advertisements.creative_url IS 'URL gambar/video iklan di Supabase Storage. Format: JPG/PNG untuk billboard, max 2MB.';

-- ─────────────────────────────────────────────
-- ad_analytics_daily: snapshot analytics harian per iklan
-- Untuk reporting dan billing evidence
-- ─────────────────────────────────────────────
CREATE TABLE ad_analytics_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id),
  date            DATE NOT NULL,
  impressions     INT NOT NULL DEFAULT 0,         -- berapa kali iklan dirender di player screen
  clicks          INT NOT NULL DEFAULT 0,         -- berapa kali player klik iklan
  unique_viewers  INT NOT NULL DEFAULT 0,         -- unique player yang lihat iklan
  UNIQUE(advertisement_id, date)
);

COMMENT ON TABLE ad_analytics_daily IS 'Snapshot analytics harian untuk billing evidence dan reporting ke advertiser.';

-- ─────────────────────────────────────────────
-- VIEW: iklan yang sedang aktif per slot
-- Dipanggil oleh Three.js renderer saat load scene
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW active_advertisements AS
SELECT
  a.id,
  a.slot_id,
  a.title,
  a.creative_url,
  a.click_action,
  s.position_x,
  s.position_y,
  s.position_z,
  s.width,
  s.height,
  s.slot_type,
  s.spot_id
FROM advertisements a
JOIN ad_slots s ON s.id = a.slot_id
WHERE a.status = 'active'
  AND a.starts_at <= NOW()
  AND a.ends_at > NOW();

COMMENT ON VIEW active_advertisements IS 'Iklan yang sedang aktif dan dalam periode tayang. Dipakai renderer untuk load billboard 3D.';

CREATE TRIGGER advertisements_updated_at
  BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
