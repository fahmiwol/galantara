// ═══════════════════════════════════════════════════════
// NPC.js — NPC entities: mesh + dialog data. Movement lives in PerilakuNpc.js.
// ═══════════════════════════════════════════════════════

import { NPCS } from '../data/config.js';
import { PerilakuNpc } from './PerilakuNpc.js';
import { pose3D } from '../party/kaitDunia.js';

export const INTERACT_R = 2.5; // radius interaksi

/** Height of the head top (world units) — anchor for labels above an NPC. */
export const TINGGI_KEPALA_NPC = 1.3;

/**
 * Soft round shadow under each NPC instead of real shadow casting (laporan 3D §6a no. 8): the
 * body and head spheres were 2 shadow casters per NPC, i.e. 2 extra draw calls each in the
 * shadow pass. One shared geometry and material; it stays on the floor while the body bobs.
 */
export const BAYANGAN_GUMPAL = Object.freeze({ jari: 0.42, opasitas: 0.22, tinggi: 0.015 });
let _bayangan = null;
function bayanganGumpal() {
  if (!_bayangan) {
    const geo = new THREE.CircleGeometry(BAYANGAN_GUMPAL.jari, 16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: BAYANGAN_GUMPAL.opasitas, depthWrite: false });
    _bayangan = { geo, mat };
  }
  const m = new THREE.Mesh(_bayangan.geo, _bayangan.mat);
  m.name = 'bayangan_gumpal';
  m.castShadow = false;
  m.receiveShadow = false;
  m.renderOrder = -1;
  return m;
}

export class NPCManager {
  constructor(scene) {
    this.scene  = scene;
    this.npcs   = []; // { data, mesh, perilaku, spawnX, spawnZ, x, z }
    this._onDialog = null;
    this._terlihat = true;
  }

  onDialog(fn) { this._onDialog = fn; return this; }

  // ── BUILD SEMUA NPC ───────────────────────────────────
  /** Sembunyikan NPC Oola saat Spot visual lain (mis. Bogor) aktif. */
  setHubVisible(visible) {
    this._terlihat = visible;
    this.npcs.forEach((npc) => {
      npc.mesh.visible = visible && !npc.pendamping;
    });
  }

  /**
   * While an agent walks behind the player it is drawn by the instanced companion kit
   * (src/world/pendamping, LOG-C §8): its own mesh (with the ✦ ring and class kit on it) is
   * hidden, so the same agent is never drawn twice. The entity keeps moving (PerilakuNpc
   * 'ikut'), so taps and positions still work. Back at the Markas = its mesh again.
   * @returns {boolean} false for an unknown id
   */
  setelPendamping(id, ya) {
    const npc = this.get(id);
    if (!npc) return false;
    npc.pendamping = Boolean(ya);
    npc.mesh.visible = this._terlihat && !npc.pendamping;
    return true;
  }

  get terlihat() { return this._terlihat; }

