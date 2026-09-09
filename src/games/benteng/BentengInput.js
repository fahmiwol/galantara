export class BentengInput {
  constructor({ joystick, knob, pullButton, onPull }) {
    this.keys = new Set();
    this.touchVector = { x: 0, y: 0 };
    this.pointerId = null;
    this.joystick = joystick;
    this.knob = knob;
    this.pullButton = pullButton;
    this.onPull = onPull;

    this._onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      this.keys.add(key);
      if (key === ' ' && !event.repeat) this.onPull?.();
    };
    this._onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    this._onBlur = () => {
      this.keys.clear();
      this.touchVector = { x: 0, y: 0 };
      this.pointerId = null;
      if (this.knob) this.knob.style.transform = 'translate(0, 0)';
      this.pullButton?.classList.remove('pressed');
    };
    window.addEventListener('blur', this._onBlur);

    this._bindJoystick();
    this.pullButton?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.onPull?.();
      this.pullButton.classList.add('pressed');
    });
    this.pullButton?.addEventListener('pointerup', () => this.pullButton.classList.remove('pressed'));
    this.pullButton?.addEventListener('pointercancel', () => this.pullButton.classList.remove('pressed'));
  }

  _bindJoystick() {
    if (!this.joystick || !this.knob) return;
    const update = (event) => {
      const rect = this.joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const max = rect.width * 0.34;
      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance > max) {
        dx = (dx / distance) * max;
        dy = (dy / distance) * max;
      }
      this.touchVector.x = dx / max;
      this.touchVector.y = dy / max;
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const release = (event) => {
      if (this.pointerId !== event.pointerId) return;
      this.pointerId = null;
      this.touchVector.x = 0;
      this.touchVector.y = 0;
      this.knob.style.transform = 'translate(0, 0)';
    };
    this.joystick.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.pointerId = event.pointerId;
      this.joystick.setPointerCapture(event.pointerId);
      update(event);
    });
    this.joystick.addEventListener('pointermove', (event) => {
      if (this.pointerId === event.pointerId) update(event);
    });
    this.joystick.addEventListener('pointerup', release);
    this.joystick.addEventListener('pointercancel', release);
  }

  vector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (!x && !y) return { ...this.touchVector };
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  setCaptured(captured) {
    this.pullButton?.classList.toggle('visible', Boolean(captured));
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
