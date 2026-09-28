// ═══════════════════════════════════════════════════════
// KontrolSentuh.js — talking to NPCs without a keyboard (design D1).
//
// Before this, [E] was the only way to open an NPC dialog, so on a phone Sari could not be
// recruited at all. Three touch paths now reach the same action:
//   1. tap the NPC in the world (a tap, not a camera drag);
//   2. the "Ngobrol" button in the proximity hint (HUD.js);
//   3. the D-pad centre, which interacts with whatever is near (NPC first, then a zone).
// ═══════════════════════════════════════════════════════

import { TINGGI_KEPALA_NPC } from '../entities/NPC.js';

/** A pointer that moved less than this and lifted within this time is a tap. */
export const GESER_KETUK_PX = 10;
export const LAMA_KETUK_MS = 500;
/** NPCs are small on a phone: accept taps this close to the body (half a 44 px target + margin). */
export const RADIUS_KETUK_PX = 28;

/**
 * Pure hit test. Each candidate is the NPC's screen column from feet to head.
 * @param {{x:number, y:number}} ketuk
 * @param {Array<{id:string, kaki:{x:number,y:number}, kepala:{x:number,y:number}}>} kandidat
 * @returns {string|null} id of the nearest NPC under the tap
 */
export function pilihNpcDiLayar(ketuk, kandidat, radius = RADIUS_KETUK_PX) {
  let terbaik = null;
  let jarakTerbaik = Infinity;
  for (const k of kandidat) {
    const atas = Math.min(k.kepala.y, k.kaki.y) - radius;
    const bawah = Math.max(k.kepala.y, k.kaki.y) + radius / 2;
    if (ketuk.y < atas || ketuk.y > bawah) continue;
    // Horizontal distance to the column (it can lean with perspective).
    const t = Math.max(0, Math.min(1, (ketuk.y - k.kepala.y) / ((k.kaki.y - k.kepala.y) || 1)));
    const cx = k.kepala.x + (k.kaki.x - k.kepala.x) * t;
    const jarak = Math.abs(ketuk.x - cx);
    if (jarak <= radius && jarak < jarakTerbaik) {
      jarakTerbaik = jarak;
      terbaik = k.id;
    }
  }
  return terbaik;
}

export class KontrolSentuh {
  /**
   * @param {{kanvas: HTMLElement, ambilKamera: () => any, ambilNpc: () => Array<{id:string,x:number,z:number}>,
   *          onKetukNpc: (id:string) => void, tombolTengah?: HTMLElement|null, onTengah?: () => void}} p
   */
  constructor({ kanvas, ambilKamera, ambilNpc, onKetukNpc, tombolTengah = null, onTengah = null }) {
    this.kanvas = kanvas;
    this.ambilKamera = ambilKamera;
    this.ambilNpc = ambilNpc;
    this.onKetukNpc = onKetukNpc;
    this._turun = null;
    this._v = null;

    kanvas?.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) { this._turun = null; return; }
      this._turun = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    });
    kanvas?.addEventListener('pointerup', (e) => {
      const d = this._turun;
      this._turun = null;
      if (!d || d.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > GESER_KETUK_PX) return; // a camera drag
      if (performance.now() - d.t > LAMA_KETUK_MS) return;
      const id = this.npcDi(e.clientX, e.clientY);
      if (id) this.onKetukNpc?.(id);
    });
    kanvas?.addEventListener('pointercancel', () => { this._turun = null; });

    if (tombolTengah && onTengah) {
      tombolTengah.setAttribute('role', 'button');
      tombolTengah.setAttribute('tabindex', '0');
      tombolTengah.setAttribute('aria-label', 'Interaksi: bicara dengan warga terdekat');
      tombolTengah.addEventListener('pointerdown', (e) => e.preventDefault());
      tombolTengah.addEventListener('click', () => onTengah());
      tombolTengah.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTengah(); }
      });
    }
  }

  /** Project a world point to canvas pixels, or null when behind the camera. */
  _proyeksi(x, y, z, kamera, W, H) {
    this._v ??= new THREE.Vector3();
    this._v.set(x, y, z).project(kamera);
    if (this._v.z >= 1 || this._v.z < -1) return null;
    return { x: (this._v.x * 0.5 + 0.5) * W, y: (-this._v.y * 0.5 + 0.5) * H };
  }

  /** @returns {string|null} NPC under a canvas point */
  npcDi(px, py) {
    const kamera = this.ambilKamera();
    if (!kamera) return null;
    const r = this.kanvas.getBoundingClientRect();
    const W = r.width, H = r.height;
    const kandidat = [];
    for (const n of this.ambilNpc()) {
      const kaki = this._proyeksi(n.x, 0, n.z, kamera, W, H);
      const kepala = this._proyeksi(n.x, TINGGI_KEPALA_NPC, n.z, kamera, W, H);
      if (kaki && kepala) kandidat.push({ id: n.id, kaki, kepala });
    }
    return pilihNpcDiLayar({ x: px - r.left, y: py - r.top }, kandidat);
  }
}
