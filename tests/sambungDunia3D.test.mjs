// ═══════════════════════════════════════════════════════
// tests/sambungDunia3D.test.mjs — B's hooks filled from stream C's module shapes
// (src/world/markas/index.js, src/world/agen/index.js on claude/m1-dunia-3d), every function
// feature-checked. The fakes mirror C's exported signatures, not its internals.
// ═══════════════════════════════════════════════════════

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { kaitDari3D, sambungDunia3D, KEBUTUHAN } from '../src/party/sambungDunia3D.js';
import {
  lepasKaitDunia, titikKerja, posisiMarkas, statusKe3D, gulungan, pasangPenanda, TITIK_KERJA_CADANGAN, MARKAS_CADANGAN,
} from '../src/party/kaitDunia.js';

afterEach(() => lepasKaitDunia());

const diam = async (fn) => { const a = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = a; } };

/** C-shaped Markas: desks per slot, seats with an approach point, scrolls, the mounted Markas. */
function markasPalsu() {
  const log = [];
  const meja = [0, 1, 2, 3].map((i) => ({ id: `meja_${i + 1}`, x: 10 + i, y: 0.2, z: -20, arah: 1.5, duduk: true, dekat: `dekat_${i + 1}` }));
  let slot = 0;
  return {
    log,
    LETAK_MARKAS: { x: -3, y: 0, z: -12.5, rotasiY: 0.227 },
    markasAktif: () => ({ letak: { x: -4, y: 0, z: -13 } }),
    titikMarkas: (nama) => ({ id: nama, x: 10 + Number(nama.slice(-1)) - 1, y: 0, z: -18.5, arah: 3 }),
    titikKerja: () => meja,
    tampilkanStatus3D(npcId, status) {
      log.push(['status', npcId, status]);
      if (status !== 'antre' && status !== 'bekerja') return { npcId, status, slot: null, pose: 'bebas', titik: null };
      const i = slot++;
      return { npcId, status, slot: i, pose: 'bekerja', titik: { ...meja[i], dekat: { id: `dekat_${i + 1}`, x: 10 + i, y: 0, z: -18.5, arah: 3 } } };
    },
    tambahGulungan(hasil) { log.push(['gulungan', hasil.id]); return { ok: true }; },
  };
}

function agenPalsu({ kitGagal = false } = {}) {
  const log = [];
  return {
    log,
    pasangPenandaAgen(mesh) { log.push(['penanda', mesh.id]); },
    pasangKitKelas(mesh, kelas) { if (kitGagal) throw new Error('kelas agen tidak dikenal'); log.push(['kit', mesh.id, kelas]); },
  };
}

test('with all of C: desk from the status call (approach point of the seat), scrolls, marker + class kit', async () => {
  const markas = markasPalsu();
  const agen = agenPalsu();
  const r = await sambungDunia3D({ muat: async (n) => ({ markas, agen })[n], kelasDari: (id) => ({ sari: 'Penjejak Intelijen' })[id] });
  assert.deepEqual(r, { markas: true, agen: true, hilang: ['arahkanPanah'] });

  // Before any status: the first desk (approach point), never the blind fallback.
  assert.deepEqual(titikKerja('sari'), { x: 10, z: -18.5, arah: 3 });
  statusKe3D('budi', 'antre'); // takes desk 1
  statusKe3D('sari', 'antre'); // takes desk 2
  assert.deepEqual(titikKerja('sari'), { x: 11, z: -18.5, arah: 3 }, 'the desk C assigned to THIS agent');
  statusKe3D('sari', 'siap');
  assert.deepEqual(titikKerja('sari'), { x: 10, z: -18.5, arah: 3 }, 'a finished agent forgets its desk');

  assert.deepEqual(posisiMarkas(), { x: -4, z: -13 }, 'the mounted Markas, not the map default');
  gulungan({ id: 'm_1' });
  pasangPenanda('sari', { id: 'mesh-sari' });
  pasangPenanda('warga', { id: 'mesh-warga' });
  assert.deepEqual(markas.log.filter((l) => l[0] === 'gulungan'), [['gulungan', 'm_1']]);
  assert.deepEqual(agen.log, [['penanda', 'mesh-sari'], ['kit', 'mesh-sari', 'Penjejak Intelijen'], ['penanda', 'mesh-warga']],
    'no class known → ring only');
});

test('a class kit that throws keeps the ✦ ring (they are independent)', async () => {
  const agen = agenPalsu({ kitGagal: true });
  const { impl } = kaitDari3D({ agen, kelasDari: () => 'Penyihir' });
  await diam(() => impl.pasangPenandaAgen('sari', { id: 'm' }));
  assert.deepEqual(agen.log, [['penanda', 'm']]);
});

test('any missing C function leaves B\'s fallback and is named in `hilang`', async () => {
  const r = await diam(() => sambungDunia3D({ muat: async (n) => { if (n === 'agen') throw new Error('404'); return { tambahGulungan: () => {} }; } }));
  assert.equal(r.markas, true);
  assert.equal(r.agen, false, 'one module failing does not drop the other');
  assert.deepEqual(r.hilang.sort(), Object.keys(KEBUTUHAN).filter((k) => k !== 'tambahGulungan').sort());
  assert.deepEqual(titikKerja('sari'), { ...TITIK_KERJA_CADANGAN });
  assert.deepEqual(posisiMarkas(), { ...MARKAS_CADANGAN });

  const kosong = kaitDari3D({ markas: { LETAK_MARKAS: { x: -3, z: -12.5 } } });
  assert.deepEqual(Object.keys(kosong.impl), ['posisiMarkas'], 'the placement constant alone is enough for "Arahkan saya"');
});
