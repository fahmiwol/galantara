-- ═══════════════════════════════════════════════════════════════
-- Migration 009: Sawer & Tips
-- Sawer = tip dari penonton ke performer (pengamen, live event)
--
-- KEPUTUSAN BISNIS:
--   MVP: Sawer pakai BERLIAN dulu (tidak butuh PERAK, untuk adoption)
--   Platform cut PERAK sawer: 10% (future, saat PERAK sawer diaktifkan)
--   BERLIAN sawer: platform tidak cut (pure engagement, bukan revenue)
--   Animation: coins/flowers/stars/hearts untuk UX feedback
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- sawer_transactions: transaksi sawer/tip
-- Sender memberi BERLIAN (atau PERAK) ke receiver yang lagi perform
-- ─────────────────────────────────────────────
CREATE TABLE sawer_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  receiver_id     UUID NOT NULL REFERENCES profiles(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  -- Amount
  -- MVP: hanya BERLIAN (amount_slv = 0)
  -- Future: aktifkan PERAK dengan platform cut 10%
  amount_dia      INT NOT NULL DEFAULT 0 CHECK (amount_dia >= 0),   -- BERLIAN
  amount_slv      INT NOT NULL DEFAULT 0 CHECK (amount_slv >= 0),   -- PERAK (future)
  -- Constraint: minimal salah satu harus > 0
  CONSTRAINT sawer_amount_check CHECK (amount_dia > 0 OR amount_slv > 0),
  -- Platform cut dari PERAK sawer (0 untuk MVP, 10% saat aktif)
  platform_fee_slv INT NOT NULL DEFAULT 0,
  -- PERUNGGU yang receiver dapat (dari konversi PERAK setelah cut)
  -- Untuk BERLIAN sawer: receiver_brz = 0 (BERLIAN tidak bisa dicairkan)
  receiver_brz    INT NOT NULL DEFAULT 0,
  -- UX & Social
  message         TEXT CHECK (CHAR_LENGTH(message) <= 50), -- pesan singkat dari sender
  animation       TEXT NOT NULL DEFAULT 'coins'
                  CHECK (animation IN ('coins','flowers','stars','hearts','fireworks')),
  is_anonymous    BOOL NOT NULL DEFAULT FALSE,
  -- Ledger reference (null untuk BERLIAN — tidak lewat bank-tiranyx)
  payment_tx_id   TEXT,                           -- bank-tiranyx txId (hanya untuk PERAK sawer)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sawer_transactions IS 'Transaksi sawer/tip. MVP: BERLIAN saja. PERAK sawer diaktifkan di Sprint 7+.';
COMMENT ON COLUMN sawer_transactions.amount_dia IS 'BERLIAN yang disawer. Tidak masuk bank-tiranyx (pure engagement points). Receiver tidak bisa cairkan.';
COMMENT ON COLUMN sawer_transactions.amount_slv IS 'PERAK yang disawer (future). Dipotong 10% platform fee, sisa → PERUNGGU ke receiver.';
COMMENT ON COLUMN sawer_transactions.animation IS 'Animasi yang muncul di world saat sawer dikirim. Visual feedback untuk engagement.';
COMMENT ON COLUMN sawer_transactions.receiver_brz IS 'PERUNGGU yang receiver terima. 0 untuk BERLIAN sawer. Untuk PERAK: amount_slv - platform_fee_slv.';

-- ─────────────────────────────────────────────
-- VIEW: leaderboard sawer per spot (realtime feel)
-- Top 10 sender hari ini per spot
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW sawer_leaderboard_today AS
SELECT
  st.spot_id,
  st.sender_id,
  p.display_name,
  p.avatar_color,
  SUM(st.amount_dia) AS total_dia_sent,
  SUM(st.amount_slv) AS total_slv_sent,
  COUNT(*) AS sawer_count,
  ROW_NUMBER() OVER (
    PARTITION BY st.spot_id
    ORDER BY SUM(st.amount_dia) DESC, SUM(st.amount_slv) DESC
  ) AS rank
FROM sawer_transactions st
JOIN profiles p ON p.id = st.sender_id
WHERE st.created_at >= CURRENT_DATE
  AND NOT st.is_anonymous
GROUP BY st.spot_id, st.sender_id, p.display_name, p.avatar_color;

COMMENT ON VIEW sawer_leaderboard_today IS 'Top donor hari ini per spot. Tampil di HUD untuk social proof dan gamification.';
