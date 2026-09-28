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

test('the avatar walks real time at 4 FPS and at 1 FPS (not slow motion), in steps ≤ 0.05 s', async () => {
  const { Avatar, WAKTU_AVATAR_MAKS } = await import('../src/entities/Avatar.js');
  const kamera = { getMoveDelta: (d) => (d === 'right' ? { dx: 1, dz: 0 } : null) };
  for (const fps of [60, 4, 1]) {
    const a = new Avatar(null);
    a.mesh = { position: { set() {} }, rotation: {} };
    a.keys.right = true;
    const langkahDipakai = [];
    const asli = a.update.bind(a);
    a.update = (dt, cam) => { langkahDipakai.push(dt); return asli(dt, cam); };
    for (let i = 0; i < fps * 2; i++) a.majukan(1 / fps, kamera);
    assert.ok(Math.abs(a.pos.x - 5.4 * 2) < 1e-6, `${fps} FPS: walked ${a.pos.x} m in 2 s`);
    assert.ok(langkahDipakai.every((d) => d <= LANGKAH_MAKS + 1e-12), `${fps} FPS steps: ${Math.max(...langkahDipakai)}`);
  }
  assert.equal(WAKTU_AVATAR_MAKS, 1);
});

test('Game.js moves the avatar with majukan(dtMentah), not update(dt clamped)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/core/Game.js', import.meta.url), 'utf8');
  assert.match(src, /this\.avatar\.majukan\(dtMentah, this\.camera\)/);
  assert.doesNotMatch(src, /this\.avatar\.update\(dt,/);
});
