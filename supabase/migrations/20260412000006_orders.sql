-- ═══════════════════════════════════════════════════════════════
-- Migration 006: Orders & Transactions
-- Alur COD: pending_payment → paid (escrow) → processing →
--           ready → completed (release PERUNGGU ke seller)
--
-- KEPUTUSAN BISNIS:
--   Platform fee: 5% dari subtotal
--   Escrow duration: 3 hari setelah completed sebelum auto-release
--   COD code: 6 digit angka unique
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- orders: purchase records
-- Setiap order = satu transaksi COD/digital
-- ─────────────────────────────────────────────
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pihak yang terlibat
  buyer_id        UUID NOT NULL REFERENCES profiles(id),
  seller_id       UUID NOT NULL REFERENCES profiles(id),
  booth_id        UUID NOT NULL REFERENCES booths(id),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  -- Pricing (dikunci saat order dibuat — price lock)
  unit_price_slv  INT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal_slv    INT NOT NULL,                   -- quantity × unit_price_slv
  -- KEPUTUSAN: Platform fee 5%
  platform_fee_slv INT NOT NULL DEFAULT 0,        -- CEIL(subtotal × 0.05)
  total_slv       INT NOT NULL,                   -- = subtotal_slv (buyer bayar full)
  -- PERUNGGU yang seller terima setelah platform cut
  -- Conversion: (subtotal - platform_fee) PERAK → PERUNGGU (1:1 nominal)
  seller_brz      INT NOT NULL,                   -- = subtotal_slv - platform_fee_slv
  -- Delivery info
  delivery_type   TEXT NOT NULL
                  CHECK (delivery_type IN ('cod','digital_delivery','pickup','shipping')),
  -- COD flow
  cod_code        TEXT UNIQUE,                    -- 6 digit: "847291" — digenerate saat paid
  cod_meet_location TEXT,                         -- titik temu yang disepakati buyer-seller
  cod_verified_at TIMESTAMPTZ,                    -- saat seller input cod_code konfirmasi
  -- Digital delivery
  digital_download_url TEXT,                      -- dikirim ke buyer saat status = completed
  -- Status state machine
  -- pending_payment: buyer belum bayar PERAK
  -- paid: PERAK sudah masuk escrow, COD code dibuat
  -- processing: seller konfirmasi terima order, lagi disiapkan
  -- ready: siap untuk COD / pickup / kirim
  -- completed: COD verified, atau digital delivered. PERUNGGU direlease ke seller.
  -- disputed: ada sengketa buyer vs seller, moderator review
  -- refunded: buyer dapat refund (PERAK kembali dari escrow)
  -- cancelled: dibatalkan sebelum status = paid
  status          TEXT NOT NULL DEFAULT 'pending_payment'
                  CHECK (status IN (
                    'pending_payment',
                    'paid',
                    'processing',
                    'ready',
                    'completed',
                    'disputed',
                    'refunded',
                    'cancelled'
                  )),
  -- Dispute
  dispute_reason  TEXT,
  dispute_by      UUID REFERENCES profiles(id),
  dispute_at      TIMESTAMPTZ,
  -- Financial ledger refs (bank-tiranyx transaction IDs — immutable)
  escrow_tx_id    TEXT,                           -- saat buyer bayar → PERAK ke escrow
  release_tx_id   TEXT,                           -- saat seller terima PERUNGGU (setelah completed)
  refund_tx_id    TEXT,                           -- saat refund (PERAK kembali ke buyer)
  -- KEPUTUSAN: Escrow 3 hari sejak completed (auto-release jika buyer tidak dispute)
  escrow_release_at TIMESTAMPTZ,                  -- NOW() + 3 days, set saat status = completed
  -- Buyer notes
  buyer_notes     TEXT,
  -- Meta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Purchase records. State machine dari pending_payment → completed. Escrow 3 hari.';
COMMENT ON COLUMN orders.cod_code IS '6 digit unique code. Dibuat saat status berubah ke paid. Seller input ini untuk verifikasi COD.';
COMMENT ON COLUMN orders.platform_fee_slv IS '5% dari subtotal. Formula: CEIL(subtotal_slv * 0.05)';
COMMENT ON COLUMN orders.seller_brz IS 'PERUNGGU yang seller terima. = subtotal_slv - platform_fee_slv. Conversion 1:1 dari PERAK ke PERUNGGU.';
COMMENT ON COLUMN orders.escrow_release_at IS 'Auto-release PERUNGGU ke seller jika tidak ada dispute dalam 3 hari sejak completed.';

