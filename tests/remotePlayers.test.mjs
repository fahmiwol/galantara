import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { RemotePlayers } from '../src/multiplayer/RemotePlayers.js';

// Three.js sungguhan, bukan tiruan: matematika proyeksi dan daur hidup
// resource-nya yang justru sedang diuji.
//
// Modulnya hanya ada di galantara-server/node_modules — root repo memang tidak
// punya dependency. Di clone baru, import langsung akan mematikan SELURUH
// suite dengan MODULE_NOT_FOUND yang tidak menuntun apa-apa. Jadi kegagalannya
// diubah jadi pesan yang memberi tahu perintah yang harus dijalankan.
const require = createRequire(import.meta.url);
let THREE = null;
try {
  THREE = require('../galantara-server/node_modules/three');
} catch {
  test('remotePlayers: three.js belum terpasang', { skip: 'jalankan `npm run install:server` dulu — three ada di galantara-server/node_modules' }, () => {});
}
globalThis.THREE = THREE;
globalThis.window = { innerWidth: 1280, innerHeight: 720 };
const layer = { clientWidth: 800, clientHeight: 600, appendChild() {} };
globalThis.document = {
  getElementById: () => layer,
  createElement: () => ({ style: { cssText: '' }, remove() { this.removed = true; } }),
};
function setup() {
  const camera = new THREE.PerspectiveCamera(45, 800/600, 1, 100);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const players = new RemotePlayers(new THREE.Scene());
  players.add({ socketId: 'one', name: 'Warga', x: 0, z: -10 });
  return { players, camera, p: players._players.one };
}

test(THREE ? 'remote labels reuse a vector and project using the overlay viewport' : 'dilewati', { skip: !THREE }, () => {
  const { players, camera, p } = setup();
  p.mesh.position.clone = () => { throw new Error('per-frame Vector3 clone'); };
  for (let i=0;i<120;i++) players.update(camera);
  assert.equal(p.nameEl.style.left, '400px');
  assert.equal(p.nameEl.style.display, '');
});

test(THREE ? 'remote label hides beyond near/far plane and outside viewport, then recovers' : 'dilewati', { skip: !THREE }, () => {
  const { players, camera, p } = setup();
  for (const [x,z] of [[0,-.5],[0,10],[0,-101],[100,-10]]) {
    p.mesh.position.set(x,0,z); p.targetX=x; p.targetZ=z;
    players.update(camera);
    assert.equal(p.nameEl.style.display, 'none', `x=${x}, z=${z}`);
  }
  p.mesh.position.set(0,0,-10); p.targetX=0; p.targetZ=-10;
  players.update(camera); assert.equal(p.nameEl.style.display, '');
});

test(THREE ? 'each remote resource is disposed once and its label removed on repeated remove' : 'dilewati', { skip: !THREE }, () => {
  const { players, p } = setup();
  let geometries=0, materials=0;
  for (const mesh of p.bagian) {
    mesh.geometry.addEventListener('dispose', () => geometries++);
    mesh.material.addEventListener('dispose', () => materials++);
  }
  players.remove({socketId:'one'}); players.remove({socketId:'one'});
  assert.equal(geometries,3); assert.equal(materials,3);
  assert.equal(p.nameEl.removed,true); assert.equal(players.count,0);
  assert.equal(players.scene.children.length,0);
});
