// ═══════════════════════════════════════════════════════
// tests/penjaga.test.mjs — aturan server multiplayer, tanpa socket.io
//
// Modul murni galantara-server/penjaga.cjs dan identitas.cjs diuji langsung,
// jadi uji ini jalan juga di CI yang tidak memasang dependensi server.
// Perilaku lewat server sungguhan: tests/serverMultiplayer.test.mjs.
// Keputusan: docs/adr/0023-server-multiplayer-berotoritas-atas-identitas-tamu-dan-gerak.md
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../galantara-server/penjaga.cjs');
const I = require('../galantara-server/identitas.cjs');

const kar = (...titik) => String.fromCodePoint(...titik);

// ── Gerak ────────────────────────────────────────────
test('gerak: klaim pertama sesudah join = posisi muncul, di mana pun di dalam batas', () => {
  const g = new P.PenjagaGerak('oola', 0);
  assert.equal(g.klaim(12, -9, 0), 'muncul');
  assert.deepEqual([g.posisi.x, g.posisi.z], [12, -9]);
});

test('gerak: lompatan mustahil dijepit ke jatah, lalu ditempuh dengan kecepatan maksimum', () => {
  const g = new P.PenjagaGerak('oola', 0);
  g.klaim(-10, 0, 0);
  g.klaim(10, 0, 0);                   // 20 m sekaligus
  g.majukan(0);
  assert.ok(Math.abs(g.posisi.x - (-10 + P.GERAK.cadangan)) < 1e-9, `baru ${g.posisi.x}`);
  assert.equal(g.sampai, false);
  // Server memajukan tiap siarMinMs; dalam satu detik jatahnya = kecepatanMaks.
  for (let t = P.GERAK.siarMinMs; t <= 1000; t += P.GERAK.siarMinMs) g.majukan(t);
  const jarak = g.posisi.x - (-10 + P.GERAK.cadangan);
  assert.ok(Math.abs(jarak - P.GERAK.kecepatanMaks) < 1e-6, `dalam 1 dtk maju ${jarak} m`);
  // Diam lama tidak menabung jatah melebihi cadangan: tidak ada teleport tertunda.
  g.majukan(60_000);
  assert.ok(g.posisi.x - (-10 + P.GERAK.cadangan + P.GERAK.kecepatanMaks) <= P.GERAK.cadangan + 1e-9);
  g.majukan(70_000);
  assert.equal(g.posisi.x, 10);
  assert.equal(g.sampai, true);
});

test('gerak: jalan sah 5,4 m/s dengan klaim tiap 80 ms tidak pernah dijepit', () => {
  const g = new P.PenjagaGerak('oola', 0);
  g.klaim(-15, 0, 0);
  for (let t = 80; t <= 5000; t += 80) {
    const x = -15 + 5.4 * t / 1000;
    g.klaim(x, 0, t);
    g.majukan(t);
    assert.ok(Math.abs(g.posisi.x - x) < 1e-9, `t=${t}: server ${g.posisi.x} vs klien ${x}`);
  }
});

test('gerak: kembali ke titik muncul (jatuh dari dunia) diterima dari mana pun', () => {
  const g = new P.PenjagaGerak('oola', 0);
  g.klaim(16, 0, 0);
  assert.equal(g.klaim(P.SPAWN.x + 1, P.SPAWN.z - 1, 10), 'spawn');
  assert.deepEqual([g.posisi.x, g.posisi.z], [P.SPAWN.x + 1, P.SPAWN.z - 1]);
});

test('gerak: duduk ke kursi terjauh (±3,4 m) diterima seketika setelah berjalan', () => {
  const g = new P.PenjagaGerak('oola', 0);
  g.klaim(10, 10, 0);
  for (let t = 80; t <= 2000; t += 80) { g.klaim(10 - 5.4 * t / 1000, 10, t); g.majukan(t); }
  const x0 = g.posisi.x;
  g.klaim(x0 - 3.41, 10, 2010);
  g.majukan(2010);
  assert.ok(Math.abs(g.posisi.x - (x0 - 3.41)) < 1e-9);
});

