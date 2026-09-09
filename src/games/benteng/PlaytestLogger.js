const HEADERS = Object.freeze([
  'match_id',
  'varian_kecepatan',
  'durasi',
  'hasil',
  'jumlah_tag_total',
  'jumlah_tag_selisih_tipis',
  'persen_pulang_di_bawah_20_muatan',
  'rata2_muatan_saat_tag',
  'jumlah_penyelamatan_rantai',
  'jumlah_percobaan_rebut_benteng',
  'waktu_rata2_di_luar_benteng',
  'jumlah_near_miss',
  'panjang_rantai_maks',
  'waktu_menganggur_tawanan',
]);

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Gate Fase 0 (docs/RECONCILIATION_v0.1.md) minta 20 match: 10 varian A,
// 10 varian B. Itu sekitar sejam bermain — terlalu lama untuk dipertaruhkan
// pada satu tab browser. Baris disimpan ke localStorage tiap match selesai.
const STORAGE_KEY = 'galantara_benteng_playtest_v1';
const TARGET_PER_VARIANT = 10;

function loadRows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Tab privat, storage penuh, atau JSON rusak. Playtest tetap boleh jalan;
    // yang hilang cuma riwayatnya, bukan permainannya.
    return [];
  }
}

export class PlaytestLogger {
  constructor() {
    this.rows = loadRows();
    this.sequence = this.rows.length;
    this.reset(true);
  }

  /** Simpan riwayat. Gagal menyimpan tidak boleh menghentikan permainan. */
  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rows));
      return true;
    } catch {
      return false;
    }
  }

  /** Buang riwayat — dipakai tombol "mulai sesi baru". */
  clear() {
    this.rows = [];
    this.sequence = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* abaikan */ }
  }

  /**
   * Berapa jauh playtest ini dari gate Fase 0.
   * Ambang di sini menyalin docs/RECONCILIATION_v0.1.md; kalau dokumen itu
   * berubah, ubah di sini juga.
   */
  progress() {
    const num = (v) => Number(v) || 0;
    const perVariant = (v) => this.rows.filter((r) => r.varian_kecepatan === v);
    const a = perVariant('A');
    const b = perVariant('B');
    const mean = (rows, key) => (rows.length
      ? rows.reduce((sum, r) => sum + num(r[key]), 0) / rows.length
      : 0);
    return {
      a: a.length,
      b: b.length,
      target: TARGET_PER_VARIANT,
      selesai: a.length >= TARGET_PER_VARIANT && b.length >= TARGET_PER_VARIANT,
      nearMiss: mean(this.rows, 'jumlah_near_miss'),
      tawananDiam: mean(this.rows, 'waktu_menganggur_tawanan'),
      pulangKritis: mean(this.rows, 'persen_pulang_di_bawah_20_muatan'),
    };
  }

  reset(reverseChargeSpeed) {
    this.matchId = `BTG-${Date.now()}-${++this.sequence}`;
    this.variant = reverseChargeSpeed ? 'B' : 'A';
    this.tags = 0;
    this.thinTags = 0;
    this.tagChargeTotal = 0;
    this.returns = 0;
    this.lowReturns = 0;
    this.rescues = 0;
    this.captureAttempts = 0;
    this.outsideSeconds = 0;
    this.nearMisses = 0;
    // Dihitung terpisah, sengaja TIDAK masuk CSV: kontrak 14 kolom sudah
    // dikunci di docs/BENTENG_FASE0_WEB_PLAN.md. Ini untuk harness & HUD.
    this.playerNearMisses = 0;
    this.maxChainLength = 0;
    this.prisonerIdleSeconds = 0;
  }

  recordTag(winnerCharge, loserCharge, difference, thinThreshold) {
    this.tags += 1;
    this.tagChargeTotal += (winnerCharge + loserCharge) / 2;
    if (difference < thinThreshold) this.thinTags += 1;
  }

  recordReturn(chargeBeforeRefill) {
    this.returns += 1;
    if (chargeBeforeRefill < 20) this.lowReturns += 1;
  }

  recordRescue() { this.rescues += 1; }
  recordCaptureAttempt() { this.captureAttempts += 1; }
  recordNearMiss(involvesPlayer = false) {
    this.nearMisses += 1;
    if (involvesPlayer) this.playerNearMisses += 1;
  }

  accumulate(outsideSeconds, prisonerIdleSeconds, chainLength) {
    this.outsideSeconds += outsideSeconds;
    this.prisonerIdleSeconds += prisonerIdleSeconds;
    this.maxChainLength = Math.max(this.maxChainLength, chainLength);
  }

  finish(duration, result, unitCount) {
    const row = {
      match_id: this.matchId,
      varian_kecepatan: this.variant,
      durasi: duration.toFixed(2),
      hasil: result,
      jumlah_tag_total: this.tags,
      jumlah_tag_selisih_tipis: this.thinTags,
      persen_pulang_di_bawah_20_muatan: this.returns
        ? ((this.lowReturns / this.returns) * 100).toFixed(1)
        : '0.0',
      rata2_muatan_saat_tag: this.tags
        ? (this.tagChargeTotal / this.tags).toFixed(1)
        : '0.0',
      jumlah_penyelamatan_rantai: this.rescues,
      jumlah_percobaan_rebut_benteng: this.captureAttempts,
      waktu_rata2_di_luar_benteng: unitCount
        ? (this.outsideSeconds / unitCount).toFixed(2)
        : '0.00',
      jumlah_near_miss: this.nearMisses,
      panjang_rantai_maks: this.maxChainLength.toFixed(2),
      waktu_menganggur_tawanan: this.prisonerIdleSeconds.toFixed(2),
    };
    this.rows.push(row);
    this.persist();
    return row;
  }

  toCSV() {
    const lines = [HEADERS.join(',')];
    for (const row of this.rows) {
      lines.push(HEADERS.map((header) => csvCell(row[header])).join(','));
    }
    return `${lines.join('\n')}\n`;
  }

  download(filename = 'benteng-playtest.csv') {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([this.toCSV()], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    return true;
  }
}

export { HEADERS as PLAYTEST_HEADERS };
