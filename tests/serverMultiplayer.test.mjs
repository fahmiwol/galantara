// ═══════════════════════════════════════════════════════
// tests/serverMultiplayer.test.mjs — server multiplayer SUNGGUHAN
//
// Setiap uji menyalakan galantara-server/index.js --local di port acak dan
// berbicara dengannya lewat klien Socket.IO yang sama dengan yang dipakai
// browser (vendor/socket.io.4.8.3.min.js). Tidak ada tiruan server.
//
// Yang dijaga (ADR-0023): identitas milik server, tamu diputuskan server,
// batas laju, batas gerak, dan validasi input. Masing-masing dibuktikan merah
// dengan mutasi (tools/mutasi-multiplayer.mjs).
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import http from 'node:http';

const root = new URL('../', import.meta.url);
const entry = new URL('galantara-server/index.js', root);
const requireServer = createRequire(entry);
const P = createRequire(import.meta.url)('../galantara-server/penjaga.cjs');

let dependencies = true;
try { requireServer.resolve('express'); requireServer.resolve('socket.io'); requireServer.resolve('ws'); }
catch { dependencies = false; }
const LEWATI = dependencies ? false : 'Install server dependencies: npm ci --prefix galantara-server';

// ── Klien ────────────────────────────────────────────
let ioKlien = null;
async function muatKlien() {
  if (ioKlien) return ioKlien;
  // Node 20 (CI) belum punya WebSocket global; `ws` ikut terpasang bersama socket.io.
  if (typeof globalThis.WebSocket === 'undefined') globalThis.WebSocket = requireServer('ws');
  const mod = await import(new URL('vendor/socket.io.4.8.3.min.js', root).href);
  ioKlien = globalThis.io ?? mod.default;
  return ioKlien;
}

// ── Server ───────────────────────────────────────────
function envUji(tambahan) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('SUPABASE_')) delete env[k];
  return { ...env, GALANTARA_LOCAL_PORT: '0', ...tambahan };
}

