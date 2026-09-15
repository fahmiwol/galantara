// ═══════════════════════════════════════════════════════
// tools/anggaran-spot.mjs — isi tiap Spot dalam angka: segitiga, perkiraan
// draw call, kaster bayangan, PointLight, collider — termasuk GLB dari manifest.
//
// Kenapa ada: sintesis suasana (docs/brief/suasana/SINTESIS.md §2) menemukan
// dua batas yang bertentangan — "tambahan ≤ 20.000 segitiga per Spot" di
// prompt vs "20.000 segitiga per Spot" di tugas sintesis — dan tidak ada
// angka isi Spot SEKARANG untuk memutuskannya. Alat ini mengukurnya, dan
// tests/anggaranSpot.test.mjs memakai fungsi yang sama untuk menjaga batasnya.
//
// Apa yang DIHITUNG dan apa yang TIDAK (diperiksa di browser 16 Sep 2026):
// - "draw call" = pass utama isi Spot: satu per mesh per bahan, tanpa frustum
//   culling. Avatar, NPC, dan label tidak termasuk.
// - Pass bayangan TIDAK termasuk. Tiap mesh castShadow menambah satu draw call
//   lagi. renderer.info.render.calls di r128 juga tidak menghitungnya: render()
//   memanggil shadowMap.render() SEBELUM info.reset(). Oola dari kamera
//   ikhtisar: 139 pass utama (dengan avatar/NPC) + 70 pass bayangan = 209.
//   Karena itu kolom "kaster" ditampilkan terpisah.
//
// Menelusuri pohon objek di sini boleh: ini alat ukur, bukan kode produk
// (ADR-0002 berlaku untuk src/).
//
// Jalankan: node --experimental-default-type=module tools/anggaran-spot.mjs
// ═══════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const AKAR = new URL('../', import.meta.url);

// Uji yang mengimpor alat ini sudah memasang THREE; dua salinan THREE di satu
// proses membuat instanceof antar-modul diam-diam salah.
if (!globalThis.THREE) {
  const sumber = readFileSync(new URL('vendor/three.r128.min.js', AKAR), 'utf8');
  const modul = { exports: {} };
  new Function('module', 'exports', sumber)(modul, modul.exports);
  globalThis.THREE = modul.exports;
}

const { Fisika } = await import('../src/fisika/Fisika.js');
const muatRapier = () => import(new URL('vendor/rapier3d-compat.0.20.0.js', AKAR).href).then((m) => m.default);

/** Batas per Spot — docs/brief/suasana/KEPUTUSAN.md §2.1. */
export const ANGGARAN = Object.freeze({ segitiga: 20000, drawCall: 150, pointLight: 3 });

export const SPOT = Object.freeze(['oola', 'bogor', 'braga', 'kuta', 'losari', 'malioboro', 'monas']);

/** Segitiga, draw call pass utama, kaster bayangan, PointLight di satu pohon objek. */
export function ukurPohon(root) {
  let segitiga = 0; let drawCall = 0; let kaster = 0; let lampu = 0;
  const tumpuk = [root];
  while (tumpuk.length) {
    const o = tumpuk.pop();
    if (o.visible === false) continue;
    if (o.isPointLight) lampu++;
    if (o.isMesh && o.geometry) {
      const g = o.geometry;
      const per = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
      segitiga += per * (o.isInstancedMesh ? o.count : 1);
      drawCall += Array.isArray(o.material) ? o.material.length : 1;
      if (o.castShadow) kaster++;
    }
    tumpuk.push(...o.children);
  }
  return { segitiga: Math.round(segitiga), drawCall, kaster, lampu };
}

