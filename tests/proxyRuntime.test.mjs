// ═══════════════════════════════════════════════════════
// tests/proxyRuntime.test.mjs — /rt/* → runtime, same-origin, node:http only.
//
// Guarded (mutation-proven, docs/sprint/LOG-B-dunia-klien.md):
// - only /rt/api/<plain segments> reaches the runtime: dot segments, percent escapes,
//   backslashes and empty segments are refused and the runtime receives NOTHING;
// - cookie, origin, x-galantara-world go up; every set-cookie comes back; hop-by-hop headers
//   (and headers named in Connection) do not cross;
// - a dead or slow runtime answers JSON the world can show.
// Raw http.request is used on purpose: fetch() would normalise "../" before sending.
// ═══════════════════════════════════════════════════════

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buatProxyRuntime, jalurHulu } = require('../galantara-server/proxyRuntime.js');

const tutup = [];
after(async () => { for (const s of tutup) await new Promise((r) => s.close(r)); });

async function dengar(handler) {
  const s = http.createServer(handler);
  s.listen(0, '127.0.0.1');
  await once(s, 'listening');
  tutup.push(s);
  return s;
}

// Fake runtime: records what arrives and answers like services/runtime does.
async function runtimePalsu() {
  const masuk = [];
  const server = await dengar((req, res) => {
    let isi = '';
    req.on('data', (c) => { isi += c; });
    req.on('end', () => {
      masuk.push({ method: req.method, url: req.url, headers: req.headers, isi });
      if (req.url.startsWith('/api/lambat')) return; // never answers
      res.writeHead(req.url.startsWith('/api/tidak-ada') ? 404 : 200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'set-cookie': ['gw_sesi=abc123; HttpOnly; Path=/; SameSite=Lax', 'lain=1; Path=/'],
        connection: 'close, x-rahasia-hop',
        'x-rahasia-hop': 'jangan-sampai-browser',
      });
      res.end(JSON.stringify({ ok: true, jalur: req.url }));
    });
  });
  return { masuk, url: `http://127.0.0.1:${server.address().port}` };
}

async function proxyKe(runtimeUrl, opsi = {}) {
  const proxy = buatProxyRuntime({ runtimeUrl, log: { warn() {} }, ...opsi });
  const lewat = [];
  const server = await dengar((req, res) => proxy(req, res, () => {
    lewat.push(req.url);
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('bukan urusan proxy');
  }));
  return { lewat, port: server.address().port };
}

/** Send an exact request target (no client-side normalisation). */
function kirim(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let teks = '';
      res.on('data', (c) => { teks += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, teks, json: (() => { try { return JSON.parse(teks); } catch { return null; } })() }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('forwards /rt/api/* with method, query, body and the headers the runtime judges', async () => {
  const rt = await runtimePalsu();
  const { port } = await proxyKe(rt.url);
  const body = JSON.stringify({ template_id: 'sari' });
  const r = await kirim(port, '/rt/api/agen/rekrut?coba=1&instance_id=ag_abc123', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
      cookie: 'gw_sesi=abc123',
      origin: 'http://localhost:4300',
      'x-galantara-world': '1',
      connection: 'keep-alive, x-dari-klien',
      'x-dari-klien': 'hop',
      'proxy-authorization': 'Basic Zm9vOmJhcg==',
    },
  });
  assert.equal(r.status, 200);
  const [naik] = rt.masuk;
  assert.equal(naik.method, 'POST');
  assert.equal(naik.url, '/api/agen/rekrut?coba=1&instance_id=ag_abc123');
  assert.equal(naik.isi, body);
  assert.equal(naik.headers.cookie, 'gw_sesi=abc123');
  assert.equal(naik.headers.origin, 'http://localhost:4300', 'Origin passes unchanged: the runtime decides');
  assert.equal(naik.headers['x-galantara-world'], '1');
  assert.equal(naik.headers.host, new URL(rt.url).host);
  assert.equal(naik.headers['x-forwarded-host'], `127.0.0.1:${port}`);
  assert.equal(naik.headers['x-dari-klien'], undefined, 'headers named in Connection are hop-by-hop');
  assert.equal(naik.headers['proxy-authorization'], undefined);
});

