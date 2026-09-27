// ═══════════════════════════════════════════════════════
// apiRuntime.js — the world's only door to the Galantara World runtime.
//
// The runtime (services/runtime) is the source of truth for agents, parties and missions. The
// world reaches it SAME-ORIGIN under /rt/api (galantara-server proxies /rt/* in --local; nginx
// does it in production), so the session cookie is first-party and no CORS is involved.
//
// Every failure becomes a GalatRuntime {kode, pesan, status}: the UI maps `kode` to a card with
// a button (docs/riset/2026-09-26-pivot/LAPORAN-DESAIN-ART-DIRECTION.md §9.9). A message the
// player cannot act on counts as a bug (AGENTS.md §5), so transport errors get Indonesian text
// that says what to do.
// ═══════════════════════════════════════════════════════

export const BASIS_RUNTIME = '/rt/api';

/** Transport failures the runtime cannot name itself. */
export const PESAN_TRANSPORT = Object.freeze({
  JARINGAN: 'Koneksi putus. Periksa internetmu, lalu coba lagi.',
  WAKTU_HABIS: 'Server agen terlalu lama menjawab. Coba lagi sebentar lagi.',
  RUNTIME_MATI: 'Server agen sedang tidak menjawab. Coba lagi sebentar lagi.',
  BUKAN_JSON: 'Dunia belum tersambung ke server agen (jalur /rt). Beri tahu admin Galantara.',
  GALAT_SERVER: 'Terjadi galat di server. Coba lagi; kalau berulang, laporkan jam kejadiannya.',
});

export class GalatRuntime extends Error {
  /** @param {{kode:string, pesan:string, status?:number, data?:any}} p */
  constructor({ kode, pesan, status = 0, data = null }) {
    super(pesan);
    this.name = 'GalatRuntime';
    this.kode = kode;
    this.pesan = pesan;
    this.status = status;
    this.data = data;
  }
}

/** Code used when a response carries no `kode` of its own. */
export function kodeDariStatus(status) {
  if (status === 401) return 'BELUM_MASUK';
  if (status === 403) return 'DITOLAK';
  if (status === 404) return 'TIDAK_ADA';
  if (status === 409) return 'BENTROK';
  if (status === 413) return 'TERLALU_BESAR';
  if (status === 429) return 'TERLALU_SERING';
  if (status === 502 || status === 503 || status === 504) return 'RUNTIME_MATI';
  return 'GALAT_SERVER';
}

// Ids that end up inside a URL path. Validated instead of encoded: a percent sign is refused by
// the /rt proxy anyway, and an id outside these shapes is a bug worth surfacing, not escaping.
const POLA_ID = {
  party: /^[a-z0-9][a-z0-9_-]{1,63}$/,
  agen: /^ag_[a-z0-9]{6,32}$/,
  misi: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
};

/** @param {'party'|'agen'|'misi'} jenis */
export function segmen(jenis, id) {
  if (typeof id !== 'string' || !POLA_ID[jenis]?.test(id)) {
    throw new GalatRuntime({ kode: 'ID_TIDAK_SAH', pesan: 'Data dari server tidak dikenali. Muat ulang halaman, lalu coba lagi.' });
  }
  return id;
}

/**
 * @param {{fetch?: Function, basis?: string, batasWaktuMs?: number}} [opsi]
 */
export function buatApiRuntime({
  fetch: ambil = globalThis.fetch?.bind(globalThis),
  basis = BASIS_RUNTIME,
  batasWaktuMs = 15000,
} = {}) {
  async function panggil(metode, jalur, isi) {
    if (typeof jalur !== 'string' || !jalur.startsWith('/') || jalur.includes('..')) {
      throw new GalatRuntime({ kode: 'JALUR_TIDAK_SAH', pesan: PESAN_TRANSPORT.GALAT_SERVER });
    }
    const headers = { accept: 'application/json' };
    const tulis = metode !== 'GET';
    if (tulis) {
      headers['content-type'] = 'application/json';
      // The runtime refuses writes without it: a cross-site form cannot set custom headers.
      headers['x-galantara-world'] = '1';
    }
    const kendali = typeof AbortController === 'function' ? new AbortController() : null;
    const penunggu = kendali ? setTimeout(() => kendali.abort(), batasWaktuMs) : null;
    let res;
    try {
      res = await ambil(basis + jalur, {
        method: metode,
        credentials: 'include',
        cache: 'no-store',
        headers,
        body: tulis ? JSON.stringify(isi ?? {}) : undefined,
        signal: kendali?.signal,
      });
    } catch (err) {
      const habis = err?.name === 'AbortError' || kendali?.signal.aborted;
      throw new GalatRuntime({
        kode: habis ? 'WAKTU_HABIS' : 'JARINGAN',
        pesan: habis ? PESAN_TRANSPORT.WAKTU_HABIS : PESAN_TRANSPORT.JARINGAN,
      });
    } finally {
      if (penunggu) clearTimeout(penunggu);
    }

    let teks = '';
    try {
      teks = await res.text();
    } catch {
      throw new GalatRuntime({ kode: 'JARINGAN', pesan: PESAN_TRANSPORT.JARINGAN, status: res.status });
    }
    let data = null;
    try {
      data = teks ? JSON.parse(teks) : null;
    } catch {
      data = null;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      // An HTML page (static host without the /rt proxy) or an empty 502 from a gateway.
      const kode = res.status >= 502 && res.status <= 504 ? 'RUNTIME_MATI' : 'BUKAN_JSON';
      throw new GalatRuntime({ kode, pesan: PESAN_TRANSPORT[kode], status: res.status });
    }
    if (!res.ok || data.ok === false) {
      const kode = typeof data.kode === 'string' && data.kode ? data.kode : kodeDariStatus(res.status);
      const pesan = typeof data.pesan === 'string' && data.pesan.trim()
        ? data.pesan
        : (PESAN_TRANSPORT[kode] ?? PESAN_TRANSPORT.GALAT_SERVER);
      throw new GalatRuntime({ kode, pesan, status: res.status, data });
    }
    return data;
  }

  return {
    basis,
    get: (jalur) => panggil('GET', jalur),
    post: (jalur, isi = {}) => panggil('POST', jalur, isi),
    put: (jalur, isi) => panggil('PUT', jalur, isi),
  };
}