/** Segitiga dan draw call satu GLB dari berkasnya (tanpa loader). */
export function ukurGlb(url) {
  const berkas = new URL(url, AKAR);
  if (!existsSync(berkas)) return { segitiga: 0, drawCall: 0 };
  const buf = readFileSync(berkas);
  const gltf = JSON.parse(buf.slice(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  let segitiga = 0; let drawCall = 0;
  for (const n of gltf.nodes ?? []) {
    if (n.mesh == null) continue;
    for (const p of gltf.meshes[n.mesh].primitives) {
      const a = p.indices != null ? gltf.accessors[p.indices] : gltf.accessors[p.attributes.POSITION];
      segitiga += a.count / 3;
      drawCall++;
    }
  }
  return { segitiga: Math.round(segitiga), drawCall };
}

/**
 * Ukur satu Spot seperti Game membangunnya.
 * @returns {{spot:string, segitiga:number, glbSegitiga:number, total:number,
 *   drawCall:number, kaster:number, lampu:number, collider:number}}
 */
export async function ukurSpot(id) {
  if (id === 'oola') {
    const { World } = await import('../src/world/World.js');
    const f = new Fisika({ muatRapier });
    const w = new World(new THREE.Scene(), { fisika: f });
    w.mapData = JSON.parse(readFileSync(new URL('src/data/maps/default_oola.json', AKAR), 'utf8'));
    w.build();
    const u = ukurPohon(w.worldRoot);
    return { spot: id, ...u, glbSegitiga: 0, total: u.segitiga, collider: f.hitung().oola ?? 0 };
  }
  const nama = id[0].toUpperCase() + id.slice(1);
  const m = await import(`../src/world/spots/${nama}SpotRuntime.js`);
  const f = new Fisika({ muatRapier });
  const rt = new m[`${nama}SpotRuntime`]();
  const peringatan = console.warn; console.warn = () => {};
  try { rt.mount(new THREE.Scene(), { fisika: f, kelompokFisika: 'spot', toast: { show() {} } }); }
  finally { console.warn = peringatan; }
  const u = ukurPohon(rt.root);
  const manifest = JSON.parse(readFileSync(new URL(`assets/spots/${id}/manifest.json`, AKAR), 'utf8'));
  let glbSegitiga = 0; let glbDraw = 0; let glbCollider = 0;
  for (const e of manifest.glbs ?? []) {
    const g = ukurGlb(e.url);
    glbSegitiga += g.segitiga; glbDraw += g.drawCall;
    const pendamping = new URL(e.url.replace(/\.glb$/, '.collider.json'), AKAR);
    if (existsSync(pendamping)) glbCollider += JSON.parse(readFileSync(pendamping, 'utf8')).bagian.length;
  }
  // GLB tidak dihitung sebagai kaster: AssetLibrary tidak menyalakan castShadow,
  // jadi rumah GLB hari ini memang tanpa bayangan.
  return {
    spot: id, segitiga: u.segitiga, glbSegitiga, total: u.segitiga + glbSegitiga,
    drawCall: u.drawCall + glbDraw, kaster: u.kaster, lampu: u.lampu,
    collider: (f.hitung().spot ?? 0) + glbCollider,
  };
}

const langsung = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (langsung) {
  const tanda = (nilai, batas) => `${nilai}${nilai > batas ? '!' : ' '}`;
  console.log('Spot        segitiga prosedural   + GLB   = total   draw call   kaster   PointLight   collider');
  for (const id of SPOT) {
    const b = await ukurSpot(id);
    console.log(`${b.spot.padEnd(10)} ${String(b.segitiga).padStart(10)} ${String(b.glbSegitiga).padStart(8)} ${tanda(b.total, ANGGARAN.segitiga).padStart(9)} ${tanda(b.drawCall, ANGGARAN.drawCall).padStart(11)} ${String(b.kaster).padStart(8)} ${tanda(b.lampu, ANGGARAN.pointLight).padStart(12)} ${String(b.collider).padStart(10)}`);
  }
  console.log(`\nBatas: segitiga ≤ ${ANGGARAN.segitiga}, draw call pass utama ≤ ${ANGGARAN.drawCall}, PointLight ≤ ${ANGGARAN.pointLight}. "!" = melanggar.`);
  console.log('Kaster = draw call tambahan di pass bayangan (belum dianggarkan; lihat KEPUTUSAN.md).');
}
