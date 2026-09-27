// ═══════════════════════════════════════════════════════
// tests/partyKerja.test.mjs — M2 "Party kerja" in the world client (SPRINT-02 stream B items 1–3).
//
// Class mission sheets (Budi: tujuan + konteks; Maya: topik + sumber), "Teruskan ke rekan" from an
// approved result (rujuk_misi), the Persetujuan sheet for a paid tool, and Pengalaman on the agent
// card. The fake runtime follows the locked SPRINT-02 contract (tests/bantu/runtimePalsu.mjs, m2).
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuniaParty } from '../src/party/DuniaParty.js';
import { MisiKlien, periksaMasukanMisi, JENIS } from '../src/party/MisiKlien.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { lepasKaitDunia } from '../src/party/kaitDunia.js';
import { cariTombol, cariSemua, teksPohon } from '../src/ui/gw/pohon.js';
import {
  tampilanMisi, tampilanHasil, tampilanPersetujuan, tampilanMarkas, bacaFormMisi, teksPengalaman, teksBiaya,
} from '../src/ui/gw/tampilan.js';
import { labelOtak } from '../src/party/PartyKlien.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';
import { jamPalsu, dokumenPalsu, kuras } from './bantu/jamPalsu.mjs';

const OTAK = { provider: 'migancore', model: 'qwen3:4b-instruct-2507' };
const kunciPalsu = () => ['sk', 'or', 'v1', 'c'.repeat(40)].join('-');

function siapkan(opsi = {}) {
  const rt = buatRuntimePalsu({ m2: true, ...opsi });
  const perintah = [];
  const toast = [];
  const npc = (id) => ({ x: 0, z: 0, data: { id }, mesh: {}, perilaku: { keadaan: 'keliling' } });
  const game = {
    npcs: { get: npc, perintah: (id, p) => perintah.push([id, p.jenis]), terlihat: true },
    avatar: { getPosition: () => ({ x: 0, z: 0 }) },
    toast: { show: (m) => toast.push(m) },
  };
  const api = buatApiRuntime({ fetch: rt.fetch });
  const dp = new DuniaParty(game, { api, penyimpanan: null, doc: { getElementById: () => null }, lokal: true });
  const jam = jamPalsu(1_000_000);
  dp.misi = new MisiKlien({ api, jam, dokumen: dokumenPalsu() });
  const sheet = {
    riwayat: [], terbuka: false, nama: null, pohon: null,
    buka(nama, pohon) { this.riwayat.push(nama); this.nama = nama; this.pohon = pohon; this.terbuka = true; },
    ganti(nama, pohon) { if (this.nama === nama) this.pohon = pohon; return true; },
    tutup() { this.terbuka = false; this.nama = null; },
    umumkan() {}, cari() { return null; },
  };
  dp.sheet = sheet;
  const tekan = async (label) => {
    const t = cariTombol(sheet.pohon, label);
    assert.ok(t, `button "${label}" in sheet "${sheet.nama}": ${teksPohon(sheet.pohon).slice(0, 300)}`);
    await t.props.on.click();
    await kuras();
  };
  const kirimForm = async (elements) => {
    const form = cariSemua(sheet.pohon, (n) => n.tag === 'form')[0];
    assert.ok(form, `a form in sheet "${sheet.nama}"`);
    form.props.on.submit({ preventDefault() {}, target: { elements } });
    await kuras();
  };
  return { rt, dp, game, perintah, toast, jam, sheet, tekan, kirimForm };
}

async function masukDenganParty(k, ...spesies) {
  await k.dp.muat();
  await k.dp.party.masukDev('usr-kerja');
  for (const sp of spesies) await k.dp.party.rekrut(sp);
  return Object.fromEntries(spesies.map((sp) => [sp, k.dp.party.agenDariSpesies(sp).agen.instance_id]));
}

const nilai = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

// ── Item 1: one mission form per class ────────────────────

