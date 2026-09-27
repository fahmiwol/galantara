// ═══════════════════════════════════════════════════════
// tests/pendamping.test.mjs — instanced companion kit: every party companion in ≤ 3 draw calls
//
// SPRINT-02 C butir 1 (laporan Game §6b, 3D §6.8): body, head and class kit are
// InstancedMeshes, so the whole party costs the same few draw calls whether it has
// 1 member or 30. Guarded here with the REAL three r128 (vendor/):
//   - draw calls constant in N, 0 shadow casters, 0 lights
//   - the API B calls: tambah / pindah / lepas / perbarui (+ idempotence, capacity, errors)
//   - per-instance data really lands in the instance buffers (class id, colour, matrix)
//   - the r128 shader patch is applied to r128's REAL shader source and fails loudly
//     if a chunk it relies on disappears (three upgrade)
//   - an instanced companion looks like the M1 agent (NPC body + pasangKitKelas):
//     silhouette IoU at 32 px
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

if (!globalThis.THREE) {
  const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
  const modul = { exports: {} };
  new Function('module', 'exports', sumber)(modul, modul.exports);
  globalThis.THREE = modul.exports;
}

const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const { NPCManager } = await import('../src/entities/NPC.js');
const A = await import('../src/world/agen/index.js');
const S = await import('../src/world/agen/siluet.js');
const P = await import('../src/world/pendamping/index.js');

const KELAS = ['penjejak', 'operator', 'pemandu'];

function partai(n, opsi = {}) {
  const adegan = new THREE.Scene();
  const kit = P.buatKitPendamping(adegan, { maks: Math.max(n, 1), ...opsi });
  for (let i = 0; i < n; i++) {
    assert.equal(kit.tambah(`ag_${i}`, KELAS[i % 3]), true);
    kit.pindah(`ag_${i}`, (i % 10) * 1.6, 0, Math.floor(i / 10) * 1.6, 0);
  }
  kit.perbarui();
  return { adegan, kit };
}

test('pendamping: party 4 = 2 draw call (semua dekat), tanpa kaster bayangan dan tanpa lampu', () => {
  const { adegan } = partai(4);
  const u = ukurPohon(adegan);
  assert.equal(u.drawCall, 2, `${u.drawCall} draw call untuk 4 pendamping dekat (sosok + tanah)`);
  assert.equal(u.kaster, 0);
  assert.equal(u.lampu, 0);
});

test('pendamping: draw call tetap ≤ 3 berapa pun jumlahnya, dan 0 bila kosong', () => {
  assert.equal(ukurPohon(partai(0).adegan).drawCall, 0, 'kit kosong masih menggambar');
  for (const n of [1, 4, 12, 30, 70]) {
    const { adegan, kit } = partai(n);
    // Paksa campuran dekat/jauh: kasus terburuk untuk draw call.
    kit.paksaLod('ag_0', 'jauh');
    kit.perbarui();
    const u = ukurPohon(adegan);
    assert.ok(u.drawCall <= P.MAKS_DC_PENDAMPING, `N=${n}: ${u.drawCall} draw call`);
    if (n > 1) assert.equal(u.drawCall, 3, `N=${n}: campuran dekat+jauh harus 3 (sosok dekat, sosok jauh, tanah)`);
  }
  assert.equal(P.MAKS_DC_PENDAMPING, 3);
});

test('pendamping API: tambah idempoten, kapasitas, kelas tak dikenal, lepas, pindah id tak dikenal', () => {
  const adegan = new THREE.Scene();
  const kit = P.buatKitPendamping(adegan, { maks: 2 });
  assert.equal(kit.tambah('sari', 'penjejak'), true);
  assert.equal(kit.tambah('sari', 'Operator Lapangan'), true, 'tambah ulang = ganti kelas, bukan gagal');
  assert.equal(kit.jumlah, 1);
  assert.equal(kit.kelas('sari'), 'operator');
  assert.equal(kit.tambah('budi', 'operator'), true);
  assert.equal(kit.tambah('maya', 'pemandu'), false, 'melewati kapasitas harus ditolak dengan false');
  assert.equal(kit.jumlah, 2);
  assert.throws(() => kit.tambah('x', 'Juru Warta'), /kelas agen tidak dikenal: "Juru Warta"/);
  assert.throws(() => kit.tambah('', 'penjejak'), /id pendamping/);
  assert.equal(kit.pindah('tidak_ada', 0, 0, 0, 0), false);
  assert.equal(kit.lepas('sari'), true);
  assert.equal(kit.lepas('sari'), false);
  assert.equal(kit.jumlah, 1);
  assert.equal(kit.tambah('maya', 'pemandu'), true, 'slot yang dilepas bisa dipakai lagi');
  assert.throws(() => P.buatKitPendamping(adegan, { maks: 0 }), /maks/);
});

