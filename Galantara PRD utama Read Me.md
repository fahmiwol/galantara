# GALANTARA - Master Product Requirements Document (PRD)

**Versi:** 4.0
**Terakhir diperbarui:** April 2026
**Domain:** galantara.io
**Status:** Active Development

---

## Daftar Isi

1. [BAB 1 - Visi & Positioning](#bab-1---visi--positioning)
2. [BAB 2 - Onboarding: Oola](#bab-2---onboarding-oola)
3. [BAB 3 - Galantara Spot System](#bab-3---galantara-spot-system)
4. [BAB 4 - Visual Style](#bab-4---visual-style)
5. [BAB 5 - Fitur User](#bab-5---fitur-user)
6. [BAB 6 - Ekonomi & Token (Mighan Coin)](#bab-6---ekonomi--token-mighan-coin)
7. [BAB 7 - Subdomain & URL Routing](#bab-7---subdomain--url-routing)
8. [BAB 8 - Asset & Programmable Object Standard](#bab-8---asset--programmable-object-standard)
9. [BAB 9 - Developer Ecosystem](#bab-9---developer-ecosystem)
10. [BAB 10 - Tech Stack](#bab-10---tech-stack)
11. [BAB 11 - Roadmap](#bab-11---roadmap)
12. [BAB 12 - Risiko & Mitigasi](#bab-12---risiko--mitigasi)
13. [BAB 13 - Open Questions](#bab-13---open-questions)
14. [BAB 14 - Changelog](#bab-14---changelog)

---

## BAB 1 - Visi & Positioning

### 1.1 Tagline

> Pasar Malam Digital Indonesia -- Tempat Nongkrong, Jualan, dan Main Bareng.

### 1.2 Definisi Platform

Galantara adalah **platform social-commerce hyperlocal berbasis peta Indonesia**. Galantara menggabungkan konsep:

- **Pasar malam digital** -- ruang jual-beli yang hidup dan ramai seperti pasar malam sesungguhnya
- **Tongkrongan virtual** -- tempat berkumpul, ngobrol, dan bersosialisasi secara real-time
- **Live commerce** -- jual-beli interaktif dengan live streaming dan sawer
- **Open developer ecosystem** -- ekosistem terbuka di mana developer bisa membangun modul, objek, dan integrasi

Galantara bukan metaverse berat. Galantara adalah **dunia ringan, playful, dan accessible** yang berjalan di browser tanpa perlu download apapun.

### 1.3 Referensi Platform

| Referensi | Elemen yang Diambil |
|---|---|
| **Gather Town** | Konsep ruangan virtual berbasis grid, proximity chat |
| **Roblox** | User-generated content, developer revenue share, virtual economy |
| **WordPress Plugin Store** | Ekosistem modul/plugin yang bisa dipasang oleh siapa saja |
| **Zapier** | Integrasi antar-layanan, automation triggers |
| **Decentraland** | Konsep lahan virtual, kepemilikan Spot |
| **mIRC** | Chat room culture Indonesia, budaya tongkrongan digital era 2000-an |
| **Spline.design** | Aesthetic 3D ringan, soft & bubbly, semi-cartoon |

### 1.4 User Types

| Role | Deskripsi | Akses |
|---|---|---|
| **Guest** | Pengunjung tanpa akun. Bisa jalan-jalan, lihat-lihat. | Read-only, tidak bisa chat/transaksi |
| **Lokal Resident** | User terdaftar. Warga Galantara. | Chat, beli, ikut event, kustomisasi avatar |
| **Tourist** | User yang sedang mengunjungi Spot di luar area asalnya. | Sama seperti Resident tapi di luar zona domisili |
| **Merchant Verified** | Pedagang terverifikasi. Bisa buka booth dan jual produk. | Buka toko, terima pembayaran, listing produk |
| **Developer / Kontributor** | Pembuat modul, objek, dan integrasi. | Akses Developer Hub, submit modul, revenue share |
| **Spot Owner** | Pemilik lahan/ruang virtual (Spot). | Kelola Spot, atur akses, pasang modul |
| **Admin** | Administrator platform. | Full access, moderasi, world editing |

### 1.5 Positioning Statement

Galantara bukan game. Galantara bukan metaverse berat. Galantara adalah **ruang digital yang merepresentasikan budaya berkumpul Indonesia** -- dari ngobrol di warung kopi, belanja di pasar malam, sampai nongkrong di pinggir jalan. Semua dikemas dalam pengalaman visual 3D ringan yang bisa diakses siapa saja lewat browser.

---

## BAB 2 - Onboarding: Oola

### 2.1 Apa Itu Oola

Oola adalah **hub dunia pertama** di Galantara. Ini adalah tempat pertama yang dilihat setiap user saat pertama kali masuk. Oola berbentuk **pulau melayang bergaya surga** -- penuh warna pastel, pohon-pohon fantasi, dan suasana tenang tapi hidup.

Oola bukan sekadar tutorial zone. Oola adalah **pusat orientasi, social hub, dan gerbang menuju seluruh peta Indonesia** di Galantara.

### 2.2 Zona-Zona di Oola

| Zona | Fungsi | Detail Visual |
|---|---|---|
| **Pohon Ungu + Halo** | Landmark utama Oola. Titik spawn default. | Pohon besar berwarna ungu dengan lingkaran halo bercahaya di atasnya. Menjadi pusat visual pulau. |
| **Warp Portal** | Gerbang menuju peta Indonesia. Portal ini membuka akses ke semua kota/daerah. | Portal berbentuk lingkaran bercahaya. Klik untuk membuka peta Indonesia dan memilih destinasi. |
| **Papan Informasi** | Pengumuman, event terbaru, update platform. | Billboard digital bergaya kayu dengan layar hologram. |
| **Kotak Saran** | Feedback dari user. | Kotak surat bergaya vintage. Klik untuk buka form feedback. |
| **Developer Hub** | Portal untuk developer. Akses dokumentasi, submit modul, lihat statistik. | Bangunan kecil bergaya workshop/lab dengan papan "DEV HUB". |
| **Contributor Office** | Untuk kontributor konten, translator, moderator. | Kantor kecil bergaya co-working space. |
| **Bangku & Taman** | Area sosial. Duduk, ngobrol, proximity chat. | Bangku-bangku taman, rumput, bunga-bunga soft color. |

### 2.3 Login Gate System

Galantara menerapkan prinsip **"Guest Jalan Bebas"**:

- **Guest bisa langsung masuk** tanpa login. Bisa jalan-jalan, lihat-lihat, eksplorasi Oola.
- **Bottom bar** selalu menampilkan pesan: _"Login untuk fitur lengkap"_ dengan tombol login yang tidak mengganggu.
- **Modal login hanya muncul** saat user mencoba melakukan aksi yang membutuhkan akun:
  - Mengirim chat
  - Membeli produk
  - Masuk ke Spot private
  - Kustomisasi avatar
  - Ikut event/quest
- **Tidak ada forced login wall.** User tidak pernah dipaksa login hanya untuk melihat dunia.

### 2.4 Camera System

Sistem kamera Galantara menggunakan **spherical coordinate system** dengan spesifikasi:

| Parameter | Nilai | Keterangan |
|---|---|---|
| **Theta (horizontal rotation)** | 0 - 360 derajat | Rotasi penuh 360 derajat secara horizontal |
| **Phi (vertical tilt)** | Clamped 18 - 76 derajat | Dibatasi agar kamera tidak bisa melihat terlalu atas atau terlalu bawah |
| **Movement** | Relatif terhadap arah kamera | Karakter bergerak mengikuti arah pandang kamera, bukan arah absolut |
| **Camera Lerp (position)** | 0.18 | Smooth follow untuk posisi kamera |
| **Camera Lerp (rotation)** | 0.10 | Smooth follow untuk rotasi kamera |
| **scene.traverse** | DILARANG | Tidak boleh menggunakan scene.traverse untuk performa. Gunakan referensi langsung. |

**Alasan desain kamera:**
- Phi clamped mencegah user melihat "bawah peta" atau "atas langit" yang merusak imersi
- Lerp yang berbeda antara posisi dan rotasi memberikan kesan kamera yang "hidup"
- Larangan scene.traverse memastikan performa tetap stabil meskipun scene kompleks

---

## BAB 3 - Galantara Spot System

### 3.1 Apa Itu Spot

**Galantara Spot** adalah unit ruang virtual di dalam dunia Galantara. Spot bisa berupa toko, rumah, venue event, ruang meeting, dungeon, atau apapun yang bisa dibayangkan. Setiap Spot menempati area tertentu di grid peta.

### 3.2 Tipe Spot

| Tipe | Deskripsi | Visibilitas | Contoh Penggunaan |
|---|---|---|---|
| **Public Spot** | Spot terbuka untuk semua orang. | Terlihat di peta, bisa dimasuki siapa saja | Taman kota, alun-alun, area publik |
| **Private Spot** | Spot dengan akses terbatas. | Terlihat di peta tapi butuh izin masuk | Toko premium, ruang meeting, VIP lounge |
| **Dungeon** | Spot sementara/event-based. Muncul dan hilang sesuai jadwal. | Hanya muncul saat aktif | Event flash sale, boss fight, treasure hunt |
| **Oola** | Hub utama. Satu-satunya. | Selalu terlihat, selalu aktif | Onboarding, social hub, portal |

### 3.3 Grid System

- Satuan dasar: **1x1 unit grid**
- Oola berukuran: **36x36 unit**
- Setiap Spot menempati area grid sesuai ukurannya

### 3.4 Ukuran Spot

| Ukuran | Grid | Penggunaan Umum |
|---|---|---|
| **Booth** | 2x2 | Lapak kecil, stand jualan, booth event |
| **Gedung** | 3x3 | Toko menengah, kantor, studio |
| **Landmark** | 5x5 | Bangunan besar, venue event, monument |

### 3.5 Mekanisme Akses Private Spot

| Metode Akses | Cara Kerja |
|---|---|
| **Open Link** | Siapa saja dengan link bisa masuk |
| **Kode Undangan** | Masukkan kode unik untuk akses |
| **Whitelist** | Hanya user yang ada di daftar yang bisa masuk |
| **Token Gated** | Harus memiliki sejumlah Mighan Coin tertentu |
| **Password** | Masukkan password untuk akses |

---

## BAB 4 - Visual Style

### 4.1 Aesthetic Direction

Galantara mengusung gaya visual:

- **Soft** -- Warna-warna lembut, tidak harsh
- **Bubbly** -- Bentuk-bentuk bulat, rounded edges
- **Playful** -- Menyenangkan, tidak serius
- **Low Poly** -- Geometri sederhana, bukan photorealistic
- **Semi-3D** -- 3D tapi dengan kesan 2.5D/isometric di beberapa elemen
- **Chibi** -- Karakter dengan proporsi chibi (kepala besar, badan kecil)

**Referensi utama:** Spline.design -- clean, smooth, soft 3D dengan warna-warna pastel.

### 4.2 Spot Theme per Kota

Setiap kota/daerah di Galantara memiliki tema warna dan suasana yang merepresentasikan identitas lokalnya:

| Kota/Area | Warna Primer | Warna Sekunder | Warna Aksen | Suasana |
|---|---|---|---|---|
| **Oola** | Putih | Emas | Lavender | Surgawi, tenang, fantasi |
| **Monas (Jakarta)** | Hijau | Putih | Emas | Metropolitan, monumental |
| **Kuta (Bali)** | Oranye | Biru | Krem | Pantai, tropis, santai |
| **Malioboro (Yogyakarta)** | Batik Amber | Ungu | -- | Tradisional, batik, keraton |
| **Braga (Bandung)** | Abu-biru | Teal | Coral | Art deco, kafe, kreatif |
| **Losari (Makassar)** | Merah-oranye | Biru Navy | -- | Sunset, pelabuhan, maritim |

### 4.3 Panduan Material

- Gunakan **PBR material** dengan roughness tinggi (matte look)
- Hindari refleksi tajam dan glossy berlebihan
- Warna environment lighting: warm tone (sore hari default)
- Shadow: soft shadow, tidak terlalu tajam
- Outline/stroke pada objek: opsional, gunakan untuk highlight interaktif

---

## BAB 5 - Fitur User

### 5.1 Chat System

#### 5.1.1 Text Bubble Chat
- Pesan muncul sebagai **bubble di atas kepala karakter**
- Bubble menghilang setelah beberapa detik
- Warna bubble bisa dikustomisasi (premium feature)

#### 5.1.2 Call Out
- Pesan yang lebih besar dan mencolok
- Digunakan untuk pengumuman atau teriakan
- Radius jangkauan lebih luas dari text bubble biasa
- Memerlukan cooldown untuk mencegah spam

#### 5.1.3 Proximity Voice Chat
- Voice chat yang hanya terdengar berdasarkan jarak
- Semakin dekat, semakin jelas suaranya
- Semakin jauh, volume menurun sampai tidak terdengar
- Menggunakan **LiveKit** sebagai backend voice

#### 5.1.4 Private Message (PM)
- Chat pribadi 1-on-1
- Bisa kirim teks, emoji, dan sticker
- History tersimpan selama 30 hari
- Notifikasi push jika user offline

### 5.2 Toko & COD (Cash on Delivery)

#### 5.2.1 Booth System
- Merchant membuka booth di Spot yang disewa
- Booth menampilkan produk dalam format 3D atau card
- Klik produk untuk lihat detail, harga, dan review

#### 5.2.2 Radius Verification
- Untuk COD, sistem memverifikasi bahwa **buyer dan seller berada dalam radius yang reasonable**
- Radius default: configurable per kota
- Jika di luar radius, opsi kirim via kurir otomatis ditawarkan

#### 5.2.3 Rating System
- Buyer bisa memberi rating 1-5 bintang setelah transaksi selesai
- Review text opsional
- Rating ditampilkan di profil Merchant dan booth

#### 5.2.4 Penalti Cancel
- Cancel setelah deal: penalti berupa penurunan trust score
- 3x cancel berturut-turut: temporary ban dari fitur COD (7 hari)
- Merchant dengan cancel rate tinggi: badge peringatan di profil

### 5.3 Jasa & Negosiasi

#### 5.3.1 Offer Card
- Penyedia jasa membuat **Offer Card** yang menampilkan:
  - Deskripsi jasa
  - Range harga
  - Estimasi waktu
  - Portfolio/contoh kerja
- Buyer bisa langsung negosiasi via Offer Card

#### 5.3.2 Reveal Lokasi (Opt-in)
- Lokasi asli penyedia jasa **hanya terungkap jika kedua belah pihak setuju**
- Prinsip: **privacy by design**
- Reveal lokasi menggunakan sistem opt-in mutual consent

#### 5.3.3 Kode Unik Sesi
- Setiap sesi negosiasi/transaksi mendapat **kode unik**
- Kode ini digunakan untuk referensi jika ada dispute
- Format: `GTR-[KOTA]-[TIMESTAMP]-[RANDOM]`

### 5.4 Live Show & Sawer

#### 5.4.1 Embed Live Stream
- Spot bisa embed live stream dari:
  - TikTok Live
  - YouTube Live
  - Twitch
- Embed muncul sebagai layar virtual di dalam Spot
- Penonton di Spot bisa menonton bersama

#### 5.4.2 Sawer System
- Penonton bisa memberi **sawer** (tip) menggunakan Mighan Coin
- Setiap sawer memicu **animasi spesial** di layar:
  - PERUNGGU: animasi kecil (confetti)
  - PERAK: animasi sedang (kembang api)
  - EMAS: animasi besar (efek hujan emas)
  - BERLIAN: animasi legendaris (efek spesial unik)
- Sawer terlihat oleh semua penonton di Spot

#### 5.4.3 Live Shopping
- Merchant bisa melakukan live selling di dalam Spot
- Produk muncul sebagai overlay di live stream
- Penonton bisa langsung klik dan beli tanpa keluar dari live

### 5.5 Gimmick, Quest & Challenge

#### 5.5.1 Daily Challenge
- Setiap hari ada challenge baru untuk user
- Contoh: "Kunjungi 3 Spot baru hari ini", "Chat dengan 5 orang"
- Reward: Mighan Coin (BERLIAN)

#### 5.5.2 QR Lokasi Fisik
- Merchant dunia nyata bisa memasang **QR code fisik** di toko mereka
- Scan QR memberikan reward di Galantara
- Bridge antara dunia fisik dan virtual

#### 5.5.3 Dungeon FOMO
- Dungeon muncul secara terbatas (waktu dan kuota)
- "Dungeon ini hanya tersedia 2 jam! Slot tersisa: 15/50"
- Mendorong urgency dan engagement

#### 5.5.4 Rewards
- Semua quest/challenge memberikan reward berupa:
  - Mighan Coin (BERLIAN untuk engagement)
  - Item kosmetik eksklusif
  - Badge/achievement
  - XP untuk leveling

### 5.6 Mini Games

| Game | Tipe | Jumlah Pemain | Deskripsi |
|---|---|---|---|
| **Catur** | Strategy | 2 | Catur klasik dengan timer |
| **Ludo** | Board Game | 2-4 | Ludo klasik, bisa taruhan Mighan Coin |
| **Tebak Kata** | Trivia | 2-10 | Tebak kata dari hint, giliran per player |
| **Impostor** | Social Deduction | 4-10 | Among Us style, temukan penipu di antara warga |
| **Fighting** | Action | 2 | Street fighter ringan, chibi style |

- Semua mini game bisa dimainkan di Spot manapun yang memasang modul game
- Optional: taruhan Mighan Coin (PERAK) dengan persetujuan kedua belah pihak
- Leaderboard global dan per-kota

---

## BAB 6 - Ekonomi & Token (Mighan Coin)

### 6.1 Sistem Mighan Coin

Mighan Coin adalah mata uang internal Galantara. **Non-blockchain, pure internal ledger** menggunakan PostgreSQL.

| Tier Koin | Simbol | Fungsi | Cara Mendapatkan |
|---|---|---|---|
| **EMAS** | Koin Emas | Top-up currency. Dibeli dengan uang asli. | Top-up via payment gateway (Midtrans/Xendit) |
| **PERAK** | Koin Perak | Spending currency. Digunakan untuk transaksi. | Konversi dari EMAS, reward dari aktivitas |
| **PERUNGGU** | Koin Perunggu | Fee currency. Digunakan untuk biaya platform. | Dipotong otomatis dari transaksi |
| **BERLIAN** | Berlian | Engagement currency. Reward dari aktivitas. | Daily login, quest, challenge, kontribusi |

### 6.2 Konversi Antar Tier

```
EMAS --> PERAK (rate ditentukan platform, misal 1 EMAS = 100 PERAK)
PERAK --> digunakan untuk transaksi
PERUNGGU --> dipotong otomatis sebagai fee dari setiap transaksi PERAK
BERLIAN --> tidak bisa dikonversi ke tier lain (engagement only)
```

### 6.3 Ledger System

- Semua transaksi dicatat dalam **Ledger Vault** (PostgreSQL)
- Setiap entri memiliki: `user_id`, `coin_type`, `amount`, `direction` (credit/debit), `reference`, `timestamp`
- Double-entry bookkeeping: setiap transaksi selalu memiliki pasangan debit-credit
- Audit trail lengkap, tidak ada transaksi yang bisa dihapus

### 6.4 Revenue Model

| Sumber Revenue | Persentase dari Total Target | Deskripsi |
|---|---|---|
| **Travel Fee** | 35% | Biaya teleportasi/warp antar kota. Fee dalam PERUNGGU. |
| **Sewa Lahan (Spot Rent)** | 25% | Biaya sewa Spot per periode. Bulanan/tahunan. |
| **Fee Transaksi** | 15% | Potongan dari setiap transaksi jual-beli di platform. |
| **Marketplace Cut** | 10% | Komisi dari penjualan modul/asset di marketplace developer. |
| **Avatar & Cosmetics** | 8% | Penjualan item kosmetik: skin, outfit, efek, emote. |
| **Iklan (Sponsored Spot)** | 5% | Billboard virtual, sponsored placement, featured Spot. |
| **Sawer Cut** | 2% | Potongan dari setiap sawer/tip di live show. |

---

## BAB 7 - Subdomain & URL Routing

### 7.1 Subdomain Architecture

| Subdomain | Fungsi | Akses |
|---|---|---|
| **galantara.io** | Main game/platform. Entry point utama. | Public |
| **adm.galantara.io** | Admin dashboard. Moderasi, analytics, user management. | Admin only |
| **god.galantara.io** | World editor. Tool untuk membangun dan mengatur dunia. | Admin & World Builders |
| **vip.galantara.io** | Akses Private Spot via browser langsung. | User dengan akses |
| **dev.galantara.io** | Developer portal. Dokumentasi, SDK, submit modul. | Developer |
| **api.galantara.io** | API documentation (Swagger/OpenAPI). | Developer |
| **sandbox.galantara.io** | Environment testing untuk developer. | Developer |
| **status.galantara.io** | Status page. Uptime monitoring. | Public |

### 7.2 URL Routes

#### Game Routes
| Route | Fungsi |
|---|---|
| `/spot/[slug]` | Masuk ke Spot tertentu berdasarkan slug |
| `/dungeon/[id]` | Masuk ke Dungeon aktif |
| `/room/[name]` | Masuk ke room/ruangan di dalam Spot |
| `/join/[kode]` | Join via kode undangan |
| `/live/[username]` | Tonton live stream user tertentu |

#### Landing & SEO Routes
| Route | Fungsi | SEO |
|---|---|---|
| `/tentang` | Halaman tentang Galantara | Meta title, description, OG tags |
| `/fitur` | Daftar fitur platform | Structured data, feature list |
| `/harga` | Pricing Mighan Coin & langganan | Pricing schema markup |
| `/blog` | Blog/artikel | Article schema, sitemap |
| `/faq` | Frequently Asked Questions | FAQ schema markup |
| `/privacy` | Kebijakan privasi | Legal page, noindex optional |
| `/terms` | Syarat dan ketentuan | Legal page, noindex optional |

#### SEO Requirements (Semua Halaman)
- Meta title unik per halaman (max 60 karakter)
- Meta description unik (max 160 karakter)
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card meta tags
- Canonical URL
- Structured data (JSON-LD) sesuai tipe halaman
- Sitemap.xml otomatis
- Robots.txt yang dikonfigurasi

### 7.3 API Tiers

| Tier | Rate Limit | Fitur | Harga |
|---|---|---|---|
| **Free** | 100 request/hari | Read-only endpoints, basic data | Gratis |
| **Starter** | 10.000 request/hari | Read + Write, webhooks | Rp 99.000/bulan |
| **Growth** | 100.000 request/hari | Full API, priority support, analytics | Rp 499.000/bulan |
| **Enterprise** | Custom | Unlimited, SLA, dedicated support | Custom pricing |

---

## BAB 8 - Asset & Programmable Object Standard

### 8.1 Dual Layer Architecture

Setiap asset/objek di Galantara memiliki **dua layer**:

```
+--------------------------+
|    MODEL LAYER (.glb)    |  <-- Visual: 3D model, texture, animation
+--------------------------+
|  LOGIC LAYER             |
|  - manifest.json         |  <-- Metadata: nama, tipe, config
|  - handler.js            |  <-- Behavior: interaksi, logika, event
+--------------------------+
```

**Model Layer** = File `.glb` (glTF Binary). Berisi mesh, material, texture, dan animasi.
**Logic Layer** = `manifest.json` (metadata + konfigurasi) + `handler.js` (kode behavior).

### 8.2 Object Types

| Tipe | Deskripsi | Contoh |
|---|---|---|
| **Shell** | Objek dekoratif, tidak ada interaksi. | Pohon, batu, kursi, lampu |
| **Interactive Shell** | Objek dengan interaksi sederhana. | Pintu yang bisa dibuka, lampu yang bisa dinyalakan |
| **Gated** | Objek yang memerlukan kondisi untuk diakses. | Pintu VIP (butuh token), chest (butuh key) |
| **Commerce** | Objek yang terkait transaksi. | Vending machine, booth display, ATM Mighan |
| **Game** | Objek mini game. | Papan catur, mesin arcade, arena fighting |
| **Integration** | Objek yang terhubung ke layanan eksternal. | Layar YouTube, widget cuaca, feed sosmed |
| **Utility** | Objek fungsional untuk Spot management. | Teleporter, spawn point, boundary wall |

### 8.3 Folder Structure

```
galantara-asset/
  ├── model/
  │   ├── object.glb           # 3D model utama
  │   └── object_lod1.glb      # LOD variant (opsional)
  ├── thumbnail/
  │   └── preview.png           # Preview 512x512
  ├── logic/
  │   ├── manifest.json         # Metadata dan konfigurasi
  │   └── handler.js            # Kode behavior
  └── sounds/
      └── interact.mp3          # Sound effect (opsional)
```

### 8.4 Manifest.json Schema

```json
{
  "name": "Vending Machine Kopi",
  "version": "1.0.0",
  "type": "commerce",
  "author": "dev_username",
  "description": "Mesin kopi otomatis dengan 5 pilihan minuman",
  "size": "1x1",
  "interactions": ["click", "proximity"],
  "permissions": ["tokens.read", "tokens.debit", "notify"],
  "config": {
    "price_per_item": 10,
    "coin_type": "PERAK",
    "items": ["Kopi Hitam", "Latte", "Cappuccino", "Teh Manis", "Coklat"]
  }
}
```

### 8.5 SDK API Reference

| Namespace | Fungsi | Contoh |
|---|---|---|
| `galantara.user` | Akses info user yang berinteraksi | `galantara.user.getName()`, `galantara.user.getId()` |
| `galantara.tokens` | Operasi Mighan Coin | `galantara.tokens.getBalance("PERAK")`, `galantara.tokens.debit(10, "PERAK")` |
| `galantara.door` | Kontrol akses pintu/gate | `galantara.door.open()`, `galantara.door.requireToken("EMAS", 5)` |
| `galantara.notify` | Kirim notifikasi ke user | `galantara.notify.toast("Kopi siap!")`, `galantara.notify.sound("ding")` |
| `galantara.config` | Baca konfigurasi dari manifest | `galantara.config.get("price_per_item")` |
| `galantara.state` | State management per objek | `galantara.state.set("stock", 50)`, `galantara.state.get("stock")` |
| `galantara.http` | HTTP request ke API eksternal | `galantara.http.get("https://api.cuaca.com/jakarta")` |
| `galantara.on` | Event listener | `galantara.on("click", handler)`, `galantara.on("proximity", handler)` |

### 8.6 Event System (galantara.on)

```javascript
// Contoh handler.js untuk vending machine
galantara.on("click", async (user) => {
  const balance = await galantara.tokens.getBalance("PERAK");
  const price = galantara.config.get("price_per_item");

  if (balance >= price) {
    await galantara.tokens.debit(price, "PERAK");
    galantara.notify.toast("Kopi berhasil dibeli!");
    galantara.notify.sound("coin_ding");
    const stock = galantara.state.get("stock");
    galantara.state.set("stock", stock - 1);
  } else {
    galantara.notify.toast("Saldo PERAK tidak cukup!");
  }
});

galantara.on("proximity", (user) => {
  galantara.notify.toast("Mau kopi? Klik untuk beli!");
});
```

### 8.7 GLB Specifications

| Parameter | Batas | Keterangan |
|---|---|---|
| **File size** | Max 5 MB | Setelah kompresi Draco/meshopt |
| **Triangle count** | Max 10.000 tris | Per model |
| **Texture resolution** | Max 1024 x 1024 px | Per texture map |
| **Material** | PBR only | Metallic-Roughness workflow |
| **Origin** | Bottom center | Pivot point di tengah bawah model |
| **Format** | glTF Binary (.glb) | Tidak menerima .gltf terpisah |
| **Animation** | Max 3 clips | Idle, interact, loop |

### 8.8 LOD (Level of Detail) System

| LOD Level | Jarak dari Kamera | Triangle Budget | Texture |
|---|---|---|---|
| **LOD 0** | 0 - 10 unit | Full (10k tris) | 1024px |
| **LOD 1** | 10 - 30 unit | 50% (5k tris) | 512px |
| **LOD 2** | 30+ unit | 25% (2.5k tris) | 256px |
| **Culled** | Di luar frustum | Tidak dirender | -- |

### 8.9 Security & Sandbox

| Aspek | Batasan | Alasan |
|---|---|---|
| **Execution** | Isolated VM (Web Worker) | handler.js berjalan di sandbox terisolasi |
| **Timeout** | 3 detik max per eksekusi | Mencegah infinite loop dan blocking |
| **Memory** | 50 MB max per objek | Mencegah memory leak |
| **Network** | Hanya `galantara.http` | Tidak bisa akses DOM atau API browser lain |
| **Storage** | Hanya `galantara.state` | Tidak bisa akses localStorage/cookie |
| **Permissions** | Harus dideklarasi di manifest | User dikonfirmasi sebelum permission granted |

### 8.10 Submit Process

1. Developer membuat asset sesuai spesifikasi
2. Upload ke **dev.galantara.io** via Developer Portal
3. Automated validation:
   - GLB spec check (ukuran, tris count, texture)
   - Manifest schema validation
   - Handler.js security scan (banned API check)
   - Sandbox execution test
4. Review oleh tim (untuk modul yang memerlukan permission sensitif)
5. Publish ke Galantara Asset Marketplace
6. Spot Owner bisa install dari marketplace

---

## BAB 9 - Developer Ecosystem

### 9.1 Visi Ekosistem

Galantara Developer Ecosystem terinspirasi dari tiga platform:

- **Roblox** -- Developer membuat konten dan mendapatkan revenue share
- **WordPress** -- Ekosistem plugin/modul yang bisa dipasang siapa saja
- **Zapier** -- Integrasi dan automation antar-layanan

Tujuannya: **siapa saja bisa membuat, menjual, dan menghasilkan uang dari modul di Galantara**.

### 9.2 Tipe Kontributor

| Tipe | Deskripsi | Revenue Share |
|---|---|---|
| **Individual Developer** | Developer independen yang membuat modul. | **70%** dari penjualan modul |
| **Partner Developer** | Developer yang diverifikasi dan mendapat support ekstra. | 70% + bonus exposure di marketplace |
| **Enterprise Partner** | Perusahaan/brand yang membangun integrasi resmi. | Custom agreement |
| **Community Contributor** | Kontributor non-komersial: translator, bug reporter, moderator. | Reward dalam BERLIAN + badge |

### 9.3 Contoh Modul yang Bisa Dibangun

| Kategori | Contoh Modul |
|---|---|
| **Commerce** | Payment gateway widget, product display 3D, auction system |
| **Social** | Guestbook, voting booth, confession box, matchmaking |
| **Game** | Quiz engine, racing mini game, RPG battle system |
| **Integration** | Spotify now playing, Twitter feed, weather widget |
| **Utility** | Auto-greeter, visitor counter, teleporter network |
| **Visual** | Particle effect pack, skybox changer, lighting preset |
| **AI** | NPC chatbot, auto-translator, sentiment analyzer |

### 9.4 Developer Onboarding Flow

```
1. Register di dev.galantara.io
2. Baca dokumentasi + Getting Started Guide
3. Setup local development environment
4. Buat modul pertama (template tersedia)
5. Test di sandbox.galantara.io
6. Submit untuk review
7. Publish ke marketplace
8. Monitor analytics & revenue di developer dashboard
```

### 9.5 Developer Portal Features

- **Dokumentasi lengkap** dengan contoh kode
- **SDK playground** interaktif di browser
- **Template starter** untuk setiap tipe objek
- **Sandbox environment** untuk testing
- **Analytics dashboard** (install count, revenue, rating)
- **Community forum** untuk diskusi dan support
- **Bug tracker** untuk report issue
- **Revenue dashboard** dengan payout history

---

## BAB 10 - Tech Stack

### 10.1 Frontend

| Teknologi | Fungsi |
|---|---|
| **Three.js via React Three Fiber** | 3D rendering engine. R3F memberikan deklaratif API di atas Three.js. |
| **React** | UI framework untuk HUD, menu, dan overlay |
| **Zustand** | State management ringan |
| **Spline.design** | Referensi visual dan export beberapa asset |

### 10.2 3D & Avatar

| Teknologi | Fungsi |
|---|---|
| **Meshy AI** | AI-assisted 3D model generation untuk asset dan environment |
| **Ready Player Me** | Avatar system. User bisa buat avatar custom. |
| **Draco / Meshopt** | Kompresi GLB untuk file size kecil |

### 10.3 Real-time & Communication

| Teknologi | Fungsi |
|---|---|
| **Socket.io** | Real-time event untuk chat, movement, state sync |
| **LiveKit** | Voice chat dan video streaming infrastructure |

### 10.4 AI

| Teknologi | Fungsi |
|---|---|
| **Claude API (Anthropic)** | NPC AI -- NPC yang bisa ngobrol natural, membantu navigasi, menjawab pertanyaan |

### 10.5 Backend

| Teknologi | Fungsi |
|---|---|
| **Node.js + Fastify** | API server. Fastify dipilih karena performa lebih baik dari Express. |
| **PostgreSQL (via Supabase)** | Database utama. User data, transaksi, Spot data. |
| **Redis** | Caching, session, real-time state, rate limiting |
| **Cloudflare R2** | Object storage untuk asset 3D, gambar, dan file media |

### 10.6 Payment

| Teknologi | Fungsi |
|---|---|
| **Midtrans** | Payment gateway utama (transfer bank, e-wallet, QRIS) |
| **Xendit** | Payment gateway alternatif + disbursement untuk payout developer |

### 10.7 Auth

| Teknologi | Fungsi |
|---|---|
| **Supabase Auth** | Authentication. Email/password, Google OAuth, magic link. |

### 10.8 Hosting & Infrastructure

| Layer | Provider | Keterangan |
|---|---|---|
| **Frontend** | Vercel | Next.js deployment, CDN global, edge functions |
| **API Backend** | Railway | Container-based, auto-scaling, mudah deploy |
| **CDN & Storage** | Cloudflare R2 | S3-compatible, zero egress fee, global edge |
| **Database** | Supabase (hosted PostgreSQL) | Managed PostgreSQL + Realtime subscription |
| **Cache** | Redis (Railway atau Upstash) | Managed Redis untuk session dan caching |

---

## BAB 11 - Roadmap

### 11.1 Timeline Overview

```
[====] Prototype .................. DONE (Completed)
[----] V1 Beta .................... Month 1-2
[----] V2 Social .................. Month 3-4
[----] V3 Commerce ................ Month 5-6
[----] V4 Developer ............... Month 7-9
[----] V5 Scale ................... Month 10+
```

### 11.2 Detail per Phase

#### Prototype (COMPLETED)
- [x] Oola world rendering (Three.js + R3F)
- [x] Avatar movement dan camera system
- [x] Basic grid system
- [x] Login/register flow
- [x] Proof of concept: Spot enter/exit

#### V1 Beta (Month 1-2)
- [ ] Oola lengkap dengan semua zona
- [ ] Chat system (text bubble + PM)
- [ ] Avatar customization (Ready Player Me)
- [ ] 2-3 Spot template dasar
- [ ] Basic Mighan Coin (top-up + balance)
- [ ] Mobile responsive
- [ ] Peta Indonesia (Mapbox integration)

#### V2 Social (Month 3-4)
- [ ] Proximity voice chat (LiveKit)
- [ ] Friend system
- [ ] Daily challenge & quest
- [ ] Mini games (catur, ludo)
- [ ] Emote & expression system
- [ ] Notification system
- [ ] Profile & achievement page

#### V3 Commerce (Month 5-6)
- [ ] Merchant verification flow
- [ ] Booth system & product listing
- [ ] COD flow dengan radius verification
- [ ] Jasa & Offer Card
- [ ] Sawer system
- [ ] Live stream embed (TikTok/YT/Twitch)
- [ ] Transaction history & receipt
- [ ] Payment integration (Midtrans/Xendit)

#### V4 Developer (Month 7-9)
- [ ] Developer Portal (dev.galantara.io)
- [ ] SDK v1.0 release
- [ ] Asset submission & review pipeline
- [ ] Marketplace untuk modul
- [ ] Revenue share & payout system
- [ ] Sandbox environment
- [ ] API documentation (api.galantara.io)
- [ ] World editor tool (god.galantara.io)

#### V5 Scale (Month 10+)
- [ ] Multi-kota (Jakarta, Bali, Yogyakarta, Bandung, Makassar)
- [ ] Dungeon system
- [ ] QR lokasi fisik integration
- [ ] NPC AI (Claude API)
- [ ] Advanced analytics
- [ ] Enterprise API tier
- [ ] Native mobile app (React Native / wrapper)
- [ ] Localization (English, Bahasa daerah)

---

## BAB 12 - Risiko & Mitigasi

### 12.1 Empty World Problem

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dunia terasa kosong karena sedikit user aktif | User baru langsung pergi, churn tinggi | NPC AI yang bisa diajak ngobrol, event bot untuk simulasi aktivitas, focus traffic ke Oola dulu, konsentrasi user di satu area sebelum ekspansi |

### 12.2 Scam & Fraud

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Merchant menipu buyer, fake product, tidak kirim barang | Trust rusak, user kabur | Escrow system untuk transaksi besar, rating + review system, merchant verification wajib, penalti sistem untuk cancel/fraud, report mechanism |

### 12.3 Privacy Concerns

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Lokasi user bisa disalahgunakan, stalking | Masalah hukum, user tidak aman | Privacy by design, lokasi asli hanya terungkap via mutual opt-in, proxy location di peta (tidak presisi), clear privacy policy |

### 12.4 Modul Berbahaya

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Developer submit modul yang mengandung exploit atau malware | Security breach, data leak | Sandbox isolation (VM), permission system eksplisit, automated security scan, manual review untuk permission sensitif, 3 detik timeout |

### 12.5 Server Overload

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Terlalu banyak user atau event besar membuat server lag/crash | User experience buruk | Auto-scaling di Railway, CDN untuk static asset, Redis caching, load balancing, LOD system untuk rendering, instance limit per Spot |

### 12.6 Onboarding Friction

| Risiko | Dampak | Mitigasi |
|---|---|---|
| User baru bingung, tidak tahu harus ngapain | Bounce rate tinggi | Oola sebagai guided onboarding, NPC panduan, tooltip system, progressive disclosure (fitur muncul bertahap), guest mode tanpa login wall |

### 12.7 Regulasi Fintech

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Mighan Coin dianggap sebagai e-money oleh regulator (Bank Indonesia) | Harus punya lisensi e-money | Konsultasi legal sejak awal, posisikan Mighan Coin sebagai "poin loyalty" bukan e-money, non-blockchain, tidak bisa di-cashout (one-way top-up), monitor regulasi OJK dan BI |

---

## BAB 13 - Open Questions

Berikut adalah pertanyaan yang belum dijawab dan memerlukan keputusan lebih lanjut:

### 13.1 Travel Fee Pricing

- Berapa biaya travel (warp) antar kota?
- Apakah flat rate atau berdasarkan jarak?
- Apakah ada membership yang menghapus travel fee?
- Apakah travel fee berubah berdasarkan demand (surge pricing)?

### 13.2 Dungeon Schedule

- Seberapa sering Dungeon muncul?
- Apakah jadwal Dungeon ditentukan admin atau otomatis?
- Berapa lama durasi satu sesi Dungeon?
- Apakah Merchant bisa membuat Dungeon sendiri (sponsored Dungeon)?

### 13.3 Revenue Share Model

- Apakah 70% developer share sudah cukup menarik?
- Bagaimana mekanisme payout (threshold minimum, jadwal payout)?
- Apakah ada tier revenue share berdasarkan performa?
- Bagaimana penanganan refund yang berimplikasi pada revenue share?

### 13.4 Ojek / Delivery Integration

- Apakah akan integrasi dengan GoSend/GrabExpress untuk COD?
- Bagaimana cost structure-nya? Siapa yang bayar ongkir?
- Apakah ini fitur MVP atau post-launch?
- Apakah ada opsi "kurir Galantara" sendiri?

### 13.5 Livestream: Native vs Embed

- Apakah Galantara membangun fitur livestream sendiri (native) atau embed saja dari TikTok/YT/Twitch?
- Jika native: infra cost sangat besar (media server, transcoding, CDN video)
- Jika embed: fitur terbatas, tergantung API pihak ketiga
- Hybrid approach: embed dulu, native di V5+?

---

## BAB 14 - Changelog

### v1.0 -- Initial PRD
- Dokumen awal. Konsep dasar Galantara.
- Definisi Spot, avatar, dan chat.
- Sketsa kasar peta Indonesia.

### v2.0 -- Economy & Spot System
- Penambahan sistem Mighan Coin (4 tier: EMAS, PERAK, PERUNGGU, BERLIAN).
- Definisi tipe Spot (Public, Private, Dungeon, Oola).
- Grid system dan ukuran Spot.
- Revenue model awal.

### v3.0 -- Developer Ecosystem & Tech Stack
- Penambahan Developer Ecosystem chapter.
- Definisi Asset & Programmable Object Standard.
- SDK API specification (galantara.on, galantara.tokens, dll).
- Tech stack finalisasi (R3F, Fastify, Supabase, dll).
- Subdomain architecture.
- Security sandbox model.

### v4.0 -- Full PRD Consolidation (Current)
- Konsolidasi semua chapter menjadi satu dokumen master.
- Penambahan Oola onboarding detail (zona, login gate, camera system).
- Visual style guide per kota.
- Fitur user lengkap (chat, toko, jasa, live show, quest, mini games).
- URL routing dan SEO requirements.
- API tier pricing.
- LOD system specification.
- Risiko & mitigasi diperluas.
- Open questions diformalkan.
- 14 chapter lengkap.

---

## Appendix: Quick Reference

### Brand Names

| Nama | Tipe | Keterangan |
|---|---|---|
| **Galantara** | Platform | Nama utama platform |
| **Oola** | Zona | Hub onboarding, pulau melayang |
| **Galantara Spot** | Fitur | Sistem ruang virtual |
| **galantara.io** | Domain | Domain utama |
| **Mighan Coin** | Currency | Sistem token internal |

### Token Tiers

| Token | Emoji | Warna |
|---|---|---|
| EMAS | Kuning/emas | #FFD700 |
| PERAK | Abu-abu/silver | #C0C0C0 |
| PERUNGGU | Coklat/bronze | #CD7F32 |
| BERLIAN | Biru/diamond | #B9F2FF |

### SDK Namespace Quick Reference

```
galantara.on(event, handler)     -- Event listener
galantara.user.*                 -- User info
galantara.tokens.*               -- Mighan Coin operations
galantara.door.*                 -- Access control
galantara.notify.*               -- Notifications
galantara.config.*               -- Read manifest config
galantara.state.*                -- Persistent state
galantara.http.*                 -- External API calls
```

---

**Galantara Master PRD v4.0** · galantara.io

_Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk pengembangan platform Galantara. Setiap keputusan desain, teknis, dan bisnis harus merujuk pada dokumen ini._
