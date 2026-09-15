// ═══════════════════════════════════════════════════════
// tests/anggaranSpot.test.mjs — batas isi tiap Spot dijaga, bukan cuma ditulis
//
// docs/brief/suasana/KEPUTUSAN.md §2.1 memutuskan anggaran TOTAL per Spot:
// segitiga ≤ 20.000, draw call pass utama ≤ 150, PointLight ≤ 3. Hari keputusan
// itu ditulis, Oola sudah melanggar (153 draw call) tanpa ada yang tahu — batas
// di dokumen tidak menghentikan apa pun. Uji ini memakai alat ukur yang sama
// (tools/anggaran-spot.mjs), jadi angka di dokumen dan angka di uji tidak bisa
// berbeda definisi.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { ANGGARAN, SPOT, ukurSpot, ukurPohon } = await import('../tools/anggaran-spot.mjs');
const { buildProceduralGroup } = await import('../src/tools/proceduralMeshFactory.js');
const { PALETTE_SLOTS } = await import('../src/data/styleTokens.js');

for (const id of SPOT) {
  test(`${id}: dalam anggaran segitiga, draw call, dan PointLight`, async () => {
    const b = await ukurSpot(id);
    assert.ok(b.total <= ANGGARAN.segitiga, `${id}: ${b.total} segitiga > ${ANGGARAN.segitiga}`);
    assert.ok(b.drawCall <= ANGGARAN.drawCall, `${id}: ${b.drawCall} draw call > ${ANGGARAN.drawCall}`);
    assert.ok(b.lampu <= ANGGARAN.pointLight, `${id}: ${b.lampu} PointLight > ${ANGGARAN.pointLight}`);
  });
}

test('flower_patch: dua draw call, empat bunga, letak dan warna sama dengan versi mesh terpisah', () => {
  const palet = PALETTE_SLOTS.oola_heavenly;
  const skala = 1.2;
  const g = buildProceduralGroup('flower_patch', palet, 401, skala);
  const u = ukurPohon(g);
  assert.equal(u.drawCall, 2, `${u.drawCall} draw call per petak`);
  assert.equal(u.kaster, 0, 'bunga sekecil ini tidak perlu pass bayangan');

  const [batang, kepala] = g.children;
  assert.ok(batang.isInstancedMesh && kepala.isInstancedMesh);
  assert.equal(batang.count, 4);
  assert.equal(kepala.count, 4);

  // Urutan rand() versi lama: x, z, h per bunga. Warna: aksen lalu foliage, bergilir.
  const warnaDiharapkan = [palet.accent, ...palet.foliage];
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const w = new THREE.Color();
  batang.geometry.computeBoundingBox();
  const tinggiDasar = batang.geometry.boundingBox.max.y - batang.geometry.boundingBox.min.y;
  for (let i = 0; i < 4; i++) {
    batang.getMatrixAt(i, m); m.decompose(p, q, s);
    const tinggi = s.y * tinggiDasar;
    const puncak = p.y + tinggi / 2;
    assert.ok(Math.abs(p.y - tinggi / 2) < 1e-6, `batang ${i} tidak berdiri di tanah`);
    assert.ok(tinggi >= 0.18 * skala - 1e-6 && tinggi <= 0.36 * skala + 1e-6, `tinggi batang ${i}: ${tinggi}`);
    const bx = p.x; const bz = p.z;
    kepala.getMatrixAt(i, m); m.decompose(p, q, s);
    assert.ok(Math.hypot(p.x - bx, p.y - puncak, p.z - bz) < 1e-6, `kepala bunga ${i} tidak di ujung batangnya`);
    // instanceColor disimpan Float32 dan getHex() r128 memotong, bukan membulatkan.
    kepala.getColorAt(i, w);
    const hex = (Math.round(w.r * 255) << 16) | (Math.round(w.g * 255) << 8) | Math.round(w.b * 255);
    assert.equal(hex, warnaDiharapkan[i % warnaDiharapkan.length], `warna bunga ${i}`);
  }
  // Bahan kepala putih: warna per instans dikalikan ke warna bahan.
  assert.equal(kepala.material.color.getHex(), 0xffffff);
});
