import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timku, modelTimku, tampilanTimku } from '../src/ui/gw/Timku.js';
import { teksPohon, cariTombol, cariSemua } from '../src/ui/gw/pohon.js';
import { JEDA_SETELAH_TEKAN_MS } from '../src/ui/Sheet.js';
import { DuniaParty } from '../src/party/DuniaParty.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';

const agen = (status = 'siap', x = {}) => ({ instance_id: 'ag_sari', id: 'sari', nama: 'Sari',
  kelas: 'Penjejak intelijen', status, brain: { provider: 'ollama', model: 'lokal' }, bisaMisi: true, ...x });
const keadaan = (x = {}) => ({ masuk: true, termuat: true, maks: 4, anggota: [agen(), null, null, null], ...x });

test('Timku takes the four slots from the contract; no fabricated workers', () => {
  const m = modelTimku(keadaan());
  assert.equal(m.jumlah, 1); assert.equal(m.maks, 4); assert.equal(m.anggota.length, 1);
  assert.equal(m.kosong, 3); assert.match(m.anggota[0].otak, /Milik sendiri/);
  assert.equal(modelTimku(keadaan({ anggota: [null, null, null, null] })).jumlah, 0);
  assert.equal(modelTimku(keadaan({ maks: 999, anggota: Array.from({ length: 9 }, () => agen()) })).jumlah, 4);
  assert.equal(modelTimku().maks, 4);
});

// Tiny DOM stand-in, like sheet.test.mjs: counts updates and models focus, not browser layout.
function dokumenTimku() {
  const doc = { activeElement: null };
  const buat = tag => ({
    tagName: tag.toUpperCase(), anak: [], attr: {}, dengar: {}, textContent: '', renderCount: 0,
    classList: { nilai: new Set(), toggle(k, on) { on ? this.nilai.add(k) : this.nilai.delete(k); },
      remove(k) { this.nilai.delete(k); }, contains(k) { return this.nilai.has(k); } },
    setAttribute(k, v) { this.attr[k] = v; }, getAttribute(k) { return this.attr[k] ?? null; },
    appendChild(a) { this.anak.push(a); return a; }, append(...a) { this.anak.push(...a); },
    replaceChildren(...a) { this.anak = a; this.renderCount++; },
    addEventListener(n, fn) { (this.dengar[n] ??= []).push(fn); },
    kirim(n, extra = {}) { for (const fn of this.dengar[n] ?? []) fn({ target: this, stopPropagation() {}, ...extra }); },
    contains(a) { return this === a || this.anak.some(x => x.contains?.(a)); },
    querySelectorAll() { return this.anak.flatMap(x => [...(x.attr?.['data-timku-key'] ? [x] : []), ...(x.querySelectorAll?.() ?? [])]); },
    focus() { doc.activeElement = this; },
  });
  const host = buat('aside');
  const elemen = { 'gw-timku': host, 'harian-pill': buat('button'), 'harian-kartu': buat('div') };
  return Object.assign(doc, { createElement: buat, createTextNode: teks => ({ textContent: teks }), getElementById: id => elemen[id] ?? null });
}

test('unchanged updates do not replace DOM, and changed updates preserve the exact agent focus', () => {
  const doc = dokumenTimku(); const hud = new Timku(doc, {});
  hud.perbarui(keadaan());
  const before = hud.isi.renderCount;
  hud.perbarui(keadaan()); assert.equal(hud.isi.renderCount, before);
  hud.isi.querySelectorAll().find(x => x.attr['data-timku-key'] === 'agen:ag_sari').focus();
  hud.perbarui(keadaan({ anggota: [agen('hasil_siap')] }));
  assert.equal(doc.activeElement.attr['data-timku-key'], 'agen:ag_sari');
  hud.perbarui(keadaan({ anggota: [agen('siap', { instance_id: 'ag_maya' })] }));
  assert.equal(doc.activeElement, hud.kepala, 'removal never moves focus to a different agent');
});

