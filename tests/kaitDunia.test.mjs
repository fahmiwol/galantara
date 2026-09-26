// ═══════════════════════════════════════════════════════
// tests/kaitDunia.test.mjs — B ↔ C hooks: no-op until C's 3D code is wired in.
// ═══════════════════════════════════════════════════════

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  kaitDunia, pasangKaitDunia, lepasKaitDunia, titikKerja, posisiMarkas, statusKe3D, panah,
  TITIK_KERJA_CADANGAN, MARKAS_CADANGAN,
} from '../src/party/kaitDunia.js';

afterEach(() => lepasKaitDunia());

test('without the 3D stream every hook is a harmless no-op with a usable fallback', () => {
  assert.deepEqual(titikKerja('sari'), { ...TITIK_KERJA_CADANGAN });
  assert.deepEqual(posisiMarkas(), { ...MARKAS_CADANGAN });
  assert.equal(statusKe3D('sari', 'bekerja'), undefined);
  assert.equal(panah(null), undefined);
});

test('installed hooks are used; unknown keys and non-functions are ignored', () => {
  const panggil = [];
  pasangKaitDunia({
    titikKerjaMarkas: (id) => ({ x: 1, z: 2, arah: 0.5, id }),
    tampilkanStatus3D: (id, st) => panggil.push([id, st]),
    bukanKait: () => 'x',
    tambahGulungan: 'bukan fungsi',
  });
  assert.deepEqual(titikKerja('sari'), { x: 1, z: 2, arah: 0.5 });
  statusKe3D('sari', 'hasil_siap');
  assert.deepEqual(panggil, [['sari', 'hasil_siap']]);
  assert.equal('bukanKait' in kaitDunia, false);
  assert.equal(typeof kaitDunia.tambahGulungan, 'function');
});

test('a broken or half-finished 3D hook never breaks the mission flow', () => {
  pasangKaitDunia({
    titikKerjaMarkas: () => { throw new Error('mesh belum siap'); },
    posisiMarkas: () => ({ x: NaN, z: 0 }),
  });
  const asli = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(titikKerja('sari'), { ...TITIK_KERJA_CADANGAN });
    assert.deepEqual(posisiMarkas(), { ...MARKAS_CADANGAN });
  } finally {
    console.warn = asli;
  }
});
