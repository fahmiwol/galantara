// ═══════════════════════════════════════════════════════
// tests/pendampingAnggaran.test.mjs — Oola with party 4 + full Markas stays ≤ 150 / 20k / 3
//
// SPRINT-02 C butir 5. The Spot budget (docs/brief/suasana/KEPUTUSAN.md §2.1: ≤ 150
// main-pass draw calls, ≤ 20.000 triangles, ≤ 3 PointLight) measured headless on the
// REAL Oola (World.js from the map, sky included) with:
//   - the Markas at its worst case: 18 scrolls, 4 desks taken (lamps + cups + props)
//   - a party of 4 companions from the instanced kit, at its worst case for EACH
//     number: draw calls with near and far mixed (3), triangles with all four near
//   - no frustum culling: everything counted as if on screen
// World NPCs and the player avatar are outside this number, the same definition as
// tools/anggaran-spot.mjs; the browser page `?ukur` measures everything together.
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

const { ANGGARAN, ukurPohon } = await import('../tools/anggaran-spot.mjs');
const K = await import('../tools/anggaran-kerumunan.mjs');

test('Oola + Markas penuh + party 4 pendamping: ≤ 150 draw call, ≤ 20.000 segitiga, ≤ 3 PointLight', async () => {
  const r = await K.ukurOolaParty(4);
  assert.ok(r.markas.drawCall === 12 && r.markas.gelas === 4 && r.markas.gulungan === 18, `Markas bukan kasus terburuk: ${JSON.stringify(r.markas)}`);
  assert.equal(r.party.drawCall, 3, 'party harus diukur di kasus terburuk draw call (dekat + jauh)');
  assert.ok(r.total.drawCall <= ANGGARAN.drawCall, `${r.total.drawCall} draw call > ${ANGGARAN.drawCall}`);
  assert.ok(r.total.segitiga <= ANGGARAN.segitiga, `${r.total.segitiga} segitiga > ${ANGGARAN.segitiga}`);
  assert.ok(r.total.lampu <= ANGGARAN.pointLight, `${r.total.lampu} PointLight`);
  assert.equal(r.party.kaster, 0, 'pendamping menambah pass bayangan');
});

test('kontrol: angka Oola+party benar-benar memuat Markas dan party (bukan lulus karena kosong)', async () => {
  const r = await K.ukurOolaParty(4);
  const tanpa = await K.ukurOolaParty(0);
  assert.equal(r.total.drawCall - tanpa.total.drawCall, 3);
  assert.ok(r.total.segitiga - tanpa.total.segitiga >= 4 * 300, 'party 4 menambah terlalu sedikit segitiga — kit kosong?');
  assert.ok(r.markas.drawCall > 0 && r.oola.drawCall > r.markas.drawCall);
  // Party grows, draw calls do not.
  const besar = await K.ukurOolaParty(12);
  assert.equal(besar.total.drawCall, r.total.drawCall);
  void ukurPohon;
});