test('input rules per kind are checked before any request', () => {
  assert.deepEqual(periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: ' buka warung ', konteks: '' }), { jenis: 'pecah-tugas', tujuan: 'buka warung' });
  assert.deepEqual(periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: 'x', konteks: 'modal 2 juta' }), { jenis: 'pecah-tugas', tujuan: 'x', konteks: 'modal 2 juta' });
  assert.throws(() => periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: '' }), /Tulis dulu tujuan/);
  assert.throws(() => periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: 'x'.repeat(301) }), /Tujuan terlalu panjang/);
  assert.throws(() => periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: 'x', konteks: 'k'.repeat(1501) }), /Konteks terlalu panjang \(1501/);
  assert.equal(periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: 'x', konteks: 'k'.repeat(1500) }).konteks.length, 1500);
  // A key pasted in the context (the long field) is caught like everywhere else.
  assert.throws(() => periksaMasukanMisi({ jenis: 'pecah-tugas', tujuan: 'x', konteks: `pakai ${kunciPalsu()} ya` }), (e) => e.kode === 'KUNCI_DITEMPEL');

  assert.deepEqual(periksaMasukanMisi({ jenis: 'susun-panduan', topik: 'daftar UMKM', sumber: ['https://a.id', ' '] }), { jenis: 'susun-panduan', topik: 'daftar UMKM', sumber: ['https://a.id'] });
  assert.throws(() => periksaMasukanMisi({ jenis: 'susun-panduan', topik: 'x', sumber: [] }), /minimal satu sumber/);
  assert.throws(() => periksaMasukanMisi({ jenis: 'susun-panduan', topik: 'x', sumber: ['http://a.id'] }), /diawali https/);
  assert.throws(() => periksaMasukanMisi({ jenis: 'susun-panduan', topik: 'x', sumber: ['https://a', 'https://b', 'https://c', 'https://d'] }), /Maksimal 3/);
  // Building on a colleague's result, a guide needs no source of its own.
  assert.deepEqual(periksaMasukanMisi({ jenis: 'susun-panduan', topik: 'x', sumber: [], rujuk_misi: 'm_00000001' }), { jenis: 'susun-panduan', topik: 'x', sumber: [], rujuk_misi: 'm_00000001' });
  assert.throws(() => periksaMasukanMisi({ jenis: 'riset-sumber', pertanyaan: 'x', rujuk_misi: '../x' }), (e) => e.kode === 'ID_TIDAK_SAH');
  assert.throws(() => periksaMasukanMisi({ jenis: 'curi-data', pertanyaan: 'x' }), /Jenis misi tidak dikenal/);
});

test('Budi\'s form asks tujuan + konteks; Maya\'s asks topik + sources; neither has a password field', () => {
  const budi = tampilanMisi({ nama: 'Budi', brain: OTAK, jenis: JENIS.PECAH }, {});
  const t = teksPohon(budi);
  assert.match(t, /Jenis: Pecah tugas jadi langkah/);
  const area = cariSemua(budi, (n) => n.tag === 'textarea');
  assert.deepEqual(area.map((a) => [a.props.attr.name, a.props.attr.maxlength]), [['tujuan', 300], ['konteks', 1500]]);
  assert.equal(cariSemua(budi, (n) => n.tag === 'input').length, 0, 'no source fields for steps');
  assert.deepEqual(bacaFormMisi({ elements: nilai({ tujuan: 'a', konteks: 'b' }) }, 'pecah-tugas'), { jenis: 'pecah-tugas', tujuan: 'a', konteks: 'b' });

  const maya = tampilanMisi({ nama: 'Maya', brain: OTAK, jenis: JENIS.PANDUAN }, {});
  assert.match(teksPohon(maya), /Jenis: Susun panduan bersumber/);
  assert.deepEqual(cariSemua(maya, (n) => n.tag === 'textarea').map((a) => a.props.attr.name), ['topik']);
  const url = cariSemua(maya, (n) => n.tag === 'input');
  assert.equal(url.length, 3);
  assert.ok(url.every((u) => u.props.attr.type === 'url'));
  assert.deepEqual(bacaFormMisi({ elements: nilai({ topik: 't', sumber1: 'https://a.id', sumber2: '', sumber3: '' }) }, 'susun-panduan'), { jenis: 'susun-panduan', topik: 't', sumber: ['https://a.id'] });
  for (const v of [budi, maya]) assert.equal(cariSemua(v, (n) => n.props?.attr?.type === 'password').length, 0);
});

