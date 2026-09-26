// ═══════════════════════════════════════════════════════
// markas/MarkasPenjelajah.js — the party's base in Oola, built procedurally
//
// Budget (tests/markas.test.mjs): ≤ 12 draw calls, ≤ 1.500 triangles with every
// instanced slot full, no PointLight. Achieved by merging all static pieces into
// ONE mesh per material (7) and drawing everything that repeats or changes with
// data as a single mesh or InstancedMesh:
//   suar        — status beacon on the tower apex (1 mesh, unlit, no PointLight)
//   lampu meja  — one low lamp per desk = per party slot (InstancedMesh × 4)
//   gulungan    — one scroll per approved result on the Papan Hasil (InstancedMesh × 18)
//
// References are collected at build time (ADR-0002); nothing here walks the scene.
// The view holds no game state: it redraws from KeadaanMarkas (keadaan.js), so a
// warp away and back rebuilds exactly what the data says.
// ═══════════════════════════════════════════════════════

import { galantaraMat } from '../../data/styleTokens.js';
import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { pusatDunia } from '../../fisika/bentuk.js';
import {
  PerakitBahan, kotak, limasTertutup, bidangPoligon, bakeGeometri,
} from '../geometri.js';
import {
  BAHAN, Y_ALAS, ALAS, UNDAK, BALAI, ATAP, MENARA, PUNCAK_MENARA, SUAR, MEJA, PAPAN_HASIL,
  BANGKU, FISIKA, TITIK, TINGGI_LANTAI, INTERAKSI, KAPASITAS_GULUNGAN, LETAK_MARKAS,
} from './spek.js';
import { WARNA_STATUS, WARNA_UNTUK_STATUS } from './keadaan.js';

/** Scroll colours: unread = gold (catches the eye), read = paper. */
export const WARNA_GULUNGAN = Object.freeze({ baru: 0xE9C86A, dibaca: 0xF4EAD6 });

/** One pulse when the beacon changes state, then steady (Desain §9.4: no endless pulsing). */
const DENYUT_DETIK = 0.45;
const DENYUT_SKALA = 0.3;

