#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// tests/alat/uji-m1-hp.cjs — manual acceptance run of the M1 flow in Chromium, phone first.
//
// Needs the runtime and the world already running on the SAME hostname:
//   RUNTIME_DEV=1 RUNTIME_PORT=9810 RUNTIME_ORIGINS=http://localhost:4300 \
//     node --disable-warning=ExperimentalWarning services/runtime/src/main.js
//   RUNTIME_URL=http://localhost:9810 GALANTARA_LOCAL_PORT=4300 \
//     node apps/galantara/galantara-server/index.js --local
// Then:
//   node apps/galantara/tests/alat/uji-m1-hp.cjs http://localhost:4300 <folder-bukti> [awalan-nama]
//
// Touch only on the phone (390×844, hasTouch): tap the NPC, "Ngobrol", dialog choice, sheet
// buttons. Teleporting the avatar next to Sari stands in for walking there. Mission routes
// (stream A) are faked with page.route() in the locked contract's shapes, and the fake report
// is labelled SIMULASI so the screenshot cannot pass for a real result.
// Measures (design report §9.10): UI coverage of the screen, text left of x = 12 px, one-line
// HUD, frames per second (software GPU: not a phone number), console errors, third-party
// requests, localStorage against findSecrets.
// Not part of `npm test` (needs a browser and two servers).
// ═══════════════════════════════════════════════════════
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');

const BASIS = (process.argv[2] || 'http://localhost:4300').replace(/\/$/, '');
const KELUAR = path.resolve(process.argv[3] || '.');
const AWALAN = process.argv[4] || '2026-09-26-b-';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const hasil = { langkah: [], ukur: {}, galatKonsol: [], pihakKetiga: [], tangkapan: [] };
const catat = (s) => { hasil.langkah.push(s); console.log(`• ${s}`); };

// UI chrome boxes, rasterised and unioned (method: design report §9.10).
const UKUR_TUTUPAN = (ekstra) => {
  const pilih = ['#hud', '#login-gate', '#bottom-bar', '#chat-panel', '#dpad', '#orbit', '#arena-door', '#harian-kartu', ...ekstra];
  const W = innerWidth, H = innerHeight;
  const grid = new Uint8Array(W * H);
  const kotak = {};
  for (const s of pilih) {
    const el = document.querySelector(s);
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    kotak[s] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    const x0 = Math.max(0, Math.floor(r.left)), x1 = Math.min(W, Math.ceil(r.right));
    const y0 = Math.max(0, Math.floor(r.top)), y1 = Math.min(H, Math.ceil(r.bottom));
    for (let y = y0; y < y1; y++) grid.fill(1, y * W + x0, y * W + x1);
  }
  let n = 0;
  for (const v of grid) n += v;
  // Visible UI text closer than 12 px to the left edge (world labels excluded).
  const kiri = [];
  const jalan = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (jalan.nextNode()) {
    const t = jalan.currentNode;
    const el = t.parentElement;
    if (!t.textContent.trim() || !el || el.closest('#lbl-layer, script, style')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const rng = document.createRange();
    rng.selectNodeContents(t);
    for (const r of rng.getClientRects()) {
      if (r.width && r.height && r.right > 0 && r.left < 12 && r.bottom > 0 && r.top < H) kiri.push(`${el.id || el.className}: "${t.textContent.trim().slice(0, 24)}" x=${Math.round(r.left)}`);
    }
  }
  const mid = document.querySelector('.hud-mid');
  const barisHud = mid ? Math.round(mid.getBoundingClientRect().height / (parseFloat(getComputedStyle(mid).fontSize) * 1.36)) : null;
  // Smallest visible UI font.
  let hurufTerkecil = 99;
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('#lbl-layer, script, style, #generator3d-panel, .panel:not(.on)')) return;
    if (![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || !r.width || r.bottom < 0 || r.top > H) return;
    hurufTerkecil = Math.min(hurufTerkecil, parseFloat(cs.fontSize));
  });
  return { layar: [W, H], tutupanPersen: +(100 * n / (W * H)).toFixed(1), kotak, teksDiKiri12px: kiri, barisHud, hurufTerkecilPx: hurufTerkecil };
};

