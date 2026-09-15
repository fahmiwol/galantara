// ═══════════════════════════════════════════════════════
// tools/fisika/ukur-tembus-dinding.mjs — seberapa dalam kapsul menembus
// dinding SESAAT saat menyentuh tanah dan dinding bersamaan, per varian
// pengendali — dan apakah varian itu mengembalikan langkah tersendat.
//
// Kenapa ada: agen Spot Malioboro (15 Sep 2026) mengukur tembus sesaat sampai
// 9,09 cm (±1,5 juta langkah) dengan pengendali Galantara. Sebelum diterima
// sebagai sifat mesin, varian yang masuk akal diukur dengan DUA metrik,
// karena perbaikan untuk yang satu bisa merusak yang lain.
//
// Jalankan: node --experimental-default-type=module tools/fisika/ukur-tembus-dinding.mjs
// ═══════════════════════════════════════════════════════
const R = (await import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href)).default;
await R.init();

const L = 11, P = 34, JARI = 0.4, OFFSET = 0.02;
const BATAS_X = L / 2 - JARI, BATAS_Z = P / 2 - JARI;

const VARIAN = {
  'sekarang (tanpa gravitasi saat menapak)': { nudge: null, dorong: 0 },
  'nudge 1e-3': { nudge: 1e-3, dorong: 0 },
  'nudge 5e-3': { nudge: 5e-3, dorong: 0 },
  'nudge 1e-2': { nudge: 1e-2, dorong: 0 },
  'nudge 2e-2': { nudge: 2e-2, dorong: 0 },
  'dorong 0,5 mm saat menapak': { nudge: null, dorong: 0.0005 },
  'dorong 0,5 mm + nudge 1e-3': { nudge: 1e-3, dorong: 0.0005 },
};

function dunia() {
  const w = new R.World({ x: 0, y: -9.81, z: 0 });
  w.createCollider(R.ColliderDesc.cuboid(L / 2, 0.45, P / 2).setTranslation(0, -0.45, 0));
  const t = 0.3;
  for (const [hx, hy, hz, x, z] of [
    [L / 2 + 2 * t, 1.5, t, 0, P / 2 + t], [L / 2 + 2 * t, 1.5, t, 0, -(P / 2 + t)],
    [t, 1.5, P / 2, L / 2 + t, 0], [t, 1.5, P / 2, -(L / 2 + t), 0],
  ]) w.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, 1.5, z));
  w.step();
  return w;
}

// UKUR_AWAL=acak → 6 titik awal lain (uji ketahanan: hasil satu set lintasan
// bisa kebetulan). UKUR_NUDGE=3e-3,5e-3 → hanya varian nudge itu.
const AWAL = process.env.UKUR_AWAL === 'acak'
  ? [[1.9, -4.7], [-2.3, 6.1], [0.8, 11.3], [-3.6, -9.8], [2.7, 2.2], [-0.4, -13.1]]
  : [[0, 0], [0.37, 1.13], [-0.61, -2.29]];
const hanyaNudge = process.env.UKUR_NUDGE?.split(',').map(Number);
const daftarVarian = hanyaNudge
  ? Object.fromEntries(hanyaNudge.map((n) => [`nudge ${n}`, { nudge: n || null, dorong: 0 }]))
  : VARIAN;

for (const [nama, v] of Object.entries(daftarVarian)) {
  const w = dunia();
  const kcc = w.createCharacterController(OFFSET);
  kcc.enableAutostep(0.35, 0.2, true);
  kcc.enableSnapToGround(0.35);
  kcc.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
  kcc.setMinSlopeSlideAngle((35 * Math.PI) / 180);
  if (v.nudge != null) kcc.setNormalNudgeFactor(v.nudge);
  const badan = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.65 + OFFSET, 0));
  const col = w.createCollider(R.ColliderDesc.capsule(0.25, JARI), badan);
  w.step();

  let maks = 0, lebih2cm = 0, total = 0, tersendat = 0, lurus = 0;
  const dt = 1 / 60;
  const langkah = (arah) => {
    const menapak = kcc.computedGrounded();
    let vY = langkah.vY ?? 0;
    let gy;
    if (menapak && vY <= 0) { vY = 0; gy = -v.dorong; } else { vY -= 18 * dt; gy = vY * dt; }
    langkah.vY = vY;
    kcc.computeColliderMovement(col, { x: arah[0] * 5.4 * dt, y: gy, z: arah[1] * 5.4 * dt });
    const g = kcc.computedMovement();
    const t = badan.translation();
    badan.setNextKinematicTranslation({ x: t.x + g.x, y: t.y + g.y, z: t.z + g.z });
    w.step();
    return g;
  };
  const tele = (x, z) => { const p = { x, y: 0.65 + OFFSET, z }; badan.setTranslation(p, true); badan.setNextKinematicTranslation(p); langkah.vY = 0; };

  // 1) Tembus dinding: 192 lintasan miring ke dinding, 600 langkah masing-masing.
  for (const [ax, az] of AWAL) {
    for (let i = 0; i < 64; i++) {
      const sudut = 0.05 + (i / 64) * (Math.PI / 2 - 0.1);
      const arah = [(i % 2 ? 1 : -1) * Math.sin(sudut), Math.cos(sudut) * (i % 4 < 2 ? 1 : -1)];
      tele(ax, az);
      for (let n = 0; n < 600; n++) {
        langkah(arah);
        const p = badan.translation();
        const lebih = Math.max(Math.abs(p.x) - BATAS_X, Math.abs(p.z) - BATAS_Z);
        if (lebih > 0.02) lebih2cm++;
        maks = Math.max(maks, lebih); total++;
      }
    }
  }
  // 2) Tersendat: jalan lurus di tengah, 400 langkah bolak-balik.
  tele(0, -12);
  for (let n = 0; n < 400; n++) {
    const g = langkah([0, 1]);
    const p = badan.translation();
    if (Math.abs(p.z) < BATAS_Z - 1) { lurus++; if (g.z < 0.08) tersendat++; }
  }
  // 3) Getar: diam 2 detik di tengah dan menempel dinding; rentang y dan xz.
  const getar = (x, z, dorongArah) => {
    tele(x, z);
    for (let n = 0; n < 60; n++) langkah(dorongArah);
    const ys = [], xs = [];
    for (let n = 0; n < 120; n++) { langkah([0, 0]); const p = badan.translation(); ys.push(p.y); xs.push(p.x); }
    return [Math.max(...ys) - Math.min(...ys), Math.max(...xs) - Math.min(...xs)];
  };
  const [gyTengah] = getar(0, 0, [0, 0]);
  const [gyDinding, gxDinding] = getar(4.5, 0, [1, 0]);
  console.log(`${nama.padEnd(40)} tembus maks ${(maks * 100).toFixed(2).padStart(5)} cm · >2 cm ${String(lebih2cm).padStart(5)}/${total} · tersendat ${tersendat}/${lurus} · getar y ${(gyTengah * 1000).toFixed(2)} mm, di dinding y ${(gyDinding * 1000).toFixed(2)} x ${(gxDinding * 1000).toFixed(2)} mm`);
}