test('every set-cookie comes back; hop-by-hop response headers stay behind', async () => {
  const rt = await runtimePalsu();
  const { port } = await proxyKe(rt.url);
  const r = await kirim(port, '/rt/api/dev/masuk', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
  assert.deepEqual(r.headers['set-cookie'], ['gw_sesi=abc123; HttpOnly; Path=/; SameSite=Lax', 'lain=1; Path=/']);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['x-rahasia-hop'], undefined);
  assert.deepEqual(r.json, { ok: true, jalur: '/api/dev/masuk' });
});

test('traversal and escapes are refused, and the runtime receives nothing', async () => {
  const rt = await runtimePalsu();
  const { port, lewat } = await proxyKe(rt.url);
  const buruk = [
    '/rt/api/../../etc/passwd',
    '/rt/../src/main.js',
    '/rt/api/%2e%2e/%2e%2e/etc/passwd',
    '/rt/api/..%2f..%2fadmin',
    '/rt/api/%2fetc/passwd',
    '/rt/api/x\\..\\..\\y',
    '/rt//api/sehat',
    '/rt/./api/sehat',
    '/rt/api/./sehat',
    '/rt/api//sehat',
    '/rt/api/.env',
    '/rt/api/sehat%00',
    '/rt/api',
    '/rt/api/',
    '/rt/sehat',
    '/rt/api/sehat?x=<script>',
    '/rt',
  ];
  for (const path of buruk) {
    const r = await kirim(port, path);
    assert.equal(r.status, 404, path);
    assert.equal(r.json?.kode, 'JALUR_DITOLAK', path);
  }
  assert.equal(rt.masuk.length, 0, 'not one refused path reached the runtime');
  assert.deepEqual(lewat, [], 'and none fell through to the static server either');
  // Control: the same runtime is reachable through a plain path.
  assert.equal((await kirim(port, '/rt/api/sehat')).status, 200);
  assert.equal(rt.masuk.length, 1);
});

test('paths outside /rt/ are left to the rest of the server', async () => {
  const rt = await runtimePalsu();
  const { port, lewat } = await proxyKe(rt.url);
  const r = await kirim(port, '/src/main.js');
  assert.equal(r.status, 404);
  assert.equal(r.teks, 'bukan urusan proxy');
  assert.deepEqual(lewat, ['/src/main.js']);
  assert.equal(rt.masuk.length, 0);
});

test('a dead runtime answers 502 JSON, a silent one 504, both in Indonesian', async () => {
  const mati = await dengar(() => {});
  const port0 = mati.address().port;
  await new Promise((r) => mati.close(r));
  tutup.splice(tutup.indexOf(mati), 1);
  const { port } = await proxyKe(`http://127.0.0.1:${port0}`);
  let r = await kirim(port, '/rt/api/sehat');
  assert.equal(r.status, 502);
  assert.equal(r.json.kode, 'RUNTIME_MATI');
  assert.match(r.json.pesan, /tidak menjawab/);

  const rt = await runtimePalsu();
  const lambat = await proxyKe(rt.url, { batasWaktuMs: 150 });
  r = await kirim(lambat.port, '/rt/api/lambat');
  assert.equal(r.status, 504);
  assert.equal(r.json.kode, 'WAKTU_HABIS');
});

test('RUNTIME_URL may carry a path prefix; malformed ones are refused at start-up', async () => {
  const rt = await runtimePalsu();
  const { port } = await proxyKe(`${rt.url}/runtime/`);
  await kirim(port, '/rt/api/sehat');
  assert.equal(rt.masuk.at(-1).url, '/runtime/api/sehat');
  for (const buruk of ['bukan url', 'ftp://host/x', `http://${['user', 'sandi'].join(':')}@host:1`, 'http://host:1/?x=1']) {
    assert.throws(() => buatProxyRuntime({ runtimeUrl: buruk }), /RUNTIME_URL/);
  }
  assert.equal(jalurHulu('/rt/api/party/party-utama'), '/api/party/party-utama');
  assert.equal(jalurHulu('/rt/api/misi?instance_id=ag_abc123'), '/api/misi?instance_id=ag_abc123');
});