test('Budi gets a pecah-tugas mission through his own form; the body carries only his fields', async (t) => {
  t.after(() => lepasKaitDunia());
  const k = siapkan();
  const { budi } = await masukDenganParty(k, 'budi');
  assert.equal(k.dp.syarat('bisa_misi', { id: 'budi' }), true, 'species v2: Budi has a mission skill');
  k.dp.bukaMarkas();
  await k.tekan('Beri misi');
  assert.equal(k.sheet.nama, 'misi');
  assert.match(teksPohon(k.sheet.pohon), /Tujuan.*Konteks/s);
  await k.kirimForm(nilai({ tujuan: 'buka warung kopi', konteks: 'modal 5 juta' }));
  const kirim = k.rt.tulisan().find((p) => p.jalur === '/rt/api/misi');
  assert.deepEqual(kirim.isi, { instance_id: budi, jenis: 'pecah-tugas', tujuan: 'buka warung kopi', konteks: 'modal 5 juta' });
  assert.equal(k.sheet.terbuka, false);
  assert.match(k.toast.at(-1), /Budi berangkat ke meja kerja/);
});

test('a kind outside the agent\'s skill: the runtime\'s suggestion arrives as a card with buttons', async () => {
  const k = siapkan();
  const { sari } = await masukDenganParty(k, 'sari');
  await k.dp.kirimMisi(sari, { jenis: 'pecah-tugas', tujuan: 'rencana' });
  assert.equal(k.sheet.nama, 'misi');
  const teks = teksPohon(k.sheet.pohon);
  assert.match(teks, /Sari tidak mengerjakan misi ini\. Coba Budi\./);
  assert.ok(cariTombol(k.sheet.pohon, 'Buka Markas'));
});

test('Hasil per kind: steps with their basis; guide sections with source numbers', () => {
  const langkah = tampilanHasil({ nama: 'Budi', misi: {
    id: 'm_1', jenis: 'pecah-tugas', status: 'selesai', tujuan: 'buka warung',
    laporan: { langkah: [
      { ke: 1, teks: 'Hitung modal', perkiraan_menit: 30, dasar: ['tujuan', 'konteks'] },
      { ke: 2, teks: 'Cek harga cabai', dasar: ['T1'] },
    ], ditolak: [{ teks: 'Sewa ruko di Jakarta' }], temuan: [{ id: 'T1', sumber: 'S1' }], sumber: [{ id: 'S1', url: 'https://contoh.go.id/a', judul: 'Harga' }] },
  } }, {});
  const t = teksPohon(langkah);
  assert.match(t, /Rencana kerja: buka warung/);
  assert.match(t, /Hitung modal ± 30 mnt · dasar: tujuanmu, konteksmu/);
  assert.match(t, /Cek harga cabai dasar: temuan \[1\]/);
  assert.match(t, /1 langkah dibuang karena tidak menyebut dasarnya/);

  const tanpaSumber = teksPohon(tampilanHasil({ nama: 'Budi', misi: { id: 'm_2', jenis: 'pecah-tugas', status: 'selesai', tujuan: 'x', laporan: { langkah: [{ teks: 'a', dasar: ['tujuan'] }] } } }, {}));
  assert.match(tanpaSumber, /disusun dari tujuan dan konteks/);
  assert.doesNotMatch(tanpaSumber, /Perlakukan ini sebagai dugaan/, 'steps from the player\'s own goal are not a sourceless claim');

  const panduan = tampilanHasil({ nama: 'Maya', misi: {
    id: 'm_3', jenis: 'susun-panduan', status: 'selesai', topik: 'daftar UMKM',
    laporan: { bagian: [{ judul: 'Syarat', isi: 'Siapkan KTP.', rujukan: ['T2'] }], temuan: [{ id: 'T1', sumber: 'S1' }, { id: 'T2', sumber: 'S2' }],
      sumber: [{ id: 'S1', url: 'https://a.go.id' }, { id: 'S2', url: 'https://b.go.id' }] },
  } }, {});
  assert.match(teksPohon(panduan), /Panduan: daftar UMKM.*Syarat Siapkan KTP\. \[2\]/s);
});

