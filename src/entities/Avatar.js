// ═══════════════════════════════════════════════════════
// Avatar.js — Chibi player entity
// Build mesh, handle movement input, clamp ke island
// ═══════════════════════════════════════════════════════

import { AV_PRESETS, SPEED, ISLAND_R } from '../data/config.js';
import { getSavedAvatarColorIndex, setSavedAvatarColorIndex } from '../data/avatarPreferences.js';

export class Avatar {
  constructor(scene) {
    this.scene     = scene;
    this.mesh      = null;   // root group
    this.body      = null;   // body mesh (untuk ganti warna)
    this.pos       = { x: 0, y: 0, z: 2 };
    this.isMoving  = false;
    this.keys      = {};     // keyboard state
    this.dpad      = {};     // dpad state
    this.colorIdx  = 0;
    this._bobTimer = 0;

    // Facing direction (radians) — dipakai untuk rotate mesh
    this._facing = 0;

    // Chat bubble
    this._bubble      = null;
    this._bubbleTimer = null;
  }

  // ── BUILD CHIBI MESH ──────────────────────────────────
  build() {
    this.mesh = new THREE.Group();

    // Body (ellipsoid effect via scaled sphere)
    const bodyGeo = new THREE.SphereGeometry(0.45, 10, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: AV_PRESETS[this.colorIdx].color,
      roughness: 0.7,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.scale.y = 1.2;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Head (sphere, lebih besar relatif body — chibi style)
    const headGeo = new THREE.SphereGeometry(0.38, 10, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDEAD, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.85;
    head.castShadow = true;
    this.mesh.add(head);

    // Eyes (two small spheres)
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
      );
      eye.position.set(ex, 0.88, 0.33);
      this.mesh.add(eye);
    });

    // Shadow disc (ground projection hint)
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -0.54;
    this.mesh.add(shadowDisc);

    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.scene.add(this.mesh);
    this._bindKeys();

    const saved = getSavedAvatarColorIndex();
    if (saved !== null && saved >= 0 && saved < AV_PRESETS.length) {
      this.setColor(saved);
    }

    return this;
  }

  // ── INPUT: KEYBOARD ───────────────────────────────────
  _bindKeys() {
    const MAP = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
    };
    window.addEventListener('keydown', (e) => {
      // Jangan capture WASD kalau user lagi ketik di input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = MAP[e.code];
      if (k) { this.keys[k] = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      const k = MAP[e.code];
      if (k) this.keys[k] = false;
    });

    // D-pad buttons
    const bindDpad = (id, dir) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.dpad[dir] = true; });
      el.addEventListener('pointerup',   () => { this.dpad[dir] = false; });
      el.addEventListener('pointerleave', () => { this.dpad[dir] = false; });
    };
    bindDpad('dp-u', 'up');
    bindDpad('dp-d', 'down');
    bindDpad('dp-l', 'left');
    bindDpad('dp-r', 'right');
  }

  // ── UPDATE — called each frame ────────────────────────
  // camera dipakai untuk getMoveDelta (relatif kamera)
  update(dt, camera) {
    const dirs = ['up', 'down', 'left', 'right'];
    const active = dirs.filter(d => this.keys[d] || this.dpad[d]);

    this.isMoving = active.length > 0;

    if (this.isMoving) {
      let dx = 0, dz = 0;
      active.forEach(dir => {
        const delta = camera.getMoveDelta(dir);
        if (delta) { dx += delta.dx; dz += delta.dz; }
      });

      // Normalize diagonal
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
        this._facing = Math.atan2(dx, dz);
      }

      // Move
      this.pos.x += dx * SPEED;
      this.pos.z += dz * SPEED;

      // Clamp ke island
      const dist = Math.sqrt(this.pos.x ** 2 + this.pos.z ** 2);
      if (dist > ISLAND_R - 1) {
        const scale = (ISLAND_R - 1) / dist;
        this.pos.x *= scale;
        this.pos.z *= scale;
      }
    }

    // Bob animation
    this._bobTimer += dt;
    const bobY = this.isMoving
      ? Math.abs(Math.sin(this._bobTimer * 8)) * 0.12
      : Math.sin(this._bobTimer * 1.5) * 0.04;

    this.mesh.position.set(this.pos.x, bobY, this.pos.z);

    // Rotate mesh to face direction
    this.mesh.rotation.y = this._facing;
  }

  // ── CHANGE COLOR ──────────────────────────────────────
  setColor(idx) {
    this.colorIdx = idx % AV_PRESETS.length;
    if (this.body) {
      this.body.material.color.setHex(AV_PRESETS[this.colorIdx].color);
    }
    setSavedAvatarColorIndex(this.colorIdx);
  }

  // ── CHAT BUBBLE ───────────────────────────────────────
  showChat(msg) {
    if (!this._bubble) {
      this._bubble = document.createElement('div');
      this._bubble.className = 'av-bubble';
      document.body.appendChild(this._bubble);
    }
    this._bubble.textContent = msg;
    this._bubble.style.opacity = '1';
    this._bubble.style.display = 'block';
    clearTimeout(this._bubbleTimer);
    this._bubbleTimer = setTimeout(() => {
      if (this._bubble) this._bubble.style.display = 'none';
    }, 4000);
  }

  // Dipanggil tiap frame dari Game.js
  updateBubble(threeCamera) {
    if (!this._bubble || this._bubble.style.display === 'none') return;
    const v = new THREE.Vector3(this.pos.x, 2.4, this.pos.z);
    v.project(threeCamera);
    const x = (v.x *  0.5 + 0.5) * window.innerWidth;
    const y = (v.y * -0.5 + 0.5) * window.innerHeight;
    this._bubble.style.left = x + 'px';
    this._bubble.style.top  = y + 'px';
  }

  getPosition() {
    return this.pos;
  }

  /** Teleport (warp antar Spot / hub) — reset posisi & mesh. */
  teleport(x, z, facing = 0) {
    this.pos.x = x;
    this.pos.z = z;
    this._facing = facing;
    if (this.mesh) {
      this.mesh.position.set(x, 0, z);
      this.mesh.rotation.y = facing;
    }
  }
}
