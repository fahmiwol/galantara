import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JejakPemilik, JEDA_PENDAMPING, PANJANG_JEJAK } from '../src/party/JejakPemilik.js';
import { PerilakuNpc } from '../src/entities/PerilakuNpc.js';

const dt = 1 / 60;
const jarak = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const dekat = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function jalan(j, p, dx, dz, n) {
  for (let i = 0; i < n; i++) { p.x += dx; p.z += dz; j.catat(p, dt, Math.PI / 2); }
}
function awal() {
  const j = new JejakPemilik(), p = { x: 0, z: 0 };
  j.catat(p, dt, Math.PI / 2);
  return { j, p };
}

test('E2E-1: slow final 0.40 m does not collapse target or settled NPC onto owner', (t) => {
  const { j, p } = awal();
  jalan(j, p, 5.4 * dt, 0, 120);
  jalan(j, p, 0.4 / 21, 0, 21); // exactly 0.35 s
  const target = j.titikPendamping(1);
  const npc = new PerilakuNpc({ x: p.x - 3, z: 0, rng: () => 0.5 });
  npc.perintah({ jenis: 'ikut' }); npc.titikIkut = target;
  for (let i = 0; i < 600; i++) npc.perbarui(dt, { posisiPemain: p });
  const hasil = { target_m: jarak(p, target), npc_m: jarak(p, npc), bergerak: npc.bergerak };
  t.diagnostic(JSON.stringify(hasil));
  assert.ok(hasil.target_m > 0.5, JSON.stringify(hasil));
  assert.ok(hasil.npc_m > 0.5, JSON.stringify(hasil));
  assert.equal(npc.bergerak, false);
});

test('four slots retain 1.2 m of path at a slow crawl; stopping freezes the line', () => {
  const { j, p } = awal();
  jalan(j, p, 0.4 * dt, 0, 1800);
  const targets = [1, 2, 3, 4].map(k => j.titikPendamping(k));
  targets.forEach((v, i) => dekat(jarak(p, v), 1.2 * (i + 1)));
  for (let i = 0; i < 600; i++) j.catat(p, dt, Math.PI / 2);
  assert.deepEqual([1, 2, 3, 4].map(k => j.titikPendamping(k)), targets);
});

test('a right angle keeps targets on the walked path with separated slots', () => {
  const { j, p } = awal();
  jalan(j, p, 5.4 * dt, 0, 120);
  const corner = { ...p };
  jalan(j, p, 0, 0.4 / 21, 21);
  const targets = [1, 2, 3, 4].map(k => j.titikPendamping(k));
  for (const v of targets) {
    assert.ok(Math.abs(v.z) < 1e-6 || Math.abs(v.x - corner.x) < 1e-6, 'point remains on recorded path');
    assert.ok(jarak(v, p) > 0.5, `owner separation ${jarak(v, p)}`);
  }
  for (let i = 0; i < targets.length; i++) for (let k = i + 1; k < targets.length; k++)
    assert.ok(jarak(targets[i], targets[k]) > 0.5, `slot separation ${i}/${k}`);
});

test('normal walking preserves the existing 0.35 s offset, and warp reseeds', () => {
  const { j, p } = awal();
  jalan(j, p, 5.4 * dt, 0, 240);
  for (const k of [1, 2, 3, 4]) dekat(jarak(p, j.titikPendamping(k)), 5.4 * k * JEDA_PENDAMPING);
  assert.ok(j.titik.length <= Math.ceil(PANJANG_JEJAK / dt) + 3);
  j.catat({ x: 100, z: 100 }, dt, 0);
  for (const k of [1, 2, 3, 4]) dekat(jarak({ x: 100, z: 100 }, j.titikPendamping(k)), 1.2 * k);
});

test('long crawl remains bounded by the existing movement sampling floor', () => {
  const { j, p } = awal();
  jalan(j, p, 0.0041, 0, 10000);
  assert.ok(j.titik.length <= Math.ceil((1.2 / JEDA_PENDAMPING) * PANJANG_JEJAK / 0.004) + 3);
  dekat(jarak(p, j.titikPendamping(4)), 4.8);
});