// ── Item 2: "Teruskan ke rekan" ───────────────────────────

async function selesaikan(k, instanceId, laporan) {
  await k.jam.maju(0);
  const m = [...k.rt.misi.values()].filter((x) => x.instance_id === instanceId).at(-1);
  m.status = 'selesai';
  m.laporan = laporan;
  await k.jam.maju(3000);
  return m;
}

test('an approved result is passed on: "Teruskan ke Budi" → his form knows the source → rujuk_misi + chain', async (t) => {
  t.after(() => lepasKaitDunia());
  const k = siapkan();
  const { sari, budi } = await masukDenganParty(k, 'sari', 'budi');
  await k.dp.kirimMisi(sari, { pertanyaan: 'harga cabai rawit di Bogor', sumber: [] });
  const induk = await selesaikan(k, sari, { ringkasan: [{ kalimat: 'Harga naik.', rujukan: ['T1'] }], temuan: [{ id: 'T1', sumber: 'S1' }], sumber: [{ id: 'S1', url: 'https://contoh.go.id/a' }] });

  // Before approval: no forwarding, only the hint.
  await k.dp.bukaHasil(sari);
  assert.equal(cariTombol(k.sheet.pohon, 'Teruskan ke Budi'), null, 'not before the result is approved');
  assert.match(teksPohon(k.sheet.pohon), /Setelah disetujui, hasil ini bisa diteruskan/);
  await k.tekan('Setujui & simpan');
  assert.equal(k.sheet.nama, 'hasil');
  await k.tekan('Teruskan ke Budi');
  assert.equal(k.sheet.nama, 'misi');
  assert.match(teksPohon(k.sheet.pohon), /Dari hasil Sari.*harga cabai rawit di Bogor/s);

  await k.kirimForm(nilai({ tujuan: 'rencana belanja warung', konteks: '' }));
  const kirim = k.rt.tulisan().filter((p) => p.jalur === '/rt/api/misi').at(-1);
  assert.deepEqual(kirim.isi, { instance_id: budi, jenis: 'pecah-tugas', tujuan: 'rencana belanja warung', rujuk_misi: induk.id });

  const anak = await selesaikan(k, budi, { langkah: [{ teks: 'Beli cabai sebelum Jumat', dasar: ['T1'] }], temuan: [{ id: 'T1', sumber: 'S1' }], sumber: [{ id: 'S1', url: 'https://contoh.go.id/a' }] });
  assert.deepEqual(anak.rantai, [induk.id, anak.id]);
  await k.dp.bukaHasil(budi);
  assert.match(teksPohon(k.sheet.pohon), /Rantai: Sari → Budi/);
});

test('forwarding refusals are cards that let the player drop the reference', async () => {
  const k = siapkan();
  const { budi } = await masukDenganParty(k, 'budi');
  // A reference to a mission this player does not own reads as missing (contract: 404 TIDAK_ADA).
  k.dp._rujukan.set(budi, { id: 'm_bukanpunyaku', nama: 'Sari', judul: 'x' });
  await k.dp.kirimMisi(budi, { tujuan: 'rencana' });
  assert.match(teksPohon(k.sheet.pohon), /Hasil yang dirujuk tidak ditemukan lagi/);
  await k.tekan('Lepas rujukan');
  assert.equal(k.dp._rujukan.has(budi), false);
  assert.doesNotMatch(teksPohon(k.sheet.pohon), /Dari hasil Sari/);
  await k.kirimForm(nilai({ tujuan: 'rencana', konteks: '' }));
  assert.equal(k.rt.tulisan().filter((p) => p.jalur === '/rt/api/misi').at(-1).isi.rujuk_misi, undefined);
});

