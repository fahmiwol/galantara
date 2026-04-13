-- ═══════════════════════════════════════════════════════════════
-- Migration 013: Notifications & Analytics
-- Notifications: in-app queue, diread via Supabase Realtime
-- Spot Analytics: daily aggregated stats untuk revenue reporting
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- notifications: queue notifikasi in-app
-- Push via Supabase Realtime (SELECT subscription)
-- Auto-delete setelah 30 hari untuk manajemen storage
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notif_type      TEXT NOT NULL
                  CHECK (notif_type IN (
                    -- Commerce
                    'order_new',            -- seller: ada pesanan baru
                    'order_update',         -- buyer: status pesanan berubah
                    'order_completed',      -- seller: pesanan selesai, cek PERUNGGU
                    'payment_received',     -- seller: PERUNGGU sudah masuk
                    'withdrawal_done',      -- user: penarikan berhasil
                    -- Gamification
                    'quest_available',      -- quest baru tersedia
                    'quest_complete',       -- quest selesai, klaim reward
                    'achievement_earned',   -- achievement baru diraih
                    'dungeon_alert',        -- dungeon akan dimulai dalam 30 menit
                    'dungeon_starting',     -- dungeon mulai sekarang
                    -- Land & Booth
                    'lease_expiring',       -- lease mau habis (3 hari sebelum)
                    'lease_expired',        -- lease habis, booth suspended
                    'booth_suspended',      -- booth di-suspend karena laporan
                    -- Social
                    'sawer_received',       -- dapat sawer dari viewer
                    'review_received',      -- dapat review dari buyer
                    -- Moderation
                    'report_resolved',      -- laporan user sudah diproses
                    'ban_lifted',           -- ban sudah dicabut
                    -- System
                    'system',               -- notif sistem umum
                    'promo'                 -- promo/event platform
                  )),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  -- Deep link untuk navigasi langsung ke relevan page
  action_url      TEXT,                           -- contoh: "/orders/uuid", "/quest"
  -- Data tambahan untuk in-app rendering
  data            JSONB NOT NULL DEFAULT '{}',
  is_read         BOOL NOT NULL DEFAULT FALSE,
  -- Auto cleanup setelah 30 hari
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Queue notifikasi in-app. Push via Supabase Realtime. Auto-expire 30 hari.';
COMMENT ON COLUMN notifications.action_url IS 'Deep link untuk navigasi: "/orders/uuid", "/spot/bogor", "/quest". Dibuka saat notif diklik.';
COMMENT ON COLUMN notifications.data IS 'Extra data: {"order_id": "uuid", "amount_slv": 5}. Dipakai untuk render notif yang kaya.';

-- Index untuk lookup notif user yang belum dibaca
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read, created_at DESC)
WHERE is_read = FALSE;

-- ─────────────────────────────────────────────
-- spot_analytics: daily aggregated stats per spot
-- Di-update oleh background job setiap tengah malam
-- Revenue tracking per spot per hari
-- ─────────────────────────────────────────────
CREATE TABLE spot_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  -- Traffic
  unique_visitors INT NOT NULL DEFAULT 0,         -- unique user_id yang masuk spot
  total_sessions  INT NOT NULL DEFAULT 0,         -- total join events
  avg_duration_mins DECIMAL(6,2) NOT NULL DEFAULT 0,
  peak_concurrent INT NOT NULL DEFAULT 0,         -- max player bersamaan di hari itu
  -- Commerce
  orders_count    INT NOT NULL DEFAULT 0,         -- total order yang dibuat
  orders_completed INT NOT NULL DEFAULT 0,         -- total order yang completed
  orders_slv      INT NOT NULL DEFAULT 0,         -- total PERAK dari transaksi
  platform_fee_slv INT NOT NULL DEFAULT 0,        -- platform cut dari transaksi
  -- Land
  active_leases   INT NOT NULL DEFAULT 0,         -- jumlah parcel yang disewa
  new_leases      INT NOT NULL DEFAULT 0,         -- lease baru di hari ini
  rent_revenue_slv INT NOT NULL DEFAULT 0,        -- total PERAK dari sewa lahan
  -- Travel
  travel_fee_slv  INT NOT NULL DEFAULT 0,         -- total PERAK dari travel fee
  -- Ads
  ad_impressions  INT NOT NULL DEFAULT 0,
  ad_clicks       INT NOT NULL DEFAULT 0,
  ad_revenue_slv  INT NOT NULL DEFAULT 0,
  -- Engagement
  chat_messages   INT NOT NULL DEFAULT 0,
  sawer_count     INT NOT NULL DEFAULT 0,
  sawer_dia       INT NOT NULL DEFAULT 0,
  -- Summary
  total_revenue_slv INT NOT NULL DEFAULT 0,       -- total semua revenue PERAK di hari ini
  UNIQUE(spot_id, date)
);

