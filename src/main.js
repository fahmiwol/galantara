// ═══════════════════════════════════════════════════════
// main.js — Bootstrap entry point
// Galantara — Pasar Malam Digital Indonesia
// ═══════════════════════════════════════════════════════

import { Game } from './core/Game.js';

// Tunggu Three.js dan Supabase load
function waitReady(fn) {
  if (typeof THREE !== 'undefined') {
    fn();
  } else {
    setTimeout(() => waitReady(fn), 50);
  }
}

/** GLTFLoader tidak ada di three.min.js — muat sekali untuk AssetLibrary / manifest GLB. */
function ensureGLTFLoader() {
  return new Promise((resolve) => {
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src =
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

waitReady(() => {
  ensureGLTFLoader().then(() => {
    const game = new Game();
    game.init();

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      window._game = game;
    }
  });
});
