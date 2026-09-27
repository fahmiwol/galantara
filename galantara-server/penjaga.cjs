// ═══════════════════════════════════════════════════════
// penjaga.cjs — aturan server multiplayer yang tidak bergantung socket.io
//
// Room yang dikenal dan batas dunianya, batas kecepatan, batas laju pesan,
// dan pembersih teks. Dipisah dari index.js supaya bisa diuji langsung
// (tests/penjaga.test.mjs) dan supaya index.js tinggal perekat.
//
// Ekstensi .cjs, bukan .js: `npm test` memakai --experimental-default-type=module,
// yang membuat .js di folder ini dibaca sebagai modul ES. .cjs selalu CommonJS.
//
// Keputusan dan angkanya: docs/adr/0023-server-multiplayer-berotoritas-atas-identitas-tamu-dan-gerak.md
// ═══════════════════════════════════════════════════════
'use strict';

// ── ROOM & BATAS DUNIA ─────────────────────────────────
/**
 * Room yang boleh dimasuki dan jari-jari batasnya (meter dari pusat).
 *
 * SALINAN dari klien: `SPOTS` berstatus live di src/data/config.js, dan batas
 * yang bisa dicapai pemain di tiap Spot. Dua sumber itu dijaga sama oleh
 * tests/serverParitas.test.mjs — menambah Spot live atau melebarkan Spot tanpa
 * mengubah angka di sini membuat uji merah, bukan membuat pemainnya dijepit
 * diam-diam di layar orang lain.
 *
 * Angka = jangkauan terjauh yang sah + 0,5 m, dibulatkan ke atas:
 * - gerak cadangan (sebelum/tanpa fisika) menjepit SEMUA room di ISLAND_R − 1 = 17 m;
 * - fisika: pusat kapsul berhenti 0,42 m di dalam dinding; di sudut poligon
 *   cincin sedikit lebih jauh: Oola (17,4 − 0,42) / cos(π/32) = 17,06 m;
 * - Spot persegi: sudut dalam dinding — Kuta 17,11 m, Malioboro 17,34 m,
 *   Braga hypot(7,78, 17,58) = 19,22 m; ujung dermaga Losari 17,01 m.
 */
const RUANG = Object.freeze({
  'oola':           Object.freeze({ jari: 17.6 }),
  'spot:monas':     Object.freeze({ jari: 17.5 }),
  'spot:kuta':      Object.freeze({ jari: 17.7 }),
  'spot:malioboro': Object.freeze({ jari: 17.9 }),
  'spot:braga':     Object.freeze({ jari: 19.8 }),
  'spot:bogor':     Object.freeze({ jari: 17.5 }),
  'spot:losari':    Object.freeze({ jari: 17.6 }),
});

/** Titik muncul semua room: Avatar.teleport(0, 2) saat warp dan saat jatuh dari dunia. */
const SPAWN = Object.freeze({ x: 0, z: 2 });

function ruangDikenal(room) {
  return typeof room === 'string' && Object.prototype.hasOwnProperty.call(RUANG, room);
}

/** Jepit titik ke lingkaran batas room. */
function jepitKeRuang(room, x, z) {
  const jari = RUANG[room]?.jari ?? RUANG.oola.jari;
  const d = Math.hypot(x, z);
  if (d <= jari) return { x, z };
  const f = jari / d;
  return { x: x * f, z: z * f };
}

// ── GERAK ──────────────────────────────────────────────
/**
 * Batas gerak. Klien berjalan KECEPATAN = 5,4 m/s (src/fisika/Karakter.js), tanpa
 * lari. Lompatan sah yang tidak lewat warp: duduk ke kursi (≤ ~3 m dari titik
 * berdiri), berdiri (≤ 1,1 m), pastikanBebas (≤ 3 m), dan kembali ke titik
 * muncul setelah jatuh (lihat `radiusSpawn`).
 */
const GERAK = Object.freeze({
  /** 1,5 × 5,4 m/s: sisa 2,7 m/s untuk mengejar ketinggalan setelah jaringan tersendat. */
  kecepatanMaks: 8.1,
  /** Jatah lompatan seketika (m). Menampung duduk ke kursi ≈ 3 m plus jitter. */
  cadangan: 6,
  /** Klaim dalam radius ini dari SPAWN selalu diterima: calonMelingkar(SPAWN) sampai 3 m. */
  radiusSpawn: 3.5,
  /** Jarak antar siaran posisi satu pemain: ≤ 20 per detik (klien mengirim ≤ 12,5). */
  siarMinMs: 50,
  /** Koordinat di luar ini bukan angka dunia; ditolak sebelum dijepit. */
  mutlakMaks: 1e6,
});

