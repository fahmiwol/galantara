-- ═══════════════════════════════════════════════════════════════
-- Migration 002: Users & Auth
-- profiles extends Supabase auth.users
-- KYC terpisah untuk privacy
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- profiles: public user data
-- Dibuat otomatis via trigger saat auth.users insert
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,           -- @handle, immutable setelah set
  display_name    TEXT NOT NULL,
  avatar_color    INT  NOT NULL DEFAULT 9175231,  -- hex 0x8C0AFF (ungu Galantara)
  avatar_outfit   UUID REFERENCES cosmetics(id), -- item yang sedang dipakai
  bio             TEXT,
  role            TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('guest','user','merchant','developer','moderator','admin')),
  kyc_status      TEXT NOT NULL DEFAULT 'none'
                  CHECK (kyc_status IN ('none','pending','verified','rejected')),
  -- phone_verified dipakai untuk sewa lahan (wajib)
  phone_verified  BOOL NOT NULL DEFAULT FALSE,
  is_banned       BOOL NOT NULL DEFAULT FALSE,
  -- Presence (diupdate oleh Socket.io server via service role key)
  current_spot_id UUID,                           -- FK spots, ditambah setelah spots table ada
  last_seen_at    TIMESTAMPTZ,
  -- Cached stats (diupdate oleh DB triggers)
  total_purchases INT NOT NULL DEFAULT 0,
  total_sales     INT NOT NULL DEFAULT 0,
  total_spots_visited INT NOT NULL DEFAULT 0,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Profil publik user, extends auth.users. Role merchant/developer via upgrade request.';
COMMENT ON COLUMN profiles.phone_verified IS 'Wajib TRUE untuk sewa lahan (keputusan bisnis: cegah throwaway accounts)';
COMMENT ON COLUMN profiles.avatar_color IS 'INT hex color — default 0x8C0AFF (ungu). Dipakai di Three.js mesh material';

-- ─────────────────────────────────────────────
-- user_kyc: data identitas merchant (terenkripsi di app level)
-- Dipisah dari profiles untuk: (1) akses terbatas, (2) enkripsi kolom sensitif
-- ─────────────────────────────────────────────
CREATE TABLE user_kyc (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  real_name       TEXT NOT NULL,                  -- ENCRYPTED at application level
  id_type         TEXT NOT NULL DEFAULT 'ktp'
                  CHECK (id_type IN ('ktp','sim','passport')),
  id_number       TEXT NOT NULL,                  -- ENCRYPTED at application level
  phone           TEXT NOT NULL,                  -- ENCRYPTED at application level
  phone_verified  BOOL NOT NULL DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,
  selfie_url      TEXT,                           -- Supabase Storage (private bucket)
  id_photo_url    TEXT,                           -- Supabase Storage (private bucket)
  -- Review by moderator/admin
  reviewed_by     UUID REFERENCES profiles(id),
  review_note     TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  -- Constraint: reviewed_by dan reviewed_at harus keduanya ada atau tidak ada
  CONSTRAINT kyc_review_consistency CHECK (
    (reviewed_by IS NULL) = (reviewed_at IS NULL)
  )
);

COMMENT ON TABLE user_kyc IS 'KYC data merchant — kolom sensitif dienkripsi di app layer sebelum masuk DB';
COMMENT ON COLUMN user_kyc.real_name IS 'Disimpan terenkripsi (AES-256-GCM). Decrypt hanya di admin panel.';

-- ─────────────────────────────────────────────
-- user_cosmetics: item yang dimiliki user
-- ─────────────────────────────────────────────
CREATE TABLE user_cosmetics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cosmetic_id     UUID NOT NULL REFERENCES cosmetics(id),
  acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT NOT NULL
                  CHECK (source IN ('purchase','quest','achievement','gift','event','airdrop')),
  is_equipped     BOOL NOT NULL DEFAULT FALSE,
  payment_tx_id   TEXT,                           -- bank-tiranyx txId (null jika gratis)
  UNIQUE(user_id, cosmetic_id)                    -- satu item per user
);

COMMENT ON TABLE user_cosmetics IS 'Inventory kosmetik user. is_equipped menentukan tampilan avatar aktif.';

-- ─────────────────────────────────────────────
-- user_achievements: achievements yang sudah diraih
-- ─────────────────────────────────────────────
-- NOTE: achievements table dibuat di migration 010 (gamification)
-- user_achievements juga dibuat di sana untuk menjaga urutan FK

-- ─────────────────────────────────────────────
-- TRIGGER: auto-create profile saat user register
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ─────────────────────────────────────────────
-- TRIGGER: update updated_at otomatis
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
