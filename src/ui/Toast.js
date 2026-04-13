// ═══════════════════════════════════════════════════════
// Toast.js — Notifikasi pop-up singkat
// ═══════════════════════════════════════════════════════

export class Toast {
  constructor() {
    this._queue  = [];
    this._active = false;
    this._el     = document.getElementById('toast');
  }

  // type: 'g' = hijau (sukses), 'a' = amber (peringatan), 'r' = merah (error)
  show(msg, type = 'g') {
    this._queue.push({ msg, type });
    if (!this._active) this._next();
  }

  _next() {
    if (!this._queue.length) { this._active = false; return; }
    this._active = true;

    const { msg, type } = this._queue.shift();
    const el = this._el;
    if (!el) { this._next(); return; }

    el.textContent = msg;
    el.className   = 'on';

    // Color override per type (CSS has .g and .a, add inline for .r)
    if (type === 'r') {
      el.style.background = 'rgba(239,68,68,.9)';
    } else {
      el.style.background = '';
      el.classList.add(type);
    }

    setTimeout(() => {
      el.className = '';
      el.style.background = '';
      setTimeout(() => this._next(), 300);
    }, 2800);
  }
}