test('gerak: batas dunia per Spot — Braga lebih panjang dari cincin 17 m', () => {
  for (const room of Object.keys(P.RUANG)) {
    const g = new P.PenjagaGerak(room, 0);
    g.klaim(1e5, 0, 0);
    assert.ok(Math.abs(Math.hypot(g.posisi.x, g.posisi.z) - P.RUANG[room].jari) < 1e-9, room);
  }
  const sudutBraga = { x: 7.78, z: 17.58 };   // sudut dalam dinding Braga
  const braga = new P.PenjagaGerak('spot:braga', 0);
  braga.klaim(sudutBraga.x, sudutBraga.z, 0);
  assert.deepEqual([braga.posisi.x, braga.posisi.z], [sudutBraga.x, sudutBraga.z]);
  const oola = new P.PenjagaGerak('oola', 0);
  oola.klaim(sudutBraga.x, sudutBraga.z, 0);
  assert.ok(Math.hypot(oola.posisi.x, oola.posisi.z) < Math.hypot(sudutBraga.x, sudutBraga.z));
});

test('bacaGerak menolak semua yang bukan angka hingga', () => {
  for (const buruk of [undefined, null, 'x', 5, [], [1, 2], { x: '1', z: 2 }, { x: 1 }, { x: NaN, z: 0 },
    { x: Infinity, z: 0 }, { x: 0, z: -Infinity }, { x: 2e6, z: 0 }, Buffer.from('xx')]) {
    assert.equal(P.bacaGerak(buruk), null, JSON.stringify(buruk));
  }
  assert.deepEqual(P.bacaGerak({ x: 1, z: 2, facing: 'utara' }), { x: 1, z: 2 });
  const arah = P.bacaGerak({ x: 1, z: 2, facing: 7 }).facing;
  assert.ok(arah > -Math.PI && arah <= Math.PI && Math.abs(arah - (7 - 2 * Math.PI)) < 1e-12);
});

// ── Laju ─────────────────────────────────────────────
test('ember: kapasitas habis lalu terisi sesuai laju', () => {
  const e = new P.Ember({ kapasitas: 5, perDetik: 0.5 }, 0);
  for (let i = 0; i < 5; i++) assert.equal(e.ambil(0), true);
  assert.equal(e.ambil(0), false);
  assert.equal(e.ambil(1900), false);
  assert.equal(e.ambil(2000), true);
});

test('pelanggaran: lebih dari batas dalam satu jendela = banjir; jendela baru mulai dari nol', () => {
  const h = new P.HitungPelanggaran(0);
  for (let i = 0; i < P.PELANGGARAN.batas; i++) assert.equal(h.catat(i), false);
  assert.equal(h.catat(P.PELANGGARAN.batas), true);
  const h2 = new P.HitungPelanggaran(0);
  h2.catat(0, P.PELANGGARAN.batas);
  assert.equal(h2.catat(P.PELANGGARAN.jendelaMs + 1), false);
});

test('laju: klien sah (12,5 gerak/dtk, tumpukan 10 dtk setelah macet) tidak mendekati banjir', () => {
  const l = P.buatLaju(0);
  let dibuang = 0;
  for (let i = 0; i < 125; i++) if (!l.ember.move.ambil(10_000)) dibuang++;   // 10 dtk tertahan, tiba bersamaan
  assert.ok(dibuang < P.PELANGGARAN.batas / 2, `${dibuang} dibuang`);
});

// ── Teks ─────────────────────────────────────────────
test('nama: kendali, pembalik arah, lebar-nol, dan Zalgo dibersihkan; panjang dipotong', () => {
  const nama = `  <b>Ad${kar(0x202e)}min</b>\n\tX${kar(0x200b)}${kar(0x0000)}  `;
  assert.equal(P.bersihkanNama(nama), '<b>Admin</b> X');
  const zalgo = `Z${kar(0x301, 0x302, 0x303, 0x304)}`;
  assert.equal(Array.from(P.bersihkanNama(zalgo)).length, 3);
  assert.equal(Array.from(P.bersihkanNama('ab'.repeat(5000))).length, P.BATAS_TEKS.nama);
  assert.equal(P.bersihkanNama(`${kar(0x3164)}${kar(0x200e)} `), '');
  assert.equal(P.bersihkanNama({ toString: () => 'x' }), '');
  // Emoji gabungan tetap utuh: ZWJ tidak dibuang.
  const keluarga = kar(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467);
  assert.equal(P.bersihkanNama(keluarga), keluarga);
});

