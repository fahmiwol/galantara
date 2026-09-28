// ═══════════════════════════════════════════════════════
// tests/agen3dPenanda.test.mjs — the ✦ foot ring: human vs AI at 36 px
//
// Laporan 3D §6a butir 3: "pemain & agen terbedakan di 36 px". Checked here
// without a GPU, on the real NPC mesh (NPC.js) and THREE r128:
//   - cost: 1 draw call per agent, or 1 for a whole crowd; nothing casts shadow
//   - shape: a hollow band outside the NPC body, four ✦ tips pointing outward
//   - size: the band is ≥ 2 px wide at the smallest drawn size (36 px per 1,23 m)
//   - colour: the ring is UNLIT, so its pixels are its material colours; the
//     ground side uses the Oola ground pixels measured in Chrome (DayNight.js,
//     ADR-0017). In every light and every vision one band is ≥ ΔE 20 off.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const { NPCManager } = await import('../src/entities/NPC.js');
const A = await import('../src/world/agen/index.js');
const { deltaEPenglihatan, PENGLIHATAN } = await import('../src/world/agen/warna.js');

/** Oola ground as RENDERED at the calibrated hours (DayNight.js header, 15 Sep 2026). */
const TANAH_TERUKUR = Object.freeze({
  '00:00': '#283b4c', '04:30': '#223344', '05:30': '#3d5258', '06:45': '#b4b16a', '10:00': '#a5d29c',
  '12:30': '#addca6', '15:00': '#a9d296', '17:15': '#b7ae57', '18:24': '#61555e', '19:45': '#283b4a',
});

function npcBaru() {
  const m = new NPCManager(new THREE.Scene()).build();
  return m.npcs.find((n) => n.data.id === 'sari');
}

test('penanda: satu draw call per agen, tanpa bayangan, geometri dan bahan dipakai bersama', () => {
  const a = npcBaru(); const b = npcBaru();
  const sebelum = ukurPohon(a.mesh);
  const pa = A.pasangPenandaAgen(a.mesh);
  const pb = A.pasangPenandaAgen(b.mesh);
  const sesudah = ukurPohon(a.mesh);
  assert.equal(sesudah.drawCall - sebelum.drawCall, 1);
  assert.equal(sesudah.kaster, sebelum.kaster, 'cincin tidak boleh menambah pass bayangan');
  assert.equal(pa.cincin.geometry, pb.cincin.geometry, 'geometri dibuat ulang per agen');
  assert.equal(pa.cincin.material, pb.cincin.material, 'bahan baru per agen (laporan 3D §5 butir 2)');
  assert.equal(a.mesh.userData.agenAI, true);
  // Dipasang dua kali = tetap satu cincin.
  assert.equal(A.pasangPenandaAgen(a.mesh), pa);
  assert.equal(ukurPohon(a.mesh).drawCall, sesudah.drawCall);
  pa.lepas();
  assert.equal(ukurPohon(a.mesh).drawCall, sebelum.drawCall);
  assert.equal(a.mesh.userData.penandaAgen, undefined);
});

test('penanda: pita berongga di luar badan NPC, empat ujung ✦ menunjuk keluar', () => {
  const npc = npcBaru();
  const badan = npc.mesh.children[0];
  const jariBadan = badan.geometry.parameters.radius * Math.max(badan.scale.x, badan.scale.z);
  const U = A.UKURAN_PENANDA;
  assert.ok(U.dalam > jariBadan + 0.04, `cincin (${U.dalam}) tertutup badan NPC (${jariBadan})`);

  const pos = A.geometriPenanda().attributes.position;
  const col = A.geometriPenanda().attributes.color;
  const p = new THREE.Vector3();
  let rMin = Infinity; const ujung = [];
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    assert.ok(Math.abs(p.y) < 1e-6, 'penanda harus datar di lantai');
    const r = Math.hypot(p.x, p.z);
    rMin = Math.min(rMin, r);
    if (r > U.luar + 0.1) ujung.push(Math.round((Math.atan2(p.x, p.z) * 180) / Math.PI));
  }
  assert.ok(Math.abs(rMin - U.dalam) < 1e-3, 'ada isi di dalam cincin — harus berongga (beda dari cakram bayangan pemain)');
  const arah = [...new Set(ujung.map((d) => ((d % 360) + 360) % 360))].sort((x, y) => x - y);
  assert.deepEqual(arah, [0, 90, 180, 270], `ujung ✦ di ${arah}`);
  // Semua titik ujung berwarna emas, pita dalam gelap.
  const emas = new THREE.Color(A.WARNA_PENANDA);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    if (Math.hypot(p.x, p.z) > U.luar + 0.02) {
      assert.ok(Math.abs(col.getX(i) - emas.r) < 1e-6 && Math.abs(col.getY(i) - emas.g) < 1e-6, 'ujung ✦ tidak emas');
    }
  }
  // Menghadap ke atas: normal +Y, supaya terlihat dari kamera orbit.
  const n = A.geometriPenanda().attributes.normal;
  for (let i = 0; i < n.count; i += 3) if (n.getY(i) < 0) assert.fail('ada muka penanda yang menghadap ke bawah');
});

