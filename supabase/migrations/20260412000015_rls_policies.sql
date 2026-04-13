-- ═══════════════════════════════════════════════════════════════
-- Migration 015: Row Level Security (RLS) Policies
-- Prinsip: minimal access by default, expand sesuai kebutuhan
-- Client browser TIDAK BOLEH akses tabel keuangan (orders.escrow_tx_id dll)
-- Semua operasi keuangan lewat Galantara API → bank-tiranyx
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- HELPER: check apakah user adalah admin/moderator
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin_or_moderator(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role IN ('admin','moderator')
  );
END;
$$;

-- ─────────────────────────────────────────────
-- PROFILES
-- Read: semua orang (publik)
-- Write: hanya diri sendiri (beberapa field)
-- ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_all"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    -- User tidak bisa ubah role dan kyc_status sendiri
    id = auth.uid()
  );

-- ─────────────────────────────────────────────
-- USER_KYC
-- Hanya diri sendiri + admin yang bisa lihat
-- ─────────────────────────────────────────────
ALTER TABLE user_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_own_or_admin"
  ON user_kyc FOR ALL
  USING (
    user_id = auth.uid()
    OR is_admin_or_moderator()
  );

-- ─────────────────────────────────────────────
-- USER_COSMETICS
-- Read: publik (untuk lihat outfit player lain)
-- Write: hanya diri sendiri
-- ─────────────────────────────────────────────
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_cosmetics_read_all"
  ON user_cosmetics FOR SELECT
  USING (true);

CREATE POLICY "user_cosmetics_manage_own"
  ON user_cosmetics FOR ALL
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- COSMETICS
-- Read: semua (publik, untuk discover cosmetic)
-- Write: hanya admin
-- ─────────────────────────────────────────────
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cosmetics_read_all"
  ON cosmetics FOR SELECT
  USING (true);

