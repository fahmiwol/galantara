// ═══════════════════════════════════════════════════════
// JejakPemilik.js — the owner's recent path, so the party can walk behind the player locally.
//
// Game Engineer report §6b (M2): companion k stands where its owner was at `t − k·0.35 s`, read
// from a recent trail of positions the world already has (the player's own moves; for other players,
// the `player_move` stream in M3). No packet per companion, no physics per companion: a trail the
// player actually walked is free of colliders, so following it needs none.
//
// The trail clock only runs while the owner moves. Standing still freezes it, so the party keeps
// its spacing instead of collapsing onto the player; walking on resumes the line. A jump (warp to
// a Spot, respawn) restarts the trail behind the new position and says so, so companions snap.
// Slow movement also keeps at least 1.2 m of PATH per slot (the seed spacing), so sliding along a
// wall cannot compress the whole line into the owner. This is not a collision solver: a trail
// that loops back on itself can still cross. Pure: no THREE, DOM or wall clock (caller passes dt).
// ═══════════════════════════════════════════════════════

import { KECEPATAN } from '../fisika/Karakter.js';

/** Seconds between companions along the trail (report §6b). */
export const JEDA_PENDAMPING = 0.35;
/** Trail length kept, seconds of movement: 4 companions × 0.35 s plus slack. */
export const PANJANG_JEJAK = 2.0;
/** A position change larger than this in one frame is a jump, not a walk (m). */
export const JARAK_LOMPAT = 3;
/** Movement below this per frame is standing still (m). */
const DIAM = 0.004;
/** Minimum distance along the recorded path per slot; not a radial offset into unwalked space. */
export const JARAK_LINTASAN_PENDAMPING = 1.2;
/** A fresh trail is laid straight behind the owner at this pace, so companion k starts ≈ 1.2·k m back. */
const LAJU_BENIH = JARAK_LINTASAN_PENDAMPING / JEDA_PENDAMPING;

export class JejakPemilik {
  constructor({ panjang = PANJANG_JEJAK } = {}) {
    this.panjang = panjang;
    /** movement clock (s): advances only while the owner moves */
    this.t = 0;
    this.s = 0; // cumulative walked distance, independent of frame timing
    /** @type {{t:number, s:number, x:number, z:number}[]} oldest first */
    this.titik = [];
  }

  /** Lay a straight trail behind (x, z) facing `arah` (radians, 0 = +z as in Avatar._facing). */
  benih(x, z, arah = 0) {
    const bx = -Math.sin(arah), bz = -Math.cos(arah);
    this.titik = [];
    const n = Math.ceil(this.panjang / JEDA_PENDAMPING) + 1;
    for (let i = n; i >= 1; i--) {
      const mundur = i * JEDA_PENDAMPING;
      this.titik.push({ t: this.t - mundur, s: this.s - LAJU_BENIH * mundur, x: x + bx * LAJU_BENIH * mundur, z: z + bz * LAJU_BENIH * mundur });
    }
    this.titik.push({ t: this.t, s: this.s, x, z });
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
    // Avatar advances real time; the party caller caps dt at 0.25 s. A slow frame must not
    // record an impossible speed and stretch the line. Reuse the avatar's canonical speed;
    // smaller/sliding steps still keep the caller's time and the minimum path spacing below.
    this.t += Math.max(Math.min(dt, 0.25), d / KECEPATAN);
    this.s += d;
    this.titik.push({ t: this.t, s: this.s, x: pos.x, z: pos.z });
    // Keep both windows and one older sample for interpolation. DIAM bounds crawl history too:
    // default <= ~1718 samples, versus ~122 at normal 60 Hz walking. No per-frame sort or mesh.
    const batas = this.t - this.panjang;
    const batasJarak = this.s - LAJU_BENIH * this.panjang;
    while (this.titik.length > 2 && this.titik[1].t <= batas && this.titik[1].s <= batasJarak) this.titik.shift();
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

  /** Spot for companion k (1-based), satisfying both time and path-distance offsets. */
  titikPendamping(k) {
    if (!this.titik.length) return null;
    const slot = Math.max(0, k);
    const waktu = this.t - slot * JEDA_PENDAMPING;
    const jarak = this.s - slot * JARAK_LINTASAN_PENDAMPING;
    // Pick the older of the two offsets, interpolating on the recorded segment, not a chord
    // from the player. Normal walking retains the original k * 0.35 s behaviour.
    for (let i = this.titik.length - 1; i > 0; i--) {
      const a = this.titik[i - 1], b = this.titik[i];
      if (waktu >= a.t && jarak >= a.s) {
        const u = Math.min(1, (waktu - a.t) / (b.t - a.t), (jarak - a.s) / (b.s - a.s));
        return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
      }
    }
    const a = this.titik[0];
    return { x: a.x, z: a.z };
  }
}
