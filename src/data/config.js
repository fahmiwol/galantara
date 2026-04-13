// ═══════════════════════════════════════════════════════
// config.js — Semua konstanta, data, dan konfigurasi
// Single source of truth untuk seluruh platform Galantara
// ═══════════════════════════════════════════════════════

// ── SUPABASE ─────────────────────────────────────────
export const SUPABASE_URL  = 'https://saflkdcfhslrcszdbggt.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_mNNDWsQCCcE2KG5JZX2P6A_tDKdj86o';

// ── ANALYTICS ────────────────────────────────────────
export const GA_ID = 'G-WNDQL8J455';

// ── CAMERA ───────────────────────────────────────────
// JANGAN DIUBAH — sudah dikonfirmasi di PRD
export const PHI_MIN    = Math.PI * 0.18;  // ~32° — batas atas
export const PHI_MAX    = Math.PI * 0.42;  // ~76° — batas bawah
export const LERP_MOVE  = 0.18;            // lerp saat bergerak
export const LERP_IDLE  = 0.10;            // lerp saat diam
export const CAM_RADIUS = 16;
export const SPEED      = 0.09;
export const ISLAND_R   = 18;

// ── AVATAR COLOR PRESETS ─────────────────────────────
// 8 preset sesuai PRD art direction
export const AV_PRESETS = [
  { name: 'Lavender', color: 0x8B5CF6, hex: '#8B5CF6' },
  { name: 'Biru',     color: 0x38BDF8, hex: '#38BDF8' },
  { name: 'Sunset',   color: 0xF97316, hex: '#F97316' },
  { name: 'Rose',     color: 0xEC4899, hex: '#EC4899' },
  { name: 'Hijau',    color: 0x10B981, hex: '#10B981' },
  { name: 'Amber',    color: 0xF59E0B, hex: '#F59E0B' },
  { name: 'Coral',    color: 0xEF4444, hex: '#EF4444' },
  { name: 'Teal',     color: 0x06B6D4, hex: '#06B6D4' },
];

