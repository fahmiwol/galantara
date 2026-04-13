// ═══════════════════════════════════════════════════════
// Galantara Multiplayer Server
// Socket.io — position sync per room (Oola, Spot, dll.)
// Port: 3005
// ═══════════════════════════════════════════════════════

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);

const GRACE_MS = 8000; // ms sebelum disconnect benar-benar dianggap pergi

const io = new Server(server, {
  cors: {
    origin: ['https://galantara.io', 'http://localhost:4000', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
  pingTimeout:  60000,
  pingInterval: 25000,
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

// rooms[roomId][socketId] = { id, name, color, x, z, facing }
const rooms      = {};
// grace timers[socketId] = setTimeout handle
const graceTimers = {};

function getRoom(id) {
  if (!rooms[id]) rooms[id] = {};
  return rooms[id];
}

function removePlayer(roomId, socketId) {
  if (!rooms[roomId]?.[socketId]) return;
  const name = rooms[roomId][socketId].name;
  delete rooms[roomId][socketId];
  io.to(roomId).emit('player_leave', { socketId });
  _broadcastCount(roomId);
  console.log(`[-] ${name} left ${roomId} (${Object.keys(rooms[roomId] || {}).length} online)`);
}

app.get('/health', (_, res) => res.json({ ok: true, rooms: Object.keys(rooms).length }));

app.get('/api/admin/summary', requireAdminApiToken, async (req, res) => {
  try {
    const roomList = Object.keys(rooms).map((id) => ({
      id,
      count: Object.keys(rooms[id] || {}).length,
    }));
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

io.on('connection', (socket) => {
  let roomId   = null;
  const socketId = socket.id;

  // Batalkan grace timer jika ada (player reconnect tepat waktu)
  if (graceTimers[socketId]) {
    clearTimeout(graceTimers[socketId]);
    delete graceTimers[socketId];
    console.log(`[~] ${socketId} recovered sebelum grace period habis`);
  }

  // ── JOIN ROOM ───────────────────────────────────────
  socket.on('join', ({ room = 'oola', id, name, color, guest = false }) => {
    // ── Recovered session: socket.id sama, player masih di room ──
    if (socket.recovered && rooms[room]?.[socketId]) {
      roomId = room;
      // Sync state terbaru tanpa re-announce ke player lain
      const others = Object.fromEntries(
        Object.entries(rooms[room]).filter(([sid]) => sid !== socketId)
      );
      socket.emit('players', others);
      _broadcastCount(roomId);
      console.log(`[~] ${rooms[room][socketId].name} recovered di ${room}`);
      return;
    }

    // ── Pindah room (Sprint 5): keluar dari room lama agar tidak dobel-count ──
    if (roomId && roomId !== room) {
      socket.leave(roomId);
      if (rooms[roomId]?.[socketId]) {
        delete rooms[roomId][socketId];
        io.to(roomId).emit('player_leave', { socketId });
        _broadcastCount(roomId);
        console.log(`[>] ${socketId} left ${roomId} for ${room}`);
      }
    }

    // ── Join biasa / full reconnect ──────────────────
    roomId = room;
    socket.join(roomId);

    const rm = getRoom(roomId);

    // Hapus entry lama jika user yang sama reconnect dengan socket ID baru
    if (id) {
      Object.keys(rm).forEach(sid => {
        if (rm[sid].id === id && sid !== socketId) {
          clearTimeout(graceTimers[sid]);
          delete graceTimers[sid];
          delete rm[sid];
          io.to(roomId).emit('player_leave', { socketId: sid });
        }
      });
    }

    rm[socketId] = {
      id:     id    || socketId,
      name:   name  || 'Anonim',
      color:  color || 0x8B5CF6,
      x: 0, z: 0, facing: 0,
      guest:  !!guest,
    };

    // Kirim daftar pemain (kecuali diri sendiri)
    const others = Object.fromEntries(
      Object.entries(rm).filter(([sid]) => sid !== socketId)
    );
    socket.emit('players', others);

    socket.to(roomId).emit('player_join', { socketId, ...rm[socketId] });
    _broadcastCount(roomId);

    console.log(`[+] ${rm[socketId].name} joined ${roomId} (${Object.keys(rm).length} online)`);
  });

  // ── SYNC (reconnect recovered — kirim state tanpa join ulang) ──
  socket.on('sync', ({ room }) => {
    if (!rooms[room]) return;
    const others = Object.fromEntries(
      Object.entries(rooms[room]).filter(([sid]) => sid !== socketId)
    );
    socket.emit('players', others);
    _broadcastCount(room);
    console.log(`[~] ${socketId} sync di ${room}`);
  });

  // ── MOVE ────────────────────────────────────────────
  socket.on('move', ({ x, z, facing }) => {
    if (!roomId || !rooms[roomId]?.[socketId]) return;
    const p = rooms[roomId][socketId];
    p.x = x; p.z = z; p.facing = facing;
    socket.to(roomId).emit('player_move', { socketId, x, z, facing });
  });

  // ── CHAT ────────────────────────────────────────────
  socket.on('chat', ({ msg }) => {
    if (!roomId || !rooms[roomId]?.[socketId]) return;
    if (rooms[roomId][socketId].guest) return; // tamu: lihat multiplayer, tidak chat
    if (!msg || msg.length > 100) return;
    const name = rooms[roomId][socketId].name;
    io.to(roomId).emit('chat', { socketId, name, msg });
  });

  // ── WebRTC SIGNALING RELAY (server hanya forward, tidak proses audio) ──
  function _rtcAllowed(fromSid, toSid) {
    if (!roomId || !rooms[roomId]?.[fromSid] || !rooms[roomId]?.[toSid]) return false;
    if (rooms[roomId][fromSid].guest || rooms[roomId][toSid].guest) return false;
    return true;
  }

  socket.on('rtc_offer', ({ to, offer }) => {
    if (!_rtcAllowed(socketId, to)) return;
    socket.to(to).emit('rtc_offer', { from: socketId, offer });
  });
  socket.on('rtc_answer', ({ to, answer }) => {
    if (!_rtcAllowed(socketId, to)) return;
    socket.to(to).emit('rtc_answer', { from: socketId, answer });
  });
  socket.on('rtc_ice', ({ to, candidate }) => {
    if (!_rtcAllowed(socketId, to)) return;
    socket.to(to).emit('rtc_ice', { from: socketId, candidate });
  });

  // ── DISCONNECT — grace period sebelum benar-benar hapus ────
  socket.on('disconnect', (reason) => {
    if (!roomId) return;
    console.log(`[!] ${socketId} disconnect (${reason}) — grace ${GRACE_MS}ms`);

    // Tunggu dulu — mungkin reconnect (tab switch, network blip)
    graceTimers[socketId] = setTimeout(() => {
      delete graceTimers[socketId];
      removePlayer(roomId, socketId);
    }, GRACE_MS);
  });

  function _broadcastCount(rid) {
    const count = Object.keys(rooms[rid] || {}).length;
    io.to(rid).emit('count', count);
  }
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`✅ Galantara multiplayer server running on :${PORT}`);
});
