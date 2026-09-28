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
import { validateAgent } from '../../vendor/party-contract/agen.js';

export const SPESIES = [
  { id: 'sari', versi: 1, nama: 'Sari', peran_dunia: 'Dungeon Scout', kelas_kerja: 'Penjejak Intelijen', misi_keahlian: ['riset-sumber'], equipment_dasar: [{ kind: 'api', id: 'jelajah-sumber', scopes: ['read'] }], bisa_direkrut: true, ditemui_di: 'oola-hub' },
  { id: 'budi', versi: 1, nama: 'Budi', peran_dunia: 'Warga Oola', kelas_kerja: 'Operator Lapangan', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'oola-hub' },
  { id: 'maya', versi: 1, nama: 'Maya', peran_dunia: 'Travel Guide', kelas_kerja: 'Pemandu Ekspedisi', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'oola-hub' },
  { id: 'dewi', versi: 1, nama: 'Dewi', peran_dunia: 'Merchant Kuta', kelas_kerja: 'Pedagang', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'kuta' },
  { id: 'dev', versi: 1, nama: 'Dev', peran_dunia: 'Core Developer', kelas_kerja: 'Tukang Kode', misi_keahlian: [], equipment_dasar: [], bisa_direkrut: true, ditemui_di: 'oola-hub' },
];

/** Species v2 (SPRINT-02 contract): every hireable species has its mission kind. */
export const SPESIES_V2 = SPESIES.map((s) => ({
  ...s,
  versi: 2,
  misi_keahlian: s.id === 'sari' ? ['riset-sumber'] : s.id === 'budi' ? ['pecah-tugas'] : s.id === 'maya' ? ['susun-panduan'] : [],
}));

/** Mission kinds and their input rules (SPRINT-02 "Jenis misi"). */
const JENIS_M2 = new Set(['riset-sumber', 'pecah-tugas', 'susun-panduan']);
const SELESAI = new Set(['selesai', 'selesai_tanpa_temuan']);
/** A well-formed handoff code shape (base64url claims . base64url mac), assembled, never a real one. */
export const KODE_PALSU = (n = 1) => `${'Q2xhaW1z'}${n}.${'bWFjLXRpcnVhbi0'.repeat(2)}${n}`;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const gagal = (status, kode, pesan, extra = {}) => json(status, { ok: false, kode, pesan, ...extra });

let urut = 0;
const idBaru = (awal) => `${awal}${(++urut).toString(36).padStart(8, '0')}`;