const FPS = () => new Promise((r) => {
  let n = 0;
  const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); };
  requestAnimationFrame(f);
});

async function misiPalsu(page) {
  // Contract-shaped fake of stream A's routes (docs/sprint/SPRINT-01.md). Moves on by call count.
  let tahap = 0;
  const misi = () => ({
    id: 'm_contoh01', instance_id: page.__iid, jenis: 'riset-sumber', pertanyaan: 'harga cabai rawit di Bogor minggu ini',
    status: ['antre', 'berjalan', 'berjalan', 'berjalan'][tahap] ?? 'selesai',
    langkah: { nama: 'kumpulkan', ke: Math.min(tahap + 1, 6), dari: 6 }, label_otak: 'SIMULASI',
    dibuat: new Date(Date.now() - 80_000).toISOString(),
    ...(tahap >= 4 ? {
      selesai: new Date().toISOString(),
      laporan: {
        schema: 'galantara.laporan-misi/v1',
        ringkasan: [
          { kalimat: '[CONTOH] Harga cabai rawit di pasar Bogor naik dibanding minggu lalu.', rujukan: ['T1'] },
          { kalimat: '[CONTOH] Pasokan dari sentra produksi berkurang karena hujan.', rujukan: ['T2'] },
        ],
        temuan: [{ id: 'T1', sumber: 'S1' }, { id: 'T2', sumber: 'S2' }],
        ditolak: [{ alasan: 'kutipan_tidak_ada_di_sumber', klaim: 'contoh' }],
        sumber: [
          { id: 'S1', url: 'https://contoh.go.id/harga-pangan', judul: 'Contoh halaman harga pangan', diambil: new Date().toISOString() },
          { id: 'S2', url: 'https://contoh.co.id/pasokan', judul: 'Contoh berita pasokan', diambil: new Date().toISOString() },
        ],
        otak: { provider: 'simulasi', model: 'simulasi', label: 'SIMULASI' },
      },
    } : {}),
  });
  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/rt/api/otak/status', (r) => r.fulfill(json({ ok: true, otak: [{ provider: 'migancore', model: 'qwen3:4b-instruct-2507', hidup: true, dicek: new Date().toISOString(), label: 'milik sendiri' }] })));
  await page.route('**/rt/api/misi**', async (r) => {
    const u = new URL(r.request().url());
    const m = r.request().method();
    if (m === 'POST' && u.pathname === '/rt/api/misi') {
      page.__iid = JSON.parse(r.request().postData() || '{}').instance_id;
      tahap = 0;
      return r.fulfill(json({ ok: true, misi: { id: 'm_contoh01', status: 'antre', posisi: 1, eta_detik: 90 } }));
    }
    if (m === 'GET' && u.pathname === '/rt/api/misi') return r.fulfill(json({ ok: true, misi: [] }));
    if (m === 'GET' && u.pathname === '/rt/api/misi/m_contoh01') { const x = misi(); tahap++; return r.fulfill(json({ ok: true, misi: x })); }
    if (m === 'POST' && u.pathname.endsWith('/putusan')) { const x = misi(); return r.fulfill(json({ ok: true, misi: { ...x, putusan: JSON.parse(r.request().postData()).putusan } })); }
    return r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, kode: 'TIDAK_ADA', pesan: 'Rute tidak ditemukan.' }) });
  });
}

