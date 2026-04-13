# GALANTARA — Ekonomi Koin Mighan

> Referensi resmi sistem koin ekosistem Tiranyx / Galantara.
> Source of truth: `D:\Projects\tiranyx\docs\MIGHAN-COIN-ADR.md`

---

## 1. Empat Denominasi Koin

| Koin | Simbol | Nilai IDR | Fungsi Utama |
|------|--------|-----------|--------------|
| **Emas** | GLD | Rp 10.000 | SKU pembelian fitur/layanan. Bukan saldo spendable. |
| **Perak** | SLV | Rp 8.000 | Saldo pengeluaran user (bayar jasa, transaksi P2P) |
| **Perunggu** | BRZ | Rp 5.000 | Payout kontributor / tribe. **Withdrawable** ke rekening bank. |
| **Berlian** | DIA | Rp 0 (tidak dijual) | Hanya dari engagement (video, share, kuis, game). Reward only. |

---

## 2. Alur Top-Up (Emas → Perak)

```
User beli Emas (Rp 10.000)
        │
        ▼
Tiranyx mint 1 koin Emas → simpan di ledger
        │
        ▼
Sistem konversi: 1 Emas → 1 Perak (Rp 8.000 value)
        │
        ▼
User dapat saldo Perak = Rp 8.000
        │
        ▼
Tiranyx MARGIN TOP-UP = Rp 10.000 - Rp 8.000 = +Rp 2.000
```

---

## 3. Alur Transaksi (Perak → Perunggu)

```
User bayar kontributor: 1 Perak (Rp 8.000)
        │
        ▼
Sistem transfer: Perak user → burn
        │
        ▼
Kontributor dapat 1 Perunggu (Rp 5.000 value)
        │
        ▼
Tiranyx MARGIN TRANSAKSI = Rp 8.000 - Rp 5.000 = +Rp 3.000
```

---

## 4. Double Margin Model

| Event | User Bayar | Penerima Dapat | Tiranyx Margin |
|-------|-----------|----------------|----------------|
| Top-up | Rp 10.000 (cash) | Rp 8.000 (Perak) | **+Rp 2.000** |
| Transaksi | Rp 8.000 (Perak) | Rp 5.000 (Perunggu) | **+Rp 3.000** |
| **Total per siklus** | Rp 10.000 cash | Rp 5.000 Perunggu | **+Rp 5.000** |

---

## 5. Aturan Berlian

- **Cara dapat:** tonton video (reward per menit), share konten (viral bonus), ikut kuis, main game
- **Tidak bisa dibeli** dengan uang tunai
- **Tidak bisa dikonversi** ke Emas / Perak / Perunggu
- **Fungsi:** unlock fitur premium, boosting, badge eksklusif di platform

---

## 6. Aturan Konversi

| Arah | Diizinkan? |
|------|-----------|
| Emas → Perak | ✅ Ya (ratio 1:1) |
| Perak → Perunggu | ✅ Ya (ratio 1:1) |
| Emas → Perunggu | ✅ Ya (ratio 1:1) |
| Perunggu → Perak/Emas | ❌ Tidak |
| Perak → Emas | ❌ Tidak |
| Berlian → Apapun | ❌ Tidak |

**Minimum withdrawal Perunggu:** 10 koin = Rp 50.000

---

## 7. Identitas Koin (NFT-like)

Setiap koin punya identitas kriptografis unik:

```
identity_hash = SHA-256(coin_id + quran_ref + entropy + denomination + minted_at)
signature     = HMAC-SHA256(MINT_SECRET_KEY, identity_hash)
```

- `quran_ref` = index ayat Al-Quran acak format `QS_XXX_YYY` (dari 6.236 ayat)
- Bukan teks Arab — hanya index sebagai entropy seed
- Setiap koin unik dan tidak bisa dipalsukan tanpa `MINT_SECRET_KEY`

---

## 8. OJK Compliance Framing

> OJK melarang platform menyimpan "uang" pengguna tanpa izin PSP/EMoney.
> Solusi: Koin = **token utilitas / kredit layanan digital**, bukan uang elektronik.

- **Emas:** SKU digital (seperti beli in-app item)
- **Perak:** Balance kredit layanan (bukan deposit)
- **Perunggu:** Kredit kontributor (seperti honorarium digital)
- **Berlian:** Reward poin engagement (seperti loyalty points)

**Wajib konsultasi hukum OJK/BI sebelum go-live transaksi nyata.**

---

## 9. Arsitektur Komponen

```
┌─────────────────────────────────────────────┐
│              Tiranyx Platform               │
│  (tiranyx.co.id / galantara.io)             │
└──────────────────┬──────────────────────────┘
                   │ API calls
                   ▼
┌─────────────────────────────────────────────┐
│         Mighan Ledger Vault                 │
│   bank-tiranyx (Fastify + Prisma + PG)      │
│                                             │
│  Modules:                                   │
│  • mint     — cetak koin baru               │
│  • wallet   — saldo per user                │
│  • transfer — kirim koin antar wallet       │
│  • ledger   — audit trail semua transaksi   │
│  • supply   — batas maksimum per koin       │
│  • reward   — distribusi Berlian            │
│  • coin     — registry koin + identitas     │
└──────────────────┬──────────────────────────┘
                   │ internal only
                   ▼
┌─────────────────────────────────────────────┐
│           Mint Machine                      │
│  (internal service, never exposed to net)   │
│  SHA-256 identity + HMAC signature          │
└─────────────────────────────────────────────┘
```

---

## 10. Status Sprint (per April 2026)

| Sprint | Scope | Status |
|--------|-------|--------|
| Sprint 1 | Mint Machine (crypto identity, quran seed) | 🟡 Partial — lib/crypto.ts + quran.json ada |
| Sprint 2 | Ledger Vault (schema, routes) | 🟡 Partial — schema ada, routes belum lengkap |
| Sprint 3 | Public Wallet API | 🔴 Belum dimulai |
| Sprint 4 | Tiranyx/Galantara Integration | 🔴 Belum dimulai |

---

## 11. Dokumen Terkait

| Dokumen | Lokasi |
|---------|--------|
| ADR Coin (canonical) | `D:\Projects\tiranyx\docs\MIGHAN-COIN-ADR.md` |
| ADR Mint Machine | `D:\Projects\tiranyx\docs\MIGHAN-COIN-MINT-MACHINE-ADR.md` |
| Galantara Integration Plan | `D:\Projects\tiranyx\docs\GALANTARA-INTEGRATION.md` |
| Bank Backend Context | `D:\Projects\bank-tiranyx\CONTEXT.md` |
| Wallet Frontend Context | `D:\Projects\Dompet-tiranyx\CONTEXT.md` |
| Bank Source Code | `D:\Projects\bank-tiranyx\src\` |
