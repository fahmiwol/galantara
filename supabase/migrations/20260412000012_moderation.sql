-- ═══════════════════════════════════════════════════════════════
-- Migration 012: Moderation & Trust
-- Reports: laporan konten/user dari komunitas
-- Bans: tindakan moderasi (warning → temp ban → permanent)
-- Auto-flag: 3 reports pada target yang sama → auto-suspend
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- reports: laporan konten/user dari komunitas
-- Polymorphic: bisa report user, booth, produk, order, dll
-- ─────────────────────────────────────────────
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES profiles(id),
  -- Target laporan (polymorphic — satu tabel untuk semua tipe)
  target_type     TEXT NOT NULL
                  CHECK (target_type IN (
                    'user',
                    'booth',
                    'product',
                    'order',
                    'chat',
                    'module',
                    'advertisement'
                  )),
  target_id       UUID NOT NULL,
  -- Isi laporan
  reason          TEXT NOT NULL
                  CHECK (reason IN (
                    'spam',
                    'fraud',
                    'fake_product',
                    'inappropriate',
                    'harassment',
                    'scam',
                    'other'
                  )),
  description     TEXT,
  -- Bukti pendukung (screenshot di Supabase Storage)
  evidence_urls   TEXT[],
  -- Resolusi
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','investigating','resolved','dismissed')),
  resolved_by     UUID REFERENCES profiles(id),
  resolution      TEXT,
  resolved_at     TIMESTAMPTZ,
  -- Satu reporter hanya bisa lapor target yang sama satu kali
  CONSTRAINT unique_report_per_target UNIQUE (reporter_id, target_type, target_id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'Laporan komunitas. Polymorphic: target_type + target_id. 3 reports = auto-suspend target.';
COMMENT ON COLUMN reports.target_type IS 'Tipe yang dilaporkan. target_id = UUID dari record tersebut.';

-- ─────────────────────────────────────────────
-- bans: tindakan moderasi terhadap user
-- Escalation: warning → temp_ban → permanent_ban
-- ─────────────────────────────────────────────
CREATE TABLE bans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  banned_by       UUID NOT NULL REFERENCES profiles(id),   -- moderator/admin
  ban_type        TEXT NOT NULL DEFAULT 'warning'
                  CHECK (ban_type IN ('warning','temp_ban','permanent_ban')),
  reason          TEXT NOT NULL,
  reference_report_id UUID REFERENCES reports(id),         -- report yang trigger ban ini
  expires_at      TIMESTAMPTZ,                             -- null = permanent
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bans IS 'Tindakan moderasi. warning → temp_ban → permanent_ban. is_active dicek saat login.';
COMMENT ON COLUMN bans.expires_at IS 'null = permanent ban. Untuk temp_ban: jam berakhir. System auto-set is_active=false saat expires_at lewat.';

-- ─────────────────────────────────────────────
-- FUNCTION: cek apakah user sedang di-ban
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOL
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_banned BOOL;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM bans
    WHERE user_id = p_user_id
    AND is_active = TRUE
    AND ban_type IN ('temp_ban','permanent_ban')
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_is_banned;

  -- Auto-expire temp bans yang sudah lewat
  UPDATE bans SET is_active = FALSE
  WHERE user_id = p_user_id
  AND ban_type = 'temp_ban'
  AND is_active = TRUE
  AND expires_at <= NOW();

  -- Sync ke profiles.is_banned
  UPDATE profiles SET is_banned = v_is_banned WHERE id = p_user_id;

  RETURN v_is_banned;
END;
$$;

COMMENT ON FUNCTION is_user_banned IS 'Cek ban aktif, auto-expire temp ban yang kedaluwarsa, sync ke profiles.is_banned.';

-- ─────────────────────────────────────────────
-- TRIGGER: auto-suspend target jika reports >= 3
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_auto_suspend()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_report_count INT;
BEGIN
  SELECT COUNT(*) INTO v_report_count
  FROM reports
  WHERE target_type = NEW.target_type
  AND target_id = NEW.target_id
  AND status = 'pending';

  -- 3 laporan pending pada target yang sama → auto-suspend
  IF v_report_count >= 3 THEN
    -- Auto-suspend booth
    IF NEW.target_type = 'booth' THEN
      UPDATE booths SET status = 'suspended'
      WHERE id = NEW.target_id AND status != 'suspended';
    END IF;

    -- Auto-suspend product
    IF NEW.target_type = 'product' THEN
      UPDATE products SET status = 'suspended'
      WHERE id = NEW.target_id AND status != 'suspended';
    END IF;

    -- Auto-suspend advertisement
    IF NEW.target_type = 'advertisement' THEN
      UPDATE advertisements SET status = 'paused'
      WHERE id = NEW.target_id AND status = 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_auto_suspend
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE PROCEDURE check_auto_suspend();
