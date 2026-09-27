// ═══════════════════════════════════════════════════════
// JejakPemilik.js — the owner's recent path, so the party can walk behind the player locally.
//
// Game Engineer report §6b (M2): companion k stands where its owner was at `t − k·0.35 s`, read
// from a ~2 s trail of positions the world already has (the player's own moves; for other players,
// the `player_move` stream in M3). No packet per companion, no physics per companion: a trail the
// player actually walked is free of colliders, so following it needs none.
//
// The trail clock only runs while the owner moves. Standing still freezes it, so the party keeps
// its spacing instead of collapsing onto the player; walking on resumes the line. A jump (warp to
// a Spot, respawn) restarts the trail behind the new position and says so, so companions snap.
// Pure: no THREE, no DOM, no wall clock (the caller passes dt).
// ═══════════════════════════════════════════════════════

/** Seconds between companions along the trail (report §6b). */
export const JEDA_PENDAMPING = 0.35;
/** Trail length kept, seconds of movement: 4 companions × 0.35 s plus slack. */
export const PANJANG_JEJAK = 2.0;
/** A position change larger than this in one frame is a jump, not a walk (m). */
export const JARAK_LOMPAT = 3;
/** Movement below this per frame is standing still (m). */
const DIAM = 0.004;
/** A fresh trail is laid straight behind the owner at this pace, so companion k starts ≈ 1.2·k m back. */
const LAJU_BENIH = 1.2 / JEDA_PENDAMPING;

export class JejakPemilik {
  constructor({ panjang = PANJANG_JEJAK } = {}) {
    this.panjang = panjang;
    /** movement clock (s): advances only while the owner moves */
    this.t = 0;
    /** @type {{t:number, x:number, z:number}[]} oldest first */
    this.titik = [];
  }

  /** Lay a straight trail behind (x, z) facing `arah` (radians, 0 = +z as in Avatar._facing). */
  benih(x, z, arah = 0) {
    const bx = -Math.sin(arah), bz = -Math.cos(arah);
    this.titik = [];
    const n = Math.ceil(this.panjang / JEDA_PENDAMPING) + 1;
    for (let i = n; i >= 1; i--) {
      const mundur = i * JEDA_PENDAMPING;
      this.titik.push({ t: this.t - mundur, x: x + bx * LAJU_BENIH * mundur, z: z + bz * LAJU_BENIH * mundur });
    }
    this.titik.push({ t: this.t, x, z });
  }

  /**
   * Record the owner's position this frame.
   * @param {{x:number, z:number}} pos
   * @param {number} dt seconds since the last frame
   * @param {number} [arah] facing, used to lay a fresh trail
   * @returns {'baru'|'lompat'|'jalan'|'diam'} what happened ('baru' / 'lompat' = companions should snap)
   */
  catat(pos, dt, arah = 0) {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return 'diam';
    const akhir = this.titik.at(-1);
    if (!akhir) {
      this.benih(pos.x, pos.z, arah);
      return 'baru';
    }
    const d = Math.hypot(pos.x - akhir.x, pos.z - akhir.z);
    if (d > JARAK_LOMPAT) {
      this.benih(pos.x, pos.z, arah);
      return 'lompat';
    }
    if (d < DIAM || !(dt > 0)) return 'diam';
    this.t += Math.min(dt, 0.25);
    this.titik.push({ t: this.t, x: pos.x, z: pos.z });
    // Keep one sample older than the window, so a lookup at the far end still interpolates.
    const batas = this.t - this.panjang;
    while (this.titik.length > 2 && this.titik[1].t <= batas) this.titik.shift();
    return 'jalan';
  }

  /** Where the owner was `mundur` seconds of movement ago (interpolated; clamped to the trail). */
  posisiLalu(mundur) {
    const n = this.titik.length;
    if (!n) return null;
    const target = this.t - Math.max(0, mundur);
    if (target >= this.titik[n - 1].t) return { x: this.titik[n - 1].x, z: this.titik[n - 1].z };
    if (target <= this.titik[0].t) return { x: this.titik[0].x, z: this.titik[0].z };
    for (let i = n - 1; i > 0; i--) {
      const a = this.titik[i - 1], b = this.titik[i];
      if (target >= a.t) {
        const u = b.t > a.t ? (target - a.t) / (b.t - a.t) : 1;
        return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
      }
    }
    return { x: this.titik[0].x, z: this.titik[0].z };
  }

  /** Spot for companion k (1-based). */
  titikPendamping(k) {
    return this.posisiLalu(k * JEDA_PENDAMPING);
  }
}