test('pesan: tipe salah, kosong, dan kepanjangan ditolak dengan alasan', () => {
  assert.deepEqual(P.bersihkanPesan({}), { ok: false, alasan: 'payload-tidak-sah' });
  assert.deepEqual(P.bersihkanPesan(`  ${kar(0x200b)} `), { ok: false, alasan: 'kosong' });
  assert.deepEqual(P.bersihkanPesan('x'.repeat(101)), { ok: false, alasan: 'terlalu-panjang' });
  assert.deepEqual(P.bersihkanPesan('x'.repeat(100_000)), { ok: false, alasan: 'terlalu-panjang' });
  // 100 emoji = 200 unit UTF-16: dihitung sebagai 100 huruf, bukan 200.
  assert.equal(P.bersihkanPesan(kar(0x1f600).repeat(100)).ok, true);
  assert.deepEqual(P.bersihkanPesan(`halo${kar(0x0007)}\ndunia`), { ok: true, teks: 'halo dunia' });
});

test('nama tamu: bentuk "Tamu 1234" buatan klien dipertahankan, selain itu diganti server', () => {
  const acak = () => 42;
  assert.equal(P.namaTamu('Tamu 1234', acak), 'Tamu 1234');
  for (const usulan of ['Admin', 'Tamu 12345', 'tamu 1234', 'Tamu 1234 hubungi aku', undefined, 5]) {
    assert.equal(P.namaTamu(usulan, acak), 'Tamu 1042', String(usulan));
  }
});

test('warna: hanya bilangan bulat 0x000000–0xffffff; selain itu server memakai warna bawaan', () => {
  assert.equal(P.warnaSah(0x8b5cf6), 0x8b5cf6);
  assert.equal(P.warnaSah(0), 0);
  for (const c of [-1, 0x1000000, 1.5, '0x8b5cf6', '#fff', NaN, Infinity, null, undefined, {}, [1]]) {
    assert.equal(P.warnaSah(c), null, String(c));
  }
});

test('RTC: hanya bidang SDP/ICE yang dikenal yang diteruskan', () => {
  assert.deepEqual(P.sdpSah({ type: 'offer', sdp: 'v=0', evil: 1 }, 'offer'), { type: 'offer', sdp: 'v=0' });
  assert.equal(P.sdpSah({ type: 'answer', sdp: 'v=0' }, 'offer'), null);
  assert.equal(P.sdpSah({ type: 'offer', sdp: 'x'.repeat(16385) }, 'offer'), null);
  assert.deepEqual(P.iceSah({ candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0, x: 1 }),
    { candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0 });
  assert.deepEqual(P.iceSah({ candidate: '' }), { candidate: '', sdpMid: null, sdpMLineIndex: null });
  assert.equal(P.iceSah({ candidate: 'a', sdpMLineIndex: -1 }), null);
  assert.equal(P.iceSah('candidate'), null);
});

// ── Identitas ────────────────────────────────────────
const RAHASIA = 'rahasia-uji-hs256-bukan-produksi';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function tokenHS(klaim, { rahasia = RAHASIA, header = { alg: 'HS256', typ: 'JWT' } } = {}) {
  const data = `${b64(header)}.${b64(klaim)}`;
  return `${data}.${crypto.createHmac('sha256', rahasia).update(data).digest('base64url')}`;
}
function tokenAsim(klaim, kunciPrivat, { alg = 'ES256', kid = 'k1' } = {}) {
  const data = `${b64({ alg, kid, typ: 'JWT' })}.${b64(klaim)}`;
  const opsi = alg === 'ES256' ? { key: kunciPrivat, dsaEncoding: 'ieee-p1363' } : kunciPrivat;
  return `${data}.${crypto.sign('sha256', Buffer.from(data), opsi).toString('base64url')}`;
}
const detik = () => Math.floor(Date.now() / 1000);
const klaimWarga = (lain = {}) => ({
  sub: '6b7e3c1a-0d4f-4d1e-9f7a-2b8c9d0e1f2a', aud: 'authenticated', role: 'authenticated',
  exp: detik() + 3600, iat: detik(), email: 'sari@contoh.id', user_metadata: { full_name: 'Sari Nusantara' }, ...lain,
});

