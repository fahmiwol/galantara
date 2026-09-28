// ═══════════════════════════════════════════════════════
// tests/dialogAksi.test.mjs — dialog choices that DO something (recruit, mission, Markas).
//
// Guarded (mutation-proven, docs/sprint/LOG-B-dunia-klien.md):
// - `aksi` closes the dialog and reaches the handler with the NPC;
// - `syarat` filters choices; without a filter, conditional choices stay hidden;
// - an action nobody handles is a warning, not a crash;
// - text lands via textContent; the frozen promises ("5 Perak", "Berlian") are gone;
// - Sari, Budi and Maya can be recruited from their first dialog node.
// ═══════════════════════════════════════════════════════

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function elemen(id) {
  const kelas = new Set();
  const el = {
    id, anak: [], textContent: '', className: '', style: {}, dengar: {},
    classList: { add: (c) => kelas.add(c), remove: (c) => kelas.delete(c), contains: (c) => kelas.has(c) },
    appendChild(a) { this.anak.push(a); return a; },
    replaceChildren(...a) { this.anak = a; },
    addEventListener(n, fn) { this.dengar[n] = fn; },
    klik() { this.dengar.click?.(); },
  };
  Object.defineProperty(el, 'innerHTML', { set() { throw new Error('innerHTML is forbidden'); }, get() { return ''; } });
  return el;
}

let dom;
function pasangDom() {
  dom = Object.fromEntries(['npc-name', 'npc-role', 'npc-msg', 'npc-choices', 'npc-panel', 'map-spots', 'av-grid'].map((id) => [id, elemen(id)]));
  globalThis.document = {
    getElementById: (id) => dom[id] ?? null,
    createElement: () => elemen(null),
    querySelectorAll: () => [],
  };
  globalThis.window = { G_UI: null };
}

let Panels, NPCS;
before(async () => {
  pasangDom();
  ({ Panels } = await import('../src/ui/Panels.js'));
  ({ NPCS } = await import('../src/data/config.js'));
});
beforeEach(() => pasangDom());

const npcUji = {
  id: 'sari', name: 'Sari', role: 'Penjejak Intelijen',
  dialog: [{
    msg: '<b>Hai</b>',
    choices: [
      { text: 'Ayo, gabung party-ku!', aksi: 'rekrut', syarat: 'belum_di_party', next: -1 },
      { text: 'Ada misi untukmu', aksi: 'misi', syarat: 'bisa_misi', next: -1 },
      { text: 'Nanti dulu', next: -1 },
    ],
  }],
};
const pilihan = () => dom['npc-choices'].anak.map((b) => b.textContent);

test('an action closes the dialog and reaches the handler with the NPC', () => {
  const p = new Panels();
  const dapat = [];
  p.onAksi((aksi, npc) => dapat.push([aksi, npc.id]));
  p.saringSyarat(() => true);
  p.openDialog(npcUji);
  assert.equal(dom['npc-panel'].classList.contains('on'), true);
  assert.equal(p.dialogNpcId, 'sari');
  dom['npc-choices'].anak[0].klik();
  assert.deepEqual(dapat, [['rekrut', 'sari']]);
  assert.equal(dom['npc-panel'].classList.contains('on'), false);
  assert.equal(p.dialogNpcId, null, 'the NPC may walk again');
});

test('syarat filters choices; with no filter, conditional choices stay hidden', () => {
  const p = new Panels();
  p.openDialog(npcUji);
  assert.deepEqual(pilihan(), ['Nanti dulu']);
  p.saringSyarat((s) => s === 'bisa_misi');
  p.openDialog(npcUji);
  assert.deepEqual(pilihan(), ['Ada misi untukmu', 'Nanti dulu']);
  p.saringSyarat(() => { throw new Error('rusak'); });
  p.openDialog(npcUji);
  assert.deepEqual(pilihan(), ['Nanti dulu'], 'a broken filter hides, never crashes');
});

test('an unhandled action warns instead of crashing; text is set as text', () => {
  const p = new Panels();
  p.saringSyarat(() => true);
  p.openDialog(npcUji);
  assert.equal(dom['npc-msg'].textContent, '<b>Hai</b>');
  const asli = console.warn;
  const peringatan = [];
  console.warn = (...a) => peringatan.push(a.join(' '));
  try {
    dom['npc-choices'].anak[1].klik();
  } finally {
    console.warn = asli;
  }
  assert.match(peringatan[0], /aksi "misi" belum ada penanganannya/);
});

test('Sari, Budi and Maya can be recruited from their first node; no frozen promises', () => {
  for (const id of ['sari', 'budi', 'maya']) {
    const npc = NPCS.find((n) => n.id === id);
    assert.equal(npc.agen, true, id);
    const aksi = npc.dialog[0].choices.filter((c) => c.aksi).map((c) => `${c.aksi}:${c.syarat}`);
    assert.deepEqual(aksi, ['rekrut:belum_di_party', 'misi:bisa_misi', 'markas:di_party'], id);
  }
  const semua = JSON.stringify(NPCS.filter((n) => n.agen));
  assert.doesNotMatch(semua, /Perak|Berlian|reward|item langka/i);
  assert.equal(NPCS.find((n) => n.id === 'sari').role, 'Penjejak Intelijen');
});
