// ═══════════════════════════════════════════════════════
// LoginModal.js — Manages login modal (Google + email)
// HTML: id="lm", toggle class "on"
// ═══════════════════════════════════════════════════════

export class LoginModal {
  constructor() {
    this._el        = document.getElementById('lm');
    this._emailWrap = document.getElementById('lm-email-wrap');
    this._mainBtns  = document.getElementById('lm-main-btns');
  }

  init() {
    // Close when clicking the backdrop (the #lm element itself)
    this._el?.addEventListener('click', (e) => {
      if (e.target === this._el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
    return this;
  }

  open() {
    // Reset to main buttons view
    if (this._emailWrap) this._emailWrap.style.display = 'none';
    if (this._mainBtns)  this._mainBtns.style.display  = 'flex';
    this._el?.classList.add('on');
  }

  close() {
    this._el?.classList.remove('on');
  }

  showEmailInput() {
    if (this._mainBtns)  this._mainBtns.style.display  = 'none';
    if (this._emailWrap) this._emailWrap.style.display = 'block';
    setTimeout(() => document.getElementById('lm-email-input')?.focus(), 100);
  }
}
