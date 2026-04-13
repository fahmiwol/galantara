// ═══════════════════════════════════════════════════════
// InteractionVolume.js — Zona interaksi 2D (XZ) untuk Spot
// Tanpa scene.traverse: hanya tes jarak tiap volume terdaftar.
// ═══════════════════════════════════════════════════════

/**
 * @typedef {'sphere' | 'box'} InteractionShape
 */

export class InteractionVolume {
  /**
   * @param {{
   *   id: string,
   *   shape?: InteractionShape,
   *   center: { x: number, z: number },
   *   radius?: number,
   *   halfXZ?: { x: number, z: number },
   *   hint: string,
   *   useKeyHint?: string,
   *   onUse?: () => void,
   * }} spec
   */
  constructor(spec) {
    this.id = spec.id;
    this.shape = spec.shape ?? 'sphere';
    this.cx = spec.center.x;
    this.cz = spec.center.z;
    this.radius = spec.radius ?? 1.5;
    this.hx = spec.halfXZ?.x ?? 1;
    this.hz = spec.halfXZ?.z ?? 1;
    this.hint = spec.hint;
    this.useKeyHint = spec.useKeyHint ?? '[F]';
    this.onUse = spec.onUse;
    /** @private */
    this._inside = false;
  }

  /** @param {{ x: number, z: number }} pos */
  containsXZ(pos) {
    if (this.shape === 'sphere') {
      const dx = pos.x - this.cx;
      const dz = pos.z - this.cz;
      return Math.sqrt(dx * dx + dz * dz) <= this.radius;
    }
    const dx = Math.abs(pos.x - this.cx);
    const dz = Math.abs(pos.z - this.cz);
    return dx <= this.hx && dz <= this.hz;
  }

  /**
   * @param {{ x: number, z: number }} pos
   * @returns {'enter' | 'exit' | 'none'}
   */
  updateEdge(pos) {
    const inside = this.containsXZ(pos);
    let edge = 'none';
    if (inside && !this._inside) edge = 'enter';
    else if (!inside && this._inside) edge = 'exit';
    this._inside = inside;
    return edge;
  }

  get inside() {
    return this._inside;
  }

  /** Panggil saat unload Spot (warp keluar) agar edge berikutnya konsisten */
  reset() {
    this._inside = false;
  }
}
