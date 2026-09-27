// ═══════════════════════════════════════════════════════
// tests/misiKlien.test.mjs — missions against the locked contract (docs/sprint/SPRINT-01.md).
//
// Guarded (mutation-proven, docs/sprint/LOG-B-dunia-klien.md):
// - a pasted API key never leaves the browser (in the question, mid-sentence, or in a URL);
// - input limits: 300 characters, three https addresses;
// - polling every 3 s, none while the tab is hidden, stop at a final status or the time limit,
//   back off while the network is down and say so once.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MisiKlien, periksaMasukanMisi, adaKunci, JENIS_MISI } from '../src/party/MisiKlien.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';
import { jamPalsu, dokumenPalsu, kuras } from './bantu/jamPalsu.mjs';

// Fake credentials are assembled at runtime so the repo scanner stays clean (AGENTS.md §2.4).
const kunciPalsu = () => ['sk', 'or', 'v1', 'a1b2c3d4'.repeat(6)].join('-');

function siapkan(opsi = {}) {
  const rt = buatRuntimePalsu({ masuk: 'usr-misi', ...opsi });
  const sari = rt.rekrutLangsung('sari');
  const jam = jamPalsu(1_000_000);
  const dokumen = dokumenPalsu();
  const misi = new MisiKlien({ api: buatApiRuntime({ fetch: rt.fetch }), jam, dokumen });
  const tanya = () => rt.panggilan.filter((p) => p.metode === 'GET' && p.jalur.startsWith('/rt/api/misi/')).length;
  return { rt, sari, jam, dokumen, misi, tanya };
}

test('a mission is sent exactly as the contract says', async () => {
  const { rt, sari, misi } = siapkan();
  const hasil = await misi.mulai(sari.instance_id, { pertanyaan: '  harga cabai rawit di Bogor minggu ini ', sumber: ['https://contoh.go.id/harga', ''] });
  assert.equal(hasil.status, 'antre');
  const kirim = rt.tulisan().at(-1);
  assert.equal(kirim.jalur, '/rt/api/misi');
  assert.deepEqual(kirim.isi, { instance_id: sari.instance_id, jenis: JENIS_MISI, pertanyaan: 'harga cabai rawit di Bogor minggu ini', sumber: ['https://contoh.go.id/harga'] });
  assert.equal(kirim.headers['x-galantara-world'], '1');
});

test('a pasted key is refused before any request: whole text, mid-sentence, in a URL, in a note', async () => {
  const { rt, sari, misi } = siapkan();
  const k = kunciPalsu();
  const kasus = [
    { pertanyaan: k },
    { pertanyaan: `tolong cek saldo akun ini ${k} ya` },
    { pertanyaan: 'baris pertama\nBearer abcdefghijklmnop' },
    { pertanyaan: 'riset harga', sumber: [`https://api.contoh.com/v1/data?key=${k}`] },
    { pertanyaan: 'riset harga', sumber: [`https://contoh.com/${k}/data`] },
  ];
  for (const masukan of kasus) {
    const err = await misi.mulai(sari.instance_id, masukan).catch((e) => e);
    assert.equal(err.kode, 'KUNCI_DITEMPEL', JSON.stringify(masukan).slice(0, 60));
    assert.match(err.pesan, /Simpan di Kantor/);
    assert.ok(!err.pesan.includes(k), 'the key is never echoed back');
  }
  const err = await misi.putuskan('m_1', 'perbaiki', `pakai kunci ${k}`).catch((e) => e);
  assert.equal(err.kode, 'KUNCI_DITEMPEL');
  assert.equal(rt.panggilan.length, 0, 'nothing left the browser');
  // Control: ordinary text with "sk" inside a word passes.
  assert.equal(adaKunci('diskusi tentang risk-based pricing di Bogor'), false);
});

