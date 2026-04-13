// ═══════════════════════════════════════════════════════
// Chat.js — Text chat panel UI
// ═══════════════════════════════════════════════════════

export class Chat {
  constructor() {
    this._panel   = null;
    this._msgs    = null;
    this._input   = null;
    this._open    = false;
    this._onSend  = null;
    this._myName  = 'Aku';
    /** Label Spot dari HUD (`Oola Hub` atau nama SPOTS). */
    this._spotLabel = 'Oola Hub';
  }

  init(myName) {
    this._myName = myName || 'Aku';
    this._panel  = document.getElementById('chat-panel');
    this._msgs   = document.getElementById('chat-messages');
    this._input  = document.getElementById('chat-input');
    this._tab    = document.getElementById('chat-tab');

    // Sidebar mulai terbuka
    this._open = true;

    // Enter = kirim, stopPropagation biar WASD tidak trigger avatar
    this._input?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this._send();
    });

    // Tombol kirim
    document.getElementById('chat-send-btn')?.addEventListener('click', () => this._send());

    this._renderTabLabel();
  }

  /** Sinkron teks tab chat dengan spot (bukan selalu "Oola"). */
  setSpotContext(label) {
    this._spotLabel = label && String(label).trim() ? String(label).trim() : 'Oola Hub';
    this._renderTabLabel();
  }

  _chatTabTitle() {
    return this._spotLabel === 'Oola Hub' ? 'OOLA CHAT' : `CHAT · ${this._spotLabel}`;
  }

  _renderTabLabel() {
    if (!this._tab) return;
    const arrow = this._open ? '▼' : '▲';
    this._tab.innerHTML = `${arrow} <span>${this._chatTabTitle()}</span>`;
  }

  onSend(fn) { this._onSend = fn; }

  _send() {
    const msg = this._input?.value.trim();
    if (!msg) return;
    this._onSend?.(msg);
    this._input.value = '';
    this._input.focus();
  }

  // Tambah pesan ke panel (dari server broadcast)
  addMessage({ name, msg }) {
    if (!this._msgs) return;
    const isSelf = name === this._myName;

    const el = document.createElement('div');
    el.className = 'cm' + (isSelf ? ' me' : '');
    el.innerHTML = `<span class="cn">${_esc(name)}</span><span class="ct">${_esc(msg)}</span>`;
    this._msgs.appendChild(el);
    this._msgs.scrollTop = this._msgs.scrollHeight;

    // Max 60 pesan
    while (this._msgs.children.length > 60) {
      this._msgs.removeChild(this._msgs.firstChild);
    }

    // Kalau panel tertutup, badge notif
    if (!this._open) this._badge();
  }

  _badge() {
    const btn = document.getElementById('chat-toggle-btn');
    if (btn) btn.dataset.badge = '●';
  }

  toggle() {
    this._open ? this.close() : this.open();
  }

  open() {
    this._open = true;
    this._panel?.classList.remove('collapsed');
    this._renderTabLabel();
    this._input?.focus();
    const btn = document.getElementById('chat-toggle-btn');
    if (btn) delete btn.dataset.badge;
  }

  close() {
    this._open = false;
    this._panel?.classList.add('collapsed');
    this._renderTabLabel();
  }

  setName(name) { this._myName = name; }
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
