// ═══════════════════════════════════════════════════════
// proxyRuntime.js — forward /rt/api/* to the Galantara World runtime, same-origin.
//
// Why: the world must call the runtime with the player's session cookie. Same-origin under
// /rt/ makes that cookie first-party and needs no CORS. In production nginx does this (like
// /mp/); in `--local` development this module does, with node:http only (no new dependency).
//
// Rules:
// - Only /rt/api/<plain segments> is forwarded. Dot segments, percent escapes, backslashes and
//   empty segments are refused before anything is sent: the world never becomes a way to reach
//   anything else on the runtime host.
// - Headers pass through (cookie, origin, x-galantara-world, set-cookie), except hop-by-hop ones.
//   The runtime keeps judging Origin itself: RUNTIME_ORIGINS must include the world's origin.
// - When the runtime is down or slow, the world gets JSON it can show ({ok:false,kode,pesan}).
// ═══════════════════════════════════════════════════════
'use strict';

const http = require('node:http');
const https = require('node:https');

// RFC 9110 §7.6.1 connection-specific fields, plus `host` (rewritten for the upstream).
const HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'proxy-connection',
  'te', 'trailer', 'trailers', 'transfer-encoding', 'upgrade', 'host',
]);

// A segment is a plain name that never starts with a dot: no ".", "..", ".env", "%2e", "\".
const JALUR_API = /^\/rt\/api(?:\/[A-Za-z0-9_~-][A-Za-z0-9._~-]*)+\/?$/;
// Query: RFC 3986 characters only (percent escapes allowed here, never in the path).
const KUERI = /^\?[A-Za-z0-9._~!$&'()*+,;=:@/?%-]*$/;

const PESAN = {
  JALUR_DITOLAK: 'Alamat ini tidak diteruskan ke runtime.',
  RUNTIME_MATI: 'Server agen sedang tidak menjawab. Coba lagi sebentar lagi.',
  WAKTU_HABIS: 'Server agen terlalu lama menjawab. Coba lagi sebentar lagi.',
};

/**
 * Upstream path for a request target, or null when it must not be forwarded.
 * @param {string} target raw request target (req.url)
 * @param {string} [awalan] path prefix of RUNTIME_URL, without trailing slash
 */
function jalurHulu(target, awalan = '') {
  if (typeof target !== 'string' || !target.startsWith('/rt/')) return null;
  const q = target.indexOf('?');
  const jalur = q < 0 ? target : target.slice(0, q);
  const kueri = q < 0 ? '' : target.slice(q);
  if (!JALUR_API.test(jalur)) return null;
  if (kueri && !KUERI.test(kueri)) return null;
  return awalan + jalur.slice('/rt'.length) + kueri;
}

function balasJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

function saring(headers) {
  const out = {};
  const perHop = new Set(String(headers.connection ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  for (const [k, v] of Object.entries(headers)) {
    if (!HOP.has(k) && !perHop.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * @param {{runtimeUrl: string, batasWaktuMs?: number, log?: {warn: Function}}} opsi
 * @returns {(req: http.IncomingMessage, res: http.ServerResponse, next?: Function) => void}
 */
function buatProxyRuntime({ runtimeUrl, batasWaktuMs = 30000, log = console }) {
  let hulu;
  try {
    hulu = new URL(runtimeUrl);
  } catch {
    throw new Error(`RUNTIME_URL tidak sah: "${runtimeUrl}" (contoh: http://localhost:9800)`);
  }
  if (!['http:', 'https:'].includes(hulu.protocol) || hulu.username || hulu.password || hulu.search || hulu.hash) {
    throw new Error(`RUNTIME_URL harus http(s)://host:port[/awalan] tanpa kredensial atau kueri: "${runtimeUrl}"`);
  }
  const awalan = hulu.pathname.replace(/\/+$/, '');
  const lib = hulu.protocol === 'https:' ? https : http;

  return function proxyRuntime(req, res, next) {
    const target = req.url ?? '';
    if (target !== '/rt' && !target.startsWith('/rt/') && !target.startsWith('/rt?')) {
      return typeof next === 'function' ? next() : balasJson(res, 404, { ok: false, kode: 'JALUR_DITOLAK', pesan: PESAN.JALUR_DITOLAK });
    }
    const tujuan = jalurHulu(target, awalan);
    if (!tujuan) {
      req.resume(); // drain a refused body
      return balasJson(res, 404, { ok: false, kode: 'JALUR_DITOLAK', pesan: PESAN.JALUR_DITOLAK });
    }

    const headers = saring(req.headers);
    headers.host = hulu.host;
    headers['x-forwarded-host'] = req.headers.host ?? '';
    headers['x-forwarded-proto'] = req.socket?.encrypted ? 'https' : 'http';
    headers['x-forwarded-for'] = req.socket?.remoteAddress ?? '';

    const naik = lib.request({
      protocol: hulu.protocol,
      hostname: hulu.hostname.replace(/^\[|\]$/g, ''),
      port: hulu.port || undefined,
      method: req.method,
      path: tujuan,
      headers,
      timeout: batasWaktuMs,
    }, (turun) => {
      res.writeHead(turun.statusCode ?? 502, saring(turun.headers));
      turun.pipe(res);
      turun.on('error', () => res.destroy());
    });

    naik.on('timeout', () => naik.destroy(Object.assign(new Error('runtime timeout'), { code: 'ETIMEDOUT' })));
    naik.on('error', (err) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const habis = err.code === 'ETIMEDOUT';
      log.warn?.(`[rt] runtime ${habis ? 'terlalu lama menjawab' : 'tidak menjawab'} (${err.code ?? 'galat'})`);
      balasJson(res, habis ? 504 : 502, {
        ok: false,
        kode: habis ? 'WAKTU_HABIS' : 'RUNTIME_MATI',
        pesan: habis ? PESAN.WAKTU_HABIS : PESAN.RUNTIME_MATI,
      });
    });
    // The browser went away: stop the upstream request too.
    res.on('close', () => {
      if (!res.writableFinished) naik.destroy();
    });
    req.pipe(naik);
  };
}

module.exports = { buatProxyRuntime, jalurHulu };
