// ═══════════════════════════════════════════════════════
// identitas.cjs — siapa pemain ini, menurut SERVER
//
// Klien boleh MENGAKU apa saja di payload `join` (id, nama, flag tamu). Server
// hanya mempercayai dua hal:
//   1. id publik acak yang dibuatnya sendiri per koneksi, dan
//   2. token akses Supabase yang tanda tangannya bisa ia periksa.
//
// Verifikasi hanya aktif kalau kuncinya ada di environment:
//   SUPABASE_JWT_SECRET  rahasia HS256 (proyek dengan "Legacy JWT secret")
//   SUPABASE_JWKS_URL    kunci publik ES256/RS256 (proyek dengan JWT Signing Keys),
//                        mis. https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
//   SUPABASE_URL         opsional; kalau ada, klaim `iss` wajib <SUPABASE_URL>/auth/v1
// Tanpa keduanya, SEMUA koneksi tamu (gagal-tertutup): chat dan voice mati.
// Cara mengaktifkan: docs/DEPLOY.md §Server multiplayer.
// ═══════════════════════════════════════════════════════
'use strict';

const crypto = require('node:crypto');
const { bersihkanNama } = require('./penjaga.cjs');

/** Toleransi jam antara server ini dan Supabase. */
const LONGGAR_DETIK = 30;
const PANJANG_TOKEN_MAKS = 8192;
/** Kunci JWKS dianggap segar selama ini; sesudahnya diperbarui di latar. */
const JWKS_SEGAR_MS = 10 * 60 * 1000;
/** `kid` tak dikenal memicu ambil ulang paling sering sekali per jeda ini. */
const JWKS_ULANG_MIN_MS = 30 * 1000;
const JWKS_BATAS_WAKTU_MS = 5000;

/** Pesan untuk pemain, per alasan. Klien menampilkannya apa adanya. */
const PESAN_TAMU = Object.freeze({
  'tanpa-login': 'Kamu masuk sebagai tamu: bisa jalan-jalan dan melihat pemain lain. Chat dan voice butuh login.',
  'verifikasi-belum-aktif': 'Chat dan voice belum aktif: server belum bisa memverifikasi login.',
  'verifikasi-gagal': 'Server sedang tidak bisa memeriksa login. Muat ulang sebentar lagi untuk ikut chat.',
  'token-kedaluwarsa': 'Sesi login kedaluwarsa. Muat ulang halaman untuk ikut chat.',
  'token-tidak-sah': 'Login tidak bisa diverifikasi server. Chat dan voice dimatikan.',
  'akun-anonim': 'Akun anonim diperlakukan sebagai tamu. Chat dan voice butuh login.',
});

/** Id publik opaque: 9 bita acak, 12 karakter base64url. Satu per koneksi. */
function idPublikBaru() {
  return crypto.randomBytes(9).toString('base64url');
}

