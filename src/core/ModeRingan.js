// ═══════════════════════════════════════════════════════
// ModeRingan.js — "Mode Ringan" for slow phones (Game report §5.2, SPRINT-02 B8).
//
// Light = pixel ratio 1 and no shadows. Turned on by itself when the world runs under 25 FPS for
// 5 seconds of play, and the player can switch it either way. The choice is kept per device:
//   'otomatis' (default: watch the frame rate) · 'nyala' (always light) · 'mati' (never light,
//   never switched on by itself again). An automatic switch-on is remembered as 'nyala' so the next
//   visit starts light at once. Antialias would need a new WebGL context: not touched here.
// Frame time comes from the game loop (dt), never a wall clock; a pause (hidden tab) is not slowness.
// ═══════════════════════════════════════════════════════

export const KUNCI_MODE_RINGAN = 'galantara_mode_ringan';
export const FPS_BATAS = 25;
export const DETIK_LAMBAT = 5;
/** Frames longer than this are a pause (tab hidden, debugger), not a slow device. */
const JEDA = 1;
const JENDELA = 1; // seconds averaged per FPS reading

export class ModeRingan {
  /** @param {{penyimpanan?: Storage|null, terapkan?: (nyala: boolean) => void}} [p] */
  constructor({ penyimpanan = null, terapkan = () => {} } = {}) {
    this.penyimpanan = penyimpanan;
    this.terapkan = terapkan;
    let pilihan = null;
    try { pilihan = penyimpanan?.getItem(KUNCI_MODE_RINGAN) ?? null; } catch { pilihan = null; }
    /** @type {'otomatis'|'nyala'|'mati'} */
    this.pilihan = ['nyala', 'mati'].includes(pilihan) ? pilihan : 'otomatis';
    this.nyala = this.pilihan === 'nyala';
    this._lambat = 0;
    this._jendela = { waktu: 0, frame: 0 };
    if (this.nyala) this.terapkan(true);
  }

  _simpan() {
    try { this.penyimpanan?.setItem(KUNCI_MODE_RINGAN, this.pilihan); } catch { /* storage blocked */ }
  }

  /**
   * One frame. @returns {boolean} true on the frame it switched itself on
   */
  catat(dt) {
    if (this.pilihan !== 'otomatis' || this.nyala) return false;
    if (!Number.isFinite(dt) || dt <= 0) return false;
    if (dt > JEDA) { this._lambat = 0; this._jendela = { waktu: 0, frame: 0 }; return false; }
    const j = this._jendela;
    j.waktu += dt;
    j.frame += 1;
    if (j.waktu < JENDELA) return false;
    const fps = j.frame / j.waktu;
    this._lambat = fps < FPS_BATAS ? this._lambat + j.waktu : 0;
    this._jendela = { waktu: 0, frame: 0 };
    if (this._lambat < DETIK_LAMBAT) return false;
    this.pilihan = 'nyala';
    this.nyala = true;
    this._simpan();
    this.terapkan(true);
    return true;
  }

  /** The player's switch. @returns {boolean} the new state */
  setel(nyala) {
    this.pilihan = nyala ? 'nyala' : 'mati';
    this.nyala = Boolean(nyala);
    this._lambat = 0;
    this._simpan();
    this.terapkan(this.nyala);
    return this.nyala;
  }
}

/**
 * Apply to the Renderer: pixel ratio 1 and the sun's shadow off (turning the light's castShadow off
 * changes the lights state, so three.js recompiles materials without shadow sampling by itself).
 * @param {{renderer: any, sun?: any}} r  @param {boolean} nyala  @param {number} [dpr]
 */
export function terapkanRingan(r, nyala, dpr = globalThis.devicePixelRatio ?? 1) {
  if (!r?.renderer) return;
  r.renderer.setPixelRatio(nyala ? 1 : Math.min(dpr, 2));
  r.renderer.shadowMap.enabled = !nyala;
  if (r.sun) r.sun.castShadow = !nyala;
}