test('penanda: terbaca di ukuran terkecil — pita ≥ 2 px, lebih lebar dari badan ≥ 4 px, pada 36 px per 1,23 m', () => {
  const pxPerM = 36 / 1.23; // laporan 3D §6.3: HP melintang, kamera 16 m
  const U = A.UKURAN_PENANDA;
  assert.ok((U.tengah - U.dalam) * pxPerM >= 1.5, `pita gelap ${((U.tengah - U.dalam) * pxPerM).toFixed(1)} px`);
  assert.ok((U.luar - U.tengah) * pxPerM >= 2, `pita emas ${((U.luar - U.tengah) * pxPerM).toFixed(1)} px`);
  assert.ok((U.luar + U.ujung - 0.38) * pxPerM >= 4, 'ujung ✦ tidak menonjol dari siluet badan');
});

test('penanda: di setiap jam dan setiap penglihatan, salah satu pita berjarak ΔE ≥ 20 dari tanah yang dirender', () => {
  const gagal = [];
  for (const [jam, tanah] of Object.entries(TANAH_TERUKUR)) {
    const emas = deltaEPenglihatan(A.WARNA_PENANDA, tanah);
    const gelap = deltaEPenglihatan(A.WARNA_PENANDA_GELAP, tanah);
    for (const v of PENGLIHATAN) {
      const terbaik = Math.max(emas[v], gelap[v]);
      if (terbaik < 20) gagal.push(`${jam} ${v}: emas ${emas[v].toFixed(1)}, gelap ${gelap[v].toFixed(1)}`);
    }
  }
  assert.deepEqual(gagal, []);
  // Dan kedua pita saling terpisah jauh: cincinnya sendiri berkontras.
  assert.ok(deltaEPenglihatan(A.WARNA_PENANDA, A.WARNA_PENANDA_GELAP).min >= 40);
});

test('penanda kerumunan: 70 agen = 1 draw call, cincin mengikuti posisi setiap agen', () => {
  const scene = new THREE.Scene();
  const k = new A.PenandaKerumunan(scene, 128);
  const agen = [];
  for (let i = 0; i < 70; i++) {
    const g = new THREE.Group();
    g.position.set((i % 10) * 2 - 9, 0.2 * (i % 2), Math.floor(i / 10) * 2 - 7);
    scene.add(g);
    assert.equal(k.pasang(g), true);
    agen.push(g);
  }
  assert.equal(ukurPohon(scene).drawCall, 1);
  agen[5].position.set(3.3, 0.2, -4.4);
  k.perbarui();
  const m = new THREE.Matrix4(); const p = new THREE.Vector3();
  k.mesh.getMatrixAt(5, m); p.setFromMatrixPosition(m);
  assert.ok(Math.abs(p.x - 3.3) < 1e-6 && Math.abs(p.z + 4.4) < 1e-6 && Math.abs(p.y - (0.2 + A.UKURAN_PENANDA.tinggi)) < 1e-6);
  assert.equal(k.mesh.count, 70);
  assert.equal(k.lepas(agen[0]), true);
  assert.equal(k.mesh.count, 69);
  // Kapasitas ditaati, bukan diam-diam menimpa instans lain.
  const kecil = new A.PenandaKerumunan(scene, 2);
  assert.equal(kecil.pasang(new THREE.Group()), true);
  assert.equal(kecil.pasang(new THREE.Group()), true);
  assert.equal(kecil.pasang(new THREE.Group()), false);
  assert.equal(k.mesh.frustumCulled, false, 'instans di tepi layar akan hilang (bola batas r128 = geometri dasar)');
});
