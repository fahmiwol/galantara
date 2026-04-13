# GALANTARA — Ideation & Vision Notes
> Tempat menampung semua ide yang belum siap jadi task tapi penting untuk dicatat.
> Ide bisa dipromosikan ke TODO.md atau dibuang kalau tidak relevan.
> Update terakhir: **2026-04-13**

---

## Visi Inti (Tidak Boleh Berubah)

> **"Orang Indonesia yang nongkrong, ketawa, beli-beli, dan saling kenal — sekarang bisa dilakukan dari mana saja."**

Galantara = digitalisasi budaya berkumpul Indonesia.
Bukan metaverse. Bukan marketplace. Tapi **pasar malam digital yang hidup**.

### 5 Core Differentiation (Jangan Dikorbankan)
1. **Hyperlocal Map** — Indonesia nyata, bukan fantasy world
2. **Radius System** — Trust layer. Seller verified benar-benar ada di lokasi
3. **Object With Logic ("Jiwa")** — Programmable world, bukan sekadar dekorasi
4. **Open Ecosystem** — Roblox + WordPress hybrid. Siapapun bisa build & jual
5. **Social First** — Orang nongkrong dulu, baru aktivitas

---

## Ide Mekanik Game

### Ekonomi Kelangkaan Lahan
- Lahan di Spot terbatas by design → nilai pasar terbentuk organik
- Grid petak: Lapak 1×1, Booth 2×2, Gedung 3×3, Landmark 5×5
- Bisa subletting: sewa 3×3, sewakan sebagian ke orang lain
- Lahan premium = posisi dekat spawn point atau warp portal
- **Implikasi:** Spot yang populer akan punya "harga tanah" virtual yang tinggi

### Tourist System (Travel Fee)
- User di luar radius fisik Spot → status "Tourist" (badge koper kuning)
- Tourist BISA: beli, chat, nonton, sawer, main game
- Tourist TIDAK BISA: buka toko, COD, jadi Merchant Verified
- **Kenapa ini powerful:** merchant lokal Bogor bisa dapat pembeli dari Surabaya tanpa kehilangan trust signal

### Dungeon FOMO Mechanic
- Dungeon muncul tiba-tiba, tidak diumumkan → notif push ke user yang pernah ke Spot itu
- Timer terbatas → pressure untuk masuk sekarang
- Setelah timer habis: portal dungeon muncul secara fisik di world (bukan sekadar UI)
- Boss dungeon = spawn khusus yang bisa di-loot semua player yang ada
- Reward bisa brand-sponsored (voucher fisik, kode promo, dll)
- **Masa depan:** dungeon bisa dibuat oleh developer komunitas

### Konser Hybrid (Killer Feature)
- Band/DJ live perform dari studio/rumah
- Stage virtual di Spot — embed stream di atas avatar performer
- Avatar penonton berkumpul di depan stage (bukan angka viewer abstrak)
- Sawer pakai Mighan — animasi koin beterbangan dari penonton ke performer
- Pin merchandise di booth, bisa dibeli dari dalam world selama konser
- **Ini adalah cara Galantara masuk ke pasar hiburan/event yang existing**

### IRL Bridge (Paling Diferensiasi)
- QR fisik di warung/toko/event → scan → unlock konten eksklusif di Spot virtual
- Dungeon treasure hunt: clue di game + clue di lokasi fisik sebenarnya
- Voucher dari quest → bisa ditukar di toko fisik
- COD: mulai di virtual, selesai di fisik dengan kode unik sesi
- **Ini yang membuat Galantara bukan sekadar game — ia bridge digital dan fisik**

---

## Ide Teknis

### Arsitektur "Jiwa" Object
Object "Jiwa" = model 3D + `handler.js` yang dijalankan saat interaksi.
```
model.glb       ← tampilan 3D, sama untuk semua instance
handler.js      ← "jiwa" — berbeda per instance
meta.json       ← config: type, permissions, rules
```
Contoh handler.js untuk "pintu tiket":
```js
export default {
  onApproach(ctx) {
    ctx.ui.showPrompt("Masuk? Butuh 1 tiket.");
  },
  onInteract(ctx) {
    if (ctx.player.hasItem("tiket-event-x")) {
      ctx.object.open();
      ctx.ui.toast("Selamat datang!");
    } else {
      ctx.ui.toast("Kamu tidak punya tiket.");
    }
  }
};
```
- handler.js max 3 detik, non-blocking (sandboxed)
- Mirip smart contract tapi untuk dunia game
- Ini yang membedakan Galantara dari game sandbox biasa

### Instance Architecture (Scalability)
- Setiap Spot = Socket.io room terpisah
- Spot besar bisa di-shard: Monas_A, Monas_B (max N player per shard)
- Oola = selalu tersedia, multiple shards
- Dungeon = temporary room, auto-destroy setelah selesai
- Implementasi awal: single room per Spot (cukup untuk MVP)

### NPC AI Evolution
- Saat ini: dialog tree statis (hardcoded)
- Sprint 5-6: dialog tree dari JSON config
- Sprint 8+: Claude API powered dialog (contextual, personalized)
- NPC bisa "tahu" siapa player (nama, sudah berapa kali ketemu, quest status)
- NPC Merchant: tahu inventory, bisa recommend produk, nego harga
- **Long term:** NPC bisa di-"adopsi" oleh brand (Sponsored NPC)

