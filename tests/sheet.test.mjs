// ═══════════════════════════════════════════════════════
// tests/sheet.test.mjs — a live re-render never swaps the button under a finger.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sheet, JEDA_SETELAH_TEKAN_MS } from '../src/ui/Sheet.js';
import { h } from '../src/ui/gw/pohon.js';

function dokumen() {
  const buat = (tag) => {
    const el = {
      tagName: String(tag).toUpperCase(), anak: [], attr: {}, textContent: '', className: '', id: '', dengar: {},
      classList: { add() {}, remove() {} },
      setAttribute(k, v) { this.attr[k] = v; },
      appendChild(a) { this.anak.push(a); return a; },
      append(...a) { this.anak.push(...a); },
      replaceChildren(...a) { this.anak = a; },
      addEventListener(n, fn) { (this.dengar[n] ??= []).push(fn); },
      kirim(n) { for (const fn of this.dengar[n] ?? []) fn({ target: this }); },
      querySelector() { return null; },
      contains() { return false; },
    };
    return el;
  };
  return { createElement: buat, createTextNode: (t) => ({ tag: '#text', textContent: t }), body: buat('body'), activeElement: null };
}

const isi = (sheet) => sheet.sheet.anak[1].anak[0].textContent;

test('an update that lands while pressed waits for the click, then applies', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = new Sheet(dokumen());
  s.buka('otak', h('div', null, h('p', { teks: 'lama' })));
  assert.equal(isi(s), 'lama');

  s.sheet.kirim('pointerdown');
  assert.equal(s.ganti('otak', h('div', null, h('p', { teks: 'baru' }))), true);
  assert.equal(isi(s), 'lama', 'the button under the finger stays the same element');
  s.sheet.kirim('pointerup');
  t.mock.timers.tick(JEDA_SETELAH_TEKAN_MS - 1);
  assert.equal(isi(s), 'lama', 'the click has not arrived yet');
  t.mock.timers.tick(1);
  assert.equal(isi(s), 'baru');

  // Without a press, updates are immediate.
  s.ganti('otak', h('div', null, h('p', { teks: 'langsung' })));
  assert.equal(isi(s), 'langsung');
});

test('the tap opened another view: the waiting update is dropped, never painted over it', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = new Sheet(dokumen());
  s.buka('markas', h('div', null, h('p', { teks: 'markas lama' })));
  s.sheet.kirim('pointerdown');
  s.ganti('markas', h('div', null, h('p', { teks: 'markas basi' })));
  s.sheet.kirim('pointerup');
  s.buka('markas', h('div', null, h('p', { teks: 'markas segar' }))); // the click re-opened the same view
  t.mock.timers.tick(JEDA_SETELAH_TEKAN_MS);
  assert.equal(isi(s), 'markas segar');
});
