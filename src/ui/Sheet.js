// ═══════════════════════════════════════════════════════
// Sheet.js — one bottom sheet (phone) / right drawer (desktop) for the party UI.
//
// Accessibility (design §9.2): focus goes to the title when a sheet opens and back to the
// control that opened it when it closes; Esc and the scrim close it; status changes are
// announced through a polite live region ("Sari: hasil siap"). Keys typed into a field stay in
// the field: the world's E/F/WASD handlers never see them.
// ═══════════════════════════════════════════════════════

import { render } from './gw/pohon.js';

const BIDANG = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export class Sheet {
  constructor(doc = globalThis.document) {
    this.doc = doc;
    this.lapis = null;
    this.sheet = null;
    this.umum = null;
    this._pemicu = null;
    this._onTutup = null;
    this.terbuka = false;
    /** Name of the open view ('markas', 'rekrut', …) so updates can re-render the right one. */
    this.nama = null;
  }

  _pastikan() {
    if (this.lapis) return;
    const d = this.doc;
    this.lapis = d.createElement('div');
    this.lapis.id = 'gw-lapis';
    const tirai = d.createElement('div');
    tirai.className = 'gw-tirai';
    tirai.addEventListener('click', () => this.tutup());
    this.sheet = d.createElement('section');
    this.sheet.className = 'gw-sheet';
    this.sheet.setAttribute('role', 'dialog');
    this.sheet.setAttribute('aria-modal', 'false');
    this.sheet.setAttribute('aria-labelledby', 'gw-judul');
    this.lapis.append(tirai, this.sheet);
    this.lapis.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.tutup();
        return;
      }
      if (BIDANG.has(e.target?.tagName)) e.stopPropagation();
    });
    this.umum = d.createElement('div');
    this.umum.className = 'gw-umum';
    this.umum.setAttribute('aria-live', 'polite');
    this.umum.setAttribute('role', 'status');
    d.body.append(this.lapis, this.umum);
  }

  /**
   * Show a view tree. Re-opening while open swaps the content (one sheet at a time).
   * @param {string} nama view name
   * @param {any} pohon tree from tampilan.js
   * @param {{onTutup?: () => void, fokus?: boolean}} [opsi]
   */
  buka(nama, pohon, { onTutup = null, fokus = true } = {}) {
    this._pastikan();
    if (!this.terbuka) {
      const aktif = this.doc.activeElement;
      this._pemicu = aktif && aktif !== this.doc.body ? aktif : null;
    }
    this._onTutup = onTutup;
    this.nama = nama;
    this.sheet.replaceChildren(this._pegangan(), render(pohon, this.doc));
    this.lapis.classList.add('on');
    this.terbuka = true;
    if (fokus) this.sheet.querySelector('#gw-judul')?.focus?.({ preventScroll: true });
  }

  /** Re-render the open view without moving focus (live status updates). */
  ganti(nama, pohon) {
    if (!this.terbuka || this.nama !== nama) return false;
    const aktif = this.doc.activeElement;
    // Never yank a sheet out from under someone typing.
    if (aktif && this.sheet.contains(aktif) && BIDANG.has(aktif.tagName)) return false;
    this.sheet.replaceChildren(this._pegangan(), render(pohon, this.doc));
    return true;
  }

  tutup() {
    if (!this.terbuka) return;
    this.lapis.classList.remove('on');
    this.sheet.replaceChildren();
    this.terbuka = false;
    this.nama = null;
    const kembali = this._pemicu;
    this._pemicu = null;
    const onTutup = this._onTutup;
    this._onTutup = null;
    if (kembali?.isConnected) kembali.focus?.({ preventScroll: true });
    onTutup?.();
  }

  /** Polite announcement for screen readers (e.g. "Sari: hasil siap"). */
  umumkan(teks) {
    this._pastikan();
    this.umum.textContent = '';
    // A new text node after clearing makes repeated messages announce again.
    setTimeout(() => { this.umum.textContent = String(teks); }, 30);
  }

  /** Element in the open sheet (forms read their fields through this). */
  cari(selector) {
    return this.sheet?.querySelector(selector) ?? null;
  }

  _pegangan() {
    const g = this.doc.createElement('div');
    g.className = 'gw-pegangan';
    g.setAttribute('aria-hidden', 'true');
    return g;
  }
}
