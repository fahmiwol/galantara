// ═══════════════════════════════════════════════════════
// tests/klienMultiplayer.test.mjs — sisi klien protokol ADR-0023
//
// Deploy statis (otomatis, push ke main) dan deploy server multiplayer
// (manual) tidak terjadi bersamaan, jadi klien baru pasti sempat berbicara
// dengan server LAMA. Uji ini menjaga bahwa itu tetap jalan, dengan tiruan
// socket.io yang memodelkan perilaku klien sungguhan (ADR-0012): `auth`
// dipanggil sebelum `connect`, sesi pulih membawa `recovered`.
// Klien melawan server baru sungguhan: tests/serverMultiplayer.test.mjs.
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';

// ── Tiruan socket.io-client ──────────────────────────
function pasangIoTiruan() {
  const dibuat = [];
  globalThis.window = { location: { origin: 'https://galantara.io' } };
  globalThis.io = (url, opsi) => {
    const s = {
      url, opsi, id: `sid-${dibuat.length}`, recovered: false,
      terkirim: [], _h: new Map(), terputus: false,
      on(ev, fn) { (this._h.get(ev) ?? this._h.set(ev, []).get(ev)).push(fn); return this; },
      emit(ev, data) { this.terkirim.push([ev, data]); return this; },
      removeAllListeners() { this._h.clear(); return this; },
      disconnect() { this.terputus = true; return this; },
      /** Server mengirim sesuatu. */
      terima(ev, data) { for (const fn of this._h.get(ev) ?? []) fn(data); },
      /** Seperti socket.io: `auth` dipanggil dulu, `connect` sesudah callback-nya. */
      async sambung({ recovered = false } = {}) {
        this.recovered = recovered;
        const auth = await new Promise((resolve) => {
          if (typeof opsi.auth === 'function') opsi.auth(resolve);
          else resolve(opsi.auth ?? {});
        });
        this.authTerkirim = auth;
        this.terima('connect');
      },
    };
    dibuat.push(s);
    return s;
  };
  return dibuat;
}

const { MultiplayerSocket } = await (async () => {
  pasangIoTiruan();
  return import('../src/multiplayer/Socket.js');
})();

test('klien baru di server LAMA: tanpa welcome, id tetap socket.id dan tamu tetap klaim sendiri', async () => {
  const dibuat = pasangIoTiruan();
  const mp = new MultiplayerSocket();
  mp.setSpawnSnapshot(3, 4, 1);
  mp.connect({ room: 'oola', name: 'Tamu 1234', color: 0x9ca3af, guest: true });
  const s = dibuat[0];
  await s.sambung();
  assert.equal(mp.id, 'sid-0');
  assert.equal(mp.isGuest, true);
  assert.equal(mp.guestMessage, null);
  const [join, gerak] = s.terkirim;
  assert.deepEqual(join, ['join', { room: 'oola', name: 'Tamu 1234', color: 0x9ca3af, guest: true }]);
  assert.ok(!('id' in join[1]), 'id klien tidak dikirim lagi');
  assert.deepEqual(gerak, ['move', { x: 3, z: 4, facing: 1 }]);
  assert.deepEqual(s.authTerkirim, {}, 'tamu tidak mengirim token');
});

test('klien di server BARU: id publik dan status tamu dari welcome; token lewat auth', async () => {
  const dibuat = pasangIoTiruan();
  const mp = new MultiplayerSocket();
  const diterima = [];
  mp.on('welcome', (w) => diterima.push(['welcome', w])).on('rejected', (r) => diterima.push(['rejected', r]));
  mp.connect({ room: 'spot:braga', name: 'Sari', color: 0x8b5cf6, guest: false, ambilToken: async () => 'token.akses.supabase' });
  const s = dibuat[0];
  await s.sambung();
  assert.deepEqual(s.authTerkirim, { token: 'token.akses.supabase' });
  s.terima('welcome', { socketId: 'Ab3_x-9QrTuv', guest: true, reason: 'verifikasi-belum-aktif', message: 'Chat belum aktif.', name: 'Tamu 5150', room: 'spot:braga' });
  assert.equal(mp.id, 'Ab3_x-9QrTuv');
  assert.equal(mp.isGuest, true, 'server yang memutuskan, walau klien login');
  assert.equal(mp.guestMessage, 'Chat belum aktif.');
  s.terima('rejected', { event: 'chat', reason: 'tamu', message: 'Chat butuh login.' });
  assert.deepEqual(diterima.map(([e]) => e), ['welcome', 'rejected']);
});

