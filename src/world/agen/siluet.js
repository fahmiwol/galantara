// ═══════════════════════════════════════════════════════
// agen/siluet.js — silhouette masks without a GPU (laporan 3D §6.4 gate)
//
// "Render each class orthographically (front and ¾) 32 px tall with a software
// rasteriser, then compute mask IoU between classes. Pass if IoU ≤ 0,80 between
// classes and ≤ 0,85 against the base body." This module is that rasteriser:
// pixel-centre sampling of every triangle, orthographic, ground-clipped (the NPC
// body ball is centred ON the ground, so its lower half is never seen).
//
// Measurement code, not render code: it only reads the meshes it is handed
// (ADR-0002 — no scene traversal) and never runs in the game loop.
// ═══════════════════════════════════════════════════════

/** View directions: the camera sits at this azimuth around the figure (0 = in front, +Z). */
export const PANDANGAN = Object.freeze({ depan: 0, tigaperempat: Math.PI / 4, samping: Math.PI / 2 });

/**
 * Project all triangles of `meshes` for one view.
 * @param {THREE.Mesh[]} meshes world matrices must be current
 * @param {number} azimut camera azimuth (rad)
 * @returns {Float32Array} flat [sx, sy] per vertex, 3 vertices per triangle
 */
export function proyeksi(meshes, azimut) {
  const kanan = { x: Math.cos(azimut), z: -Math.sin(azimut) };
  const out = [];
  const v = new THREE.Vector3();
  for (const m of meshes) {
    const pos = m.geometry.attributes.position;
    const idx = m.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld);
      out.push(v.x * kanan.x + v.z * kanan.z, v.y);
    }
  }
  return Float32Array.from(out);
}

/** Screen-space bounds of projected triangles, clipped at the ground (y ≥ 0). */
export function batas(proj) {
  let xMin = Infinity; let xMax = -Infinity; let yMax = -Infinity;
  for (let i = 0; i < proj.length; i += 2) {
    xMin = Math.min(xMin, proj[i]); xMax = Math.max(xMax, proj[i]);
    yMax = Math.max(yMax, proj[i + 1]);
  }
  return { xMin, xMax, yMin: 0, yMax };
}

/**
 * Rasterise into a mask. `bingkai` is shared between the figures being compared
 * (same scale, same origin), and `tinggiPx` is the frame height in pixels.
 * @returns {{ lebar:number, tinggi:number, data:Uint8Array, luas:number }}
 */
export function masker(proj, bingkai, tinggiPx = 32) {
  const skala = tinggiPx / (bingkai.yMax - bingkai.yMin);
  const lebar = Math.max(1, Math.ceil((bingkai.xMax - bingkai.xMin) * skala));
  const tinggi = tinggiPx;
  const data = new Uint8Array(lebar * tinggi);
  const px = (x) => (x - bingkai.xMin) * skala;
  const py = (y) => (bingkai.yMax - y) * skala;
  for (let i = 0; i < proj.length; i += 6) {
    const ax = px(proj[i]); const ay = py(proj[i + 1]);
    const bx = px(proj[i + 2]); const by = py(proj[i + 3]);
    const cx = px(proj[i + 4]); const cy = py(proj[i + 5]);
    const luasTri = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(luasTri) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const x1 = Math.min(lebar - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const y1 = Math.min(tinggi - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const sx = x + 0.5;
        const w0 = (bx - ax) * (sy - ay) - (by - ay) * (sx - ax);
        const w1 = (cx - bx) * (sy - by) - (cy - by) * (sx - bx);
        const w2 = (ax - cx) * (sy - cy) - (ay - cy) * (sx - cx);
        if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) data[y * lebar + x] = 1;
      }
    }
  }
  let luas = 0;
  for (let i = 0; i < data.length; i++) luas += data[i];
  return { lebar, tinggi, data, luas };
}

/** Intersection over union of two masks of the same frame. */
export function iou(a, b) {
  if (a.lebar !== b.lebar || a.tinggi !== b.tinggi) throw new Error('iou: bingkai masker berbeda');
  let irisan = 0; let gabungan = 0;
  for (let i = 0; i < a.data.length; i++) {
    irisan += a.data[i] & b.data[i];
    gabungan += a.data[i] | b.data[i];
  }
  return gabungan ? irisan / gabungan : 1;
}

/**
 * Masks of several figures in ONE shared frame per view.
 * @param {Record<string, THREE.Mesh[]>} sosok name → meshes
 * @returns {Record<string, Record<string, ReturnType<typeof masker>>>} view → name → mask
 */
export function maskerBersama(sosok, { tinggiPx = 32, pandangan = ['depan', 'tigaperempat'] } = {}) {
  const hasil = {};
  for (const p of pandangan) {
    const proj = Object.fromEntries(Object.entries(sosok).map(([k, m]) => [k, proyeksi(m, PANDANGAN[p])]));
    const b = Object.values(proj).map(batas).reduce((a, c) => ({
      xMin: Math.min(a.xMin, c.xMin), xMax: Math.max(a.xMax, c.xMax), yMin: 0, yMax: Math.max(a.yMax, c.yMax),
    }));
    hasil[p] = Object.fromEntries(Object.entries(proj).map(([k, pr]) => [k, masker(pr, b, tinggiPx)]));
  }
  return hasil;
}

/** ASCII art of a mask, for failure messages and the log. */
export function gambarMasker(m) {
  const baris = [];
  for (let y = 0; y < m.tinggi; y++) {
    let s = '';
    for (let x = 0; x < m.lebar; x++) s += m.data[y * m.lebar + x] ? '#' : '.';
    baris.push(s);
  }
  return baris.join('\n');
}
