// ═══════════════════════════════════════════════════════
// tests/agen3dPose.test.mjs — status body language on the real NPC mesh
//
// Desain §9.4 motion rules: working = slow nod (repeats — it is the "⋯" of the
// world); result ready = ONE hop, then still; failed = still (no alarm);
// prefers-reduced-motion = no motion at all. The pose never touches facing
// (rotation.y) or position: those belong to the walker (stream B).
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { NPCManager } = await import('../src/entities/NPC.js');
const { POSE, terapkanPose } = await import('../src/world/agen/index.js');

const npc = () => new NPCManager(new THREE.Scene()).build().npcs[0].mesh;
const sampel = (mesh, pose, dari, sampai, langkah = 0.05) => {
  const out = [];
  for (let t = dari; t <= sampai + 1e-9; t += langkah) out.push({ t, dy: terapkanPose(mesh, pose, t), x: mesh.rotation.x });
  return out;
};

test('bekerja: condong ke meja dan mengangguk pelan (bukan diam, bukan cepat)', () => {
  const m = npc();
  const s = sampel(m, 'bekerja', 0, 2.5);
  const xs = s.map((v) => v.x);
  assert.ok(Math.min(...xs) > 0.05, 'tidak condong ke depan');
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.08, 'tidak mengangguk');
  assert.ok(POSE.bekerja.angguk.hz <= 1, 'anggukan terlalu cepat untuk "membaca"');
  assert.ok(s.every((v) => v.dy === 0));
});

test('lapor (hasil siap): satu lompatan saat tiba, lalu diam', () => {
  const m = npc();
  const awal = sampel(m, 'lapor', 0, POSE.lapor.lompat.detik);
  assert.ok(Math.max(...awal.map((v) => v.dy)) > 0.1, 'tidak ada lompatan');
  const sesudah = sampel(m, 'lapor', POSE.lapor.lompat.detik + 0.01, 10, 0.25);
  assert.ok(sesudah.every((v) => v.dy === 0), 'melompat terus');
});

test('lesu (gagal) dan tanya (menunggu otak): diam — tidak ada gerak berulang', () => {
  for (const p of ['lesu', 'tanya', 'menunggu']) {
    const m = npc();
    const s = sampel(m, p, 0, 5, 0.1);
    assert.ok(s.every((v) => v.dy === 0 && v.x === s[0].x), `${p} bergerak`);
  }
  const m = npc();
  terapkanPose(m, 'lesu', 0);
  assert.ok(m.rotation.x > 0.25, 'lesu tidak menunduk');
  terapkanPose(m, 'tanya', 0);
  assert.ok(Math.abs(m.rotation.z) > 0.1, 'tanya tidak memiringkan kepala');
});

test('prefers-reduced-motion: tanpa angguk dan tanpa lompatan; hadap dan posisi tidak disentuh', () => {
  const m = npc();
  m.rotation.y = 1.234; m.position.set(4, 0.2, -9);
  for (const p of Object.keys(POSE)) {
    for (const t of [0, 0.1, 0.2, 1.3]) {
      const dy = terapkanPose(m, p, t, { kurangiGerak: true });
      assert.equal(dy, 0);
      assert.equal(m.rotation.x, POSE[p].condong);
    }
  }
  assert.equal(m.rotation.y, 1.234);
  assert.deepEqual(m.position.toArray(), [4, 0.2, -9]);
  terapkanPose(m, 'tidak-ada', 0);
  assert.equal(m.rotation.x, 0, 'pose tak dikenal harus jatuh ke "bebas"');
});
