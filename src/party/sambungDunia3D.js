// ═══════════════════════════════════════════════════════
// sambungDunia3D.js — plug stream C's 3D modules into B's hooks (kaitDunia.js).
//
// C exports (SPRINT-01 "Titik sambung B ↔ C"):
//   src/world/markas/index.js  titikKerja(), titikMarkas(nama), tampilkanStatus3D(npcId, st) → {titik, pose, …},
//                              tambahGulungan(hasil), markasAktif(), LETAK_MARKAS
//   src/world/agen/index.js    pasangPenandaAgen(mesh), pasangKitKelas(mesh, kelas)
//
// Every function is feature-checked: a missing one leaves B's no-op/fallback in place and is
// reported in `hilang`, so the M1 flow keeps working with any subset of C's code. The modules
// are loaded only when the World says the Markas exists (World._buildMarkas), so a world
// without C's code never requests a file that is not there (a 404 is a console error).
// ═══════════════════════════════════════════════════════

import { pasangKaitDunia } from './kaitDunia.js';

/** B hooks this adapter can fill, with the C function each one needs. */
export const KEBUTUHAN = Object.freeze({
  titikKerjaMarkas: 'markas.titikKerja | markas.tampilkanStatus3D',
  posisiMarkas: 'markas.markasAktif | markas.LETAK_MARKAS',
  tampilkanStatus3D: 'markas.tampilkanStatus3D',
  tambahGulungan: 'markas.tambahGulungan',
  pasangPenandaAgen: 'agen.pasangPenandaAgen',
  arahkanPanah: '(belum ada di aliran C)',
});

/** Statuses that send the agent to its desk (the others free the remembered desk). */
const KE_MEJA = new Set(['antre', 'bekerja']);

const fungsi = (m, nama) => typeof m?.[nama] === 'function';
const titikSah = (t) => t && Number.isFinite(t.x) && Number.isFinite(t.z);
const keTitik = (t) => {
  // A seat names a free approach point in `dekat`; B's walker stops there.
  const p = titikSah(t?.dekat) ? t.dekat : t;
  if (!titikSah(p)) return null;
  const arah = Number.isFinite(p.arah) ? p.arah : t.arah;
  return Number.isFinite(arah) ? { x: p.x, z: p.z, arah } : { x: p.x, z: p.z };
};

/**
 * Build the hook implementations from C's modules (pure: nothing is installed).
 * @param {{ markas?: object|null, agen?: object|null, kelasDari?: (npcId:string) => string|null|undefined }} m
 * @returns {{ impl: object, hilang: string[] }}
 */
export function kaitDari3D({ markas = null, agen = null, kelasDari = () => null } = {}) {
  const impl = {};
  /** npcId → desk point C assigned on the last antre/bekerja */
  const meja = new Map();

  if (fungsi(markas, 'tampilkanStatus3D')) {
    impl.tampilkanStatus3D = (npcId, status) => {
      const r = markas.tampilkanStatus3D(npcId, status);
      const t = keTitik(r?.titik);
      if (KE_MEJA.has(status) && t) meja.set(npcId, t);
      else if (!KE_MEJA.has(status)) meja.delete(npcId);
      return r;
    };
  }
  if (fungsi(markas, 'titikKerja') || fungsi(markas, 'tampilkanStatus3D')) {
    impl.titikKerjaMarkas = (npcId) => {
      if (meja.has(npcId)) return meja.get(npcId);
      if (!fungsi(markas, 'titikKerja')) return null;
      const t = markas.titikKerja()?.[0];
      // titikKerja() names a seat's approach point (`dekat: 'nama'`); resolve it like C's status call does.
      if (typeof t?.dekat === 'string' && fungsi(markas, 'titikMarkas')) return keTitik({ ...t, dekat: markas.titikMarkas(t.dekat) });
      return keTitik(t);
    };
  }
  if (fungsi(markas, 'markasAktif') || titikSah(markas?.LETAK_MARKAS)) {
    impl.posisiMarkas = () => {
      const l = (fungsi(markas, 'markasAktif') ? markas.markasAktif()?.letak : null) ?? markas.LETAK_MARKAS;
      return titikSah(l) ? { x: l.x, z: l.z } : null;
    };
  }
  if (fungsi(markas, 'tambahGulungan')) impl.tambahGulungan = (misi) => markas.tambahGulungan(misi);

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

  const hilang = Object.keys(KEBUTUHAN).filter((k) => !impl[k]);
  return { impl, hilang };
}

const MUAT_BAWAAN = (nama) => import(`../world/${nama}/index.js`);

/**
 * Load C's modules (each on its own: one failing does not drop the other) and install the hooks.
 * @param {{ muat?: (nama:'markas'|'agen') => Promise<object>, kelasDari?: Function, pasang?: Function }} [opsi]
 * @returns {Promise<{ markas: boolean, agen: boolean, hilang: string[] }>}
 */
export async function sambungDunia3D({ muat = MUAT_BAWAAN, kelasDari, pasang = pasangKaitDunia } = {}) {
  const coba = async (nama) => {
    try {
      return await muat(nama);
    } catch (err) {
      console.warn(`[sambungDunia3D] modul ${nama} tidak termuat; dunia jalan dengan cadangan`, err);
      return null;
    }
  };
  const [markas, agen] = await Promise.all([coba('markas'), coba('agen')]);
  const { impl, hilang } = kaitDari3D({ markas, agen, kelasDari });
  pasang(impl);
  return { markas: Boolean(markas), agen: Boolean(agen), hilang };
}
