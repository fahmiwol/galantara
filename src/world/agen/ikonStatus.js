// ═══════════════════════════════════════════════════════
// agen/ikonStatus.js — status layers 2 and 3: the 28 px icon and the edge arrow
//
// Laporan 3D §6.5 reads an agent's `status_kerja` in three layers:
//   1. place + pose (world)         → ../markas/index.js tampilkanStatus3D + pose.js
//   2. screen icon, 28 px HTML      → THIS file, above the agent's head
//   3. off-screen arrow at the edge → THIS file, only for statuses that need the player
//
// Rules that are easy to break quietly, each guarded in tests/agen3dIkonStatus.test.mjs:
//  - SHAPE carries the meaning, colour only reinforces it (WCAG 1.4.1): every status
//    has its own outline, and the markup differs even with every colour removed.
//  - Colours are not chosen here: they come from ../markas/keadaan.js (WARNA_STATUS,
//    WARNA_UNTUK_STATUS), the same values the beacon and desk lamps glow in.
//  - The icon hides by SIZE ON SCREEN, not distance (ADR-0004): agent < 24 px tall
//    = no icon. H = 0 (layout not ready) never hides it (ADR-0012).
//  - The arrow appears only for an agent that is off-screen or behind the camera AND
//    whose status needs the player (hasil_siap, menunggu_otak, gagal). Working or
//    queued agents off-screen stay silent: the world stays calm.
//  - `terlihat(npcId)` reports which channel shows the status, so the caller can
//    decide a toast only when neither does (ADR-0005: one message, one channel).
//  - Only the viewer's own party gets icons (laporan 3D §6.5): other parties show
//    pose + ✦ only. That filter is the caller's; this layer draws what it is given.
//  - No endless pulsing (Desain §9.4): "working" dots turn, "needs you" bounces ONCE
//    on arrival, "failed" is still. prefers-reduced-motion = all still.
// ═══════════════════════════════════════════════════════

import { WARNA_STATUS, WARNA_UNTUK_STATUS, STATUS_KERJA } from '../markas/keadaan.js';

/** CSS pixel size of the icon (laporan 3D §6.5). */
export const UKURAN_IKON_PX = 28;
/** Below this on-screen agent height the icon points at nobody (ADR-0004). */
export const MIN_PX_AGEN = 24;
/** Agent height used for the size test: body + head, the "36 px per 1,23 m" of laporan 3D §6.3. */
export const TINGGI_AGEN = 1.23;
/** Anchor above the NPC origin: the DOM name tag sits at 1,3 (NPC.js); the icon sits above it. */
export const ANGKUR_Y = 1.3;
/** Gap between the arrow and the screen edge, px (leaves room for the 28 px icon). */
export const TEPI_PANAH_PX = 26;

/** Statuses that need the player: these, and only these, get the edge arrow. */
export const PERLU_TINDAKAN = Object.freeze(['hasil_siap', 'menunggu_otak', 'gagal', 'menunggu_persetujuan']);

const hex = (n) => `#${n.toString(16).padStart(6, '0').toUpperCase()}`;

/**
 * One SVG per status, 24×24 viewBox, drawn in `currentColor` so the colour is
 * applied in exactly one place. `bentuk` names the outline (used by tests and CSS).
 * `siap` has no icon on purpose (the world stays calm; ✦ is enough).
 */
