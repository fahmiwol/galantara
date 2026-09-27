// ═══════════════════════════════════════════════════════
// tests/markas.test.mjs — Markas Penjelajah: budget, colliders, work points
//
// Guards laporan 3D §6.9 "uji wajib" with the REAL THREE r128 (vendor/) and the
// REAL Rapier, on the Oola that World.js builds from the map:
//   1. deterministic build          2. ≤ 12 draw calls, ≤ 1.500 triangles, 0 PointLight
//   3. every part declares a collider, blockers ≥ 0,70 m    4. Oola stays ≤ 150 / 20k / 3
//   5. no work point under a roof, from any camera the player can orbit to
//   + work points free of colliders AND reachable on foot from the spawn point.
// ═══════════════════════════════════════════════════════

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { ANGGARAN, ukurPohon, ukurSpot } = await import('../tools/anggaran-spot.mjs');
const { Fisika } = await import('../src/fisika/Fisika.js');
const { pusatDunia } = await import('../src/fisika/bentuk.js');
const {
  buatKarakter, ruangBebas, langkahKarakter, kakiKarakter, teleportKarakter, lepasKarakter, UKURAN_KAPSUL,
} = await import('../src/fisika/Karakter.js');
const { World, KELOMPOK_OOLA } = await import('../src/world/World.js');
const { PHI_MIN, PHI_MAX, ISLAND_R } = await import('../src/data/config.js');
const M = await import('../src/world/markas/index.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);
const PETA = JSON.parse(readFileSync(new URL('../src/data/maps/default_oola.json', import.meta.url), 'utf8'));
const SPAWN = { x: 0, z: 2 };

/** Oola exactly as Game builds it, with physics ready. */
async function oola() {
  const f = new Fisika({ muatRapier });
  const world = new World(new THREE.Scene(), { fisika: f });
  world.mapData = structuredClone(PETA);
  const asli = console.warn;
  const peringatan = [];
  console.warn = (...a) => peringatan.push(a.join(' '));
  try { world.build(); } finally { console.warn = asli; }
  await f.muat();
  return { f, world, peringatan };
}

let O;
before(async () => { O = await oola(); });

function sidikGeometri(markas) {
  const h = createHash('sha256');
  for (const kunci of Object.keys(markas.mesh).sort()) {
    const g = markas.mesh[kunci].geometry;
    h.update(kunci);
    h.update(Buffer.from(g.attributes.position.array.buffer));
    h.update(Buffer.from(g.attributes.normal.array.buffer));
  }
  for (const im of [markas.lampuMeja, markas.gulungan]) h.update(Buffer.from(im.instanceMatrix.array.buffer));
  return h.digest('hex');
}

/** Markas with every scroll slot and every desk lamp in use: the worst case. */
function markasPenuh() {
  const k = new M.KeadaanMarkas();
  for (let i = 0; i < M.KAPASITAS_GULUNGAN + 5; i++) k.tambahGulungan(`h${i}`);
  ['a', 'b', 'c', 'd'].forEach((id) => k.setelStatus(id, 'bekerja'));
  const markas = new M.MarkasPenjelajah();
  markas.bangun();
  markas.tampilkan(k);
  return markas;
}

// ── 1–2. Build and budget ───────────────────────────────────────────

test('Markas: dibangun deterministik — dua kali bangun, geometri identik byte demi byte', () => {
  const a = new M.MarkasPenjelajah(); a.bangun();
  const b = new M.MarkasPenjelajah(); b.bangun();
  assert.equal(sidikGeometri(a), sidikGeometri(b));
});

test('Markas: ≤ 12 draw call, ≤ 1.500 segitiga saat semua slot penuh, tanpa PointLight', () => {
  const markas = markasPenuh();
  const u = ukurPohon(markas.root);
  assert.ok(u.drawCall <= 12, `${u.drawCall} draw call > 12`);
  assert.ok(u.segitiga <= 1500, `${u.segitiga} segitiga > 1.500`);
  assert.equal(u.lampu, 0, 'Markas tidak boleh menambah PointLight (suar = emissive/unlit)');
  assert.ok(u.kaster <= 3, `${u.kaster} kaster bayangan > 3 (laporan 3D §6.3: landmark ≤ 3)`);
  assert.equal(markas.gulungan.count, M.KAPASITAS_GULUNGAN, 'uji anggaran harus mengukur kapasitas penuh');
});

test('Markas: bagian statis digabung — satu mesh per bahan, bukan satu per bagian', () => {
  const markas = new M.MarkasPenjelajah(); markas.bangun();
  const bahan = Object.keys(M.BAHAN_MARKAS);
  assert.deepEqual(Object.keys(markas.mesh).sort(), [...bahan].sort());
  const sebelum = Object.values(markas.bagianSebelumGabung).reduce((a, b) => a + b, 0);
  // Tanpa penggabungan jumlah mesh statis = jumlah bagian; dengan penggabungan = jumlah bahan.
  assert.ok(sebelum >= 40, `hanya ${sebelum} bagian — Markas kehilangan detail?`);
  for (const [kunci, mesh] of Object.entries(markas.mesh)) {
    assert.equal(mesh.material, markas.mesh[kunci].material);
    assert.equal(mesh.geometry.index, null, `${kunci}: geometri gabungan harus non-indexed`);
  }
});

test('Oola dengan Markas: tetap ≤ 150 draw call / ≤ 20.000 segitiga / ≤ 3 PointLight, dan Markas benar-benar ada', async () => {
  const b = await ukurSpot('oola');
  assert.ok(b.drawCall <= ANGGARAN.drawCall, `${b.drawCall} draw call`);
  assert.ok(b.total <= ANGGARAN.segitiga, `${b.total} segitiga`);
  assert.ok(b.lampu <= ANGGARAN.pointLight, `${b.lampu} PointLight`);
  // Tanpa ini, menghapus Markas dari peta membuat semua uji anggaran lulus diam-diam.
  const tanpa = structuredClone(PETA);
  tanpa.objects = tanpa.objects.filter((o) => o.method !== '_buildMarkas');
  const w = new World(new THREE.Scene());
  w.mapData = tanpa;
  const asli = console.warn; console.warn = () => {};
  try { w.build(); } finally { console.warn = asli; }
  const dasar = ukurPohon(w.worldRoot);
  const markas = O.world.markas;
  assert.ok(markas, 'World tidak memasang Markas dari peta');
  const um = ukurPohon(markas.root);
  assert.equal(b.drawCall - dasar.drawCall, um.drawCall, 'selisih draw call Oola ≠ draw call Markas');
});

test('Peta dan kode sepakat soal letak Markas', () => {
  const e = PETA.objects.find((o) => o.method === '_buildMarkas');
  assert.ok(e, 'default_oola.json tidak memuat Markas');
  assert.deepEqual([e.pos.x, e.pos.z, e.rotationY], [M.LETAK_MARKAS.x, M.LETAK_MARKAS.z, M.LETAK_MARKAS.rotasiY]);
  const m = O.world.markas;
  assert.deepEqual([m.root.position.x, m.root.position.z, m.root.rotation.y], [e.pos.x, e.pos.z, e.rotationY]);
});

// ── 3. Colliders ────────────────────────────────────────────────────

const PIJAKAN = new Set(['alas', 'undak']);

test('Markas: setiap bagian menyatakan collider; penghalang ≥ 0,70 m, pijakan ≤ 0,35 m', () => {
  assert.deepEqual(O.peringatan.filter((p) => p.includes('[fisika]')), []);
  const daftar = O.f._kelompok.get(KELOMPOK_OOLA).filter((e) => e.pemilik === 'markas_penjelajah');
  const nama = daftar.map((e) => e.deskriptor.nama).sort();
  assert.deepEqual(nama, ['alas', 'balai', 'bangku', 'meja_kanan', 'meja_kiri', 'menara', 'papan_hasil', 'undak']);
  const alasAtas = M.Y_ALAS;
  for (const { deskriptor: d } of daftar) {
    const bawah = d.letak[1] - d.ukuran[1] / 2;
    const atas = d.letak[1] + d.ukuran[1] / 2;
    if (PIJAKAN.has(d.nama)) {
      assert.ok(atas <= 0.35 + 1e-9, `${d.nama}: pijakan setinggi ${atas} m tidak bisa didaki (> 0,35)`);
      continue;
    }
    // Diukur dari permukaan tempat pemain berdiri di sebelahnya: tanah atau alas.
    const lantai = bawah >= alasAtas - 1e-9 ? alasAtas : 0;
    assert.ok(atas - lantai >= 0.70 - 1e-9, `${d.nama}: ${(atas - lantai).toFixed(2)} m di atas lantai < 0,70 — bisa dipanjat`);
  }
  // Setiap meja mesh punya volume yang menutupinya.
  const meja = daftar.filter((e) => e.deskriptor.nama.startsWith('meja_'));
  for (const x of M.MEJA.x) {
    assert.ok(meja.some(({ deskriptor: d }) => Math.abs(x - d.letak[0]) <= d.ukuran[0] / 2 - 0.49),
      `meja di x=${x} tanpa collider yang menutupinya`);
  }
});

test('Markas: pemain tidak bisa naik ke atas meja, papan, atau bangku (kapsul Rapier sungguhan)', () => {
  const m = O.world.markas;
  const k = buatKarakter(O.f, { x: 0, y: 0, z: 2 });
  try {
    const benda = [
      ['meja_1', M.MEJA.x[0], M.MEJA.z], ['meja_3', M.MEJA.x[2], M.MEJA.z],
      ['papan', M.PAPAN_HASIL.x, M.PAPAN_HASIL.z], ['bangku', M.BANGKU.x, M.BANGKU.z],
    ];
    for (const [nama, lx, lz] of benda) {
      // Datang lurus dari depan (z lokal +1,6 m) menuju pusat benda.
      const awal = pusatDunia(m.letak, m.letak.rotasiY, [lx, 0, lz + 1.6]);
      const tuju = pusatDunia(m.letak, m.letak.rotasiY, [lx, 0, lz]);
      teleportKarakter(k, { x: awal.x, y: 0.2, z: awal.z });
      let yMaks = -1;
      for (let i = 0; i < 90; i++) {
        const p = kakiKarakter(k);
        yMaks = Math.max(yMaks, langkahKarakter(k, { dt: 1 / 60, arah: [tuju.x - p.x, tuju.z - p.z] }).kaki.y);
      }
      assert.ok(yMaks < 0.2 + 0.05, `${nama}: pemain naik sampai y=${yMaks.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Markas: di dalam pulau, tidak menempel ke prop lain, dan tidak memotong jalur patroli NPC', async () => {
  const { NPCS } = await import('../src/data/config.js');
  const daftar = O.f._kelompok.get(KELOMPOK_OOLA);
  const milik = daftar.filter((e) => e.pemilik === 'markas_penjelajah');
  const lain = daftar.filter((e) => !['markas_penjelajah', 'tanah_oola', 'tepi_oola'].includes(e.pemilik));
  const titikMarkas = milik.flatMap(sampelJejak);
  const rMaks = Math.max(...titikMarkas.map(([x, z]) => Math.hypot(x, z)));
  // Dinding cincin mulai di ISLAND_R − 1 + jari kapsul; sisakan lorong ≥ 0,8 m.
  assert.ok(rMaks <= ISLAND_R - 1 + UKURAN_KAPSUL[0] / 2 - 0.8, `Markas sampai r=${rMaks.toFixed(2)} — celah ke tepi < 0,8 m`);
  let jarak = Infinity; let siapa = '';
  for (const e of lain) {
    const B = sampelJejak(e);
    for (const [x1, z1] of titikMarkas) for (const [x2, z2] of B) {
      const d = Math.hypot(x1 - x2, z1 - z2);
      if (d < jarak) { jarak = d; siapa = e.pemilik; }
    }
  }
  assert.ok(jarak >= 0.8, `Markas ${jarak.toFixed(2)} m dari ${siapa} — celah sempit menjebak kapsul 0,80`);
  for (const n of NPCS) {
    const d = Math.min(...titikMarkas.map(([x, z]) => Math.hypot(x - n.x, z - n.z)));
    // Patroli NPC ±3 m dari titik awal, badan Ø0,76 (NPC.js). NPC tidak bertabrakan (ADR-0015 §8), jadi yang dijaga adalah gambarnya.
    assert.ok(d >= 3 + 0.38 + 0.3, `patroli ${n.id} masuk ke Markas (jarak ${d.toFixed(2)} m)`);
  }
});

function sampelJejak(e) {
  const d = e.deskriptor;
  const p = pusatDunia(e.induk, e.putarY, d.letak ?? [0, 0, 0]);
  if (d.bentuk !== 'kotak') {
    const r = d.ukuran[0] / 2;
    return Array.from({ length: 32 }, (_, i) => [p.x + Math.sin(i / 32 * 2 * Math.PI) * r, p.z + Math.cos(i / 32 * 2 * Math.PI) * r]);
  }
  const rot = e.putarY + (d.putarY ?? 0);
  const c = Math.cos(rot); const s = Math.sin(rot);
  const sudut = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
    const lx = a * d.ukuran[0] / 2; const lz = b * d.ukuran[2] / 2;
    return [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
  });
  const out = [];
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = sudut[i]; const [x2, z2] = sudut[(i + 1) % 4];
    for (let t = 0; t < 1; t += 0.05) out.push([x1 + (x2 - x1) * t, z1 + (z2 - z1) * t]);
  }
  return out;
}

// ── Work points ─────────────────────────────────────────────────────

test('titikKerja(): 4 titik, satu per meja, deterministik dan sama dengan Markas yang terpasang', () => {
  const a = M.titikKerja();
  const b = M.titikKerja();
  assert.equal(a.length, 4);
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((t) => t.id), ['meja_1', 'meja_2', 'meja_3', 'meja_4']);
  assert.deepEqual(a, O.world.markas.titikKerja());
  for (const t of a) {
    assert.ok(Math.abs(t.y - M.Y_ALAS) < 1e-9, `${t.id}: tidak berdiri di alas (y=${t.y})`);
    assert.ok(Math.abs(t.arah - M.LETAK_MARKAS.rotasiY) < 1e-9, `${t.id}: tidak menghadap ke pelataran`);
  }
  // Saling berjauhan: dua agen tidak saling tembus (badan NPC Ø0,76).
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    assert.ok(Math.hypot(a[i].x - a[j].x, a[i].z - a[j].z) >= 0.9, `${a[i].id} terlalu dekat ${a[j].id}`);
  }
});

test('titikKerja(): bebas collider — kapsul pemain muat berdiri di setiap titik', () => {
  const k = buatKarakter(O.f, { x: SPAWN.x, y: 0, z: SPAWN.z });
  try {
    for (const t of M.titikKerja()) {
      const r = ruangBebas(k, { x: t.x, z: t.z, y: t.y });
      assert.equal(r.bebas, true, `${t.id} terhalang (${r.sebab})`);
      assert.ok(Math.abs(r.tanahY - M.Y_ALAS) < 0.02, `${t.id}: lantai di y=${r.tanahY}, bukan alas`);
    }
  } finally { lepasKarakter(k); }
});

/**
 * Breadth-first search over a 0,25 m grid, asking the REAL physics at every cell
 * whether the capsule fits there (ruangBebas, which also enforces step height).
 * Returns the path to each target as a list of cells.
 */
function cariJalur(f, dari, tujuan, { langkah = 0.25, batas = { x: [-10, 4], z: [-17.5, 3.5] } } = {}) {
  const k = buatKarakter(f, { x: dari.x, y: 0, z: dari.z });
  try {
    const kunci = (i, j) => `${i},${j}`;
    const kx = (x) => Math.round((x - batas.x[0]) / langkah);
    const kz = (z) => Math.round((z - batas.z[0]) / langkah);
    const pos = (i, j) => ({ x: batas.x[0] + i * langkah, z: batas.z[0] + j * langkah });
    const awal = [kx(dari.x), kz(dari.z)];
    const dikunjungi = new Map([[kunci(...awal), { dari: null, y: 0 }]]);
    const antre = [awal];
    // A target counts as found when a free cell lies within one grid step of it;
    // the controller walks the last stretch to the exact point (the grid cell
    // nearest a work point may itself touch the desk).
    const DEKAT = langkah * 1.2;
    const ketemu = new Map();
    const sisa = new Set(tujuan);
    const periksa = (i, j) => {
      const p = pos(i, j);
      for (const t of sisa) {
        if (Math.hypot(p.x - t.x, p.z - t.z) <= DEKAT) { ketemu.set(t.id, kunci(i, j)); sisa.delete(t); }
      }
    };
    periksa(...awal);
    while (antre.length && sisa.size) {
      const [i, j] = antre.shift();
      const { y } = dikunjungi.get(kunci(i, j));
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di; const nj = j + dj;
        const kk = kunci(ni, nj);
        if (dikunjungi.has(kk)) continue;
        const p = pos(ni, nj);
        if (p.x < batas.x[0] || p.x > batas.x[1] || p.z < batas.z[0] || p.z > batas.z[1]) continue;
        const r = ruangBebas(k, { x: p.x, z: p.z, y });
        if (!r.bebas) continue;
        dikunjungi.set(kk, { dari: kunci(i, j), y: r.tanahY });
        periksa(ni, nj);
        antre.push([ni, nj]);
      }
    }
    const jalur = new Map();
    for (const t of tujuan) {
      let kk = ketemu.get(t.id);
      if (!kk) { jalur.set(t.id, null); continue; }
      const sel = [];
      while (kk) { const [i, j] = kk.split(',').map(Number); sel.push(pos(i, j)); kk = dikunjungi.get(kk).dari; }
      jalur.set(t.id, sel.reverse());
    }
    return jalur;
  } finally { lepasKarakter(k); }
}

/** Walk the real character controller along a path; returns where it ended. */
function jalani(f, jalur, tujuan) {
  const k = buatKarakter(f, { x: jalur[0].x, y: 0, z: jalur[0].z });
  try {
    const titik = [...jalur.slice(1), { x: tujuan.x, z: tujuan.z }];
    for (const w of titik) {
      for (let i = 0; i < 120; i++) {
        const p = kakiKarakter(k);
        const dx = w.x - p.x; const dz = w.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) break;
        // Last step: slow down so the controller cannot overshoot the target.
        const v = Math.min(5.4, d * 60);
        langkahKarakter(k, { dt: 1 / 60, arah: [dx, dz], kecepatan: v });
      }
    }
    return kakiKarakter(k);
  } finally { lepasKarakter(k); }
}

test('titikKerja(): terjangkau berjalan kaki dari titik muncul — dicari BFS, lalu dijalani pengendali Rapier', () => {
  const titik = M.titikKerja();
  const jalur = cariJalur(O.f, SPAWN, titik);
  for (const t of titik) {
    const j = jalur.get(t.id);
    assert.ok(j, `${t.id} tidak terjangkau dari titik muncul`);
    const akhir = jalani(O.f, j, t);
    const meleset = Math.hypot(akhir.x - t.x, akhir.z - t.z);
    assert.ok(meleset < 0.15, `${t.id}: pengendali berhenti ${meleset.toFixed(2)} m dari titik`);
    assert.ok(Math.abs(akhir.y - t.y) < 0.05, `${t.id}: tiba di y=${akhir.y.toFixed(3)}, bukan di alas`);
  }
});

test('Semua titik status Markas: yang berdiri bebas dan terjangkau; kursi punya titik dekat yang bebas dan terjangkau', () => {
  const semua = Object.keys(M.TITIK).map((n) => M.titikMarkas(n));
  const berdiri = semua.filter((t) => !t.duduk);
  const kursi = semua.filter((t) => t.duduk);
  assert.ok(kursi.length >= 4 && berdiri.length >= 16);
  const k = buatKarakter(O.f, { x: SPAWN.x, y: 0, z: SPAWN.z });
  try {
    for (const t of berdiri) {
      const r = ruangBebas(k, { x: t.x, z: t.z, y: t.y });
      assert.equal(r.bebas, true, `${t.id} terhalang (${r.sebab})`);
      assert.ok(Math.abs(r.tanahY - t.y) < 0.02, `${t.id}: lantai di y=${r.tanahY}, titik menyatakan ${t.y}`);
    }
  } finally { lepasKarakter(k); }
  for (const t of kursi) {
    assert.ok(t.dekat && M.TITIK[t.dekat] && !M.TITIK[t.dekat].duduk, `${t.id}: kursi tanpa titik dekat yang berdiri`);
    const d = M.titikMarkas(t.dekat);
    assert.ok(Math.hypot(d.x - t.x, d.z - t.z) <= 0.9, `${t.id}: titik dekat ${t.dekat} terlalu jauh dari kursinya`);
  }
  const jalur = cariJalur(O.f, SPAWN, berdiri);
  const tak = berdiri.filter((t) => !jalur.get(t.id)).map((t) => t.id);
  assert.deepEqual(tak, [], `tidak terjangkau dari titik muncul: ${tak.join(', ')}`);
});

test('Titik agen di slot berbeda tidak pernah saling tembus (badan NPC Ø0,76)', () => {
  // Slot i memakai meja_i, hasil_i, tanya_i, gagal_i. Dua agen di slot berbeda
  // bisa berada di status APA PUN bersamaan, jadi setiap pasangan lintas slot dijaga.
  const keluarga = ['meja', 'hasil', 'tanya', 'gagal'];
  const dekat = [];
  for (let i = 1; i <= 4; i++) {
    for (let j = i + 1; j <= 4; j++) {
      for (const f of keluarga) {
        for (const g of keluarga) {
          for (const [a, b] of [[`${f}_${i}`, `${g}_${j}`], [`${g}_${i}`, `${f}_${j}`]]) {
            const ta = M.TITIK[a]; const tb = M.TITIK[b];
            const d = Math.hypot(ta.x - tb.x, ta.z - tb.z);
            if (d < 0.9) dekat.push(`${a}~${b} ${d.toFixed(2)} m`);
          }
        }
      }
    }
  }
  assert.deepEqual([...new Set(dekat)], []);
});

test('Tidak ada titik kerja di bawah atap: kepala agen terlihat dari setiap kamera orbit di depan Markas', () => {
  const m = O.world.markas;
  m.root.updateMatrixWorld(true);
  // "Under a roof" = hidden by the roofs, their gold trim, or the hall itself.
  // Desks and the Papan Hasil stand in FRONT of agents on purpose; they are not roofs.
  const penghalang = ['atap', 'emas', 'gading'].map((k) => m.mesh[k]);
  const sisi = penghalang.map((x) => x.material.side);
  penghalang.forEach((x) => { x.material.side = THREE.DoubleSide; });
  try {
    const ray = new THREE.Raycaster();
    const TINGGI_KEPALA = 1.04; // puncak kepala NPC (NPC.js: kepala r 0,32 di y 0,72)
    for (const t of M.titikKerja()) {
      for (const tinggi of [0.72, TINGGI_KEPALA]) {
        const asal = new THREE.Vector3(t.x, t.y + tinggi, t.z);
        // Kamera di depan Markas: azimut ±70° dari arah hadap Markas; φ sepanjang batas kamera.
        for (let da = -70; da <= 70; da += 10) {
          for (let phi = PHI_MIN; phi <= PHI_MAX + 1e-9; phi += (PHI_MAX - PHI_MIN) / 8) {
            const a = m.letak.rotasiY + (da * Math.PI) / 180;
            const arah = new THREE.Vector3(Math.sin(phi) * Math.sin(a), Math.cos(phi), Math.sin(phi) * Math.cos(a));
            ray.set(asal, arah);
            ray.far = 16;
            const kena = ray.intersectObjects(penghalang, false);
            assert.equal(kena.length, 0,
              `${t.id} (tinggi ${tinggi}) tertutup ${kena[0]?.object.name} dari kamera azimut ${da}°, φ ${(phi * 180 / Math.PI).toFixed(0)}°`);
          }
        }
      }
    }
  } finally { penghalang.forEach((x, i) => { x.material.side = sisi[i]; }); }
});

// ── Interaction ─────────────────────────────────────────────────────

test('Markas: volume interaksi "markas" memanggil window.G_UI.openMarkas, dan aman bila belum ada', () => {
  const vol = O.world.interactionVolumes.find((v) => v.id === 'markas');
  assert.ok(vol, 'volume interaksi Markas tidak terdaftar di World');
  assert.match(vol.hint, /Markas Penjelajah/);
  assert.match(vol.hint, /✦/);
  // Titik kerja dan pelataran ada di dalam volume; titik muncul tidak.
  for (const t of M.titikKerja()) assert.ok(vol.containsXZ(t), `${t.id} di luar volume interaksi`);
  assert.equal(vol.containsXZ(SPAWN), false);
  const lama = globalThis.window;
  try {
    globalThis.window = undefined;
    assert.doesNotThrow(() => vol.onUse(), 'onUse melempar saat G_UI belum ada');
    let dipanggil = 0;
    globalThis.window = { G_UI: { openMarkas: () => { dipanggil++; } } };
    vol.onUse();
    assert.equal(dipanggil, 1);
  } finally { globalThis.window = lama; }
});

test('Pindah Spot lalu kembali: Markas dibangun ulang, volume dan collider tidak dobel', async () => {
  const f = new Fisika({ muatRapier });
  const w = new World(new THREE.Scene(), { fisika: f });
  w.mapData = structuredClone(PETA);
  const asli = console.warn; console.warn = () => {};
  try {
    w.build();
    await f.muat();
    const sebelum = f.hitung()[KELOMPOK_OOLA];
    const lama = w.markas;
    assert.equal(M.markasAktif(), lama);
    w.disposeContent();
    assert.equal(w.markas, null);
    assert.equal(M.markasAktif(), null, 'Markas lama masih dianggap aktif setelah Oola dilepas');
    w.rebuildContent();
    assert.notEqual(w.markas, lama);
    assert.equal(M.markasAktif(), w.markas);
    assert.equal(f.hitung()[KELOMPOK_OOLA], sebelum);
    assert.equal(w.interactionVolumes.filter((v) => v.id === 'markas').length, 1);
  } finally { console.warn = asli; }
});