test('token yang gagal diambil tidak menahan sambungan: masuk sebagai tamu', async () => {
  const dibuat = pasangIoTiruan();
  const mp = new MultiplayerSocket();
  mp.connect({ room: 'oola', name: 'Sari', color: 1, ambilToken: async () => { throw new Error('supabase mati'); } });
  await dibuat[0].sambung();
  assert.deepEqual(dibuat[0].authTerkirim, {});
  assert.equal(mp.connected, true);
});

test('sesi pulih: kirim sync, bukan join; id publik lama tetap dipakai sampai welcome baru', async () => {
  const dibuat = pasangIoTiruan();
  const mp = new MultiplayerSocket();
  mp.connect({ room: 'oola', name: 'Tamu 1234', color: 1, guest: true });
  const s = dibuat[0];
  await s.sambung();
  s.terima('welcome', { socketId: 'IdPublik1234', guest: true, reason: 'tanpa-login', message: 'x', name: 'Tamu 1234', room: 'oola' });
  s.terkirim.length = 0;
  await s.sambung({ recovered: true });
  assert.deepEqual(s.terkirim, [['sync', { room: 'oola' }]]);
  assert.equal(mp.id, 'IdPublik1234');
});

// ── Voice: siapa yang memanggil ──────────────────────
test('voice: tepat satu dari dua pemain yang memanggil, dan tamu tidak dipanggil', async () => {
  globalThis.window ??= {};
  const { harusMemanggil } = await import('../src/multiplayer/VoiceChat.js');
  const ids = ['Ab3_x-9QrTuv', 'zz01ABCDefgh', '-_09azAZ-_09', 'AAAAAAAAAAAA'];
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) { assert.equal(harusMemanggil(a, b), false); continue; }
      assert.equal(Number(harusMemanggil(a, b)) + Number(harusMemanggil(b, a)), 1, `${a} vs ${b}`);
      assert.equal(harusMemanggil(a, b, { guest: true }), false);
    }
  }
  assert.equal(harusMemanggil(null, 'x'), false);
});

// ── Panel chat: teks pemain lain tidak pernah jadi HTML ──
test('panel chat menulis nama dan pesan pemain lain dengan textContent, bukan innerHTML', async () => {
  const buatEl = (tag) => ({
    tag, children: [], className: '', dataset: {}, _teks: '',
    set innerHTML(_v) { throw new Error('innerHTML dipakai untuk teks pemain'); },
    get firstChild() { return this.children[0]; },
    set textContent(v) { this._teks = v; },
    get textContent() { return this._teks + this.children.map((c) => c.textContent).join(''); },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); return c; },
    addEventListener() {}, scrollTop: 0, scrollHeight: 0,
  });
  const pesan = buatEl('div');
  globalThis.document = {
    getElementById: (id) => (id === 'chat-messages' ? pesan : null),
    createElement: buatEl,
  };
  const { Chat } = await import('../src/ui/Chat.js');
  const chat = new Chat();
  chat.init('Aku');
  const racun = '<img src=x onerror="alert(1)">';
  chat.addMessage({ name: racun, msg: '<b>halo</b> & "kutip"' });
  const baris = pesan.children[0];
  assert.equal(baris.children[0].textContent, racun);
  assert.equal(baris.children[1].textContent, '<b>halo</b> & "kutip"');
  delete globalThis.document;
});