function angka(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Normalisasi arah hadap ke (−π, π]. */
function arahNormal(f) {
  const dua = Math.PI * 2;
  let a = f % dua;
  if (a > Math.PI) a -= dua;
  if (a <= -Math.PI) a += dua;
  return a;
}

/** Dua desimal: sentimeter untuk posisi, ±0,3° untuk arah. Memangkas JSON ±30 %. */
function bulat2(v) {
  return Math.round(v * 100) / 100;
}

/**
 * Baca payload `move`. Hanya x/z/facing yang berupa angka hingga; sisanya
 * dibuang. Mengembalikan null untuk payload yang tidak bisa dipakai.
 */
function bacaGerak(data) {
  if (!adalahObjek(data)) return null;
  const { x, z, facing } = data;
  if (!angka(x) || !angka(z)) return null;
  if (Math.abs(x) > GERAK.mutlakMaks || Math.abs(z) > GERAK.mutlakMaks) return null;
  const hasil = { x, z };
  if (angka(facing)) hasil.facing = arahNormal(facing);
  return hasil;
}

/**
 * Posisi satu pemain menurut SERVER.
 *
 * Klien mengklaim posisi; penjaga memajukan posisi server ke arah klaim itu
 * dengan jatah jarak yang terisi `kecepatanMaks` meter per detik, maksimal
 * `cadangan` meter. Lompatan mustahil tidak diterima seketika: ia dijepit dan
 * sisanya ditempuh dengan kecepatan maksimum. Klien sah yang tertinggal karena
 * jaringan tersendat tetap sampai di posisinya, hanya tidak seketika.
 */
class PenjagaGerak {
  /**
   * @param {string} room
   * @param {number} sekarang ms monoton
   */
  constructor(room, sekarang) {
    this.room = room;
    /** Posisi yang disiarkan. Mutable: socket.data memegang referensi yang sama. */
    this.posisi = { x: SPAWN.x, z: SPAWN.z, facing: 0 };
    /** @type {{x:number,z:number}|null} klaim yang belum tercapai */
    this.target = null;
    this.jatah = GERAK.cadangan;
    this.waktu = sekarang;
    /** Klaim pertama sesudah join = posisi muncul (spawn snapshot klien). */
    this.sudahMuncul = false;
  }

  /** @returns {'muncul'|'spawn'|'klaim'} */
  klaim(x, z, sekarang) {
    const p = jepitKeRuang(this.room, x, z);
    if (!this.sudahMuncul) {
      this.sudahMuncul = true;
      this._pindah(p, sekarang);
      return 'muncul';
    }
    if (Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) <= GERAK.radiusSpawn) {
      // Kembali ke titik muncul (jatuh dari dunia) — sah dari mana pun, dan tidak
      // memberi keuntungan apa-apa: semua orang juga muncul di sana.
      this._pindah(p, sekarang);
      return 'spawn';
    }
    this.target = p;
    return 'klaim';
  }

  _pindah(p, sekarang) {
    this._isi(sekarang);
    this.posisi.x = p.x;
    this.posisi.z = p.z;
    this.target = null;
  }

  _isi(sekarang) {
    const dt = Math.max(0, sekarang - this.waktu) / 1000;
    this.jatah = Math.min(GERAK.cadangan, this.jatah + dt * GERAK.kecepatanMaks);
    this.waktu = sekarang;
  }

  /**
   * Majukan posisi ke arah klaim sejauh jatahnya.
   * @returns {boolean} apakah posisi berubah
   */
  majukan(sekarang) {
    this._isi(sekarang);
    if (!this.target) return false;
    const dx = this.target.x - this.posisi.x;
    const dz = this.target.z - this.posisi.z;
    const d = Math.hypot(dx, dz);
    if (d <= this.jatah) {
      this.posisi.x = this.target.x;
      this.posisi.z = this.target.z;
      this.jatah -= d;
      this.target = null;
      return d > 0;
    }
    if (this.jatah <= 0) return false;
    const f = this.jatah / d;
    this.posisi.x += dx * f;
    this.posisi.z += dz * f;
    this.jatah = 0;
    return true;
  }

  get sampai() { return this.target === null; }
}

