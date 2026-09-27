// ═══════════════════════════════════════════════════════
// agen/index.js — ONE door for how an AI agent looks in 3D (B ↔ C seam)
//
// Stream B builds the NPC (NPC.js) and decides where it walks; stream C gives it
// what makes it read as an AI agent of a given class:
//
//   pasangPenandaAgen(mesh)           ✦ foot ring, 1 draw call (or PenandaKerumunan: 1 for all)
//   pasangKitKelas(mesh, kelas)       class kit v0 (head / back / hand), 1 draw call, shared material
//   terapkanPose(mesh, pose, detik)   status body language; `pose` comes from tampilkanStatus3D()
//   LapisanIkonStatus                 status layers 2–3 (28 px icon + edge arrow); normally used
//                                     through ../markas/index.js pasangLapisanIkon()
//
// Status → place is in ../markas/index.js (tampilkanStatus3D), because the places
// are the Markas's.
// ═══════════════════════════════════════════════════════

export {
  pasangPenandaAgen, PenandaKerumunan, geometriPenanda, bahanPenanda, WARNA_PENANDA, WARNA_PENANDA_GELAP, UKURAN_PENANDA,
} from './penanda.js';
export { POSE, terapkanPose } from './pose.js';
export {
  pasangKitKelas, geometriKit, bahanKit, ukuranBenda, kunciKelas, KELAS, WARNA_KIT, RANGKA_NPC,
} from './kit.js';
export {
  LapisanIkonStatus, IKON_STATUS, PERLU_TINDAKAN, UKURAN_IKON_PX, MIN_PX_AGEN, TINGGI_AGEN, ANGKUR_Y, warnaIkon, panahTepi,
} from './ikonStatus.js';
