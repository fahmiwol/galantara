// ═══════════════════════════════════════════════════════
// tests/bantu/jamPalsu.mjs — a clock the test moves by hand, and a document that can hide.
//
// Timers fire in time order and the promise queue is drained after each one, so an async
// fetch started by a timer finishes before the next timer is considered — the same order a
// browser produces. No real waiting: 10 minutes of polling run in milliseconds.
// ═══════════════════════════════════════════════════════

/** Let pending promise chains (fake fetch → text → JSON → handler) settle. */
export async function kuras(putaran = 12) {
  for (let i = 0; i < putaran; i++) await new Promise((r) => setImmediate(r));
}

export function jamPalsu(awal = 0) {
  let kini = awal;
  let urut = 0;
  const antre = new Map();
  return {
    sekarang: () => kini,
    setTimeout: (fn, ms) => {
      const id = ++urut;
      antre.set(id, { waktu: kini + Math.max(0, ms), fn });
      return id;
    },
    clearTimeout: (id) => { antre.delete(id); },
    get tertunda() { return antre.size; },
    /** Advance `ms`, firing every timer that falls due, in order. */
    async maju(ms) {
      const tujuan = kini + ms;
      for (;;) {
        let berikut = null;
        for (const [id, t] of antre) {
          if (t.waktu <= tujuan && (!berikut || t.waktu < berikut[1].waktu)) berikut = [id, t];
        }
        if (!berikut) break;
        antre.delete(berikut[0]);
        kini = berikut[1].waktu;
        berikut[1].fn();
        await kuras();
      }
      kini = tujuan;
      await kuras();
    },
  };
}

/** `document` stand-in: hidden flag + visibilitychange listeners. */
export function dokumenPalsu() {
  const pendengar = [];
  return {
    hidden: false,
    addEventListener(jenis, fn) { if (jenis === 'visibilitychange') pendengar.push(fn); },
    setelTersembunyi(nilai) {
      this.hidden = nilai;
      for (const fn of pendengar) fn();
    },
  };
}