// ── LAJU PESAN ─────────────────────────────────────────
/**
 * Ember token per koneksi. Angka dipilih dari perilaku klien sekarang:
 * - move: klien mengirim ≤ 12,5/dtk (MOVE_THROTTLE_MS 80). Ember 100 menampung
 *   tumpukan ±8 dtk setelah jaringan tersendat; isi 25/dtk = 2× klien.
 * - chat: klien tidak membatasi; 5 pesan per 10 dtk = satu pesan per 2 dtk
 *   rata-rata, dengan semburan 5 balasan pendek.
 * - join/sync: klien sah mengirim satu per koneksi (warp = koneksi baru).
 * - rtc: masuk kerumunan 10 orang ≈ 100 pesan sinyal (offer/answer + ICE) dalam
 *   satu-dua detik.
 */
const LAJU = Object.freeze({
  move: Object.freeze({ kapasitas: 100, perDetik: 25 }),
  chat: Object.freeze({ kapasitas: 5, perDetik: 0.5 }),
  join: Object.freeze({ kapasitas: 3, perDetik: 0.2 }),
  sync: Object.freeze({ kapasitas: 3, perDetik: 0.2 }),
  rtc:  Object.freeze({ kapasitas: 200, perDetik: 40 }),
});

/**
 * Pesan yang dibuang ember atau payload yang tidak sah dihitung pelanggaran.
 * Lebih dari `batas` dalam `jendelaMs` = banjir: koneksi diputus. Klien sah
 * tidak pernah mendekatinya (tumpukan 10 dtk setelah macet ≈ 25 pelanggaran).
 */
const PELANGGARAN = Object.freeze({ jendelaMs: 10000, batas: 100 });

/** Penolakan ke pengirim paling sering sekali per jenis per detik. */
const TOLAK_MIN_MS = 1000;

class Ember {
  constructor({ kapasitas, perDetik }, sekarang) {
    this.kapasitas = kapasitas;
    this.perDetik = perDetik;
    this.isi = kapasitas;
    this.waktu = sekarang;
  }

  ambil(sekarang, n = 1) {
    const dt = Math.max(0, sekarang - this.waktu) / 1000;
    this.isi = Math.min(this.kapasitas, this.isi + dt * this.perDetik);
    this.waktu = sekarang;
    if (this.isi < n) return false;
    this.isi -= n;
    return true;
  }
}

class HitungPelanggaran {
  constructor(sekarang) {
    this.awal = sekarang;
    this.jumlah = 0;
  }

  /** @returns {boolean} true kalau batas terlampaui */
  catat(sekarang, n = 1) {
    if (sekarang - this.awal > PELANGGARAN.jendelaMs) {
      this.awal = sekarang;
      this.jumlah = 0;
    }
    this.jumlah += n;
    return this.jumlah > PELANGGARAN.batas;
  }
}

function buatLaju(sekarang) {
  const ember = {};
  for (const [jenis, aturan] of Object.entries(LAJU)) ember[jenis] = new Ember(aturan, sekarang);
  return { ember, pelanggaran: new HitungPelanggaran(sekarang), tolakTerakhir: new Map() };
}

// ── TEKS ───────────────────────────────────────────────
/**
 * Karakter yang tidak boleh sampai ke layar orang lain: kendali C0/C1, pembalik
 * arah teks (U+202E membuat "gpj.exe" terbaca terbalik), spasi lebar-nol, dan
 * pengisi Hangul yang dipakai untuk nama "kosong". ZWJ (U+200D) dan pemilih
 * variasi dibiarkan: emoji gabungan membutuhkannya.
 */
const TAK_TERLIHAT = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u115F\u1160\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u3164\uFEFF\uFFA0\uFFF9-\uFFFB]/gu;
/** Baris baru dan tab jadi spasi DULU — kalau ikut dibuang sebagai kendali, dua kata menempel. */
const PEMISAH_BARIS = /[\t\n\v\f\r\u0085\u2028\u2029]/g;
/** Tanda gabung bertumpuk ("teks Zalgo") menjebol label nama; dua cukup untuk aksara nyata. */
const TANDA_BERTUMPUK = /(\p{M}{2})\p{M}+/gu;

const BATAS_TEKS = Object.freeze({
  /** Nama tampil: kotak profil klien maxlength 24; nama Google bisa lebih panjang. */
  nama: 32,
  /** Pesan chat: input klien maxlength 80; ChatBubble memotong di 100. */
  pesan: 100,
});

