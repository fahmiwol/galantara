// ═══════════════════════════════════════════════════════
// SpotRuntime.js — Kontrak modul visual per Spot (Sprint 5+)
// Implementasi konkret di ./spots/*.js — jangan monolit di World.js
// ═══════════════════════════════════════════════════════

/**
 * Kontrak modul visual per Spot (POC / produksi). `Game` memuat kelas dari
 * `spotVisualRegistry.js` dan memanggil mount → animate → dispose.
 *
 * @typedef {object} ISpotRuntime
 * @property {import('three').Group} root — grup akar di scene (`spot:<id>`).
 * @property {(scene: import('three').Scene, ctx?: { toast: { show: (msg: string, type?: string) => void } }) => void} mount
 * @property {(scene: import('three').Scene) => void} dispose
 * @property {(t: number) => void} [animate]
 * @property {() => import('three').Object3D[]} [getRaycastTargets] — target raycast MapBuilder / placement
 * @property {import('../interaction/InteractionVolume.js').InteractionVolume[]} [interactionVolumes]
 */

/** Kelas dasar opsional; Spot boleh plain object yang memenuhi ISpotRuntime. */
export class SpotRuntimeBase {
  /** @param {import('three').Scene} scene */
  mount(_scene) {}

  /** @param {import('three').Scene} scene */
  dispose(_scene) {}

  /** @param {number} _t */
  animate(_t) {}

  /** Untuk MapBuilder / raycast placement */
  getRaycastTargets() {
    return [];
  }
}
