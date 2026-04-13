// ═══════════════════════════════════════════════════════
// VoiceChat.js — WebRTC proximity voice chat
// Radius 8 unit Three.js → dengar suara, volume ∝ jarak
// Socket.io sebagai signaling relay (server tidak proses audio)
// ═══════════════════════════════════════════════════════

const VOICE_RADIUS = 8;   // unit Three.js — di luar ini tidak dengar
const STUN = { urls: 'stun:stun.l.google.com:19302' };

export class VoiceChat {
  constructor() {
    this._socket  = null;
    this._stream  = null;   // MediaStream mikrofon lokal
    this._peers   = {};     // socketId → { pc, gainNode, audioCtx }
    this._enabled = false;
    this._myPos   = { x: 0, z: 0 };
    this._lastProx = 0;
  }

  // ── AKTIFKAN MIKROFON ────────────────────────────────
  async enable(socket) {
    if (this._enabled) return true;
    this._socket = socket;

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this._enabled = true;
      this._initSignaling();
      console.log('[Voice] Mikrofon aktif');
      return true;
    } catch (e) {
      console.warn('[Voice] Gagal akses mikrofon:', e.message);
      return false;
    }
  }

  // ── MATIKAN ──────────────────────────────────────────
  disable() {
    this._stream?.getTracks().forEach(t => t.stop());
    Object.keys(this._peers).forEach(sid => this._hangup(sid));
    this._enabled = false;
    this._stream  = null;
    console.log('[Voice] Nonaktif');
  }

  setMyPosition(x, z) { this._myPos = { x, z }; }

  // ── PROXIMITY CHECK (dipanggil tiap ~300ms dari Game.js) ─
  updateProximity(playersMap) {
    if (!this._enabled || !playersMap) return;

    const now = Date.now();
    if (now - this._lastProx < 300) return;
    this._lastProx = now;

    const { x: mx, z: mz } = this._myPos;

    Object.entries(playersMap).forEach(([sid, p]) => {
      const mesh = p.mesh;
      if (!mesh) return;

      const dx   = mesh.position.x - mx;
      const dz   = mesh.position.z - mz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < VOICE_RADIUS) {
        if (!this._peers[sid]) {
          // Hanya satu sisi yang initiate (socket ID lebih kecil = caller)
          if (this._socket.id < sid) this._callPeer(sid);
        } else {
          // Sesuaikan volume berdasarkan jarak (linear falloff)
          const vol = 1 - dist / VOICE_RADIUS;
          this._setVolume(sid, vol);
        }
      } else {
        if (this._peers[sid]) this._hangup(sid);
      }
    });

    // Hapus peer yang sudah tidak ada di world
    Object.keys(this._peers).forEach(sid => {
      if (!playersMap[sid]) this._hangup(sid);
    });
  }

  // ── SIGNALING ────────────────────────────────────────
  _initSignaling() {
    const s = this._socket;

    s.on('rtc_offer', async ({ from, offer }) => {
      console.log('[Voice] Terima offer dari', from);
      const pc = this._createPC(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('rtc_answer', { to: from, answer });
    });

    s.on('rtc_answer', async ({ from, answer }) => {
      const peer = this._peers[from];
      if (!peer) return;
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    s.on('rtc_ice', ({ from, candidate }) => {
      this._peers[from]?.pc
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(() => {});
    });
  }

  async _callPeer(sid) {
    console.log('[Voice] Call ke', sid);
    const pc    = this._createPC(sid);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this._socket.emit('rtc_offer', { to: sid, offer });
  }

  _createPC(sid) {
    if (this._peers[sid]) return this._peers[sid].pc;

    // AudioContext untuk volume kontrol per-peer
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(audioCtx.destination);

    const pc = new RTCPeerConnection({ iceServers: [STUN] });

    // Tambah track mikrofon lokal ke koneksi
    if (this._stream) {
      this._stream.getTracks().forEach(t => pc.addTrack(t, this._stream));
    }

    // Terima audio remote → sambung ke AudioContext
    pc.ontrack = (e) => {
      const src = audioCtx.createMediaStreamSource(e.streams[0]);
      src.connect(gainNode);
    };

    // Forward ICE candidates ke peer via Socket.io
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this._socket.emit('rtc_ice', { to: sid, candidate });
      }
    };

    // Auto-hangup jika koneksi gagal
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this._hangup(sid);
      }
    };

    this._peers[sid] = { pc, gainNode, audioCtx };
    return pc;
  }

  _setVolume(sid, vol) {
    const peer = this._peers[sid];
    if (peer) peer.gainNode.gain.value = Math.max(0, Math.min(1, vol));
  }

  _hangup(sid) {
    const peer = this._peers[sid];
    if (!peer) return;
    try { peer.pc.close(); } catch (_) {}
    try { peer.audioCtx.close(); } catch (_) {}
    delete this._peers[sid];
    console.log('[Voice] Hangup:', sid);
  }

  get enabled() { return this._enabled; }
  get peerCount() { return Object.keys(this._peers).length; }
}
