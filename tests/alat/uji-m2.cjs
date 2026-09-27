#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// tests/alat/uji-m2.cjs — acceptance run of the M2 world client in Chromium (SPRINT-02 stream B).
//
// Needs the runtime (M2 routes, RUNTIME_MODE=demo, RUNTIME_DEV=1, handoff secret) and the world
// (`galantara-server --local` with RUNTIME_URL) on the same hostname, like uji-m1-hp.cjs. Then:
//   node apps/galantara/tests/alat/uji-m2.cjs http://localhost:4361 docs/bukti 2026-09-27-b2-
//
// Phone 390×844 touch: party of 3 follows the player; Markas box; Sari's mission stops for the
// paid tool → Persetujuan → result → approve → "Teruskan ke Budi" → Budi's steps with the chain;
// Buku Warga; handoff both ways. Then the same world with the CPU slowed 8× (CDP): the avatar must
// walk at real speed (± 25 %), and Mode Ringan must switch itself on. Desktop 1280×800 screenshots.
// Exit code 1 on any failed check. Not part of `npm test` (browser + two servers).
// ═══════════════════════════════════════════════════════
'use strict';

const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(__dirname, '../../../../tests-e2e/node_modules/playwright'));

const BASIS = (process.argv[2] || 'http://localhost:4361').replace(/\/$/, '');
const KELUAR = path.resolve(process.argv[3] || '.');
const AWALAN = process.argv[4] || '2026-09-27-b2-';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const gagal = [];
const cek = (ok, s) => { console.log(`${ok ? '✓' : '✗'} ${s}`); if (!ok) gagal.push(s); };
const judul = (page) => page.evaluate(() => document.getElementById('gw-judul')?.textContent ?? null);
const tekan = (page, sentuh, teks) => (sentuh ? page.tap(`button:text-is("${teks}")`) : page.click(`button:text-is("${teks}")`));
const foto = (page, nama) => page.screenshot({ path: path.join(KELUAR, `${AWALAN}${nama}.png`) });

async function siapDunia(page) {
  await page.goto(BASIS, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window._game?.world?.worldRoot && window._game.dunia?.party.termuat, null, { timeout: 90000 });
}

async function tungguStatus(page, spesies, status, ms = 120000) {
  await page.waitForFunction(([sp, st]) => window._game.dunia.party.agenDariSpesies(sp)?.status_kerja === st, [spesies, status], { timeout: ms });
}