test('a busy colleague is named, not offered', () => {
  const v = tampilanHasil({
    nama: 'Sari', misi: { id: 'm_1', status: 'selesai', putusan: 'setujui', laporan: {} },
    rekan: [{ instance_id: 'ag_budi0001', nama: 'Budi', jenis: 'pecah-tugas', sibuk: true }, { instance_id: 'ag_maya0001', nama: 'Maya', jenis: 'susun-panduan' }],
  }, {});
  assert.equal(cariTombol(v, 'Teruskan ke Budi'), null);
  assert.match(teksPohon(v), /Budi sedang bekerja/);
  assert.ok(cariTombol(v, 'Teruskan ke Maya'));
});

// ── Item 3: Persetujuan + Pengalaman ──────────────────────

test('a paid tool stops the mission: Persetujuan sheet → Setujui continues, Tolak cancels', async (t) => {
  t.after(() => lepasKaitDunia());
  const k = siapkan();
  const { sari } = await masukDenganParty(k, 'sari');
  await k.dp.kirimMisi(sari, { pertanyaan: 'berita banjir Bogor', sumber: [] });
  await k.jam.maju(0);
  const m = [...k.rt.misi.values()].at(-1);
  m.status = 'menunggu_persetujuan';
  m.persetujuan = { alat: 'cari-web', biaya_perkiraan: { rupiah: 150, token: 1200 }, alasan: 'Tidak ada sumber yang diberikan.' };
  await k.jam.maju(3000);
  assert.equal(k.dp.party.agenDariId(sari).status_kerja, 'menunggu_persetujuan');
  assert.match(k.toast.at(-1), /minta izin memakai alat berbiaya/);

  k.dp.bukaMarkas();
  assert.match(teksPohon(k.sheet.pohon), /Menunggu izinmu/);
  await k.tekan('Periksa izin');
  assert.equal(k.sheet.nama, 'izin');
  const teks = teksPohon(k.sheet.pohon);
  assert.match(teks, /Cari web/);
  assert.match(teks, /± Rp 150 · ± 1\.200 token/);
  assert.match(teks, /Tidak ada sumber yang diberikan/);
  assert.equal(k.rt.tulisan().filter((p) => p.jalur.endsWith('/persetujuan')).length, 0, 'nothing is decided until a button is pressed');
  await k.tekan('Setujui');
  const izin = k.rt.tulisan().filter((p) => p.jalur.endsWith('/persetujuan'));
  assert.deepEqual(izin.map((p) => p.isi), [{ setuju: true }]);
  assert.equal(m.status, 'berjalan');
  assert.equal(k.dp.party.agenDariId(sari).status_kerja, 'bekerja');

  // Second mission: Tolak cancels it.
  m.status = 'selesai';
  await k.jam.maju(3000);
  await k.dp.putuskan(sari, 'buang');
  await k.dp.kirimMisi(sari, { pertanyaan: 'lagi', sumber: [] });
  await k.jam.maju(0);
  const m2 = [...k.rt.misi.values()].at(-1);
  m2.status = 'menunggu_persetujuan';
  m2.persetujuan = { alat: 'cari-web', biaya_perkiraan: null };
  await k.jam.maju(3000);
  await k.dp.bukaIzin(sari);
  assert.match(teksPohon(k.sheet.pohon), /belum ada perkiraan dari server/);
  await k.tekan('Tolak');
  assert.equal(m2.status, 'dibatalkan');
  assert.equal(k.dp.party.agenDariId(sari).status_kerja, 'siap');
});

test('waiting for approval does not run the 10-minute watch limit', async () => {
  const k = siapkan();
  const { sari } = await masukDenganParty(k, 'sari');
  await k.dp.kirimMisi(sari, { pertanyaan: 'x', sumber: [] });
  await k.jam.maju(0);
  const m = [...k.rt.misi.values()].at(-1);
  m.status = 'menunggu_persetujuan';
  m.persetujuan = { alat: 'cari-web' };
  await k.jam.maju(11 * 60 * 1000);
  assert.equal(k.dp.misi.jumlahDipantau, 1, 'still watching after 11 minutes of waiting for the player');
  assert.equal(k.dp._galatPantau.has(sari), false);
});