async function nyalakan(tambahanEnv = {}) {
  const child = spawn(process.execPath, [fileURLToPath(entry), '--local'], {
    cwd: fileURLToPath(root),
    env: envUji(tambahanEnv),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let keluaran = '';
  let galat = '';
  child.stderr.on('data', (c) => { galat += c; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server uji tidak siap dalam 10 detik')), 10000);
    child.once('error', (e) => { clearTimeout(timer); reject(e); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server keluar ${code}: ${galat}`)); });
    child.stdout.on('data', (c) => {
      keluaran += c;
      // Baris status verifikasi dicetak sesudah port; tunggu keduanya.
      const m = keluaran.match(/running on :(\d+)/);
      if (m && /Verifikasi login/.test(keluaran)) { clearTimeout(timer); resolve(Number(m[1])); }
    });
  });
  const semuaKlien = [];
  return {
    port,
    url: `http://127.0.0.1:${port}`,
    semuaKlien,
    get galat() { return galat; },
    get keluaran() { return keluaran; },
    hidup: () => child.exitCode === null && child.signalCode === null,
    async matikan() {
      for (const s of semuaKlien) s.disconnect();
      if (child.exitCode !== null || child.signalCode !== null) return;
      const tutup = once(child, 'close');
      child.kill(); // Hanya proses anak yang dibuat uji ini.
      await tutup;
    },
  };
}

/** Server hidup selama `fn`, lalu SELALU dimatikan — lulus atau gagal. */
async function denganServer(env, fn) {
  const srv = await nyalakan(env);
  try {
    await fn(srv);
  } finally {
    await srv.matikan();
  }
}

const EVENT = ['welcome', 'players', 'player_join', 'player_move', 'player_leave', 'chat', 'count', 'rejected',
  'rtc_offer', 'rtc_answer', 'rtc_ice'];

/** Klien dengan catatan semua yang diterima dan `roster` — pandangannya atas
 *  pemain lain, dibangun dengan aturan yang sama seperti RemotePlayers. */
async function klien(srv, { token } = {}) {
  const io = await muatKlien();
  const s = io(srv.url, {
    path: '/mp/socket.io', transports: ['websocket'], forceNew: true, reconnection: false,
    auth: token ? { token } : {},
  });
  srv.semuaKlien.push(s);
  s.log = Object.fromEntries(EVENT.map((e) => [e, []]));
  s.semua = [];
  s.gerak = [];
  s.roster = new Map();
  s.putus = null;
  s.onAny((ev, ...args) => {
    s.semua.push([ev, ...args]);
    s.log[ev]?.push(args[0]);
  });
  s.on('players', (m) => { s.roster = new Map(Object.entries(m).map(([k, v]) => [k, { ...v }])); });
  s.on('player_join', (d) => { s.roster.set(d.socketId, { ...d }); });
  s.on('player_move', (d) => {
    s.gerak.push({ t: Date.now(), ...d });
    const p = s.roster.get(d.socketId);
    if (p) Object.assign(p, { x: d.x, z: d.z, facing: d.facing });
  });
  s.on('player_leave', (d) => { s.roster.delete(d.socketId); });
  s.on('disconnect', (alasan) => { s.putus = alasan; });
  await new Promise((resolve, reject) => {
    s.once('connect', resolve);
    s.once('connect_error', reject);
  });
  return s;
}

/** Klien yang sudah masuk room. `idp` = id publiknya menurut server. */
async function masuk(srv, { room = 'oola', token, name = 'Tamu 1234', color, guest, id, pos } = {}) {
  const s = await klien(srv, { token });
  s.emit('join', { room, name, color, guest, id });
  await sampai(() => s.log.welcome.length > 0, 'welcome');
  s.idp = s.log.welcome.at(-1).socketId;
  if (pos) s.emit('move', pos);
  return s;
}

async function sampai(cek, apa, ms = 4000) {
  const akhir = Date.now() + ms;
  while (!cek()) {
    if (Date.now() > akhir) throw new Error(`Menunggu "${apa}" lebih dari ${ms} ms`);
    await jeda(10);
  }
}
const jeda = (ms) => new Promise((r) => setTimeout(r, ms));
const ditolak = (s, event, reason) => s.log.rejected.some((r) => r.event === event && r.reason === reason);

// ── Token ────────────────────────────────────────────
const RAHASIA = 'rahasia-uji-hs256-bukan-produksi';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function tokenHS(klaim, rahasia = RAHASIA) {
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(klaim)}`;
  return `${data}.${crypto.createHmac('sha256', rahasia).update(data).digest('base64url')}`;
}
function tokenES(klaim, kunciPrivat, kid = 'k1') {
  const data = `${b64({ alg: 'ES256', kid, typ: 'JWT' })}.${b64(klaim)}`;
  return `${data}.${crypto.sign('sha256', Buffer.from(data), { key: kunciPrivat, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
const detik = () => Math.floor(Date.now() / 1000);
const SUB = {
  a: '0a0a0a0a-1111-4111-8111-111111111111',
  b: '0b0b0b0b-2222-4222-8222-222222222222',
  v: '0c0c0c0c-3333-4333-8333-333333333333',
};
const klaimWarga = (sub, lain = {}) => ({
  sub, aud: 'authenticated', role: 'authenticated', exp: detik() + 3600, iat: detik(),
  email: `${sub.slice(0, 8)}@contoh.id`, user_metadata: { full_name: 'Sari Nusantara' }, ...lain,
});
const VERIF = { SUPABASE_JWT_SECRET: RAHASIA };

// ═══════════════════════════════════════════════════════

test('join dengan id pemain lain tidak mengeluarkan korban dari roster', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const korban = await masuk(srv, { token: tokenHS(klaimWarga(SUB.v)), id: SUB.v, pos: { x: 3, z: 3 } });
    const pengamat = await masuk(srv, { name: 'Tamu 2222' });
    await sampai(() => pengamat.roster.has(korban.idp), 'pengamat melihat korban');

    // Cara lama "mengusir": mengaku id akun korban, id publiknya, atau socket.id-nya.
    const penyerang = [];
    for (const curian of [SUB.v, korban.idp, korban.id]) {
      penyerang.push(await masuk(srv, { id: curian, guest: false, name: 'Tamu 3333' }));
    }
    // Akun LAIN yang terverifikasi, mengirim id akun korban.
    penyerang.push(await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)), id: SUB.v }));
    await sampai(() => penyerang.every((p) => pengamat.roster.has(p.idp)), 'semua penyerang masuk');

    assert.ok(pengamat.roster.has(korban.idp), 'korban masih di roster');
    assert.ok(!pengamat.log.player_leave.some((d) => d.socketId === korban.idp), 'tidak ada player_leave untuk korban');
    korban.emit('move', { x: 4, z: 3 });
    await sampai(() => pengamat.roster.get(korban.idp)?.x === 4, 'gerak korban tetap diteruskan');
  });
});

test('klien lain hanya menerima id publik acak — bukan socket.id, id klien, atau id akun', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const EMAIL = 'rahasia.sari@contoh.id';
    const ID_KLIEN = 'guest:akun-rahasia-99';
    const pengamatAwal = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)) });
    const korban = await masuk(srv, {
      token: tokenHS(klaimWarga(SUB.v, { email: EMAIL })), id: ID_KLIEN, pos: { x: 1, z: 1 },
    });
    const pengamatAkhir = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)) });
    korban.emit('move', { x: 2, z: 2 });
    korban.emit('chat', { msg: 'halo semua' });
    korban.emit('rtc_offer', { to: pengamatAwal.idp, offer: { type: 'offer', sdp: 'v=0' } });
    await sampai(() => pengamatAwal.log.chat.length && pengamatAkhir.log.chat.length && pengamatAwal.log.rtc_offer.length
      && pengamatAkhir.roster.get(korban.idp)?.x === 2 && pengamatAwal.roster.get(korban.idp)?.x === 2,
    'semua jenis pesan korban tiba');

    assert.notEqual(korban.idp, korban.id, 'id publik bukan socket.id');
    const rahasia = [korban.id, ID_KLIEN, SUB.v, EMAIL, 'rahasia.sari'];
    for (const pengamat of [pengamatAwal, pengamatAkhir]) {
      const teks = JSON.stringify(pengamat.semua);
      for (const r of rahasia) assert.ok(!teks.includes(r), `bocor ke pengamat: ${r}`);
      const kunci = [
        ...pengamat.log.players.flatMap((m) => Object.keys(m)),
        ...['player_join', 'player_move', 'chat'].flatMap((e) => pengamat.log[e].map((d) => d.socketId)),
        ...pengamat.log.rtc_offer.map((d) => d.from),
      ];
      assert.ok(kunci.length >= 4);
      for (const k of kunci) assert.match(k, /^[A-Za-z0-9_-]{12}$/);
      assert.ok(kunci.includes(korban.idp));
    }
    // Pengirim melihat id publiknya sendiri di welcome, sama dengan yang dipakai orang lain.
    assert.equal(korban.log.welcome[0].socketId, korban.idp);
  });
});

