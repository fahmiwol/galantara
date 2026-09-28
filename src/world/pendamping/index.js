// ═══════════════════════════════════════════════════════
// pendamping/index.js — instanced companion kit: the WHOLE party in ≤ 3 draw calls
//
// SPRINT-02 C butir 1–3 (laporan Game §6b, laporan 3D §6.8). A companion is the NPC
// chibi (body ball on the ground + head, NPC.js proportions) wearing its class kit
// v1 (agen/kit.js: silhouette items + chest emblem), a ✦ foot ring and a blob
// shadow. Drawn as three InstancedMeshes shared by every companion:
//
//   dekat   LOD0 figure: body + head + class kit + emblem   (lit, 1 draw call)
//   jauh    LOD1 figure (~50 visible triangles)              (lit, 1 draw call)
//   tanah   ✦ ring + blob shadow, for every companion        (unlit, 1 draw call)
//
// → 2 draw calls when everyone is near, 3 when near and far are mixed, 0 when the
// party is empty. No shadow casters (the blob replaces them), no lights.
//
// How three different class kits share ONE InstancedMesh: the figure geometry holds
// every class's kit, each vertex tagged with `kelasVerteks` (−1 = shared body/head).
// Each instance carries `kelasInstans`; the vertex shader collapses vertices whose
// tag is another class to one point (zero-area triangles, never rasterised). The
// honest price: those collapsed triangles are still SUBMITTED, and renderer.info
// counts them — measured and budgeted per companion (LOG-C §7), and the reason this
// stops being a good trade past ≈ 4 classes (then: one accessory mesh per class).
// Body colour per companion = instanceColor, applied only where `tintVerteks` = 1
// (the body), so the head keeps its skin tone.
//
// Pure scene objects: no traversal (ADR-0002), no clock — `perbarui` writes buffers
// from the state B gave it, nothing else. Three r128 only (ADR-0001).
// ═══════════════════════════════════════════════════════

import {
  bagianKit, bagianKitJauh, kunciKelas, ID_KELAS, KELAS, RANGKA_NPC, LEBAR_SEGILIMA,
} from '../agen/kit.js';
import { UKURAN_PENANDA, WARNA_PENANDA, WARNA_PENANDA_GELAP } from '../agen/penanda.js';
import { bakeGeometri, bidangPoligon } from '../geometri.js';
import { TINGGI_AGEN } from '../agen/ikonStatus.js';

/** Draw calls for ALL companions together (dekat + jauh + tanah). */
export const MAKS_DC_PENDAMPING = 3;

/** Figure height used for the on-screen size (same as the status icons). */
export const TINGGI_PENDAMPING = TINGGI_AGEN;

/**
 * LOD0 at ≥ 48 px, LOD1 below (laporan 3D §6.3), with a ±4 px band so a companion
 * walking at the threshold does not flicker between the two.
 */
export const AMBANG_LOD_PX = Object.freeze({ keJauh: 44, keDekat: 52 });

/** Skin tone of the head — the same as NPC.js, so a recruited NPC and its companion match. */
export const WARNA_KULIT = 0xFFDEAD;

/**
 * Default body colour per class when B passes none: muted Senja/Oola tones, not raw
 * Tailwind (Desain §9.5). B should pass the NPC's own `data.color` so the companion
 * is recognisably the NPC that was recruited.
 */
export const WARNA_BADAN = Object.freeze({ penjejak: 0x9C8AC0, operator: 0x7C9A92, pemandu: 0xD9A066 });

/** Blob shadow (same numbers as NPC.js BAYANGAN_GUMPAL) and ring segments. */
const GUMPAL = Object.freeze({ jari: 0.42, opasitas: 0.22, sisi: 12 });
const SEGMEN_CINCIN = 16;

// ── The hide rule, once, for JS and GLSL ────────────────────────────
/** GLSL line inserted after r128's begin_vertex chunk. */
export const GLSL_SEMBUNYI = 'if ( kelasVerteks >= 0.0 && abs( kelasVerteks - kelasInstans ) > 0.5 ) transformed = vec3( 0.0 );';
/** The same rule in JS — used by the tests and the measuring tools, never by the renderer. */
export function terlihatUntuk(kelasVerteks, kelasInstans) {
  return !(kelasVerteks >= 0 && Math.abs(kelasVerteks - kelasInstans) > 0.5);
}