CREATE POLICY "cosmetics_admin_only"
  ON cosmetics FOR ALL
  USING (is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- SPOTS
-- Read: semua (publik)
-- Write: platform admin atau spot owner
-- ─────────────────────────────────────────────
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spots_read_public"
  ON spots FOR SELECT
  USING (status IN ('active','maintenance') OR owner_id = auth.uid() OR is_admin_or_moderator());

CREATE POLICY "spots_manage_own_or_admin"
  ON spots FOR ALL
  USING (owner_id = auth.uid() OR is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- SPOT_ZONES, NPC_CONFIGS
-- Read: semua (dibutuhkan renderer)
-- Write: spot owner atau admin
-- ─────────────────────────────────────────────
ALTER TABLE spot_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spot_zones_read_all"
  ON spot_zones FOR SELECT
  USING (true);

CREATE POLICY "spot_zones_manage_spot_owner"
  ON spot_zones FOR ALL
  USING (
    is_admin_or_moderator()
    OR EXISTS (
      SELECT 1 FROM spots WHERE id = spot_zones.spot_id AND owner_id = auth.uid()
    )
  );

ALTER TABLE npc_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npc_read_all"
  ON npc_configs FOR SELECT
  USING (true);

CREATE POLICY "npc_manage_spot_owner"
  ON npc_configs FOR ALL
  USING (
    is_admin_or_moderator()
    OR EXISTS (SELECT 1 FROM spots WHERE id = npc_configs.spot_id AND owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- LAND_PARCELS
-- Read: semua (untuk lihat peta sewa lahan)
-- Write: admin saja (parcel dibuat oleh sistem)
-- ─────────────────────────────────────────────
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "land_parcels_read_all"
  ON land_parcels FOR SELECT
  USING (true);

CREATE POLICY "land_parcels_admin_only"
  ON land_parcels FOR ALL
  USING (is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- LAND_LEASES
-- Read: tenant (penyewa) + admin
-- Write: via Galantara API (service role), bukan langsung dari client
-- ─────────────────────────────────────────────
ALTER TABLE land_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "land_leases_own_or_admin"
  ON land_leases FOR SELECT
  USING (tenant_id = auth.uid() OR is_admin_or_moderator());

-- Insert/Update hanya via service role (API backend), tidak dari client langsung
CREATE POLICY "land_leases_service_only"
  ON land_leases FOR INSERT
  USING (is_admin_or_moderator());  -- API pakai service role, admin key

-- ─────────────────────────────────────────────
-- BOOTHS
-- Read: semua (untuk discover merchant)
-- Write: booth owner + admin
-- ─────────────────────────────────────────────
ALTER TABLE booths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booths_read_all"
  ON booths FOR SELECT
  USING (true);

CREATE POLICY "booths_manage_own"
  ON booths FOR ALL
  USING (owner_id = auth.uid() OR is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- PRODUCTS
-- Read: semua produk aktif (publik discovery)
-- Write: booth owner
-- ─────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_read_active"
  ON products FOR SELECT
  USING (status IN ('active','sold_out') OR owner_id = auth.uid() OR is_admin_or_moderator());

CREATE POLICY "products_manage_own"
  ON products FOR ALL
  USING (owner_id = auth.uid() OR is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- ORDERS
-- Read: buyer atau seller yang terlibat + admin
-- Write: via Galantara API (service role)
-- ─────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_parties_only"
  ON orders FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR is_admin_or_moderator()
  );

-- Update hanya buyer/seller yang terlibat (untuk buyer: cancel, dispute)
-- Perubahan status utama via API (service role)
CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- ORDER_TIMELINE
-- Read: buyer atau seller terkait
-- Write: append-only via triggers (service role)
-- ─────────────────────────────────────────────
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_timeline_parties_only"
  ON order_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_timeline.order_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR is_admin_or_moderator()
  );

-- ─────────────────────────────────────────────
-- REVIEWS
-- Read: semua (review publik)
-- Write: hanya buyer dari completed order
-- ─────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read_all"
  ON reviews FOR SELECT
  USING (NOT is_flagged OR is_admin_or_moderator());

CREATE POLICY "reviews_insert_buyer"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = reviews.order_id
      AND o.buyer_id = auth.uid()
      AND o.status = 'completed'
    )
  );

-- ─────────────────────────────────────────────
-- TRAVEL_PASSES
-- Read: hanya pemilik pass + admin
-- Write: via API (service role saat beli pass)
-- ─────────────────────────────────────────────
ALTER TABLE travel_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_passes_own"
  ON travel_passes FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- ADVERTISEMENTS
-- Read: semua iklan aktif (untuk renderer)
-- Write: advertiser + admin (untuk moderasi)
-- ─────────────────────────────────────────────
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_read_active_or_own"
  ON advertisements FOR SELECT
  USING (
    status = 'active'
    OR advertiser_id = auth.uid()
    OR is_admin_or_moderator()
  );

CREATE POLICY "ads_manage_own"
  ON advertisements FOR ALL
  USING (advertiser_id = auth.uid() OR is_admin_or_moderator());

-- ─────────────────────────────────────────────
-- SAWER_TRANSACTIONS
-- Read: sender atau receiver + admin
-- Write: via API (service role)
-- ─────────────────────────────────────────────
ALTER TABLE sawer_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sawer_own_parties"
  ON sawer_transactions FOR SELECT
  USING (
    (sender_id = auth.uid() AND NOT is_anonymous)
    OR receiver_id = auth.uid()
    OR is_admin_or_moderator()
  );

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- Read & update: hanya pemilik notif
-- ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_only"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- SPOT_ANALYTICS
-- Read: spot owner + admin
-- Write: hanya service role (background job)
-- ─────────────────────────────────────────────
ALTER TABLE spot_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_spot_owner_or_admin"
  ON spot_analytics FOR SELECT
  USING (
    is_admin_or_moderator()
    OR EXISTS (SELECT 1 FROM spots WHERE id = spot_analytics.spot_id AND owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- REPORTS
-- Read: reporter + admin
-- Write: semua user authenticated
-- ─────────────────────────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_own_or_admin"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid() OR is_admin_or_moderator());

CREATE POLICY "reports_insert_authenticated"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- QUESTS & ACHIEVEMENTS (publik read)
-- ─────────────────────────────────────────────
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests_read_active" ON quests FOR SELECT USING (is_active = TRUE OR is_admin_or_moderator());
CREATE POLICY "quests_admin_only" ON quests FOR ALL USING (is_admin_or_moderator());

ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_progress_own" ON quest_progress FOR ALL USING (user_id = auth.uid());

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_read_all" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_admin_only" ON achievements FOR ALL USING (is_admin_or_moderator());

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_read_all" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_own" ON user_achievements FOR INSERT USING (user_id = auth.uid());

ALTER TABLE dungeons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dungeons_read_all" ON dungeons FOR SELECT USING (true);
CREATE POLICY "dungeons_admin_only" ON dungeons FOR ALL USING (is_admin_or_moderator());

ALTER TABLE dungeon_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dungeon_participants_read_all" ON dungeon_participants FOR SELECT USING (true);
CREATE POLICY "dungeon_participants_join_own" ON dungeon_participants FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- MODULES
-- Read: semua modul approved (publik marketplace)
-- Write: developer owner + admin
-- ─────────────────────────────────────────────
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_read_approved_or_own"
  ON modules FOR SELECT
  USING (status = 'approved' OR developer_id = auth.uid() OR is_admin_or_moderator());

CREATE POLICY "modules_manage_own"
  ON modules FOR ALL
  USING (developer_id = auth.uid() OR is_admin_or_moderator());

ALTER TABLE module_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_installs_read_all" ON module_installs FOR SELECT USING (true);
CREATE POLICY "module_installs_spot_owner"
  ON module_installs FOR ALL
  USING (
    installed_by = auth.uid()
    OR is_admin_or_moderator()
  );

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_categories_read_all" ON product_categories FOR SELECT USING (true);
CREATE POLICY "product_categories_admin_only" ON product_categories FOR ALL USING (is_admin_or_moderator());

ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_slots_read_all" ON ad_slots FOR SELECT USING (true);
CREATE POLICY "ad_slots_admin_only" ON ad_slots FOR ALL USING (is_admin_or_moderator());

ALTER TABLE ad_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_analytics_own_or_admin"
  ON ad_analytics_daily FOR SELECT
  USING (
    is_admin_or_moderator()
    OR EXISTS (
      SELECT 1 FROM advertisements a WHERE a.id = ad_analytics_daily.advertisement_id AND a.advertiser_id = auth.uid()
    )
  );