function bersihkan(teks) {
  return teks
    .normalize('NFC')
    .replace(PEMISAH_BARIS, ' ')
    .replace(TAK_TERLIHAT, '')
    .replace(TANDA_BERTUMPUK, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Nama tampil yang sudah dibersihkan dan dipotong, atau '' kalau tidak ada isinya. */
function bersihkanNama(nama) {
  if (typeof nama !== 'string') return '';
  // Potong mentahnya dulu: 64 KB nama tidak perlu dinormalisasi seluruhnya.
  const teks = bersihkan(nama.slice(0, BATAS_TEKS.nama * 4));
  return Array.from(teks).slice(0, BATAS_TEKS.nama).join('');
}

/** @returns {{ok:true, teks:string} | {ok:false, alasan:string}} */
function bersihkanPesan(msg) {
  if (typeof msg !== 'string') return { ok: false, alasan: 'payload-tidak-sah' };
  // Batas kasar sebelum normalisasi: satu code point paling banyak 2 unit UTF-16.
  if (msg.length > BATAS_TEKS.pesan * 2) return { ok: false, alasan: 'terlalu-panjang' };
  const teks = bersihkan(msg);
  if (!teks) return { ok: false, alasan: 'kosong' };
  if (Array.from(teks).length > BATAS_TEKS.pesan) return { ok: false, alasan: 'terlalu-panjang' };
  return { ok: true, teks };
}

/**
 * Nama tamu dipilih SERVER. Nama bebas adalah papan pesan yang dilihat semua
 * orang di room — jalan pintas melewati gerbang chat tamu. Klien sendiri
 * membuat nama "Tamu 1234" (src/data/guestIdentity.js); nama berbentuk itu
 * dipertahankan supaya tamu tetap mengenali dirinya, yang lain diganti.
 */
const POLA_NAMA_TAMU = /^Tamu \d{4}$/;

function namaTamu(usulan, acak) {
  if (typeof usulan === 'string' && POLA_NAMA_TAMU.test(usulan)) return usulan;
  return `Tamu ${1000 + acak(9000)}`;
}

const WARNA = Object.freeze({ tamu: 0x9ca3af, warga: 0x8b5cf6 });

function warnaSah(c) {
  return Number.isInteger(c) && c >= 0 && c <= 0xffffff ? c : null;
}

// ── PAYLOAD ────────────────────────────────────────────
function adalahObjek(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !Buffer.isBuffer(v);
}

function teksPendek(v, maks) {
  return typeof v === 'string' && v.length <= maks;
}

/** SDP offer/answer. Hanya `type` dan `sdp` yang diteruskan. */
function sdpSah(v, tipe) {
  if (!adalahObjek(v) || v.type !== tipe || !teksPendek(v.sdp, 16384) || !v.sdp) return null;
  return { type: tipe, sdp: v.sdp };
}

/** Kandidat ICE (RTCIceCandidate.toJSON()). Kandidat kosong = akhir kandidat. */
function iceSah(v) {
  if (!adalahObjek(v) || !teksPendek(v.candidate, 1024)) return null;
  const hasil = { candidate: v.candidate, sdpMid: null, sdpMLineIndex: null };
  if (v.sdpMid !== undefined && v.sdpMid !== null) {
    if (!teksPendek(v.sdpMid, 64)) return null;
    hasil.sdpMid = v.sdpMid;
  }
  if (v.sdpMLineIndex !== undefined && v.sdpMLineIndex !== null) {
    if (!Number.isInteger(v.sdpMLineIndex) || v.sdpMLineIndex < 0 || v.sdpMLineIndex > 64) return null;
    hasil.sdpMLineIndex = v.sdpMLineIndex;
  }
  if (v.usernameFragment !== undefined && v.usernameFragment !== null) {
    if (!teksPendek(v.usernameFragment, 256)) return null;
    hasil.usernameFragment = v.usernameFragment;
  }
  return hasil;
}

module.exports = {
  RUANG, SPAWN, GERAK, LAJU, PELANGGARAN, TOLAK_MIN_MS, BATAS_TEKS, WARNA, POLA_NAMA_TAMU,
  ruangDikenal, jepitKeRuang, arahNormal, bulat2, bacaGerak,
  PenjagaGerak, Ember, HitungPelanggaran, buatLaju,
  bersihkanNama, bersihkanPesan, namaTamu, warnaSah,
  adalahObjek, sdpSah, iceSah,
};
