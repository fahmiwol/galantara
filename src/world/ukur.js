// ═══════════════════════════════════════════════════════
// world/ukur.js — the `?ukur` page: FPS, draw calls (main + shadow), triangles
//
// Laporan 3D §6a butir 11: one table of numbers from ONE reference phone, measured
// by Fahmi, because every number so far is a laptop or SwiftShader number. Open the
// world with `?ukur` (e.g. https://…/?ukur or http://<ip-laptop>:4400/?ukur) and a
// small panel shows, every half second:
//   FPS (last 2 s) · frame ms mean / worst · DC main pass · DC shadow pass · triangles
// and a "Salin" button copies one row for the table in docs/aset/LOG-C.md.
//
// How it measures without touching Game.js (stream B's): only when `?ukur` is in the
// URL, the World's scene gets a one-shot onBeforeRender that hands us the renderer
// INSTANCE, and that instance's render is wrapped. (Not the prototype: r128 assigns
// `this.render = function …` in the constructor, so a prototype wrapper never runs —
// found in Chromium, 27 Sep: the panel stayed at 0.) r128 renders the shadow map BEFORE it
// resets renderer.info (tools/anggaran-spot.mjs header), so info shows the main pass
// only. Once every 60 renders (and once early) one frame runs with info.autoReset off and a manual reset
// before it: that frame's count = main + shadow, and shadow = that − main
// (docs/brief/suasana/KEPUTUSAN.md, the `autoReset` trick). autoReset is always
// restored, even when render throws — otherwise every later number would pile up.
//
// Without `?ukur` nothing is wrapped and nothing is added to the page.
// ═══════════════════════════════════════════════════════

/** Every how many renders one frame measures the shadow pass (plus once early, at render 5). */
export const TIAP_BAYANGAN = 60;
/** FPS window. 2 s, not 1: SwiftShader or a weak phone at 1–2 fps would otherwise read 0. */
export const JENDELA_MS = 2000;
/** Panel refresh, ms. */
const SEGAR_MS = 500;

/** Is `?ukur` (or `&ukur`) in the URL? */
export function dimintaUkur(lokasi = globalThis.location) {
  try {
    return new URLSearchParams(lokasi?.search ?? '').has('ukur');
  } catch {
    return false;
  }
}

const ribuan = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const koma = (x, d = 1) => x.toFixed(d).replace('.', ',');