test('tamu tidak bisa chat maupun voice walau mengaku bukan tamu; warga bisa', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const warga1 = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)) });
    const warga2 = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)) });
    const tamu = await masuk(srv, { guest: false, name: 'Tamu 4444' });
    assert.equal(warga1.log.welcome[0].guest, false);
    assert.equal(tamu.log.welcome[0].guest, true);
    assert.equal(tamu.log.welcome[0].reason, 'tanpa-login');

    tamu.emit('chat', { msg: 'halo dari tamu' });
    tamu.emit('rtc_offer', { to: warga1.idp, offer: { type: 'offer', sdp: 'v=0' } });
    await sampai(() => ditolak(tamu, 'chat', 'tamu') && ditolak(tamu, 'rtc_offer', 'tamu'), 'penolakan dengan alasan');
    assert.match(tamu.log.rejected.find((r) => r.event === 'chat').message, /login/i);

    // Penanda: pesan warga2 dikirim SETELAH pesan tamu diproses server. Kalau
    // pesan tamu diteruskan, ia tiba di warga1 lebih dulu.
    warga2.emit('chat', { msg: 'penanda' });
    await sampai(() => warga1.log.chat.length > 0, 'penanda');
    assert.deepEqual(warga1.log.chat.map((c) => c.msg), ['penanda']);
    assert.equal(warga1.log.rtc_offer.length, 0);
    assert.equal(warga2.log.chat.length, 0, 'pengirim tidak menerima gema pesannya sendiri');

    // Voice antar warga: diteruskan dengan id publik pengirim, bidang asing dibuang.
    warga1.emit('rtc_offer', { to: warga2.idp, offer: { type: 'offer', sdp: 'v=0 uji', bocor: 'x' }, ekstra: 1 });
    await sampai(() => warga2.log.rtc_offer.length === 1, 'offer antar warga');
    assert.deepEqual(warga2.log.rtc_offer[0], { from: warga1.idp, offer: { type: 'offer', sdp: 'v=0 uji' } });
    // Voice KE tamu juga ditolak.
    warga1.emit('rtc_ice', { to: tamu.idp, candidate: { candidate: '' } });
    await sampai(() => ditolak(warga1, 'rtc_ice', 'tujuan-tidak-sah'), 'penolakan voice ke tamu');
    assert.equal(tamu.log.rtc_ice.length, 0);

    // Tamu tetap melihat dan terlihat, dengan tanda tamu dari server.
    assert.ok(tamu.roster.has(warga1.idp));
    await sampai(() => warga1.roster.get(tamu.idp)?.guest === true, 'warga melihat tamu bertanda tamu');
  });
});

