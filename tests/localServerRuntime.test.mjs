// ═══════════════════════════════════════════════════════
// tests/localServerRuntime.test.mjs — the REAL `galantara-server --local` proxies /rt/api/*.
//
// proxyRuntime.test.mjs proves the module; this proves the server people actually start wires
// it in (RUNTIME_URL), so "all unit tests green but the world cannot reach the runtime" cannot
// happen silently.
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const entry = new URL('galantara-server/index.js', root);
const require = createRequire(entry);
let dependencies = true;
try { require.resolve('express'); require.resolve('socket.io'); require.resolve('three'); }
catch { dependencies = false; }

async function mulaiDunia(t, runtimeUrl) {
  const child = spawn(process.execPath, [fileURLToPath(entry), '--local'], {
    cwd: fileURLToPath(root),
    env: { ...process.env, GALANTARA_LOCAL_PORT: '0', RUNTIME_URL: runtimeUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', (c) => { stderr += c; });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const closed = once(child, 'close');
    child.kill(); // only the child this test created
    await closed;
  });
  const port = await new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => reject(new Error('Local server readiness timeout')), 10000);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Local server exited ${code}: ${stderr}`)); });
    child.stdout.on('data', (c) => {
      stdout += c;
      const m = stdout.match(/running on :(\d+)/);
      if (m) { clearTimeout(timer); resolve(Number(m[1])); }
    });
  });
  return { port, stderr: () => stderr };
}

test('galantara-server --local forwards /rt/api/* to RUNTIME_URL and still serves the world', {
  skip: dependencies ? false : 'Install server dependencies: npm ci --prefix galantara-server',
  timeout: 30000,
}, async (t) => {
  const masuk = [];
  const runtime = http.createServer((req, res) => {
    masuk.push(req.url);
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'gw_sesi=uji; HttpOnly; Path=/; SameSite=Lax' });
    res.end(JSON.stringify({ ok: true, versi: 'palsu' }));
  });
  runtime.listen(0, '127.0.0.1');
  await once(runtime, 'listening');
  t.after(() => new Promise((r) => runtime.close(r)));

  const { port } = await mulaiDunia(t, `http://127.0.0.1:${runtime.address().port}`);
  const base = `http://127.0.0.1:${port}`;
  const sehat = await fetch(`${base}/rt/api/sehat`, { signal: AbortSignal.timeout(5000) });
  assert.equal(sehat.status, 200);
  assert.deepEqual(await sehat.json(), { ok: true, versi: 'palsu' });
  assert.match(sehat.headers.get('set-cookie'), /^gw_sesi=uji; HttpOnly/);
  assert.deepEqual(masuk, ['/api/sehat']);
  const halaman = await fetch(`${base}/`, { signal: AbortSignal.timeout(5000) });
  assert.equal(halaman.status, 200, 'the world page is still served');
  await halaman.arrayBuffer();
});

test('galantara-server --local with the runtime down answers JSON the world can show', {
  skip: dependencies ? false : 'Install server dependencies: npm ci --prefix galantara-server',
  timeout: 30000,
}, async (t) => {
  const kosong = http.createServer();
  kosong.listen(0, '127.0.0.1');
  await once(kosong, 'listening');
  const portMati = kosong.address().port;
  await new Promise((r) => kosong.close(r));

  const { port } = await mulaiDunia(t, `http://127.0.0.1:${portMati}`);
  const r = await fetch(`http://127.0.0.1:${port}/rt/api/saya`, { signal: AbortSignal.timeout(5000) });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.equal(body.kode, 'RUNTIME_MATI');
});
