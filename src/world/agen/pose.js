// ═══════════════════════════════════════════════════════
// agen/pose.js — body language for each status (layer 1 of 3, laporan 3D §6.5)
//
// The NPC chibi has no arms: a body ball centred on the ground and a head
// (NPC.js). Pose is therefore carried by what the root group can do — lean,
// tilt, a hop, sitting height — and by WHERE the agent stands (the Markas
// points). That is enough to read at any size where the character is visible;
// the HTML icon (stream B) adds shape + colour when it is big enough (ADR-0004).
//
// Motion rules (Desain §9.4): one bounce on arrival, no endless pulsing, still
// when the mission failed ("so it does not become an alarm"), and no motion at
// all under prefers-reduced-motion.
// ═══════════════════════════════════════════════════════

/**
 * condong = forward lean (rad, +X rotation tips the head toward the facing side)
 * miring  = sideways tilt (rad) · angguk = nod {amp rad, hz} · lompat = one hop {m, s}
 */
export const POSE = Object.freeze({
  bebas:    Object.freeze({ condong: 0, miring: 0 }),
  menunggu: Object.freeze({ condong: 0.04, miring: 0 }),
  bekerja:  Object.freeze({ condong: 0.2, miring: 0, angguk: Object.freeze({ amp: 0.06, hz: 0.8 }) }),
  lapor:    Object.freeze({ condong: -0.05, miring: 0, lompat: Object.freeze({ tinggi: 0.14, detik: 0.35 }) }),
  tanya:    Object.freeze({ condong: -0.06, miring: 0.14 }),
  lesu:     Object.freeze({ condong: 0.34, miring: 0 }),
});

/**
 * Apply a pose to the NPC root group for this frame.
 *
 * Only rotation.x / rotation.z are written: rotation.y (facing) and the position
 * belong to the walker. The vertical offset is RETURNED, to be added to the
 * position the walker sets (floor height of the point + its own bob).
 *
 * @param {THREE.Object3D} mesh NPC root group
 * @param {string} nama pose name (from tampilkanStatus3D(...).pose)
 * @param {number} detik seconds since this pose started
 * @param {{ kurangiGerak?: boolean }} [opsi]
 * @returns {number} dy in metres
 */
export function terapkanPose(mesh, nama, detik = 0, { kurangiGerak = false } = {}) {
  const p = POSE[nama] ?? POSE.bebas;
  let condong = p.condong;
  let dy = 0;
  if (!kurangiGerak) {
    if (p.angguk) condong += p.angguk.amp * Math.sin(2 * Math.PI * p.angguk.hz * detik);
    if (p.lompat && detik >= 0 && detik < p.lompat.detik) {
      dy = p.lompat.tinggi * Math.sin((Math.PI * detik) / p.lompat.detik);
    }
  }
  mesh.rotation.x = condong;
  mesh.rotation.z = p.miring;
  return dy;
}
