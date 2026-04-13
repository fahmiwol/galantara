-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Land System (Parcel + Lease + Sub-lease)
-- Core commerce infrastructure — sewa lahan adalah revenue utama
--
-- KEPUTUSAN BISNIS:
--   Minimum sewa: 3 hari (cegah hit-and-run merchant)
--   KYC: phone_verified = TRUE wajib untuk sewa lahan
--   Escrow: 3 hari setelah COD sebelum PERUNGGU direlease
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- land_parcels: grid cells yang bisa disewa
-- Setiap parcel punya posisi unik dalam spot
-- ─────────────────────────────────────────────
CREATE TABLE land_parcels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  zone_id         UUID REFERENCES spot_zones(id),    -- optional: ada dalam zona khusus
  -- Grid position (unique per spot)
  grid_x          INT NOT NULL,
  grid_z          INT NOT NULL,
  -- Ukuran parcel
  -- lapak: 1x1 (untuk pedagang kecil)
  -- booth: 2x2 (untuk merchant umum)
  -- gedung: 3x3 (untuk toko besar / brand)
  -- landmark: 5x5 (untuk tenant premium)
  size_w          INT NOT NULL DEFAULT 1,
  size_d          INT NOT NULL DEFAULT 1,
  parcel_type     TEXT NOT NULL DEFAULT 'lapak'
                  CHECK (parcel_type IN ('lapak','booth','gedung','landmark')),
  -- Harga (base spot price × zone multiplier, dihitung saat parcel dibuat)
  rent_slv_per_day INT NOT NULL,
  is_premium      BOOL NOT NULL DEFAULT FALSE,
  -- Status
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','leased','reserved','platform_use')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: satu titik grid = satu parcel (tidak bisa overlap)
  UNIQUE(spot_id, grid_x, grid_z)
);

COMMENT ON TABLE land_parcels IS 'Grid cells yang bisa disewa merchant. UNIQUE(spot_id, grid_x, grid_z) mencegah overlap.';
COMMENT ON COLUMN land_parcels.parcel_type IS 'lapak=1x1, booth=2x2, gedung=3x3, landmark=5x5. Beda harga, beda visibility.';

-- ─────────────────────────────────────────────
-- land_leases: kontrak sewa lahan
-- Payment diproses via bank-tiranyx API, hasilnya disimpan di sini
-- ─────────────────────────────────────────────
CREATE TABLE land_leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id       UUID NOT NULL REFERENCES land_parcels(id),
  tenant_id       UUID NOT NULL REFERENCES profiles(id),
  -- Periode sewa (KEPUTUSAN: minimum 3 hari)
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_days   INT NOT NULL CHECK (duration_days >= 3), -- minimum 3 hari
  -- Harga dikunci saat kontrak dibuat (price lock)
  rent_slv_per_day INT NOT NULL,
  total_slv_paid  INT NOT NULL,
  -- Opsi
  auto_renew      BOOL NOT NULL DEFAULT FALSE,
  subletting_allowed BOOL NOT NULL DEFAULT FALSE,  -- izin sub-sewa
  -- Status
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','terminated','pending')),
  terminated_by   UUID REFERENCES profiles(id),
  terminated_at   TIMESTAMPTZ,
  termination_reason TEXT,
  -- Ledger reference ke bank-tiranyx
  payment_tx_id   TEXT,                           -- txId dari bank-tiranyx
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Business rule: tidak bisa sewa parcel yang sudah aktif disewa
  CONSTRAINT no_overlapping_lease EXCLUDE USING GIST (
    parcel_id WITH =,
    TSTZRANGE(starts_at, ends_at) WITH &&
  ) WHERE (status IN ('active','pending'))
);

COMMENT ON TABLE land_leases IS 'Kontrak sewa lahan. Min 3 hari. Tenant harus phone_verified. Overlapping lease dicegah GIST.';
COMMENT ON COLUMN land_leases.payment_tx_id IS 'Transaction ID dari bank-tiranyx saat PERAK dibayar untuk sewa';
COMMENT ON CONSTRAINT no_overlapping_lease ON land_leases IS 'Mencegah dua lease aktif di parcel yang sama pada waktu yang sama';

-- Perlu btree_gist extension untuk EXCLUDE USING GIST dengan UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─────────────────────────────────────────────
-- sub_leases: sub-sewa (sewa dari penyewa, bukan dari platform)
-- Hanya bisa kalau parent lease.subletting_allowed = TRUE
-- ─────────────────────────────────────────────
CREATE TABLE sub_leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_lease_id UUID NOT NULL REFERENCES land_leases(id),
  sub_parcel_id   UUID NOT NULL REFERENCES land_parcels(id),
  sub_tenant_id   UUID NOT NULL REFERENCES profiles(id),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  -- Sub-tenant bayar ke tenant utama (bukan platform)
  -- Platform tidak ambil cut dari sub-lease (incentive subletting)
  rent_slv_per_day INT NOT NULL,
  total_slv_paid  INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','terminated')),
  payment_tx_id   TEXT,                           -- transfer dari sub_tenant ke tenant
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sub_leases IS 'Sub-sewa lahan dari tenant ke sub-tenant. Platform tidak ambil cut dari sub-lease.';

-- ─────────────────────────────────────────────
-- FUNCTION: validasi phone sebelum sewa lahan
-- Dipanggil dari Galantara API sebelum buat lease
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_phone_verified_for_lease(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_verified BOOL;
BEGIN
  SELECT phone_verified INTO v_verified
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User tidak ditemukan';
  END IF;

  IF NOT v_verified THEN
    RAISE EXCEPTION 'Nomor telepon harus diverifikasi sebelum menyewa lahan. Verifikasi dulu di menu profil.';
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION check_phone_verified_for_lease IS 'Validasi phone_verified sebelum sewa lahan. Dipanggil dari API layer.';

-- ─────────────────────────────────────────────
-- TRIGGER: update parcel status saat lease dibuat/berakhir
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_parcel_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE land_parcels SET status = 'leased' WHERE id = NEW.parcel_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('expired','terminated') THEN
    UPDATE land_parcels SET status = 'available' WHERE id = NEW.parcel_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER land_leases_sync_parcel
  AFTER INSERT OR UPDATE ON land_leases
  FOR EACH ROW EXECUTE PROCEDURE sync_parcel_status();
