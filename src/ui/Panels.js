// ═══════════════════════════════════════════════════════
// Panels.js — Side panels: profile, map, token, dev hub
// + NPC dialog panel
// HTML IDs: av-grid, p-name, map-spots, npc-*
// ═══════════════════════════════════════════════════════

import { SPOTS, AV_PRESETS } from '../data/config.js';

export class Panels {
  constructor() {
    this._avatar  = null;
    this._user    = null;
    this._getName = null;
    this._dialogState = {};
  }

  init(avatar, getName) {
    this._avatar  = avatar;
    this._getName = getName;
    this._buildMapCards();
    this._buildProfileColors();
    return this;
  }

  // ── PANEL OPEN / CLOSE ────────────────────────────────
  openPanel(id) {
    if (id !== 'generator3d-panel') window.G_UI?.stopGeneratorPreview?.();
    this._closeAll();
    document.getElementById(id)?.classList.add('on');
  }

  closePanel(id) {
    document.getElementById(id)?.classList.remove('on');
  }

  _closeAll() {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  }

  // ── PROFILE PANEL ─────────────────────────────────────
  openProfile(user) {
    this._user = user;
    const nameEl = document.getElementById('p-name');
    if (nameEl) nameEl.value = user ? this._getName(user) : '';
    this.openPanel('profile-panel');
    this._syncProfileColorSwatches();
  }

  _buildProfileColors() {
    const grid = document.getElementById('av-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AV_PRESETS.forEach((preset, idx) => {
      const opt = document.createElement('div');
      opt.className = 'av-opt';
      opt.dataset.idx = String(idx);
      opt.innerHTML = `
        <div class="av-swatch" style="background:${preset.hex}"></div>
        <div class="av-lbl">${preset.name}</div>
      `;
      opt.addEventListener('click', () => {
        this._avatar?.setColor(idx);
        grid.querySelectorAll('.av-opt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
      });
      grid.appendChild(opt);
    });
    this._syncProfileColorSwatches();
  }

  _syncProfileColorSwatches() {
    const grid = document.getElementById('av-grid');
    if (!grid || !this._avatar) return;
    const idx = this._avatar.colorIdx;
    grid.querySelectorAll('.av-opt').forEach((el) => {
      el.classList.toggle('sel', Number(el.dataset.idx) === idx);
    });
  }

  // ── MAP PANEL — Warp Spot cards ───────────────────────
  _buildMapCards() {
    const container = document.getElementById('map-spots');
    if (!container) return;
    container.innerHTML = '';

    const hub = document.createElement('div');
    hub.className = 'spot-card';
    hub.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.5em">🏙</span>
        <div style="flex:1">
          <div class="spot-name">Oola Hub</div>
          <div class="spot-meta">Gerbang multiplayer · semua Spot</div>
        </div>
        <span class="spot-badge badge-live">LIVE</span>
      </div>
    `;
    hub.addEventListener('click', () => {
      window.G_UI?.toast('🏙 Kembali ke Oola Hub…', 'g');
      window.G_UI?.warpToOolaHub?.();
      this._closeAll();
    });
    container.appendChild(hub);

    SPOTS.forEach(spot => {
      const isLive = spot.status === 'live';
      const card = document.createElement('div');
      card.className = 'spot-card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.5em">${spot.emoji}</span>
          <div style="flex:1">
            <div class="spot-name">${spot.name}</div>
            <div class="spot-meta">${spot.merchants} merchant · ${spot.vibe}</div>
          </div>
          <span class="spot-badge ${isLive ? 'badge-live' : 'badge-soon'}">${isLive ? 'LIVE' : 'SOON'}</span>
        </div>
      `;
      card.addEventListener('click', () => this._warpTo(spot));
      container.appendChild(card);
    });
  }

  _warpTo(spot) {
    if (spot.status === 'coming') {
      window.G_UI?.toast(`🔜 ${spot.name} belum tersedia. Coming soon!`, 'a');
      return;
    }
    window.G_UI?.toast(`🌀 Warp ke ${spot.name}…`, 'g');
    window.G_UI?.warpToSpot?.(spot);
    this._closeAll();
  }

  // ── NPC DIALOG ────────────────────────────────────────
  openDialog(npcData) {
    if (this._dialogState[npcData.id] === undefined) {
      this._dialogState[npcData.id] = 0;
    }
    this._showNode(npcData, this._dialogState[npcData.id]);
  }

  _showNode(npcData, nodeIdx) {
    const node = npcData.dialog[nodeIdx];
    if (!node) { this._closeDialog(); return; }

    const nameEl    = document.getElementById('npc-name');
    const roleEl    = document.getElementById('npc-role');
    const msgEl     = document.getElementById('npc-msg');
    const choicesEl = document.getElementById('npc-choices');

    if (nameEl)  nameEl.textContent = npcData.name;
    if (roleEl)  roleEl.textContent = npcData.role;
    if (msgEl)   msgEl.textContent  = node.msg;

    if (choicesEl) {
      choicesEl.innerHTML = '';
      node.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'btn-p btn-sec';
        btn.style.textAlign = 'left';
        btn.style.marginBottom = '4px';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => {
          if (choice.next === -1) {
            delete this._dialogState[npcData.id];
            this._closeDialog();
          } else {
            this._dialogState[npcData.id] = choice.next;
            this._showNode(npcData, choice.next);
          }
        });
        choicesEl.appendChild(btn);
      });
    }

    document.getElementById('npc-panel')?.classList.add('on');
  }

  _closeDialog() {
    document.getElementById('npc-panel')?.classList.remove('on');
  }
}