// ── Geometry ────────────────────────────────────────────────────────
/** Concatenate non-indexed pieces with colour (rgb or rgba) + optional per-vertex tags. */
function rakit(bagian, { alfa = false, tanda = true } = {}) {
  let n = 0;
  for (const b of bagian) n += b.geo.attributes.position.count;
  const ukuranWarna = alfa ? 4 : 3;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * ukuranWarna);
  const kv = tanda ? new Float32Array(n) : null;
  const tv = tanda ? new Float32Array(n) : null;
  const c = new THREE.Color();
  let o = 0;
  for (const b of bagian) {
    const g = b.geo;
    const m = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    c.setHex(b.warna);
    for (let i = 0; i < m; i++) {
      const j = (o + i) * ukuranWarna;
      col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b;
      if (alfa) col[j + 3] = b.alfa ?? 1;
      if (tanda) { kv[o + i] = b.kelas ?? -1; tv[o + i] = b.tint ?? 0; }
    }
    o += m;
    g.dispose();
  }
  const hasil = new THREE.BufferGeometry();
  hasil.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  hasil.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  hasil.setAttribute('color', new THREE.BufferAttribute(col, ukuranWarna));
  if (tanda) {
    hasil.setAttribute('kelasVerteks', new THREE.BufferAttribute(kv, 1));
    hasil.setAttribute('tintVerteks', new THREE.BufferAttribute(tv, 1));
  }
  hasil.computeBoundingBox();
  hasil.computeBoundingSphere();
  return hasil;
}

/** Body + head of LOD0: NPC.js proportions. Only the part of the ball above ground (+ a skirt). */
function badanDekat(r) {
  return [
    // thetaLength 0,6π: the upper 60 % of the ball — the rest is under the floor.
    { geo: bakeGeometri(new THREE.SphereGeometry(r.badanR, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), { skala: [1, r.badanSkalaY, 1] }), warna: 0xffffff, tint: 1 },
    { geo: bakeGeometri(new THREE.SphereGeometry(r.kepalaR, 8, 6), { letak: [0, r.kepalaY, 0] }), warna: WARNA_KULIT },
  ];
}

/**
 * Body + head of LOD1 (35 triangles): the same dome (5 sides, 2 rings) and ball
 * (5 sides, 3 rings) as LOD0, widened to the same area.
 */
function badanJauh(r) {
  return [
    { geo: bakeGeometri(new THREE.SphereGeometry(r.badanR * LEBAR_SEGILIMA, 5, 2, 0, Math.PI * 2, 0, Math.PI * 0.6), { skala: [1, r.badanSkalaY, 1] }), warna: 0xffffff, tint: 1 },
    { geo: bakeGeometri(new THREE.SphereGeometry(r.kepalaR * LEBAR_SEGILIMA, 5, 3), { letak: [0, r.kepalaY, 0] }), warna: WARNA_KULIT },
  ];
}

/**
 * Figure geometry for one LOD: shared body/head + every class's kit, tagged.
 * Fresh each call (an InstancedMesh owns the per-instance attribute on it).
 * @param {'dekat'|'jauh'} lod
 */
export function geometriSosok(lod, rangka = RANGKA_NPC) {
  const bagian = lod === 'jauh' ? badanJauh(rangka) : badanDekat(rangka);
  for (const k of Object.keys(KELAS)) {
    const kit = lod === 'jauh' ? bagianKitJauh(k, rangka) : bagianKit(k, rangka);
    for (const b of kit) bagian.push({ geo: b.geo, warna: b.warna, kelas: ID_KELAS[k] });
  }
  const g = rakit(bagian);
  g.name = `pendamping_${lod}`;
  return g;
}