// ── NPC DEFINITIONS ──────────────────────────────────
export const NPCS = [
  {
    id: 'guide',
    name: 'Guide',
    role: 'Pemandu Oola',
    color: 0xF97316,
    x: 2, z: 4,
    idleMsg: 'Selamat datang! 🌟',
    dialog: [
      {
        msg: 'Hei! Selamat datang di Oola, gerbang menuju seluruh Galantara! Kamu baru pertama kali ke sini?',
        choices: [
          { text: 'Iya, baru pertama!', next: 1 },
          { text: 'Sudah pernah, mau explore lagi.', next: 2 },
        ],
      },
      {
        msg: 'Keren! Di Oola ada Warp Portal untuk ke Spot di seluruh Indonesia, Dev Hub untuk kontributor, dan banyak warga yang bisa diajak ngobrol. Santai aja, tidak ada yang dipaksa login dulu! 😊',
        choices: [{ text: 'Siap, makasih!', next: -1 }],
      },
      {
        msg: 'Welcome back! Ada update baru — dungeon kadang muncul tiba-tiba dengan timer countdown. Kalau timer muncul di atas, buruan masuk! 🌀',
        choices: [{ text: 'Siap, mantap!', next: -1 }],
      },
    ],
  },
  {
    id: 'budi',
    name: 'Budi',
    role: 'Warga Oola',
    color: 0x06B6D4,
    x: -3, z: 5,
    idleMsg: 'Nama saya Budi 👋',
    dialog: [
      {
        msg: 'Halo! Saya Budi, sudah tinggal di Oola sejak platform ini dibuka. Tempat yang nyaman untuk nongkrong virtual!',
        choices: [
          { text: 'Kamu sering ke Spot mana?', next: 1 },
          { text: 'Senang berkenalan, Budi!', next: -1 },
        ],
      },
      {
        msg: 'Saya suka ke Malioboro! Atmosfernya kental budaya Jawa, banyak pedagang lokal yang jualan batik dan kerajinan. Kalau mau ke sana, pakai Warp Portal ya.',
        choices: [{ text: 'Wah menarik, makasih infonya!', next: -1 }],
      },
    ],
  },
  {
    id: 'maya',
    name: 'Maya',
    role: 'Travel Guide',
    color: 0xEC4899,
    x: 5, z: 3,
    idleMsg: 'Mau ke Spot mana? 🗺',
    dialog: [
      {
        msg: 'Halo! Saya Maya, travel guide resmi Galantara. Mau kurekomendasikan Spot terbaik minggu ini?',
        choices: [
          { text: 'Mau dong, rekomendasiin!', next: 1 },
          { text: 'Nanti aja, lagi jalan-jalan dulu.', next: -1 },
        ],
      },
      {
        msg: '🏖 Kuta Beach Bali lagi trending! Banyak merchant lokal, ada performer live setiap malam. Travel fee cuma 5 Perak untuk tourist dari luar Bali. Worth it!',
        choices: [{ text: 'Oke, nanti aku coba!', next: -1 }],
      },
    ],
  },
  {
    id: 'sari',
    name: 'Sari',
    role: 'Dungeon Scout',
    color: 0x8B5CF6,
    x: -5, z: -3,
    idleMsg: 'Ada dungeon baru! 🌀',
    dialog: [
      {
        msg: '⚠️ Psst! Aku dapat info dari dalam — ada dungeon tersembunyi yang akan muncul dalam waktu dekat. Kalau timer muncul di atas layar, jangan sampai ketinggalan!',
        choices: [
          { text: 'Dungeon itu apa?', next: 1 },
          { text: 'Siap, aku pantau!', next: -1 },
        ],
      },
      {
        msg: 'Dungeon adalah event mendadak — muncul tiba-tiba, cuma bertahan beberapa menit. Di dalamnya ada tantangan dan reward eksklusif. Bisa dapat Berlian atau item langka!',
        choices: [{ text: 'Mantap! Siap berburu dungeon!', next: -1 }],
      },
    ],
  },
  {
    id: 'dev',
    name: 'Dev',
    role: 'Core Developer',
    color: 0x10B981,
    x: 9, z: 3,
    idleMsg: 'Join contributor? 💻',
    dialog: [
      {
        msg: 'Hei developer! Galantara adalah platform terbuka. Layer 1 (core engine) akan di-open source dengan lisensi MIT. Tertarik kontribusi?',
        choices: [
          { text: 'Gimana cara mulai?', next: 1 },
          { text: 'Mau, tapi masih belajar.', next: 2 },
        ],
      },
      {
        msg: 'Keren! Nanti akan ada dev.galantara.io dengan SDK docs, asset format spec, dan sandbox environment. Untuk sekarang, masuk ke Developer Hub dan daftarkan dirimu sebagai kontributor early bird!',
        choices: [{ text: 'Oke, langsung ke Dev Hub!', next: -1 }],
      },
      {
        msg: 'Tidak masalah! Galantara juga butuh desainer, konten kreator, dan tester. Tidak harus bisa coding. Yang penting mau berkontribusi membangun platform ini bersama!',
        choices: [{ text: 'Siap, ikut membangun!', next: -1 }],
      },
    ],
  },
  {
    id: 'dewi',
    name: 'Dewi',
    role: 'Merchant Kuta',
    color: 0xEF4444,
    x: 6, z: -7,
    idleMsg: 'Promo Kuta Spot! 🏖',
    dialog: [
      {
        msg: 'Halo! Saya Dewi, merchant di Kuta Beach Spot. Lagi ada promo spesial — beli produk kerajinan Bali di booth saya, gratis ongkir COD untuk radius 5km dari Kuta!',
        choices: [
          { text: 'Wah, gimana cara ke Kuta Spot?', next: 1 },
          { text: 'Noted, nanti aku visit!', next: -1 },
        ],
      },
      {
        msg: 'Pakai Warp Portal di tengah Oola! Pilih Kuta Beach. Kalau kamu di luar Bali, bayar travel fee dulu — tapi worth it karena bisa langsung transaksi sama merchant lokal verified kayak saya!',
        choices: [{ text: 'Oke, makasih Dewi!', next: -1 }],
      },
    ],
  },
];

// ── PROXIMITY ZONES ───────────────────────────────────
export const ZONES = [
  { id: 'warp',  x: -7,  z: -2,   r: 3.0, hint: '🌀 Warp Portal — masuk ke Spot publik', panel: 'map-panel' },
  { id: 'info',  x: 1,   z: 0,    r: 2.5, hint: '📋 Papan Informasi — tentang Galantara', panel: null },
  { id: 'saran', x: -9,  z: 3,    r: 2.2, hint: '📮 Kotak Saran — kirim masukan ke admin', panel: null },
  { id: 'dev',   x: 8,   z: -2.5, r: 3.0, hint: '💻 Developer Hub — kelola Spot & daftar kontributor', panel: 'dev-panel' },
  { id: 'dev2',  x: 12,  z: 2,    r: 2.2, hint: '📌 Contributor Office — daftar pengembang', panel: 'dev-panel' },
];

