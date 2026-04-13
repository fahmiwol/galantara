-- ═══════════════════════════════════════════════════════════════
-- Migration 011: Developer Ecosystem
-- Modules = plugin yang dibuat developer komunitas
-- Developer dapat 70% revenue, platform 30%
-- Review wajib sebelum approved (sandbox keamanan)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- modules: plugin dari developer komunitas
-- Developer submit → platform review → approve → spot owner install
-- ─────────────────────────────────────────────
CREATE TABLE modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id    UUID NOT NULL REFERENCES profiles(id),
  -- Identity
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,           -- "kalkulator-bmi", "mini-game-lempar-dadu"
  description     TEXT,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  -- Commerce
  price_slv       INT NOT NULL DEFAULT 0,         -- 0 = free, >0 = berbayar
  -- Revenue share: developer dapat 70%, platform dapat 30%
  revenue_share   DECIMAL(3,2) NOT NULL DEFAULT 0.70 CHECK (revenue_share BETWEEN 0.50 AND 0.90),
  -- SDK permissions yang dibutuhkan modul
  -- Contoh: ["read_players","show_ui","play_sound","access_booth"]
  permissions     TEXT[] NOT NULL DEFAULT '{}',
  -- Manifest: metadata teknis
  -- { "min_galantara_version": "0.5.0", "max_players": 10, "requires_booth": false }
  manifest        JSONB NOT NULL DEFAULT '{}',
  -- Bundle URL (CDN, di-host platform setelah review)
  bundle_url      TEXT,                           -- null sampai approved
  -- Review status
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending_review','approved','rejected','deprecated')),
  review_note     TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  -- Cached stats
  install_count   INT NOT NULL DEFAULT 0,
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE modules IS 'Plugin komunitas developer. Developer dapat 70% revenue, platform 30%. Wajib review sebelum available.';
COMMENT ON COLUMN modules.permissions IS 'Array permissions SDK: ["read_players","show_ui","play_sound","access_booth","read_location"]';
COMMENT ON COLUMN modules.bundle_url IS 'URL bundle JS di CDN platform. Diisi setelah review approved. Null saat draft/pending.';

-- ─────────────────────────────────────────────
-- module_installs: pemasangan modul di spot tertentu
-- Spot owner yang install. Konfigurasi per-install.
-- ─────────────────────────────────────────────
CREATE TABLE module_installs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       UUID NOT NULL REFERENCES modules(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  installed_by    UUID NOT NULL REFERENCES profiles(id),
  -- Config spesifik untuk install ini (override default manifest)
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOL NOT NULL DEFAULT TRUE,
  -- Ledger ref (null jika modul gratis)
  purchase_tx_id  TEXT,
  installed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Satu modul per spot (tidak bisa install 2 kali)
  UNIQUE(module_id, spot_id)
);

COMMENT ON TABLE module_installs IS 'Modul yang diinstall di spot. Spot owner yang install. Satu instance per modul per spot.';

CREATE TRIGGER modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
