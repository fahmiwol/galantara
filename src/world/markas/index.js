// ═══════════════════════════════════════════════════════
// markas/index.js — ONE door for everything the Markas offers (B ↔ C seam)
//
// Stream B (Game.js / NPC.js / PerilakuNpc) calls these; stream C owns them.
// Names follow SPRINT-01 "Titik sambung B ↔ C". Everything is safe to call before
// the world is built or while the player is in another Spot: state is kept and
// the Markas redraws from it when Oola is mounted again.
//
//   bangunMarkas(world, opsi?)          World._buildMarkas → builds, registers collider + volume
//   titikKerja()                        4 desk work points (world), slot order, deterministic
//   titikMarkas(nama)                   any named point (world)
//   tampilkanStatus3D(npcId, status)    → { titik, pose, slot, … } and redraws beacon/lamps
//   tampilkanStatus(npcId, status)      same function, SPRINT-01 name
//   tambahGulungan(hasil) / buangGulungan(hasil) / tandaiGulunganDibaca(hasil)
// ═══════════════════════════════════════════════════════

import { MarkasPenjelajah, titikKeDunia } from './MarkasPenjelajah.js';
import { KeadaanMarkas } from './keadaan.js';
import { LETAK_MARKAS, TITIK, MEJA } from './spek.js';

export { MarkasPenjelajah, WARNA_GULUNGAN, rakitStatis, matriksSlotGulungan } from './MarkasPenjelajah.js';
export {
  KeadaanMarkas, STATUS_KERJA, WARNA_STATUS, WARNA_UNTUK_STATUS, TAMPILAN_STATUS, PRIORITAS_SUAR,
} from './keadaan.js';
export {
  LETAK_MARKAS, KAPASITAS_GULUNGAN, TITIK, FISIKA as FISIKA_MARKAS, Y_ALAS, BAHAN as BAHAN_MARKAS,
} from './spek.js';

/** Shared state for the viewer's party (one player per client). */
const keadaan = new KeadaanMarkas();
/** @type {MarkasPenjelajah|null} the Markas currently mounted in Oola */
let aktif = null;

/**
 * Build the Markas into a World (Oola). Registers: the group (and its colliders,
 * via World.addObject → userData.fisika), the interaction volume, and itself as
 * the active Markas.
 * @param {import('../World.js').World} world
 * @param {{ id?: string, x?: number, y?: number, z?: number, rotasiY?: number, onUse?: () => void }} [opsi]
 */
export function bangunMarkas(world, opsi = {}) {
  const markas = new MarkasPenjelajah(opsi);
  const g = markas.bangun();
  world.addObject(g, markas.id);
  // `openMarkas` is added to window.G_UI by stream B; until then [F] does nothing,
  // which is better than an error in the console.
  const onUse = opsi.onUse ?? (() => globalThis.window?.G_UI?.openMarkas?.());
  world.interactionVolumes.push(markas.buatVolumeInteraksi(onUse));
  pasangMarkasAktif(markas);
  return markas;
}

/** Make `markas` the one that follows the state, and draw the state on it now. */
export function pasangMarkasAktif(markas) {
  aktif = markas;
  markas.tampilkan(keadaan);
  return markas;
}

/** Called when Oola is disposed (warp to a Spot). State stays. */
export function lepasMarkas(markas) {
  if (!markas || aktif === markas) aktif = null;
}

export function markasAktif() {
  return aktif;
}

/** Placement of the active Markas, or the map default when none is mounted. */
function letak() {
  return aktif ? aktif.letak : LETAK_MARKAS;
}

/** A named Markas point in WORLD coordinates ({ id, x, y, z, arah, duduk, dekat? }). */
export function titikMarkas(nama) {
  const t = TITIK[nama];
  if (!t) throw new Error(`titik Markas tidak dikenal: ${nama}`);
  return titikKeDunia(letak(), nama, t);
}

/**
 * The four desk work points (one per party slot), in slot order. Free of every
 * collider and reachable on foot — both proven in tests/markas.test.mjs.
 */
export function titikKerja() {
  return MEJA.x.map((_, i) => titikMarkas(`meja_${i + 1}`));
}

/**
 * Show an agent's runtime `status_kerja` in 3D.
 *
 * Returns the plan for the NPC walker (stream B): where to go and which pose to
 * hold there. It does NOT move the NPC itself — B's PerilakuNpc walks it there,
 * so the NPC never teleports. Seats (`titik.duduk`) name a free approach point in
 * `titik.dekat`: walk to `dekat`, then snap onto the seat.
 *
 * Side effects: the tower beacon and the agent's desk lamp are redrawn.
 *
 * @param {string} npcId e.g. 'sari' or an agent instance id
 * @param {'siap'|'antre'|'bekerja'|'hasil_siap'|'menunggu_otak'|'gagal'|null} status
 * @param {{ slot?: number }} [opsi] pin the desk to a party slot (0–3)
 * @returns {{ npcId:string, status:string|null, slot:number|null, pose:string,
 *   titik: null | { id:string, x:number, y:number, z:number, arah:number, duduk:boolean, dekat?:object } }}
 */
export function tampilkanStatus3D(npcId, status, opsi = {}) {
  const r = keadaan.setelStatus(npcId, status, opsi);
  aktif?.tampilkan(keadaan);
  let titik = null;
  if (r.keluarga && r.slot != null) {
    titik = titikMarkas(`${r.keluarga}_${r.slot + 1}`);
    if (titik.dekat) titik = { ...titik, dekat: titikMarkas(titik.dekat) };
  }
  return { npcId: r.npcId, status: r.status, slot: r.slot, pose: r.pose, titik };
}

/** SPRINT-01 name for the same function. */
export const tampilkanStatus = tampilkanStatus3D;

/** The agent left the party / was dismissed: frees its desk. */
export function lepasAgenMarkas(npcId) {
  const ok = keadaan.lepasAgen(npcId);
  aktif?.tampilkan(keadaan);
  return ok;
}

/**
 * One approved result = one scroll on the Papan Hasil. Accepts the result id or
 * an object with `id` (e.g. the misi). Idempotent per id.
 * @returns {{ ok:boolean, baru:boolean, tampil:boolean, slot:number|null, jumlah:number }}
 */
export function tambahGulungan(hasil, opsi) {
  const r = keadaan.tambahGulungan(hasil, opsi);
  aktif?.tampilkan(keadaan);
  return r;
}

/** Remove the scroll of a result that was discarded. */
export function buangGulungan(hasil) {
  const r = keadaan.buangGulungan(hasil);
  aktif?.tampilkan(keadaan);
  return r;
}

/** The player opened the result: its scroll turns from gold to paper and moves down. */
export function tandaiGulunganDibaca(hasil) {
  const r = keadaan.tandaiDibaca(hasil);
  aktif?.tampilkan(keadaan);
  return r;
}

/** Read-only view of the state (for panels and tests). */
export function keadaanMarkas() {
  return keadaan;
}

/** Tests only: forget every agent and scroll. */
export function _resetKeadaanMarkas() {
  keadaan.agen.clear();
  keadaan.gulungan.length = 0;
  aktif?.tampilkan(keadaan);
}
