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

export class PlaytestLogger {
  constructor() {
    this.rows = [];
    this.sequence = 0;
    this.reset(true);
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
  recordNearMiss() { this.nearMisses += 1; }

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