/** Ring (two bands + four ✦ tips) and blob shadow, flat at y = 0, RGBA. */
export function geometriTanah() {
  const { dalam, tengah, luar, ujung, lebarUjung, tinggi } = UKURAN_PENANDA;
  const datar = (g, y = 0) => bakeGeometri(g, { letak: [0, y, 0], putar: [-Math.PI / 2, 0, 0] });
  const bagian = [
    { geo: datar(new THREE.CircleGeometry(GUMPAL.jari, GUMPAL.sisi), 0.004), warna: 0x000000, alfa: GUMPAL.opasitas },
    { geo: datar(new THREE.RingGeometry(dalam, tengah, SEGMEN_CINCIN, 1), tinggi), warna: WARNA_PENANDA_GELAP },
    { geo: datar(new THREE.RingGeometry(tengah, luar, SEGMEN_CINCIN, 1), tinggi), warna: WARNA_PENANDA },
  ];
  const ujungDatar = bakeGeometri(bidangPoligon([[-lebarUjung / 2, 0], [lebarUjung / 2, 0], [0, ujung]], { duaSisi: false }), { putar: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const b = (i * Math.PI) / 2;
    const rr = luar - 0.01;
    bagian.push({ geo: bakeGeometri(ujungDatar, { letak: [-Math.sin(b) * rr, tinggi, -Math.cos(b) * rr], putar: [0, b, 0] }), warna: WARNA_PENANDA });
  }
  ujungDatar.dispose();
  const g = rakit(bagian, { alfa: true, tanda: false });
  g.name = 'pendamping_tanah';
  return g;
}

/**
 * What ONE instance of class `kelas` really shows: the figure geometry with the
 * other classes' vertices removed by the same rule the shader uses. For tests,
 * silhouettes and the measuring tools (not for rendering).
 */
export function meshTerlihat(lod, kelas, rangka = RANGKA_NPC) {
  const id = ID_KELAS[kunciKelas(kelas)];
  const g = geometriSosok(lod, rangka);
  const kv = g.getAttribute('kelasVerteks');
  const pos = g.getAttribute('position');
  const simpan = [];
  for (let t = 0; t < pos.count; t += 3) {
    // A triangle is tagged as a whole (pieces are tagged per piece).
    if (terlihatUntuk(kv.getX(t), id)) for (let i = 0; i < 9; i++) simpan.push(pos.array[t * 3 + i]);
  }
  const h = new THREE.BufferGeometry();
  h.setAttribute('position', new THREE.Float32BufferAttribute(simpan, 3));
  h.computeVertexNormals();
  g.dispose();
  const m = new THREE.Mesh(h, new THREE.MeshBasicMaterial());
  m.updateMatrixWorld(true);
  return m;
}

// ── Materials ───────────────────────────────────────────────────────
function ganti(teks, cari, dengan) {
  if (!teks.includes(cari)) throw new Error(`pendamping: potongan shader r128 tidak ditemukan: ${cari}`);
  return teks.replace(cari, dengan);
}

let _bahanSosok = null;
let _bahanTanah = null;

/**
 * ONE lit material for both figure LODs (same program): matte PBR like the kit,
 * vertex colours, plus the r128 patch for the class hide rule and the body tint.
 */
export function bahanPendamping() {
  if (_bahanSosok) return _bahanSosok;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8, metalness: 0.04 });
  m.name = 'pendamping_sosok';
  m.onBeforeCompile = function tambalPendamping(shader) {
    let v = shader.vertexShader;
    v = ganti(v, '#include <common>', '#include <common>\nattribute float kelasVerteks;\nattribute float kelasInstans;\nattribute float tintVerteks;');
    v = ganti(v, '#include <begin_vertex>', `#include <begin_vertex>\n\t${GLSL_SEMBUNYI}`);
    v = ganti(v, '#include <color_vertex>', [
      '#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )',
      '\tvColor = vec3( 1.0 );',
      '#endif',
      '#ifdef USE_COLOR',
      '\tvColor *= color;',
      '#endif',
      '#ifdef USE_INSTANCING_COLOR',
      '\tvColor.xyz *= mix( vec3( 1.0 ), instanceColor.xyz, tintVerteks );',
      '#endif',
    ].join('\n'));
    shader.vertexShader = v;
  };
  _bahanSosok = m;
  return m;
}