export function buatRuntimePalsu({ masuk = null, devLogin = true, misiAda = true, m2 = false, undangan = null } = {}) {
  const r = {
    pemain: masuk,
    devLogin,
    /** ADR-0011 invitation codes the fake accepts once: normalized code -> pemain; null = no route */
    undangan,
    misiAda,
    /** SPRINT-02 routes and rules (mission kinds, rujuk_misi, persetujuan, handoff dua arah). */
    m2,
    /** instance_id -> {xp, level, dari_misi} served beside the agent (GET /api/agen) when m2 */
    pengalaman: new Map(),
    /** handoff codes the fake accepts once: kode -> pemain */
    kodeDunia: new Map(),
    /** codes issued toward the Kantor */
    kodeTerbit: [],
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

  r.spesies = () => (r.m2 ? SPESIES_V2 : SPESIES);

  // The tenant's agents as {instance_id: agen}, like roster.map() in the runtime.
  const petaAgen = () => Object.fromEntries([...r.agen.values()].filter((x) => x.agen.owner_id === r.pemain).map((x) => [x.agen.instance_id, x.agen]));

  r.rekrutLangsung = (templateId, extra = {}) => {
    const sp = r.spesies().find((s) => s.id === templateId);
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

    if (metode === 'GET' && jalur === '/spesies') return json(200, { ok: true, spesies: r.spesies() });

    // ── Handoff both ways (SPRINT-02 D-12): one-time codes, no session needed to redeem. ──
    if (r.m2 && metode === 'POST' && jalur === '/handoff/tukar-dunia') {
      const pemilik = r.kodeDunia.get(isi?.kode);
      if (!pemilik) return gagal(400, 'KODE_DITOLAK', 'Kode sudah dipakai atau kedaluwarsa.');
      r.kodeDunia.delete(isi.kode); // anti-replay
      r.pemain = pemilik;
      return json(200, { ok: true, pemain: pemilik, party_id: 'party-utama' });
    }
    if (r.m2 && metode === 'POST' && jalur === '/handoff/terbitkan-dunia') {
      if (!r.pemain) return gagal(401, 'BELUM_MASUK', 'Kamu belum masuk.');
      const kode = KODE_PALSU(r.kodeTerbit.length + 7);
      r.kodeTerbit.push({ kode, party_id: isi?.party_id ?? null });
      return json(200, { ok: true, kode, berlaku_detik: 60 });
    }
    if (metode === 'POST' && jalur === '/masuk/undangan') {
      if (!r.undangan) return gagal(404, 'TIDAK_ADA', 'Rute tidak ditemukan.');
      const kode = typeof isi?.kode === 'string' ? isi.kode.toUpperCase().replace(/[\s-]+/g, '') : '';
      const pemain = r.undangan.get(kode);
      if (!pemain) return gagal(400, 'UNDANGAN_DITOLAK', 'Kode undangan tidak berlaku: salah ketik, sudah dipakai, atau kedaluwarsa. Periksa lagi, atau minta kode baru ke tim Galantara.');
      r.undangan.delete(kode);
      r.pemain = pemain;
      return json(200, { ok: true, pemain });
    }
    if (metode === 'POST' && jalur === '/dev/masuk') {
      if (!r.devLogin) return gagal(404, 'TIDAK_ADA', 'Rute tidak ditemukan.');
      if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(isi?.pemain ?? '')) return gagal(400, 'PEMAIN_TIDAK_SAH', 'Nama pemain tidak sah.');
      r.pemain = isi.pemain;
      return json(200, { ok: true, pemain: r.pemain });
    }
    if (metode === 'GET' && jalur === '/saya') return perluMasuk() ?? json(200, { ok: true, pemain: r.pemain });
    if (metode === 'GET' && jalur === '/agen') {
      return perluMasuk() ?? json(200, {
        ok: true,
        agen: [...r.agen.values()].filter((x) => x.agen.owner_id === r.pemain).map((x) => ({
          agen: x.agen,
          version: x.version,
          status_kerja: x.status_kerja,
          ...(r.m2 && r.pengalaman.has(x.agen.instance_id) ? { pengalaman: r.pengalaman.get(x.agen.instance_id) } : {}),
        })),
      });
    }
    if (metode === 'PUT' && (m = /^\/agen\/(ag_[a-z0-9]{6,32})$/.exec(jalur))) {
      const tolak = perluMasuk();
      if (tolak) return tolak;
      const item = r.agen.get(m[1]);
      if (!item || item.agen.owner_id !== r.pemain) return gagal(404, 'AGEN_TIDAK_ADA', 'Agen tidak ditemukan di markasmu.');
      const { agen, versi } = isi ?? {};
      for (const k of ['schema', 'instance_id', 'owner_id', 'template']) {
        if (JSON.stringify(agen?.[k]) !== JSON.stringify(item.agen[k])) return gagal(400, 'IDENTITAS_TETAP', 'Identitas agen (id, pemilik, spesies) tidak bisa diubah.');
      }
      const vonis = validateAgent(agen);
      if (!vonis.ok) return gagal(400, 'AGEN_TIDAK_SAH', 'Perubahan belum bisa disimpan. Periksa isian yang ditandai.', { errors: vonis.errors });
      if (Number(versi) !== item.version) return gagal(409, 'VERSI_BENTROK', 'Agen ini baru saja diubah di tempat lain. Muat ulang dulu, lalu ulangi.', { versi_sekarang: item.version });
      item.agen = structuredClone(agen);
      item.version += 1;
      return json(200, { ok: true, versi: item.version, peringatan: [] });
    }
    if (metode === 'POST' && jalur === '/agen/rekrut') {
      const tolak = perluMasuk();
      if (tolak) return tolak;
      const sp = r.spesies().find((s) => s.id === isi?.template_id);
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
      const { instance_id, jenis, pertanyaan, sumber = [], tujuan, konteks, topik, rujuk_misi } = isi ?? {};
      const item = r.agen.get(instance_id);
      if (!item || item.agen.owner_id !== r.pemain) return gagal(404, 'AGEN_TIDAK_ADA', 'Agen tidak ditemukan di markasmu.');
      const teks = (v, maks) => typeof v === 'string' && v.trim() && v.length <= maks;
      if (!r.m2 || jenis === 'riset-sumber') {
        if (jenis !== 'riset-sumber' || !teks(pertanyaan, 300)) return gagal(400, 'MISI_TIDAK_SAH', 'Pertanyaan misi 1–300 karakter.');
      } else if (!JENIS_M2.has(jenis)) {
        return gagal(400, 'MISI_TIDAK_SAH', 'Jenis misi tidak dikenal.');
      } else if (jenis === 'pecah-tugas' && (!teks(tujuan, 300) || (konteks !== undefined && (typeof konteks !== 'string' || konteks.length > 1500)))) {
        return gagal(400, 'MISI_TIDAK_SAH', 'Tujuan 1–300 karakter, konteks maksimal 1.500.');
      } else if (jenis === 'susun-panduan' && !teks(topik, 300)) {
        return gagal(400, 'MISI_TIDAK_SAH', 'Topik 1–300 karakter.');
      }
      if (!Array.isArray(sumber) || sumber.length > 3 || sumber.some((s) => !/^https:\/\//.test(s))) {
        return gagal(400, 'SUMBER_TIDAK_SAH', 'Sumber maksimal 3 alamat https.');
      }
      if (r.m2) {
        const sp = r.spesies().find((s) => s.id === item.agen.template.id);
        if (!sp.misi_keahlian.includes(jenis)) {
          const tepat = r.spesies().find((s) => s.misi_keahlian.includes(jenis));
          return gagal(400, 'MISI_BUKAN_KEAHLIAN', `${sp.nama} tidak mengerjakan misi ini.${tepat ? ` Coba ${tepat.nama}.` : ''}`, { saran: tepat?.id ?? null });
        }
        const aktif = [...r.misi.values()].some((x) => x.instance_id === instance_id && !['selesai', 'selesai_tanpa_temuan', 'gagal', 'dibatalkan'].includes(x.status));
        if (aktif) return gagal(409, 'AGEN_SIBUK', `${sp.nama} masih mengerjakan misi lain.`);
      }
      let rantai = [];
      if (rujuk_misi !== undefined && rujuk_misi !== null) {
        const ruj = r.misi.get(rujuk_misi);
        // Another player's mission reads as missing (404, not 403): ids are not an oracle.
        if (!r.m2 || !ruj || ruj.pemilik !== r.pemain) return gagal(404, 'TIDAK_ADA', 'Misi rujukan tidak ditemukan.');
        if (!SELESAI.has(ruj.status) || ruj.putusan !== 'setujui') return gagal(409, 'RUJUKAN_BELUM_DISETUJUI', 'Hasil rujukan harus selesai dan disetujui dulu.');
        rantai = [...(ruj.rantai ?? [ruj.id])];
        if (rantai.length >= 4) return gagal(400, 'RANTAI_TERLALU_PANJANG', 'Rantai misi sudah 4. Mulai misi baru tanpa rujukan.');
      }
      const misi = { id: idBaru('m_'), pemilik: r.pemain, instance_id, jenis, sumber, status: 'antre', posisi: 1, eta_detik: 90, langkah: { nama: 'terima', ke: 1, dari: 6 }, label_otak: 'milik sendiri', dibuat: '2026-09-26T15:00:00Z' };
      if (jenis === 'riset-sumber') misi.pertanyaan = pertanyaan;
      if (jenis === 'pecah-tugas') { misi.tujuan = tujuan; if (konteks) misi.konteks = konteks; }
      if (jenis === 'susun-panduan') misi.topik = topik;
      if (rujuk_misi) misi.rujuk_misi = rujuk_misi;
      misi.rantai = [...rantai, misi.id];
      r.misi.set(misi.id, misi);
      return json(200, { ok: true, misi: { id: misi.id, status: misi.status, posisi: misi.posisi, eta_detik: misi.eta_detik } });
    }
    if (r.m2 && metode === 'POST' && (m = /^\/misi\/([A-Za-z0-9_-]+)\/persetujuan$/.exec(jalur))) {
      const misi = r.misi.get(m[1]);
      if (!misi || misi.pemilik !== r.pemain) return gagal(404, 'MISI_TIDAK_ADA', 'Misi tidak ditemukan.');
      if (misi.status !== 'menunggu_persetujuan') return gagal(409, 'TIDAK_MENUNGGU', 'Misi ini tidak sedang menunggu persetujuan.');
      if (typeof isi?.setuju !== 'boolean') return gagal(400, 'PERSETUJUAN_TIDAK_SAH', 'Pilih setuju atau tolak.');
      misi.status = isi.setuju ? 'berjalan' : 'dibatalkan';
      misi.persetujuan = { ...misi.persetujuan, setuju: isi.setuju };
      return json(200, { ok: true, misi });
    }
    if (metode === 'GET' && jalur === '/misi') {
      const inst = u.searchParams.get('instance_id');
      return json(200, { ok: true, misi: [...r.misi.values()].filter((x) => (!x.pemilik || x.pemilik === r.pemain) && (!inst || x.instance_id === inst)).slice(-10).reverse() });
    }
    if (metode === 'GET' && (m = /^\/misi\/([A-Za-z0-9_-]+)$/.exec(jalur))) {
      const misi = r.misi.get(m[1]);
      if (!misi || (misi.pemilik && misi.pemilik !== r.pemain)) return gagal(404, 'MISI_TIDAK_ADA', 'Misi tidak ditemukan.');
      const { pemilik, rantai, ...terlihat } = misi;
      return json(200, { ok: true, misi: r.m2 ? { ...terlihat, rantai } : terlihat });
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
