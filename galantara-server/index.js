// ═══════════════════════════════════════════════════════
// Galantara Multiplayer Server
// Socket.io — position sync per room (Oola, Spot, dll.)
// Port: 3005
//
// Server BEROTORITAS atas identitas, status tamu, dan gerak (ADR-0023):
// - tiap koneksi mendapat id publik acak buatan server; id dari klien diabaikan;
// - tamu = tanpa token Supabase yang lolos verifikasi (identitas.cjs);
// - posisi dijepit batas dunia per Spot dan batas kecepatan (penjaga.cjs);
// - setiap jenis pesan punya batas laju; pelanggar berulang diputus.
// Berkas yang dikirim deploy: tools/deploy-mp-galantara.sh (ISI).
// ═══════════════════════════════════════════════════════

const express = require('express');
const http    = require('http');
const crypto  = require('node:crypto');
const { Server } = require('socket.io');
const path = require('path');
const {
  GERAK, LAJU, TOLAK_MIN_MS, BATAS_TEKS, WARNA,
  ruangDikenal, bulat2, bacaGerak, PenjagaGerak, buatLaju,
  bersihkanPesan, namaTamu, warnaSah, adalahObjek, sdpSah, iceSah,
} = require('./penjaga.cjs');
const { idPublikBaru, buatPemverifikasi, PESAN_TAMU } = require('./identitas.cjs');
const LOCAL = process.argv.includes('--local');

const app    = express();
const server = http.createServer(app);

const GRACE_MS = 8000; // ms sebelum disconnect benar-benar dianggap pergi

const pemverifikasi = buatPemverifikasi(process.env);

