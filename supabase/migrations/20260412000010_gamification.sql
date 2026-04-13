-- ═══════════════════════════════════════════════════════════════
-- Migration 010: Gamification (Quests, Achievements, Dungeons)
-- Core engagement loop: kunjungi spot → complete quest → dapat BERLIAN
-- → unlock cosmetic → tampil keren → ajak teman
--
-- KEPUTUSAN BISNIS:
--   Dungeon reward: rank-based (lebih engaging, competitive)
--   Dungeon entry fee: bervariasi per dungeon
--   BERLIAN tidak bisa dibeli, tidak bisa dicairkan — pure engagement
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- achievements: milestone permanen (satu kali)
-- Tidak ada repeat. Earned = earned forever.
-- ─────────────────────────────────────────────
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- "first_purchase", "visit_5_spots"
  title           TEXT NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  -- Kondisi pengecekan (fleksibel JSONB)
  -- {"type": "total_purchases", "threshold": 1}
  -- {"type": "total_spots_visited", "threshold": 5}
  -- {"type": "total_sales", "threshold": 10}
  condition       JSONB NOT NULL,
  -- Reward
  reward_dia      INT NOT NULL DEFAULT 0,         -- BERLIAN reward
  rarity          TEXT NOT NULL DEFAULT 'common'
                  CHECK (rarity IN ('common','rare','epic','legendary')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE achievements IS 'Milestone permanen user. Tidak bisa di-repeat. Reward dalam BERLIAN.';

CREATE TABLE user_achievements (
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id),
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Seed: Default achievements
INSERT INTO achievements (slug, title, description, reward_dia, rarity, condition) VALUES
  ('first_steps',       'Langkah Pertama',   'Kunjungi spot pertama kali',        10,  'common',    '{"type":"total_spots_visited","threshold":1}'),
  ('explorer',          'Penjelajah',         'Kunjungi 5 spot berbeda',           50,  'rare',      '{"type":"total_spots_visited","threshold":5}'),
  ('world_traveler',    'Petualang Dunia',    'Kunjungi 20 spot berbeda',          200, 'epic',      '{"type":"total_spots_visited","threshold":20}'),
  ('first_buy',         'Pembeli Pertama',    'Selesaikan transaksi pertama',      25,  'common',    '{"type":"total_purchases","threshold":1}'),
  ('loyal_buyer',       'Pembeli Setia',      'Selesaikan 10 transaksi',           100, 'rare',      '{"type":"total_purchases","threshold":10}'),
  ('first_sale',        'Pedagang Pertama',   'Terima pesanan pertama',            50,  'common',    '{"type":"total_sales","threshold":1}'),
  ('merchant_pro',      'Pedagang Handal',    'Terima 50 pesanan',                 300, 'epic',      '{"type":"total_sales","threshold":50}'),
  ('sawer_king',        'Raja Sawer',         'Kirim sawer 100 kali',              150, 'rare',      '{"type":"total_sawer_sent","threshold":100}'),
  ('dungeon_hero',      'Pahlawan Dungeon',   'Menangkan 3 dungeon',               200, 'epic',      '{"type":"dungeon_wins","threshold":3}'),
  ('galantara_legend',  'Legenda Galantara',  'Raih semua achievement epic',       1000,'legendary', '{"type":"achievements_count","threshold":5}');

-- ─────────────────────────────────────────────
-- quests: quest harian/mingguan/sponsored
-- Repeatable (harian/mingguan) atau satu kali (story)
-- ─────────────────────────────────────────────
CREATE TABLE quests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  quest_type      TEXT NOT NULL DEFAULT 'daily'
                  CHECK (quest_type IN ('daily','weekly','story','event','sponsored')),
  -- Sponsor (untuk sponsored quest — brand bayar platform untuk pasang quest)
  sponsor_id      UUID REFERENCES profiles(id),
  sponsor_note    TEXT,
  -- Kondisi penyelesaian (fleksibel JSONB, bisa multi-step)
  -- [{"type": "visit_spot", "count": 3, "current": 0},
  --  {"type": "buy_product", "count": 1, "current": 0},
  --  {"type": "send_sawer",  "count": 1, "current": 0}]
  conditions      JSONB NOT NULL DEFAULT '[]',
  -- Reward
  reward_dia      INT NOT NULL DEFAULT 0,
  reward_slv      INT NOT NULL DEFAULT 0,
  reward_brz      INT NOT NULL DEFAULT 0,
  reward_cosmetic_id UUID REFERENCES cosmetics(id),
  -- Schedule
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  is_repeatable   BOOL NOT NULL DEFAULT FALSE,
  repeat_cooldown_hours INT NOT NULL DEFAULT 24,  -- 24h untuk daily, 168h untuk weekly
  is_active       BOOL NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quests IS 'Quest sistem. daily/weekly: repeatable. story: satu kali. sponsored: brand bayar platform.';
COMMENT ON COLUMN quests.conditions IS 'Array kondisi multi-step: [{"type":"visit_spot","count":3},{"type":"buy_product","count":1}]';
COMMENT ON COLUMN quests.sponsor_id IS 'Jika ada sponsor, brand bayar platform untuk pasang quest + reward mereka sendiri.';

CREATE TABLE quest_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id        UUID NOT NULL REFERENCES quests(id),
  -- Progress state (mirror dari conditions, tapi dengan current count)
  progress        JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','claimed','failed','expired')),
  completed_at    TIMESTAMPTZ,
  claimed_at      TIMESTAMPTZ,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- UNIQUE dengan started_at memungkinkan repeat setelah cooldown
  UNIQUE(user_id, quest_id, started_at)
);

