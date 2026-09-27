// ═══════════════════════════════════════════════════════
// tests/markasPerabot.test.mjs — Nusantara office props in the Markas
//
// SPRINT-02 C butir 4: gelas enamel + termos, mesin ketik, radio transistor, kalender
// dinding, rak arsip, tikar pandan; each ≤ 300 triangles, one shared material,
// instanced where they repeat. Guarded with the REAL three r128:
//   - per kind ≤ 300 triangles, vertex colours only from the Senja/Oola palette
//   - the Markas pays exactly 2 draw calls for all of them, 0 shadow casters
//   - the cups follow the party slots (data), not decoration
//   - every prop rests on its surface (no floating, no sinking) and none stands
//     where an agent stands at any Markas point
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

if (!globalThis.THREE) {
  const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
  const modul = { exports: {} };
  new Function('module', 'exports', sumber)(modul, modul.exports);
  globalThis.THREE = modul.exports;
}

const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const M = await import('../src/world/markas/index.js');

const TINGGI_AGEN = 1.23;
const JARI_AGEN = 0.38; // NPC body ball (NPC.js)

function bangun(slotTerisi = 0) {
  const k = new M.KeadaanMarkas();
  for (let i = 0; i < slotTerisi; i++) k.setelStatus(`ag_${i}`, 'bekerja', { slot: i });
  const m = new M.MarkasPenjelajah();
  m.bangun();
  m.tampilkan(k);
  return m;
}

const tri = (g) => g.attributes.position.count / 3;

test('perabot: enam jenis, masing-masing ≤ 300 segitiga, non-indexed, berwarna verteks dari palet Senja/Oola saja', () => {
  assert.deepEqual([...M.JENIS_PERABOT].sort(), ['gelas_termos', 'kalender', 'mesin_ketik', 'radio', 'rak_arsip', 'tikar_pandan']);
  const palet = new Set(Object.values(M.WARNA_PERABOT).map((h) => new THREE.Color(h).toArray().map((v) => v.toFixed(4)).join()));
  for (const j of M.JENIS_PERABOT) {
    const g = M.geometriPerabot(j);
    assert.ok(tri(g) <= 300, `${j}: ${tri(g)} segitiga > 300`);
    assert.ok(tri(g) >= 20, `${j}: ${tri(g)} segitiga — bendanya hilang?`);
    assert.equal(g.index, null, `${j}: harus non-indexed (digabung)`);
    const c = g.attributes.color;
    for (let i = 0; i < c.count; i++) {
      const w = [c.getX(i), c.getY(i), c.getZ(i)].map((v) => v.toFixed(4)).join();
      assert.ok(palet.has(w), `${j}: warna di luar palet (${w})`);
    }
    assert.equal(M.geometriPerabot(j), g, `${j}: geometri dibuat ulang`);
  }
  assert.throws(() => M.geometriPerabot('kursi_plastik'), /perabot tidak dikenal: "kursi_plastik"/);
});

test('perabot: Markas membayar tepat 2 draw call untuk semuanya, satu bahan, tanpa kaster bayangan', () => {
  const kosong = bangun(0);
  const penuh = bangun(4);
  assert.equal(kosong.perabot.material, penuh.gelas.material);
  assert.equal(kosong.perabot.material, M.bahanPerabot());
  assert.ok(!kosong.perabot.castShadow && !kosong.gelas.castShadow);
  // Tanpa perabot sama sekali: lepas keduanya dari pohon lalu ukur selisihnya.
  const dengan = ukurPohon(penuh.root);
  penuh.root.remove(penuh.perabot); penuh.root.remove(penuh.gelas);
  const tanpa = ukurPohon(penuh.root);
  assert.equal(dengan.drawCall - tanpa.drawCall, 2, `perabot ${dengan.drawCall - tanpa.drawCall} draw call`);
  assert.equal(dengan.kaster, tanpa.kaster);
  // Yang muncul sekali digabung: jumlah segitiganya = jumlah jenisnya.
  const sekali = ['mesin_ketik', 'rak_arsip', 'radio', 'kalender', 'tikar_pandan'].reduce((a, j) => a + tri(M.geometriPerabot(j)), 0);
  assert.equal(tri(kosong.perabot.geometry), sekali);
});

test('gelas + termos mengikuti slot party: 0 slot = 0 gelas, n slot = n gelas di meja slot itu', () => {
  assert.equal(bangun(0).gelas.count, 0);
  for (const n of [1, 2, 4]) {
    const m = bangun(n);
    assert.equal(m.gelas.count, n);
    const mat = new THREE.Matrix4(); const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      m.gelas.getMatrixAt(i, mat);
      p.setFromMatrixPosition(mat);
      const t = M.PERABOT.gelas_termos[i];
      assert.ok(p.distanceTo(new THREE.Vector3(t.x, t.y, t.z)) < 1e-6, `gelas ${i} tidak di meja slot ${i}`);
    }
  }
  // Slot yang kosong di tengah: gelas hanya di meja slot yang terisi.
  const k = new M.KeadaanMarkas();
  k.setelStatus('a', 'bekerja', { slot: 3 });
  const m = new M.MarkasPenjelajah(); m.bangun(); m.tampilkan(k);
  const mat = new THREE.Matrix4(); m.gelas.getMatrixAt(0, mat);
  assert.equal(m.gelas.count, 1);
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixPosition(mat).x - M.PERABOT.gelas_termos[3].x) < 1e-6);
});