const io = new Server(server, {
  path: LOCAL ? '/mp/socket.io' : '/socket.io',
  cors: {
    origin: ['https://galantara.io', 'http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  // Pesan terbesar yang sah adalah SDP offer (± 2–10 KB). Bawaan socket.io 1 MB
  // per pesan membuat satu klien bisa memaksa server mem-parse megabita.
  maxHttpBufferSize: 64 * 1024,
  // ── Jaga session saat reconnect (socket.id tetap sama selama 2 menit) ──
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// ── CORS untuk REST admin (halaman admin.html di origin berbeda dari Socket) ──
const ADMIN_CORS_ORIGINS = new Set([
  'https://galantara.io',
  'https://www.galantara.io',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  const origin = req.headers.origin;
  if (origin && ADMIN_CORS_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function requireAdminApiToken(req, res, next) {
  const want = process.env.ADMIN_API_TOKEN;
  if (!want) {
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_API_TOKEN belum di-set di environment server',
    });
  }
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${want}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

async function countSupabaseAuthUsers() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    return {
      count: null,
      note: 'Opsional: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY untuk total user Auth.',
    };
  }
  const root = base.replace(/\/$/, '');
  let total = 0;
  let page = 1;
  const maxPages = 40;
  while (page <= maxPages) {
    const r = await fetch(`${root}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!r.ok) {
      return {
        count: null,
        note: `Supabase admin users: HTTP ${r.status}`,
      };
    }
    const j = await r.json();
    const arr = j.users || [];
    total += arr.length;
    if (arr.length < 200) break;
    page += 1;
  }
  return { count: total, note: null };
}

// ── PEMAIN & ROOM ─────────────────────────────────────
// ruang: room → (idPublik → Pemain). Map, bukan objek biasa: kunci datang dari
// jaringan, dan objek biasa punya `constructor`, `__proto__`, dan kawan-kawan.
//
// Pemain = {
//   idPublik  id acak buatan server; SATU-SATUNYA id yang dilihat klien lain
//   sid       socket.id — hanya untuk mengirim ke satu socket, tidak pernah disiarkan
//   sub       id Supabase TERVERIFIKASI, atau null (tamu) — tidak pernah disiarkan
//   tamu, nama, warna, room, gerak (PenjagaGerak), terputus, tenggat,
//   terakhirSiar, siar (nilai terakhir yang disiarkan), aktif
// }
const ruang = new Map();
/** Pemain yang posisinya masih mengejar klaim atau menunggu jatah siar. */
const kotor = new Set();
let timerKotor = null;
const sekarang = () => performance.now();

const PESAN_LAJU_CHAT = `Pelan-pelan: maksimal ${LAJU.chat.kapasitas} pesan per ${LAJU.chat.kapasitas / LAJU.chat.perDetik} detik.`;
const PESAN_CHAT = Object.freeze({
  'payload-tidak-sah': 'Pesan tidak sah.',
  'terlalu-panjang': `Pesan terlalu panjang (maksimal ${BATAS_TEKS.pesan} huruf).`,
  kosong: 'Pesan kosong tidak dikirim.',
});

function isiRuang(room) {
  let m = ruang.get(room);
  if (!m) { m = new Map(); ruang.set(room, m); }
  return m;
}

/** Yang boleh dilihat pemain lain tentang seorang pemain — dibangun eksplisit,
 *  tidak pernah menyebar objek internal (di sana ada sid dan sub). */
function tampilan(p) {
  const pos = p.gerak.posisi;
  return { name: p.nama, color: p.warna, x: bulat2(pos.x), z: bulat2(pos.z), facing: bulat2(pos.facing), guest: p.tamu };
}

function daftarLain(room, kecuali) {
  const out = {};
  for (const [id, p] of ruang.get(room) ?? []) if (id !== kecuali) out[id] = tampilan(p);
  return out;
}

function hitung(room) {
  io.to(room).emit('count', ruang.get(room)?.size ?? 0);
}

function keluarkan(p, sebab) {
  if (!p.aktif) return;
  p.aktif = false;
  clearTimeout(p.tenggat);
  p.tenggat = null;
  kotor.delete(p);
  const m = ruang.get(p.room);
  if (m?.get(p.idPublik) !== p) return;
  m.delete(p.idPublik);
  // Room kosong dibuang: nama room hanya dari daftar RUANG, tapi tetap tidak ditimbun.
  if (!m.size) ruang.delete(p.room);
  io.to(p.room).emit('player_leave', { socketId: p.idPublik });
  hitung(p.room);
  console.log(`[-] ${p.nama} left ${p.room} (${m.size} online)${sebab ? ` — ${sebab}` : ''}`);
}

/** Tab identitas TERVERIFIKASI yang sama yang sudah putus (masih dalam tenggat)
 *  diganti koneksi barunya. Koneksi yang masih hidup (tab lain) tidak disentuh,
 *  dan tanpa identitas terverifikasi tidak ada penggantian sama sekali. */
function buangHantu(sub, kecuali) {
  for (const m of ruang.values()) {
    for (const p of m.values()) {
      if (p.sub === sub && p.terputus && p.idPublik !== kecuali) keluarkan(p, 'digantikan koneksi baru');
    }
  }
}

// ── SIARAN GERAK ──────────────────────────────────────
function tandaiKotor(p) {
  kotor.add(p);
  if (!timerKotor) timerKotor = setTimeout(bilasKotor, GERAK.siarMinMs);
}

function bilasKotor() {
  timerKotor = null;
  const daftar = [...kotor];
  kotor.clear();
  const now = sekarang();
  for (const p of daftar) if (p.aktif) siarkanGerak(p, now);
}

/** Majukan posisi server ke arah klaim dan siarkan — paling sering sekali per
 *  `siarMinMs`. Klaim yang datang lebih rapat digabung: hanya yang terakhir
 *  disiarkan. Yang belum sampai (dijepit batas kecepatan) diteruskan pengatur waktu. */
function siarkanGerak(p, now) {
  // 2 ms: pengatur waktu Node bisa menyala sedikit lebih awal dari jam monoton.
  if (now - p.terakhirSiar < GERAK.siarMinMs - 2) { tandaiKotor(p); return; }
  p.gerak.majukan(now);
  const pos = p.gerak.posisi;
  const x = bulat2(pos.x);
  const z = bulat2(pos.z);
  const f = bulat2(pos.facing);
  if (!p.siar || x !== p.siar.x || z !== p.siar.z || f !== p.siar.f) {
    io.to(p.room).except(p.sid).emit('player_move', { socketId: p.idPublik, x, z, facing: f });
    p.siar = { x, z, f };
    p.terakhirSiar = now;
  }
  if (!p.gerak.sampai) tandaiKotor(p);
}

app.get('/health', (_, res) => res.json({ ok: true, rooms: ruang.size }));

app.get('/api/admin/summary', requireAdminApiToken, async (req, res) => {
  try {
    const roomList = [...ruang].map(([id, m]) => ({ id, count: m.size }));
    const auth = await countSupabaseAuthUsers();
    res.json({
      ok: true,
      rooms: roomList,
      socketsConnected: io.engine.clientsCount,
      authUsers: auth.count,
      authUsersNote: auth.note,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// ── IDENTITAS: diputuskan sekali, saat jabat tangan ───
// Token Supabase datang di `auth` jabat tangan, bukan di `join`. Tanpa token
// yang lolos verifikasi = tamu. Koneksi TIDAK ditolak: tamu tetap boleh melihat
// dan berjalan. Koneksi yang pulih (connectionStateRecovery) melewati langkah
// ini dan membawa socket.data yang sama.
io.use(async (socket, next) => {
  let hasil;
  try {
    hasil = await pemverifikasi.verifikasi(socket.handshake.auth?.token);
  } catch {
    hasil = { ok: false, alasan: 'verifikasi-gagal' };
  }
  Object.assign(socket.data, {
    idPublik: idPublikBaru(),
    sub: hasil.ok ? hasil.sub : null,
    namaAkun: hasil.ok ? hasil.nama : null,
    alasanTamu: hasil.ok ? null : hasil.alasan,
    room: null,
    nama: null,
    warna: null,
    posisi: null,
    laju: buatLaju(sekarang()),
  });
  next();
});

io.on('connection', (socket) => {
  const d = socket.data;

  if (socket.recovered) {
    // Koneksi yang sama kembali sebelum tenggat habis: batalkan pengeluarannya.
    const p = d.room ? ruang.get(d.room)?.get(d.idPublik) : null;
    if (p?.aktif) {
      clearTimeout(p.tenggat);
      p.tenggat = null;
      p.terputus = false;
      p.sid = socket.id;
      console.log(`[~] ${p.nama} recovered di ${p.room}`);
    }
  }

  /** Pemain milik koneksi INI, atau null. Tidak pernah dicari dari payload. */
  function pemainSaya() {
    const p = d.room ? ruang.get(d.room)?.get(d.idPublik) : null;
    return p?.aktif && p.sid === socket.id ? p : null;
  }

  function pesanTamu() {
    return PESAN_TAMU[d.alasanTamu] ?? PESAN_TAMU['token-tidak-sah'];
  }

  /** Beri tahu pengirim kenapa pesannya tidak diteruskan — paling sering sekali
   *  per jenis per detik, supaya penolakan tidak jadi banjir balik. */
  function tolak(jenis, alasan, pesan) {
    const now = sekarang();
    if (now - (d.laju.tolakTerakhir.get(jenis) ?? -Infinity) < TOLAK_MIN_MS) return;
    d.laju.tolakTerakhir.set(jenis, now);
    socket.emit('rejected', { event: jenis, reason: alasan, message: pesan });
  }

  /** Catat pelanggaran; pelanggar berulang diputus. @returns {boolean} sudah diputus */
  function langgar(n = 1) {
    if (d.laju.diputus) return true;
    if (!d.laju.pelanggaran.catat(sekarang(), n)) return false;
    d.laju.diputus = true;
    socket.emit('rejected', {
      event: 'koneksi',
      reason: 'banjir',
      message: 'Terlalu banyak pesan dari koneksi ini, jadi koneksinya diputus. Muat ulang halaman.',
    });
    console.log(`[x] ${d.nama ?? d.idPublik} diputus: banjir pesan`);
    socket.disconnect(true);
    return true;
  }

  function sambut() {
    socket.emit('welcome', {
      socketId: d.idPublik,
      guest: d.sub === null,
      reason: d.alasanTamu,
      message: d.sub === null ? pesanTamu() : null,
      name: d.nama,
      room: d.room,
    });
  }

  function kirimKeadaan() {
    sambut();
    socket.emit('players', daftarLain(d.room, d.idPublik));
    hitung(d.room);
  }

  /** @param {{x:number,z:number,facing:number}|null} posisiAwal posisi yang sudah pernah diterima server */
  function pasang(room, posisiAwal) {
    const now = sekarang();
    const p = {
      idPublik: d.idPublik,
      sid: socket.id,
      sub: d.sub,
      tamu: d.sub === null,
      nama: d.nama,
      warna: d.warna,
      room,
      gerak: new PenjagaGerak(room, now),
      terputus: false,
      tenggat: null,
      terakhirSiar: -Infinity,
      siar: null,
      aktif: true,
    };
    if (posisiAwal) {
      Object.assign(p.gerak.posisi, posisiAwal);
      p.gerak.sudahMuncul = true;
    }
    d.room = room;
    // Referensi yang sama: posisi terakhir ikut tersimpan kalau koneksinya pulih.
    d.posisi = p.gerak.posisi;
    isiRuang(room).set(p.idPublik, p);
    socket.join(room);
    socket.to(room).emit('player_join', { socketId: p.idPublik, ...tampilan(p) });
    console.log(`[+] ${p.nama} joined ${room} (${ruang.get(room).size} online)`);
    return p;
  }

  // ── JOIN ROOM ───────────────────────────────────────
  // `id` dan `guest` dari klien DIABAIKAN: identitas dan status tamu sudah
  // diputuskan saat jabat tangan. Klien lama masih mengirimnya; tidak apa-apa.
  socket.on('join', (data) => {
    if (!d.laju.ember.join.ambil(sekarang())) {
      if (!langgar()) tolak('join', 'terlalu-sering', 'Terlalu sering masuk ulang; tunggu sebentar.');
      return;
    }
    if (!adalahObjek(data)) {
      if (!langgar()) tolak('join', 'payload-tidak-sah', 'Data masuk tidak sah.');
      return;
    }
    const room = data.room === undefined ? 'oola' : data.room;
    if (!ruangDikenal(room)) {
      if (!langgar()) tolak('join', 'room-tidak-dikenal', 'Spot tidak dikenal.');
      return;
    }

    const lama = pemainSaya();
    if (lama?.room === room) {
      // Join ulang ke room yang sama (atau klien pulih yang mengirim join):
      // cukup kirim keadaan. Tidak ada siaran masuk ganda, penjaga gerak tidak di-reset.
      kirimKeadaan();
      return;
    }
    if (lama) {
      // Pindah room di koneksi yang sama: keluar dari yang lama agar tidak dobel-count.
      socket.leave(lama.room);
      keluarkan(lama, `pindah ke ${room}`);
    }

    // Nama dan warna tampil diputuskan sekali per koneksi.
    if (d.nama === null) {
      d.nama = d.sub ? d.namaAkun : namaTamu(data.name, crypto.randomInt);
      d.warna = d.sub ? (warnaSah(data.color) ?? WARNA.warga) : WARNA.tamu;
    }
    if (d.sub) buangHantu(d.sub, d.idPublik);

    pasang(room, null);
    kirimKeadaan();
  });

  // ── SYNC (koneksi pulih — kirim keadaan tanpa join ulang) ──
  // Room dari payload DIABAIKAN: dulu `sync` dengan nama room mana pun
  // mengembalikan daftar pemain room itu tanpa pernah masuk.
  socket.on('sync', () => {
    if (!d.laju.ember.sync.ambil(sekarang())) { langgar(); return; }
    if (!d.room) return;
    if (!pemainSaya()) {
      // Tenggat 8 detik habis, tapi sesinya masih bisa dipulihkan (sampai 2 menit):
      // pasang lagi dari socket.data, di posisi terakhirnya.
      pasang(d.room, d.posisi);
    }
    kirimKeadaan();
    console.log(`[~] ${d.nama} sync di ${d.room}`);
  });

  // ── MOVE ────────────────────────────────────────────
  socket.on('move', (data) => {
    const now = sekarang();
    if (!d.laju.ember.move.ambil(now)) { langgar(); return; }
    const p = pemainSaya();
    if (!p) return;
    const g = bacaGerak(data);
    if (!g) { langgar(); return; }
    if (g.facing !== undefined) p.gerak.posisi.facing = g.facing;
    p.gerak.klaim(g.x, g.z, now);
    siarkanGerak(p, now);
  });

  // ── CHAT ────────────────────────────────────────────
  // Tidak dikirim balik ke pengirim: klien menampilkan pesannya sendiri seketika.
  socket.on('chat', (data) => {
    const bolehLaju = d.laju.ember.chat.ambil(sekarang());
    if (!bolehLaju && langgar()) return;
    const p = pemainSaya();
    if (!p) { tolak('chat', 'belum-join', 'Belum masuk Spot mana pun.'); return; }
    // Tamu: lihat multiplayer, tidak chat. Ditegakkan DI SINI, bukan hanya di UI.
    if (p.tamu) { tolak('chat', 'tamu', pesanTamu()); return; }
    if (!bolehLaju) { tolak('chat', 'terlalu-cepat', PESAN_LAJU_CHAT); return; }
    const hasil = bersihkanPesan(adalahObjek(data) ? data.msg : undefined);
    if (!hasil.ok) {
      if (hasil.alasan === 'payload-tidak-sah' && langgar()) return;
      tolak('chat', hasil.alasan, PESAN_CHAT[hasil.alasan]);
      return;
    }
    socket.to(p.room).emit('chat', { socketId: p.idPublik, name: p.nama, msg: hasil.teks });
  });

  // ── WebRTC SIGNALING RELAY (server hanya meneruskan, tidak memproses audio) ──
  // Hanya antar pemain terverifikasi di room yang sama; hanya bidang SDP/ICE yang
  // dikenal yang diteruskan.
  function relayRtc(jenis, data, bentuk) {
    if (!d.laju.ember.rtc.ambil(sekarang())) { langgar(); return; }
    const p = pemainSaya();
    if (!p) return;
    if (p.tamu) { tolak(jenis, 'tamu', pesanTamu()); return; }
    const tujuan = adalahObjek(data) && typeof data.to === 'string' ? ruang.get(p.room)?.get(data.to) : null;
    if (!tujuan || tujuan === p || tujuan.tamu || tujuan.terputus) {
      tolak(jenis, 'tujuan-tidak-sah', 'Pemain tujuan tidak ada di Spot ini atau belum bisa voice.');
      return;
    }
    const isi = bentuk(data);
    if (!isi) {
      if (!langgar()) tolak(jenis, 'payload-tidak-sah', 'Data voice tidak sah.');
      return;
    }
    io.to(tujuan.sid).emit(jenis, { from: p.idPublik, ...isi });
  }

  socket.on('rtc_offer', (data) => relayRtc('rtc_offer', data, (v) => {
    const offer = sdpSah(v.offer, 'offer');
    return offer && { offer };
  }));
  socket.on('rtc_answer', (data) => relayRtc('rtc_answer', data, (v) => {
    const answer = sdpSah(v.answer, 'answer');
    return answer && { answer };
  }));
  socket.on('rtc_ice', (data) => relayRtc('rtc_ice', data, (v) => {
    const candidate = iceSah(v.candidate);
    return candidate && { candidate };
  }));

  // ── DISCONNECT ──────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const p = pemainSaya();
    if (!p) return;
    // Pergi dengan sengaja (warp = koneksi baru, logout, diputus server): tidak
    // ada yang akan pulih, jadi tidak ada hantu 8 detik di room lama.
    if (reason === 'client namespace disconnect' || reason === 'server namespace disconnect') {
      keluarkan(p, reason);
      return;
    }
    // Tunggu dulu — mungkin menyambung kembali (tab pindah, sinyal hilang sebentar).
    p.terputus = true;
    console.log(`[!] ${p.nama} disconnect (${reason}) — grace ${GRACE_MS}ms`);
    p.tenggat = setTimeout(() => keluarkan(p, 'tenggat habis'), GRACE_MS);
  });
});

if (LOCAL) {
  const root = path.resolve(__dirname, '..');
  app.get('/local-health', (_, res) => res.json({ ok: true, app: 'galantara-local', mode: 'guest', port: server.address().port }));
  app.get('/three.min.js', (_, res) => res.sendFile(require.resolve('three/build/three.min.js')));
  app.get('/vendor/GLTFLoader.js', (_, res) => res.sendFile(path.join(__dirname, 'node_modules/three/examples/js/loaders/GLTFLoader.js')));
  for (const dir of ['src', 'assets', 'data', 'vendor']) app.use('/' + dir, express.static(path.join(root, dir), { dotfiles: 'deny' }));
  for (const file of ['index.html', 'benteng.html', 'about.html']) app.get('/' + file, (_, res) => res.sendFile(path.join(root, file)));
  app.get('/', (_, res) => res.sendFile(path.join(root, 'index.html')));
}
// Tests use 0 for an OS-assigned port; normal local launches stay on 4000.
const PORT = LOCAL ? Number(process.env.GALANTARA_LOCAL_PORT ?? 4000) : (process.env.PORT || 3005);
server.listen(PORT, LOCAL ? '127.0.0.1' : undefined, () => {
  console.log(`✅ Galantara multiplayer server running on :${server.address().port}`);
  // stdout, bukan stderr: keadaan yang disengaja, bukan galat.
  console.log(pemverifikasi.aktif
    ? `🔐 Verifikasi login aktif (${pemverifikasi.mode.join(' + ')}): chat & voice untuk pemain terverifikasi.`
    : '🔓 Verifikasi login MATI: semua koneksi tamu, chat & voice nonaktif. Cara mengaktifkan: docs/DEPLOY.md.');
  pemverifikasi.siapkan();
});
