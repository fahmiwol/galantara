// ═══════════════════════════════════════════════════════
// tests/agen3dKit.test.mjs — class kit v1: cost, readability, distinctness, emblem
//
// Laporan 3D §6.4 gate, automated without a GPU:
//   silhouette — each class rendered orthographically, front and ¾, 32 px tall,
//                on the REAL NPC body (NPC.js): mask IoU ≤ 0,80 between classes,
//                ≤ 0,85 against the bare body;
//   colour     — class colours ΔE ≥ 20 in normal vision and three colour-vision
//                deficiencies (ADR-0011, Machado 2009);
//   cost       — the kit is 1 draw call per agent, geometry shared per class, one
//                material for every class, no shadow pass (§6.8); every item
//                ≥ 0,3 m (readable at 36 px); triangles within §6.4 targets.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const { NPCManager } = await import('../src/entities/NPC.js');
const A = await import('../src/world/agen/index.js');
const S = await import('../src/world/agen/siluet.js');
const { deltaEPenglihatan, PENGLIHATAN } = await import('../src/world/agen/warna.js');

const KELAS = ['penjejak', 'operator', 'pemandu'];
/** Triangle targets per class, laporan 3D §6.4 table ("kelas saja"). */
const TARGET_SEGITIGA = { penjejak: 350, operator: 250, pemandu: 300 };

function npc() {
  const g = new NPCManager(new THREE.Scene()).build().npcs[0].mesh;
  g.position.set(0, 0, 0);
  return g;
}

/** Meshes of one figure: the NPC body as built by NPC.js, plus a kit if given. */
function sosok(kelas) {
  const g = npc();
  if (kelas) A.pasangKitKelas(g, kelas);
  g.updateMatrixWorld(true);
  return g.children.filter((c) => c.isMesh);
}

test('kit: satu draw call per agen, geometri dipakai bersama per kelas, satu bahan untuk semua kelas, tanpa bayangan', () => {
  const bahan = new Set();
  for (const k of KELAS) {
    const a = npc(); const b = npc();
    const dasar = ukurPohon(a);
    const ka = A.pasangKitKelas(a, k);
    const kb = A.pasangKitKelas(b, k);
    const u = ukurPohon(a);
    assert.equal(u.drawCall - dasar.drawCall, 1, `${k}: kit ${u.drawCall - dasar.drawCall} draw call`);
    assert.ok(u.drawCall <= 4, `${k}: agen ${u.drawCall} draw call > 4 (badan NPC ${dasar.drawCall} + kit)`);
    assert.equal(u.kaster, dasar.kaster, `${k}: kit menambah pass bayangan`);
    assert.equal(ka.mesh.geometry, kb.mesh.geometry, `${k}: geometri dibuat ulang per agen`);
    bahan.add(ka.mesh.material); bahan.add(kb.mesh.material);
  }
  assert.equal(bahan.size, 1, 'kit memakai lebih dari satu bahan — tiap bahan = program/draw call tambahan');
});

test('kit: dipasang ulang mengganti, bukan menumpuk; lepas membersihkan; nama kelas lengkap diterima', () => {
  const g = npc();
  const dasar = ukurPohon(g).drawCall;
  A.pasangKitKelas(g, 'penjejak');
  const k2 = A.pasangKitKelas(g, 'Operator Lapangan');
  assert.equal(k2.kelas, 'operator');
  assert.equal(ukurPohon(g).drawCall, dasar + 1, 'kit lama tidak dilepas');
  k2.lepas();
  assert.equal(ukurPohon(g).drawCall, dasar);
  assert.equal(g.userData.kitKelas, undefined);
  assert.throws(() => A.pasangKitKelas(g, 'Juru Warta'), /kelas agen tidak dikenal: "Juru Warta".*Penjejak Intelijen, Operator Lapangan, Pemandu Ekspedisi/);
  assert.throws(() => A.pasangKitKelas(null, 'penjejak'), /Object3D/);
});