-- ─────────────────────────────────────────────
-- order_items: detail item per order (future multi-item)
-- Snapshot produk saat order dibuat (bukan FK live ke products)
-- ─────────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  -- Snapshot: nama dan harga dikopi saat order (bukan FK live)
  -- Ini penting: harga produk bisa berubah setelah order dibuat
  product_name    TEXT NOT NULL,
  unit_price_slv  INT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1,
  subtotal_slv    INT NOT NULL
);

COMMENT ON TABLE order_items IS 'Detail item per order. product_name adalah snapshot saat order — bukan live dari products table.';

-- ─────────────────────────────────────────────
-- order_timeline: audit trail perubahan status
-- Immutable — tidak ada UPDATE, hanya INSERT
-- ─────────────────────────────────────────────
CREATE TABLE order_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  note            TEXT,
  created_by      UUID REFERENCES profiles(id),  -- null = system/automation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_timeline IS 'Audit trail status order. Immutable (tidak ada UPDATE). Penting untuk dispute resolution.';

-- ─────────────────────────────────────────────
-- reviews: rating setelah order selesai
-- Hanya bisa review jika order.status = completed
-- ─────────────────────────────────────────────
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id), -- 1 review per order
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  reviewed_user_id UUID NOT NULL REFERENCES profiles(id),    -- seller yang direview
  booth_id        UUID NOT NULL REFERENCES booths(id),
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_anonymous    BOOL NOT NULL DEFAULT FALSE,
  is_flagged      BOOL NOT NULL DEFAULT FALSE,               -- flagged by moderator
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Rating setelah transaksi. Satu review per order. Buyer review seller.';

-- ─────────────────────────────────────────────
-- FUNCTION: generate COD code (6 digit unique)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_cod_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOL;
BEGIN
  LOOP
    -- Generate 6 digit random code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    -- Cek uniqueness (hanya order aktif yang perlu unique)
    SELECT EXISTS(
      SELECT 1 FROM orders
      WHERE cod_code = v_code
      AND status IN ('paid','processing','ready')
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- ─────────────────────────────────────────────
-- TRIGGER: auto-set escrow_release_at saat completed
-- TRIGGER: auto-create timeline entry saat status berubah
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set escrow_release_at = NOW() + 3 hari saat completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.escrow_release_at := NOW() + INTERVAL '3 days';
  END IF;

  -- Generate COD code saat paid (hanya untuk COD orders)
  IF NEW.status = 'paid' AND OLD.status = 'pending_payment'
     AND NEW.delivery_type = 'cod'
     AND NEW.cod_code IS NULL THEN
    NEW.cod_code := generate_cod_code();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_status_change
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE handle_order_status_change();

CREATE OR REPLACE FUNCTION log_order_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log setiap perubahan status ke order_timeline
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_timeline (order_id, status, note, created_by)
    VALUES (NEW.id, NEW.status, 'Order dibuat', NULL);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_timeline (order_id, status, created_by)
    VALUES (NEW.id, NEW.status, NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_log_timeline
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE log_order_timeline();

-- TRIGGER: update booth stats setelah order completed
CREATE OR REPLACE FUNCTION update_booth_stats_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE booths SET
      total_sales_count = total_sales_count + 1,
      total_sales_slv = total_sales_slv + NEW.subtotal_slv
    WHERE id = NEW.booth_id;

    UPDATE profiles SET total_sales = total_sales + 1
    WHERE id = NEW.seller_id;

    UPDATE profiles SET total_purchases = total_purchases + 1
    WHERE id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_update_booth_stats
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_booth_stats_on_order();

-- TRIGGER: update booth rating setelah ada review
CREATE OR REPLACE FUNCTION update_booth_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE booths SET
    rating = (
      SELECT AVG(r.rating)::DECIMAL(3,2)
      FROM reviews r WHERE r.booth_id = NEW.booth_id AND NOT r.is_flagged
    ),
    rating_count = (
      SELECT COUNT(*) FROM reviews r WHERE r.booth_id = NEW.booth_id AND NOT r.is_flagged
    )
  WHERE id = NEW.booth_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_update_booth_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE PROCEDURE update_booth_rating();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
