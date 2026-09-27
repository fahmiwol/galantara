// ═══════════════════════════════════════════════════════
// Socket.js — Client wrapper untuk Galantara multiplayer
// Connects ke galantara-server (port 3005 di balik /mp/)
//
// Protokol sejak ADR-0023: server yang memutuskan siapa kita.
// - Token Supabase dikirim di jabat tangan (`auth`), bukan klaim `id` di `join`.
// - Kunci pemain (`socketId` di setiap pesan) adalah id publik acak buatan
//   server — bukan socket.id dan bukan id akun. Id kita sendiri datang lewat
//   `welcome`.
// - Status tamu datang dari server (`welcome.guest`); `rejected` menjelaskan
//   pesan yang tidak diteruskan.
// Server lama tidak mengirim `welcome`: `id` jatuh ke socket.id seperti dulu,
// jadi klien ini tetap jalan di server lama selama deploy bertahap.
// ═══════════════════════════════════════════════════════

// Nginx proxy /mp/ → localhost:3005 — tidak perlu port terbuka
const SOCKET_PATH = '/mp/socket.io';
/** Diekspor untuk uji paritas: server menganggarkan laju gerak dari angka ini. */
export const MOVE_THROTTLE_MS = 80; // emit posisi max 12fps
/** Menunggu token paling lama ini; sesudahnya menyambung sebagai tamu. */
const TOKEN_TIMEOUT_MS = 4000;

export class MultiplayerSocket {
  constructor() {
    this._socket      = null;
    this._connected   = false;
    this._lastEmit    = 0;
    this._handlers    = {};
    this._guest       = false;
    this._spawn      = null; // { x, z, facing } — emit sekali setelah join
    /** Dari `welcome`. null = belum join, atau server lama. */
    this._server      = null;
  }

  /** Posisi avatar saat join (supaya remote tidak lihat 0,0 sampai gerak) */
  setSpawnSnapshot(x, z, facing = 0) {
    this._spawn = { x, z, facing };
  }

  // ── CONNECT ──────────────────────────────────────────
  /**
   * @param {{ room:string, name:string, color:number, guest?:boolean,
   *           ambilToken?: (() => Promise<string|null>) | null }} opsi
   *   `guest` hanya untuk server lama yang masih mempercayainya; server baru
   *   memutuskan sendiri dari token. `ambilToken` dipanggil setiap
   *   (re)connect, jadi token yang sudah diperbarui supabase-js ikut terkirim.
   */
  connect({ room, name, color, guest = false, ambilToken = null }) {
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
    this._name  = name;
    this._color = color;
    this._guest = !!guest;
    this._server = null;

    this._socket = io(window.location.origin, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 8000,
      auth: (cb) => {
        if (!ambilToken) { cb({}); return; }
        let selesai = false;
        let batas = null;
        const kirim = (token) => {
          if (selesai) return;
          selesai = true;
          clearTimeout(batas);
          cb(typeof token === 'string' && token ? { token } : {});
        };
        batas = setTimeout(() => kirim(null), TOKEN_TIMEOUT_MS);
        Promise.resolve().then(ambilToken).then(kirim, () => kirim(null));
      },
    });

    this._socket.on('connect', () => {
      this._connected = true;

      if (this._socket.recovered) {
        // Session recovered — socket ID sama, server masih punya state kita
        // Cukup minta sync players terbaru, tidak perlu join ulang
        console.log('[Socket] Recovered:', this._socket.id);
        this._socket.emit('sync', { room: this._room });
      } else {
        // Fresh connect atau full reconnect: identitas baru dari server.
        this._server = null;
        this._socket.emit('join', {
          room,
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

    this._socket.on('welcome', (w) => {
      if (!w || typeof w.socketId !== 'string') return;
      this._server = {
        id: w.socketId,
        guest: !!w.guest,
        reason: typeof w.reason === 'string' ? w.reason : null,
        message: typeof w.message === 'string' ? w.message : null,
        name: typeof w.name === 'string' ? w.name : null,
      };
      this._handlers.welcome?.(this._server);
    });

    // Forward events ke handler
    ['players', 'player_join', 'player_move', 'player_leave', 'chat', 'count', 'rejected'].forEach(ev => {
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
    this._server = null;
  }

  get connected() { return this._connected; }

  /** Kunci kita seperti yang dilihat pemain lain — dipakai memisahkan echo chat,
   *  memetakan kursi, dan memilih siapa yang memulai panggilan voice.
   *  Server baru: id publik dari `welcome`. Server lama: socket.id.
   *  null sebelum tersambung. */
  get id() { return this._server?.id ?? this._socket?.id ?? null; }

  /** Tamu menurut server kalau server sudah bilang; kalau belum, klaim kita sendiri. */
  get isGuest() { return this._server ? this._server.guest : this._guest; }

  /** Penjelasan server kenapa kita tamu, atau null. */
  get guestMessage() { return this._server?.guest ? this._server.message : null; }
}