test('kit: setiap benda ≥ 0,3 m (terbaca di 36 px) dan segitiga dalam target per kelas', () => {
  for (const k of KELAS) {
    const benda = A.ukuranBenda(k);
    assert.ok(Object.keys(benda).length >= 2, `${k}: kurang dari dua slot bertanda`);
    // The emblem is the close-up identity (≥ 48 px), not a silhouette mark: exempt,
    // and guarded by its own test below.
    for (const [n, v] of Object.entries(benda)) {
      if (n === 'emblem') continue;
      assert.ok(v.terpanjang >= 0.3, `${k}/${n}: ${v.terpanjang.toFixed(2)} m < 0,3`);
    }
    assert.ok(Object.keys(benda).filter((n) => n !== 'emblem').length >= 2, `${k}: kurang dari dua benda siluet`);
    const tri = A.geometriKit(k).attributes.position.count / 3;
    assert.ok(tri <= TARGET_SEGITIGA[k], `${k}: ${tri} segitiga > ${TARGET_SEGITIGA[k]}`);
  }
  // Tongkat Pemandu lebih tinggi dari kepala (§6.4 "garis tegak").
  assert.ok(A.ukuranBenda('pemandu').tongkat.ukuran[1] >= 1.15 - 1e-6);
});

test('kit: siluet 32 px terbedakan — IoU ≤ 0,80 antar kelas, ≤ 0,85 terhadap badan dasar (depan dan ¾)', () => {
  const m = S.maskerBersama({ dasar: sosok(null), ...Object.fromEntries(KELAS.map((k) => [k, sosok(k)])) });
  const laporan = [];
  for (const [p, set] of Object.entries(m)) {
    assert.equal(set.dasar.tinggi, 32);
    for (const k of KELAS) {
      const v = S.iou(set[k], set.dasar);
      laporan.push(`${p} ${k}~dasar ${v.toFixed(3)}`);
      assert.ok(v <= 0.85, `${p}: ${k} terlalu mirip badan dasar (IoU ${v.toFixed(3)})\n${S.gambarMasker(set[k])}`);
    }
    for (let i = 0; i < KELAS.length; i++) {
      for (let j = i + 1; j < KELAS.length; j++) {
        const v = S.iou(set[KELAS[i]], set[KELAS[j]]);
        laporan.push(`${p} ${KELAS[i]}~${KELAS[j]} ${v.toFixed(3)}`);
        assert.ok(v <= 0.8, `${p}: ${KELAS[i]} dan ${KELAS[j]} tertukar di 32 px (IoU ${v.toFixed(3)})`);
      }
    }
  }
  assert.equal(laporan.length, 12);
});

test('rasteriser siluet jujur: sosok yang sama = IoU 1, badan tanpa kit ≠ badan berkit', () => {
  const m = S.maskerBersama({ a: sosok('operator'), b: sosok('operator'), c: sosok(null) });
  assert.equal(S.iou(m.depan.a, m.depan.b), 1);
  assert.ok(m.depan.a.luas > m.depan.c.luas + 40, 'caping tidak menambah siluet');
});

test('warna kelas: ΔE ≥ 20 antar kelas di penglihatan normal, deuteranopia, protanopia, tritanopia', () => {
  const w = Object.fromEntries(KELAS.map((k) => [k, A.KELAS[k].warnaKelas]));
  for (let i = 0; i < KELAS.length; i++) {
    for (let j = i + 1; j < KELAS.length; j++) {
      const d = deltaEPenglihatan(w[KELAS[i]], w[KELAS[j]]);
      for (const v of PENGLIHATAN) assert.ok(d[v] >= 20, `${KELAS[i]}~${KELAS[j]} ${v}: ΔE ${d[v].toFixed(1)}`);
    }
  }
  // Warna kelas memang ada di kit, pada bagian terbesarnya: diukur per LUAS
  // permukaan, bukan per verteks (tongkat 6 sisi punya banyak verteks, sedikit luas).
  for (const k of KELAS) {
    const g = A.geometriKit(k);
    const p = g.attributes.position; const c = g.attributes.color;
    const target = new THREE.Color(A.KELAS[k].warnaKelas);
    const va = new THREE.Vector3(); const vb = new THREE.Vector3(); const vc = new THREE.Vector3();
    let total = 0; let kelas = 0;
    for (let i = 0; i < p.count; i += 3) {
      va.fromBufferAttribute(p, i); vb.fromBufferAttribute(p, i + 1); vc.fromBufferAttribute(p, i + 2);
      const luas = vb.clone().sub(va).cross(vc.clone().sub(va)).length() / 2;
      total += luas;
      if (Math.abs(c.getX(i) - target.r) < 1e-6 && Math.abs(c.getY(i) - target.g) < 1e-6 && Math.abs(c.getZ(i) - target.b) < 1e-6) kelas += luas;
    }
    assert.ok(kelas / total >= 0.4, `${k}: warna kelas hanya ${(100 * kelas / total).toFixed(0)} % luas kit`);
  }
});

