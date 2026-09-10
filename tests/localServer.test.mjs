import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const entry = new URL('galantara-server/index.js', root);
const require = createRequire(entry);
let dependencies = true;
try { require.resolve('express'); require.resolve('socket.io'); require.resolve('three'); }
catch { dependencies = false; }

test('local server serves vendored Oola assets and keeps repository internals private', {
  skip: dependencies ? false : 'Install server dependencies: npm ci --prefix galantara-server',
  timeout: 20000,
}, async (t) => {
  const child = spawn(process.execPath, [fileURLToPath(entry), '--local'], {
    cwd: fileURLToPath(root),
    env: { ...process.env, GALANTARA_LOCAL_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const closed = once(child, 'close');
    child.kill(); // Only the exact child created by this test.
    await closed;
  });
  const port = await new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => reject(new Error('Local server readiness timeout')), 10000);
    const finish = (fn, value) => { clearTimeout(timer); fn(value); };
    child.once('error', error => finish(reject, error));
    child.once('exit', code => finish(reject, new Error(`Local server exited ${code}: ${stderr}`)));
    child.stdout.on('data', chunk => {
      stdout += chunk;
      const match = stdout.match(/running on :(\d+)/);
      if (match) finish(resolve, Number(match[1]));
    });
  });
  assert.ok(port > 0);
  const base = `http://127.0.0.1:${port}`;
  const get = path => fetch(base + path, { signal: AbortSignal.timeout(5000) });
  const health = await (await get('/local-health')).json();
  assert.equal(health.port, port);
  assert.equal(health.app, 'galantara-local');

  const response = await get('/');
  assert.equal(response.status, 200);
  const html = await response.text();
  // Derive the contract from index.html so a renamed library is checked too.
  // Includes both HTML attributes and muat('/vendor/...') script loaders.
  const paths = new Set([...html.matchAll(/["'](\/?vendor\/[^"'\s]+)["']/g)]
    .map(match => '/' + match[1].replace(/^\//, '')));
  assert.ok(paths.size >= 4, 'HTML extractor must find Three, Socket, Supabase and font CSS');
  const fontCSS = await readFile(new URL('vendor/nunito.css', root), 'utf8');
  for (const match of fontCSS.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    paths.add(new URL(match[1], base + '/vendor/nunito.css').pathname);
  }
  for (const path of paths) {
    const asset = await get(path);
    assert.equal(asset.status, 200, `${path} must not return 404`);
    assert.ok(!asset.headers.get('content-type')?.includes('text/html'), `${path} must not be an HTML fallback`);
    const expected = await readFile(new URL(path.slice(1), root));
    assert.deepEqual(Buffer.from(await asset.arrayBuffer()), expected, `${path} must match the vendored bytes`);
  }
  for (const path of ['/benteng.html', '/about.html', '/src/main.js', '/assets/spots/braga/manifest.json']) {
    const r = await get(path); assert.equal(r.status, 200, path); await r.arrayBuffer();
  }
  for (const path of ['/.git/config', '/galantara-server/index.js', '/package.json', '/docs/LIVING_LOG.md', '/vendor/.env']) {
    const r = await get(path); assert.ok([403,404].includes(r.status), `${path} must stay private`); await r.arrayBuffer();
  }
  assert.equal(stderr, '');
});
