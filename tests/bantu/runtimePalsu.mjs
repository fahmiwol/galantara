// ═══════════════════════════════════════════════════════
// tests/bantu/runtimePalsu.mjs — a fake Galantara World runtime behind a fake fetch.
//
// ADR-0012: stubs model behaviour, not just shapes. This one answers with real `Response`
// objects (status, headers, JSON body), enforces the rules the real runtime enforces (session,
// write header, party contract, optimistic versions, one agent per species) and can fail the
// way networks fail (connection refused, never answering until aborted, HTML instead of JSON).
// Routes and shapes follow services/runtime/src/server.js and docs/sprint/SPRINT-01.md.
// ═══════════════════════════════════════════════════════

import { validateParty } from '../../vendor/party-contract/party.js';

export const SPESIES = [
  { id: 'sari', versi: 1, nama: 'Sari', peran_dunia: 'Dungeon Scout', kelas_kerja: 'Penjejak Intelijen', misi_keahlian: ['riset-sumber'], equipment_dasar: [{ kind: 'api', id: 'jelajah-sumber', scopes: ['read'] }], bisa_direkrut: true, ditemui_di: 'oola-hub' },
  { id: 'budi', versi: 1, nama: 'Budi', peran_dunia: 'Warga Oola', kelas_kerja: 'Operator Lapangan', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'oola-hub' },
  { id: 'maya', versi: 1, nama: 'Maya', peran_dunia: 'Travel Guide', kelas_kerja: 'Pemandu Ekspedisi', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'oola-hub' },
  { id: 'dewi', versi: 1, nama: 'Dewi', peran_dunia: 'Merchant Kuta', kelas_kerja: 'Pedagang', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'kuta' },
  { id: 'dev', versi: 1, nama: 'Dev', peran_dunia: 'Core Developer', kelas_kerja: 'Tukang Kode', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'oola-hub' },
];

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const gagal = (status, kode, pesan, extra = {}) => json(status, { ok: false, kode, pesan, ...extra });

let urut = 0;
const idBaru = (awal) => `${awal}${(++urut).toString(36).padStart(8, '0')}`;