/** Instance k's world transform of a local point, read back from the buffer. */
function titikInstans(mesh, k, lokal) {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(k, m);
  return new THREE.Vector3(...lokal).applyMatrix4(m);
}

test('pendamping: data per instans benar-benar tertulis — posisi, hadap, kelas, warna badan', () => {
  const adegan = new THREE.Scene();
  const kit = P.buatKitPendamping(adegan, { maks: 4 });
  kit.tambah('sari', 'penjejak', { warna: 0x8B5CF6 });
  kit.tambah('budi', 'operator');
  kit.pindah('sari', 1, 0.2, 2, Math.PI / 2);
  kit.pindah('budi', -3, 0, 5, 0, { angkat: 0.1 });
  kit.perbarui();
  const { dekat, tanah } = kit.mesh;
  assert.equal(dekat.count, 2);
  // Hadap π/2: depan lokal (+Z) → +X dunia.
  const d = titikInstans(dekat, 0, [0, 0, 1]);
  assert.ok(d.distanceTo(new THREE.Vector3(2, 0.2, 2)) < 1e-6, `hadap salah: ${d.toArray()}`);
  // angkat hanya menaikkan sosok; cincin + bayangan tetap di lantai.
  assert.ok(titikInstans(dekat, 1, [0, 0, 0]).distanceTo(new THREE.Vector3(-3, 0.1, 5)) < 1e-6);
  assert.ok(Math.abs(titikInstans(tanah, 1, [0, 0, 0]).y - 0) < 0.02, 'cincin ikut melompat');
  const kelasAttr = dekat.geometry.getAttribute('kelasInstans');
  assert.deepEqual([kelasAttr.getX(0), kelasAttr.getX(1)], [A.ID_KELAS.penjejak, A.ID_KELAS.operator]);
  const c = new THREE.Color();
  dekat.getColorAt(0, c);
  assert.equal(c.getHex(), 0x8B5CF6);
  dekat.getColorAt(1, c);
  assert.equal(c.getHex(), P.WARNA_BADAN.operator);
});

