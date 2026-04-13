-- ═══════════════════════════════════════════════════════════════
-- Migration 014: Performance Indexes
-- Semua index yang critical untuk production performance
-- Dipisah dari schema agar bisa di-drop/rebuild tanpa alter table
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- USERS & AUTH
-- ─────────────────────────────────────────────
CREATE INDEX idx_profiles_username
  ON profiles (username);
COMMENT ON INDEX idx_profiles_username IS 'Lookup @handle cepat. Dipakai untuk search user dan mention.';

CREATE INDEX idx_profiles_role
  ON profiles (role);
COMMENT ON INDEX idx_profiles_role IS 'Filter admin/moderator saat permission check.';

CREATE INDEX idx_profiles_current_spot
  ON profiles (current_spot_id)
  WHERE current_spot_id IS NOT NULL;
COMMENT ON INDEX idx_profiles_current_spot IS 'Lookup "siapa saja di spot X sekarang". Partial index (skip null).';

-- ─────────────────────────────────────────────
-- SPOTS & WORLD
-- ─────────────────────────────────────────────
CREATE INDEX idx_spots_slug
  ON spots (slug);
COMMENT ON INDEX idx_spots_slug IS 'URL routing: galantara.io/spot/{slug} → spot record.';

CREATE INDEX idx_spots_city
  ON spots (city);
COMMENT ON INDEX idx_spots_city IS 'Filter spot berdasarkan kota untuk discover page.';

CREATE INDEX idx_spots_status_featured
  ON spots (status, is_featured);
COMMENT ON INDEX idx_spots_status_featured IS 'Home page: spots aktif yang featured.';

CREATE INDEX idx_spot_zones_spot
  ON spot_zones (spot_id)
  WHERE is_active = TRUE;
COMMENT ON INDEX idx_spot_zones_spot IS 'Load zones aktif saat render world.';

-- ─────────────────────────────────────────────
-- LAND SYSTEM
-- ─────────────────────────────────────────────
CREATE INDEX idx_land_parcels_spot_status
  ON land_parcels (spot_id, status);
COMMENT ON INDEX idx_land_parcels_spot_status IS 'Tampil grid peta sewa lahan per spot.';

CREATE INDEX idx_land_parcels_grid
  ON land_parcels (spot_id, grid_x, grid_z);
COMMENT ON INDEX idx_land_parcels_grid IS 'Lookup parcel berdasarkan koordinat grid (saat click di world).';

CREATE INDEX idx_land_leases_tenant_status
  ON land_leases (tenant_id, status);
COMMENT ON INDEX idx_land_leases_tenant_status IS 'Dashboard merchant: lihat semua lease aktif.';

CREATE INDEX idx_land_leases_expiry
  ON land_leases (ends_at)
  WHERE status = 'active';
COMMENT ON INDEX idx_land_leases_expiry IS 'Cron job: find leases yang expire dalam 3 hari untuk kirim notif.';

-- ─────────────────────────────────────────────
-- BOOTHS & PRODUCTS
-- ─────────────────────────────────────────────
CREATE INDEX idx_booths_spot_status
  ON booths (spot_id, status);
COMMENT ON INDEX idx_booths_spot_status IS 'Load semua booth aktif di spot saat player masuk.';

CREATE INDEX idx_booths_owner
  ON booths (owner_id);
COMMENT ON INDEX idx_booths_owner IS 'Merchant dashboard: lihat semua booth milik merchant.';

CREATE INDEX idx_products_booth_status
  ON products (booth_id, status);
COMMENT ON INDEX idx_products_booth_status IS 'Load produk aktif di booth saat player klik booth.';

-- Full-text search pada nama + deskripsi produk (Bahasa Indonesia)
CREATE INDEX idx_products_fts
  ON products USING GIN(
    to_tsvector('indonesian', name || ' ' || COALESCE(description, ''))
  );
COMMENT ON INDEX idx_products_fts IS 'Full-text search produk dalam Bahasa Indonesia. Dipakai untuk search bar discover.';

CREATE INDEX idx_products_type_status
  ON products (product_type, status);
COMMENT ON INDEX idx_products_type_status IS 'Filter produk berdasarkan tipe (physical, digital, dll).';

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
CREATE INDEX idx_orders_buyer
  ON orders (buyer_id, created_at DESC);
COMMENT ON INDEX idx_orders_buyer IS 'Riwayat pembelian buyer (newest first).';

CREATE INDEX idx_orders_seller
  ON orders (seller_id, created_at DESC);
COMMENT ON INDEX idx_orders_seller IS 'Riwayat penjualan seller (newest first).';

CREATE INDEX idx_orders_status_created
  ON orders (status, created_at DESC);