// ── WARP SPOTS (MAP PANEL) ────────────────────────────
export const SPOTS = [
  {
    id: 'monas',
    name: 'Monas Jakarta',
    emoji: '🏛',
    merchants: 48,
    vibe: 'Landmark bersejarah, pasar oleh-oleh, street food',
    status: 'live',
    theme: { primary: '#DAA520', secondary: '#228B22' },
  },
  {
    id: 'kuta',
    name: 'Kuta Beach Bali',
    emoji: '🏖',
    merchants: 62,
    vibe: 'Pantai, surf culture, kerajinan lokal, sunset live',
    status: 'live',
    theme: { primary: '#F97316', secondary: '#38BDF8' },
  },
  {
    id: 'malioboro',
    name: 'Malioboro Yogya',
    emoji: '🎭',
    merchants: 35,
    vibe: 'Batik, kerajinan perak, kuliner Jawa, budaya',
    status: 'live',
    theme: { primary: '#7C3AED', secondary: '#F59E0B' },
  },
  {
    id: 'braga',
    name: 'Braga Bandung',
    emoji: '☕',
    merchants: 29,
    vibe: 'Kafe vintage, fashion, kuliner kreatif, seni',
    status: 'live',
    theme: { primary: '#EC4899', secondary: '#8B5CF6' },
  },
  {
    id: 'bogor',
    name: 'Alun-alun Bogor',
    emoji: '🌿',
    merchants: 18,
    vibe: 'Kuliner lokal, tanaman hias, suasana hijau',
    status: 'live',
    theme: { primary: '#10B981', secondary: '#06B6D4' },
  },
  {
    id: 'losari',
    name: 'Losari Makassar',
    emoji: '🌊',
    merchants: 22,
    vibe: 'Seafood, sunset Makassar, kuliner khas Sulawesi',
    status: 'coming',
    theme: { primary: '#0EA5E9', secondary: '#F97316' },
  },
];

/** Room Socket.io default (hub Oola). */
export const OOLA_SOCKET_ROOM = 'oola';

/**
 * Room id untuk isolasi multiplayer per Spot (Sprint 5).
 * @param {string|null|undefined} spotId — id dari `SPOTS`, kosong = hub
 */
export function socketRoomForSpot(spotId) {
  if (!spotId) return OOLA_SOCKET_ROOM;
  return `spot:${spotId}`;
}

/** Baca `?spot=` di URL; hanya Spot berstatus `live` yang valid. */
export function parseInitialSocketRoomFromUrl() {
  const raw = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('spot')
    : null;
  if (!raw) return OOLA_SOCKET_ROOM;
  const hit = SPOTS.find((s) => s.id === raw && s.status === 'live');
  return hit ? socketRoomForSpot(hit.id) : OOLA_SOCKET_ROOM;
}

/** Label singkat untuk HUD (dari room id). */
export function spotLabelFromSocketRoom(room) {
  if (!room || room === OOLA_SOCKET_ROOM) return 'Oola Hub';
  const id = String(room).startsWith('spot:') ? String(room).slice(5) : room;
  const hit = SPOTS.find((s) => s.id === id);
  return hit ? hit.name : `Spot: ${id}`;
}

/** `spot:<id>` → `id`; hub → `null` */
export function spotIdFromSocketRoom(room) {
  if (!room || room === OOLA_SOCKET_ROOM) return null;
  return String(room).startsWith('spot:') ? String(room).slice(5) : null;
}

// ── HAMBURGER MENU ITEMS ──────────────────────────────
export const MENU_ITEMS = [
  { icon: '🗺', label: 'Peta Spot',      action: "G_UI.openPanel('map-panel')" },
  { icon: '💻', label: 'Developer Hub',  action: "G_UI.openPanel('dev-panel')" },
  { icon: '🪙', label: 'Mighan Coin',    action: "G_UI.openPanel('token-panel')" },
  { icon: '👤', label: 'Profil',         action: 'G_UI.openProfile()' },
  { icon: '📋', label: 'Tentang Galantara', action: "window.location.href='about.html'" },
];