/** Unlit, transparent (blob shadow α 0,22; ring α 1), no depth write — like NPC.js's blob. */
export function bahanTanah() {
  if (_bahanTanah) return _bahanTanah;
  _bahanTanah = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false });
  _bahanTanah.name = 'pendamping_tanah';
  return _bahanTanah;
}

// ── The kit ─────────────────────────────────────────────────────────
function buatInstans(geo, bahan, maks, nama, { kelas = true } = {}) {
  if (kelas) geo.setAttribute('kelasInstans', new THREE.InstancedBufferAttribute(new Float32Array(maks), 1));
  const im = new THREE.InstancedMesh(geo, bahan, maks);
  im.name = nama;
  // r128 sizes instanceColor from `count` on the first setColorAt: do it while count = maks.
  if (kelas) im.setColorAt(0, new THREE.Color(0xffffff));
  im.count = 0;
  im.visible = false;
  im.castShadow = false;
  im.receiveShadow = false;
  // r128 culls an InstancedMesh with its BASE geometry's sphere at the origin.
  im.frustumCulled = false;
  return im;
}

export class KitPendamping {
  /**
   * @param {THREE.Object3D|null} induk the scene (companions follow the player across Spots)
   * @param {{ maks?: number, rangka?: typeof RANGKA_NPC }} [opsi]
   */
  constructor(induk, { maks = 8, rangka = RANGKA_NPC } = {}) {
    if (!Number.isInteger(maks) || maks < 1) throw new Error(`pendamping: maks harus bilangan bulat ≥ 1 (bukan ${maks})`);
    this.maks = maks;
    /** @type {Map<string, {kelas:string, idKelas:number, warna:THREE.Color, x:number, y:number, z:number, arah:number, condong:number, miring:number, angkat:number, lod:'dekat'|'jauh', paksa:null|'dekat'|'jauh'}>} */
    this._data = new Map();
    this.mesh = {
      dekat: buatInstans(geometriSosok('dekat', rangka), bahanPendamping(), maks, 'pendamping_dekat'),
      jauh: buatInstans(geometriSosok('jauh', rangka), bahanPendamping(), maks, 'pendamping_jauh'),
      tanah: buatInstans(geometriTanah(), bahanTanah(), maks, 'pendamping_tanah', { kelas: false }),
    };
    this.mesh.tanah.renderOrder = -1;
    this._induk = induk ?? null;
    for (const m of Object.values(this.mesh)) this._induk?.add(m);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._v = new THREE.Vector3();
  }

  get jumlah() { return this._data.size; }

  /**
   * Add (or re-dress) a companion. Same id again = change class/colour, not a duplicate.
   * @param {string} id agent instance id (e.g. 'ag_…' or the NPC id)
   * @param {string} kelas 'penjejak' | 'operator' | 'pemandu' or the full class name
   * @param {{ warna?: number }} [opsi] body colour (0xRRGGBB); default per class
   * @returns {boolean} false when the kit is full
   */
  tambah(id, kelas, { warna } = {}) {
    if (typeof id !== 'string' || !id) throw new Error('pendamping: id pendamping harus teks yang tidak kosong');
    const k = kunciKelas(kelas);
    const ada = this._data.get(id);
    if (!ada && this._data.size >= this.maks) return false;
    const d = ada ?? { x: 0, y: 0, z: 0, arah: 0, condong: 0, miring: 0, angkat: 0, lod: 'dekat', paksa: null };
    d.kelas = k;
    d.idKelas = ID_KELAS[k];
    d.warna = new THREE.Color(warna ?? WARNA_BADAN[k]);
    this._data.set(id, d);
    return true;
  }

  /**
   * Where a companion stands this frame. `y` = floor height (+ bob if B wants it);
   * `angkat` lifts the figure only (a hop), the ring and shadow stay on the floor.
   * @returns {boolean} false for an unknown id
   */
  pindah(id, x, y, z, arah = 0, { condong = 0, miring = 0, angkat = 0 } = {}) {
    const d = this._data.get(id);
    if (!d) return false;
    d.x = x; d.y = y; d.z = z; d.arah = arah;
    d.condong = condong; d.miring = miring; d.angkat = angkat;
    return true;
  }

  /** @returns {boolean} whether it was there */
  lepas(id) {
    return this._data.delete(id);
  }

