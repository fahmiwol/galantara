// ═══════════════════════════════════════════════════════
// sambungDunia3D.js — plug stream C's 3D modules into B's hooks (kaitDunia.js).
//
// C's API (docs/aset/LOG-C.md §2):
//   src/world/markas/index.js  tampilkanStatus(npcId, status, {mesh?}) → {status, slot, pose, titik},
//                              titikKerja(), lepasAgenMarkas(npcId), terlihatStatus(npcId),
//                              tambahGulungan / tandaiGulunganDibaca / buangGulungan(hasil),
//                              markasAktif(), LETAK_MARKAS
//   src/world/agen/index.js    pasangPenandaAgen(mesh), pasangKitKelas(mesh, kelas),
//                              terapkanPose(mesh, pose, detik, {kurangiGerak})
//
// Game.js imports both modules and calls sambungDunia3D() once, before the party glue starts.
// Each function is still checked before use: a missing one leaves B's fallback in place and is
// named in `hilang`, so a partial 3D world degrades instead of throwing.
// ═══════════════════════════════════════════════════════

import { pasangKaitDunia, NAMA_KAIT } from './kaitDunia.js';

const fungsi = (m, nama) => typeof m?.[nama] === 'function';
const titikSah = (t) => t && Number.isFinite(t.x) && Number.isFinite(t.z);

/**
 * A Markas point → the route B walks: a seat (`duduk`) is approached through its free point
 * `dekat` first (the seat sits inside the bench's collider on purpose), then sat on.
 */
export function ruteDariTitik(titik) {
  if (!titikSah(titik)) return null;
  if (titik.duduk && titikSah(titik.dekat)) return [titik.dekat, titik];
  return [titik];
}

/**
 * Build the hook implementations from C's modules (pure: nothing is installed).
 * @param {{ markas?: object|null, agen?: object|null, kelasDari?: (npcId:string) => string|null|undefined,
 *   meshDari?: (npcId:string) => object|null|undefined, kurangiGerak?: () => boolean }} m
 * @returns {{ impl: object, hilang: string[] }}
 */
export function kaitDari3D({ markas = null, agen = null, kelasDari = () => null, meshDari = () => null, kurangiGerak = () => false } = {}) {
  const impl = {};
  /** npcIds whose mesh C already has (C wants it once per agent). */
  const meshTerkirim = new Set();
  const statusFn = fungsi(markas, 'tampilkanStatus') ? 'tampilkanStatus' : fungsi(markas, 'tampilkanStatus3D') ? 'tampilkanStatus3D' : null;

  if (statusFn) {
    impl.tampilkanStatus3D = (npcId, status) => {
      const opsi = {};
      if (!meshTerkirim.has(npcId)) {
        const mesh = meshDari(npcId);
        if (mesh) {
          opsi.mesh = mesh;
          meshTerkirim.add(npcId);
        }
      }
      const r = markas[statusFn](npcId, status, opsi);
      return { rute: ruteDariTitik(r?.titik), pose: r?.pose ?? null };
    };
  }
  if (fungsi(markas, 'titikKerja')) impl.titikKerjaMarkas = () => ruteDariTitik(markas.titikKerja()?.[0]);
  if (fungsi(markas, 'markasAktif') || titikSah(markas?.LETAK_MARKAS)) {
    impl.posisiMarkas = () => {
      const l = (fungsi(markas, 'markasAktif') ? markas.markasAktif()?.letak : null) ?? markas.LETAK_MARKAS;
      return titikSah(l) ? { x: l.x, z: l.z } : null;
    };
  }
  if (fungsi(markas, 'lepasAgenMarkas')) {
    impl.lepasAgen = (npcId) => {
      meshTerkirim.delete(npcId); // recruited again later: C needs the mesh again
      return markas.lepasAgenMarkas(npcId);
    };
  }
  if (fungsi(markas, 'terlihatStatus')) impl.terlihatStatus = (npcId) => markas.terlihatStatus(npcId);
  if (fungsi(markas, 'tambahGulungan')) impl.tambahGulungan = (misi) => markas.tambahGulungan(misi);
  if (fungsi(markas, 'tandaiGulunganDibaca')) impl.tandaiGulunganDibaca = (misi) => markas.tandaiGulunganDibaca(misi);
  if (fungsi(markas, 'buangGulungan')) impl.buangGulungan = (misi) => markas.buangGulungan(misi);

  if (fungsi(agen, 'terapkanPose')) {
    impl.terapkanPose = (mesh, pose, detik) => agen.terapkanPose(mesh, pose, detik, { kurangiGerak: Boolean(kurangiGerak()) });
  }
  if (fungsi(agen, 'pasangPenandaAgen') || fungsi(agen, 'pasangKitKelas')) {
    impl.pasangPenandaAgen = (npcId, mesh) => {
      // Two independent pieces: a kit that fails (unknown class) must not take the ✦ ring with it.
      if (fungsi(agen, 'pasangPenandaAgen')) {
        try { agen.pasangPenandaAgen(mesh); } catch (err) { console.warn('[sambungDunia3D] penanda agen gagal', npcId, err); }
      }
      const kelas = kelasDari(npcId);
      if (kelas && fungsi(agen, 'pasangKitKelas')) {
        try { agen.pasangKitKelas(mesh, kelas); } catch (err) { console.warn('[sambungDunia3D] kit kelas gagal', npcId, err); }
      }
    };
  }

  const hilang = NAMA_KAIT.filter((k) => !impl[k]);
  return { impl, hilang };
}

/**
 * Install C's modules as B's hooks.
 * @param {Parameters<typeof kaitDari3D>[0] & { pasang?: Function }} opsi
 * @returns {{ hilang: string[] }} hooks still on B's fallback (e.g. arahkanPanah: not in C yet)
 */
export function sambungDunia3D({ pasang = pasangKaitDunia, ...modul } = {}) {
  const { impl, hilang } = kaitDari3D(modul);
  pasang(impl);
  return { hilang };
}
