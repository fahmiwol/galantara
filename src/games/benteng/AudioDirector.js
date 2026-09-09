export class AudioDirector {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) this.context = new Context();
    }
    this.context?.resume?.();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
  }

  tone(frequency, duration, type = 'sine', gain = 0.08, slideTo = null) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(volume).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  tag() { this.tone(150, 0.16, 'square', 0.09, 70); }
  nearMiss() { this.tone(760, 0.12, 'sine', 0.05, 1250); }
  burst() { this.tone(220, 0.12, 'triangle', 0.045, 520); }
  refill() { this.tone(330, 0.2, 'sine', 0.045, 720); }
  rescue() {
    this.tone(320, 0.32, 'triangle', 0.07, 880);
    window.setTimeout(() => this.tone(640, 0.22, 'sine', 0.055, 1100), 90);
  }
}

