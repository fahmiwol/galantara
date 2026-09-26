// ═══════════════════════════════════════════════════════
// tests/npcManager.test.mjs — NPC.js delegates movement to PerilakuNpc.
//
// THREE is stubbed with just what NPC.js calls (Group, Mesh, geometries, materials). Guarded:
// the mesh follows the behaviour, the dialog NPC stops, commands reach the right NPC, and a
// hidden hub (player in a Spot) offers no one to talk to.
// ═══════════════════════════════════════════════════════

import { test, before } from 'node:test';
import assert from 'node:assert/strict';

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