test('pendamping: lepas memadatkan instans — yang tersisa tetap di posisinya, kelasnya tidak tertukar', () => {
  const adegan = new THREE.Scene();
  const kit = P.buatKitPendamping(adegan, { maks: 4 });
  ['penjejak', 'operator', 'pemandu'].forEach((k, i) => { kit.tambah(`a${i}`, k); kit.pindah(`a${i}`, i * 10, 0, 0, 0); });
  kit.perbarui();
  kit.lepas('a0');
  kit.perbarui();
  const { dekat } = kit.mesh;
  assert.equal(dekat.count, 2);
  const kelas = dekat.geometry.getAttribute('kelasInstans');
  const hasil = [0, 1].map((k) => [Math.round(titikInstans(dekat, k, [0, 0, 0]).x), kelas.getX(k)]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(hasil, [[10, A.ID_KELAS.operator], [20, A.ID_KELAS.pemandu]]);
});

test('pendamping: LOD dari ukuran di layar (rumus ADR-0004), dengan histeresis supaya tidak berkedip', () => {
  const adegan = new THREE.Scene();
  const kit = P.buatKitPendamping(adegan, { maks: 2 });
  kit.tambah('a', 'penjejak');
  const kam = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  kam.position.set(0, 0, 0); kam.updateMatrixWorld(true);
  const H = 800;
  const jarakUntukPx = (px) => (P.TINGGI_PENDAMPING * H) / (2 * Math.tan((50 * Math.PI) / 360)) / px;
  const taruh = (px) => { kit.pindah('a', 0, 0, -jarakUntukPx(px), 0); return kit.perbarui(kam, { tinggiLayar: H }); };
  assert.deepEqual(taruh(60), { dekat: 1, jauh: 0 });
  assert.equal(kit.lod('a'), 'dekat');
  assert.deepEqual(taruh(P.AMBANG_LOD_PX.keJauh + 1), { dekat: 1, jauh: 0 }, 'di pita histeresis tetap dekat');
  assert.deepEqual(taruh(P.AMBANG_LOD_PX.keJauh - 1), { dekat: 0, jauh: 1 });
  assert.deepEqual(taruh(P.AMBANG_LOD_PX.keDekat - 1), { dekat: 0, jauh: 1 }, 'di pita histeresis tetap jauh');
  assert.deepEqual(taruh(P.AMBANG_LOD_PX.keDekat + 1), { dekat: 1, jauh: 0 });
  assert.ok(P.AMBANG_LOD_PX.keJauh < 48 && P.AMBANG_LOD_PX.keDekat > 48, 'LOD0 ≥ 48 px (laporan 3D §6.3)');
  // Tanpa kamera: semua dekat (paling aman untuk keterbacaan).
  assert.deepEqual(kit.perbarui(), { dekat: 1, jauh: 0 });
});

test('shader r128 ditambal pada sumber ASLI r128, dan menolak diam-diam gagal bila potongannya hilang', () => {
  const bahan = P.bahanPendamping();
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
  bahan.onBeforeCompile(shader);
  const v = shader.vertexShader;
  assert.match(v, /attribute float kelasVerteks;/);
  assert.match(v, /attribute float kelasInstans;/);
  assert.match(v, /attribute float tintVerteks;/);
  assert.match(v, /#include <begin_vertex>\s*\n\s*if \( kelasVerteks >= 0\.0 && abs\( kelasVerteks - kelasInstans \) > 0\.5 \) transformed = vec3\( 0\.0 \);/);
  assert.match(v, /vColor\.xyz \*= mix\( vec3\( 1\.0 \), instanceColor\.xyz, tintVerteks \);/);
  assert.doesNotMatch(v, /#include <color_vertex>/, 'color_vertex bawaan masih mewarnai kepala dengan warna badan');
  assert.notEqual(bahan.customProgramCacheKey(), new THREE.MeshStandardMaterial().customProgramCacheKey());
  assert.throws(() => bahan.onBeforeCompile({ vertexShader: 'void main(){}', fragmentShader: '', uniforms: {} }), /potongan shader r128 tidak ditemukan/);
});

test('aturan sembunyi di JS sama dengan di GLSL: tiap kelas hanya melihat bagiannya + bagian bersama', () => {
  const g = P.geometriSosok('dekat');
  const kv = g.getAttribute('kelasVerteks');
  for (const k of KELAS) {
    const id = A.ID_KELAS[k];
    let lain = 0; let milik = 0; let bersama = 0;
    for (let i = 0; i < kv.count; i++) {
      const t = P.terlihatUntuk(kv.getX(i), id);
      if (kv.getX(i) < 0) { bersama++; assert.ok(t); } else if (kv.getX(i) === id) { milik++; assert.ok(t); } else { lain++; assert.ok(!t); }
    }
    assert.ok(milik > 0 && bersama > 0 && lain > 0, `${k}: ${milik}/${bersama}/${lain}`);
  }
  assert.ok(P.GLSL_SEMBUNYI.includes('> 0.5') && P.terlihatUntuk(1.4, 1) && !P.terlihatUntuk(1.6, 1));
});

test('pendamping instans terlihat sama dengan agen M1 (badan NPC.js + pasangKitKelas): IoU siluet 32 px ≥ 0,92', () => {
  const npc = (kelas) => {
    const g = new NPCManager(new THREE.Scene()).build().npcs[0].mesh;
    g.position.set(0, 0, 0);
    A.pasangKitKelas(g, kelas);
    g.updateMatrixWorld(true);
    // Only the body parts that are lit figures (blob shadow lies on the floor, y≈0).
    return g.children.filter((c) => c.isMesh && c.name !== 'bayangan_gumpal');
  };
  for (const k of KELAS) {
    const m = S.maskerBersama({ m1: npc(k), instans: [P.meshTerlihat('dekat', k)] });
    for (const p of ['depan', 'tigaperempat']) {
      const v = S.iou(m[p].m1, m[p].instans);
      assert.ok(v >= 0.92, `${k} ${p}: IoU ${v.toFixed(3)}\n${S.gambarMasker(m[p].instans)}`);
    }
  }
});

test('segitiga per pendamping dekat: terlihat ≤ 450, terkirim (termasuk kit kelas lain yang diciutkan) ≤ 700', () => {
  const kirim = P.geometriSosok('dekat').attributes.position.count / 3;
  assert.ok(kirim <= 700, `${kirim} segitiga dikirim per pendamping`);
  for (const k of KELAS) {
    const t = P.meshTerlihat('dekat', k).geometry.attributes.position.count / 3;
    assert.ok(t <= 450, `${k}: ${t} segitiga terlihat`);
  }
});

test('buang(): semua mesh keluar dari adegan', () => {
  const { adegan, kit } = partai(3);
  kit.buang();
  assert.equal(ukurPohon(adegan).drawCall, 0);
  assert.equal(adegan.children.length, 0);
});