test('tanpa kunci verifikasi di env, token yang tampak sah tetap tamu (gagal-tertutup)', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer({}, async (srv) => {
    assert.match(srv.keluaran, /Verifikasi login MATI/);
    const a = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)), name: 'Sari' });
    const b = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)), name: 'Budi' });
    for (const s of [a, b]) {
      assert.equal(s.log.welcome[0].guest, true);
      assert.equal(s.log.welcome[0].reason, 'verifikasi-belum-aktif');
      assert.match(s.log.welcome[0].message, /belum bisa memverifikasi/);
    }
    a.emit('chat', { msg: 'halo' });
    await sampai(() => ditolak(a, 'chat', 'tamu'), 'chat ditolak');
    await jeda(200);
    assert.equal(b.log.chat.length, 0);
    // Nama bebas tidak diterima dari koneksi yang tidak terverifikasi.
    await sampai(() => b.roster.has(a.idp), 'b melihat a');
    assert.match(b.roster.get(a.idp).name, /^Tamu \d{4}$/);
  });
});

test('JWKS: token ES256 bertanda kunci proyek diterima server sungguhan; kunci lain tamu', { skip: LEWATI, timeout: 30000 }, async () => {
  const kunci = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwks = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ keys: [{ ...kunci.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'ES256', use: 'sig' }] }));
  });
  await new Promise((r) => jwks.listen(0, '127.0.0.1', r));
  try {
    const url = `http://127.0.0.1:${jwks.address().port}/auth/v1/.well-known/jwks.json`;
    await denganServer({ SUPABASE_JWKS_URL: url }, async (srv) => {
      assert.match(srv.keluaran, /Verifikasi login aktif \(JWKS\)/);
      const sah = await masuk(srv, { token: tokenES(klaimWarga(SUB.a), kunci.privateKey), name: 'Nama Karangan' });
      assert.equal(sah.log.welcome[0].guest, false);
      assert.equal(sah.log.welcome[0].name, 'Sari Nusantara', 'nama dari token, bukan dari payload');
      const lain = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const palsu = await masuk(srv, { token: tokenES(klaimWarga(SUB.a), lain.privateKey) });
      assert.equal(palsu.log.welcome[0].guest, true);
      assert.equal(palsu.log.welcome[0].reason, 'token-tidak-sah');
    });
  } finally {
    jwks.close();
  }
});