test('topi dan caping tidak ditembus kepala; berlaku juga untuk proporsi badan lain', () => {
  const RANGKA_AVATAR = { kepalaY: 0.85, kepalaR: 0.38, badanR: 0.45, badanSkalaY: 1.2 }; // Avatar.js
  for (const rangka of [A.RANGKA_NPC, RANGKA_AVATAR]) {
    for (const k of ['penjejak', 'operator']) {
      const geo = A.geometriKit(k, rangka);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      mesh.updateMatrixWorld(true);
      const pusat = new THREE.Vector3(0, rangka.kepalaY, 0);
      const ray = new THREE.Raycaster();
      // Sinar dari pusat kepala ke atas-samping (di atas garis topi): permukaan
      // topi pertama harus di LUAR bola kepala.
      for (let e = 55; e <= 90; e += 7) {
        for (let a = 7; a < 360; a += 30) {
          const el = (e * Math.PI) / 180; const az = (a * Math.PI) / 180;
          ray.set(pusat, new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)));
          const kena = ray.intersectObject(mesh, false);
          assert.ok(kena.length, `${k}: tidak ada topi di atas kepala (elevasi ${e}°, azimut ${a}°)`);
          assert.ok(kena[0].distance >= rangka.kepalaR - 0.005,
            `${k} (kepala r ${rangka.kepalaR}): kepala menembus topi di elevasi ${e}°, azimut ${a}° (${kena[0].distance.toFixed(3)} m)`);
        }
      }
    }
  }
  assert.notEqual(A.geometriKit('operator', RANGKA_AVATAR), A.geometriKit('operator'), 'geometri badan lain tertukar di cache');
});

test('emblem kelas v1: bentuk berbeda per kelas (lingkaran/persegi/segitiga), menghadap depan-atas, menempel di dada', () => {
  const bentuk = new Set(Object.values(A.KELAS).map((k) => k.emblem.bentuk));
  assert.deepEqual([...bentuk].sort(), ['lingkaran', 'persegi', 'segitiga']);
  const r = A.RANGKA_NPC;
  const alasEmblem = {};
  for (const k of KELAS) {
    const bagian = A.bagianKit(k).filter((b) => b.benda === 'emblem');
    assert.ok(bagian.length >= 2, `${k}: emblem tanpa glyph`);
    // Badge = first piece, in paper colour; glyph pieces are not all paper.
    assert.equal(bagian[0].warna, A.WARNA_KIT.kertas);
    assert.ok(bagian.slice(1).some((b) => b.warna === A.KELAS[k].warnaKelas), `${k}: glyph tidak memakai warna kelas`);
    let tri = 0;
    for (const b of bagian) {
      const p = b.geo.attributes.position; const n = b.geo.attributes.normal;
      tri += p.count / 3;
      for (let i = 0; i < p.count; i++) {
        // Outside the body ellipsoid, but hugging it (≤ 3 cm off).
        const x = p.getX(i) / r.badanR; const y = p.getY(i) / (r.badanR * r.badanSkalaY); const z = p.getZ(i) / r.badanR;
        const d = Math.hypot(x, y, z);
        assert.ok(d >= 1 && d <= 1 + 0.03 / r.badanR, `${k}: verteks emblem ${d < 1 ? 'tenggelam di badan' : 'melayang'} (${d.toFixed(3)})`);
        assert.ok(n.getZ(i) > 0.5 && n.getY(i) > 0.1, `${k}: emblem tidak menghadap depan-atas`);
      }
    }
    assert.ok(tri <= 30, `${k}: emblem ${tri} segitiga`);
    // The badge outline: its vertex count tells the shape apart (not the colour).
    alasEmblem[k] = new Set(Array.from({ length: bagian[0].geo.attributes.position.count }, (_, i) => bagian[0].geo.attributes.position.getX(i).toFixed(4) + ',' + bagian[0].geo.attributes.position.getY(i).toFixed(4))).size;
  }
  assert.deepEqual(alasEmblem, { penjejak: 10, operator: 4, pemandu: 3 });
});
