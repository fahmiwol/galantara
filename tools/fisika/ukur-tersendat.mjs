// ═══════════════════════════════════════════════════════
// tools/fisika/ukur-tersendat.mjs — berapa langkah pengendali karakter
// bergerak NOL saat berjalan lurus di lantai datar, per varian.
//
// Bukti untuk docs/adr/0015 keputusan 5 ("tanpa gravitasi saat menapak").
// Hasil 15 Sep 2026: gravitasi selalu (pola Rupa3D) 12/596 tersendat;
// tanpa gravitasi saat menapak 0/596. Jalankan: node tools/fisika/ukur-tersendat.mjs
// ═══════════════════════════════════════════════════════
const R = (await import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href)).default;
await R.init();

const VARIAN = {
  'asli (gravitasi selalu)':        { nudge: null, gravitasiSaatMenapak: true },
  'nudge 1e-3':                    { nudge: 1e-3, gravitasiSaatMenapak: true },
  'nudge 1e-2':                    { nudge: 1e-2, gravitasiSaatMenapak: true },
  'tanpa gravitasi saat menapak':  { nudge: null, gravitasiSaatMenapak: false },
  'tanpa grav + nudge 1e-3':       { nudge: 1e-3, gravitasiSaatMenapak: false },
  'offset 0.05':                   { nudge: null, gravitasiSaatMenapak: true, offset: 0.05 },
};

function dunia(dgnTangga) {
  const w = new R.World({ x: 0, y: -9.81, z: 0 });
  w.createCollider(R.ColliderDesc.cuboid(60, 0.5, 60).setTranslation(0, -0.5, 0));
  if (dgnTangga) w.createCollider(R.ColliderDesc.cuboid(2, 0.1, 2).setTranslation(4, 0.1, 0)); // anak tangga 0,2 di x∈[2,6]
  w.step();
  return w;
}

function jalankan(v, { dgnTangga = false, langkah = 600, awalX = -25 } = {}) {
  const w = dunia(dgnTangga);
  const offset = v.offset ?? 0.02;
  const kcc = w.createCharacterController(offset);
  kcc.enableAutostep(0.35, 0.2, true);
  kcc.enableSnapToGround(0.35);
  kcc.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
  kcc.setMinSlopeSlideAngle((35 * Math.PI) / 180);
  if (v.nudge != null) kcc.setNormalNudgeFactor(v.nudge);
  const badan = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(awalX, 0.65 + offset, 0));
  const col = w.createCollider(R.ColliderDesc.capsule(0.25, 0.4), badan);
  w.step();
  let vY = 0; let tersendat = 0; let yMaks = -1; let yDiTangga = null; let yMin = 9;
  const dt = 1 / 60;
  for (let i = 0; i < langkah; i++) {
    const menapak = kcc.computedGrounded();
    if (menapak && vY < 0) vY = 0;
    let gy;
    if (menapak && !v.gravitasiSaatMenapak) { vY = 0; gy = 0; } else { vY -= 18 * dt; gy = vY * dt; }
    kcc.computeColliderMovement(col, { x: 5.4 * dt, y: gy, z: 0 });
    const g = kcc.computedMovement();
    const t = badan.translation();
    badan.setNextKinematicTranslation({ x: t.x + g.x, y: t.y + g.y, z: t.z + g.z });
    w.step();
    if (i > 3 && g.x < 0.08) tersendat++;
    const kakiY = badan.translation().y - 0.65 - offset;
    const x = badan.translation().x;
    if (dgnTangga && x > 3 && x < 5) yDiTangga = kakiY;
    if (dgnTangga && x > 7 && x < 9) yMin = Math.min(yMin, kakiY);
    yMaks = Math.max(yMaks, kakiY);
  }
  return { tersendat, yDiTangga, ySetelahTurun: yMin, x: badan.translation().x };
}

for (const [nama, v] of Object.entries(VARIAN)) {
  const datar = jalankan(v);
  const tangga = jalankan(v, { dgnTangga: true, langkah: 180, awalX: 0 });
  console.log(nama.padEnd(32), '| tersendat', String(datar.tersendat).padStart(3), 'dari 596',
    '| jarak', (datar.x + 25).toFixed(2), 'harapan', (600 * 0.09).toFixed(2),
    '| y di tangga', tangga.yDiTangga?.toFixed(3), '| y setelah turun', tangga.ySetelahTurun.toFixed(3));
}
