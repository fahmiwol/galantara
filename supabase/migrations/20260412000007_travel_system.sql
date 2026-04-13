-- ═══════════════════════════════════════════════════════════════
-- Migration 007: Travel System
-- Travel pass = tiket masuk ke spot berbayar (valid 24 jam)
-- Location verification = bukti user ada di radius spot (privacy-first)
--
-- KEPUTUSAN BISNIS:
--   Travel fee default: 1 PERAK (konfigurasi per spot di spots.travel_fee_slv)
--   Pass valid: 24 jam sejak purchase
--   Location hash: SHA256, bukan koordinat asli (privacy by design)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- travel_passes: akses user ke spot berbayar
-- Valid 24 jam. Dibeli sekali, bisa re-enter berkali-kali selama valid.
-- ─────────────────────────────────────────────
CREATE TABLE travel_passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  -- Tipe pass
  -- tourist: bayar per-visit (24 jam)
  -- resident: merchant/lokal yg punya lease aktif (otomatis gratis)
  -- vip: diberi oleh platform/spot owner
  pass_type       TEXT NOT NULL DEFAULT 'tourist'
                  CHECK (pass_type IN ('tourist','resident','vip')),
  -- Harga yang dibayar (0 jika resident/vip/spot gratis)
  fee_paid_slv    INT NOT NULL DEFAULT 0,
  -- Validity
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ NOT NULL,           -- valid_from + 24 hours untuk tourist
  -- Ledger reference
  payment_tx_id   TEXT,                           -- bank-tiranyx txId (null jika gratis)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Satu pass aktif per user per spot (overlap tidak diizinkan)
  -- UNIQUE pada valid_until memungkinkan renewal setelah expired
  CONSTRAINT one_active_pass_per_spot UNIQUE (user_id, spot_id, valid_until)
);

COMMENT ON TABLE travel_passes IS 'Tiket masuk spot berbayar. Valid 24 jam. Spot gratis tidak buat record (fee_paid = 0 = lewat langsung).';
COMMENT ON COLUMN travel_passes.pass_type IS 'tourist: bayar. resident: punya lease aktif (gratis). vip: undangan platform.';
COMMENT ON COLUMN travel_passes.valid_until IS 'Untuk tourist: valid_from + 24 jam. Untuk resident: mengikuti tanggal akhir lease.';

-- ─────────────────────────────────────────────
-- location_verifications: bukti kehadiran user di spot
-- Privacy-first: tidak simpan GPS asli, hanya status dalam radius
-- ─────────────────────────────────────────────
CREATE TABLE location_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  -- Metode verifikasi
  method          TEXT NOT NULL
                  CHECK (method IN (
                    'gps',              -- koordinat GPS dari browser
                    'ip_geolocation',  -- estimasi dari IP (less accurate)
                    'manual_kyc',      -- admin verifikasi manual (untuk merchant)
                    'qr_scan'          -- scan QR code fisik di lokasi
                  )),
  is_within_radius BOOL NOT NULL,                -- TRUE jika dalam radius spot
  confidence      DECIMAL(3,2),                  -- 0.0–1.0 (GPS=0.9, IP=0.4, QR=1.0)
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,          -- biasanya verified_at + 24 jam
  -- PRIVACY: simpan hash koordinat, BUKAN koordinat GPS asli
  -- Hash = SHA256(lat_rounded_2dp + "," + lng_rounded_2dp + "," + date_yyyy_mm_dd)
  -- Tidak bisa di-reverse ke koordinat asli
  location_hash   TEXT
);

COMMENT ON TABLE location_verifications IS 'Bukti kehadiran di lokasi. Koordinat GPS tidak disimpan — hanya hash dan status dalam radius.';
COMMENT ON COLUMN location_verifications.location_hash IS 'SHA256(lat(2dp) + lng(2dp) + date). Privacy by design — tidak bisa di-reverse.';
COMMENT ON COLUMN location_verifications.confidence IS '0.0–1.0: GPS≈0.9, IP≈0.4, QR=1.0, KYC=1.0. Threshold minimum 0.6 untuk verified.';

-- ─────────────────────────────────────────────
-- VIEW: cek apakah user punya pass aktif di spot
-- Dipanggil oleh Socket.io server saat user join room
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW active_travel_passes AS
SELECT
  tp.user_id,
  tp.spot_id,
  tp.pass_type,
  tp.valid_until,
  s.travel_fee_slv,
  s.name AS spot_name
FROM travel_passes tp
JOIN spots s ON s.id = tp.spot_id
WHERE tp.valid_until > NOW();

COMMENT ON VIEW active_travel_passes IS 'Pass yang masih valid sekarang. Dipakai Socket.io server untuk validasi masuk spot.';

-- ─────────────────────────────────────────────
-- FUNCTION: check apakah user bisa masuk spot
-- Returns: { can_enter: bool, reason: text, fee_slv: int }
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_spot_access(p_user_id UUID, p_spot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_spot RECORD;
  v_pass RECORD;
  v_has_active_lease BOOL;
  v_user_role TEXT;
BEGIN
  SELECT travel_fee_slv, is_public, status, name
  INTO v_spot FROM spots WHERE id = p_spot_id;

  IF NOT FOUND THEN
    RETURN '{"can_enter": false, "reason": "Spot tidak ditemukan"}'::JSONB;
  END IF;

  IF v_spot.status != 'active' THEN
    RETURN jsonb_build_object('can_enter', false, 'reason', 'Spot sedang ' || v_spot.status);
  END IF;

  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;

  -- Admin & moderator selalu bisa masuk
  IF v_user_role IN ('admin','moderator') THEN
    RETURN '{"can_enter": true, "reason": "admin_access", "fee_slv": 0}'::JSONB;
  END IF;

  -- Spot gratis: langsung masuk
  IF v_spot.travel_fee_slv = 0 OR NOT v_spot.is_public THEN
    RETURN '{"can_enter": true, "reason": "free_spot", "fee_slv": 0}'::JSONB;
  END IF;

  -- Cek pass aktif
  SELECT * INTO v_pass
  FROM active_travel_passes
  WHERE user_id = p_user_id AND spot_id = p_spot_id;

  IF FOUND THEN
    RETURN jsonb_build_object('can_enter', true, 'reason', 'has_pass',
                               'fee_slv', 0, 'pass_expires_at', v_pass.valid_until);
  END IF;

  -- Cek lease aktif (merchant lokal = resident, gratis)
  SELECT EXISTS(
    SELECT 1 FROM land_leases ll
    JOIN land_parcels lp ON lp.id = ll.parcel_id
    WHERE ll.tenant_id = p_user_id
    AND lp.spot_id = p_spot_id
    AND ll.status = 'active'
    AND ll.ends_at > NOW()
  ) INTO v_has_active_lease;

  IF v_has_active_lease THEN
    RETURN '{"can_enter": true, "reason": "resident_lease", "fee_slv": 0}'::JSONB;
  END IF;

  -- Perlu beli pass
  RETURN jsonb_build_object(
    'can_enter', false,
    'reason', 'needs_pass',
    'fee_slv', v_spot.travel_fee_slv,
    'spot_name', v_spot.name
  );
END;
$$;

COMMENT ON FUNCTION check_spot_access IS 'Cek akses user ke spot. Dipanggil dari Socket.io atau REST API saat user mau join room.';