async function main() {
  fs.mkdirSync(KELUAR, { recursive: true });
  const browser = await chromium.launch({ args: ARGS });
  const panel = [];
  const potret = async (page, nama, judul) => {
    const buf = await page.screenshot();
    panel.push({ judul, b64: buf.toString('base64') });
    hasil.tangkapan.push(nama);
  };
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') hasil.galatKonsol.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => hasil.galatKonsol.push(`pageerror: ${String(e).slice(0, 200)}`));
    page.on('request', (r) => { const u = r.url(); if (!/^(https?:\/\/(localhost|127\.0\.0\.1)[:/]|data:|blob:)/.test(u)) hasil.pihakKetiga.push(u); });

    await page.goto(`${BASIS}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window._game?.world?.worldRoot && window._game.dunia?.party.termuat, null, { timeout: 60000 });
    hasil.ukur.fps = await page.evaluate(FPS);
    catat(`dunia siap sebagai tamu; ${hasil.ukur.fps} frame/dtk (GPU perangkat lunak, bukan angka HP)`);
    hasil.ukur.awal = await page.evaluate(UKUR_TUTUPAN, []);
    catat(`tutupan UI tanpa sheet: ${hasil.ukur.awal.tutupanPersen}% · HUD ${hasil.ukur.awal.barisHud} baris · teks di x<12: ${hasil.ukur.awal.teksDiKiri12px.length} · huruf terkecil ${hasil.ukur.awal.hurufTerkecilPx}px`);
    await page.waitForFunction(() => [...document.querySelectorAll('#lbl-layer .plakat-agen.on')].length >= 1, null, { timeout: 20000 });

    // 1 · Tap Sari from afar: the world guides instead of doing nothing.
    const titikSari = await page.evaluate(() => {
      const g = window._game; const n = g.npcs.get('sari'); const v = new THREE.Vector3(n.x, 0.8, n.z).project(g.camera.cam);
      return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, jarak: Math.hypot(n.x - g.avatar.pos.x, n.z - g.avatar.pos.z) };
    });
    await page.touchscreen.tap(titikSari.x, titikSari.y);
    await page.waitForFunction(() => document.querySelector('#gw-arah.on'), null, { timeout: 10000 });
    catat(`ketuk Sari dari ${titikSari.jarak.toFixed(1)} m → chip "${await page.textContent('#gw-arah .gw-arah-teks')}"`);
    await potret(page, 'arahkan', '1 · Ketuk Sari dari jauh → Arahkan saya');

    // 2 · Walk up (teleport stands in for walking), tap "Ngobrol".
    await page.evaluate(() => { const g = window._game; const n = g.npcs.get('sari'); g.avatar.teleport(n.x + 1.3, n.z + 0.4, -Math.PI / 2); });
    await page.waitForFunction(() => document.querySelector('#prox.on .prox-aksi'), null, { timeout: 15000 });
    await page.waitForFunction(() => /ada di depanmu/.test(document.querySelector('#gw-arah .gw-arah-teks')?.textContent ?? ''), null, { timeout: 15000 });
    hasil.ukur.dekatSari = await page.evaluate(UKUR_TUTUPAN, ['#prox', '#gw-arah']);
    await potret(page, 'dekat', '2 · Dekat Sari: plakat AI + Ngobrol');
    await page.tap('#prox .prox-aksi');
    await page.waitForFunction(() => document.getElementById('npc-panel').classList.contains('on'), null, { timeout: 10000 });
    const pilihan = await page.$$eval('#npc-choices button', (b) => b.map((x) => x.textContent));
    catat(`dialog terbuka lewat sentuhan; pilihan: ${pilihan.join(' | ')}`);
    await potret(page, 'dialog', '3 · Dialog Sari (tanpa keyboard)');

    // 3 · "Ayo, gabung party-ku!" → Masuk dulu → dev sign-in → Rekrut.
    await page.tap('#npc-choices .gw-pilihan-aksi');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Masuk dulu, ya', null, { timeout: 10000 });
    await potret(page, 'masuk', '4 · Masuk dulu (tamu)');
    await page.tap('text=Masuk (mode pengembang)');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Ajak Sari gabung party?', null, { timeout: 15000 });
    catat(`masuk lewat /rt/api/dev/masuk sebagai ${await page.evaluate(() => window._game.dunia.party.pemain)}`);
    hasil.ukur.sheetRekrut = await page.evaluate(() => { const s = document.querySelector('.gw-sheet').getBoundingClientRect(); return { tinggi: Math.round(s.height), persenLayar: +(100 * s.height / innerHeight).toFixed(1) }; });
    await potret(page, 'rekrut', '5 · Sheet Rekrut');
    await page.tap('text=Rekrut Sari');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Markas · Party 1/4', null, { timeout: 15000 });
    catat(`rekrut OK → ${await page.textContent('#gw-judul')} · tab "${await page.textContent('#bb-party-t')}"`);
    await potret(page, 'markas', '6 · Markas 1/4');

    // 4 · Otak (display only), then Beri misi against the real runtime (routes may not exist yet).
    await page.tap('.gw-baris-teks >> text=Otak');
    await page.waitForFunction(() => /^Otak /.test(document.getElementById('gw-judul')?.textContent ?? ''), null, { timeout: 10000 });
    catat(`sheet Otak: ${(await page.textContent('.gw-opsi')).replace(/\s+/g, ' ').slice(0, 120)}`);
    await potret(page, 'otak', '7 · Otak (tampilan, ubah di Kantor)');
    await page.tap('button[aria-label="Kembali"]');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Markas · Party 1/4', null, { timeout: 10000 });
    await page.tap('text=Beri misi');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Misi untuk Sari', null, { timeout: 10000 });
    const kunci = ['sk', 'or', 'v1', 'c'.repeat(40)].join('-');
    await page.fill('#gw-pertanyaan', `tolong pakai ${kunci}`);
    await page.tap('.gw-form button[type=submit]');
    await page.waitForFunction(() => /menempelkan kunci API/.test(document.querySelector('.gw-kartu-galat')?.textContent ?? ''), null, { timeout: 10000 });
    const bocor = await page.evaluate((k) => document.body.innerHTML.includes(k), kunci);
    catat(`kunci ditempel → kartu galat bertombol; kunci masih di halaman: ${bocor}`);
    await potret(page, 'kunci', '8 · Kunci ditempel → kartu galat');
    await page.tap('text=Hapus teks');
    await page.fill('#gw-pertanyaan', 'harga cabai rawit di Bogor minggu ini');
    await page.tap('.gw-form button[type=submit]');
    await page.waitForFunction(() => document.querySelector('.gw-kartu-galat') || !document.querySelector('#gw-lapis.on'), null, { timeout: 15000 });
    const kartuMisi = await page.evaluate(() => document.querySelector('.gw-kartu-galat')?.textContent ?? null);
    catat(`misi ke runtime sungguhan: ${kartuMisi ? `kartu "${kartuMisi.replace(/\s+/g, ' ').slice(0, 90)}"` : 'terkirim'}`);
    if (kartuMisi) await potret(page, 'misi-belum', '9 · Runtime tanpa rute misi → kartu jujur');

    // 5 · Mission screens with the contract-shaped fake (SIMULASI).
    await misiPalsu(page);
    if (kartuMisi) {
      await page.tap('.gw-kartu-galat >> text=Tutup');
      await page.evaluate(() => window._game.dunia.bukaMarkas());
      await page.tap('text=Beri misi');
      await page.fill('#gw-pertanyaan', 'harga cabai rawit di Bogor minggu ini');
      await page.tap('.gw-form button[type=submit]');
    }
    await page.waitForFunction(() => !document.querySelector('#gw-lapis.on'), null, { timeout: 15000 });
    await page.waitForFunction(() => window._game.npcs.get('sari').perilaku.keadaan === 'menuju', null, { timeout: 15000 });
    catat('misi (palsu, SIMULASI) terkirim → Sari berjalan ke titik kerja Markas');
    const t0 = Date.now();
    await page.waitForFunction(() => window._game.npcs.get('sari').perilaku.keadaan === 'bekerja', null, { timeout: 120000, polling: 500 });
    catat(`Sari tiba di titik kerja dalam ${((Date.now() - t0) / 1000).toFixed(0)} dtk nyata (dt dijepit 0,05; GPU perangkat lunak)`);
    await page.evaluate(() => { const g = window._game; const n = g.npcs.get('sari'); g.avatar.teleport(n.x + 3, n.z + 3, 0); });
    await page.waitForFunction(() => /bekerja/.test([...document.querySelectorAll('#lbl-layer .status-agen.on')].map((e) => e.textContent).join(' ')), null, { timeout: 30000 });
    await potret(page, 'bekerja', '10 · Sari bekerja di Markas');
    await page.waitForFunction(() => window._game.dunia.party.agenDariSpesies('sari')?.status_kerja === 'hasil_siap', null, { timeout: 60000, polling: 500 });
    await page.waitForFunction(() => window._game.npcs.get('sari').perilaku.melambai, null, { timeout: 120000, polling: 500 });
    catat(`hasil siap → Sari datang melapor · tab "${await page.getAttribute('#bb-party-btn', 'aria-label')}"`);
    await potret(page, 'lapor', '11 · Hasil siap: Sari melapor');
    await page.tap('#bb-party-btn');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Markas · Party 1/4', null, { timeout: 10000 });
    await page.tap('text=Periksa hasil');
    await page.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Hasil misi Sari', null, { timeout: 15000 });
    await potret(page, 'hasil', '12 · Hasil + sumber (SIMULASI)');
    await page.tap('text=Setujui & simpan');
    await page.waitForFunction(() => /Disetujui/.test(document.querySelector('.gw-sheet')?.textContent ?? ''), null, { timeout: 15000 });
    catat('Setujui & simpan → "Disetujui · tersimpan"');

    // 6 · Reload: the party comes back from the runtime, not from this browser.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window._game?.dunia?.party.termuat && window._game.dunia.party.masuk, null, { timeout: 60000 });
    catat(`muat ulang → tab "${await page.textContent('#bb-party-t')}" (dari runtime)`);
    hasil.ukur.cache = await page.evaluate(async () => {
      const { findSecrets } = await import('/vendor/party-contract/umum.js');
      const isi = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); isi[k] = localStorage.getItem(k); }
      const parsed = Object.fromEntries(Object.entries(isi).map(([k, v]) => { try { return [k, JSON.parse(v)]; } catch { return [k, v]; } }));
      return { kunci: Object.keys(isi), temuanFindSecrets: findSecrets(parsed), adaVault: JSON.stringify(isi).includes('vault://') };
    });
    catat(`localStorage: ${hasil.ukur.cache.kunci.join(', ')} · findSecrets ${hasil.ukur.cache.temuanFindSecrets.length} temuan`);
    hasil.ukur.akhir = await page.evaluate(UKUR_TUTUPAN, ['#prox', '#gw-arah']);
    await ctx.close();

    // 7 · Desktop: the Markas as a right drawer.
    const meja = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const hal = await meja.newPage();
    await hal.goto(`${BASIS}/`, { waitUntil: 'load' });
    await hal.waitForFunction(() => window._game?.dunia?.party.termuat, null, { timeout: 60000 });
    await hal.evaluate(async () => {
      await fetch('/rt/api/dev/masuk', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', 'x-galantara-world': '1' }, body: JSON.stringify({ pemain: 'uji-desktop' }) });
      await window._game.dunia.muat();
      await window._game.dunia.party.rekrut('sari');
      window._game.dunia.bukaMarkas();
    });
    await hal.waitForFunction(() => document.getElementById('gw-judul')?.textContent === 'Markas · Party 1/4', null, { timeout: 15000 });
    const buf = await hal.screenshot();
    fs.writeFileSync(path.join(KELUAR, `${AWALAN}markas-desktop.png`), buf);
    hasil.tangkapan.push(`${AWALAN}markas-desktop.png`);
    catat('desktop 1280×800: Markas sebagai laci kanan');
    await meja.close();

    // Contact sheet of the phone screens.
    const lembar = await browser.newContext({ viewport: { width: 1640, height: 900 }, deviceScaleFactor: 1 });
    const lp = await lembar.newPage();
    const kolom = 4;
    const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;padding:10px;background:#ddd;font:700 12px system-ui;display:grid;grid-template-columns:repeat(${kolom},390px);gap:14px 10px}figure{margin:0}figcaption{padding:3px 2px}img{display:block;width:390px;height:844px;border-radius:14px}</style>${panel.map((p) => `<figure><figcaption>${p.judul}</figcaption><img src="data:image/png;base64,${p.b64}"></figure>`).join('')}`;
    await lp.setContent(html);
    await lp.waitForFunction(() => [...document.images].every((i) => i.complete));
    fs.writeFileSync(path.join(KELUAR, `${AWALAN}alur-m1-hp.png`), await lp.screenshot({ fullPage: true }));
    hasil.tangkapan.push(`${AWALAN}alur-m1-hp.png`);
    await lembar.close();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ ...hasil, langkah: undefined }, null, 1));
  return 0;
}

main().then((k) => { process.exitCode = k; }).catch((e) => { console.error('UJI GAGAL:', e); process.exitCode = 1; });
