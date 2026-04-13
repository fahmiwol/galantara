// ═══════════════════════════════════════════════════════
// Game.js — Game loop & state orchestration
// Mengikat semua modul: Renderer, Camera, World, Avatar,
//   NPCs, Zones, DayNight, HUD, Panels, Auth
// ═══════════════════════════════════════════════════════

import { Renderer  } from './Renderer.js';
import { Camera    } from './Camera.js';
import { World     } from '../world/World.js';
import { DayNight  } from '../world/DayNight.js';
import { Zones     } from '../world/Zones.js';
import { Avatar    } from '../entities/Avatar.js';
import { NPCManager } from '../entities/NPC.js';
import { Toast     } from '../ui/Toast.js';
import { HUD       } from '../ui/HUD.js';
import { LoginModal } from '../ui/LoginModal.js';
import { Panels    } from '../ui/Panels.js';
import { G_Auth    } from '../auth/auth.js';
import { getOrCreateGuestId, getOrCreateGuestName } from '../data/guestIdentity.js';
import {
  OOLA_SOCKET_ROOM,
  parseInitialSocketRoomFromUrl,
  socketRoomForSpot,
  spotIdFromSocketRoom,
  spotLabelFromSocketRoom,
} from '../data/config.js';
import { AssetLibrary } from '../world/AssetLibrary.js';
import { getVisualSpotRuntimeClass } from '../world/spotVisualRegistry.js';
import { MultiplayerSocket } from '../multiplayer/Socket.js';
import { RemotePlayers     } from '../multiplayer/RemotePlayers.js';
import { Chat              } from '../ui/Chat.js';
import { VoiceChat         } from '../multiplayer/VoiceChat.js';
import { Generator3DPanel  } from '../tools/Generator3DPanel.js';
import { MapBuilder        } from '../tools/MapBuilder.js';

export class Game {
  constructor() {
    this.renderer = new Renderer('c');
    this.camera   = null;
    this.world    = null;
    this.dayNight = null;
    this.zones    = null;
    this.avatar   = null;
    this.npcs     = null;

    // UI
    this.toast      = new Toast();
    this.hud        = new HUD();
    this.loginModal = new LoginModal();
    this.panels       = new Panels();
    this.generator3d  = new Generator3DPanel();
    this.mapBuilder   = null; // init after world

    // Multiplayer
    this.mp           = new MultiplayerSocket();
    this.remotePlayers = null;
    this.chat         = new Chat();
    this.voice        = new VoiceChat();

    // State
    this.user         = null;
    this._guestLabel  = null; // nama tampilan tamu (chat echo / filter)
    this._t           = 0; // elapsed seconds
    this._lastNPC     = null;
    /** Room Socket.io aktif (`oola` atau `spot:<id>`). */
    this._socketRoom  = OOLA_SOCKET_ROOM;
    /** @type {import('../world/SpotRuntime.js').ISpotRuntime | null} */
    this._spotRuntime = null;
    this.assetLibrary = new AssetLibrary();
    /** @type {import('../interaction/InteractionVolume.js').InteractionVolume | null} */
    this._activeInteractionVolume = null;
    this._lastInteractionVolumeId = null;
  }