/** All static pieces, by material. Pure and deterministic: same input, same arrays. */
export function rakitStatis() {
  const r = new PerakitBahan();
  const Y0 = Y_ALAS;

  // ── Terrace ─────────────────────────────────────────
  r.tambah('batu', kotak(ALAS.ukuran, ALAS.letak));
  r.tambah('batu', kotak(UNDAK.ukuran, UNDAK.letak));

  // ── Hall: body, wood skirt, corner posts, ring beam, door, windows ──
  const { lebar: BW, tinggi: BH, dalam: BD, x: BX, z: BZ } = BALAI;
  r.tambah('gading', kotak([BW, BH, BD], [BX, Y0 + BH / 2, BZ]));
  r.tambah('kayu', kotak([BW + 0.12, 0.22, BD + 0.12], [BX, Y0 + 0.11, BZ]));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    r.tambah('kayu', kotak([0.18, BH, 0.18], [BX + dx * BW / 2, Y0 + BH / 2, BZ + dz * BD / 2]));
  }
  r.tambah('kayu', kotak([BW + 0.2, 0.16, BD + 0.2], [BX, Y0 + BH, BZ]));
  const zDinding = BZ + BD / 2;
  r.tambah('kayu', kotak([1.0, 1.75, 0.06], [BX, Y0 + 0.875, zDinding + 0.03]));          // door
  r.tambah('kayu', kotak([0.9, 0.7, 0.05], [1.75, Y0 + 1.25, zDinding + 0.025]));         // window, right
  r.tambah('kayu', kotak([0.9, 0.7, 0.05], [-1.15, Y0 + 1.25, zDinding + 0.025]));        // window, left

  // ── Hip roof (39 % of the hall's height), gold ridge and eave trim ──
  r.tambah('atap', bakeGeometri(limasTertutup(ATAP.lebar, ATAP.dalam, ATAP.naik, ATAP.puncak), { letak: [BX, ATAP.dasarY, BZ] }));
  r.tambah('emas', kotak([1.62, 0.12, 1.26], [BX, ATAP.dasarY + ATAP.naik + 0.06, BZ]));
  r.tambah('emas', kotak([ATAP.lebar + 0.1, 0.1, 0.08], [BX, ATAP.dasarY, BZ + ATAP.dalam / 2]));
  r.tambah('emas', kotak([ATAP.lebar + 0.1, 0.1, 0.08], [BX, ATAP.dasarY, BZ - ATAP.dalam / 2]));
  r.tambah('emas', kotak([0.08, 0.1, ATAP.dalam + 0.1], [BX + ATAP.lebar / 2, ATAP.dasarY, BZ]));
  r.tambah('emas', kotak([0.08, 0.1, ATAP.dalam + 0.1], [BX - ATAP.lebar / 2, ATAP.dasarY, BZ]));

  // ── Door canopy (sengkuap, ADR-0009): 2,30 → 2,05 m over 0,9 m, door only ──
  const sudut = Math.atan2(0.25, 0.9);
  r.tambah('atap', kotak([1.8, 0.08, Math.hypot(0.9, 0.25)], [BX, 2.175, zDinding + 0.45], [sudut, 0, 0]));
  for (const x of [BX - 0.75, BX + 0.75]) r.tambah('kayu', kotak([0.05, 0.28, 0.05], [x, 2.0, zDinding + 0.75]));

  // ── Watchtower (asymmetric silhouette) ─────────────
  const { x: MX, z: MZ, tiang, setengah: s } = MENARA;
  for (const [dx, dz] of [[-s, -s], [s, -s], [-s, s], [s, s]]) {
    r.tambah('kayu', kotak([0.12, tiang, 0.12], [MX + dx, Y0 + tiang / 2, MZ + dz]));
  }
  r.tambah('kayu', kotak([MENARA.lantai, 0.10, MENARA.lantai], [MX, Y0 + tiang, MZ]));
  for (const [sx, sz, dx, dz] of [[1.25, 0.04, 0, -0.6], [1.25, 0.04, 0, 0.6], [0.04, 1.25, -0.6, 0], [0.04, 1.25, 0.6, 0]]) {
    r.tambah('kayu', kotak([sx, 0.06, sz], [MX + dx, Y0 + tiang + 0.4, MZ + dz]));
  }
  r.tambah('atap', bakeGeometri(limasTertutup(1.6, 1.6, 0.7, 0.08), { letak: [MX, Y0 + 3.85, MZ] }));
  // Flag pole runs through the beacon; a small wooden cap reads it as a lantern.
  r.tambah('kayu', kotak([0.05, 1.1, 0.05], [MX, PUNCAK_MENARA + 0.55, MZ]));
  r.tambah('kayu', kotak([0.5, 0.05, 0.5], [MX, SUAR.y + SUAR.tinggi / 2 + 0.03, MZ]));
  r.tambah('bata', bakeGeometri(bidangPoligon([[0, 0], [0.55, -0.16], [0, -0.32]]), { letak: [MX + 0.03, PUNCAK_MENARA + 1.1, MZ] }));

  // ── Four work desks: top, two slab legs, a sheet of paper, lamp post ──
  const [mw, mh, md] = MEJA.ukuran;
  for (const x of MEJA.x) {
    r.tambah('kayu', kotak([mw, 0.06, md], [x, Y0 + mh - 0.03, MEJA.z]));
    for (const dx of [-0.44, 0.44]) r.tambah('kayu', kotak([0.06, mh - 0.06, md - 0.1], [x + dx, Y0 + (mh - 0.06) / 2, MEJA.z]));
    r.tambah('papan', bakeGeometri(new THREE.PlaneGeometry(0.42, 0.3), { letak: [x + 0.12, Y0 + mh + 0.004, MEJA.z + 0.04], putar: [-Math.PI / 2, 0, 0] }));
    r.tambah('kayu', kotak([0.03, 0.2, 0.03], [x - 0.34, Y0 + mh + 0.1, MEJA.z - 0.14]));
  }

  // ── Papan Hasil: slanted board on two legs, framed ─
  const P = PAPAN_HASIL;
  const pusat = pusatPapan();
  r.tambah('papan', kotak([P.lebar, P.tinggi, 0.04], pusat, [-P.miring, 0, 0]));
  const atas = new THREE.Vector3(0, Math.cos(P.miring), -Math.sin(P.miring));
  for (const v of [-P.tinggi / 2, P.tinggi / 2]) {
    r.tambah('kayu', kotak([P.lebar + 0.12, 0.07, 0.07], [pusat[0], pusat[1] + atas.y * v, pusat[2] + atas.z * v], [-P.miring, 0, 0]));
  }
  for (const dx of [-(P.lebar / 2 + 0.03), P.lebar / 2 + 0.03]) {
    r.tambah('kayu', kotak([0.07, 1.5, 0.07], [P.x + dx, Y0 + 0.75, P.z]));
  }

  // ── Bench (for agents whose mission failed) ─────────
  const B = BANGKU;
  r.tambah('kayu', kotak([B.panjang, 0.07, B.dalam], [B.x, Y0 + B.tinggi - 0.035, B.z]));
  for (const dx of [-(B.panjang / 2 - 0.1), B.panjang / 2 - 0.1]) {
    r.tambah('kayu', kotak([0.07, B.tinggi - 0.07, B.dalam - 0.07], [B.x + dx, Y0 + (B.tinggi - 0.07) / 2, B.z]));
  }
  return r;
}

