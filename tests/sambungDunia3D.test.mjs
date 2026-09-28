// ═══════════════════════════════════════════════════════
// tests/sambungDunia3D.test.mjs — B's hooks filled from stream C's modules. The fakes mirror
// the signatures in docs/aset/LOG-C.md §2; one test also loads C's real markas module.
// ═══════════════════════════════════════════════════════

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kaitDari3D, sambungDunia3D, ruteDariTitik } from '../src/party/sambungDunia3D.js';
import {
  lepasKaitDunia, ruteKerja, posisiMarkas, statusKe3D, statusTerlihat, pose3D, gulungan, gulunganDibaca, buangGulungan,
  pasangPenanda, lepasAgen, NAMA_KAIT,
} from '../src/party/kaitDunia.js';

afterEach(() => lepasKaitDunia());

const diam = async (fn) => { const a = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = a; } };

function markasPalsu() {
  const log = [];
  const meja = [0, 1, 2, 3].map((i) => ({ id: `meja_${i + 1}`, x: 10 + i, y: 0.2, z: -20, arah: 0, duduk: false }));
  return {
    log,
    LETAK_MARKAS: { x: -3, y: 0, z: -12.5, rotasiY: 0.227 },
    markasAktif: () => ({ letak: { x: -4, y: 0, z: -13 } }),
    titikKerja: () => meja,
    tampilkanStatus(npcId, status, opsi) {
      log.push(['status', npcId, status, opsi.mesh?.id ?? null]);
      if (status === 'gagal') return { npcId, status, slot: 0, pose: 'lesu', titik: { x: 3, y: 0.62, z: -9, arah: 0, duduk: true, dekat: { x: 3, y: 0.2, z: -8.5, arah: 0 } } };
      if (status === 'bekerja') return { npcId, status, slot: 1, pose: 'bekerja', titik: meja[1] };
      return { npcId, status, slot: null, pose: 'bebas', titik: null };
    },
    lepasAgenMarkas(npcId) { log.push(['lepas', npcId]); return true; },
    terlihatStatus: (npcId) => (npcId === 'sari' ? 'ikon' : null),
    tambahGulungan(h) { log.push(['gulungan', h.id]); return { ok: true }; },
    tandaiGulunganDibaca(h) { log.push(['dibaca', h.id]); },
    buangGulungan(h) { log.push(['buang', h.id]); },
  };
}

function agenPalsu({ kitGagal = false } = {}) {
  const log = [];
  return {
    log,
    pasangPenandaAgen(mesh) { log.push(['penanda', mesh.id]); },
    pasangKitKelas(mesh, kelas) { if (kitGagal) throw new Error('kelas agen tidak dikenal'); log.push(['kit', mesh.id, kelas]); },
    terapkanPose(mesh, pose, detik, opsi) { log.push(['pose', mesh.id, pose, detik, opsi.kurangiGerak]); return 0.1; },
  };
}

