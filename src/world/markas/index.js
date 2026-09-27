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
//   pasangLapisanIkon(kamera, lapisan?) once, then perbaruiIkonStatus() per frame:
//                                       status layers 2–3 (28 px icon, edge arrow)
//   terlihatStatus(npcId)               'ikon' | 'panah' | null — toast only on null (ADR-0005)
// ═══════════════════════════════════════════════════════

import { MarkasPenjelajah, titikKeDunia } from './MarkasPenjelajah.js';
import { KeadaanMarkas } from './keadaan.js';
import { LETAK_MARKAS, TITIK, MEJA } from './spek.js';
import { LapisanIkonStatus } from '../agen/ikonStatus.js';

export {
  MarkasPenjelajah, WARNA_GULUNGAN, rakitStatis, matriksSlotGulungan, papanHasil, rakitPerabot, matriksPerabot,
} from './MarkasPenjelajah.js';
export {
  geometriPerabot, bahanPerabot, JENIS_PERABOT, WARNA_PERABOT, UKURAN_PERABOT,
} from './perabot.js';
export {
  KeadaanMarkas, STATUS_KERJA, WARNA_STATUS, WARNA_UNTUK_STATUS, TAMPILAN_STATUS, PRIORITAS_SUAR,
} from './keadaan.js';
export {
  LETAK_MARKAS, KAPASITAS_GULUNGAN, TITIK, FISIKA as FISIKA_MARKAS, Y_ALAS, BAHAN as BAHAN_MARKAS,
  MEJA, PAPAN_HASIL, BANGKU, UNDAK, ALAS, PERABOT, Z_DINDING_DEPAN, X_DINDING_TIMUR, TINGGI_LANTAI,
} from './spek.js';

/** Shared state for the viewer's party (one player per client). */
const keadaan = new KeadaanMarkas();
/** @type {MarkasPenjelajah|null} the Markas currently mounted in Oola */
let aktif = null;
/** @type {LapisanIkonStatus|null} status layers 2–3, once a camera is known */
let ikon = null;
/** npcId → what the icon anchors to (NPC mesh or position getter), kept across status changes. */
const sumberIkon = new Map();

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
 * Layers 2–3: when `opsi.mesh` (the NPC mesh, or a () => {x,y,z} getter) has been
 * given once for this npcId and pasangLapisanIkon() ran, its 28 px icon / edge
 * arrow follows the status too.
 *
 * @param {{ slot?: number, mesh?: THREE.Object3D | (() => ({x:number,y:number,z:number}|null)) }} [opsi]
 *   slot: pin the desk to a party slot (0–3); mesh: what the icon hangs on
 * @returns {{ npcId:string, status:string|null, slot:number|null, pose:string,
 *   titik: null | { id:string, x:number, y:number, z:number, arah:number, duduk:boolean, dekat?:object } }}
 */
export function tampilkanStatus3D(npcId, status, opsi = {}) {
  const r = keadaan.setelStatus(npcId, status, opsi);
  aktif?.tampilkan(keadaan);
  if (opsi.mesh) sumberIkon.set(r.npcId, opsi.mesh);
  if (ikon && sumberIkon.has(r.npcId)) ikon.setel(r.npcId, r.status, sumberIkon.get(r.npcId));
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
  ikon?.buang(npcId);
  sumberIkon.delete(npcId);
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

/**
 * Attach status layers 2–3 to the screen. Call once when the camera and the
 * overlay element exist (Game: next to ChatBubbleLayer, same #lbl-layer).
 * Agents that already have a status get their icon immediately.
 * @param {THREE.PerspectiveCamera} kamera
 * @param {HTMLElement|string} [lapisan]
 */
export function pasangLapisanIkon(kamera, lapisan = 'lbl-layer', opsi) {
  if (ikon) { ikon.kamera = kamera; return ikon; }
  ikon = new LapisanIkonStatus(kamera, lapisan, opsi);
  for (const [npcId, a] of keadaan.agen) {
    if (sumberIkon.has(npcId)) ikon.setel(npcId, a.status, sumberIkon.get(npcId));
  }
  return ikon;
}

/** Per frame, after NPCs moved (World.animate calls it too; twice is harmless). */
export function perbaruiIkonStatus(kamera) {
  ikon?.perbarui(kamera);
}

/** 'ikon' | 'panah' | null — which channel shows this agent's status now (ADR-0005). */
export function terlihatStatus(npcId) {
  return ikon?.terlihat(npcId) ?? null;
}

export function lapisanIkon() {
  return ikon;
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
  ikon?.hapusSemua();
  ikon = null;
  sumberIkon.clear();
}
