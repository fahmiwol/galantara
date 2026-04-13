// ═══════════════════════════════════════════════════════
// Camera.js — Orbit camera dengan PHI clamp
// ATURAN WAJIB (jangan diubah):
//   PHI_MIN = Math.PI * 0.18  (~32°)
//   PHI_MAX = Math.PI * 0.42  (~76°)
//   Movement RELATIF kamera (sin/cos theta)
//   Lerp: 0.18 gerak, 0.10 diam
// ═══════════════════════════════════════════════════════

import { PHI_MIN, PHI_MAX, LERP_MOVE, LERP_IDLE, CAM_RADIUS } from '../data/config.js';

export class Camera {
  constructor() {
    this.theta  = Math.PI * 0.25;
    this.phi    = Math.PI * 0.22; // lebih top-down — island keliatan lebih baik
    this.radius = CAM_RADIUS;

    // Target position camera mengikuti
    this.targetX = 0;
    this.targetY = 0;
    this.targetZ = 0;

    // Actual camera position (lerped)
    this.camX = 0;
    this.camY = 0;
    this.camZ = 0;

    this.isMoving = false;
    this.orbDir   = null;
    this.orbTimer = null;

    // Touch/mouse drag
    this.drag   = false;
    this.lastMX = 0;
    this.lastMY = 0;
  }

  init(renderer) {
    const W = window.innerWidth, H = window.innerHeight;

    this.cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 300);
    renderer.setCamera(this.cam);

    this._apply();
    this._bindOrbitButtons();
    this._bindDrag(renderer.canvas);
    return this;
  }

  // ── APPLY SPHERICAL COORDS → CAMERA POS ──────────
  _apply() {
    this.cam.position.set(
      this.camX + this.radius * Math.sin(this.phi) * Math.sin(this.theta),
      this.camY + this.radius * Math.cos(this.phi),
      this.camZ + this.radius * Math.sin(this.phi) * Math.cos(this.theta),
    );
    this.cam.lookAt(this.camX, this.camY, this.camZ);
  }

  // ── UPDATE — dipanggil setiap frame ──────────────
  update(avatarPos, isMoving) {
    this.isMoving = isMoving;
    this.targetX  = avatarPos.x;
    this.targetZ  = avatarPos.z;

    const lerpF = isMoving ? LERP_MOVE : LERP_IDLE;
    this.camX += (this.targetX - this.camX) * lerpF;
    this.camZ += (this.targetZ - this.camZ) * lerpF;

    // Orbit rotation
    if (this.orbDir === 'l') this.theta -= 0.025;
    if (this.orbDir === 'r') this.theta += 0.025;

    this._apply();
  }

  // ── MOVEMENT DIRECTION RELATIF KAMERA ────────────
  // Kembalikan {dx, dz} relatif arah kamera
  getMoveDelta(key) {
    const sin = Math.sin(this.theta);
    const cos = Math.cos(this.theta);
    const dirs = {
      up:    { dx: -sin, dz: -cos },
      down:  { dx:  sin, dz:  cos },
      left:  { dx: -cos, dz:  sin },
      right: { dx:  cos, dz: -sin },
    };
    return dirs[key] || null;
  }

  // ── ORBIT BUTTONS ─────────────────────────────────
  _bindOrbitButtons() {
    const startOrbit = (dir) => {
      this.orbDir = dir;
      clearTimeout(this.orbTimer);
    };
    const stopOrbit = () => {
      this.orbTimer = setTimeout(() => { this.orbDir = null; }, 150);
    };

    const bindBtn = (id, dir) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); startOrbit(dir); });
      el.addEventListener('pointerup',   stopOrbit);
      el.addEventListener('pointerleave', stopOrbit);
    };

    bindBtn('ob-l', 'l');
    bindBtn('ob-r', 'r');
  }

  // ── DRAG TO ORBIT ─────────────────────────────────
  _bindDrag(canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target !== canvas) return;
      this.drag   = true;
      this.lastMX = e.clientX;
      this.lastMY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.lastMX;
      const dy = e.clientY - this.lastMY;
      this.theta += dx * 0.008;
      this.phi    = Math.max(PHI_MIN, Math.min(PHI_MAX, this.phi - dy * 0.006));
      this.lastMX = e.clientX;
      this.lastMY = e.clientY;
    });
    window.addEventListener('pointerup', () => { this.drag = false; });

    // Scroll wheel zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.radius = Math.max(6, Math.min(30, this.radius + e.deltaY * 0.02));
    }, { passive: false });

    // Pinch-to-zoom (touch)
    let lastPinchDist = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.radius = Math.max(6, Math.min(30, this.radius - (dist - lastPinchDist) * 0.05));
        lastPinchDist = dist;
      }
    }, { passive: true });
  }
}
