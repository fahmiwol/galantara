// ═══════════════════════════════════════════════════════
// RemotePlayers.js — Render & update avatar pemain lain
// ═══════════════════════════════════════════════════════

export class RemotePlayers {
  constructor(scene) {
    this.scene   = scene;
    this._players = {}; // socketId → { mesh, targetX, targetZ, facing, nameEl }
  }

  // ── ADD PLAYER ────────────────────────────────────────
  add({ socketId, name, color, x = 0, z = 0 }) {
    if (this._players[socketId]) return;

    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 7),
      new THREE.MeshStandardMaterial({ color: color || 0x8B5CF6, roughness: 0.7 }),
    );
    body.scale.y = 1.15;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 8, 7),
      new THREE.MeshStandardMaterial({ color: 0xFFDEAD, roughness: 0.8 }),
    );
    head.position.y = 0.72;
    group.add(head);

    // Name tag (floating dot)
    const tag = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 5),
      new THREE.MeshBasicMaterial({ color: color || 0x8B5CF6 }),
    );
    tag.position.y = 1.25;
    group.add(tag);

    group.position.set(x, 0, z);
    this.scene.add(group);

    // HTML name label
    const nameEl = document.createElement('div');
    nameEl.className = 'av-n';
    nameEl.textContent = name || 'Player';
    nameEl.style.cssText += ';pointer-events:none;font-size:9px;background:rgba(0,0,0,.45);color:#fff;padding:2px 6px;border-radius:8px;position:absolute;';
    document.getElementById('lbl-layer')?.appendChild(nameEl);

    this._players[socketId] = { mesh: group, targetX: x, targetZ: z, facing: 0, nameEl, name };
  }

  // ── BULK ADD (dari event 'players' saat join) ─────────
  addAll(playersMap, mySocketId) {
    // Clear semua — selalu mulai dari server state yg authoritative
    Object.keys(this._players).forEach(sid => this.remove({ socketId: sid }));
    Object.entries(playersMap).forEach(([sid, p]) => {
      if (sid !== mySocketId) this.add({ socketId: sid, ...p });
    });
  }

  // ── UPDATE POSISI ─────────────────────────────────────
  move({ socketId, x, z, facing }) {
    const p = this._players[socketId];
    if (!p) return;
    p.targetX = x;
    p.targetZ = z;
    p.facing  = facing || 0;
  }

  // ── REMOVE PLAYER ─────────────────────────────────────
  remove({ socketId }) {
    const p = this._players[socketId];
    if (!p) return;
    this.scene.remove(p.mesh);
    p.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    p.nameEl?.remove();
    delete this._players[socketId];
  }

  // ── UPDATE SETIAP FRAME (lerp posisi + update label) ──
  update(camera, renderer) {
    const W = window.innerWidth, H = window.innerHeight;

    Object.values(this._players).forEach(p => {
      // Lerp posisi (smooth movement)
      const mx = p.mesh.position;
      mx.x += (p.targetX - mx.x) * 0.15;
      mx.z += (p.targetZ - mx.z) * 0.15;
      p.mesh.rotation.y = p.facing;

      // Project 3D → 2D untuk name label
      if (p.nameEl && camera) {
        const pos3D = p.mesh.position.clone();
        pos3D.y += 1.6;
        pos3D.project(camera);
        const sx = (pos3D.x * 0.5 + 0.5) * W;
        const sy = (-pos3D.y * 0.5 + 0.5) * H;
        if (pos3D.z < 1) {
          p.nameEl.style.display = '';
          p.nameEl.style.left = sx + 'px';
          p.nameEl.style.top  = sy + 'px';
        } else {
          p.nameEl.style.display = 'none';
        }
      }
    });
  }

  get count() { return Object.keys(this._players).length; }
}