test('all of C wired: routes (seat via its approach point), mesh once, icons, poses, scrolls, leaving', () => {
  const markas = markasPalsu();
  const agen = agenPalsu();
  const { hilang } = sambungDunia3D({
    markas, agen,
    kelasDari: (id) => ({ sari: 'Penjejak Intelijen' })[id],
    meshDari: (id) => ({ id: `mesh-${id}` }),
    kurangiGerak: () => true,
  });
  assert.deepEqual(hilang, ['arahkanPanah'], 'only the ground arrow is not in C (PERMINTAAN B-P3)');

  assert.deepEqual(ruteKerja('sari'), [{ x: 10, y: 0.2, z: -20, arah: 0 }], 'before any status: the first desk');
  assert.deepEqual(statusKe3D('sari', 'bekerja'), { rute: [{ x: 11, y: 0.2, z: -20, arah: 0 }], pose: 'bekerja' });
  assert.deepEqual(statusKe3D('sari', 'gagal'), { rute: [{ x: 3, y: 0.2, z: -8.5, arah: 0 }, { x: 3, y: 0.62, z: -9, arah: 0 }], pose: 'lesu' });
  assert.deepEqual(statusKe3D('sari', 'siap'), { rute: null, pose: 'bebas' });
  assert.deepEqual(markas.log.filter((l) => l[0] === 'status').map((l) => l[3]), ['mesh-sari', null, null], 'the mesh goes to C once per agent');
  lepasAgen('sari');
  statusKe3D('sari', 'bekerja');
  assert.equal(markas.log.at(-1)[3], 'mesh-sari', 'recruited again: C gets the mesh again');

  assert.deepEqual(posisiMarkas(), { x: -4, z: -13 }, 'the mounted Markas, not the map default');
  assert.equal(statusTerlihat('sari'), true);
  assert.equal(statusTerlihat('budi'), false);
  assert.equal(pose3D({ id: 'm' }, 'bekerja', 1.5), 0.1);
  assert.deepEqual(agen.log.at(-1), ['pose', 'm', 'bekerja', 1.5, true], 'reduced motion is passed on');
  gulungan({ id: 'm_1' });
  gulunganDibaca({ id: 'm_1' });
  buangGulungan({ id: 'm_1' });
  assert.deepEqual(markas.log.filter((l) => ['gulungan', 'dibaca', 'buang'].includes(l[0])), [['gulungan', 'm_1'], ['dibaca', 'm_1'], ['buang', 'm_1']]);

  pasangPenanda('sari', { id: 'mesh-sari' });
  pasangPenanda('warga', { id: 'mesh-warga' });
  assert.deepEqual(agen.log.filter((l) => l[0] !== 'pose'), [['penanda', 'mesh-sari'], ['kit', 'mesh-sari', 'Penjejak Intelijen'], ['penanda', 'mesh-warga']],
    'no class known → ring only');
});

test('a class kit that throws keeps the ✦ ring (they are independent)', async () => {
  const agen = agenPalsu({ kitGagal: true });
  const { impl } = kaitDari3D({ agen, kelasDari: () => 'Penyihir' });
  await diam(() => impl.pasangPenandaAgen('sari', { id: 'm' }));
  assert.deepEqual(agen.log, [['penanda', 'm']]);
});

test('a missing C function leaves B\'s fallback and is named in `hilang`', () => {
  const { impl, hilang } = kaitDari3D({ markas: { tambahGulungan: () => {} } });
  assert.deepEqual(Object.keys(impl), ['tambahGulungan']);
  assert.deepEqual(hilang, NAMA_KAIT.filter((k) => k !== 'tambahGulungan'));
  const hanyaLetak = kaitDari3D({ markas: { LETAK_MARKAS: { x: -3, z: -12.5 } } });
  assert.deepEqual(Object.keys(hanyaLetak.impl), ['posisiMarkas'], 'the placement constant alone is enough for "Arahkan saya"');
  assert.equal(ruteDariTitik(null), null);
  assert.deepEqual(ruteDariTitik({ x: 1, z: 2, duduk: true, dekat: 'nama saja' }), [{ x: 1, z: 2, duduk: true, dekat: 'nama saja' }], 'an unresolved approach point is skipped');
});

test('C\'s real Markas module: its work points become walkable routes on the terrace', async () => {
  if (!globalThis.THREE) {
    // The world's own THREE r128 (vendor/), as tests/markas.test.mjs loads it.
    const modul = { exports: {} };
    new Function('module', 'exports', readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8'))(modul, modul.exports);
    globalThis.THREE = modul.exports;
  }
  const markas = await import('../src/world/markas/index.js');
  markas._resetKeadaanMarkas?.();
  const { impl } = kaitDari3D({ markas });
  const r = impl.tampilkanStatus3D('uji-sari', 'bekerja');
  assert.equal(r.pose, 'bekerja');
  assert.ok(r.rute?.length >= 1 && r.rute.every((t) => Number.isFinite(t.x) && Number.isFinite(t.z) && Number.isFinite(t.y)));
  assert.ok(r.rute.at(-1).y > 0, 'the desk stands on the terrace, above the ground');
  const g = impl.tampilkanStatus3D('uji-sari', 'gagal');
  if (g.rute.length === 2) assert.ok(g.rute[1].y > g.rute[0].y, 'seat above its approach point');
  impl.lepasAgen('uji-sari');
});