/** Centre of the slanted board, local [x, y, z]. */
export function pusatPapan() {
  const P = PAPAN_HASIL;
  const naik = Math.cos(P.miring) * P.tinggi / 2;
  const mundur = Math.sin(P.miring) * P.tinggi / 2;
  return [P.x, Y_ALAS + P.bawah + naik, P.z + 0.1 - mundur];
}

/** Local matrix of scroll slot `k` (0 = top-left) on the slanted board. */
export function matriksSlotGulungan(k, m = new THREE.Matrix4()) {
  const P = PAPAN_HASIL;
  const kol = k % P.kolom;
  const baris = Math.floor(k / P.kolom);
  const [cx, cy, cz] = pusatPapan();
  const atas = new THREE.Vector3(0, Math.cos(P.miring), -Math.sin(P.miring));
  const normal = new THREE.Vector3(0, Math.sin(P.miring), Math.cos(P.miring));
  const u = (kol - (P.kolom - 1) / 2) * 0.22;
  const v = ((P.baris - 1) / 2 - baris) * 0.3;
  const pos = new THREE.Vector3(cx + u, cy, cz)
    .addScaledVector(atas, v)
    .addScaledVector(normal, 0.07);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), atas);
  return m.compose(pos, q, new THREE.Vector3(1, 1, 1));
}

export class MarkasPenjelajah {
  /**
   * @param {{ id?: string, x?: number, y?: number, z?: number, rotasiY?: number }} [opsi]
   */
  constructor({ id = 'markas_penjelajah', x = LETAK_MARKAS.x, y = LETAK_MARKAS.y, z = LETAK_MARKAS.z, rotasiY = LETAK_MARKAS.rotasiY } = {}) {
    this.id = id;
    this.letak = Object.freeze({ x, y, z, rotasiY });
    /** @type {THREE.Group|null} */
    this.root = null;
    /** Static meshes by material key — collected here, never looked up later. */
    this.mesh = {};
    this.suar = null;
    this.lampuMeja = null;
    this.gulungan = null;
    /** Pieces per material before merging (what the draw calls would have been). */
    this.bagianSebelumGabung = null;
    this._keadaanSuar = null;
    this._mulaiDenyut = -Infinity;
    this._t = 0;
  }

  bangun() {
    const root = new THREE.Group();
    root.name = this.id;
    root.position.set(this.letak.x, this.letak.y, this.letak.z);
    root.rotation.y = this.letak.rotasiY;

    const perakit = rakitStatis();
    this.bagianSebelumGabung = perakit.hitungBagian();
    for (const [kunci, geo] of perakit.gabung()) {
      const b = BAHAN[kunci];
      const mesh = new THREE.Mesh(geo, galantaraMat(b.warna, b.kasar, b.logam));
      mesh.name = `${this.id}_${kunci}`;
      mesh.castShadow = b.bayangan;
      mesh.receiveShadow = true;
      root.add(mesh);
      this.mesh[kunci] = mesh;
    }

    // Beacon: unlit, so it reads the same at noon and at night, with no light cost.
    this.suar = new THREE.Mesh(
      new THREE.CylinderGeometry(SUAR.jari, SUAR.jari, SUAR.tinggi, SUAR.sisi),
      new THREE.MeshBasicMaterial({ color: WARNA_STATUS.mati }),
    );
    this.suar.position.set(MENARA.x, SUAR.y, MENARA.z);
    this.suar.name = `${this.id}_suar`;
    root.add(this.suar);

    // Desk lamps: one instance per desk, colour per instance (unlit white × instanceColor).
    this.lampuMeja = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.05, 0.13, 0.12, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      MEJA.x.length,
    );
    const m = new THREE.Matrix4();
    MEJA.x.forEach((x, i) => {
      this.lampuMeja.setMatrixAt(i, m.makeTranslation(x - 0.34, Y_ALAS + MEJA.ukuran[1] + 0.24, MEJA.z - 0.14));
      this.lampuMeja.setColorAt(i, new THREE.Color(WARNA_STATUS.mati));
    });
    this.lampuMeja.name = `${this.id}_lampu_meja`;
    siapkanInstans(this.lampuMeja);
    root.add(this.lampuMeja);