COMMENT ON INDEX idx_orders_status_created IS 'Admin: filter order berdasarkan status.';

CREATE INDEX idx_orders_escrow_release
  ON orders (escrow_release_at)
  WHERE status = 'completed' AND release_tx_id IS NULL;
COMMENT ON INDEX idx_orders_escrow_release IS 'Cron job: find completed orders yang escrow_release_at sudah lewat → release PERUNGGU.';

CREATE INDEX idx_orders_cod_code
  ON orders (cod_code)
  WHERE cod_code IS NOT NULL;
COMMENT ON INDEX idx_orders_cod_code IS 'COD verification: seller input 6-digit code → cari order.';

-- ─────────────────────────────────────────────
-- TRAVEL SYSTEM
-- ─────────────────────────────────────────────
CREATE INDEX idx_travel_passes_active
  ON travel_passes (user_id, spot_id, valid_until);
COMMENT ON INDEX idx_travel_passes_active IS 'Cek apakah user punya pass aktif untuk masuk spot.';

CREATE INDEX idx_location_verifications_user_spot
  ON location_verifications (user_id, spot_id, expires_at);
COMMENT ON INDEX idx_location_verifications_user_spot IS 'Cek verifikasi lokasi aktif user per spot.';

-- ─────────────────────────────────────────────
-- ADVERTISEMENTS
-- ─────────────────────────────────────────────
CREATE INDEX idx_advertisements_active_slot
  ON advertisements (slot_id, status, starts_at, ends_at);
COMMENT ON INDEX idx_advertisements_active_slot IS 'Load iklan aktif per slot untuk renderer billboard 3D.';

CREATE INDEX idx_ad_analytics_daily_ad_date
  ON ad_analytics_daily (advertisement_id, date);
COMMENT ON INDEX idx_ad_analytics_daily_ad_date IS 'Aggregasi analytics per iklan per periode.';

-- ─────────────────────────────────────────────
-- GAMIFICATION
-- ─────────────────────────────────────────────
CREATE INDEX idx_quest_progress_user_status
  ON quest_progress (user_id, status);
COMMENT ON INDEX idx_quest_progress_user_status IS 'HUD: tampil quest aktif user.';

CREATE INDEX idx_dungeon_participants_dungeon
  ON dungeon_participants (dungeon_id, score DESC);
COMMENT ON INDEX idx_dungeon_participants_dungeon IS 'Leaderboard dungeon sorted by score.';

CREATE INDEX idx_dungeons_spot_status
  ON dungeons (spot_id, status, starts_at);
COMMENT ON INDEX idx_dungeons_spot_status IS 'HUD: dungeon upcoming di spot ini.';

-- ─────────────────────────────────────────────
-- SAWER
-- ─────────────────────────────────────────────
CREATE INDEX idx_sawer_receiver_spot
  ON sawer_transactions (receiver_id, spot_id, created_at DESC);
COMMENT ON INDEX idx_sawer_receiver_spot IS 'Dashboard performer: riwayat sawer yang diterima.';

CREATE INDEX idx_sawer_leaderboard
  ON sawer_transactions (spot_id, created_at DESC);
COMMENT ON INDEX idx_sawer_leaderboard IS 'Leaderboard sawer hari ini per spot.';

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
-- (Sudah dibuat di migration 013 untuk unread notifications)
CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
COMMENT ON INDEX idx_notifications_user_created IS 'Load semua notif user (newest first).';

CREATE INDEX idx_notifications_expiry
  ON notifications (expires_at)
  WHERE is_read = TRUE;
COMMENT ON INDEX idx_notifications_expiry IS 'Cleanup job: delete notif yang sudah read dan expired.';

-- ─────────────────────────────────────────────
-- ANALYTICS
-- ─────────────────────────────────────────────
CREATE INDEX idx_spot_analytics_spot_date
  ON spot_analytics (spot_id, date DESC);
COMMENT ON INDEX idx_spot_analytics_spot_date IS 'Spot owner dashboard: lihat analytics per spot per periode.';

CREATE INDEX idx_spot_analytics_date
  ON spot_analytics (date DESC);
COMMENT ON INDEX idx_spot_analytics_date IS 'Platform admin: total revenue semua spot per hari.';

-- ─────────────────────────────────────────────
-- MODERATION
-- ─────────────────────────────────────────────
CREATE INDEX idx_reports_target
  ON reports (target_type, target_id, status);
COMMENT ON INDEX idx_reports_target IS 'Count reports per target untuk auto-suspend trigger.';

CREATE INDEX idx_bans_user_active
  ON bans (user_id, is_active, expires_at);
COMMENT ON INDEX idx_bans_user_active IS 'Check apakah user sedang kena ban saat login/join spot.';
