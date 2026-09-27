// ═══════════════════════════════════════════════════════
// kaitDunia.js — hooks between the world client (stream B) and the 3D world (stream C).
//
// B calls these; C implements them in src/world/** (Markas, agent markers, scrolls, icons,
// poses). Game.js installs C's implementation through sambungDunia3D.js; until then (tests,
// or a world without the Markas) they are no-ops and B uses the fallbacks below, so the M1
// flow works with or without the 3D pieces.
//
// Contract of each hook (all optional, all must be cheap; a hook that throws is contained):
//   titikKerjaMarkas(npcId)          → work spot {x, y?, z, arah?} or a route of such points, or null
//   posisiMarkas()                   → {x, z} where "Arahkan saya ke Markas" points, or null
//   pasangPenandaAgen(npcId, mesh)   → called once per agent NPC (✦ ring, class kit)
//   tampilkanStatus3D(npcId, status) → status_kerja changed (siap|antre|bekerja|hasil_siap|
//                                      menunggu_otak|gagal|null); returns {rute?, pose?}: where the
//                                      NPC should walk for this status, and the pose to hold there
//   lepasAgen(npcId)                 → the agent left the party (frees its desk and icon)
//   terlihatStatus(npcId)            → 'ikon' | 'panah' | null: is the status already on screen?
//   terapkanPose(mesh, pose, detik)  → apply a pose this frame; returns the height offset (m)
//   tambahGulungan(misi)             → a finished result: a scroll on the Papan Hasil (idempotent)
//   tandaiGulunganDibaca(misi)       → the player opened that result
//   buangGulungan(misi)              → the result was discarded
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
  lepasAgen: () => {},
  terlihatStatus: () => null,
  terapkanPose: () => undefined,
  tambahGulungan: () => {},
  tandaiGulunganDibaca: () => {},
  buangGulungan: () => {},
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

/** Every hook name B can call (C's side of the seam fills them). */
export const NAMA_KAIT = Object.freeze(Object.keys(NOOP));

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
const bersih = (t) => {
  const p = { x: t.x, z: t.z };
  if (Number.isFinite(t.y)) p.y = t.y;
  if (Number.isFinite(t.arah)) p.arah = t.arah;
  return p;
};
/** A point or a route of points → a route of clean points, or null when nothing is usable. */
export function keRute(t) {
  const daftar = (Array.isArray(t) ? t : [t]).filter(titikSah).map(bersih);
  return daftar.length ? daftar : null;
}

/** Route to an agent's work spot: C's desk if available, else the fallback in front of the site. */
export function ruteKerja(npcId) {
  return keRute(aman('titikKerjaMarkas', npcId)) ?? [{ ...TITIK_KERJA_CADANGAN }];
}

/** The end of the work route (where the agent works). */
export function titikKerja(npcId) {
  const akhir = ruteKerja(npcId).at(-1);
  return { x: akhir.x, z: akhir.z, arah: Number.isFinite(akhir.arah) ? akhir.arah : TITIK_KERJA_CADANGAN.arah };
}

export function posisiMarkas() {
  const t = aman('posisiMarkas');
  return titikSah(t) ? { x: t.x, z: t.z } : { ...MARKAS_CADANGAN };
}

/**
 * Tell the 3D world a status. Returns its plan: a route (null = no place for this status, or no
 * 3D world) and a pose name (null = B's own body language).
 * @returns {{rute: Array<{x:number,y?:number,z:number,arah?:number}>|null, pose: string|null}}
 */
export function statusKe3D(npcId, status) {
  const r = aman('tampilkanStatus3D', npcId, status);
  return { rute: keRute(r?.rute ?? null), pose: typeof r?.pose === 'string' ? r.pose : null };
}

/** True when the status is already visible in the world (icon or edge arrow): skip the toast. */
export function statusTerlihat(npcId) {
  const t = aman('terlihatStatus', npcId);
  return t === 'ikon' || t === 'panah';
}

/** Apply a 3D pose; returns the height offset, or null when no pose implementation is installed. */
export function pose3D(mesh, pose, detik) {
  const dy = aman('terapkanPose', mesh, pose, detik);
  return Number.isFinite(dy) ? dy : null;
}

export const pasangPenanda = (npcId, mesh) => aman('pasangPenandaAgen', npcId, mesh);
export const lepasAgen = (npcId) => aman('lepasAgen', npcId);
export const gulungan = (misi) => aman('tambahGulungan', misi);
export const gulunganDibaca = (misi) => aman('tandaiGulunganDibaca', misi);
export const buangGulungan = (misi) => aman('buangGulungan', misi);
export const panah = (target) => aman('arahkanPanah', target ?? null);