    // Scrolls: capacity fixed at build; `count` follows the data.
    this.gulungan = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.26, 6),
      galantaraMat(0xffffff, 0.9, 0.02),
      KAPASITAS_GULUNGAN,
    );
    for (let k = 0; k < KAPASITAS_GULUNGAN; k++) {
      this.gulungan.setMatrixAt(k, matriksSlotGulungan(k, m));
      this.gulungan.setColorAt(k, new THREE.Color(WARNA_GULUNGAN.baru));
    }
    this.gulungan.name = `${this.id}_gulungan`;
    siapkanInstans(this.gulungan);
    this.gulungan.count = 0;
    this.gulungan.visible = false;
    root.add(this.gulungan);

    root.userData.fisika = FISIKA.map((d) => ({ ...d, ukuran: [...d.ukuran], letak: [...d.letak] }));
    root.userData.archetype = 'markas_penjelajah';
    this.root = root;
    return root;
  }

  /** A named point in WORLD coordinates. `arah` is the rotation.y that faces it the right way. */
  titik(nama) {
    const t = TITIK[nama];
    if (!t) throw new Error(`titik Markas tidak dikenal: ${nama}`);
    return titikKeDunia(this.letak, nama, t);
  }

  /** The four desk work points, slot order. Deterministic. */
  titikKerja() {
    return MEJA.x.map((_, i) => this.titik(`meja_${i + 1}`));
  }

  /** Interaction volume around the terrace. `onUse` opens the party/Markas sheet. */
  buatVolumeInteraksi(onUse) {
    const p = pusatDunia(this.letak, this.letak.rotasiY, [INTERAKSI.x, 0, INTERAKSI.z]);
    return new InteractionVolume({
      id: 'markas',
      shape: 'sphere',
      center: { x: p.x, z: p.z },
      radius: INTERAKSI.jari,
      hint: '✦ Markas Penjelajah',
      useKeyHint: '[F] buka party & misi',
      onUse,
    });
  }

  /**
   * Redraw everything that follows data: beacon, desk lamps, scrolls.
   * @param {import('./keadaan.js').KeadaanMarkas} keadaan
   */
  tampilkan(keadaan) {
    if (!this.root) return;
    const suar = keadaan.statusSuar();
    const warnaSuar = suar ? WARNA_STATUS[WARNA_UNTUK_STATUS[suar]] : WARNA_STATUS.mati;
    this.suar.material.color.setHex(warnaSuar);
    if (suar !== this._keadaanSuar) {
      // Only a change into an active state earns a pulse; going dark is quiet.
      if (suar && !kurangiGerak()) this._mulaiDenyut = this._t;
      this._keadaanSuar = suar;
    }

    const c = new THREE.Color();
    for (let i = 0; i < MEJA.x.length; i++) {
      const s = keadaan.statusSlot(i);
      this.lampuMeja.setColorAt(i, c.setHex(s ? WARNA_STATUS[WARNA_UNTUK_STATUS[s]] : WARNA_STATUS.mati));
    }
    this.lampuMeja.instanceColor.needsUpdate = true;

    const tampil = keadaan.gulunganTampil();
    for (const g of tampil) {
      this.gulungan.setColorAt(g.slot, c.setHex(g.dibaca ? WARNA_GULUNGAN.dibaca : WARNA_GULUNGAN.baru));
    }
    this.gulungan.count = tampil.length;
    this.gulungan.visible = tampil.length > 0;
    this.gulungan.instanceColor.needsUpdate = true;
  }

  /** One short pulse after a beacon change; otherwise still. */
  animate(t) {
    this._t = t;
    if (!this.suar) return;
    const u = (t - this._mulaiDenyut) / DENYUT_DETIK;
    const s = u >= 0 && u < 1 ? 1 + DENYUT_SKALA * Math.sin(Math.PI * u) : 1;
    this.suar.scale.set(s, s, s);
  }
}

/** Local named point → world. */
export function titikKeDunia(letak, nama, t) {
  const p = pusatDunia(letak, letak.rotasiY, [t.x, TINGGI_LANTAI[t.lantai], t.z]);
  return Object.freeze({
    id: nama, x: p.x, y: p.y, z: p.z, arah: letak.rotasiY + t.arah,
    duduk: !!t.duduk, ...(t.dekat ? { dekat: t.dekat } : {}),
  });
}

function siapkanInstans(im) {
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  im.castShadow = false;
  im.receiveShadow = false;
  // r128 culls an InstancedMesh with the bounding sphere of its BASE geometry,
  // not of its instances — the scrolls sit 1–2 m from the origin of that sphere.
  im.frustumCulled = false;
}

function kurangiGerak() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

