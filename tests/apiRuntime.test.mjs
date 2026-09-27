// ═══════════════════════════════════════════════════════
// tests/apiRuntime.test.mjs — the world's door to the runtime.
//
// Guarded: cookies ride along (credentials:'include'), writes carry x-galantara-world, and
// every failure (runtime error, network down, timeout, no /rt proxy) becomes a GalatRuntime
// with a `kode` the UI can turn into a card and an Indonesian message that says what to do.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buatApiRuntime, GalatRuntime, PESAN_TRANSPORT, segmen, kodeDariStatus } from '../src/party/apiRuntime.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';

test('reads send the session cookie and no write header; writes send JSON and x-galantara-world', async () => {
  const rt = buatRuntimePalsu({ masuk: 'usr-a' });
  const api = buatApiRuntime({ fetch: rt.fetch });
  await api.get('/saya');
  await api.post('/agen/rekrut', { template_id: 'sari' });
  const [baca, tulis] = rt.panggilan;
  assert.equal(baca.url, '/rt/api/saya');
  assert.equal(baca.credentials, 'include');
  assert.equal(baca.headers['x-galantara-world'], undefined);
  assert.equal(tulis.url, '/rt/api/agen/rekrut');
  assert.equal(tulis.credentials, 'include');
  assert.equal(tulis.headers['x-galantara-world'], '1');
  assert.equal(tulis.headers['content-type'], 'application/json');
  assert.deepEqual(tulis.isi, { template_id: 'sari' });
});

test('a runtime error keeps its kode and Indonesian message', async () => {
  const rt = buatRuntimePalsu();
  const api = buatApiRuntime({ fetch: rt.fetch });
  const err = await api.get('/saya').catch((e) => e);
  assert.ok(err instanceof GalatRuntime);
  assert.equal(err.kode, 'BELUM_MASUK');
  assert.equal(err.status, 401);
  assert.match(err.pesan, /belum masuk/);
});

test('network down, timeout, and a missing /rt proxy each get an actionable message', async () => {
  const rt = buatRuntimePalsu({ masuk: 'usr-a' });
  const api = buatApiRuntime({ fetch: rt.fetch, batasWaktuMs: 30 });

  rt.jaringan = 'mati';
  let err = await api.get('/saya').catch((e) => e);
  assert.equal(err.kode, 'JARINGAN');
  assert.equal(err.pesan, PESAN_TRANSPORT.JARINGAN);

  rt.jaringan = 'diam';
  const t0 = Date.now();
  err = await api.get('/saya').catch((e) => e);
  assert.equal(err.kode, 'WAKTU_HABIS');
  assert.ok(Date.now() - t0 < 2000, 'the request is aborted, not left hanging');

  rt.jaringan = 'html';
  err = await api.get('/saya').catch((e) => e);
  assert.equal(err.kode, 'BUKAN_JSON');
  assert.match(err.pesan, /\/rt/);
});

test('an empty 502 from a gateway reads as "runtime down", a bare 500 as a server error', async () => {
  const kosong502 = async () => new Response('', { status: 502 });
  let err = await buatApiRuntime({ fetch: kosong502 }).get('/saya').catch((e) => e);
  assert.equal(err.kode, 'RUNTIME_MATI');
  const polos500 = async () => new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'content-type': 'application/json' } });
  err = await buatApiRuntime({ fetch: polos500 }).get('/saya').catch((e) => e);
  assert.equal(err.kode, 'GALAT_SERVER');
  assert.equal(err.pesan, PESAN_TRANSPORT.GALAT_SERVER);
  assert.equal(kodeDariStatus(409), 'BENTROK');
});

test('ids that would bend the URL path are refused before any request', async () => {
  assert.equal(segmen('agen', 'ag_abc123'), 'ag_abc123');
  for (const [jenis, buruk] of [['party', '../saya'], ['agen', 'ag_x/../../y'], ['misi', 'm_1%2f..'], ['misi', ''], ['party', null]]) {
    assert.throws(() => segmen(jenis, buruk), (e) => e.kode === 'ID_TIDAK_SAH');
  }
  const rt = buatRuntimePalsu({ masuk: 'usr-a' });
  const err = await buatApiRuntime({ fetch: rt.fetch }).get('/misi/../saya').catch((e) => e);
  assert.equal(err.kode, 'JALUR_TIDAK_SAH');
  assert.equal(rt.panggilan.length, 0);
});
