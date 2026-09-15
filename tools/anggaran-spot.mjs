// ═══════════════════════════════════════════════════════
// tools/anggaran-spot.mjs — isi tiap Spot dalam angka: segitiga, perkiraan
// draw call, PointLight, collider — termasuk GLB dari manifest.
//
// Kenapa ada: sintesis suasana (docs/brief/suasana/SINTESIS.md §2) menemukan
// dua batas yang bertentangan — "tambahan ≤ 20.000 segitiga per Spot" di
// prompt vs "20.000 segitiga per Spot" di tugas sintesis — dan tidak ada
// angka isi Spot SEKARANG untuk memutuskannya. Alat ini mengukurnya.
//
// Menelusuri pohon objek di sini boleh: ini alat ukur, bukan kode produk
// (ADR-0002 berlaku untuk src/).
//
// Jalankan: node --experimental-default-type=module tools/anggaran-spot.mjs
// ═══════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';

const AKAR = new URL('../', import.meta.url);
const sumber = readFileSync(new URL('vendor/three.r128.min.js', AKAR), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { Fisika } = await import('../src/fisika/Fisika.js');
const muatRapier = () => import(new URL('vendor/rapier3d-compat.0.20.0.js', AKAR).href).then((m) => m.default);

/** Segitiga, draw call kasar, PointLight di satu pohon objek. */
function ukurPohon(root) {
  let segitiga = 0; let drawCall = 0; let lampu = 0;
  const tumpuk = [root];
  while (tumpuk.length) {
    const o = tumpuk.pop();
    if (o.isPointLight) lampu++;
    if ((o.isMesh || o.isInstancedMesh) && o.visible !== false && o.geometry) {
      const g = o.geometry;
      const per = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
      const salinan = o.isInstancedMesh ? o.count : 1;
      segitiga += per * salinan;
      const bahan = Array.isArray(o.material) ? o.material.length : 1;
      drawCall += bahan;
    }
    tumpuk.push(...o.children);
  }
  return { segitiga: Math.round(segitiga), drawCall, lampu };
}

/** Segitiga dan draw call satu GLB dari berkasnya (tanpa loader). */
function ukurGlb(url) {
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

const SPOT = ['bogor', 'braga', 'kuta', 'losari', 'malioboro', 'monas'];
const baris = [];

// Oola
{
  const { World } = await import('../src/world/World.js');
  const f = new Fisika({ muatRapier });
  const w = new World(new THREE.Scene(), { fisika: f });
  w.mapData = JSON.parse(readFileSync(new URL('src/data/maps/default_oola.json', AKAR), 'utf8'));
  w.build();
  const u = ukurPohon(w.worldRoot);
  baris.push({ spot: 'oola', ...u, glbSegitiga: 0, collider: f.hitung().oola ?? 0 });
}

for (const id of SPOT) {
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
  baris.push({
    spot: id, segitiga: u.segitiga, drawCall: u.drawCall + glbDraw, lampu: u.lampu,
    glbSegitiga, collider: (f.hitung().spot ?? 0) + glbCollider,
  });
}

console.log('Spot        segitiga prosedural   + GLB     = total   draw call   PointLight   collider');
for (const b of baris) {
  const total = b.segitiga + b.glbSegitiga;
  console.log(`${b.spot.padEnd(10)} ${String(b.segitiga).padStart(10)} ${String(b.glbSegitiga).padStart(10)} ${String(total).padStart(9)} ${String(b.drawCall).padStart(10)} ${String(b.lampu).padStart(12)} ${String(b.collider).padStart(10)}`);
}
