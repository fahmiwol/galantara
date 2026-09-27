// ═══════════════════════════════════════════════════════
// tests/perilakuNpc.test.mjs — NPC behaviour as a function of time.
//
// Guarded (mutation-proven, docs/sprint/LOG-B-dunia-klien.md):
// - speed is m/s × dt: a 30 fps phone and a 60 fps laptop see the NPC at the same place;
// - walking to a point never overshoots it; a route is followed in order;
// - keliling → menuju → bekerja → lapor → keliling, as commanded;
// - an open dialog freezes the NPC; strolling never leaves its radius.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PerilakuNpc, KECEPATAN_MENUJU, KECEPATAN_KELILING, RADIUS_KELILING, JARAK_LAPOR,
} from '../src/entities/PerilakuNpc.js';

/** Deterministic random numbers (mulberry32), same sequence for every run. */
function acak(benih = 7) {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jalankan(p, detik, fps, ctx) {
  const n = Math.round(detik * fps);
  for (let i = 0; i < n; i++) p.perbarui(1 / fps, ctx);
}

test('30 fps and 60 fps put a walking NPC at the same place after 1 s', () => {
  const a = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  const b = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  a.perintah({ jenis: 'menuju', titik: { x: 10, z: 0 } });
  b.perintah({ jenis: 'menuju', titik: { x: 10, z: 0 } });
  jalankan(a, 1, 30);
  jalankan(b, 1, 60);
  assert.ok(Math.abs(a.x - KECEPATAN_MENUJU) < 1e-9, `30 fps: ${a.x}`);
  assert.ok(Math.abs(b.x - KECEPATAN_MENUJU) < 1e-9, `60 fps: ${b.x}`);
});

test('arrives exactly at the point, never past it, then starts working facing the desk', () => {
  const p = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  p.perintah({ jenis: 'menuju', titik: { x: 0, z: -2, arah: Math.PI / 2 } });
  let terjauh = 0;
  for (let i = 0; i < 120; i++) {
    p.perbarui(0.05);
    terjauh = Math.min(terjauh, p.z);
  }
  assert.equal(p.z, -2);
  assert.equal(terjauh, -2, 'never beyond the point, even with 50 ms frames');
  assert.equal(p.keadaan, 'bekerja');
  assert.equal(p.arah, Math.PI / 2);
  // Working means staying put.
  jalankan(p, 5, 60);
  assert.deepEqual([p.x, p.z], [0, -2]);
});

test('a route is walked in order, and a long frame is spent across legs', () => {
  const p = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  p.perintah({ jenis: 'menuju', titik: [{ x: 1, z: 0 }, { x: 1, z: 1 }], lalu: 'keliling' });
  p.perbarui(1 / KECEPATAN_MENUJU); // exactly 1 m: the end of leg one
  assert.deepEqual([+p.x.toFixed(9), +p.z.toFixed(9)], [1, 0]);
  p.perbarui(0.5 / KECEPATAN_MENUJU);
  assert.deepEqual([+p.x.toFixed(9), +p.z.toFixed(9)], [1, 0.5]);
  p.perbarui(10);
  assert.deepEqual([p.x, p.z], [1, 1]);
  assert.equal(p.keadaan, 'keliling', 'lalu:keliling strolls around the new spot');
  assert.deepEqual(p.jangkar, { x: 1, z: 1 });
});

test('reporting walks to the player, stops at arm\'s length, and waves', () => {
  const p = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  p.perintah({ jenis: 'lapor' });
  const pemain = { x: 6, z: 0 };
  jalankan(p, 10, 60, { posisiPemain: pemain });
  assert.ok(Math.abs(Math.hypot(pemain.x - p.x, pemain.z - p.z) - JARAK_LAPOR) < 1e-6);
  assert.equal(p.melambai, true);
  assert.equal(p.bergerak, false);
  // Back to strolling on command; the wave stops.
  p.perintah({ jenis: 'keliling' });
  assert.equal(p.melambai, false);
  assert.equal(p.keadaan, 'keliling');
});

test('an open dialog freezes the NPC and turns it toward the player', () => {
  const p = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  p.perintah({ jenis: 'menuju', titik: { x: 5, z: 0 } });
  jalankan(p, 1, 60, { dialogTerbuka: true, posisiPemain: { x: 0, z: -3 } });
  assert.deepEqual([p.x, p.z], [0, 0]);
  assert.equal(p.bergerak, false);
  assert.ok(Math.abs(p.arah - Math.PI) < 1e-9, 'faces the player (towards -z)');
  jalankan(p, 1, 60);
  assert.ok(p.x > 1.3, 'resumes when the dialog closes');
});

test('strolling stays inside its radius and under stroll speed, at 30 and 60 fps', () => {
  for (const fps of [30, 60]) {
    const p = new PerilakuNpc({ x: -5, z: -3, rng: acak(fps) });
    let lalu = { x: p.x, z: p.z };
    let bergerak = 0;
    for (let i = 0; i < 120 * fps; i++) {
      p.perbarui(1 / fps);
      const v = Math.hypot(p.x - lalu.x, p.z - lalu.z) * fps;
      assert.ok(v <= KECEPATAN_KELILING + 1e-9, `speed ${v} at ${fps} fps`);
      assert.ok(Math.hypot(p.x + 5, p.z + 3) <= RADIUS_KELILING + 1e-9, 'inside the radius');
      if (p.bergerak) bergerak++;
      lalu = { x: p.x, z: p.z };
    }
    assert.ok(bergerak > 10 * fps, 'it does stroll, not just stand');
  }
});

test('bad input does not move or break the NPC', () => {
  const p = new PerilakuNpc({ x: 1, z: 1, rng: acak() });
  p.perintah({ jenis: 'menuju', titik: { x: NaN, z: 0 } });
  assert.equal(p.keadaan, 'keliling', 'an invalid point is ignored');
  p.perbarui(-1);
  p.perbarui(NaN);
  assert.deepEqual([p.x, p.z], [1, 1]);
});

test('floor height eases along the leg (terrace, then seat) and back to the ground when strolling', () => {
  const p = new PerilakuNpc({ x: 0, z: 0, rng: acak() });
  // Approach point on the terrace (0,2 m), then the seat (0,62 m): the Markas "dekat → duduk" route.
  p.perintah({ jenis: 'menuju', titik: [{ x: 2, z: 0, y: 0.2 }, { x: 2, z: 1, y: 0.62, arah: 0 }] });
  p.perbarui(1 / KECEPATAN_MENUJU); // half of leg one
  assert.ok(Math.abs(p.y - 0.1) < 1e-9, `halfway up: ${p.y}`);
  p.perbarui(10);
  assert.equal(p.keadaan, 'bekerja');
  assert.equal(p.y, 0.62, 'sits at the seat height, not on the ground');
  p.perintah({ jenis: 'keliling' });
  jalankan(p, 20, 30);
  assert.equal(p.y, 0, 'strolling brings it back down to the ground');
});