function teksEnv(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function jsonBagian(bagian) {
  try {
    const v = JSON.parse(Buffer.from(bagian, 'base64url').toString('utf8'));
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function pisahToken(token) {
  if (typeof token !== 'string' || !token || token.length > PANJANG_TOKEN_MAKS) return null;
  const bagian = token.split('.');
  if (bagian.length !== 3 || !bagian.every((b) => /^[A-Za-z0-9_-]+$/.test(b))) return null;
  const header = jsonBagian(bagian[0]);
  const klaim = jsonBagian(bagian[1]);
  if (!header || !klaim) return null;
  return {
    header,
    klaim,
    data: Buffer.from(`${bagian[0]}.${bagian[1]}`),
    tanda: Buffer.from(bagian[2], 'base64url'),
  };
}

/**
 * Klaim token akses Supabase untuk pengguna yang benar-benar login.
 * Kunci `anon` (publik, ada di klien) juga JWT bertanda tangan sah — `role`
 * dan `aud`-lah yang membedakannya dari token pengguna.
 * @returns {string|null} alasan penolakan, atau null kalau sah
 */
function periksaKlaim(klaim, { sekarangDetik, penerbit }) {
  if (typeof klaim.exp !== 'number' || !Number.isFinite(klaim.exp)) return 'token-tidak-sah';
  if (klaim.exp + LONGGAR_DETIK <= sekarangDetik) return 'token-kedaluwarsa';
  for (const k of ['nbf', 'iat']) {
    if (klaim[k] === undefined) continue;
    if (typeof klaim[k] !== 'number' || klaim[k] - LONGGAR_DETIK > sekarangDetik) return 'token-tidak-sah';
  }
  const aud = Array.isArray(klaim.aud) ? klaim.aud : [klaim.aud];
  if (!aud.includes('authenticated')) return 'token-tidak-sah';
  if (klaim.role !== 'authenticated') return 'token-tidak-sah';
  if (typeof klaim.sub !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(klaim.sub)) return 'token-tidak-sah';
  if (penerbit && klaim.iss !== penerbit) return 'token-tidak-sah';
  // Masuk anonim Supabase juga ber-role authenticated. Bukan identitas.
  if (klaim.is_anonymous === true) return 'akun-anonim';
  return null;
}

/** Nama tampil dari klaim token — sama dengan G_Auth.getName() di klien. */
function namaDariKlaim(klaim) {
  const meta = klaim.user_metadata !== null && typeof klaim.user_metadata === 'object' ? klaim.user_metadata : {};
  const email = typeof klaim.email === 'string' ? klaim.email.split('@')[0] : null;
  for (const calon of [meta.full_name, meta.name, email]) {
    const nama = bersihkanNama(calon);
    if (nama) return nama;
  }
  return 'Warga';
}

/**
 * @param {Record<string,string|undefined>} env
 * @param {{ fetch?: typeof fetch, sekarangMs?: () => number, log?: (s:string) => void }} [opsi]
 */
function buatPemverifikasi(env = process.env, opsi = {}) {
  const ambil = opsi.fetch ?? globalThis.fetch;
  const jam = opsi.sekarangMs ?? (() => Date.now());
  const log = opsi.log ?? ((s) => console.warn(s));
  const rahasia = teksEnv(env.SUPABASE_JWT_SECRET);
  const urlJwks = teksEnv(env.SUPABASE_JWKS_URL);
  const dasar = teksEnv(env.SUPABASE_URL);
  const penerbit = dasar ? `${dasar.replace(/\/+$/, '')}/auth/v1` : null;
  const mode = [rahasia && 'HS256', urlJwks && 'JWKS'].filter(Boolean);

  /** @type {Map<string, {alg:string, kunci:crypto.KeyObject}>} */
  let kunci = new Map();
  let waktuAmbil = 0;
  let waktuCoba = -Infinity;
  /** @type {Promise<void>|null} */
  let sedangAmbil = null;
  let galatTerakhir = null;

  function ambilJwks() {
    if (sedangAmbil) return sedangAmbil;
    waktuCoba = jam();
    sedangAmbil = (async () => {
      try {
        const r = await ambil(urlJwks, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(JWKS_BATAS_WAKTU_MS),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const isi = await r.json();
        const baru = new Map();
        for (const jwk of Array.isArray(isi?.keys) ? isi.keys : []) {
          if (!jwk || typeof jwk !== 'object' || typeof jwk.kid !== 'string') continue;
          if (jwk.use !== undefined && jwk.use !== 'sig') continue;
          const alg = jwk.kty === 'EC' && jwk.crv === 'P-256' ? 'ES256' : jwk.kty === 'RSA' ? 'RS256' : null;
          if (!alg || (jwk.alg !== undefined && jwk.alg !== alg)) continue;
          try {
            baru.set(jwk.kid, { alg, kunci: crypto.createPublicKey({ key: jwk, format: 'jwk' }) });
          } catch { /* kunci rusak dilewati; kunci lain tetap dipakai */ }
        }
        if (!baru.size) throw new Error('JWKS tanpa kunci ES256/RS256 yang bisa dipakai');
        kunci = baru;
        waktuAmbil = jam();
        galatTerakhir = null;
      } catch (e) {
        const pesan = String(e?.message ?? e);
        if (pesan !== galatTerakhir) log(`[identitas] JWKS gagal diambil (${pesan}); token ES256/RS256 diperlakukan tamu.`);
        galatTerakhir = pesan;
      } finally {
        sedangAmbil = null;
      }
    })();
    return sedangAmbil;
  }

  async function kunciUntuk(kid) {
    const ada = kunci.get(kid);
    const sekarang = jam();
    if (ada) {
      // Basi: perbarui di latar, pakai yang ada sekarang.
      if (sekarang - waktuAmbil > JWKS_SEGAR_MS && sekarang - waktuCoba > JWKS_ULANG_MIN_MS) ambilJwks();
      return ada;
    }
    // kid baru (rotasi kunci di Supabase) — tapi kid acak dari penyerang tidak
    // boleh membuat server membombardir Supabase.
    if (sekarang - waktuCoba > JWKS_ULANG_MIN_MS) await ambilJwks();
    else if (sedangAmbil) await sedangAmbil;
    return kunci.get(kid) ?? null;
  }

  /**
   * @param {unknown} token
   * @returns {Promise<{ok:true, sub:string, nama:string} | {ok:false, alasan:string}>}
   */
  async function verifikasi(token) {
    if (token === undefined || token === null || token === '') return { ok: false, alasan: 'tanpa-login' };
    if (!mode.length) return { ok: false, alasan: 'verifikasi-belum-aktif' };
    const t = pisahToken(token);
    if (!t) return { ok: false, alasan: 'token-tidak-sah' };
    const alg = t.header.alg;
    let sah = false;
    try {
      if (alg === 'HS256' && rahasia) {
        const hitung = crypto.createHmac('sha256', rahasia).update(t.data).digest();
        sah = hitung.length === t.tanda.length && crypto.timingSafeEqual(hitung, t.tanda);
      } else if ((alg === 'ES256' || alg === 'RS256') && urlJwks && typeof t.header.kid === 'string') {
        const k = await kunciUntuk(t.header.kid);
        if (!k) return { ok: false, alasan: kunci.size ? 'token-tidak-sah' : 'verifikasi-gagal' };
        // Kunci harus cocok dengan alg di header: tidak ada kebingungan algoritma.
        if (k.alg !== alg) return { ok: false, alasan: 'token-tidak-sah' };
        const kunciVerif = alg === 'ES256' ? { key: k.kunci, dsaEncoding: 'ieee-p1363' } : k.kunci;
        sah = crypto.verify('sha256', t.data, kunciVerif, t.tanda);
      }
      // alg lain — termasuk "none" dan HS256 saat hanya JWKS yang dipasang — ditolak.
    } catch {
      sah = false;
    }
    if (!sah) return { ok: false, alasan: 'token-tidak-sah' };
    const salah = periksaKlaim(t.klaim, { sekarangDetik: Math.floor(jam() / 1000), penerbit });
    if (salah) return { ok: false, alasan: salah };
    return { ok: true, sub: t.klaim.sub, nama: namaDariKlaim(t.klaim) };
  }

  return {
    /** Apakah ada kunci untuk memverifikasi. false = semua koneksi tamu. */
    aktif: mode.length > 0,
    mode,
    verifikasi,
    /** Ambil JWKS saat server menyala, supaya pemain pertama tidak menunggu. */
    siapkan: () => (urlJwks ? ambilJwks() : Promise.resolve()),
  };
}

module.exports = { idPublikBaru, buatPemverifikasi, periksaKlaim, namaDariKlaim, PESAN_TAMU, LONGGAR_DETIK };