  build() {
    NPCS.forEach(data => {
      const group = new THREE.Group();

      // Body
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 8, 7),
        new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7 }),
      );
      body.scale.y = 1.15;
      body.castShadow = false;
      group.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 7),
        new THREE.MeshStandardMaterial({ color: 0xFFDEAD, roughness: 0.8 }),
      );
      head.position.y = 0.72;
      head.castShadow = false;
      group.add(head);

      // No floating dot above the head any more: the DOM plaque ("✦ Sari AI") and the Markas
      // status icon name the NPC, and its draw call pays for the blob shadow below (the agent
      // stays at 4 draw calls with its class kit, tests/agen3dKit.test.mjs).

      const bayangan = bayanganGumpal();
      group.add(bayangan);

      group.position.set(data.x, 0, data.z);
      this.scene.add(group);

      this.npcs.push({
        data,
        mesh: group,
        perilaku: new PerilakuNpc({ x: data.x, z: data.z }),
        spawnX: data.x,
        spawnZ: data.z,
        x: data.x,
        z: data.z,
        bayangan,
        /** true while the companion kit draws this NPC (its mesh is hidden) */
        pendamping: false,
        /** 3D pose name for the current status (C's agen/pose.js), held once the NPC has arrived */
        pose: null,
        _poseMulai: null,
      });
    });
    return this;
  }

  /** @returns {object|undefined} the NPC entry (data, mesh, perilaku, x, z) */
  get(id) {
    return this.npcs.find((n) => n.data.id === id);
  }

  /** Pose to hold at the status spot (null = B's own body language). The clock restarts on change. */
  setelPose(id, pose) {
    const npc = this.get(id);
    if (!npc || npc.pose === pose) return;
    npc.pose = pose ?? null;
    npc._poseMulai = null;
  }

  /** A companion's spot on the owner's trail this frame (null = none). */
  setelTitikIkut(id, titik) {
    const npc = this.get(id);
    if (npc) npc.perilaku.titikIkut = titik ?? null;
  }

  /** Command one NPC's behaviour (see PerilakuNpc.perintah). */
  perintah(id, p) {
    const npc = this.get(id);
    if (!npc) return false;
    npc.perilaku.perintah(p);
    return true;
  }

  // ── UPDATE: behaviour + pose ──────────────────────────
  /**
   * @param {number} dt
   * @param {number} t
   * @param {{dialogNpcId?: string|null, posisiPemain?: {x:number,z:number}|null}} [ctx]
   */
  update(dt, t, ctx = {}) {
    this.npcs.forEach(npc => {
      const p = npc.perilaku;
      p.perbarui(dt, {
        dialogTerbuka: ctx.dialogNpcId === npc.data.id,
        posisiPemain: ctx.posisiPemain ?? null,
      });
      npc.x = p.x;
      npc.z = p.z;

      const lantai = Number.isFinite(p.y) ? p.y : 0;
      npc.mesh.rotation.y = p.arah;

      // Arrived at its status spot with a 3D pose: C's body language (lean, tilt, one hop).
      if (npc.pose && !p.bergerak && p.keadaan === 'bekerja') {
        npc._poseMulai ??= t;
        const dy = pose3D(npc.mesh, npc.pose, t - npc._poseMulai);
        if (dy !== null) {
          npc.mesh.position.set(p.x, lantai + dy, p.z);
          if (npc.bayangan) npc.bayangan.position.y = BAYANGAN_GUMPAL.tinggi - dy;
          return;
        }
      }
      if (p.bergerak) npc._poseMulai = null;

      // B's own pose: walking bounces, working nods over the desk, reporting waves (a hop), idle breathes.
      let bobY;
      let condong = 0;
      if (p.bergerak) bobY = Math.abs(Math.sin(t * 6 + npc.spawnX)) * 0.1;
      else if (p.keadaan === 'bekerja') { bobY = Math.sin(t * 2.4 + npc.spawnX) * 0.02; condong = 0.14 + Math.sin(t * 2.4) * 0.05; }
      else if (p.melambai) bobY = Math.max(0, Math.sin(t * 7)) * 0.12;
      else bobY = Math.sin(t * 1.2 + npc.spawnX) * 0.03;

      npc.mesh.position.set(p.x, lantai + bobY, p.z);
      npc.mesh.rotation.x = condong;
      npc.mesh.rotation.z = 0;
      // The shadow stays on the floor while the body bobs.
      if (npc.bayangan) npc.bayangan.position.y = BAYANGAN_GUMPAL.tinggi - bobY;
    });
  }

  // ── CHECK PROXIMITY — kembalikan NPC terdekat jika dalam range ─
  checkProximity(avatarPos) {
    if (!this._terlihat) return null;
    let closest = null;
    let closestDist = Infinity;

    this.npcs.forEach(npc => {
      // A companion walking behind the player is always "near": offering it for talk would hide
      // every other NPC and zone from the prompt. It is still reachable by tapping it, or the Markas.
      if (npc.perilaku?.keadaan === 'ikut') return;
      const dx = avatarPos.x - npc.x;
      const dz = avatarPos.z - npc.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < INTERACT_R && dist < closestDist) {
        closestDist = dist;
        closest = npc;
      }
    });

    return closest ? closest.data : null;
  }
}
