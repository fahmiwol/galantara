// ═══════════════════════════════════════════════════════
// tools/fisika/langkah-pertama.mjs — collider BARU tidak terlihat pengendali
// karakter Rapier 0.20 sampai world.step(). Bukti untuk Fisika.segarkan().
// Jalankan: node tools/fisika/langkah-pertama.mjs
// ═══════════════════════════════════════════════════════
const R = (await import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href)).default;
await R.init();
function coba(label, siapkan) {
  const w = new R.World({ x: 0, y: -9.81, z: 0 });
  const badan = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.67, 0));
  const kapsul = w.createCollider(R.ColliderDesc.capsule(0.25, 0.4), badan);
  const kcc = w.createCharacterController(0.02);
  // dinding: permukaan di x = 1
  w.createCollider(R.ColliderDesc.cuboid(0.2, 2, 5).setTranslation(1.2, 1, 0));
  siapkan(w);
  kcc.computeColliderMovement(kapsul, { x: 2, y: 0, z: 0 });
  console.log(label.padEnd(44), 'gerak x =', kcc.computedMovement().x.toFixed(3));
}
coba('tanpa apa-apa', () => {});
coba('propagateModifiedBodyPositionsToColliders', (w) => w.propagateModifiedBodyPositionsToColliders?.());
coba('world.step() sekali', (w) => w.step());
console.log('updateSceneQueries ada?', typeof R.World.prototype.updateSceneQueries);
const metode = Object.getOwnPropertyNames(R.World.prototype).filter((m) => /query|broad|propagate|update/i.test(m));
console.log('metode terkait:', metode.join(', '));