async function hp(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const galat = [];
  page.on('console', (m) => m.type() === 'error' && galat.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => galat.push(String(e).slice(0, 200)));
  await siapDunia(page);

  // Sign in (dev) and hire three.
  await page.evaluate(async () => {
    const d = window._game.dunia;
    await d.party.masukDev('uji-b2-hp');
    for (const sp of ['sari', 'budi', 'maya']) await d.party.rekrut(sp);
  });
  cek(await page.evaluate(() => window._game.dunia.party.jumlah()) === 3, 'party 3/4');

  // Walk east for 3 s: the three follow in a line.
  await page.evaluate(() => { window._game.avatar.teleport(-2, 6, Math.PI / 2); window._game.avatar.keys.right = true; });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window._game.avatar.keys.right = false; });
  await page.waitForTimeout(1500);
  const ikut = await page.evaluate(() => {
    const g = window._game;
    const p = g.avatar.getPosition();
    return { pengikut: g.dunia.pengikut, jarak: g.dunia.pengikut.map((id) => Math.round(Math.hypot(g.npcs.get(id).x - p.x, g.npcs.get(id).z - p.z) * 10) / 10) };
  });
  cek(ikut.pengikut.length === 3 && ikut.jarak.every((d) => d > 0.5 && d < 6), `party mengikuti: ${JSON.stringify(ikut)}`);
  await foto(page, 'hp-party-ikut');

  // Markas box: Maya out → box → screenshot → back in.
  await page.evaluate(async () => { const d = window._game.dunia; await d.keluarkan(d.party.agenDariSpesies('maya').agen.instance_id); });
  cek(/DI MARKAS · TIDAK DIBAWA \(1\)/.test(await page.textContent('.gw-sheet')), 'Markas-box menampilkan Maya');
  await page.evaluate(() => document.querySelector('.gw-box')?.scrollIntoView());
  await foto(page, 'hp-markas-box');
  await tekan(page, true, 'Bawa');
  await page.waitForFunction(() => window._game.dunia.party.diParty('maya'));

  // Julukan through the sheet.
  await page.evaluate(() => window._game.dunia.bukaJulukan(window._game.dunia.party.agenDariSpesies('sari').agen.instance_id));
  await page.fill('#gw-julukan', 'Sari Kilat');
  await tekan(page, true, 'Simpan julukan');
  await page.waitForFunction(() => window._game.dunia.party.agenDariSpesies('sari').agen.julukan === 'Sari Kilat');
  cek(true, 'julukan tersimpan di runtime');

  // Sari: a question without sources → the runtime stops before cari-web → Persetujuan sheet.
  const sariId = await page.evaluate(() => window._game.dunia.party.agenDariSpesies('sari').agen.instance_id);
  await page.evaluate((id) => window._game.dunia.bukaMisi(id), sariId);
  await page.fill('#gw-pertanyaan', 'harga cabai rawit di Bogor minggu ini');
  await tekan(page, true, 'Kirim Sari Kilat');
  await page.waitForFunction(() => window._game.dunia.sheet.nama === 'izin', null, { timeout: 60000 }).catch(() => {});
  const izin = await page.evaluate(() => window._game.dunia.sheet.nama);
  cek(izin === 'izin', `misi tanpa sumber berhenti di Persetujuan (${izin})`);
  if (izin === 'izin') {
    await foto(page, 'hp-persetujuan');
    await tekan(page, true, 'Setujui');
  }
  await tungguStatus(page, 'sari', 'hasil_siap');
  await page.evaluate((id) => window._game.dunia.bukaHasil(id), sariId);
  await page.waitForFunction(() => window._game.dunia.sheet.nama === 'hasil');
  await tekan(page, true, 'Setujui & simpan');
  await page.waitForSelector('button:text-is("Teruskan ke Budi")', { timeout: 15000 });
  await page.evaluate(() => document.querySelector('.gw-teruskan')?.scrollIntoView());
  await foto(page, 'hp-teruskan');
  await tekan(page, true, 'Teruskan ke Budi');
  cek(/Dari hasil Sari Kilat/.test(await page.textContent('.gw-sheet')), 'form Budi menyebut asal hasil');
  await page.fill('#gw-tujuan', 'rencana belanja warung dari temuan Sari');
  await page.fill('#gw-konteks', 'modal 2 juta, buka Senin');
  await foto(page, 'hp-misi-budi');
  await tekan(page, true, 'Kirim Budi');
  await tungguStatus(page, 'budi', 'hasil_siap');
  const budiId = await page.evaluate(() => window._game.dunia.party.agenDariSpesies('budi').agen.instance_id);
  await page.evaluate((id) => window._game.dunia.bukaHasil(id), budiId);
  await page.waitForFunction(() => window._game.dunia.sheet.nama === 'hasil');
  const teksBudi = await page.textContent('.gw-sheet');
  cek(/Rencana kerja:/.test(teksBudi) && /Rantai: Sari Kilat → Budi|Lanjutan dari 1 hasil/.test(teksBudi), 'hasil Budi: rencana kerja + rantai');
  await foto(page, 'hp-hasil-budi');

  // Buku Warga.
  await page.evaluate(() => window._game.dunia.bukaBukuWarga());
  await foto(page, 'hp-buku-warga');
  cek(/Ditemui 3 dari \d+/.test(await page.textContent('.gw-sheet')), 'Buku Warga menghitung dari data');
  cek(await page.locator('input[type=password]').count() === 0, 'tidak ada input password di dunia');

  // World → Kantor: a tab opened in the click, landing on /dashboard/kantor?mighan=<kode>.
  await page.evaluate(() => window._game.dunia.sheet.tutup());
  const [tab] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 15000 }),
    page.evaluate(() => { window._hasilKantor = window._game.dunia.bukaKantor(); }),
  ]);
  await tab.waitForURL(/mighan=/, { timeout: 15000 }).catch(() => {});
  const urlKantor = tab.url();
  cek(/\/dashboard\/kantor\?mighan=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(urlKantor), `Buka Kantor membawa kode (${urlKantor.replace(/mighan=.*/, 'mighan=…')})`);
  await tab.close();

  // Kantor → world: a code for this player redeemed in a fresh context; the URL loses it first.
  const kode = await page.evaluate(async () => (await (await fetch('/rt/api/handoff/terbitkan', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', 'x-galantara-world': '1' }, body: '{}' })).json()).kode);
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASIS}/?mighan=${kode}`, { waitUntil: 'load', timeout: 90000 });
  const urlAwal = p2.url();
  await p2.waitForFunction(() => window._game?.dunia?.party.termuat, null, { timeout: 90000 });
  const masuk = await p2.evaluate(() => ({ masuk: window._game.dunia.party.masuk, pemain: window._game.dunia.party.pemain, jumlah: window._game.dunia.party.jumlah(), url: location.href }));
  cek(!/mighan=/.test(masuk.url), 'kode keluar dari bilah alamat');
  cek(masuk.masuk && masuk.pemain === 'uji-b2-hp' && masuk.jumlah === 3, `tukar-dunia: masuk sebagai pemain yang sama, party ${masuk.jumlah}/4`);
  console.log(`  (URL awal memuat kode: ${/mighan=/.test(urlAwal)})`);
  await ctx2.close();

  cek(galat.length === 0, `galat konsol HP: ${JSON.stringify(galat)}`);
  await context.close();
}

async function lambat(browser) {
  // CPU 8× slower: the avatar must still walk at 5.4 m/s, and Mode Ringan switches itself on.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await siapDunia(page);
  await page.waitForFunction(() => window._game.avatar.pakaiFisika, null, { timeout: 60000 }).catch(() => {});
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_CPU_LAMBAT || 8) });
  await page.evaluate(() => window._game.avatar.teleport(-2, 6, Math.PI / 2));
  await page.waitForTimeout(1500);
  const ukur = await page.evaluate(async () => {
    const g = window._game;
    const a = g.avatar.getPosition();
    const dari = { x: a.x, z: a.z };
    let frame = 0;
    const hitung = () => { frame++; if (!selesai) requestAnimationFrame(hitung); };
    let selesai = false;
    requestAnimationFrame(hitung);
    const t0 = performance.now();
    g.avatar.keys.right = true;
    await new Promise((r) => setTimeout(r, 3000));
    g.avatar.keys.right = false;
    const detik = (performance.now() - t0) / 1000;
    selesai = true;
    const b = g.avatar.getPosition();
    return { meter: Math.hypot(b.x - dari.x, b.z - dari.z), detik, fps: frame / detik, fisika: g.avatar.pakaiFisika };
  });
  const laju = ukur.meter / ukur.detik;
  console.log(`  CPU ${process.env.E2E_CPU_LAMBAT || 8}×: ${ukur.fps.toFixed(1)} FPS, ${ukur.meter.toFixed(2)} m dalam ${ukur.detik.toFixed(2)} dtk = ${laju.toFixed(2)} m/dtk (fisika ${ukur.fisika})`);
  cek(laju > 5.4 * 0.75, `avatar berjalan waktu nyata di CPU lambat (${laju.toFixed(2)} m/dtk, target 5,4)`);
  await page.waitForFunction(() => window._game.ringan?.nyala, null, { timeout: 30000 }).catch(() => {});
  const ringan = await page.evaluate(() => ({ nyala: window._game.ringan?.nyala, pilihan: window._game.ringan?.pilihan, bayangan: window._game.renderer.renderer.shadowMap.enabled, pr: window._game.renderer.renderer.getPixelRatio() }));
  cek(ringan.nyala && !ringan.bayangan && ringan.pr === 1, `Mode Ringan menyala sendiri di FPS rendah: ${JSON.stringify(ringan)}`);
  await foto(page, 'hp-cpu8-mode-ringan');
  await context.close();
}

async function desktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await siapDunia(page);
  await page.evaluate(async () => {
    const d = window._game.dunia;
    await d.party.masukDev('uji-b2-desktop');
    for (const sp of ['sari', 'budi', 'maya']) await d.party.rekrut(sp);
    await d.keluarkan(d.party.agenDariSpesies('maya').agen.instance_id);
  });
  await foto(page, 'desktop-markas');
  const budi = await page.evaluate(() => window._game.dunia.party.agenDariSpesies('budi').agen.instance_id);
  await page.evaluate((id) => window._game.dunia.bukaMisi(id), budi);
  await foto(page, 'desktop-misi-budi');
  await page.evaluate(() => window._game.dunia.bukaBukuWarga());
  await foto(page, 'desktop-buku-warga');
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });
  try {
    await hp(browser);
    await lambat(browser);
    await desktop(browser);
  } catch (err) {
    gagal.push(String(err).slice(0, 400));
    console.error(err);
  } finally {
    await browser.close();
  }
  console.log(gagal.length ? `\nGAGAL: ${gagal.length}\n- ${gagal.join('\n- ')}` : '\nSemua pemeriksaan lulus.');
  process.exitCode = gagal.length ? 1 : 0;
})();
