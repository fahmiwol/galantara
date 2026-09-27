// ═══════════════════════════════════════════════════════
// tests/pendampingLod.test.mjs — LOD1 (~50 triangles) keeps the class readable
//
// SPRINT-02 C butir 3 (laporan 3D §6.3/§6.8: LOD1 at 20–48 px, ≤ 250 triangles;
// laporan Game §6b: "± 50 segitiga"). A cheaper figure is only worth it if the
// class still reads, so the gate is the same silhouette test as kit v0/v1, at the
// size LOD1 is drawn (32 px, inside 20–48):
//   - LOD1 of class k looks like LOD0 of class k      IoU ≥ 0,80 (front and ¾)
//   - LOD1 classes stay apart                          IoU ≤ 0,80 between classes (the LOD0 gate)
//   - LOD1 with a kit ≠ LOD1 bare body                 IoU ≤ 0,85
//   - visible triangles per class ≤ 60 (measured 49–60), submitted (all classes' marks) ≤ 100
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

if (!globalThis.THREE) {
  const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
  const modul = { exports: {} };
  new Function('module', 'exports', sumber)(modul, modul.exports);
  globalThis.THREE = modul.exports;
}

const S = await import('../src/world/agen/siluet.js');
const P = await import('../src/world/pendamping/index.js');

const KELAS = ['penjejak', 'operator', 'pemandu'];
/** Bare LOD1 body: the figure with a class id nobody has, so every kit vertex hides. */
const polos = () => {
  const m = P.meshTerlihat('jauh', 'penjejak');
  const g = P.geometriSosok('jauh');
  const kv = g.getAttribute('kelasVerteks'); const pos = g.getAttribute('position');
  const simpan = [];
  for (let t = 0; t < pos.count; t += 3) if (kv.getX(t) < 0) for (let i = 0; i < 9; i++) simpan.push(pos.array[t * 3 + i]);
  m.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(simpan, 3));
  return m;
};

test('LOD1: segitiga terlihat ≤ 60 per kelas (± 50), terkirim ≤ 100', () => {
  const kirim = P.geometriSosok('jauh').attributes.position.count / 3;
  assert.ok(kirim <= 100, `${kirim} segitiga dikirim per pendamping jauh`);
  for (const k of KELAS) {
    const t = P.meshTerlihat('jauh', k).geometry.attributes.position.count / 3;
    assert.ok(t <= 60, `${k}: ${t} segitiga terlihat`);
    assert.ok(t >= 30, `${k}: ${t} segitiga — terlalu sedikit, tanda kelas hilang?`);
  }
});

test('LOD1 menyerupai LOD0 kelasnya di 32 px: IoU ≥ 0,80 (depan dan ¾)', () => {
  for (const k of KELAS) {
    const m = S.maskerBersama({ dekat: [P.meshTerlihat('dekat', k)], jauh: [P.meshTerlihat('jauh', k)] });
    for (const p of ['depan', 'tigaperempat']) {
      const v = S.iou(m[p].dekat, m[p].jauh);
      assert.ok(v >= 0.8, `${k} ${p}: LOD1 ≠ LOD0 (IoU ${v.toFixed(3)})\n${S.gambarMasker(m[p].jauh)}\n\n${S.gambarMasker(m[p].dekat)}`);
    }
  }
});

test('LOD1: kelas tetap terbedakan — IoU ≤ 0,80 antar kelas, ≤ 0,85 terhadap badan polos', () => {
  const m = S.maskerBersama({ polos: [polos()], ...Object.fromEntries(KELAS.map((k) => [k, [P.meshTerlihat('jauh', k)]])) });
  for (const [p, set] of Object.entries(m)) {
    for (const k of KELAS) {
      const v = S.iou(set[k], set.polos);
      assert.ok(v <= 0.85, `${p}: ${k} LOD1 ≈ badan polos (IoU ${v.toFixed(3)})`);
    }
    for (let i = 0; i < KELAS.length; i++) {
      for (let j = i + 1; j < KELAS.length; j++) {
        const v = S.iou(set[KELAS[i]], set[KELAS[j]]);
        assert.ok(v <= 0.8, `${p}: ${KELAS[i]}~${KELAS[j]} LOD1 tertukar (IoU ${v.toFixed(3)})`);
      }
    }
  }
});

test('LOD1 hanya memuat tanda siluet (kepala/punggung/tangan), tanpa emblem', async () => {
  const { bagianKitJauh } = await import('../src/world/agen/index.js');
  const benda = Object.fromEntries(KELAS.map((k) => [k, [...new Set(bagianKitJauh(k).map((b) => b.benda))].sort()]));
  assert.deepEqual(benda, { penjejak: ['kaca_pembesar', 'topi'], operator: ['caping', 'papan_klip'], pemandu: ['ransel', 'tongkat'] });
});

test('LOD1: kepala segilima tidak menembus topi/caping (sinar dari pusat kepala)', async () => {
  const { bagianKitJauh, RANGKA_NPC } = await import('../src/world/agen/index.js');
  const g = P.geometriSosok('jauh');
  const kv = g.getAttribute('kelasVerteks'); const tv = g.getAttribute('tintVerteks'); const pos = g.getAttribute('position');
  const kepala = [];
  for (let t = 0; t < pos.count; t += 3) if (kv.getX(t) < 0 && tv.getX(t) === 0) for (let i = 0; i < 9; i++) kepala.push(pos.array[t * 3 + i]);
  const bahan = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mKepala = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(kepala, 3)), bahan);
  const pusat = new THREE.Vector3(0, RANGKA_NPC.kepalaY, 0);
  const ray = new THREE.Raycaster();
  for (const k of ['penjejak', 'operator']) {
    const topi = bagianKitJauh(k).filter((b) => b.benda === 'topi' || b.benda === 'caping').map((b) => new THREE.Mesh(b.geo, bahan));
    for (const m of [mKepala, ...topi]) m.updateMatrixWorld(true);
    // ≤ 86°: the caping is open at its 2 cm apex (as in LOD0, where a knob covers it).
    for (let e = 50; e <= 86; e += 6) {
      for (let a = 5; a < 360; a += 12) { // off the seams: a ray exactly on an edge can slip between two triangles
        const el = (e * Math.PI) / 180; const az = (a * Math.PI) / 180;
        ray.set(pusat, new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)));
        const h = ray.intersectObject(mKepala)[0];
        const t = ray.intersectObjects(topi)[0];
        assert.ok(h && t, `${k}: sinar ${e}°/${a}° tidak mengenai ${h ? "topi" : "kepala"}`);
        assert.ok(t.distance >= h.distance - 1e-4, `${k}: kepala menembus di ${e}°/${a}° (topi ${t.distance.toFixed(3)} < kepala ${h.distance.toFixed(3)})`);
      }
    }
  }
});
