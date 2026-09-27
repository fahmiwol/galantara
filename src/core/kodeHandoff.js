// ═══════════════════════════════════════════════════════
// kodeHandoff.js — the Kantor → world handoff code in the URL (`?mighan=<kode>`).
//
// The runtime has no redeem route for world-bound codes yet (PERMINTAAN D-12 / B-P4), and in dev
// both sides share one host, so the session cookie is already the same. Until that route exists
// the world does not act on the code, but it removes it from the address bar at once: a one-time
// code must not stay in the history, a bookmark, a shared screenshot, or a Referer header.
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
