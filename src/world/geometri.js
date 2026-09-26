// ═══════════════════════════════════════════════════════
// geometri.js — merge static procedural pieces into ONE mesh per material
//
// Galantara is limited by draw calls, not triangles (docs/brief/suasana/
// KEPUTUSAN.md §2.1): three r128 pays one call per mesh per material. A
// building made of fifty boxes costs fifty calls; the same boxes merged by
// material cost as many calls as it has materials. Everything here produces
// NON-indexed geometry with `position` + `normal` (+ `color` when a piece is
// vertex coloured), so merging is plain concatenation and the triangle count
// is simply `position.count / 3`.
//
// Pure THREE helpers — no scene access, no traversal (ADR-0002).
// ═══════════════════════════════════════════════════════

/** Non-indexed copy with a baked transform. UVs are dropped: nothing here is textured. */
export function bakeGeometri(geo, { letak = [0, 0, 0], putar = null, skala = null } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute?.('uv');
  if (!g.attributes.normal) g.computeVertexNormals();
  const q = new THREE.Quaternion();
  if (putar) q.setFromEuler(new THREE.Euler(putar[0], putar[1], putar[2], 'XYZ'));
  const s = skala ? new THREE.Vector3(...skala) : new THREE.Vector3(1, 1, 1);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...letak), q, s);
  g.applyMatrix4(m);
  return g;
}

/** Paint every vertex of a non-indexed geometry with one colour (for vertex-coloured merges). */
export function cat(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * Concatenate non-indexed geometries. If ANY piece carries `color`, every piece
 * must (a silent white piece is exactly the bug nobody reports).
 */
export function gabungGeometri(daftar) {
  if (!daftar.length) throw new Error('gabungGeometri: daftar kosong');
  const berwarna = daftar.some((g) => g.attributes.color);
  if (berwarna && !daftar.every((g) => g.attributes.color)) {
    throw new Error('gabungGeometri: sebagian bagian berwarna, sebagian tidak');
  }
  let n = 0;
  for (const g of daftar) {
    if (g.index) throw new Error('gabungGeometri: bagian harus non-indexed (pakai bakeGeometri)');
    n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = berwarna ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of daftar) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (col) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const hasil = new THREE.BufferGeometry();
  hasil.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  hasil.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) hasil.setAttribute('color', new THREE.BufferAttribute(col, 3));
  hasil.computeBoundingBox();
  hasil.computeBoundingSphere();
  return hasil;
}

/** Box of FULL size `ukuran` centred at `letak` (same vocabulary as the colliders). */
export function kotak(ukuran, letak, putar = null) {
  return bakeGeometri(new THREE.BoxGeometry(ukuran[0], ukuran[1], ukuran[2]), { letak, putar });
}

/** Vertical cylinder (or cone when rAtas ≠ rBawah) centred at `letak`. */
export function silinder(rAtas, rBawah, tinggi, sisi, letak, putar = null) {
  return bakeGeometri(new THREE.CylinderGeometry(rAtas, rBawah, tinggi, sisi), { letak, putar });
}

/**
 * Closed hip roof (limas) — a frustum whose top is `puncak` × the base, with the
 * underside included so the eave never shows a hole from a low camera. Base at
 * y = 0, rise `naik`. Same shape as `frustumRoofGeometry` in the procedural
 * factory, plus the bottom face.
 */
export function limasTertutup(lebar, dalam, naik, puncak) {
  const x = lebar / 2; const z = dalam / 2; const tx = x * puncak; const tz = z * puncak;
  const p = [-x, 0, -z, x, 0, -z, x, 0, z, -x, 0, z, -tx, naik, -tz, tx, naik, -tz, tx, naik, tz, -tx, naik, tz];
  const i = [0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 7, 6, 4, 6, 5, 0, 1, 2, 0, 2, 3];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(i);
  const f = g.toNonIndexed();
  g.dispose();
  f.computeVertexNormals();
  return f;
}

/** Flat polygon (fan) in the XY plane, both faces. Used for the flag and the ✦ star. */
export function bidangPoligon(titik2d) {
  const p = [];
  for (let i = 1; i < titik2d.length - 1; i++) {
    const a = titik2d[0]; const b = titik2d[i]; const c = titik2d[i + 1];
    p.push(a[0], a[1], 0, b[0], b[1], 0, c[0], c[1], 0); // front
    p.push(a[0], a[1], 0, c[0], c[1], 0, b[0], b[1], 0); // back
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Collects baked pieces per material key, then hands back ONE geometry per key.
 * The piece count per key is kept so a test can prove how much merging saved.
 */
export class PerakitBahan {
  constructor() {
    /** @type {Map<string, THREE.BufferGeometry[]>} */
    this.bagian = new Map();
  }

  tambah(kunci, geo) {
    const daftar = this.bagian.get(kunci) ?? [];
    daftar.push(geo);
    this.bagian.set(kunci, daftar);
    return this;
  }

  /** @returns {Map<string, THREE.BufferGeometry>} */
  gabung() {
    const out = new Map();
    for (const [k, daftar] of this.bagian) {
      out.set(k, gabungGeometri(daftar));
      for (const g of daftar) g.dispose();
    }
    return out;
  }

  /** Pieces per key before merging — what the draw call count WOULD have been. */
  hitungBagian() {
    return Object.fromEntries([...this.bagian].map(([k, v]) => [k, v.length]));
  }
}
