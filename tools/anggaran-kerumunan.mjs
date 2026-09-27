// ═══════════════════════════════════════════════════════
// tools/anggaran-kerumunan.mjs — N agents in one Spot: draw calls, triangles, casters
//
// Laporan 3D §6.8 / §6a butir 7: "N karakter → DC, segitiga, kaster; angka 10/30/70
// karakter tercatat". Headless, THREE r128, the REAL NPC mesh (src/entities/NPC.js)
// dressed the way stream C dresses an agent: class kit v0 (agen/kit.js) + ✦ foot
// ring (agen/penanda.js). Two ways to draw the ring are compared:
//   per-agen    one ring mesh per agent (pasangPenandaAgen)         → +1 DC per agent
//   kerumunan   one InstancedMesh for every ring (PenandaKerumunan) → +1 DC in total
//
// What is counted: main-pass draw calls (one per mesh per material, no frustum
// culling — worst case: everyone on screen), triangles, and shadow casters (each
// caster = one more draw call in the shadow pass, which r128's renderer.info does not
// count; see tools/anggaran-spot.mjs). Players (Avatar.js) and DOM labels are not in
// here. The Spot budget itself (150 DC, 20.000 triangles) is tools/anggaran-spot.mjs.
//
// Run:  node --experimental-default-type=module tools/anggaran-kerumunan.mjs [10 30 70]
// ═══════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

if (!globalThis.THREE) {
  const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
  const modul = { exports: {} };
  new Function('module', 'exports', sumber)(modul, modul.exports);
  globalThis.THREE = modul.exports;
}

const { ukurPohon } = await import('./anggaran-spot.mjs');
const { NPCManager } = await import('../src/entities/NPC.js');
const A = await import('../src/world/agen/index.js');

/** Stream C limit per agent: body + class kit (SPRINT-01, laporan 3D §6a butir 2). */
export const MAKS_DC_PER_AGEN = 4;
export const CARA = Object.freeze(['per-agen', 'kerumunan']);
const KELAS = Object.keys(A.KELAS);

/** `n` fresh NPC meshes (the real NPC.js build), in one scene. */
function buatAgen(adegan, n) {
  const hasil = [];
  while (hasil.length < n) {
    const m = new NPCManager(new THREE.Scene()).build();
    for (const npc of m.npcs) {
      if (hasil.length >= n) break;
      adegan.add(npc.mesh);
      hasil.push(npc.mesh);
    }
  }
  return hasil;
}

/**
 * Build `n` dressed agents and measure the scene.
 * @param {number} n
 * @param {'per-agen'|'kerumunan'} cara how the ✦ rings are drawn
 * @returns {{ n:number, cara:string, drawCall:number, segitiga:number, kaster:number,
 *   perAgen:{ drawCall:number, segitiga:number, kaster:number } }}
 *   perAgen = one agent WITHOUT its ring (body + kit): the ≤ 4 DC rule
 */
export function ukurKerumunan(n, cara = 'kerumunan') {
  if (!CARA.includes(cara)) throw new Error(`cara tidak dikenal: ${cara} (${CARA.join(' | ')})`);
  const adegan = new THREE.Scene();
  const agen = buatAgen(adegan, n);
  agen.forEach((mesh, i) => {
    mesh.position.set((i % 10) * 1.6, 0, Math.floor(i / 10) * 1.6);
    A.pasangKitKelas(mesh, KELAS[i % KELAS.length]);
  });
  let perAgen = { drawCall: 0, segitiga: 0, kaster: 0 };
  for (const mesh of agen) {
    const u = ukurPohon(mesh);
    if (u.drawCall > perAgen.drawCall || u.segitiga > perAgen.segitiga) {
      perAgen = { drawCall: Math.max(perAgen.drawCall, u.drawCall), segitiga: Math.max(perAgen.segitiga, u.segitiga), kaster: Math.max(perAgen.kaster, u.kaster) };
    }
  }
  if (cara === 'per-agen') {
    for (const mesh of agen) A.pasangPenandaAgen(mesh);
  } else {
    const k = new A.PenandaKerumunan(adegan, Math.max(n, 1));
    for (const mesh of agen) k.pasang(mesh);
  }
  const u = ukurPohon(adegan);
  return { n, cara, drawCall: u.drawCall, segitiga: u.segitiga, kaster: u.kaster, perAgen };
}

const ribuan = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const daftar = process.argv.slice(2).map(Number).filter((x) => Number.isInteger(x) && x > 0);
  const N = daftar.length ? daftar : [10, 30, 70];
  console.log('Anggaran kerumunan — agen NPC.js + kit kelas v0 + penanda ✦ (THREE r128, tanpa culling)\n');
  console.log('   N  cara        DC utama  kaster (=DC bayangan)  segitiga');
  for (const n of N) {
    for (const cara of CARA) {
      const r = ukurKerumunan(n, cara);
      console.log(`${String(n).padStart(4)}  ${cara.padEnd(10)} ${String(r.drawCall).padStart(9)}  ${String(r.kaster).padStart(21)}  ${ribuan(r.segitiga).padStart(8)}`);
    }
  }
  const s = ukurKerumunan(1).perAgen;
  console.log(`\nSatu agen tanpa cincin: ${s.drawCall} DC (batas ${MAKS_DC_PER_AGEN}), ${s.segitiga} segitiga, ${s.kaster} kaster.`);
}