/** Numbers only; no DOM, no THREE — tested directly. */
export class PengukurRender {
  constructor({ jam = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
    this._jam = jam;
    this.renderKe = 0;
    /** timestamps (ms) of renders in the last JENDELA_MS */
    this._waktu = [];
    this.utama = { drawCall: 0, segitiga: 0 };
    /** null until the first shadow frame was measured */
    this.bayangan = null;
    this._akhir = null;
    this._lalu = null;
  }

  /** Should THIS render measure main + shadow? */
  giliranBayangan() {
    return this.renderKe === 4 || this.renderKe % TIAP_BAYANGAN === TIAP_BAYANGAN - 1;
  }

  /** After a normal render: info = main pass only. */
  catatUtama(info) {
    this.utama = { drawCall: info.render.calls, segitiga: info.render.triangles };
    this._detak();
  }

  /** After a shadow-measuring render: info = shadow + main. */
  catatTotal(info) {
    this.bayangan = { drawCall: Math.max(0, info.render.calls - this.utama.drawCall) };
    this._detak();
  }

  _detak() {
    this.renderKe++;
    const t = this._jam();
    this._lalu = this._akhir;
    this._akhir = t;
    this._waktu.push(t);
    while (this._waktu.length && t - this._waktu[0] > JENDELA_MS) this._waktu.shift();
  }

  /** @returns {{ fps:number, msRata:number, msTerburuk:number, dcUtama:number, dcBayangan:number|null, segitiga:number }} */
  ringkas() {
    // Renders that stopped (tab hidden, frozen rAF) must read as 0 fps, not the last good second.
    const kini = this._jam();
    while (this._waktu.length && kini - this._waktu[0] > JENDELA_MS) this._waktu.shift();
    const w = this._waktu;
    let terburuk = 0;
    for (let i = 1; i < w.length; i++) terburuk = Math.max(terburuk, w[i] - w[i - 1]);
    let rentang = w.length > 1 ? w[w.length - 1] - w[0] : 0;
    let n = w.length - 1;
    // Under 1 fps (SwiftShader: measured 27 Sep) the window holds one render: use the
    // last gap instead, as long as rendering has not stopped altogether.
    if (n < 1 && this._lalu != null && kini - this._akhir <= 2 * JENDELA_MS) {
      rentang = this._akhir - this._lalu;
      terburuk = rentang;
      n = 1;
    }
    return {
      fps: rentang > 0 ? (n * 1000) / rentang : 0,
      msRata: n > 0 ? rentang / n : 0,
      msTerburuk: terburuk,
      dcUtama: this.utama.drawCall,
      dcBayangan: this.bayangan ? this.bayangan.drawCall : null,
      segitiga: this.utama.segitiga,
    };
  }

  /** One row for the reference-phone table (Indonesian number format). */
  baris({ lebar = 0, tinggi = 0, dpr = 1, perangkat = '' } = {}) {
    const r = this.ringkas();
    return [
      new Date().toISOString().slice(0, 16).replace('T', ' '),
      perangkat,
      `${lebar}×${tinggi} @${koma(dpr, 2)}`,
      `${koma(r.fps)} fps`,
      `${koma(r.msRata)} / ${koma(r.msTerburuk)} ms`,
      `DC ${r.dcUtama} + bayangan ${r.dcBayangan ?? '–'}`,
      `${ribuan(r.segitiga)} segitiga`,
    ].join(' | ');
  }
}

/**
 * Wrap one renderer INSTANCE's render so every render feeds `pengukur`.
 * Idempotent. Returns a function that removes the wrapper.
 * @param {{ render: Function, info?: object }} renderer
 */
export function bungkusRenderer(renderer, pengukur) {
  if (!renderer || typeof renderer.render !== 'function') return () => {};
  if (renderer.render._ukur) return renderer.render._lepas;
  const asli = renderer.render;
  const dibungkus = function render(...args) {
    const info = this.info;
    if (!info || !pengukur.giliranBayangan()) {
      const r = asli.apply(this, args);
      if (info) pengukur.catatUtama(info);
      return r;
    }
    const semula = info.autoReset;
    info.autoReset = false;
    info.reset();
    try {
      return asli.apply(this, args);
    } finally {
      info.autoReset = semula;
      pengukur.catatTotal(info);
    }
  };
  const lepas = () => { if (renderer.render === dibungkus) renderer.render = asli; };
  dibungkus._ukur = true;
  dibungkus._lepas = lepas;
  renderer.render = dibungkus;
  return lepas;
}

/**
 * Get the renderer that draws `adegan` without holding a reference to it: r128
 * calls scene.onBeforeRender(renderer, …) inside render(). One shot, then the
 * scene's own hook is put back.
 */
export function tangkapRenderer(adegan, siap) {
  const semula = adegan.onBeforeRender;
  adegan.onBeforeRender = function (renderer, ...sisa) {
    adegan.onBeforeRender = semula;
    siap(renderer);
    return semula?.call(this, renderer, ...sisa);
  };
  return () => { adegan.onBeforeRender = semula; };
}

/** The on-screen panel. Plain DOM, textContent only. */
export function pasangPanel(pengukur, { dokumen = globalThis.document, jendela = globalThis.window } = {}) {
  if (!dokumen?.createElement || !dokumen.body) return null;
  const panel = dokumen.createElement('div');
  panel.id = 'gw-ukur';
  Object.assign(panel.style, {
    position: 'fixed', left: '8px', top: 'calc(8px + env(safe-area-inset-top, 0px))', zIndex: '9999',
    background: 'rgba(42,31,20,.88)', color: '#FDF6E8', font: '12px/1.45 ui-monospace, Menlo, Consolas, monospace',
    padding: '8px 10px', borderRadius: '10px', whiteSpace: 'pre', pointerEvents: 'auto',
  });
  const teks = dokumen.createElement('div');
  const tombol = dokumen.createElement('button');
  tombol.type = 'button';
  tombol.textContent = 'Salin baris';
  Object.assign(tombol.style, { marginTop: '6px', minHeight: '44px', minWidth: '44px', font: 'inherit', borderRadius: '8px' });
  panel.appendChild(teks);
  panel.appendChild(tombol);
  dokumen.body.appendChild(panel);

  const layar = () => ({
    lebar: jendela?.innerWidth ?? 0, tinggi: jendela?.innerHeight ?? 0, dpr: jendela?.devicePixelRatio ?? 1,
    perangkat: String(jendela?.navigator?.userAgent ?? '').replace(/^Mozilla\/5\.0 /, '').slice(0, 80),
  });
  const segarkan = () => {
    const r = pengukur.ringkas();
    const l = layar();
    teks.textContent = [
      `?ukur  ${l.lebar}×${l.tinggi} @${koma(l.dpr, 2)}`,
      `FPS        ${koma(r.fps)}`,
      `ms rata    ${koma(r.msRata)}  terburuk ${koma(r.msTerburuk)}`,
      `DC utama   ${r.dcUtama}`,
      `DC bayangan ${r.dcBayangan ?? 'menunggu…'}`,
      `segitiga   ${ribuan(r.segitiga)}`,
    ].join('\n');
  };
  tombol.addEventListener?.('click', async () => {
    const baris = pengukur.baris(layar());
    try {
      await jendela.navigator.clipboard.writeText(baris);
      tombol.textContent = 'Tersalin ✓';
    } catch {
      // Clipboard needs HTTPS or localhost; on a LAN address show the row to copy by hand.
      jendela?.prompt?.('Salin baris ini ke tabel HP acuan:', baris);
    }
  });
  segarkan();
  const id = jendela?.setInterval?.(segarkan, SEGAR_MS);
  return { panel, segarkan, lepas: () => { jendela?.clearInterval?.(id); panel.remove?.(); } };
}

let _aktif = null;

/**
 * Called by World on construction. Does nothing without `?ukur`.
 * @param {{ adegan?: THREE.Scene }} opsi the scene the game renders (World.scene)
 * @returns {{ pengukur: PengukurRender } | null}
 */
export function pasangUkurBilaDiminta({ adegan, lokasi = globalThis.location, dokumen, jendela } = {}) {
  if (_aktif || !adegan || !dimintaUkur(lokasi)) return _aktif;
  const pengukur = new PengukurRender();
  let lepasBungkus = () => {};
  const lepasTangkap = tangkapRenderer(adegan, (r) => { lepasBungkus = bungkusRenderer(r, pengukur); });
  const panel = pasangPanel(pengukur, { dokumen, jendela });
  _aktif = { pengukur, panel, lepas: () => { lepasTangkap(); lepasBungkus(); panel?.lepas(); _aktif = null; } };
  return _aktif;
}

// ── `?ukur&party=N`: measure the worst case B will produce ─────────────
// SPRINT-02 C butir 5: "Oola ≤ 150 DC with party 4 + full Markas, measured with ?ukur".
// Until stream B drives the companion kit from the real party, this puts N (1–4)
// companions from the instanced kit in front of the Markas (the `tanya_*` points,
// on the ground, facing the plaza) and fills the Markas (4 desks working, every
// scroll slot). Measurement page only: nothing happens without `?ukur`.

/** N from `?ukur&party=N`, clamped to 0–4 (the party cap). 0 without `?ukur`. */
export function jumlahPartyUkur(lokasi = globalThis.location) {
  if (!dimintaUkur(lokasi)) return 0;
  try {
    const n = Number.parseInt(new URLSearchParams(lokasi?.search ?? '').get('party') ?? '', 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(4, n)) : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {{ scene: THREE.Scene }} world
 * @param {{ buatKitPendamping: Function }} P  pendamping module
 * @param {object} M  markas module (index.js)
 * @returns {import('./pendamping/index.js').KitPendamping|null}
 */
export function pasangPartyUkur(world, P, M, lokasi = globalThis.location) {
  const n = jumlahPartyUkur(lokasi);
  if (!n || world._partyUkur) return world._partyUkur ?? null;
  const kelas = ['penjejak', 'operator', 'pemandu', 'penjejak'];
  const kit = P.buatKitPendamping(world.scene, { maks: 4 });
  for (let i = 0; i < n; i++) {
    const t = M.titikMarkas(`tanya_${i + 1}`);
    kit.tambah(`ukur_${i + 1}`, kelas[i]);
    kit.pindah(`ukur_${i + 1}`, t.x, t.y, t.z, t.arah);
  }
  kit.perbarui();
  for (let i = 0; i < M.KAPASITAS_GULUNGAN; i++) M.tambahGulungan(`ukur_hasil_${i}`);
  for (let i = 0; i < 4; i++) M.tampilkanStatus3D(`ukur_meja_${i + 1}`, 'bekerja', { slot: i });
  world._partyUkur = kit;
  return kit;
}