test('a status arriving under a finger waits for the click; session loss clears names immediately', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const hud = new Timku(dokumenTimku(), {});
  hud.perbarui(keadaan()); const before = hud.isi.renderCount;
  hud.host.kirim('pointerdown');
  hud.perbarui(keadaan({ anggota: [agen('hasil_siap')] }));
  hud.host.kirim('pointerup');
  t.mock.timers.tick(JEDA_SETELAH_TEKAN_MS - 1);
  assert.equal(hud.isi.renderCount, before);
  t.mock.timers.tick(1); assert.equal(hud.isi.renderCount, before + 1);
  hud.host.kirim('pointerdown');
  hud.perbarui(keadaan({ anggota: [agen('bekerja')] }));
  hud.perbarui(keadaan({ masuk: false }));
  assert.equal(hud.ringkas.textContent, 'Mulai perjalananmu');
  hud.host.kirim('pointercancel'); t.mock.timers.tick(JEDA_SETELAH_TEKAN_MS);
  assert.equal(hud.ringkas.textContent, 'Mulai perjalananmu', 'the queued private view never returns');
});

test('toggle/escape use one stable button and preserve keyboard semantics', () => {
  const doc = dokumenTimku(); const hud = new Timku(doc, {}, { terbuka: true });
  const button = hud.kepala;
  assert.equal(button.attr['aria-expanded'], 'true');
  button.kirim('click'); assert.equal(hud.isi.hidden, true);
  button.kirim('click'); assert.equal(hud.isi.hidden, false);
  hud.host.kirim('keydown', { key: 'Escape' });
  assert.equal(doc.activeElement, button); assert.equal(button.attr['aria-expanded'], 'false');
  assert.equal(hud.kepala, button);
});

test('daily challenge and Timku never leave two cards open on the same rail', () => {
  const doc = dokumenTimku(); const hud = new Timku(doc, {}, { terbuka: true });
  const card = doc.getElementById('harian-kartu');
  card.classList.toggle('on', true);
  doc.getElementById('harian-pill').kirim('click');
  assert.equal(hud.kepala.attr['aria-expanded'], 'false');
  assert.equal(hud.isi.hidden, true);
  hud.kepala.kirim('click');
  assert.equal(hud.kepala.attr['aria-expanded'], 'true');
  assert.equal(card.classList.contains('on'), false);
});

test('real DuniaParty glue projects runtime data, recovers after load failure and clears revoked sessions', async () => {
  const rt = buatRuntimePalsu({ masuk: 'pemain-timku' });
  const dp = new DuniaParty({ avatar: { getPosition: () => ({ x: 0, z: 0 }) } }, {
    api: buatApiRuntime({ fetch: rt.fetch }), penyimpanan: null,
    doc: { getElementById: () => null }, lokal: true,
  });
  let actual;
  dp.sheet = { terbuka: false, umumkan() {} };
  dp.timku = { perbarui: k => { actual = modelTimku(k); } };
  await dp.muat(); await dp.party.rekrut('sari'); dp._segarkan();
  assert.equal(actual.jumlah, 1);
  const id = dp.party.anggota().find(Boolean).agen.instance_id;
  dp._kabarMisi(id, { jenis: 'status', misi: { id: 'm-test', status: 'selesai', label_otak: 'SIMULASI' } });
  assert.equal(actual.anggota[0].aksi, 'hasil'); assert.match(actual.anggota[0].otak, /SIMULASI/);
  dp._kabarMisi(id, { jenis: 'terputus' });
  assert.match(actual.anggota[0].status.label, /belum terverifikasi/);
  rt.jaringan = 'mati'; await dp.muat(); assert.equal(actual.mode, 'terputus');
  rt.jaringan = 'hidup'; await dp.muat(); assert.equal(actual.mode, 'siap');
  dp._kabarMisi(id, { jenis: 'galat', galat: { kode: 'BELUM_MASUK' } });
  assert.equal(actual.mode, 'tamu'); assert.equal(actual.jumlah, 0);
});

test('guest/cache/loading never present cached members as a verified live team', () => {
  for (const x of [{ masuk: false }, { masuk: false, pratinjau: true }, { termuat: false }]) {
    const m = modelTimku(keadaan(x));
    assert.equal(m.anggota.length, 0); assert.notEqual(m.mode, 'siap');
    assert.doesNotMatch(teksPohon(tampilanTimku(m)), /Beri misi|Sedang bekerja/);
  }
});

