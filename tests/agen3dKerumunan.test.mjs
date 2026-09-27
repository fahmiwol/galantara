// ═══════════════════════════════════════════════════════
// tests/agen3dKerumunan.test.mjs — tools/anggaran-kerumunan.mjs keeps its promises
//
//   - one dressed agent (NPC body + class kit) ≤ 4 draw calls, every class
//   - PenandaKerumunan draws every ✦ ring in ONE draw call; per-agent rings cost one each
//   - neither kit nor ring adds a shadow caster (a caster = one more shadow-pass DC)
//   - the numbers are deterministic (same N → same count), so the LOG table is repeatable
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

const K = await import('../tools/anggaran-kerumunan.mjs');
const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const { NPCManager } = await import('../src/entities/NPC.js');

test('satu agen berpakaian kelas (badan + kit) ≤ 4 draw call, setiap kelas', () => {
  // 3 agents = one of each class (kits are assigned in KELAS order).
  const r = K.ukurKerumunan(3, 'kerumunan');
  assert.ok(r.perAgen.drawCall <= K.MAKS_DC_PER_AGEN, `agen ${r.perAgen.drawCall} DC > ${K.MAKS_DC_PER_AGEN}`);
  assert.equal(K.MAKS_DC_PER_AGEN, 4);
});

test('cincin ✦: kerumunan = 1 draw call untuk semua; per agen = 1 per agen', () => {
  for (const n of [1, 10, 30]) {
    const a = K.ukurKerumunan(n, 'kerumunan');
    const b = K.ukurKerumunan(n, 'per-agen');
    assert.ok(a.drawCall <= n * K.MAKS_DC_PER_AGEN + 1, `N=${n} kerumunan: ${a.drawCall} DC`);
    assert.equal(b.drawCall - a.drawCall, n - 1, `N=${n}: selisih cara cincin`);
    assert.equal(a.segitiga, b.segitiga, 'cara menggambar cincin tidak boleh mengubah segitiga');
  }
});

test('kit dan cincin tidak menambah kaster bayangan', () => {
  const badan = ukurPohon(new NPCManager(new THREE.Scene()).build().npcs[0].mesh).kaster;
  for (const cara of K.CARA) {
    const r = K.ukurKerumunan(12, cara);
    assert.equal(r.kaster, 12 * badan, `${cara}: ${r.kaster} kaster untuk 12 agen (badan ${badan} per agen)`);
  }
});

test('angka deterministik — tabel di LOG bisa diulang', () => {
  assert.deepEqual(K.ukurKerumunan(30, 'kerumunan'), K.ukurKerumunan(30, 'kerumunan'));
  assert.throws(() => K.ukurKerumunan(3, 'acak'), /cara tidak dikenal/);
});