test('banjir chat dan gerak dibatasi; pelanggar berulang diputus', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const pengobrol = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)) });
    const pengamat = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)) });

    // Chat: 12 pesan sekaligus, hanya 5 yang diteruskan.
    for (let i = 0; i < 12; i++) pengobrol.emit('chat', { msg: `pesan ${i}` });
    await sampai(() => ditolak(pengobrol, 'chat', 'terlalu-cepat'), 'penolakan laju chat');
    await jeda(300);
    assert.deepEqual(pengamat.log.chat.map((c) => c.msg), [0, 1, 2, 3, 4].map((i) => `pesan ${i}`));

    // Gerak: 100 klaim per detik selama 1 detik — siaran tetap ≤ 20 per detik
    // dan posisi terakhir tetap sampai.
    const pejalan = await masuk(srv, { token: tokenHS(klaimWarga(SUB.v)), pos: { x: 0, z: 0 } });
    await sampai(() => pengamat.roster.get(pejalan.idp)?.x === 0, 'pejalan muncul');
    const awal = pengamat.gerak.length;
    const t0 = Date.now();
    for (let i = 1; i <= 100; i++) {
      pejalan.emit('move', { x: i / 25, z: 0 });   // 4 m dalam 1 detik: kecepatan sah
      await jeda(10);
    }
    await sampai(() => pengamat.roster.get(pejalan.idp)?.x === 4, 'posisi terakhir tiba');
    const lama = Date.now() - t0;
    const siaran = pengamat.gerak.slice(awal).filter((g) => g.socketId === pejalan.idp).length;
    assert.ok(siaran <= Math.ceil(lama / P.GERAK.siarMinMs) + 2, `${siaran} siaran dalam ${lama} ms`);
    assert.ok(siaran >= 5, `gerak tetap mengalir (${siaran})`);

    // Pelanggar berulang: 1.000 pesan sekaligus → diputus server.
    const banjir = await masuk(srv, { name: 'Tamu 5555' });
    await sampai(() => pengamat.roster.has(banjir.idp), 'pembanjir masuk');
    for (let i = 0; i < 1000; i++) banjir.emit('move', { x: 1, z: 1 });
    await sampai(() => banjir.putus !== null, 'diputus server');
    assert.equal(banjir.putus, 'io server disconnect');
    assert.ok(ditolak(banjir, 'koneksi', 'banjir'));
    await sampai(() => !pengamat.roster.has(banjir.idp), 'pembanjir hilang dari roster');
    pengobrol.emit('move', { x: 5, z: 5 });
    await sampai(() => pengamat.roster.get(pengobrol.idp)?.x === 5, 'server tetap melayani yang lain');
  });
});

test('teleport mustahil dijepit; muncul, duduk, kembali ke titik muncul, dan batas Spot tetap sah', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const a = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)), pos: { x: 10, z: 5 } });
    const b = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)) });
    // Muncul (warp / sambung ulang): posisi pertama diterima di mana pun di dalam batas.
    await sampai(() => b.roster.get(a.idp)?.x === 10, 'posisi muncul diterima');

    // Duduk ke kursi terjauh (± 3,4 m) — diterima seketika, tanpa langkah antara.
    let n = b.gerak.length;
    a.emit('move', { x: 13.4, z: 5 });
    await sampai(() => b.gerak.length > n, 'siaran duduk');
    assert.deepEqual([b.gerak[n].x, b.gerak[n].z], [13.4, 5]);

    // Teleport 16 m: siaran pertama dijepit, sisanya ditempuh ≤ kecepatan maksimum.
    n = b.gerak.length;
    const t0 = Date.now();
    a.emit('move', { x: -2.6, z: 5 });
    await sampai(() => b.roster.get(a.idp)?.x === -2.6, 'akhirnya tiba', 8000);
    const lama = Date.now() - t0;
    const jalur = b.gerak.slice(n).filter((g) => g.socketId === a.idp);
    const lompatPertama = Math.hypot(jalur[0].x - 13.4, jalur[0].z - 5);
    assert.ok(lompatPertama <= P.GERAK.cadangan + 0.02, `lompatan pertama ${lompatPertama} m`);
    const minimal = ((16 - P.GERAK.cadangan) / P.GERAK.kecepatanMaks) * 1000;
    assert.ok(lama >= minimal * 0.9, `teleport 16 m ditempuh dalam ${lama} ms (minimal ${minimal.toFixed(0)})`);
    assert.ok(jalur.length >= 5, 'ditempuh bertahap');

    // Kembali ke titik muncul (jatuh dari dunia): seketika dari mana pun.
    n = b.gerak.length;
    a.emit('move', { x: P.SPAWN.x, z: P.SPAWN.z });
    await sampai(() => b.gerak.length > n, 'siaran titik muncul');
    assert.deepEqual([b.gerak[n].x, b.gerak[n].z], [P.SPAWN.x, P.SPAWN.z]);

    // Batas dunia: muncul dan klaim jauh di luar dijepit ke tepi room.
    const tepi = P.RUANG.oola.jari;
    const jauh = await masuk(srv, { name: 'Tamu 9090', pos: { x: 1000, z: 0 } });
    await sampai(() => b.roster.get(jauh.idp)?.x === tepi, 'muncul dijepit di tepi');
    jauh.emit('move', { x: 1000, z: 1 });
    jauh.emit('move', { x: 0, z: -1e5 });
    await sampai(() => b.gerak.filter((g) => g.socketId === jauh.idp).length >= 3, 'klaim luar batas disiarkan');
    await jeda(200);
    for (const g of b.gerak.filter((m) => m.socketId === jauh.idp)) {
      assert.ok(Math.hypot(g.x, g.z) <= tepi + 0.01, `${g.x},${g.z} di luar batas`);
    }

    // Batas per Spot: sudut dalam Braga (19,2 m dari pusat) sah di Braga.
    const c = await masuk(srv, { room: 'spot:braga', token: tokenHS(klaimWarga(SUB.v)), pos: { x: 7.78, z: 17.58 } });
    const d = await masuk(srv, { room: 'spot:braga', name: 'Tamu 6060' });
    await sampai(() => d.roster.has(c.idp), 'd melihat c');
    await sampai(() => d.roster.get(c.idp).z === 17.58, 'sudut Braga diterima');
    assert.equal(d.roster.get(c.idp).x, 7.78);
  });
});

