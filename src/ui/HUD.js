// ═══════════════════════════════════════════════════════
// HUD.js — Top bar, hamburger menu, prox hints
// HTML IDs: hud-login, hud-user, prox, hamburger-btn,
//           hamburger-menu, login-gate, bottom-bar
// ═══════════════════════════════════════════════════════

import { MENU_ITEMS } from '../data/config.js';

export class HUD {
  constructor() {
    this._loginBtnEl  = document.getElementById('hud-login');
    this._userEl      = document.getElementById('hud-user');
    this._hamburgerEl = document.getElementById('hamburger-btn');
    this._menuEl      = document.getElementById('hamburger-menu');
    this._proxEl      = document.getElementById('prox');
    this._npcEl       = document.getElementById('npc-hint');
    this._loginGate   = document.getElementById('login-gate');
    this._bottomBar   = document.getElementById('bottom-bar');
    this._menuOpen    = false;
  }

  init() {
    this._buildMenu();
    this._bindHamburger();
    // One tab bar for guests and members (design §9.1). The long login banner is retired:
    // "Masuk" lives in the HUD (desktop) and behind the Profil tab (phone).
    this._bottomBar?.classList.add('on');
    if (this._loginGate) this._loginGate.style.display = 'none';
    return this;
  }

  // ── BUILD HAMBURGER MENU ──────────────────────────────
  _buildMenu() {
    if (!this._menuEl) return;
    this._menuEl.innerHTML = '';
    MENU_ITEMS.forEach(item => {
      const li = document.createElement('li');
      li.style.cssText = 'list-style:none;display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;border-radius:8px;transition:background .15s;font-size:13px;font-weight:700;color:#1E1040;';
      li.innerHTML = `<span style="font-size:16px">${item.icon}</span> ${item.label}`;
      li.addEventListener('mouseover', () => li.style.background = 'rgba(124,58,237,.07)');
      li.addEventListener('mouseout',  () => li.style.background = '');
      li.addEventListener('click', () => {
        this.closeMenu();
        try { eval(item.action); } catch (_) {}
      });
      this._menuEl.appendChild(li);
    });
  }

  _bindHamburger() {
    this._hamburgerEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._menuOpen ? this.closeMenu() : this.openMenu();
    });
    document.addEventListener('click', (e) => {
      if (this._menuOpen && !this._menuEl?.contains(e.target)) {
        this.closeMenu();
      }
    });
  }

  openMenu()  { this._menuOpen = true;  this._menuEl?.classList.add('open'); }
  closeMenu() { this._menuOpen = false; this._menuEl?.classList.remove('open'); }

  // ── AUTH STATE ────────────────────────────────────────
  setLoggedIn(user, getName) {
    if (this._loginBtnEl) this._loginBtnEl.style.display = 'none';
    if (this._userEl) {
      this._userEl.textContent = getName(user);
      this._userEl.style.display = '';
    }
  }

  setLoggedOut() {
    if (this._loginBtnEl) this._loginBtnEl.style.display = '';
    if (this._userEl)     this._userEl.style.display = 'none';
  }

  /** Label Spot / hub di HUD (Sprint 5). */
  setSpotLabel(text) {
    const el = document.getElementById('hud-spot');
    if (el) el.textContent = text;
  }

  // ── PROX ZONE HINT ───────────────────────────────────
  showZoneHint(text) {
    if (!this._proxEl) return;
    this._proxEl.textContent = text;
    this._proxEl.classList.add('on');
  }

  hideZoneHint() {
    if (!this._proxEl) return;
    if (!this._npcEl?.classList.contains('on')) {
      this._proxEl.classList.remove('on');
    }
  }

  // ── NPC HINT ─────────────────────────────────────────
  /**
   * "Sari · Penjejak Intelijen [💬 Ngobrol]": a real button, so a phone can open the dialog
   * without a keyboard (design D1). Built with textContent: names may come from the runtime.
   * @param {{name:string, role?:string}} npc
   * @param {() => void} onNgobrol
   */
  showNpcHint(npc, onNgobrol) {
    if (!this._proxEl) return;
    const teks = document.createElement('span');
    teks.className = 'prox-teks';
    teks.textContent = npc?.role ? `${npc.name} · ${npc.role}` : String(npc?.name ?? '');
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'prox-aksi';
    tombol.textContent = '💬 Ngobrol';
    const kbd = document.createElement('span');
    kbd.className = 'prox-kbd';
    kbd.textContent = '[E]';
    tombol.appendChild(kbd);
    tombol.addEventListener('click', (e) => { e.stopPropagation(); onNgobrol?.(); });
    this._proxEl.replaceChildren(teks, tombol);
    this._proxEl.classList.add('on');
  }

  hideNpcHint() {
    if (!this._proxEl) return;
    this._proxEl.classList.remove('on');
  }
}