test('each runtime status maps to a truthful action, unknown status is not ready', () => {
  const expected = { siap: 'misi', bekerja: 'markas', antre: 'markas', menunggu_otak: 'otak',
    menunggu_persetujuan: 'izin', hasil_siap: 'hasil', gagal: 'hasil', status_baru: 'markas' };
  for (const [status, aksi] of Object.entries(expected)) {
    const a = modelTimku(keadaan({ anggota: [agen(status)] })).anggota[0];
    assert.equal(a.aksi, aksi, status);
    if (status === 'status_baru') assert.match(a.status.label, /belum dikenali/i);
  }
});

test('disconnect/load failure/per-agent polling failure suppress work and completion claims', () => {
  for (const x of [{ terputus: true }, { gagalMuat: true }, { galatAgen: ['ag_sari'] }]) {
    const m = modelTimku(keadaan({ ...x, anggota: [agen('hasil_siap')] }));
    assert.equal(m.anggota[0].aksi, 'markas');
    assert.match(m.anggota[0].status.label, /belum terverifikasi/i);
    assert.doesNotMatch(teksPohon(tampilanTimku(m)), /Hasil siap|Buka hasil/);
  }
});

test('simulation evidence from a mission overrides the configured brain label', () => {
  const m = modelTimku(keadaan({ simulasiAgen: ['ag_sari'] }));
  assert.match(m.anggota[0].otak, /SIMULASI/);
  assert.doesNotMatch(m.anggota[0].otak, /Milik sendiri/);
  assert.match(modelTimku(keadaan({ anggota: [agen('siap', { brain: { provider: 'simulasi' } })] })).anggota[0].otak, /SIMULASI/);
});

test('missing brain and unavailable mission skill go to existing configuration, not an invalid mission', () => {
  assert.equal(modelTimku(keadaan({ anggota: [agen('siap', { brain: null })] })).anggota[0].aksi, 'otak');
  assert.equal(modelTimku(keadaan({ anggota: [agen('siap', { bisaMisi: false })] })).anggota[0].aksi, 'markas');
});

test('projection excludes credentials, corpus, model metadata, and arbitrary runtime fields', () => {
  const m = modelTimku(keadaan({ anggota: [agen('siap', {
    brain: { provider: 'ollama', model: 'PRIVATE_MODEL', vault_ref: 'PRIVATE_REF', token: 'PRIVATE_TOKEN' },
    corpus: 'PRIVATE_CORPUS', extra: 'PRIVATE_EXTRA',
  })] }));
  assert.doesNotMatch(JSON.stringify(m), /PRIVATE_/);
});

test('untrusted names are text leaves, never HTML or attribute/selector interpolations', () => {
  const name = '<img src=x onerror=alert(1)>';
  const view = tampilanTimku(modelTimku(keadaan({ anggota: [agen('siap', { julukan: name })] })));
  assert.match(teksPohon(view), /<img src=x onerror=alert\(1\)>/);
  assert.equal(cariSemua(view, n => n.tag === 'img' || n.tag === 'script').length, 0);
});

test('a result action delegates exactly once to the existing owner, with the instance ID', () => {
  const calls = [];
  const view = tampilanTimku(modelTimku(keadaan({ anggota: [agen('hasil_siap')] })), {
    hasil: id => calls.push(id),
  });
  cariTombol(view, 'Buka hasil').props.on.click();
  assert.deepEqual(calls, ['ag_sari']);
  assert.match(teksPohon(view), /AI/);
});

test('failed mission has a recovery action, never offered while status is unverified', () => {
  const calls = [];
  const view = tampilanTimku(modelTimku(keadaan({ anggota: [agen('gagal')] })), { misi: id => calls.push(id) });
  cariTombol(view, 'Beri misi baru').props.on.click();
  assert.deepEqual(calls, ['ag_sari']);
  const disconnected = tampilanTimku(modelTimku(keadaan({ terputus: true, anggota: [agen('gagal')] })));
  assert.equal(cariTombol(disconnected, 'Beri misi baru'), null);
});

test('empty state points to exploration and the existing recruitment book', () => {
  let calls = 0;
  const view = tampilanTimku(modelTimku(keadaan({ anggota: [], berikut: { nama: 'Sari' } })), { buku: () => calls++ });
  assert.match(teksPohon(view), /Sari/);
  cariTombol(view, 'Temukan agen').props.on.click();
  assert.equal(calls, 1);
});