test('identitas: id publik acak 12 karakter base64url, tidak pernah berulang', () => {
  const ids = new Set(Array.from({ length: 2000 }, () => I.idPublikBaru()));
  assert.equal(ids.size, 2000);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{12}$/);
});

test('identitas: tanpa rahasia maupun JWKS semua koneksi tamu (gagal-tertutup)', async () => {
  const v = I.buatPemverifikasi({});
  assert.equal(v.aktif, false);
  assert.deepEqual(await v.verifikasi(tokenHS(klaimWarga())), { ok: false, alasan: 'verifikasi-belum-aktif' });
  assert.deepEqual(await v.verifikasi(undefined), { ok: false, alasan: 'tanpa-login' });
});

test('identitas HS256: hanya token pengguna asli dengan tanda tangan benar yang lolos', async () => {
  const v = I.buatPemverifikasi({ SUPABASE_JWT_SECRET: RAHASIA, SUPABASE_URL: 'https://proyek.supabase.co/' });
  const iss = 'https://proyek.supabase.co/auth/v1';
  const sah = await v.verifikasi(tokenHS(klaimWarga({ iss })));
  assert.deepEqual(sah, { ok: true, sub: klaimWarga().sub, nama: 'Sari Nusantara' });

  const kasus = [
    ['tanda tangan rahasia lain', tokenHS(klaimWarga({ iss }), { rahasia: 'tebakan' }), 'token-tidak-sah'],
    ['alg none', `${b64({ alg: 'none' })}.${b64(klaimWarga({ iss }))}.`, 'token-tidak-sah'],
    ['alg none bertanda', `${b64({ alg: 'none' })}.${b64(klaimWarga({ iss }))}.AA`, 'token-tidak-sah'],
    ['kedaluwarsa', tokenHS(klaimWarga({ iss, exp: detik() - 120 })), 'token-kedaluwarsa'],
    ['tanpa exp', tokenHS(klaimWarga({ iss, exp: undefined })), 'token-tidak-sah'],
    ['kunci anon (role anon)', tokenHS({ iss, role: 'anon', exp: detik() + 3600 }), 'token-tidak-sah'],
    // aud benar tapi role bukan pengguna: hanya pemeriksaan role yang menolaknya.
    ['role service_role', tokenHS(klaimWarga({ iss, role: 'service_role' })), 'token-tidak-sah'],
    ['aud lain', tokenHS(klaimWarga({ iss, aud: 'lain' })), 'token-tidak-sah'],
    ['penerbit lain', tokenHS(klaimWarga({ iss: 'https://penyerang.supabase.co/auth/v1' })), 'token-tidak-sah'],
    ['masuk anonim', tokenHS(klaimWarga({ iss, is_anonymous: true })), 'akun-anonim'],
    ['nbf di masa depan', tokenHS(klaimWarga({ iss, nbf: detik() + 3600 })), 'token-tidak-sah'],
    ['sub bukan id', tokenHS(klaimWarga({ iss, sub: '../../x' })), 'token-tidak-sah'],
    ['bukan JWT', 'bukan.token', 'token-tidak-sah'],
    ['bukan string', { token: 1 }, 'token-tidak-sah'],
    ['kepanjangan', 'a'.repeat(9000), 'token-tidak-sah'],
  ];
  for (const [nama, token, alasan] of kasus) {
    assert.deepEqual(await v.verifikasi(token), { ok: false, alasan }, nama);
  }
});

test('identitas: nama tampil dari klaim token, bukan dari payload klien', async () => {
  const v = I.buatPemverifikasi({ SUPABASE_JWT_SECRET: RAHASIA });
  const tanpaNama = await v.verifikasi(tokenHS(klaimWarga({ user_metadata: {}, email: 'budi.s@contoh.id' })));
  assert.equal(tanpaNama.nama, 'budi.s');
  const nakal = await v.verifikasi(tokenHS(klaimWarga({ user_metadata: { full_name: `A${kar(0x202e)}B\n${'x'.repeat(80)}` } })));
  assert.equal(nakal.nama, `AB ${'x'.repeat(29)}`);
});

