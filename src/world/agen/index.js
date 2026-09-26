// ═══════════════════════════════════════════════════════
// agen/index.js — ONE door for how an AI agent looks in 3D (B ↔ C seam)
//
// Stream B builds the NPC (NPC.js) and decides where it walks; stream C gives it
// what makes it read as an AI agent of a given class:
//
//   pasangPenandaAgen(mesh)           ✦ foot ring, 1 draw call (or PenandaKerumunan: 1 for all)
//   pasangKitKelas(mesh, kelas)       class kit v0 (head / back / hand), 1 draw call, shared material
//   terapkanPose(mesh, pose, detik)   status body language; `pose` comes from tampilkanStatus3D()
//
// Status → place is in ../markas/index.js (tampilkanStatus3D), because the places
// are the Markas's.
// ═══════════════════════════════════════════════════════

export {
  pasangPenandaAgen, PenandaKerumunan, geometriPenanda, bahanPenanda, WARNA_PENANDA, WARNA_PENANDA_GELAP, UKURAN_PENANDA,
} from './penanda.js';
export { POSE, terapkanPose } from './pose.js';