COMMENT ON TABLE quest_progress IS 'Progress user per quest. UNIQUE(user_id,quest_id,started_at) untuk support repeat quest.';

-- Seed: Quest harian default
INSERT INTO quests (title, description, quest_type, is_repeatable, repeat_cooldown_hours, reward_dia, conditions) VALUES
  (
    'Penjelajah Harian',
    'Kunjungi 2 spot hari ini',
    'daily', TRUE, 24, 15,
    '[{"type":"visit_spot","count":2}]'
  ),
  (
    'Pedagang Lokal',
    'Beli satu produk dari booth lokal',
    'daily', TRUE, 24, 20,
    '[{"type":"buy_product","count":1}]'
  ),
  (
    'Sawer Semangat',
    'Kirim sawer ke 1 performer',
    'daily', TRUE, 24, 10,
    '[{"type":"send_sawer","count":1}]'
  ),
  (
    'Penjelajah Sejati',
    'Kunjungi 5 spot berbeda minggu ini',
    'weekly', TRUE, 168, 75,
    '[{"type":"visit_spot","count":5}]'
  );

-- ─────────────────────────────────────────────
-- dungeons: event timed khusus per spot
-- KEPUTUSAN: Reward rank-based (rank 1 > rank 2 > rank 3, sisanya kecil)
-- ─────────────────────────────────────────────
CREATE TABLE dungeons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID NOT NULL REFERENCES spots(id),
  name            TEXT NOT NULL,
  dungeon_type    TEXT NOT NULL DEFAULT 'random'
                  CHECK (dungeon_type IN ('random','scheduled','sponsored')),
  sponsor_id      UUID REFERENCES profiles(id),
  -- World config (scene override khusus dungeon)
  scene_config    JSONB NOT NULL DEFAULT '{}',
  -- Timing
  announced_at    TIMESTAMPTZ,                    -- kapan timer muncul di HUD (30 menit sebelum start)
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  -- Access
  max_players     INT NOT NULL DEFAULT 20,
  entry_fee_slv   INT NOT NULL DEFAULT 0,         -- 0 = gratis (untuk MVP)
  -- Reward pool (KEPUTUSAN: rank-based distribution)
  reward_pool_dia INT NOT NULL DEFAULT 0,
  reward_pool_slv INT NOT NULL DEFAULT 0,
  -- Struktur reward rank-based:
  -- { "rank_1": {"dia": 500, "slv": 10}, "rank_2": {"dia": 250}, "rank_3": {"dia": 100}, "participation": {"dia": 10} }
  reward_items    JSONB NOT NULL DEFAULT '[]',
  -- Status
  status          TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming','active','ended','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dungeons IS 'Event timed per spot. Reward rank-based: rank 1 dapat terbesar. Semua peserta dapat participation reward kecil.';
COMMENT ON COLUMN dungeons.reward_items IS '{"rank_1":{"dia":500},"rank_2":{"dia":250},"rank_3":{"dia":100},"participation":{"dia":10}}';

CREATE TABLE dungeon_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dungeon_id      UUID NOT NULL REFERENCES dungeons(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score           INT NOT NULL DEFAULT 0,
  rank            INT,                            -- diisi setelah dungeon ends
  -- KEPUTUSAN: Rank-based reward
  reward_dia_earned INT NOT NULL DEFAULT 0,
  reward_slv_earned INT NOT NULL DEFAULT 0,
  entry_fee_tx_id TEXT,                           -- bank-tiranyx ref jika entry fee > 0
  UNIQUE(dungeon_id, user_id)
);

COMMENT ON TABLE dungeon_participants IS 'Peserta dungeon. rank dan reward diisi setelah dungeon ends. Rank-based reward.';

-- ─────────────────────────────────────────────
-- FUNCTION: distribute dungeon rewards (rank-based)
-- Dipanggil setelah dungeon ends, berdasarkan score final
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION distribute_dungeon_rewards(p_dungeon_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_dungeon RECORD;
  v_participant RECORD;
  v_rank INT := 1;
  v_reward_dia INT;
  v_reward_config JSONB;
BEGIN
  SELECT * INTO v_dungeon FROM dungeons WHERE id = p_dungeon_id;

  -- Update rank berdasarkan score (DESC)
  -- Kemudian distribute reward sesuai rank
  FOR v_participant IN
    SELECT id, user_id, score
    FROM dungeon_participants
    WHERE dungeon_id = p_dungeon_id
    ORDER BY score DESC
  LOOP
    -- Tentukan reward berdasarkan rank
    v_reward_dia := CASE v_rank
      WHEN 1 THEN COALESCE((v_dungeon.reward_items->>'rank_1_dia')::INT, 0)
      WHEN 2 THEN COALESCE((v_dungeon.reward_items->>'rank_2_dia')::INT, 0)
      WHEN 3 THEN COALESCE((v_dungeon.reward_items->>'rank_3_dia')::INT, 0)
      ELSE    COALESCE((v_dungeon.reward_items->>'participation_dia')::INT, 10)
    END;

    UPDATE dungeon_participants SET
      rank = v_rank,
      reward_dia_earned = v_reward_dia
    WHERE id = v_participant.id;

    v_rank := v_rank + 1;
  END LOOP;

  -- Update dungeon status ke ended
  UPDATE dungeons SET status = 'ended' WHERE id = p_dungeon_id;
END;
$$;

COMMENT ON FUNCTION distribute_dungeon_rewards IS 'Distribute reward setelah dungeon selesai. Rank 1 dapat terbesar. Semua dapat participation reward.';