export function buatRuntimePalsu({ masuk = null, devLogin = true, misiAda = true } = {}) {
  const r = {
    pemain: masuk,
    devLogin,
    misiAda,
    /** @type {'hidup'|'mati'|'diam'|'html'} */
    jaringan: 'hidup',
    panggilan: [],
    agen: new Map(), // instance_id -> {agen, version, status_kerja}
    party: new Map(), // id -> {party, version}
    misi: new Map(), // id -> misi
    otak: [{ provider: 'migancore', model: 'qwen3:4b-instruct-2507', hidup: true, dicek: '2026-09-26T15:03:00Z', label: 'milik sendiri' }],
    /** Hook run before the party route answers (e.g. the Kantor changes the party meanwhile). */
    sebelumSimpanParty: null,
  };

  // The tenant's agents as {instance_id: agen}, like roster.map() in the runtime.
  const petaAgen = () => Object.fromEntries([...r.agen.values()].filter((x) => x.agen.owner_id === r.pemain).map((x) => [x.agen.instance_id, x.agen]));

  r.rekrutLangsung = (templateId, extra = {}) => {
    const sp = SPESIES.find((s) => s.id === templateId);
    const agen = {
      schema: 'galantara.agen/v1',
      instance_id: idBaru('ag_'),
      owner_id: r.pemain,
      template: { id: sp.id, versi: sp.versi },
      loadout: { brain: { provider: 'migancore', model: 'qwen3:4b-instruct-2507' }, equipment: sp.equipment_dasar.map((e) => ({ ...e })) },
      ...extra,
    };
    r.agen.set(agen.instance_id, { agen, version: 1, status_kerja: 'siap' });
    return agen;
  };

  async function jawab(metode, url, headers, isi) {
    const u = new URL(url, 'http://dunia.local');
    if (!u.pathname.startsWith('/rt/api/')) return new Response('<!doctype html><title>404</title>', { status: 404, headers: { 'content-type': 'text/html' } });
    const jalur = u.pathname.slice('/rt/api'.length);
    const tulis = metode !== 'GET';
    if (tulis && headers['x-galantara-world'] !== '1') return gagal(403, 'HEADER_KURANG', 'Permintaan ditolak: header x-galantara-world tidak ada.');
    const perluMasuk = () => (r.pemain ? null : gagal(401, 'BELUM_MASUK', 'Kamu belum masuk. Buka lagi dari dunia Galantara.'));
    let m;

    if (metode === 'GET' && jalur === '/spesies') return json(200, { ok: true, spesies: SPESIES });
    if (metode === 'POST' && jalur === '/dev/masuk') {
      if (!r.devLogin) return gagal(404, 'TIDAK_ADA', 'Rute tidak ditemukan.');
      if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(isi?.pemain ?? '')) return gagal(400, 'PEMAIN_TIDAK_SAH', 'Nama pemain tidak sah.');
      r.pemain = isi.pemain;
      return json(200, { ok: true, pemain: r.pemain });
    }
    if (metode === 'GET' && jalur === '/saya') return perluMasuk() ?? json(200, { ok: true, pemain: r.pemain });
    if (metode === 'GET' && jalur === '/agen') {
      return perluMasuk() ?? json(200, { ok: true, agen: [...r.agen.values()].filter((x) => x.agen.owner_id === r.pemain).map((x) => ({ agen: x.agen, version: x.version, status_kerja: x.status_kerja })) });
    }
    if (metode === 'POST' && jalur === '/agen/rekrut') {
      const tolak = perluMasuk();
      if (tolak) return tolak;
      const sp = SPESIES.find((s) => s.id === isi?.template_id);
      if (!sp) return gagal(404, 'SPESIES_TIDAK_ADA', 'Warga ini tidak dikenal di Galantara.');
      if ([...r.agen.values()].some((x) => x.agen.owner_id === r.pemain && x.agen.template.id === sp.id)) {
        return gagal(409, 'SUDAH_DIREKRUT', `${sp.nama} sudah ada di markasmu.`);
      }
      const agen = r.rekrutLangsung(sp.id);
      return json(200, { ok: true, agen, versi: 1, peringatan: [] });
    }
    if (metode === 'GET' && jalur === '/party') {
      return perluMasuk() ?? json(200, { ok: true, party: [...r.party.values()].filter((x) => x.party.owner_id === r.pemain).map((x) => ({ party: x.party, version: x.version, updated_at: 1 })) });
    }
    if (metode === 'PUT' && (m = /^\/party\/([a-z0-9][a-z0-9_-]{1,63})$/.exec(jalur))) {
      const tolak = perluMasuk();
      if (tolak) return tolak;
      await r.sebelumSimpanParty?.();
      const { party, versi } = isi ?? {};
      if (!party || party.id !== m[1]) return gagal(400, 'ID_BEDA', 'ID party di alamat dan di isi tidak sama.');
      if (party.owner_id !== r.pemain) return gagal(403, 'BUKAN_PEMILIK', 'Party ini bukan milikmu.');
      const vonis = validateParty(party, { agents: petaAgen() });
      if (!vonis.ok) return gagal(400, 'PARTY_TIDAK_SAH', 'Party belum bisa disimpan. Periksa isian yang ditandai.', { errors: vonis.errors });
      const kini = r.party.get(party.id)?.version ?? 0;
      if (Number(versi ?? 0) !== kini) return gagal(409, 'VERSI_BENTROK', 'Party ini baru saja diubah di tempat lain (dunia atau dashboard). Muat ulang dulu, lalu ulangi.', { versi_sekarang: kini });
      r.party.set(party.id, { party: structuredClone(party), version: kini + 1 });
      return json(200, { ok: true, versi: kini + 1, peringatan: vonis.warnings });
    }

    // ── Missions (contract locked in SPRINT-01) ──
    if (jalur.startsWith('/misi') || jalur.startsWith('/otak')) {
      if (!r.misiAda) return gagal(404, 'TIDAK_ADA', 'Rute tidak ditemukan.');
      const tolak = perluMasuk();
      if (tolak) return tolak;
    }
    if (metode === 'GET' && jalur === '/otak/status') return json(200, { ok: true, otak: r.otak });
    if (metode === 'POST' && jalur === '/misi') {
      const { instance_id, jenis, pertanyaan, sumber = [] } = isi ?? {};
      if (!r.agen.has(instance_id)) return gagal(404, 'AGEN_TIDAK_ADA', 'Agen tidak ditemukan di markasmu.');
      if (jenis !== 'riset-sumber' || typeof pertanyaan !== 'string' || !pertanyaan.trim() || pertanyaan.length > 300) {
        return gagal(400, 'MISI_TIDAK_SAH', 'Pertanyaan misi 1–300 karakter.');
      }
      if (!Array.isArray(sumber) || sumber.length > 3 || sumber.some((s) => !/^https:\/\//.test(s))) {
        return gagal(400, 'SUMBER_TIDAK_SAH', 'Sumber maksimal 3 alamat https.');
      }
      const misi = { id: idBaru('m_'), instance_id, jenis, pertanyaan, sumber, status: 'antre', posisi: 1, eta_detik: 90, langkah: { nama: 'terima', ke: 1, dari: 6 }, label_otak: 'milik sendiri', dibuat: '2026-09-26T15:00:00Z' };
      r.misi.set(misi.id, misi);
      return json(200, { ok: true, misi: { id: misi.id, status: misi.status, posisi: misi.posisi, eta_detik: misi.eta_detik } });
    }
    if (metode === 'GET' && jalur === '/misi') {
      const inst = u.searchParams.get('instance_id');
      return json(200, { ok: true, misi: [...r.misi.values()].filter((x) => !inst || x.instance_id === inst).slice(-10).reverse() });
    }
    if (metode === 'GET' && (m = /^\/misi\/([A-Za-z0-9_-]+)$/.exec(jalur))) {
      const misi = r.misi.get(m[1]);
      return misi ? json(200, { ok: true, misi }) : gagal(404, 'MISI_TIDAK_ADA', 'Misi tidak ditemukan.');
    }
    if (metode === 'POST' && (m = /^\/misi\/([A-Za-z0-9_-]+)\/batal$/.exec(jalur))) {
      const misi = r.misi.get(m[1]);
      if (!misi) return gagal(404, 'MISI_TIDAK_ADA', 'Misi tidak ditemukan.');
      misi.status = 'dibatalkan';
      return json(200, { ok: true });
    }
    if (metode === 'POST' && (m = /^\/misi\/([A-Za-z0-9_-]+)\/putusan$/.exec(jalur))) {
      const misi = r.misi.get(m[1]);
      if (!misi) return gagal(404, 'MISI_TIDAK_ADA', 'Misi tidak ditemukan.');
      if (!['selesai', 'selesai_tanpa_temuan'].includes(misi.status)) return gagal(409, 'BELUM_SELESAI', 'Misi belum selesai.');
      if (!['setujui', 'perbaiki', 'buang'].includes(isi?.putusan)) return gagal(400, 'PUTUSAN_TIDAK_SAH', 'Putusan tidak dikenal.');
      misi.putusan = isi.putusan;
      if (isi.putusan === 'perbaiki') misi.status = 'antre';
      return json(200, { ok: true, misi });
    }
    return gagal(404, 'TIDAK_ADA', 'Rute tidak ditemukan.');
  }

  /** fetch(url, init) with the browser's failure modes. */
  r.fetch = async (url, init = {}) => {
    const metode = (init.method ?? 'GET').toUpperCase();
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    const isi = init.body ? JSON.parse(init.body) : undefined;
    r.panggilan.push({ metode, url, jalur: new URL(url, 'http://dunia.local').pathname, headers, isi, credentials: init.credentials });
    if (init.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    if (r.jaringan === 'mati') throw new TypeError('fetch failed');
    if (r.jaringan === 'diam') {
      return new Promise((_, tolak) => {
        init.signal?.addEventListener('abort', () => tolak(new DOMException('The operation was aborted.', 'AbortError')));
      });
    }
    if (r.jaringan === 'html') return new Response('<!doctype html><h1>Not Found</h1>', { status: 404, headers: { 'content-type': 'text/html' } });
    return jawab(metode, url, headers, isi);
  };

  r.tulisan = () => r.panggilan.filter((p) => p.metode !== 'GET');
  return r;
}

/** localStorage stand-in with the same string-only semantics. */
export function penyimpananPalsu(awal = {}) {
  const data = new Map(Object.entries(awal));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}
