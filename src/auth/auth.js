// ═══════════════════════════════════════════════════════
// auth.js — Supabase Auth module
// Handle: init, Google OAuth, magic link, session restore
// ═══════════════════════════════════════════════════════

import { SUPABASE_URL, SUPABASE_ANON } from '../data/config.js';

let sbClient = null;

export const G_Auth = {
  // ── INIT ───────────────────────────────────────────
  // opts.onInitialNoUser — dipanggil sekali setelah getSession jika tidak ada user (untuk guest multiplayer)
  init(onLogin, onLogout, opts = {}) {
    try {
      const _sb = window.supabase;
      if (_sb?.createClient) {
        sbClient = _sb.createClient(SUPABASE_URL, SUPABASE_ANON);
      }
    } catch (e) {
      console.warn('[Auth] Supabase init error:', e);
      return;
    }

    if (!sbClient) return;

    // Listen auth state changes
    sbClient.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        onLogin(session.user);
      } else if (event === 'SIGNED_OUT') {
        onLogout();
      }
    });

    // Restore existing session (refresh page)
    sbClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        onLogin(session.user);
      } else {
        opts.onInitialNoUser?.();
      }
    });
  },

  // ── GOOGLE OAUTH ───────────────────────────────────
  async loginGoogle() {
    if (!sbClient) {
      window.G_UI?.toast('⚠️ Auth belum siap, coba refresh.', 'a');
      return;
    }
    const { error } = await sbClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) window.G_UI?.toast('❌ ' + error.message, 'a');
  },

  // ── MAGIC LINK EMAIL ───────────────────────────────
  async loginEmail() {
    if (!sbClient) {
      window.G_UI?.toast('⚠️ Auth belum siap, coba refresh.', 'a');
      return;
    }
    const email = document.getElementById('lm-email-input')?.value.trim();
    if (!email || !email.includes('@')) {
      window.G_UI?.toast('❌ Email tidak valid', 'a');
      return;
    }

    const btn = document.querySelector('#lm-email-wrap .lm-sec');
    if (btn) { btn.textContent = 'Mengirim...'; btn.disabled = true; }

    const { error } = await sbClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (btn) { btn.textContent = 'Kirim Magic Link →'; btn.disabled = false; }

    if (error) {
      window.G_UI?.toast('❌ ' + error.message, 'a');
      return;
    }
    window.G_UI?.closeLM();
    window.G_UI?.toast('📧 Cek email kamu! Link masuk sudah dikirim.', 'g');
  },

  // ── SHOW EMAIL INPUT ───────────────────────────────
  showEmailInput() {
    document.getElementById('lm-main-btns').style.display = 'none';
    document.getElementById('lm-email-wrap').style.display = 'block';
    setTimeout(() => document.getElementById('lm-email-input')?.focus(), 100);
  },

  // ── SIGN OUT ───────────────────────────────────────
  async logout() {
    if (!sbClient) return;
    await sbClient.auth.signOut();
  },

  // ── EXTRACT USER NAME ─────────────────────────────
  getName(user) {
    const meta = user.user_metadata || {};
    return meta.full_name || meta.name || user.email?.split('@')[0] || 'Kamu';
  },
};

// Expose globally untuk onclick di HTML
window.G_Auth = G_Auth;