### Radius System Technical (Belum Diimplementasi)
- GPS browser API → koordinat user
- Bandingkan dengan koordinat Spot (stored di Supabase)
- Radius default: 500m untuk Merchant Verified, 50km untuk Traveler (Tourist)
- IP fallback jika GPS ditolak (kurang akurat tapi tetap bisa verify kota)
- Privacy: koordinat user TIDAK disimpan, hanya status "dalam radius / luar radius"
- **Ini adalah trust layer yang paling penting untuk COD dan merchant local**

---

## Ide Bisnis & Monetisasi

### Revenue Stack (Multi-Layer)
| Stream | Mekanisme | Est. % Revenue |
|--------|-----------|----------------|
| Travel Fee | Bayar Perak untuk akses Spot luar radius | ~35% |
| Sewa Lahan | Grid per petak per durasi | ~25% |
| Transaksi Cut | 2-5% dari setiap jual-beli | ~20% |
| Modul Marketplace | 30% dari penjualan modul dev | ~10% |
| Sawer Cut | Sedikit dari setiap tip performer | ~5% |
| Kosmetik Avatar | Outfit, aksesoris, efek khusus | ~3% |
| Iklan & Sponsorship | Billboard, NPC, Dungeon, Quest | ~2% |

### Flywheel Growth
```
Developer build modul → Spot lebih kaya fitur
  → User lebih banyak datang
    → Lahan lebih berharga
      → Merchant mau bayar lebih
        → Platform punya budget → hire developer
          → Developer build lebih banyak modul ↩
```

### Pricing Psikologi
- Jangan sebut "bayar" — sebut "tukar Perak"
- Top-up dalam bundle: Rp 50k = 5 Perak (bukan satu-satu)
- Berlian = engagement coin (tidak bisa diuangkan) → gamification loop
- First top-up bonus: double Perak untuk top-up pertama

### Partnership Target (Jangka Panjang)
- **Tokopedia/Shopee**: integrasi toko ke booth Galantara
- **Gojek/Grab**: transportasi COD terverifikasi
- **Hotel/Airbnb**: booking dari dalam Spot pariwisata
- **Event organizer**: mirror event fisik ke virtual
- **Bank/dompet digital**: top-up langsung dari app

---

## Ide UX / Product

### Onboarding Zero Friction
- User buka Galantara → langsung masuk Oola sebagai tamu (NO popup, NO login modal)
- Bisa jalan-jalan, lihat-lihat, ngobrol dengan NPC
- Login hanya diminta saat user mau melakukan sesuatu yang perlu identitas
- First action motivator: "Klaim nama avatarmu sebelum orang lain ambil"
- **Referensi:** Animal Crossing (langsung main, tutorial inline) bukan MMORPG (tutorial panjang sebelum game)

### Retention Mechanics
- Quest harian: sederhana, repeatable, rewarding Berlian
- "Hari ini ada apa di Spot kamu?" — notif push terjadwal (08.00 & 19.00)
- Dungeon surprise: FOMO mechanic terbukti di game
- Merchant baru: notif ke user yang pernah ke Spot itu
- "Teman kamu lagi di Monas" — social presence notification
- Achievement badge di profile: "Traveler 100 Spot", "Merchant Platinum", dll

### Social Features Priority (dari HIGH ke LOW)
1. Proximity text chat — ✅ Done
2. Proximity voice — ✅ Code ready
3. Global chat per Spot
4. Private DM
5. Group/party system
6. Friend list + status
7. Profile visit (lihat inventory/achievement orang lain)

### Aksesibilitas
- Keyboard-first navigation (penting untuk power user)
- Colorblind mode (ganti palette warna)
- Text size adjustment
- Low-performance mode (kurangi particle, shadow, dll) untuk HP kentang

---

## Referensi & Inspirasi

### Game References
| Game | Yang Kita Ambil |
|------|----------------|
| **Stardew Valley** | Gameplay loop yang nagih, ritme harian |
| **Animal Crossing** | Ekspresi, dekorasi, social pasif, zero-friction onboarding |
| **Palia** | Social aktif real-time, NPC relationship |
| **Dreamlight Valley** | Retention via relationship + progression |
| **Gather Town** | Proximity interaction model |
| **Roblox** | Open ecosystem, developer marketplace |
| **mIRC** | Chat culture, proximity intimacy |

### Open Source Tech yang Relevan
| Library | Kegunaan | Priority |
|---------|----------|----------|
| `three-mesh-ui` | 3D UI nametag, menu dalam world | Sprint 6 |
| `gltf-avatar-threejs` | Skeleton + skin swap system | Sprint 6-7 |
| `Theatre.js` | Animation choreography untuk cinematic | Sprint 8+ |
| `Spline` | Asset 3D cute untuk import | Ongoing |

---

## Pertanyaan yang Belum Dijawab

1. Apa batas maksimum player per Spot instance? (50? 100? 200?)
2. Apakah dungeon bisa masuk bersama (party) atau selalu solo?
3. Berapa harga travel fee awal (Perak)? Apakah flat atau variable per jarak?
4. Apakah ada "Spot Nasional" yang bisa diakses free tanpa travel fee? (misal: Oola)
5. Bagaimana mekanisme KYC merchant? (untuk verifikasi radius fisik)
6. Apakah builder mode tersedia untuk semua user atau hanya yang subscribe?
7. Apakah SDK akan open source dari awal atau commercial dulu?

---

*Tambahkan ide baru di sini kapan saja. Tanda ⭐ = ide yang Fahmi sudah confirmed menarik.*
