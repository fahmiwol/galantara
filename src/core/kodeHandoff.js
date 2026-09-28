// ═══════════════════════════════════════════════════════
// kodeHandoff.js — one-time handoff codes between the world and the Kantor (ADR-0002, D-12).
//
// Arrival (`?mighan=<kode>` from the Kantor): the code leaves the address bar FIRST (history,
// bookmarks, screenshots and Referer headers must never hold it), then the world redeems it at the
// runtime (POST /api/handoff/tukar-dunia). A malformed value is stripped too, but never sent.
// Departure ("Buka Kantor"): a code is issued at click time only (POST /api/handoff/terbitkan-dunia),
// goes straight into the Kantor URL and is not stored or logged.
// ═══════════════════════════════════════════════════════

export const PARAM_HANDOFF = 'mighan';

/**
 * Remove `?mighan=` from the current URL without a reload or a new history entry.
 * @param {{ href: string }} [lokasi] window.location
 * @param {{ replaceState: Function, state?: any }} [riwayat] window.history
 * @returns {boolean} true when a code was present (and is now gone)
 */
export function buangKodeHandoff(lokasi = globalThis.location, riwayat = globalThis.history) {
  if (!lokasi?.href || typeof riwayat?.replaceState !== 'function') return false;
  const u = new URL(lokasi.href);
  if (!u.searchParams.has(PARAM_HANDOFF)) return false;
  u.searchParams.delete(PARAM_HANDOFF);
  riwayat.replaceState(riwayat.state ?? null, '', `${u.pathname}${u.search}${u.hash}`);
  return true;
}

// base64url(claims).base64url(hmac), bounded like redeemHandoff (≤ 1024 chars); same shape as the Kantor's.
const BENTUK_KODE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}$/;
export const kodeSah = (k) => typeof k === 'string' && k.length <= 1024 && BENTUK_KODE.test(k);

/**
 * Take the arriving code out of the URL and hand it back (null when absent, doubled or malformed).
 * @returns {{kode: string|null, ada: boolean}}
 */
export function ambilKodeHandoff(lokasi = globalThis.location, riwayat = globalThis.history) {
  if (!lokasi?.href) return { kode: null, ada: false };
  let semua = [];
  try { semua = new URL(lokasi.href).searchParams.getAll(PARAM_HANDOFF); } catch { semua = []; }
  const ada = buangKodeHandoff(lokasi, riwayat);
  if (!ada) return { kode: null, ada: false };
  // Two codes at once is nothing the Kantor produces: redeem neither.
  return { kode: semua.length === 1 && kodeSah(semua[0]) ? semua[0] : null, ada: true };
}

/**
 * The Kantor address carrying a code (or none). null for anything but a plain http(s) page.
 * @param {string} kantorUrl  @param {string|null} kode
 */
export function urlKantorDenganKode(kantorUrl, kode) {
  let u;
  try { u = new URL(kantorUrl); } catch { return null; }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return null;
  u.searchParams.delete(PARAM_HANDOFF);
  if (kodeSah(kode)) u.searchParams.set(PARAM_HANDOFF, kode);
  return u.href;
}