  // ── INIT ──────────────────────────────────────────────
  init() {
    this._socketRoom = parseInitialSocketRoomFromUrl();

    this.renderer.init();

    const scene = this.renderer.scene;

    // World
    this.world = new World(scene);
    this.world.init().then(() => {
      this.world.build();
      queueMicrotask(() =>
        this._syncSpotVisuals(spotIdFromSocketRoom(this._socketRoom)),
      );
    });

    // Camera (needs renderer for canvas)
    this.camera = new Camera();
    this.camera.init(this.renderer);

    // Day/Night
    this.dayNight = new DayNight({
      sun:     this.renderer.sun,
      hemi:    this.renderer.hemi,
      renderer: this.renderer,
      skyDome:  this.world.skyDome,
    });
    this.dayNight.buildStars(scene);

    // Avatar
    this.avatar = new Avatar(scene);
    this.avatar.build();

    // NPCs
    this.npcs = new NPCManager(scene);
    this.npcs.build();

    // Zones
    this.zones = new Zones();
    this.zones
      .onEnter(zone => {
        this.hud.showZoneHint(zone.hint);
        if (zone.panel) {
          this.toast.show(`Tekan [F] untuk buka ${zone.hint.slice(0, 20)}...`, 'g');
        } else if (zone.id === 'info' || zone.id === 'saran') {
          this.toast.show('Tekan [F] — buka halaman Tentang / Kotak saran', 'g');
        }
      })
      .onLeave(() => this.hud.hideZoneHint());

    // HUD
    this.hud.init();
    this.hud.setSpotLabel(spotLabelFromSocketRoom(this._socketRoom));

    // Login Modal
    this.loginModal.init();

    // Panels
    this.panels.init(this.avatar, G_Auth.getName.bind(G_Auth));
    // Tools
    this.generator3d.init();
    this.mapBuilder = new MapBuilder(scene, this.world, this.renderer, this.camera, this);

    // Remote players (harus sebelum auth agar event Socket terpasang)
    this.remotePlayers = new RemotePlayers(scene);
    this._initMultiplayer();

    // Chat
    this.chat.init();
    this.chat.onSend((msg) => {
      if (!this.user) {
        this.toast.show('Login dulu untuk ikut chat 💬', 'a');
        this.loginModal.open();
        return;
      }
      this.mp.emitChat(msg);
      // Tampilkan pesan sendiri langsung (tidak tunggu echo server)
      this.chat.addMessage({ name: G_Auth.getName(this.user) || 'Aku', msg });
    });

    // Auth + tamu multiplayer (getSession tanpa user → join sebagai guest)
    G_Auth.init(
      (user) => this._onLogin(user),
      ()     => this._onLogout(),
      { onInitialNoUser: () => this._connectGuestMultiplayer() },
    );

    // Expose UI API globally (untuk onclick di HTML + menu items)
    this._exposeGlobals();

    // Keyboard: F = open zone panel, E = talk NPC
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') this._tryOpenZonePanel();
      if (e.code === 'KeyE') this._tryTalkNPC();
    });

    // Start loop
    this._loop();
    return this;
  }

  // ── GAME LOOP ─────────────────────────────────────────
  _loop() {
    requestAnimationFrame((ts) => this._loop(ts));

    const dt = Math.min(this.renderer.getDelta(), 0.05);
    this._t += dt;

    // Avatar move
    this.avatar.update(dt, this.camera);

    // Camera follow avatar
    this.camera.update(this.avatar.getPosition(), this.avatar.isMoving);

    // World animations
    this.world.animate(this._t);
    this._spotRuntime?.animate?.(this._t);

    // Day/night
    this.dayNight.update(this._t);

    // NPC patrol
    this.npcs.update(dt, this._t);

    // Zone check (Oola) — nonaktif saat Spot Bogor agar hint tidak tabrakan
    if (this._spotRuntime) {
      this._updateSpotInteractions();
    } else {
      this.zones.update(this.avatar.getPosition());
    }

    // Emit posisi ke server multiplayer (throttled di dalam Socket.js)
    if (this.avatar.isMoving) {
      const pos = this.avatar.getPosition();
      this.mp.emitMove(pos.x, pos.z, this.avatar._facing);
    }

    // Update remote players (lerp + label)
    this.remotePlayers?.update(this.camera.cam, this.renderer.renderer);

    // Proximity voice — update posisi & cek jarak
    if (this.voice.enabled) {
      const pos = this.avatar.getPosition();
      this.voice.setMyPosition(pos.x, pos.z);
      this.voice.updateProximity(this.remotePlayers._players);
    }

    // NPC proximity hint
    const nearNPC = this.npcs.checkProximity(this.avatar.getPosition());
    if (nearNPC !== this._lastNPC) {
      this._lastNPC = nearNPC;
      if (nearNPC) {
        this.hud.showNpcHint(nearNPC.name, nearNPC.idleMsg);
      } else {
        this.hud.hideNpcHint();
      }
    }

    // Render
    this.renderer.render();
  }

  // ── ACTIONS ───────────────────────────────────────────
  /** Zona interaksi Spot (Bogor): pilih volume terdekat, HUD hint + [F]. */
  _updateSpotInteractions() {
    const vols = this._spotRuntime?.interactionVolumes;
    if (!vols?.length) {
      this._setActiveInteractionVolume(null);
      return;
    }
    const pos = this.avatar.getPosition();
    let best = null;
    let bestD = Infinity;
    for (const v of vols) {
      v.updateEdge(pos);
      if (v.inside) {
        const dx = pos.x - v.cx;
        const dz = pos.z - v.cz;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = v;
        }
      }
    }
    this._setActiveInteractionVolume(best);
  }

  /** @param {import('../interaction/InteractionVolume.js').InteractionVolume | null} vol */
  _setActiveInteractionVolume(vol) {
    this._activeInteractionVolume = vol;
    const id = vol?.id ?? null;
    if (id === this._lastInteractionVolumeId) return;
    this._lastInteractionVolumeId = id;
    if (vol) {
      this.hud.showZoneHint(`${vol.hint} — ${vol.useKeyHint}`);
    } else {
      this.hud.hideZoneHint();
    }
  }

  _tryOpenZonePanel() {
    if (this._activeInteractionVolume?.onUse) {
      this._activeInteractionVolume.onUse();
      return;
    }
    const zone = this.zones.active;
    if (!zone) return;
    if (zone.id === 'info') {
      window.location.href = 'about.html';
      return;
    }
    if (zone.id === 'saran') {
      window.location.href = 'about.html#kotak-saran';
      return;
    }
    if (!zone.panel) return;
    this.panels.openPanel(zone.panel);
  }

  _tryTalkNPC() {
    const npc = this._lastNPC;
    if (!npc) return;
    this.panels.openDialog(npc);
  }

  // ── MULTIPLAYER ───────────────────────────────────────
  _initMultiplayer() {
    const rp = this.remotePlayers;

    this.mp
      .on('players', (map) => {
        rp.addAll(map, this.mp._socket?.id);
      })
      .on('player_join', (data) => {
        rp.add(data);
        const where = spotLabelFromSocketRoom(this._socketRoom);
        this.toast.show(`👋 ${data.name} masuk ke ${where}`, 'g');
      })
      .on('player_move', (data) => rp.move(data))
      .on('player_leave', (data) => {
        rp.remove(data);
      })
      .on('count', (n) => {
        const el = document.getElementById('oc');
        if (el) el.textContent = n;
      })
      .on('chat', ({ name, msg }) => {
        // Jangan tampilkan pesan sendiri 2x (sudah di-add saat send)
        const me = this.user ? G_Auth.getName(this.user) : this._guestLabel;
        if (name !== me) {
          this.chat.addMessage({ name, msg });
        }
        this.toast.show(`💬 ${name}: ${msg}`, 'g');
      });
  }

  /** Multiplayer sebagai tamu: lihat avatar orang, sync posisi; chat/voice butuh login */
  _connectGuestMultiplayer() {
    if (this.user) return;
    if (this.mp.connected) return;

    this._guestLabel = getOrCreateGuestName();
    this.chat.setName(this._guestLabel);

    const pos = this.avatar.getPosition();
    this.mp.setSpawnSnapshot(pos.x, pos.z, this.avatar._facing);
    this.mp.connect({
      room:  this._socketRoom,
      id:    getOrCreateGuestId(),
      name:  this._guestLabel,
      color: 0x9ca3af,
      guest: true,
    });

    const ci = document.getElementById('chat-input');
    if (ci) {
      ci.disabled = true;
      ci.placeholder = 'Login untuk ikut chat…';
    }
    document.getElementById('voice-btn')?.setAttribute('aria-disabled', 'true');
  }

  // ── AUTH CALLBACKS ────────────────────────────────────
  _onLogin(user) {
    if (this.user?.id === user.id && this.mp.connected) {
      this.hud.setLoggedIn(user, G_Auth.getName.bind(G_Auth));
      this.loginModal.close();
      this.panels._user = user;
      return;
    }

    this.user = user;
    this._guestLabel = null;
    this.hud.setLoggedIn(user, G_Auth.getName.bind(G_Auth));
    this.toast.show(`👋 Selamat datang, ${G_Auth.getName(user)}!`, 'g');
    this.loginModal.close();

    const pos = this.avatar.getPosition();
    this.mp.setSpawnSnapshot(pos.x, pos.z, this.avatar._facing);
    this.mp.connect({
      room:  this._socketRoom,
      id:    user.id,
      name:  G_Auth.getName(user),
      color: 0x8b5cf6,
      guest: false,
    });

    this.chat.setName(G_Auth.getName(user));
    this.panels._user = user;

    const ci = document.getElementById('chat-input');
    if (ci) {
      ci.disabled = false;
      ci.placeholder = 'Tulis pesan...';
    }
    document.getElementById('voice-btn')?.removeAttribute('aria-disabled');
  }

  _onLogout() {
    this.user = null;
    this._guestLabel = null;
    this._socketRoom = parseInitialSocketRoomFromUrl();
    this.hud.setSpotLabel(spotLabelFromSocketRoom(this._socketRoom));
    this._syncSpotVisuals(spotIdFromSocketRoom(this._socketRoom));
    this.mp.disconnect();
    this.hud.setLoggedOut();
    this.toast.show('Kamu sudah logout.', 'a');
    this._connectGuestMultiplayer();
  }

  /** Raycast target untuk MapBuilder (Oola island vs ground Bogor POC). */
  getPlacementRaycastTargets() {
    if (this._spotRuntime?.getRaycastTargets) return this._spotRuntime.getRaycastTargets();
    return this.world?.objects ?? [];
  }

  /**
   * Selaraskan mesh dunia dengan Spot POC (`spotVisualRegistry`) atau Oola hub.
   * @param {string | null} spotVisualId — id Spot dari `SPOTS` / room, atau `null` = hub
   */
  _syncSpotVisuals(spotVisualId) {
    const scene = this.renderer.scene;
    const VisualClass = getVisualSpotRuntimeClass(spotVisualId);

    if (VisualClass && this._spotRuntime instanceof VisualClass) return;

    if (this._spotRuntime) {
      this.assetLibrary.detachBatch(this._spotRuntime.root);
      this._spotRuntime.dispose(scene);
      this._spotRuntime = null;
      this._lastInteractionVolumeId = null;
      this._activeInteractionVolume = null;
      this.hud.hideZoneHint();
    }

    if (VisualClass) {
      this.zones.suspendForSpotWorld();
      this.world.disposeContent();
      this._spotRuntime = new VisualClass();
      this._spotRuntime.mount(scene, { toast: this.toast });
      this.npcs?.setHubVisible(false);
      const manifestPath = `assets/spots/${spotVisualId}/manifest.json`;
      void this.assetLibrary.applyManifest(this._spotRuntime.root, manifestPath);
      this._lastInteractionVolumeId = null;
      this._activeInteractionVolume = null;
      return;
    }

    if (!this.world.worldRoot) this.world.rebuildContent();
    this.npcs?.setHubVisible(true);
  }

  /** Fade singkat + callback (warp room). */
  _withWarpFade(done) {
    const el = document.getElementById('warp-overlay');
    if (el) {
      el.classList.add('on');
      el.setAttribute('aria-hidden', 'false');
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        done();
        setTimeout(() => {
          if (el) {
            el.classList.remove('on');
            el.setAttribute('aria-hidden', 'true');
          }
        }, 100);
      }, 160);
    });
  }

  _reconnectMultiplayerAfterWarp() {
    const pos = this.avatar.getPosition();
    this.mp.setSpawnSnapshot(pos.x, pos.z, this.avatar._facing);
    if (this.user) {
      this.mp.connect({
        room:  this._socketRoom,
        id:    this.user.id,
        name:  G_Auth.getName(this.user),
        color: 0x8b5cf6,
        guest: false,
      });
    } else {
      this._guestLabel = getOrCreateGuestName();
      this.chat.setName(this._guestLabel);
      this.mp.connect({
        room:  this._socketRoom,
        id:    getOrCreateGuestId(),
        name:  this._guestLabel,
        color: 0x9ca3af,
        guest: true,
      });
    }
  }

  /** Pindah room multiplayer ke Spot live (URL `?spot=`, HUD). Visual Bogor = POC terpisah; Spot lain = Oola). */
  _warpToSpot(spot) {
    if (!spot || spot.status !== 'live') {
      this.toast.show('Spot belum tersedia.', 'a');
      return;
    }
    this._withWarpFade(() => {
      this.voice.disable();
      document.getElementById('voice-btn')?.classList.remove('active');

      this.remotePlayers.addAll({}, null);

      this._socketRoom = socketRoomForSpot(spot.id);
      const u = new URL(window.location.href);
      u.searchParams.set('spot', spot.id);
      window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);

      this.hud.setSpotLabel(spotLabelFromSocketRoom(this._socketRoom));
      this.avatar.teleport(0, 2, 0);
      this._reconnectMultiplayerAfterWarp();
      this._syncSpotVisuals(spot.id);
    });
  }

  _warpToOolaHub() {
    this._withWarpFade(() => {
      this.voice.disable();
      document.getElementById('voice-btn')?.classList.remove('active');

      this.remotePlayers.addAll({}, null);

      this._socketRoom = OOLA_SOCKET_ROOM;
      const u = new URL(window.location.href);
      u.searchParams.delete('spot');
      const qs = u.searchParams.toString();
      window.history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);

      this.hud.setSpotLabel(spotLabelFromSocketRoom(this._socketRoom));
      this.avatar.teleport(0, 2, 0);
      this._reconnectMultiplayerAfterWarp();
      this._syncSpotVisuals(null);
    });
  }

  // ── GLOBAL API (window.G_UI) ──────────────────────────
  _exposeGlobals() {
    window.G_UI = {
      toast:          (msg, type = 'g') => this.toast.show(msg, type),
      openLM:         (_reason)         => this.loginModal.open(),
      closeLM:        ()                => this.loginModal.close(),
      openProfile:    ()                => this.panels.openProfile(this.user),
      openPanel:      (id)              => this.panels.openPanel(id),
      closePanel:     (id)              => this.panels.closePanel(id),
      saveProfile:    ()                => {
        const name = document.getElementById('p-name')?.value?.trim();
        this.toast.show(name ? `Profil disimpan! 👋 ${name}` : 'Profil disimpan!', 'g');
        this.panels.closePanel('profile-panel');
      },
      toggleSound:    ()                => this.toast.show('Audio — coming soon 🔊', 'a'),
      toggleChat:     ()                => this.chat.toggle(),
      toggleVoice:    async ()          => {
        if (this.voice.enabled) {
          this.voice.disable();
          document.getElementById('voice-btn')?.classList.remove('active');
          this.toast.show('🎤 Voice off', 'a');
        } else {
          if (!this.user) {
            this.toast.show('Login dulu untuk voice chat 🎤', 'a');
            return;
          }
          if (!this.mp._socket) { this.toast.show('Menyambungkan… coba lagi sebentar.', 'a'); return; }
          const ok = await this.voice.enable(this.mp._socket);
          if (ok) {
            document.getElementById('voice-btn')?.classList.add('active');
            this.toast.show('🎤 Voice on — ngomong kalau dekat player lain!', 'g');
          } else {
            this.toast.show('❌ Mikrofon tidak bisa diakses', 'r');
          }
        }
      },
      sendChat:       ()                => {
        if (!this.user) {
          this.toast.show('Login dulu untuk ikut chat 💬', 'a');
          this.loginModal.open();
          return;
        }
        const inp = document.getElementById('chat-input');
        if (!inp?.value.trim()) return;
        this.mp.emitChat(inp.value.trim());
        this.chat.addMessage({ name: G_Auth.getName(this.user) || 'Aku', msg: inp.value.trim() });
        inp.value = '';
      },
      doPrivateEntry: ()                => this.toast.show('Private Spot — coming soon 🔒', 'a'),
      doCreateSpot:   ()                => this.toast.show('Buat Spot Baru — coming soon 🏗', 'a'),
      openGenerator3D: ()               => this.generator3d.open(),
      stopGeneratorPreview: ()          => this.generator3d.stopPreview(),
      closeGenerator3dPanel: ()         => this.generator3d.close(),
      exportGeneratorPreset: ()        => this.generator3d.exportJson(),
      copyGeneratorAiPrompt: ()        => this.generator3d.copyAiPrompt(),
      placeInWorld:          ()        => {
        const params = this.generator3d._readParams();
        this.mapBuilder.enable(params.archetype, params);
        this.generator3d.close();
      },
      exportMap:             ()        => {
        const data = this.world?.mapData;
        if (!data) {
          this.toast.show('Tidak ada data peta untuk diekspor.', 'a');
          return;
        }
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = URL.createObjectURL(blob);
        a.download = `galantara_map_${stamp}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.toast.show('Peta JSON terunduh ✓', 'g');
      },
      warpToSpot:            (spot)    => this._warpToSpot(spot),
      warpToOolaHub:         ()        => this._warpToOolaHub(),
    };
  }
}