test('input salah tipe, kepanjangan, dan room tak dikenal ditolak tanpa crash', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const pengamat = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)) });

    // join: tiap varian di koneksinya sendiri, supaya penolakannya terlihat satu per satu.
    const varianJoin = [
      [[], 'payload-tidak-sah'],
      [['oola'], 'payload-tidak-sah'],
      [[{ room: 42 }], 'room-tidak-dikenal'],
      [[{ room: 'spot:atlantis' }], 'room-tidak-dikenal'],
      [[{ room: '__proto__' }], 'room-tidak-dikenal'],
      [[{ room: 'constructor' }], 'room-tidak-dikenal'],
    ];
    for (const [args, alasan] of varianJoin) {
      const x = await klien(srv, {});
      x.emit('join', ...args);
      await sampai(() => ditolak(x, 'join', alasan), `join ${JSON.stringify(args)} → ${alasan}`);
      x.emit('sync', { room: 'oola' });
      await jeda(50);
      assert.equal(x.log.players.length, 0, 'yang gagal masuk tidak mendapat daftar pemain');
    }

    // move: sampah tidak pernah sampai ke pemain lain.
    const y = await masuk(srv, { name: 'Tamu 6666', pos: { x: 1, z: 1 } });
    for (const sampah of [undefined, null, 'x', 7, [1, 2], { x: '1', z: 2 }, { x: 1 }, { x: NaN, z: 0 },
      { x: 1e308, z: 0 }, { x: 1, z: 2, facing: 'utara', lain: { dalam: true } }]) {
      if (sampah === undefined) y.emit('move'); else y.emit('move', sampah);
    }
    y.emit('move', { x: 2, z: 2 });
    await sampai(() => pengamat.roster.get(y.idp)?.x === 2, 'gerak sah sesudah sampah');
    for (const g of pengamat.gerak.filter((m) => m.socketId === y.idp)) {
      assert.deepEqual(Object.keys(g).sort(), ['facing', 'socketId', 't', 'x', 'z']);
      for (const v of [g.x, g.z, g.facing]) assert.ok(Number.isFinite(v));
    }

    // chat: tipe salah, kosong, kepanjangan — juga satu koneksi per varian.
    const varianChat = [
      [[], 'payload-tidak-sah'],
      [[{ msg: { teks: 'x' } }], 'payload-tidak-sah'],
      [[{ msg: '   ' }], 'kosong'],
      [[{ msg: 'x'.repeat(101) }], 'terlalu-panjang'],
    ];
    for (const [args, alasan] of varianChat) {
      const w = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)) });
      w.emit('chat', ...args);
      await sampai(() => ditolak(w, 'chat', alasan), `chat ${JSON.stringify(args).slice(0, 40)} → ${alasan}`);
    }
    // Lebih dari batas pesan socket.io (64 KB): koneksinya ditutup, servernya tidak.
    const raksasa = await masuk(srv, { token: tokenHS(klaimWarga(SUB.a)) });
    raksasa.emit('chat', { msg: 'x'.repeat(70 * 1024) });
    await sampai(() => raksasa.putus !== null, 'koneksi pesan raksasa ditutup');

    // rtc: tujuan dan isi sampah (penolakan dibatasi sekali per jenis per detik,
    // jadi satu koneksi per varian).
    const v1 = await masuk(srv, { token: tokenHS(klaimWarga(SUB.v)) });
    v1.emit('rtc_offer', null);
    v1.emit('rtc_offer', { to: 'constructor', offer: { type: 'offer', sdp: 'v=0' } });
    await sampai(() => ditolak(v1, 'rtc_offer', 'tujuan-tidak-sah'), 'rtc tujuan sampah');
    const v2 = await masuk(srv, { token: tokenHS(klaimWarga(SUB.v)) });
    v2.emit('rtc_offer', { to: pengamat.idp, offer: 'bukan-sdp' });
    await sampai(() => ditolak(v2, 'rtc_offer', 'payload-tidak-sah'), 'rtc isi sampah');
    assert.equal(pengamat.log.rtc_offer.length, 0);

    // Nama: tamu tidak bisa memilih nama bebas; warga dari token, dibersihkan.
    await sampai(() => pengamat.roster.has(y.idp), 'y terlihat');
    const panjang = await masuk(srv, { name: 'x'.repeat(10000) });
    const bidi = await masuk(srv, {
      token: tokenHS(klaimWarga(SUB.a, { user_metadata: { full_name: `Ad${String.fromCodePoint(0x202e)}min\n${'y'.repeat(60)}` } })),
    });
    await sampai(() => pengamat.roster.has(panjang.idp) && pengamat.roster.has(bidi.idp), 'nama terlihat');
    assert.match(pengamat.roster.get(panjang.idp).name, /^Tamu \d{4}$/);
    assert.equal(pengamat.roster.get(bidi.idp).name, `Admin ${'y'.repeat(26)}`);

    // Server tetap hidup, tanpa jejak galat, dan tetap melayani.
    const kesehatan = await fetch(`${srv.url}/health`, { signal: AbortSignal.timeout(5000) });
    assert.equal(kesehatan.status, 200);
    await kesehatan.arrayBuffer();
    assert.ok(srv.hidup());
    assert.equal(srv.galat, '');
  });
});