test('input limits: 300 characters, three https addresses, no credentials in URLs', () => {
  assert.throws(() => periksaMasukanMisi({ pertanyaan: '   ' }), /Tulis dulu/);
  assert.throws(() => periksaMasukanMisi({ pertanyaan: 'x'.repeat(301) }), /Maksimal 300/);
  assert.equal(periksaMasukanMisi({ pertanyaan: 'x'.repeat(300) }).pertanyaan.length, 300);
  const empat = ['https://a.id', 'https://b.id', 'https://c.id', 'https://d.id'];
  assert.throws(() => periksaMasukanMisi({ pertanyaan: 'ok', sumber: empat }), /Maksimal 3 alamat/);
  assert.throws(() => periksaMasukanMisi({ pertanyaan: 'ok', sumber: ['http://tidak-aman.id'] }), /https:\/\//);
  assert.throws(() => periksaMasukanMisi({ pertanyaan: 'ok', sumber: ['contoh.go.id'] }), /Sumber 1/);
  // Credentials in a source URL are refused. The fake user:pass is assembled at runtime so secret
  // scanners (GitGuardian "Basic Auth String") do not see a literal.
  assert.throws(() => periksaMasukanMisi({ pertanyaan: 'ok', sumber: [`https://${['pemakai', 'palsu'].join(':')}@contoh.id/x`] }), /kata sandi/);
});

test('polls every 3 s, reports each status, and stops at a final one', async () => {
  const { rt, sari, jam, misi, tanya } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  const kabar = [];
  misi.pantau(id, (k) => kabar.push(k));
  await kuras();
  assert.equal(tanya(), 1, 'looks immediately');
  await jam.maju(2999);
  assert.equal(tanya(), 1);
  rt.misi.get(id).status = 'berjalan';
  await jam.maju(1);
  assert.equal(tanya(), 2);
  rt.misi.get(id).status = 'selesai';
  rt.misi.get(id).laporan = { schema: 'galantara.laporan-misi/v1', ringkasan: [], sumber: [] };
  await jam.maju(3000);
  assert.deepEqual(kabar.filter((k) => k.jenis === 'status').map((k) => k.misi.status), ['antre', 'berjalan', 'selesai']);
  await jam.maju(60_000);
  assert.equal(tanya(), 3, 'no request after a final status');
  assert.equal(misi.jumlahDipantau, 0);
});

test('no requests while the tab is hidden; one right away when it comes back', async () => {
  const { sari, jam, dokumen, misi, tanya } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  misi.pantau(id, () => {});
  // Hidden while the first request is in flight: its answer must not arm a timer.
  dokumen.setelTersembunyi(true);
  await kuras();
  assert.equal(tanya(), 1);
  assert.equal(jam.tertunda, 0, 'no timer left running in a pocket');
  await jam.maju(5 * 60_000);
  assert.equal(tanya(), 1, 'not a single request while hidden');
  dokumen.setelTersembunyi(false);
  await kuras();
  assert.equal(tanya(), 2, 'looks again as soon as it is visible');
  await jam.maju(3000);
  assert.equal(tanya(), 3, 'and keeps the 3 s rhythm');
});

test('watching that starts in a hidden tab waits until the tab is visible', async () => {
  const { sari, dokumen, misi, tanya } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  dokumen.setelTersembunyi(true);
  misi.pantau(id, () => {});
  await kuras();
  assert.equal(tanya(), 0);
  dokumen.setelTersembunyi(false);
  await kuras();
  assert.equal(tanya(), 1);
});

test('gives up watching after the time limit, without claiming the mission failed', async () => {
  const { rt, sari, jam, misi } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  rt.misi.get(id).status = 'berjalan';
  const kabar = [];
  misi.pantau(id, (k) => kabar.push(k));
  await jam.maju(10 * 60_000 + 3000);
  const akhir = kabar.at(-1);
  assert.equal(akhir.jenis, 'habis');
  assert.equal(akhir.galat.kode, 'WAKTU_MISI_HABIS');
  assert.match(akhir.galat.pesan, /masih bekerja/);
  assert.equal(misi.jumlahDipantau, 0);
});

test('network down: backs off 6, 12, 24, 30 s, says so once, resumes when it answers', async () => {
  const { rt, sari, jam, misi, tanya } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  const kabar = [];
  misi.pantau(id, (k) => kabar.push(k.jenis));
  await kuras();
  rt.jaringan = 'mati';
  const waktu = [];
  let terakhir = tanya();
  const t0 = jam.sekarang();
  for (let i = 0; i < 90; i++) {
    await jam.maju(1000);
    if (tanya() !== terakhir) { terakhir = tanya(); waktu.push((jam.sekarang() - t0) / 1000); }
  }
  // 3 (normal) → +6 → +12 → +24 → +30 (cap): the first failure is at 3 s.
  assert.deepEqual(waktu.slice(0, 5), [3, 9, 21, 45, 75]);
  assert.equal(kabar.filter((k) => k === 'terputus').length, 1, 'said once, not on every retry');
  rt.jaringan = 'hidup';
  await jam.maju(30_000);
  assert.equal(kabar.filter((k) => k === 'tersambung').length, 1);
  const setelah = tanya();
  await jam.maju(3000);
  assert.equal(tanya(), setelah + 1, 'back to the normal 3 s rhythm');
});

test('signed out or mission gone: stop and hand the error to the UI', async () => {
  const { rt, sari, jam, misi, tanya } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  const kabar = [];
  misi.pantau(id, (k) => kabar.push(k));
  await kuras();
  rt.pemain = null;
  await jam.maju(3000);
  assert.equal(kabar.at(-1).jenis, 'galat');
  assert.equal(kabar.at(-1).galat.kode, 'BELUM_MASUK');
  const n = tanya();
  await jam.maju(60_000);
  assert.equal(tanya(), n);
});

test('routes not deployed yet (stream A) read as "not live yet", not as a crash', async () => {
  const { sari, misi } = siapkan({ misiAda: false });
  const err = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' }).catch((e) => e);
  assert.equal(err.kode, 'MISI_BELUM_ADA');
  assert.match(err.pesan, /belum aktif/);
  assert.deepEqual(await misi.daftar(sari.instance_id), []);
  assert.equal(await misi.statusOtak(), null);
});

test('verdicts: only the three known ones, with an optional clean note', async () => {
  const { rt, sari, misi } = siapkan();
  const { id } = await misi.mulai(sari.instance_id, { pertanyaan: 'harga cabai' });
  rt.misi.get(id).status = 'selesai';
  await assert.rejects(misi.putuskan(id, 'terima'), (e) => e.kode === 'PUTUSAN_TIDAK_SAH');
  const hasil = await misi.putuskan(id, 'perbaiki', 'tambahkan harga di pasar tradisional');
  assert.equal(hasil.putusan, 'perbaiki');
  assert.deepEqual(rt.tulisan().at(-1).isi, { putusan: 'perbaiki', catatan: 'tambahkan harga di pasar tradisional' });
});
