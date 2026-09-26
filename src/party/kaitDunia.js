// ═══════════════════════════════════════════════════════
// kaitDunia.js — hooks between the world client (stream B) and the 3D world (stream C).
//
// B calls these; C implements them in src/world/** (Markas, agent markers, scrolls, ground
// arrow). Until C's code is merged they are no-ops, and B uses the fallbacks below, so the M1
// flow works with or without the 3D pieces. The CTO wires C's implementation at merge time:
//
//   import { pasangKaitDunia } from '../party/kaitDunia.js';
//   pasangKaitDunia({ titikKerjaMarkas: (npcId) => …, tampilkanStatus3D: (npcId, st) => … });
//
// Contract of each hook (all optional, all must be cheap and must not throw):
//   titikKerjaMarkas(npcId)          → {x, z, arah?} work spot at the Markas desk, or null
//   posisiMarkas()                   → {x, z} where "Arahkan saya ke Markas" points, or null
//   pasangPenandaAgen(npcId, mesh)   → called once per agent NPC (✦ marker, foot ring)
//   tampilkanStatus3D(npcId, status) → status_kerja changed (siap|antre|bekerja|hasil_siap|
//                                      menunggu_otak|gagal|null)
//   tambahGulungan(misi)             → an approved result: add a scroll to the Papan Hasil
//   arahkanPanah(target|null)        → ground arrow toward {x, z}; null hides it
// ═══════════════════════════════════════════════════════

/** Markas Penjelajah site from the 3D report (§6.9): (−3.0; −12.5). The desk faces the plaza. */
export const MARKAS_CADANGAN = Object.freeze({ x: -3, z: -12.5 });
export const TITIK_KERJA_CADANGAN = Object.freeze({ x: -3, z: -11.2, arah: Math.PI });

const NOOP = Object.freeze({
  titikKerjaMarkas: () => null,
  posisiMarkas: () => null,
  pasangPenandaAgen: () => {},
  tampilkanStatus3D: () => {},
  tambahGulungan: () => {},
  arahkanPanah: () => {},
});

/** The live hooks. Read them through the helpers below, never cache a function. */
export const kaitDunia = { ...NOOP };

/** Install C's implementations (unknown keys are ignored; missing ones stay no-ops). */
export function pasangKaitDunia(impl = {}) {
  for (const nama of Object.keys(NOOP)) {
    if (typeof impl[nama] === 'function') kaitDunia[nama] = impl[nama];
  }
  return kaitDunia;
}

/** Back to no-ops (tests, or leaving the hub). */
export function lepasKaitDunia() {
  Object.assign(kaitDunia, NOOP);
}

function aman(nama, ...args) {
  try {
    return kaitDunia[nama](...args);
  } catch (err) {
    // A 3D hook must never break the mission flow.
    console.warn(`[kaitDunia] ${nama} gagal`, err);
    return undefined;
  }
}

const titikSah = (t) => t && Number.isFinite(t.x) && Number.isFinite(t.z);

/** Work spot for an agent: C's desk if available, else the fallback in front of the site. */
export function titikKerja(npcId) {
  const t = aman('titikKerjaMarkas', npcId);
  return titikSah(t) ? { x: t.x, z: t.z, arah: Number.isFinite(t.arah) ? t.arah : TITIK_KERJA_CADANGAN.arah } : { ...TITIK_KERJA_CADANGAN };
}

export function posisiMarkas() {
  const t = aman('posisiMarkas');
  return titikSah(t) ? { x: t.x, z: t.z } : { ...MARKAS_CADANGAN };
}

export const pasangPenanda = (npcId, mesh) => aman('pasangPenandaAgen', npcId, mesh);
export const statusKe3D = (npcId, status) => aman('tampilkanStatus3D', npcId, status);
export const gulungan = (misi) => aman('tambahGulungan', misi);
export const panah = (target) => aman('arahkanPanah', target ?? null);