test('sync tidak membocorkan daftar pemain room lain', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const diBogor = await masuk(srv, { room: 'spot:bogor', name: 'Tamu 7777', pos: { x: 1, z: 1 } });
    const pengintip = await klien(srv, {});
    pengintip.emit('sync', { room: 'spot:bogor' });
    pengintip.emit('join', { room: 'oola', name: 'Tamu 8888' });
    await sampai(() => pengintip.log.welcome.length > 0, 'pengintip masuk oola');
    pengintip.emit('sync', { room: 'spot:bogor' });
    await sampai(() => pengintip.log.players.length >= 2, 'jawaban sync');
    for (const daftar of pengintip.log.players) assert.ok(!Object.hasOwn(daftar, diBogor.idp));
    assert.ok(pengintip.log.welcome.every((w) => w.room === 'oola'));
  });
});

test('dua tab akun yang sama tetap terlihat; tab yang putus diganti koneksi baru akun itu', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    const tokenV = tokenHS(klaimWarga(SUB.v));
    const pengamat = await masuk(srv, { token: tokenHS(klaimWarga(SUB.b)) });
    const tab1 = await masuk(srv, { token: tokenV, pos: { x: 1, z: 1 } });
    const tab2 = await masuk(srv, { token: tokenV, pos: { x: 2, z: 2 } });
    await sampai(() => pengamat.roster.has(tab1.idp) && pengamat.roster.has(tab2.idp), 'dua tab terlihat');

    // Tab1 putus tidak wajar (sinyal hilang): tetap di roster selama tenggat.
    tab1.io.engine.close();
    await sampai(() => tab1.putus !== null, 'tab1 putus');
    await jeda(300);
    assert.ok(pengamat.roster.has(tab1.idp), 'masih dalam tenggat');
    // Akun yang sama menyambung lagi: hantu tab1 langsung diganti; tab2 yang hidup tidak disentuh.
    const tab3 = await masuk(srv, { token: tokenV, pos: { x: 3, z: 3 } });
    await sampai(() => !pengamat.roster.has(tab1.idp), 'hantu tab1 diganti');
    assert.ok(pengamat.roster.has(tab2.idp) && pengamat.roster.has(tab3.idp));

    // Tamu tidak bisa membuktikan identitasnya: tidak ada penggantian lintas koneksi.
    const tamu1 = await masuk(srv, { name: 'Tamu 1111' });
    await sampai(() => pengamat.roster.has(tamu1.idp), 'tamu1 terlihat');
    tamu1.io.engine.close();
    await sampai(() => tamu1.putus !== null, 'tamu1 putus');
    const tamu2 = await masuk(srv, { name: 'Tamu 1111' });
    await sampai(() => pengamat.roster.has(tamu2.idp), 'tamu2 terlihat');
    assert.ok(pengamat.roster.has(tamu1.idp), 'hantu tamu menunggu tenggatnya sendiri');

    // Keluar dengan sengaja (warp, logout): langsung hilang, tanpa tenggat 8 detik.
    const t0 = Date.now();
    tab2.disconnect();
    await sampai(() => !pengamat.roster.has(tab2.idp), 'keluar sengaja', 2000);
    assert.ok(Date.now() - t0 < 2000);
  });
});

