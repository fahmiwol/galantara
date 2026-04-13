// ═══════════════════════════════════════════════════════
// avatarPreferences.js — Warna avatar (persist per perangkat)
// Nanti bisa disinkronkan ke profil Supabase; saat ini localStorage.
// ═══════════════════════════════════════════════════════

const KEY_COLOR = 'galantara_avatar_color_idx';

/** @returns {number | null} indeks preset, atau null jika belum pernah disimpan */
export function getSavedAvatarColorIndex() {
  try {
    const raw = localStorage.getItem(KEY_COLOR);
    if (raw === null || raw === '') return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** @param {number} idx */
export function setSavedAvatarColorIndex(idx) {
  try {
    localStorage.setItem(KEY_COLOR, String(idx));
  } catch {
    /* private mode / quota */
  }
}
