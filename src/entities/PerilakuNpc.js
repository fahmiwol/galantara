// ═══════════════════════════════════════════════════════
// PerilakuNpc.js — what an NPC is doing and where it is, as a pure function of time.
//
// States (docs/riset/2026-09-26-pivot/LAPORAN-GAME-ENGINEER.md §6a (d)):
//   keliling  stroll around an anchor (the old ±3 m patrol)
//   menuju    walk a route of points at 1.4 m/s, never past the last one
//   bekerja   stay put at the work point (the mission runs in the runtime, not here)
//   lapor     walk to the player, stop at arm's length, wave
//   ikut      a party companion: walk to the spot on the owner's trail it is given each frame
//             (party/JejakPemilik.js), catching up faster than the owner walks, snapping after a jump
// An open dialog freezes the NPC and turns it toward the player; so does a player within talk
// range while it strolls.
//
// Speeds are metres per SECOND and every step uses dt: the old patrol moved 0.04 per FRAME,
// so on a 30 fps phone NPCs walked at half speed (the same bug fixed for the avatar in 0.9.0).
// No THREE, no DOM: tests drive it with plain numbers.
// ═══════════════════════════════════════════════════════

export const KECEPATAN_KELILING = 1.2;
export const KECEPATAN_MENUJU = 1.4;
export const RADIUS_KELILING = 3;
/**
 * A strolling NPC waits, facing the player, while the player is this close (the talk radius,
 * NPC.js INTERACT_R). Otherwise it walks off just as a thumb reaches for "Ngobrol".
 * Walking to work and working are never interrupted.
 */
export const JARAK_SAPA = 2.5;
/** The NPC stops this far from the player when it comes to report. */
export const JARAK_LAPOR = 1.6;
/** A companion closes the gap to its trail spot in about this long (s), up to KECEPATAN_IKUT_MAKS. */
export const WAKTU_SUSUL = 0.3;
/** Faster than the player (5.4 m/s), so a companion never falls behind for good. */
export const KECEPATAN_IKUT_MAKS = 7.5;
/** Further than this from its spot (a warp, back from another Spot): appear there instead of running. */
export const JARAK_LONCAT_IKUT = 25;

const DIAM_MIN = 2, DIAM_ACAK = 3;

export class PerilakuNpc {
  /** @param {{x:number, z:number, arah?:number, rng?:() => number}} p */
  constructor({ x, z, arah = 0, rng = Math.random }) {
    this.x = x;
    this.z = z;
    /** Floor height under the NPC (a Markas terrace or seat is above the ground). */
    this.y = 0;
    this.arah = arah;
    this.rng = rng;
    this.jangkar = { x, z };
    /** @type {'keliling'|'menuju'|'bekerja'|'lapor'|'ikut'} */
    this.keadaan = 'keliling';
    this.bergerak = false;
    /** True while standing in front of the player after walking over to report. */
    this.melambai = false;
    this._diam = rng() * DIAM_ACAK;
    this._tujuan = null;
    this._rute = [];
    this._lalu = 'bekerja';
    this._arahAkhir = null;
    /** @type {{x:number, z:number}|null} this companion's spot on the owner's trail (set every frame) */
    this.titikIkut = null;
  }

  /**
   * @param {{jenis:'keliling', jangkar?:{x:number,z:number}}
   *   | {jenis:'menuju', titik:{x:number,z:number,y?:number,arah?:number}|Array<{x:number,z:number,y?:number,arah?:number}>, lalu?:'bekerja'|'keliling'}
   *   | {jenis:'bekerja'}
   *   | {jenis:'lapor'}
   *   | {jenis:'ikut'}} p
   */
  perintah(p) {
    this.melambai = false;
    if (p.jenis === 'menuju') {
      const rute = (Array.isArray(p.titik) ? p.titik : [p.titik]).filter((t) => Number.isFinite(t?.x) && Number.isFinite(t?.z));
      if (!rute.length) return;
      this._rute = rute.map((t) => ({ x: t.x, z: t.z, y: Number.isFinite(t.y) ? t.y : 0 }));
      this._arahAkhir = Number.isFinite(rute.at(-1).arah) ? rute.at(-1).arah : null;
      this._lalu = p.lalu ?? 'bekerja';
      this._tujuan = this._rute.shift();
      this.keadaan = 'menuju';
    } else if (p.jenis === 'bekerja') {
      this.keadaan = 'bekerja';
    } else if (p.jenis === 'lapor') {
      this.keadaan = 'lapor';
    } else if (p.jenis === 'ikut') {
      this.keadaan = 'ikut';
      this._tujuan = null;
      this._rute = [];
      this.y = 0;
    } else {
      if (p.jangkar && Number.isFinite(p.jangkar.x) && Number.isFinite(p.jangkar.z)) this.jangkar = { x: p.jangkar.x, z: p.jangkar.z };
      this.keadaan = 'keliling';
      this._tujuan = null;
      this._diam = 0.5;
    }
  }

