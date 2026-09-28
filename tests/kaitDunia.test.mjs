// ═══════════════════════════════════════════════════════
// tests/kaitDunia.test.mjs — B ↔ C hooks: no-op fallbacks until C's 3D code is installed.
// ═══════════════════════════════════════════════════════

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  kaitDunia, pasangKaitDunia, lepasKaitDunia, titikKerja, ruteKerja, posisiMarkas, statusKe3D, statusTerlihat, pose3D, panah,
  TITIK_KERJA_CADANGAN, MARKAS_CADANGAN,
} from '../src/party/kaitDunia.js';

afterEach(() => lepasKaitDunia());

test('without the 3D stream every hook is a harmless no-op with a usable fallback', () => {
  assert.deepEqual(titikKerja('sari'), { ...TITIK_KERJA_CADANGAN });
  assert.deepEqual(ruteKerja('sari'), [{ ...TITIK_KERJA_CADANGAN }]);
  assert.deepEqual(posisiMarkas(), { ...MARKAS_CADANGAN });
  assert.deepEqual(statusKe3D('sari', 'bekerja'), { rute: null, pose: null });
  assert.equal(statusTerlihat('sari'), false, 'no 3D icon: the toast is the only signal');
  assert.equal(pose3D({}, 'bekerja', 0), null, 'no pose implementation: B keeps its own body language');
  assert.equal(panah(null), undefined);
});

test('installed hooks are used; routes are cleaned; unknown keys and non-functions are ignored', () => {
  const panggil = [];
  pasangKaitDunia({
    titikKerjaMarkas: () => [{ x: 1, y: 0.2, z: 2, extra: 1 }, { x: 1, z: 3, arah: 0.5 }, { x: NaN, z: 0 }],
    tampilkanStatus3D: (id, st) => { panggil.push([id, st]); return { rute: { x: 4, z: 5 }, pose: 'lapor' }; },
    terlihatStatus: () => 'ikon',
    terapkanPose: () => 0.14,
    bukanKait: () => 'x',
    tambahGulungan: 'bukan fungsi',
  });
  assert.deepEqual(ruteKerja('sari'), [{ x: 1, y: 0.2, z: 2 }, { x: 1, z: 3, arah: 0.5 }]);
  assert.deepEqual(titikKerja('sari'), { x: 1, z: 3, arah: 0.5 });
  assert.deepEqual(statusKe3D('sari', 'hasil_siap'), { rute: [{ x: 4, z: 5 }], pose: 'lapor' });
  assert.deepEqual(panggil, [['sari', 'hasil_siap']]);
  assert.equal(statusTerlihat('sari'), true);
  assert.equal(pose3D({}, 'lapor', 0.1), 0.14);
  assert.equal('bukanKait' in kaitDunia, false);
  assert.equal(typeof kaitDunia.tambahGulungan, 'function');
});

test('a broken or half-finished 3D hook never breaks the mission flow', () => {
  pasangKaitDunia({
    titikKerjaMarkas: () => { throw new Error('mesh belum siap'); },
    posisiMarkas: () => ({ x: NaN, z: 0 }),
    tampilkanStatus3D: () => { throw new Error('rusak'); },
    terapkanPose: () => NaN,
  });
  const asli = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(titikKerja('sari'), { ...TITIK_KERJA_CADANGAN });
    assert.deepEqual(posisiMarkas(), { ...MARKAS_CADANGAN });
    assert.deepEqual(statusKe3D('sari', 'bekerja'), { rute: null, pose: null });
    assert.equal(pose3D({}, 'x', 0), null);
  } finally {
    console.warn = asli;
  }
});