function jwksPalsu(kunciPublik, { kid = 'k1', gagal = false } = {}) {
  let panggil = 0;
  const fetch = async () => {
    panggil++;
    if (gagal) throw new Error('jaringan putus');
    return { ok: true, status: 200, json: async () => ({ keys: [{ ...kunciPublik.export({ format: 'jwk' }), kid, use: 'sig' }] }) };
  };
  return { fetch, get panggil() { return panggil; } };
}

test('identitas JWKS: ES256 dan RS256 dari kunci Supabase lolos; kunci lain dan HS256 ditolak', async () => {
  const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const lain = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jw = jwksPalsu(ec.publicKey);
  const v = I.buatPemverifikasi({ SUPABASE_JWKS_URL: 'https://proyek.supabase.co/auth/v1/.well-known/jwks.json' }, { fetch: jw.fetch, log: () => {} });
  assert.equal((await v.verifikasi(tokenAsim(klaimWarga(), ec.privateKey))).ok, true);
  assert.deepEqual(await v.verifikasi(tokenAsim(klaimWarga(), lain.privateKey)), { ok: false, alasan: 'token-tidak-sah' });
  // Hanya JWKS yang dipasang: HS256 tidak punya rahasia, jadi tidak ada yang bisa memeriksanya.
  assert.deepEqual(await v.verifikasi(tokenHS(klaimWarga())), { ok: false, alasan: 'token-tidak-sah' });
  // Kebingungan algoritma klasik: HS256 bertanda kunci PUBLIK (yang siapa pun bisa
  // ambil dari JWKS) atau kunci kosong. Tanpa SUPABASE_JWT_SECRET, HS256 tidak pernah sah.
  const publikJwk = JSON.stringify(ec.publicKey.export({ format: 'jwk' }));
  for (const rahasia of ['', publikJwk, ec.publicKey.export({ format: 'pem', type: 'spki' })]) {
    assert.deepEqual(await v.verifikasi(tokenHS(klaimWarga(), { rahasia })), { ok: false, alasan: 'token-tidak-sah' });
  }
  // Header mengaku RS256 dengan kunci EC: kebingungan algoritma ditolak.
  const bingung = tokenAsim(klaimWarga(), ec.privateKey).split('.');
  bingung[0] = b64({ alg: 'RS256', kid: 'k1' });
  assert.equal((await v.verifikasi(bingung.join('.'))).ok, false);

  const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const vr = I.buatPemverifikasi({ SUPABASE_JWKS_URL: 'https://x/jwks' }, { fetch: jwksPalsu(rsa.publicKey).fetch, log: () => {} });
  assert.equal((await vr.verifikasi(tokenAsim(klaimWarga(), rsa.privateKey, { alg: 'RS256' }))).ok, true);
});

test('identitas JWKS: kid acak tidak membuat server membombardir Supabase; JWKS mati = gagal-tertutup', async () => {
  const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  let jam = 1_000_000;
  const jw = jwksPalsu(ec.publicKey);
  const v = I.buatPemverifikasi({ SUPABASE_JWKS_URL: 'https://x/jwks' }, { fetch: jw.fetch, sekarangMs: () => jam, log: () => {} });
  for (let i = 0; i < 50; i++) await v.verifikasi(tokenAsim(klaimWarga(), ec.privateKey, { kid: `acak-${i}` }));
  assert.equal(jw.panggil, 1, 'kid tak dikenal memicu paling banyak satu ambil per jeda');
  jam += 31_000;
  await v.verifikasi(tokenAsim(klaimWarga(), ec.privateKey, { kid: 'acak-lagi' }));
  assert.equal(jw.panggil, 2);

  const mati = jwksPalsu(ec.publicKey, { gagal: true });
  const vm = I.buatPemverifikasi({ SUPABASE_JWKS_URL: 'https://x/jwks' }, { fetch: mati.fetch, log: () => {} });
  assert.deepEqual(await vm.verifikasi(tokenAsim(klaimWarga(), ec.privateKey)), { ok: false, alasan: 'verifikasi-gagal' });
});
