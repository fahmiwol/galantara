# Galantara — Supabase Migrations

## Cara Jalankan

### Setup Pertama
```bash
# Install Supabase CLI
npm install -g supabase

# Login ke Supabase
supabase login

# Link ke project (dapatkan project ref dari dashboard.supabase.com)
supabase link --project-ref <YOUR_PROJECT_REF>
```

### Jalankan Migrations
```bash
# Push semua migrations ke database
supabase db push

# Atau jalankan satu per satu (development)
supabase db reset  # WARNING: drop semua data!
```

### Jalankan di SQL Editor (manual)
Bisa juga copy-paste langsung ke Supabase SQL Editor:
1. Buka https://supabase.com/dashboard/project/{ref}/sql
2. Jalankan file migration secara berurutan (001 → 015)

---

## Urutan Migration

| File | Isi | Dependencies |
|------|-----|--------------|
| `001_cosmetics_categories` | Tabel kosmetik + kategori produk | - |
| `002_users_auth` | Profiles, KYC, trigger auth | cosmetics |
| `003_spots_world` | Spots, zones, NPC | profiles |
| `004_land_system` | Parcel, lease, sub-lease | spots, profiles |
| `005_booth_products` | Booth, produk, gambar | land_leases, profiles |
| `006_orders` | Orders, timeline, reviews | booths, profiles |
| `007_travel_system` | Travel pass, lokasi | spots, profiles |
| `008_advertisements` | Ad slots, iklan, analytics | spots, profiles |
| `009_sawer` | Transaksi sawer/tip | spots, profiles |
| `010_gamification` | Quests, achievements, dungeons | profiles, cosmetics |
| `011_developer_ecosystem` | Modules, installs | profiles, spots |
| `012_moderation` | Reports, bans, auto-suspend | profiles |
| `013_notifications_analytics` | Notif, spot analytics | semua tabel |
| `014_indexes` | Performance indexes | semua tabel |
| `015_rls_policies` | RLS semua tabel | semua tabel |

---

## Keputusan Bisnis yang Dibaked-in

| # | Keputusan | Nilai | Lokasi |
|---|-----------|-------|--------|
| 1 | Platform fee transaksi | 5% | `orders.platform_fee_slv` + komentar |
| 2 | Travel fee default | 1 PERAK | `spots.travel_fee_slv DEFAULT 1` |
| 3 | Minimum sewa lahan | 3 hari | `land_leases.duration_days CHECK >= 3` |
| 4 | KYC wajib sewa | Phone verify | `check_phone_verified_for_lease()` |
| 5 | Max produk booth | 20 / 100 | `check_product_limit()` function |
| 6 | Sawer currency MVP | BERLIAN | `sawer_transactions.amount_dia` |
| 7 | Dungeon reward | Rank-based | `distribute_dungeon_rewards()` |
| 8 | Escrow duration | 3 hari | `orders.escrow_release_at = NOW() + 3d` |

---

## Environment Variables yang Dibutuhkan

Di Galantara API server (`.env`):
```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=...       # untuk client browser
SUPABASE_SERVICE_KEY=...    # untuk server/API (bypass RLS)

BANK_TIRANYX_API_URL=http://localhost:3001
BANK_TIRANYX_API_KEY=...    # internal API key
```

**PENTING:** `SUPABASE_SERVICE_KEY` TIDAK BOLEH di-expose ke browser.
Semua operasi yang butuh bypass RLS harus lewat Galantara API server.

---

## Aturan Emas (Wajib Diingat)

```
Browser → Galantara API → Supabase (game data)
Browser → Galantara API → bank-tiranyx (financial data)

DILARANG: Browser → bank-tiranyx (langsung)
DILARANG: Browser → Supabase (untuk data keuangan)
```