export const IKON_STATUS = Object.freeze({
  antre: Object.freeze({
    bentuk: 'jam-pasir', label: 'Antre',
    svg: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  }),
  bekerja: Object.freeze({
    bentuk: 'tiga-titik', label: 'Sedang bekerja',
    svg: '<g class="gw-putar"><circle cx="12" cy="5" r="2.6" fill="currentColor"/><circle cx="18.1" cy="15.5" r="2.6" fill="currentColor"/><circle cx="5.9" cy="15.5" r="2.6" fill="currentColor"/></g>',
  }),
  hasil_siap: Object.freeze({
    bentuk: 'gulungan', label: 'Hasil siap · perlu persetujuanmu',
    svg: '<rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 6h4M3 18h4M17 6h4M17 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8.5 12.5l2.4 2.4 4.6-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  }),
  menunggu_otak: Object.freeze({
    bentuk: 'balon-tanya', label: 'Menunggu otak · butuh kamu',
    svg: '<path d="M4 4h16v12H11l-5 4v-4H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.8 8.2a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.8-1.1 1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14" r="1.1" fill="currentColor"/>',
  }),
  menunggu_persetujuan: Object.freeze({
    // A stack of coins with a question: "may I spend?" (M2, paid tool waiting for approval).
    bentuk: 'koin-tanya', label: 'Menunggu izinmu · alat berbiaya',
    svg: '<ellipse cx="9" cy="17" rx="6" ry="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 17v-4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6M3 13V9c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="9" cy="9" rx="6" ry="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17.6 4.2a2 2 0 1 1 2.9 1.8c-.6.3-.9.7-.9 1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="19.6" cy="10" r="1" fill="currentColor"/>',
  }),
  gagal: Object.freeze({
    bentuk: 'segitiga-seru', label: 'Gagal',
    svg: '<path d="M12 3L22 20H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
  }),
});

/** Status → CSS colour (dark-surface value: the icon sits on the dark pill). */
export function warnaIkon(status) {
  const token = WARNA_UNTUK_STATUS[status];
  return token ? hex(WARNA_STATUS[token]) : null;
}

const CSS = `
.gw-ikon-status,.gw-panah-status{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;z-index:3}
.gw-ikon-status{width:${UKURAN_IKON_PX}px;height:${UKURAN_IKON_PX}px;margin:-${UKURAN_IKON_PX + 22}px 0 0 -${UKURAN_IKON_PX / 2}px;
  border-radius:999px;background:rgba(42,31,20,.88);display:none;align-items:center;justify-content:center;
  box-shadow:0 1px 4px rgba(0,0,0,.35)}
.gw-ikon-status.on,.gw-panah-status.on{display:flex}
.gw-ikon-status svg{width:20px;height:20px}
.gw-ikon-status.gw-tiba{animation:gw-pantul .25s ease-out 1}
.gw-ikon-status .gw-putar{transform-origin:12px 12px;animation:gw-putar 2s linear infinite}
.gw-panah-status{display:none;width:${UKURAN_IKON_PX + 12}px;height:${UKURAN_IKON_PX + 12}px;margin:-${(UKURAN_IKON_PX + 12) / 2}px 0 0 -${(UKURAN_IKON_PX + 12) / 2}px;
  align-items:center;justify-content:center;border-radius:999px;background:rgba(42,31,20,.88);box-shadow:0 1px 4px rgba(0,0,0,.35)}
.gw-panah-status svg{width:20px;height:20px}
.gw-panah-status .gw-mata-panah{position:absolute;left:50%;top:50%;width:0;height:0;margin:-6px 0 0 ${(UKURAN_IKON_PX + 12) / 2 - 2}px;
  border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:9px solid currentColor;transform-origin:-${(UKURAN_IKON_PX + 12) / 2 - 2}px 6px}
@keyframes gw-pantul{0%{translate:0 0}40%{translate:0 -6px}100%{translate:0 0}}
@keyframes gw-putar{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.gw-ikon-status.gw-tiba,.gw-ikon-status .gw-putar{animation:none}}
`;

let _v = null;
let _vc = null;

/**
 * One layer for all status icons of the viewer's party.
 *
 *   const ikon = new LapisanIkonStatus(camera, document.getElementById('lbl-layer'));
 *   ikon.setel('sari', 'bekerja', sari.mesh);   // or () => ({ x, y, z })
 *   ikon.perbarui();                             // every frame, after NPCs moved
 *   ikon.terlihat('sari')                        // 'ikon' | 'panah' | null
 */
export class LapisanIkonStatus {
  /**
   * @param {THREE.PerspectiveCamera|null} kamera
   * @param {HTMLElement|string|null} lapisan element (or its id) the icons are placed in
   * @param {{ dokumen?: Document }} [opsi]
   */
  constructor(kamera, lapisan = 'lbl-layer', { dokumen = globalThis.document } = {}) {
    this.kamera = kamera;
    this._dok = dokumen;
    this._lapisan = typeof lapisan === 'string' ? dokumen?.getElementById?.(lapisan) ?? null : lapisan;
    /** @type {Map<string, {status:string, ambil:Function, el:any, panah:any, terlihat:null|'ikon'|'panah', layar:{x:number,y:number,sudut?:number}|null}>} */
    this._agen = new Map();
    this._pasangCss();
  }

  _pasangCss() {
    const d = this._dok;
    if (!d?.createElement || d.getElementById?.('gw-ikon-status-css')) return;
    const s = d.createElement('style');
    s.id = 'gw-ikon-status-css';
    s.textContent = CSS;
    d.head?.appendChild(s);
  }

  /**
   * Show `status` for one agent. `siap`/null removes its icon.
   * @param {string} npcId
   * @param {string|null} status runtime `status_kerja`
   * @param {THREE.Object3D | (() => ({x:number,y:number,z:number}|null))} sumber
   *   the NPC mesh (anchor = its world position + ANGKUR_Y) or a getter of the anchor
   */
  setel(npcId, status, sumber) {
    if (status != null && !STATUS_KERJA.includes(status)) {
      throw new Error(`status_kerja tidak dikenal: "${status}". Yang ada: ${STATUS_KERJA.join(', ')}`);
    }
    const ikon = status ? IKON_STATUS[status] : null;
    if (!ikon) { this.buang(npcId); return null; }
    let a = this._agen.get(npcId);
    const ambil = typeof sumber === 'function' ? sumber : (sumber ? ambilDariMesh(sumber) : a?.ambil);
    if (typeof ambil !== 'function') throw new Error(`ikon status "${npcId}" butuh mesh NPC atau fungsi posisi`);
    if (!a) {
      a = { status: null, ambil, el: this._buatEl('gw-ikon-status'), panah: this._buatEl('gw-panah-status'), terlihat: null, layar: null };
      this._agen.set(npcId, a);
    }
    a.ambil = ambil;
    if (a.status !== status) {
      a.status = status;
      const warna = warnaIkon(status);
      for (const el of [a.el, a.panah]) {
        if (!el) continue;
        el.dataset.status = status;
        el.dataset.bentuk = ikon.bentuk;
        el.style.color = warna;
        el.setAttribute?.('role', 'img');
        el.setAttribute?.('aria-label', `${npcId}: ${ikon.label}`);
      }
      if (a.el) a.el.innerHTML = svg(ikon);
      if (a.panah) a.panah.innerHTML = `<span class="gw-mata-panah"></span>${svg(ikon)}`;
      // "Needs you" bounces once on arrival; nothing pulses forever (Desain §9.4).
      a.el?.classList.remove('gw-tiba');
      if (PERLU_TINDAKAN.includes(status) && status !== 'gagal') a.el?.classList.add('gw-tiba');
    }
    this._tempatkan(a);
    return a.terlihat;
  }

  /** Remove one agent's icon and arrow (left the party, back to `siap`). */
  buang(npcId) {
    const a = this._agen.get(npcId);
    if (!a) return false;
    a.el?.remove?.();
    a.panah?.remove?.();
    this._agen.delete(npcId);
    return true;
  }

  hapusSemua() {
    for (const id of [...this._agen.keys()]) this.buang(id);
  }

  /** Per frame: re-project every icon. Cheap: one vector reused, no layout reads. */
  perbarui(kamera = this.kamera) {
    if (kamera) this.kamera = kamera;
    for (const a of this._agen.values()) this._tempatkan(a);
  }

  /**
   * Which channel shows this agent's status right now: 'ikon' (above its head),
   * 'panah' (edge arrow), or null (neither — the caller may toast, ADR-0005).
   */
  terlihat(npcId) {
    return this._agen.get(npcId)?.terlihat ?? null;
  }

  /** Screen placement of an agent's icon or arrow, for tests and debugging. */
  posisiLayar(npcId) {
    return this._agen.get(npcId)?.layar ?? null;
  }

  _buatEl(kelas) {
    if (!this._lapisan || !this._dok?.createElement) return null;
    const el = this._dok.createElement('div');
    el.className = kelas;
    el.dataset ??= {};
    el.style ??= {};
    this._lapisan.appendChild(el);
    return el;
  }

  _ukuranLayar() {
    const l = this._lapisan;
    const W = l?.clientWidth || globalThis.window?.innerWidth || 0;
    const H = l?.clientHeight || globalThis.window?.innerHeight || 0;
    return [W, H];
  }

  _tempatkan(a) {
    const p = a.ambil();
    const kam = this.kamera;
    a.terlihat = null;
    a.layar = null;
    if (!p || !kam) return this._tampil(a, null);
    _v ??= new THREE.Vector3();
    _vc ??= new THREE.Vector3();
    _v.set(p.x, p.y, p.z);
    const [W, H] = this._ukuranLayar();

    kam.updateMatrixWorld?.();
    _vc.copy(_v).applyMatrix4(kam.matrixWorldInverse);
    const diDepan = _vc.z < -(kam.near ?? 0);
    _v.project(kam);
    const diLayar = diDepan && _v.z < 1 && _v.x >= -1 && _v.x <= 1 && _v.y >= -1 && _v.y <= 1;

    if (diLayar) {
      // ADR-0004: hide by the agent's size on screen. Unknown H (0) never hides.
      if (H > 0 && kam.isPerspectiveCamera) {
        const jarak = Math.max(-_vc.z, 1e-3);
        const pxPerUnit = H / (2 * Math.tan((kam.fov * Math.PI) / 360)) / jarak;
        if (TINGGI_AGEN * pxPerUnit < MIN_PX_AGEN) return this._tampil(a, null);
      }
      a.layar = { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H };
      a.terlihat = 'ikon';
      return this._tampil(a, 'ikon');
    }

    // Off-screen or behind: arrow only for statuses that need the player.
    if (!PERLU_TINDAKAN.includes(a.status) || !(W > 0 && H > 0)) return this._tampil(a, null);
    a.layar = panahTepi(_vc, kam, W, H);
    a.terlihat = 'panah';
    return this._tampil(a, 'panah');
  }

  _tampil(a, mode) {
    const on = (el, ya) => { if (el) { if (ya) el.classList.add('on'); else el.classList.remove('on'); } };
    on(a.el, mode === 'ikon');
    on(a.panah, mode === 'panah');
    if (!mode || !a.layar) return;
    const el = mode === 'ikon' ? a.el : a.panah;
    if (!el) return;
    el.style.transform = `translate(${a.layar.x.toFixed(1)}px, ${a.layar.y.toFixed(1)}px)`;
    if (mode === 'panah') {
      const tip = el.firstChild ?? el.querySelector?.('.gw-mata-panah');
      if (tip?.style) tip.style.transform = `rotate(${a.layar.sudut.toFixed(3)}rad)`;
    }
  }
}

function svg(ikon) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ikon.svg}</svg>`;
}

/** Anchor getter for an NPC mesh: its world position + ANGKUR_Y. */
function ambilDariMesh(mesh) {
  const p = { x: 0, y: 0, z: 0 };
  let w = null;
  return () => {
    if (!mesh || mesh.visible === false) return null;
    mesh.updateWorldMatrix?.(true, false);
    w ??= new THREE.Vector3();
    w.setFromMatrixPosition(mesh.matrixWorld);
    p.x = w.x; p.y = w.y + ANGKUR_Y; p.z = w.z;
    return p;
  };
}

/**
 * Edge position of the arrow for a point in CAMERA space. The direction comes
 * from camera-space x/y scaled by the frustum, which stays right for points
 * behind the camera (where project() mirrors them). Straight behind = bottom.
 * @returns {{ x:number, y:number, sudut:number }} px, and the angle the arrow points (0 = right, y down)
 */
export function panahTepi(vc, kam, W, H) {
  const tanY = Math.tan(((kam.fov ?? 50) * Math.PI) / 360);
  const tanX = tanY * (kam.aspect || W / H || 1);
  let dx = vc.x / tanX;
  let dy = -vc.y / tanY;
  // Dividing by depth (the perspective divide) scales dx and dy alike, so the
  // direction is the same in front of and behind the camera — no branch needed.
  if (Math.hypot(dx, dy) < 1e-6) { dx = 0; dy = 1; }
  const setW = W / 2 - TEPI_PANAH_PX;
  const setH = H / 2 - TEPI_PANAH_PX;
  const t = Math.min(setW / Math.max(Math.abs(dx * W / 2), 1e-9), setH / Math.max(Math.abs(dy * H / 2), 1e-9));
  const x = W / 2 + dx * (W / 2) * t;
  const y = H / 2 + dy * (H / 2) * t;
  return { x, y, sudut: Math.atan2(dy * H, dx * W) };
}
