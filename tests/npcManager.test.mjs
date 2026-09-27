// ═══════════════════════════════════════════════════════
// tests/npcManager.test.mjs — NPC.js delegates movement to PerilakuNpc.
//
// THREE is stubbed with just what NPC.js calls (Group, Mesh, geometries, materials). Guarded:
// the mesh follows the behaviour, the dialog NPC stops, commands reach the right NPC, and a
// hidden hub (player in a Spot) offers no one to talk to.
// ═══════════════════════════════════════════════════════

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { pasangKaitDunia, lepasKaitDunia } from '../src/party/kaitDunia.js';

class Obj {
  constructor() {
    this.children = [];
    this.visible = true;
    this.castShadow = false;
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
  }
  add(o) { this.children.push(o); }
}

let NPCManager, NPCS;
before(async () => {
  globalThis.THREE = {
    Group: Obj,
    Mesh: class extends Obj {},
    SphereGeometry: class {},
    CircleGeometry: class { rotateX() { return this; } },
    MeshStandardMaterial: class {},
    MeshBasicMaterial: class {},
  };
  ({ NPCManager } = await import('../src/entities/NPC.js'));
  ({ NPCS } = await import('../src/data/config.js'));
});

function buat() {
  const scene = new Obj();
  return new NPCManager(scene).build();
}

test('every NPC from config gets a behaviour and a mesh that follows it', () => {
  const m = buat();
  assert.equal(m.npcs.length, NPCS.length);
  const sari = m.get('sari');
  assert.ok(sari.perilaku);
  m.perintah('sari', { jenis: 'menuju', titik: { x: sari.x + 5, z: sari.z } });
  const x0 = sari.x;
  for (let i = 0; i < 60; i++) m.update(1 / 60, i / 60, {});
  assert.ok(Math.abs(sari.x - (x0 + 1.4)) < 1e-9, 'moved 1.4 m in 1 s');
  assert.equal(sari.mesh.position.x, sari.x);
  assert.equal(sari.mesh.rotation.y, sari.perilaku.arah);
});

test('the NPC in an open dialog stops; the others keep going', () => {
  const m = buat();
  const sari = m.get('sari');
  const budi = m.get('budi');
  m.perintah('sari', { jenis: 'menuju', titik: { x: sari.x + 5, z: sari.z } });
  m.perintah('budi', { jenis: 'menuju', titik: { x: budi.x + 5, z: budi.z } });
  const [sx, bx] = [sari.x, budi.x];
  for (let i = 0; i < 30; i++) m.update(1 / 30, i / 30, { dialogNpcId: 'sari', posisiPemain: { x: sx, z: sari.z + 1 } });
  assert.equal(sari.x, sx);
  assert.ok(budi.x > bx + 1);
});

test('commands for unknown NPCs are refused, not thrown', () => {
  const m = buat();
  assert.equal(m.perintah('naga', { jenis: 'lapor' }), false);
  assert.equal(m.perintah('sari', { jenis: 'lapor' }), true);
});

test('NPCs hidden in a Spot are not offered for talking', () => {
  const m = buat();
  const sari = m.get('sari');
  assert.equal(m.checkProximity({ x: sari.x + 0.5, z: sari.z })?.id, 'sari');
  m.setHubVisible(false);
  assert.equal(m.checkProximity({ x: sari.x + 0.5, z: sari.z }), null);
});

test('NPCs cast no real shadows: one soft blob each, kept on the floor while the body bobs', () => {
  const m = buat();
  for (const n of m.npcs) {
    const kaster = [];
    const jalan = (o) => { if (o.castShadow) kaster.push(o); o.children.forEach(jalan); };
    jalan(n.mesh);
    assert.deepEqual(kaster, [], `${n.data.id} casts a shadow`);
    assert.equal(n.mesh.children.filter((c) => c.name === 'bayangan_gumpal').length, 1);
  }
  const sari = m.get('sari');
  for (let i = 0; i < 20; i++) m.update(1 / 60, 0.3 + i / 60, {});
  assert.ok(Math.abs(sari.mesh.position.y + sari.bayangan.position.y - 0.015) < 1e-9, 'blob world height = floor');
});

test('at its status spot the NPC stands at the floor height and holds C\'s pose; walking uses B\'s bob', (t) => {
  t.after(() => lepasKaitDunia());
  const panggil = [];
  pasangKaitDunia({ terapkanPose: (mesh, pose, detik) => { panggil.push([pose, +detik.toFixed(3)]); mesh.rotation.x = 0.2; return 0.05; } });
  const m = buat();
  const sari = m.get('sari');
  m.setelPose('sari', 'bekerja');
  m.perintah('sari', { jenis: 'menuju', titik: { x: sari.x + 0.1, y: 0.2, z: sari.z }, lalu: 'bekerja' });
  m.update(1 / 60, 1, {}); // still walking
  assert.equal(panggil.length, 0, 'no pose while walking');
  for (let i = 1; i <= 30; i++) m.update(1 / 60, 1 + i / 60, {});
  assert.equal(sari.perilaku.keadaan, 'bekerja');
  assert.ok(panggil.length > 0 && panggil.every(([p]) => p === 'bekerja'));
  assert.ok(panggil[0][1] === 0, 'the pose clock starts on arrival');
  assert.ok(Math.abs(sari.mesh.position.y - 0.25) < 1e-9, `floor 0.2 + pose 0.05, got ${sari.mesh.position.y}`);
  assert.equal(sari.mesh.rotation.x, 0.2);

  m.setelPose('sari', null);
  m.update(1 / 60, 3, {});
  assert.notEqual(sari.mesh.rotation.x, 0.2, 'B takes the body back when the pose is cleared');
});
