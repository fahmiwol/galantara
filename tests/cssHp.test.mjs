// ═══════════════════════════════════════════════════════
// tests/cssHp.test.mjs — phone layout rules that a browser run found and Node can hold.
//
// A toast is nowrap + max-width with no clipping in index.html. A long message spilled past
// the right edge, and with zoom allowed (D2) the phone widened its layout viewport from 390 to
// 525 px: every fixed control moved off its touch target (tests/alat/uji-m1-hp.cjs caught it).
// gw-markas.css must win over that rule and let the text wrap.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(import.meta.dirname, '..');
const css = readFileSync(join(APP, 'src/ui/gw-markas.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('toasts wrap instead of widening the phone viewport', () => {
  const aturan = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, pilih]) => pilih.split(',').some((p) => /#toast\s*$/.test(p.trim())));
  assert.ok(aturan.length, 'gw-markas.css has a #toast rule');
  const isi = aturan.map(([, , badan]) => badan).join(';');
  assert.match(isi, /white-space:\s*normal/);
  assert.match(isi, /overflow-wrap:\s*anywhere/, 'a guest id has no spaces to break at');
  // Specific enough to beat index.html's inline `#toast{…white-space:nowrap…}` (later + higher).
  assert.ok(aturan.some(([, pilih]) => /html\s+body\s+#toast/.test(pilih)));
  const indeks = readFileSync(join(APP, 'index.html'), 'utf8');
  assert.ok(indeks.indexOf('gw-markas.css') > 0);
});
