// ═══════════════════════════════════════════════════════
// Zones.js — Proximity zone detection (Warp, Info, dll.)
// ═══════════════════════════════════════════════════════

import { ZONES } from '../data/config.js';

export class Zones {
  constructor() {
    this._active = null; // zone yg sedang aktif
    this._onEnter = null;
    this._onLeave = null;
  }

  // Callback saat masuk / keluar zone
  onEnter(fn) { this._onEnter = fn; return this; }
  onLeave(fn) { this._onLeave = fn; return this; }

  // Dipanggil setiap frame — pos = { x, z }
  update(pos) {
    const prev = this._active;
    this._active = null;

    let closest = null;
    let closestDist = Infinity;

    for (const zone of ZONES) {
      const dx = pos.x - zone.x;
      const dz = pos.z - zone.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < zone.r && dist < closestDist) {
        closestDist = dist;
        closest = zone;
      }
    }

    this._active = closest;

    if (closest && closest !== prev) {
      this._onEnter?.(closest);
    } else if (!closest && prev) {
      this._onLeave?.(prev);
    }
  }

  get active() { return this._active; }

  /**
   * Kosongkan zona Oola saat dunia diganti (mis. Spot Bogor) supaya hint / [F] tidak salah.
   * Memicu onLeave jika sebelumnya ada zona aktif.
   */
  suspendForSpotWorld() {
    const prev = this._active;
    this._active = null;
    if (prev) this._onLeave?.(prev);
  }
}