test('klien sungguhan (src/multiplayer/Socket.js) saling melihat, bergerak, chat, dan menerima penolakan', { skip: LEWATI, timeout: 30000 }, async () => {
  await denganServer(VERIF, async (srv) => {
    await muatKlien();
    globalThis.window = { location: { origin: srv.url } };
    const { MultiplayerSocket } = await import('../src/multiplayer/Socket.js');
    const buat = () => {
      const mp = new MultiplayerSocket();
      mp.log = Object.fromEntries(['welcome', 'players', 'player_join', 'player_move', 'chat', 'rejected'].map((e) => [e, []]));
      for (const ev of Object.keys(mp.log)) mp.on(ev, (d) => mp.log[ev].push(d));
      return mp;
    };
    const tamu = buat();
    const warga = buat();
    const lihat = (mp, id) => mp.log.players.some((m) => Object.hasOwn(m, id)) || mp.log.player_join.some((d) => d.socketId === id);
    try {
      tamu.setSpawnSnapshot(1, 1, 0);
      tamu.connect({ room: 'oola', name: 'Tamu 1234', color: 0x9ca3af, guest: true });
      warga.setSpawnSnapshot(2, 2, 0);
      warga.connect({
        room: 'oola', name: 'Nama Karangan', color: 0x8b5cf6, guest: false,
        ambilToken: async () => tokenHS(klaimWarga(SUB.a)),
      });
      await sampai(() => tamu.log.welcome.length && warga.log.welcome.length, 'welcome kedua klien');
      assert.equal(tamu.isGuest, true);
      assert.equal(warga.isGuest, false);
      assert.match(tamu.guestMessage, /login/i);
      for (const mp of [tamu, warga]) {
        assert.match(mp.id, /^[A-Za-z0-9_-]{12}$/);
        assert.notEqual(mp.id, mp._socket.id);
      }
      await sampai(() => lihat(tamu, warga.id) && lihat(warga, tamu.id), 'saling melihat');

      tamu.emitMove(1.5, 1, 0.5);
      await sampai(() => warga.log.player_move.some((m) => m.socketId === tamu.id && m.x === 1.5), 'gerak tamu tiba');

      tamu.emitChat('halo dari tamu');
      await sampai(() => tamu.log.rejected.some((r) => r.reason === 'tamu'), 'tamu menerima penolakan');
      warga.emitChat('halo juga');
      await sampai(() => tamu.log.chat.length === 1, 'chat warga tiba');
      assert.deepEqual(tamu.log.chat[0], { socketId: warga.id, name: 'Sari Nusantara', msg: 'halo juga' });
      assert.equal(warga.log.chat.length, 0, 'tanpa gema');
    } finally {
      tamu.disconnect();
      warga.disconnect();
      delete globalThis.window;
    }
  });
});
