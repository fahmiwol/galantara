// ═══════════════════════════════════════════════════════
// Socket.js — Client wrapper untuk Galantara multiplayer
// Connects ke galantara-server (port 3001)
// ═══════════════════════════════════════════════════════

// Nginx proxy /mp/ → localhost:3001 — tidak perlu port terbuka
const SERVER_URL = 'https://galantara.io';
const SOCKET_PATH = '/mp/socket.io';
const MOVE_THROTTLE_MS = 80; // emit posisi max 12fps

export class MultiplayerSocket {
  constructor() {
    this._socket      = null;
    this._connected   = false;
    this._lastEmit    = 0;
    this._handlers    = {};
    this._guest       = false;
    this._spawn      = null; // { x, z, facing } — emit sekali setelah join
  }

  /** Posisi avatar saat join (supaya remote tidak lihat 0,0 sampai gerak) */
  setSpawnSnapshot(x, z, facing = 0) {
    this._spawn = { x, z, facing };
  }

  // ── CONNECT ──────────────────────────────────────────
  connect({ room, id, name, color, guest = false }) {
    if (typeof io === 'undefined') {
      console.warn('[Socket] Socket.io client tidak ditemukan');
      return this;
    }

    if (this._socket) {
      this._socket.removeAllListeners();
      this._socket.disconnect();
      this._socket = null;
      this._connected = false;
    }

    this._room  = room;
    this._id    = id;
    this._name  = name;
    this._color = color;
    this._guest = !!guest;

    this._socket = io(SERVER_URL, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 8000,
    });

    this._socket.on('connect', () => {
      this._connected = true;

      if (this._socket.recovered) {
        // Session recovered — socket ID sama, server masih punya state kita
        // Cukup minta sync players terbaru, tidak perlu join ulang
        console.log('[Socket] Recovered:', this._socket.id);
        this._socket.emit('sync', { room: this._room });
      } else {
        // Fresh connect atau full reconnect
        this._socket.emit('join', {
          room,
          id,
          name,
          color,
          guest: this._guest,
        });
        if (this._spawn) {
          const { x, z, facing } = this._spawn;
          this._socket.emit('move', { x, z, facing });
        }
        console.log('[Socket] Connected:', this._socket.id, this._guest ? '(guest)' : '');
      }
    });

    this._socket.on('disconnect', () => {
      this._connected = false;
      console.log('[Socket] Disconnected');
    });

    // Forward events ke handler
    ['players', 'player_join', 'player_move', 'player_leave', 'chat', 'count'].forEach(ev => {
      this._socket.on(ev, (data) => this._handlers[ev]?.(data));
    });

    return this;
  }

  // ── EMIT POSISI (throttled) ───────────────────────────
  emitMove(x, z, facing) {
    if (!this._connected) return;
    const now = Date.now();
    if (now - this._lastEmit < MOVE_THROTTLE_MS) return;
    this._lastEmit = now;
    this._socket.emit('move', { x, z, facing });
  }

  // ── EMIT CHAT ─────────────────────────────────────────
  emitChat(msg) {
    if (!this._connected || !msg?.trim()) return;
    this._socket.emit('chat', { msg: msg.trim() });
  }

  // ── EVENT HANDLERS ────────────────────────────────────
  on(event, fn) { this._handlers[event] = fn; return this; }

  disconnect() {
    if (this._socket) {
      this._socket.removeAllListeners();
      this._socket.disconnect();
      this._socket = null;
    }
    this._connected = false;
    this._guest = false;
  }

  get connected() { return this._connected; }
  get isGuest() { return this._guest; }
}