  /**
   * @param {number} dt seconds since the last frame
   * @param {{dialogTerbuka?: boolean, posisiPemain?: {x:number,z:number}|null}} [ctx]
   */
  perbarui(dt, { dialogTerbuka = false, posisiPemain = null } = {}) {
    const langkah = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.bergerak = false;
    if (dialogTerbuka) {
      if (posisiPemain) this._hadap(posisiPemain.x, posisiPemain.z);
      return;
    }
    if (this.keadaan === 'keliling' && posisiPemain && Math.hypot(posisiPemain.x - this.x, posisiPemain.z - this.z) <= JARAK_SAPA) {
      this._hadap(posisiPemain.x, posisiPemain.z);
      return;
    }
    if (this.keadaan === 'keliling') this._keliling(langkah);
    else if (this.keadaan === 'menuju') this._menuju(langkah);
    else if (this.keadaan === 'lapor') this._lapor(langkah, posisiPemain);
    else if (this.keadaan === 'ikut') this._ikut(langkah, posisiPemain);
    // bekerja: stay put.
  }

  _hadap(tx, tz) {
    const dx = tx - this.x, dz = tz - this.z;
    if (dx * dx + dz * dz > 1e-8) this.arah = Math.atan2(dx, dz);
  }

  /**
   * Move toward (tx,tz) at v m/s, easing the floor height toward ty along the way (a terrace is
   * climbed over the leg, not popped onto at the end). Returns true on arrival; never overshoots.
   */
  _langkah(tx, tz, v, dt, ty = 0) {
    const dx = tx - this.x, dz = tz - this.z;
    const jarak = Math.hypot(dx, dz);
    const maju = v * dt;
    if (jarak <= maju || jarak < 1e-6) {
      this.bergerak = jarak > 1e-6 && maju > 0;
      if (jarak > 1e-6) this.arah = Math.atan2(dx, dz);
      this.x = tx;
      this.z = tz;
      this.y = ty;
      return true;
    }
    this.x += (dx / jarak) * maju;
    this.z += (dz / jarak) * maju;
    this.y += (ty - this.y) * (maju / jarak);
    this.arah = Math.atan2(dx, dz);
    this.bergerak = maju > 0;
    return false;
  }

  _keliling(dt) {
    if (!this._tujuan) {
      this._diam -= dt;
      if (this._diam > 0) return;
      // Next stroll: a point inside the radius around the anchor, so it can never wander off.
      const sudut = this.rng() * Math.PI * 2;
      const r = RADIUS_KELILING * Math.sqrt(this.rng());
      this._tujuan = { x: this.jangkar.x + Math.cos(sudut) * r, z: this.jangkar.z + Math.sin(sudut) * r };
    }
    if (this._langkah(this._tujuan.x, this._tujuan.z, KECEPATAN_KELILING, dt)) {
      this._tujuan = null;
      this._diam = DIAM_MIN + this.rng() * DIAM_ACAK;
    }
  }

  _menuju(dt) {
    let sisa = dt;
    // Several short route legs can be finished within one long frame: spend the whole dt.
    while (this._tujuan && sisa > 0) {
      const jarak = Math.hypot(this._tujuan.x - this.x, this._tujuan.z - this.z);
      const perlu = jarak / KECEPATAN_MENUJU;
      if (this._langkah(this._tujuan.x, this._tujuan.z, KECEPATAN_MENUJU, sisa, this._tujuan.y)) {
        sisa -= perlu;
        this._tujuan = this._rute.shift() ?? null;
      } else {
        sisa = 0;
      }
    }
    if (!this._tujuan) {
      if (this._arahAkhir !== null) this.arah = this._arahAkhir;
      this.keadaan = this._lalu === 'keliling' ? 'keliling' : 'bekerja';
      if (this.keadaan === 'keliling') {
        this.jangkar = { x: this.x, z: this.z };
        this._diam = DIAM_MIN;
      }
    }
  }

  _ikut(dt, pemain) {
    const t = this.titikIkut;
    if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.z)) return;
    const jarak = Math.hypot(t.x - this.x, t.z - this.z);
    if (jarak > JARAK_LONCAT_IKUT) {
      this.x = t.x;
      this.z = t.z;
      if (pemain) this._hadap(pemain.x, pemain.z);
      return;
    }
    // Ease in over the last metres, but never slower than a walk, so it actually arrives.
    const v = Math.min(KECEPATAN_IKUT_MAKS, Math.max(KECEPATAN_MENUJU, jarak / WAKTU_SUSUL));
    if (jarak < 0.02) {
      if (pemain) this._hadap(pemain.x, pemain.z);
      return;
    }
    this._langkah(t.x, t.z, v, dt);
  }

  _lapor(dt, pemain) {
    if (!pemain) return;
    const dx = pemain.x - this.x, dz = pemain.z - this.z;
    const jarak = Math.hypot(dx, dz);
    if (jarak <= JARAK_LAPOR) {
      this._hadap(pemain.x, pemain.z);
      this.melambai = true;
      return;
    }
    this.melambai = false;
    // Aim at the point JARAK_LAPOR short of the player, so it stops at arm's length.
    const tx = pemain.x - (dx / jarak) * JARAK_LAPOR;
    const tz = pemain.z - (dz / jarak) * JARAK_LAPOR;
    this._langkah(tx, tz, KECEPATAN_MENUJU, dt);
  }
}