/** Bounding box of one placed prop in the Markas frame. */
function kotakPerabot(jenis, t) {
  const g = M.geometriPerabot(jenis).clone().applyMatrix4(M.matriksPerabot(t));
  g.computeBoundingBox();
  return g.boundingBox;
}

test('perabot bertumpu di permukaannya: tidak melayang, tidak tenggelam; kalender menempel dinding di celah pintu–jendela', () => {
  const Y = M.Y_ALAS; const atasMeja = Y + M.MEJA.ukuran[1];
  const cek = (nama, bb, lantai) => assert.ok(Math.abs(bb.min.y - lantai) <= 0.01, `${nama}: dasar di y=${bb.min.y.toFixed(3)}, permukaan ${lantai.toFixed(3)}`);
  M.PERABOT.gelas_termos.forEach((t, i) => {
    const bb = kotakPerabot('gelas_termos', t);
    cek(`gelas ${i}`, bb, atasMeja);
    const x0 = M.MEJA.x[i] - M.MEJA.ukuran[0] / 2; const x1 = M.MEJA.x[i] + M.MEJA.ukuran[0] / 2;
    assert.ok(bb.min.x >= x0 && bb.max.x <= x1 && bb.min.z >= M.MEJA.z - M.MEJA.ukuran[2] / 2 && bb.max.z <= M.MEJA.z + M.MEJA.ukuran[2] / 2, `gelas ${i} keluar dari meja`);
  });
  const mk = kotakPerabot('mesin_ketik', M.PERABOT.mesin_ketik);
  cek('mesin ketik', mk, atasMeja);
  assert.ok(mk.min.x >= M.MEJA.x[1] - 0.5 && mk.max.x <= M.MEJA.x[1] + 0.5, 'mesin ketik keluar dari meja 2');
  const rak = kotakPerabot('rak_arsip', M.PERABOT.rak_arsip);
  cek('rak arsip', rak, Y);
  cek('radio', kotakPerabot('radio', M.PERABOT.radio), rak.max.y);
  const radio = kotakPerabot('radio', M.PERABOT.radio);
  // The radio's footprint centre lies on the shelf top.
  assert.ok(M.PERABOT.radio.x > rak.min.x && M.PERABOT.radio.x < rak.max.x && M.PERABOT.radio.z > rak.min.z && M.PERABOT.radio.z < rak.max.z, 'radio tidak di atas rak');
  const tikar = kotakPerabot('tikar_pandan', M.PERABOT.tikar_pandan);
  assert.ok(tikar.min.y > Y && tikar.max.y <= Y + 0.012, `tikar tidak rebah di alas (${tikar.min.y.toFixed(3)}–${tikar.max.y.toFixed(3)})`);
  const kal = kotakPerabot('kalender', M.PERABOT.kalender);
  assert.ok(kal.min.z >= M.Z_DINDING_DEPAN && kal.max.z <= M.Z_DINDING_DEPAN + 0.02, 'kalender tidak menempel dinding depan');
  // Gap between the door (x 0,3 ± 0,5) and the right window (1,75 ± 0,45).
  assert.ok(kal.min.x >= 0.8 && kal.max.x <= 1.3, `kalender menutupi pintu/jendela (${kal.min.x.toFixed(2)}–${kal.max.x.toFixed(2)})`);
  // The shelf stands against the east side wall, back to the wall, inside the terrace.
  assert.ok(rak.min.x >= M.X_DINDING_TIMUR - 1e-6 && rak.min.x <= M.X_DINDING_TIMUR + 0.02, 'rak tidak menempel dinding timur');
  assert.ok(rak.max.x <= M.ALAS.letak[0] + M.ALAS.ukuran[0] / 2 - 0.8, 'rak menutup jalan di sisi timur (sisakan ≥ 0,8 m)');
});

test('perabot tidak berdiri di tempat agen: tabung badan agen (Ø0,76 × 1,23 m) di setiap titik Markas bebas perabot', () => {
  const benda = [
    ...M.PERABOT.gelas_termos.map((t) => ['gelas_termos', t]),
    ...['mesin_ketik', 'rak_arsip', 'radio', 'kalender'].map((j) => [j, M.PERABOT[j]]),
  ];
  for (const [nama, t] of Object.entries(M.TITIK)) {
    const lantai = M.TINGGI_LANTAI[t.lantai];
    for (const [jenis, letak] of benda) {
      const g = M.geometriPerabot(jenis).clone().applyMatrix4(M.matriksPerabot(letak));
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y < lantai || y > lantai + TINGGI_AGEN) continue;
        const d = Math.hypot(p.getX(i) - t.x, p.getZ(i) - t.z);
        assert.ok(d >= JARI_AGEN, `${jenis} menembus agen di titik ${nama} (${d.toFixed(2)} m dari pusatnya)`);
      }
    }
  }
});

test('rak arsip tertutup collider balai (satu volume, ADR-0016), setinggi radio di atasnya', () => {
  const balai = M.FISIKA_MARKAS.find((d) => d.nama === 'balai');
  const bb = kotakPerabot('rak_arsip', M.PERABOT.rak_arsip);
  const [ux, uy, uz] = balai.ukuran; const [lx, ly, lz] = balai.letak;
  assert.ok(lx + ux / 2 >= bb.max.x - 1e-9 && lz - uz / 2 <= bb.min.z && lz + uz / 2 >= bb.max.z, 'collider balai tidak menutupi rak — pemain menembus rak');
  assert.ok(ly + uy / 2 >= M.PERABOT.radio.y + 0.15, 'collider lebih rendah dari radio di atas rak');
});
