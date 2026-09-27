import test from 'node:test';
import assert from 'node:assert/strict';
import { pecahLangkah, LANGKAH_MAKS, WAKTU_MAKS_PER_FRAME } from '../src/core/langkah.js';

const jumlah = (xs) => xs.reduce((a, b) => a + b, 0);

test('at 4 FPS agents still get the full real time, in steps no longer than 0.05 s', () => {
  const s = pecahLangkah(0.25);
  assert.ok(Math.abs(jumlah(s) - 0.25) < 1e-9, `simulated ${jumlah(s)}`);
  assert.ok(s.every((x) => x <= LANGKAH_MAKS + 1e-12), JSON.stringify(s));
});

test('a normal 60 FPS frame is one step of its own length', () => {
  assert.deepEqual(pecahLangkah(1 / 60), [1 / 60]);
});

test('a long pause (hidden tab) is capped, not replayed', () => {
  assert.ok(Math.abs(jumlah(pecahLangkah(120)) - WAKTU_MAKS_PER_FRAME) < 1e-9);
  assert.ok(pecahLangkah(120).length <= Math.ceil(WAKTU_MAKS_PER_FRAME / LANGKAH_MAKS));
});

test('zero, negative and invalid deltas simulate nothing', () => {
  for (const dt of [0, -1, NaN, Infinity, undefined]) assert.deepEqual(pecahLangkah(dt), [], String(dt));
});

test('Game.js runs agent behaviour through pecahLangkah, not the clamped frame dt', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/core/Game.js', import.meta.url), 'utf8');
  assert.match(src, /for \(const langkah of pecahLangkah\(/);
  assert.doesNotMatch(src, /this\.npcs\.update\(dt,/);
});
