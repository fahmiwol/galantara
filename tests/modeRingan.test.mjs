// tests/modeRingan.test.mjs — Mode Ringan: auto under 25 FPS for 5 s, switchable, kept per device.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModeRingan, terapkanRingan, KUNCI_MODE_RINGAN } from '../src/core/ModeRingan.js';
import { penyimpananPalsu } from './bantu/runtimePalsu.mjs';

const jalankan = (m, fps, detik) => {
  let on = false;
  for (let t = 0; t < detik - 1e-9; t += 1 / fps) on = m.catat(1 / fps) || on;
  return on;
};

test('switches itself on after 5 s under 25 FPS, not before, and remembers it', () => {
  const s = penyimpananPalsu();
  const dipakai = [];
  const m = new ModeRingan({ penyimpanan: s, terapkan: (n) => dipakai.push(n) });
  assert.equal(jalankan(m, 20, 4), false);
  assert.equal(jalankan(m, 20, 1.5), true);
  assert.deepEqual(dipakai, [true]);
  assert.equal(s.getItem(KUNCI_MODE_RINGAN), 'nyala');
  const lagi = [];
  new ModeRingan({ penyimpanan: s, terapkan: (n) => lagi.push(n) });
  assert.deepEqual(lagi, [true], 'next visit starts light at once');
});

test('a fast stretch resets the count; 30 FPS never triggers', () => {
  const m = new ModeRingan();
  jalankan(m, 20, 4);
  jalankan(m, 60, 1);
  assert.equal(jalankan(m, 20, 4), false);
  const n = new ModeRingan();
  assert.equal(jalankan(n, 30, 60), false);
});

test('a hidden-tab pause is not slowness', () => {
  const m = new ModeRingan();
  for (let i = 0; i < 20; i++) assert.equal(m.catat(30), false);
  assert.equal(m.nyala, false);
});

test('switched off by the player: stays off, even when slow, and on the next visit', () => {
  const s = penyimpananPalsu();
  const m = new ModeRingan({ penyimpanan: s });
  jalankan(m, 10, 6);
  assert.equal(m.nyala, true);
  assert.equal(m.setel(false), false);
  assert.equal(jalankan(m, 10, 20), false);
  assert.equal(s.getItem(KUNCI_MODE_RINGAN), 'mati');
  assert.equal(new ModeRingan({ penyimpanan: s }).pilihan, 'mati');
  const rusak = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.equal(new ModeRingan({ penyimpanan: rusak }).setel(true), true);
});

test('applied to the renderer: pixel ratio 1, shadow map and sun shadow off; and back', () => {
  const r = { renderer: { pr: 0, setPixelRatio(x) { this.pr = x; }, shadowMap: { enabled: true } }, sun: { castShadow: true } };
  terapkanRingan(r, true, 3);
  assert.deepEqual([r.renderer.pr, r.renderer.shadowMap.enabled, r.sun.castShadow], [1, false, false]);
  terapkanRingan(r, false, 3);
  assert.deepEqual([r.renderer.pr, r.renderer.shadowMap.enabled, r.sun.castShadow], [2, true, true]);
});