test('approval route not on this runtime yet: an honest "segera hadir" card', async () => {
  const k = siapkan();
  const { sari } = await masukDenganParty(k, 'sari');
  k.dp._misiTerakhir.set(sari, { id: 'm_00000abc', status: 'menunggu_persetujuan', persetujuan: { alat: 'cari-web' } });
  k.rt.m2 = false; // M1 runtime: the route answers 404 TIDAK_ADA
  await k.dp.putuskanIzin(sari, true);
  assert.equal(k.sheet.nama, 'izin');
  assert.match(teksPohon(k.sheet.pohon), /Persetujuan alat belum aktif di server ini \(segera hadir\)/);
});

test('cost estimate words come from data only', () => {
  assert.equal(teksBiaya(null), 'belum ada perkiraan dari server');
  assert.equal(teksBiaya({ rupiah: null }), 'belum ada perkiraan dari server');
  assert.equal(teksBiaya(0), 'gratis (server milik sendiri)');
  assert.equal(teksBiaya(2500), '± Rp 2.500');
  assert.equal(teksBiaya({ rupiah: 0, panggilan: 1 }), 'gratis · 1 panggilan');
  const v = tampilanPersetujuan({ nama: 'Sari', misi: { id: 'm_1', pertanyaan: 'x', persetujuan: { alat: 'cari-web' } } }, {});
  assert.ok(cariTombol(v, 'Setujui') && cariTombol(v, 'Tolak'));
});

test('Pengalaman on the card only from the runtime; no field = no line, no made-up number', async () => {
  assert.equal(teksPengalaman(undefined), null);
  assert.equal(teksPengalaman({ xp: 12.5, level: 1 }), null, 'a non-integer is not shown');
  assert.equal(teksPengalaman({ xp: 0, level: 0, dari_misi: [] }), 'Pengalaman: belum ada · tumbuh dari misi yang kamu setujui');
  assert.equal(teksPengalaman({ xp: 1250, level: 3, dari_misi: ['m_1', 'm_2'] }), 'Pengalaman: Level 3 · 1.250 XP · dari 2 misi disetujui');

  const k = siapkan();
  const { sari, budi } = await masukDenganParty(k, 'sari', 'budi');
  k.rt.pengalaman.set(sari, { xp: 40, level: 1, dari_misi: ['m_x'] });
  await k.dp.party.muat();
  k.dp.bukaMarkas();
  const teks = teksPohon(k.sheet.pohon);
  assert.match(teks, /Pengalaman: Level 1 · 40 XP · dari 1 misi disetujui/);
  assert.equal((teks.match(/Pengalaman/g) ?? []).length, 1, `Budi (${budi}) has no pengalaman field: no line`);
});

test('brain labels follow jenisOtak (ADR-0007): own, rented GPU with model, cloud', () => {
  assert.deepEqual(labelOtak({ provider: 'migancore' }), { teks: 'Milik sendiri', jenis: 'sendiri' });
  assert.deepEqual(labelOtak({ provider: 'runpod', model: 'qwen3-14b' }), { teks: 'GPU sewaan · qwen3-14b', jenis: 'gpu' });
  assert.deepEqual(labelOtak({ provider: 'deepseek', vault_ref: 'vault://t/x' }), { teks: 'Cloud pihak lain', jenis: 'cloud' });
  const v = tampilanMarkas({ anggota: [{ instance_id: 'ag_aaaaaa01', id: 'sari', nama: 'Sari', kelas: 'Penjejak', status: 'siap', brain: { provider: 'runpod', model: 'qwen3-14b' }, bisaMisi: true }], maks: 4 }, {});
  const t = teksPohon(v);
  assert.match(t, /Otak: GPU sewaan/);
  assert.match(t, /GPU SEWAAN · QWEN3-14B/);
  assert.doesNotMatch(t, /MiganCore/, 'a rented GPU is never called MiganCore');
});