COMMENT ON TABLE spot_analytics IS 'Daily stats per spot. Di-update oleh background job. Data untuk revenue reporting dan spot owner dashboard.';

-- ─────────────────────────────────────────────
-- VIEW: platform revenue summary (untuk admin dashboard)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW platform_revenue_summary AS
SELECT
  date,
  SUM(platform_fee_slv) AS total_transaction_fee_slv,
  SUM(rent_revenue_slv) AS total_rent_slv,
  SUM(travel_fee_slv) AS total_travel_slv,
  SUM(ad_revenue_slv) AS total_ad_slv,
  SUM(total_revenue_slv) AS total_revenue_slv,
  SUM(unique_visitors) AS total_visitors,
  SUM(orders_completed) AS total_orders,
  COUNT(DISTINCT spot_id) AS active_spots
FROM spot_analytics
GROUP BY date
ORDER BY date DESC;

COMMENT ON VIEW platform_revenue_summary IS 'Summary revenue seluruh platform per hari. Untuk admin dashboard dan investor report.';

-- ─────────────────────────────────────────────
-- FUNCTION: kirim notifikasi ke user
-- Helper yang dipanggil dari trigger/function lain
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  INSERT INTO notifications (user_id, notif_type, title, body, action_url, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_action_url, p_data)
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;

COMMENT ON FUNCTION send_notification IS 'Helper untuk kirim notifikasi. Dipanggil dari trigger order, lease, dll.';

-- Wire up notifikasi untuk order events
CREATE OR REPLACE FUNCTION notify_order_parties()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Notif ke seller saat ada order baru
  IF TG_OP = 'INSERT' THEN
    PERFORM send_notification(
      NEW.seller_id, 'order_new',
      'Pesanan Baru! 🎉',
      'Ada pesanan baru masuk ke booth kamu.',
      '/orders/' || NEW.id::TEXT,
      jsonb_build_object('order_id', NEW.id, 'amount_slv', NEW.total_slv)
    );
  END IF;

  -- Notif ke buyer saat status berubah
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'processing' THEN
      PERFORM send_notification(
        NEW.buyer_id, 'order_update',
        'Pesanan Diproses',
        'Seller sedang menyiapkan pesananmu.',
        '/orders/' || NEW.id::TEXT,
        jsonb_build_object('order_id', NEW.id, 'cod_code', NEW.cod_code)
      );
    ELSIF NEW.status = 'ready' THEN
      PERFORM send_notification(
        NEW.buyer_id, 'order_update',
        'Pesanan Siap! 📦',
        'Pesananmu siap. Kode COD: ' || COALESCE(NEW.cod_code, '-'),
        '/orders/' || NEW.id::TEXT,
        jsonb_build_object('order_id', NEW.id, 'cod_code', NEW.cod_code)
      );
    ELSIF NEW.status = 'completed' THEN
      PERFORM send_notification(
        NEW.seller_id, 'order_completed',
        'Transaksi Selesai! 💰',
        'PERUNGGU akan cair dalam 3 hari jika tidak ada dispute.',
        '/orders/' || NEW.id::TEXT,
        jsonb_build_object('order_id', NEW.id, 'seller_brz', NEW.seller_brz)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_notify_parties
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE notify_order_parties();