  kelas(id) { return this._data.get(id)?.kelas ?? null; }

  /** Current LOD of a companion ('dekat' | 'jauh'), or null. */
  lod(id) { return this._data.get(id)?.lod ?? null; }

  /**
   * Pin a companion to one LOD regardless of screen size, e.g. `'jauh'` for other
   * players' companions (laporan Game §6b). `null` = back to automatic.
   */
  paksaLod(id, lod) {
    const d = this._data.get(id);
    if (!d) return false;
    if (lod !== null && lod !== 'dekat' && lod !== 'jauh') throw new Error(`pendamping: LOD tidak dikenal: ${lod} ('dekat' | 'jauh' | null)`);
    d.paksa = lod;
    return true;
  }

  /**
   * Write every companion into the instance buffers. Call once per frame after
   * the `pindah` calls. With a camera, each companion picks its LOD from its size
   * on screen; without one, everyone is drawn near (LOD0).
   * @param {THREE.PerspectiveCamera|null} [kamera]
   * @param {{ tinggiLayar?: number }} [opsi] viewport height in CSS px (default: window.innerHeight)
   * @returns {{ dekat:number, jauh:number }}
   */
  perbarui(kamera = null, { tinggiLayar } = {}) {
    const { dekat, jauh, tanah } = this.mesh;
    let pxPerMeter = null;
    if (kamera?.isPerspectiveCamera) {
      const H = tinggiLayar ?? globalThis.window?.innerHeight ?? 0;
      if (H > 0) pxPerMeter = H / (2 * Math.tan((kamera.fov * Math.PI) / 360));
      kamera.updateMatrixWorld();
      this._v.setFromMatrixPosition(kamera.matrixWorld);
    }
    const kDekat = dekat.geometry.getAttribute('kelasInstans');
    const kJauh = jauh.geometry.getAttribute('kelasInstans');
    let nd = 0; let nj = 0; let nt = 0;
    for (const d of this._data.values()) {
      if (d.paksa) {
        d.lod = d.paksa;
      } else if (pxPerMeter === null) {
        d.lod = 'dekat';
      } else {
        const jarak = Math.max(1e-3, Math.hypot(d.x - this._v.x, d.y + TINGGI_PENDAMPING / 2 - this._v.y, d.z - this._v.z));
        const px = (TINGGI_PENDAMPING * pxPerMeter) / jarak;
        if (d.lod === 'dekat' && px < AMBANG_LOD_PX.keJauh) d.lod = 'jauh';
        else if (d.lod === 'jauh' && px > AMBANG_LOD_PX.keDekat) d.lod = 'dekat';
      }
      this._e.set(d.condong, d.arah, d.miring, 'YXZ');
      this._q.setFromEuler(this._e);
      this._p.set(d.x, d.y + d.angkat, d.z);
      this._m.compose(this._p, this._q, this._s);
      if (d.lod === 'dekat') {
        dekat.setMatrixAt(nd, this._m); dekat.setColorAt(nd, d.warna); kDekat.setX(nd, d.idKelas); nd++;
      } else {
        jauh.setMatrixAt(nj, this._m); jauh.setColorAt(nj, d.warna); kJauh.setX(nj, d.idKelas); nj++;
      }
      tanah.setMatrixAt(nt++, this._m.makeTranslation(d.x, d.y, d.z));
    }
    for (const [im, n, attr] of [[dekat, nd, kDekat], [jauh, nj, kJauh], [tanah, nt, null]]) {
      im.count = n;
      im.visible = n > 0;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      if (attr) attr.needsUpdate = true;
    }
    return { dekat: nd, jauh: nj };
  }

  /** Remove from the scene and free the geometries (materials are shared, kept). */
  buang() {
    for (const m of Object.values(this.mesh)) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }
    this._data.clear();
  }
}

/**
 * The door for stream B.
 * @param {THREE.Object3D} scene where the companions live (the scene, not an Oola group)
 * @param {{ maks?: number }} [opsi] capacity (own party 4 + other players' companions)
 * @returns {KitPendamping}
 */
export function buatKitPendamping(scene, opsi = {}) {
  return new KitPendamping(scene, opsi);
}
