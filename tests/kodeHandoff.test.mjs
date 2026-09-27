// tests/kodeHandoff.test.mjs — a one-time handoff code never stays in the address bar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buangKodeHandoff } from '../src/core/kodeHandoff.js';

const riwayat = () => ({ state: { a: 1 }, panggil: [], replaceState(s, j, u) { this.panggil.push([s, j, u]); } });

test('?mighan= is removed in place; the other parameters and the hash stay', () => {
  const r = riwayat();
  assert.equal(buangKodeHandoff({ href: 'http://localhost:4000/?spot=bogor&mighan=abc.def-123&x=1#peta' }, r), true);
  assert.deepEqual(r.panggil, [[{ a: 1 }, '', '/?spot=bogor&x=1#peta']]);
  const r2 = riwayat();
  buangKodeHandoff({ href: 'http://localhost:4000/dunia?mighan=kode' }, r2);
  assert.equal(r2.panggil[0][2], '/dunia', 'no dangling "?"');
});

test('no code: history is not touched', () => {
  const r = riwayat();
  assert.equal(buangKodeHandoff({ href: 'http://localhost:4000/?spot=bogor' }, r), false);
  assert.equal(r.panggil.length, 0);
  assert.equal(buangKodeHandoff(undefined, undefined), false);
});
