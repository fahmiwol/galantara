// ═══════════════════════════════════════════════════════
// ArahkanSaya.js — "Arahkan saya ke Sari" (design D9): a chip with the distance and an arrow.
//
// The arrow turns with the camera: it points where the target is ON SCREEN, relative to the
// direction the player walks when pressing ▲. A ground arrow in 3D is stream C's (kaitDunia
// .arahkanPanah); this chip works without it.
// ═══════════════════════════════════════════════════════

import { panah } from '../party/kaitDunia.js';

/** Within this distance the target counts as reached (the NPC talk radius is 2.5 m). */
export const JARAK_TIBA = 2.4;

/**
 * Screen direction from the player to a target for an orbit camera at azimuth `theta`
 * (Camera.js: ▲ walks along (−sin θ, −cos θ), ▶ along (cos θ, −sin θ)).
 * @returns {{jarak:number, sudut:number}} metres, and degrees clockwise from screen-up
 */
export function arahLayar(dari, ke, theta) {
  const dx = ke.x - dari.x;
  const dz = ke.z - dari.z;
  const kanan = dx * Math.cos(theta) - dz * Math.sin(theta);
  const atas = -(dx * Math.sin(theta) + dz * Math.cos(theta));
  return { jarak: Math.hypot(dx, dz), sudut: (Math.atan2(kanan, atas) * 180) / Math.PI };
}

export class ArahkanSaya {
  /**
   * @param {{doc?: Document, ambilPemain: () => {x:number,z:number}, ambilTheta: () => number,
   *          jam?: {setTimeout: Function, clearTimeout: Function}}} p
   */
  constructor({ doc = globalThis.document, ambilPemain, ambilTheta, jam = globalThis }) {
    this.doc = doc;
    this.ambilPemain = ambilPemain;
    this.ambilTheta = ambilTheta;
    this.jam = jam;
    this.target = null;
    this.el = null;
    this._teks = null;
    this._sudut = null;
    this._tiba = false;
    this._penghapus = null;
  }

  _pastikan() {
    if (this.el) return;
    const d = this.doc;
    this.el = d.createElement('div');
    this.el.id = 'gw-arah';
    this.el.setAttribute('role', 'status');
    this._panah = d.createElement('span');
    this._panah.className = 'gw-panah';
    this._panah.setAttribute('aria-hidden', 'true');
    this._panah.textContent = '↑';
    this._label = d.createElement('span');
    this._label.className = 'gw-arah-teks';
    const stop = d.createElement('button');
    stop.type = 'button';
    stop.textContent = '✕ Berhenti';
    stop.addEventListener('click', () => this.berhenti());
    this.el.append(this._panah, this._label, stop);
    d.body.appendChild(this.el);
  }

  /** @param {{id:string, nama:string, ambilPosisi: () => ({x:number,z:number}|null)}} target */
  mulai(target) {
    this._pastikan();
    this.jam.clearTimeout?.(this._penghapus);
    this.target = target;
    this._tiba = false;
    this._teks = null;
    this._sudut = null;
    this.el.classList.add('on');
    this.perbarui();
  }

  berhenti() {
    this.jam.clearTimeout?.(this._penghapus);
    this.target = null;
    this.el?.classList.remove('on');
    panah(null);
  }

  /** Every frame while active; writes to the DOM only when the rounded values change. */
  perbarui() {
    if (!this.target) return;
    const pos = this.target.ambilPosisi();
    const pemain = this.ambilPemain();
    if (!pos || !pemain) return;
    const { jarak, sudut } = arahLayar(pemain, pos, this.ambilTheta());
    if (jarak <= JARAK_TIBA) {
      if (!this._tiba) {
        this._tiba = true;
        this._label.textContent = `${this.target.nama} ada di depanmu. Ketuk Ngobrol.`;
        this._panah.textContent = '✓';
        this.el.style.setProperty('--sudut', '0deg');
        panah(null);
        this._penghapus = this.jam.setTimeout?.(() => this.berhenti(), 5000);
      }
      return;
    }
    if (this._tiba) {
      // Walked away again before the chip closed: keep guiding.
      this._tiba = false;
      this.jam.clearTimeout?.(this._penghapus);
      this._panah.textContent = '↑';
    }
    const teks = `Menuju ${this.target.nama} · ${Math.round(jarak)} m`;
    if (teks !== this._teks) {
      this._teks = teks;
      this._label.textContent = teks;
    }
    const bulat = Math.round(sudut / 5) * 5;
    if (bulat !== this._sudut) {
      this._sudut = bulat;
      this.el.style.setProperty('--sudut', `${bulat}deg`);
    }
    panah({ x: pos.x, z: pos.z });
  }
}
