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
import { DailyChallenge } from '../data/dailyChallenge.js';
import { getVisualSpotRuntimeClass } from '../world/spotVisualRegistry.js';
import { MultiplayerSocket } from '../multiplayer/Socket.js';
import { RemotePlayers     } from '../multiplayer/RemotePlayers.js';
import { Chat              } from '../ui/Chat.js';
import { ChatBubbleLayer   } from '../ui/ChatBubble.js';
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
    /** @type {ChatBubbleLayer|null} dibuat setelah #lbl-layer ada di DOM */
    this.bubble       = null;
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
    /** Alasan untuk kembali besok. Lihat src/data/dailyChallenge.js. */
    this.harian = new DailyChallenge();
    /** Jarak tempuh kumulatif hari ini (meter), untuk tantangan jalan kaki. */
    this._jarak = 0;
    /** @type {{x:number,z:number}|null} */
    this._posisiLalu = null;
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
      // build() mengisi world.lampu; DayNight dibuat setelah blok ini, jadi
      // daftarnya diserahkan di sini — bukan di bawah, di mana masih kosong.
      this.dayNight?.pakaiLampu(this.world.lampu);
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
    // Lampu warung dan tiang ikut siklus hari: padam siang, menyala magrib.
    // Daftarnya dikumpulkan World saat prop dibangun (PRD BAB 2.4 melarang
    // scene.traverse), jadi di sini tinggal diteruskan.
    this.dayNight.pakaiLampu(this.world.lampu);

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
    this._initHarian();

    // Login Modal
    this.loginModal.init();

    // Panels
    this.panels.init(this.avatar, G_Auth.getName.bind(G_Auth));
    // Tools
    this.generator3d.init();
    this.mapBuilder = new MapBuilder(scene, this.world, this.renderer, this.camera, this);

    // Remote players (harus sebelum auth agar event Socket terpasang)
    this.remotePlayers = new RemotePlayers(scene);
    this.bubble = new ChatBubbleLayer('lbl-layer', this.camera?.cam ?? null);
    this._initMultiplayer();

    // Chat
    this.chat.init();
    this._applySpotChrome();
    this.chat.onSend((msg) => this._kirimChat(msg));

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

  // ── TANTANGAN HARIAN ──────────────────────────────────

  _initHarian() {
    const pil = document.getElementById('harian-pill');
    const kartu = document.getElementById('harian-kartu');
    if (!pil || !kartu) return;
    pil.addEventListener('click', () => kartu.classList.toggle('on'));
    // Klik di luar menutup kartu — tanpa ini ia menutupi dunia.
    window.addEventListener('pointerdown', (e) => {
      if (!kartu.classList.contains('on')) return;
      if (kartu.contains(e.target) || pil.contains(e.target)) return;
      kartu.classList.remove('on');
    });
    this.harian.onUbah = (st) => {
      this._gambarHarian(st);
      if (st.selesai) {
        this.toast.show(`Tantangan hari ini selesai — runtutan ${st.runtutan} hari 🔥`, 'g');
      }
    };
    this._gambarHarian(this.harian.status());
  }

  /** @param {ReturnType<DailyChallenge['status']>} st */
  _gambarHarian(st) {
    const set = (id, teks) => { const el = document.getElementById(id); if (el) el.textContent = teks; };
    set('harian-teks', st.selesai ? 'Selesai' : `${st.kemajuan}/${st.target}`);
    set('harian-judul', st.tantangan.judul);
    set('harian-detail', st.tantangan.detail);
    set('harian-angka', `${st.kemajuan} / ${st.target} ${st.tantangan.satuan}`);
    set('harian-runtutan', `🔥 ${st.runtutan} hari`);
    const pil = document.getElementById('harian-pill');
    pil?.classList.toggle('selesai', st.selesai);
    const isi = document.querySelector('#harian-bar i');
    if (isi) isi.style.width = `${st.persen}%`;
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

    // Tantangan harian: jarak tempuh & kehadiran saat magrib.
    // Dihitung di loop karena keduanya bukan kejadian, melainkan keadaan
    // yang menumpuk — tidak ada satu titik "selesai" untuk dipasangi hook.
    const pos = this.avatar.getPosition();
    if (this._posisiLalu) {
      const d = Math.hypot(pos.x - this._posisiLalu.x, pos.z - this._posisiLalu.z);
      // Lompatan besar = teleport antar Spot, bukan berjalan. Jangan dihitung.
      if (d < 1.5) this._jarak += d;
      if (this._jarak >= 1) {
        const bulat = Math.floor(this._jarak);
        this._jarak -= bulat;
        this.harian.catat('jalan_kaki', bulat);
      }
    }
    this._posisiLalu = { x: pos.x, z: pos.z };

    if (this.dayNight.lampGlow > 0.35) {
      this.harian.catat('magrib', 1, 'magrib-hari-ini');
    }

    // NPC patrol
    this.npcs.update(dt, this._t);

    // Zone check (Oola) — nonaktif saat Spot Bogor agar hint tidak tabrakan
    if (this._spotRuntime) {
      this._updateSpotInteractions();
    } else {
      this.zones.update(this.avatar.getPosition());
      // Oola sekarang punya volume interaksi sendiri (meja nongkrong).
      // Zona statis tetap jalan supaya hint papan info / kotak saran tidak hilang.
      this._updateSpotInteractions();
    }
    this._updateMeja();

    // Emit posisi ke server multiplayer (throttled di dalam Socket.js).
    // Duduk membuat isMoving false padahal posisinya baru saja di-snap ke
    // kursi; tanpa _emitSekali, klien lain akan melihat orang itu tetap
    // berdiri di tempat lamanya.
    if (this.avatar.isMoving || this._emitSekali) {
      this._emitSekali = false;
      const pos = this.avatar.getPosition();
      this.mp.emitMove(pos.x, pos.z, this.avatar._facing);
    }

    // Update remote players (lerp + label)
    this.remotePlayers?.update(this.camera.cam, this.renderer.renderer);
    // Bubble chat menyusul: ia membaca posisi mesh HASIL lerp di atas, jadi
    // urutannya tidak boleh dibalik — kalau tidak, bubble tertinggal 1 frame.
    this.bubble?.update(this.camera.cam);

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
  /**
   * Volume interaksi dunia yang sedang aktif. Sampai sekarang hanya Spot
   * runtime yang boleh punya; Oola cuma punya ZONES statis dari config,
   * sehingga social node seperti meja nongkrong tidak mungkin ada di sana.
   * Satu jalur untuk keduanya menghilangkan batasan itu.
   */
  _volumeDunia() {
    return this._spotRuntime?.interactionVolumes ?? this.world?.interactionVolumes ?? [];
  }

  _updateSpotInteractions() {
    const vols = this._volumeDunia();
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

  /** @returns {import('../world/MejaNongkrong.js').MejaNongkrong | null} */
  _mejaDariVolume(vol) {
    if (!vol) return null;
    const daftar = this._spotRuntime?.meja ?? this.world?.meja ?? [];
    return daftar.find((m) => m.id === vol.id) ?? null;
  }

  /**
   * Siapa saja yang bisa menempati kursi: pemain lokal dan semua pemain remote.
   * Kuncinya socketId supaya urutannya stabil di semua klien — itu yang membuat
   * pemetaan kursi menghasilkan jawaban yang sama di setiap layar tanpa server
   * ikut memutuskan.
   */
  _pemainUntukMeja() {
    const out = [];
    const p = this.avatar?.getPosition();
    if (p) {
      out.push({
        kunci: this.mp?.id ?? 'aku',
        nama: this.user ? (G_Auth.getName(this.user) || 'Aku') : (this._guestLabel || 'Aku'),
        x: p.x, z: p.z,
      });
    }
    const remote = this.remotePlayers?._players ?? {};
    for (const sid in remote) {
      const r = remote[sid];
      out.push({ kunci: sid, nama: r.name || 'Warga', x: r.mesh.position.x, z: r.mesh.position.z });
    }
    return out;
  }

  /**
   * Segarkan keterisian tiap meja dan tuliskan ke hint volumenya.
   * Dihitung ulang tiap frame dari posisi yang memang sudah tersinkron —
   * tidak ada state duduk yang dikirim lewat socket, jadi tidak ada yang bisa
   * jadi basi.
   */
  _updateMeja() {
    const daftar = this._spotRuntime?.meja ?? this.world?.meja ?? [];
    if (!daftar.length) return;
    const pemain = this._pemainUntukMeja();
    const vols = this._volumeDunia();

    for (const meja of daftar) {
      const kursi = meja.hitungKursi(pemain);
      meja.terisi = kursi;
      const jumlah = kursi.filter(Boolean).length;

      const vol = vols.find((v) => v.id === meja.id);
      if (!vol) continue;
      vol.hint = `🍵 ${meja.nama} · ${jumlah}/${meja.jumlahKursi}`;
      if (this.avatar.sedangDuduk && this.avatar.kursi?.mejaId === meja.id) {
        vol.useKeyHint = '[F] berdiri';
      } else if (jumlah >= meja.jumlahKursi) {
        vol.useKeyHint = 'penuh, tunggu ada yang berdiri';
      } else {
        vol.useKeyHint = '[F] ikut nimbrung';
      }
    }

    // Pose duduk untuk pemain lain diturunkan dari peta kursi yang sama —
    // tidak ada state duduk yang dikirim lewat socket, jadi tidak ada yang
    // bisa jadi basi.
    const duduk = new Set();
    for (const meja of daftar) {
      for (const k of meja.terisi ?? []) if (k) duduk.add(k.kunci);
    }
    this.remotePlayers?.setDuduk(duduk);

    // Berdiri sendiri (menekan arah) juga harus disiarkan.
    if (this.avatar.baruBerdiri) this._emitSekali = true;
  }

  /** @param {import('../world/MejaNongkrong.js').MejaNongkrong} meja */
  _toggleDuduk(meja) {
    if (this.avatar.sedangDuduk) {
      this.avatar.berdiri();
      this._emitSekali = true;
      this.toast.show('Berdiri dari meja 🚶', 'g');
      return;
    }
    const terisi = meja.terisi ?? meja.hitungKursi(this._pemainUntukMeja());
    const kursi = meja.kursiKosongTerdekat(this.avatar.getPosition(), terisi);
    if (!kursi) {
      this.toast.show('Mejanya penuh — tunggu ada yang berdiri 🍵', 'a');
      return;
    }
    this.avatar.duduk({ ...kursi, mejaId: meja.id });
    this._emitSekali = true;
    const jumlah = (terisi.filter(Boolean).length) + 1;
    this.toast.show(
      jumlah > 1 ? `Nimbrung di ${meja.nama} — ${jumlah} orang 🍵` : `Duduk di ${meja.nama} 🍵`,
      'g',
    );
  }

  /** @param {import('../interaction/InteractionVolume.js').InteractionVolume | null} vol */
  _setActiveInteractionVolume(vol) {
    this._activeInteractionVolume = vol;
    const id = vol?.id ?? null;
    if (!vol) {
      if (id !== this._lastInteractionVolumeId) this.hud.hideZoneHint();
      this._lastInteractionVolumeId = id;
      this._hintTerakhir = null;
      return;
    }
    // Teksnya boleh berubah walau volumenya sama — keterisian meja bergerak
    // saat orang datang dan pergi. Yang dijaga adalah tidak menulis ulang
    // teks yang sama, bukan tidak pernah menulis ulang.
    const teks = `${vol.hint} — ${vol.useKeyHint}`;
    this._lastInteractionVolumeId = id;
    if (teks !== this._hintTerakhir) {
      this._hintTerakhir = teks;
      this.hud.showZoneHint(teks);
    }
  }

  _tryOpenZonePanel() {
    // Meja nongkrong ditangani di sini, bukan lewat onUse volume, karena
    // aksinya bergantung pada keadaan pemain (duduk / berdiri) dan pada
    // keterisian kursi — dua hal yang tidak diketahui volume itu sendiri.
    if (this._activeInteractionVolume && this._mejaDariVolume(this._activeInteractionVolume)) {
      this._toggleDuduk(this._mejaDariVolume(this._activeInteractionVolume));
      return;
    }
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
    this.harian.catat('sapa_warga', 1, `npc:${this._lastNPC?.id ?? 'x'}:${Date.now() >> 16}`);
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
        // Tanpa ini, bubble orang yang sudah keluar tetap hidup (tersembunyi)
        // sampai waktunya habis sendiri.
        this.bubble?.buang(data.socketId);
      })
      .on('count', (n) => {
        const el = document.getElementById('oc');
        if (el) el.textContent = n;
      })
      .on('chat', ({ socketId, name, msg }) => {
        // Echo pesan sendiri: server mengirim balik ke seluruh room, termasuk
        // pengirimnya. socketId memisahkannya dengan pasti — pencocokan nama
        // salah begitu dua pemain memakai nama yang sama.
        if (socketId && socketId === this.mp.id) return;

        this.chat.addMessage({ name, msg });

        // Bubble dulu, baru putuskan perlu-tidaknya toast: ucap() sekaligus
        // memproyeksikan bubble, jadi setelahnya kita tahu ia terlihat atau
        // tidak. Kalau bubble-nya kelihatan, toast cuma menyalin pesan yang
        // sama untuk ketiga kalinya (bubble + panel chat + toast) dan menutupi
        // dunia. Toast disimpan untuk kasus yang benar-benar butuh: pengirim
        // di belakang kamera, di luar layar, atau belum ada di roster.
        if (socketId) {
          this.bubble?.ucap(socketId, msg, () => this.remotePlayers?.posisiBubble(socketId) ?? null);
        }
        if (!socketId || !this.bubble?.terlihat(socketId)) {
          this.toast.show(`💬 ${name}: ${msg}`, 'g');
        }
      });
  }

  /**
   * Satu-satunya jalur kirim chat. Sebelumnya logika ini disalin di dua
   * tempat (Chat.onSend dan aksi tombol), dan salinan itulah yang membuat
   * bubble mudah terpasang di satu jalur saja lalu diam di jalur lain.
   *
   * @param {string} msg
   * @returns {boolean} true kalau pesan benar-benar terkirim
   */
  _kirimChat(msg) {
    const teks = msg?.trim();
    if (!teks) return false;
    if (!this.user) {
      this.toast.show('Login dulu untuk ikut chat 💬', 'a');
      this.loginModal.open();
      return false;
    }
    this.mp.emitChat(teks);
    // Tampilkan pesan sendiri langsung, tidak menunggu echo server.
    this.chat.addMessage({ name: G_Auth.getName(this.user) || 'Aku', msg: teks });
    // Bubble di atas kepala sendiri: pemain harus melihat kata-katanya
    // mendarat di dunia, bukan cuma di panel chat.
    this.bubble?.ucap('aku', teks, () => {
      const p = this.avatar?.getPosition();
      // 1.85 = di atas kepala chibi (puncak ~1.23); avatar lokal tidak
      // punya name-tag, jadi tidak perlu setinggi bubble remote.
      return p ? { x: p.x, y: 1.85, z: p.z } : null;
    });
    return true;
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
    this._applySpotChrome();
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
      this._spotRuntime.mount(scene, {
        toast: this.toast,
        openPanel: (id) => this.panels.openPanel(id),
      });
      this.npcs?.setHubVisible(false);
      // Lampu milik Spot ikut siklus hari, sama seperti prop Oola. Daftarnya
      // diminta ke runtime-nya (dikumpulkan saat mount), bukan disapu dari
      // scene — PRD BAB 2.4 melarang scene.traverse.
      this.dayNight?.pakaiLampu(this._spotRuntime.getLampu?.() || []);
      const manifestPath = `assets/spots/${spotVisualId}/manifest.json`;
      void this.assetLibrary.applyManifest(this._spotRuntime.root, manifestPath);
      this.harian.catat('jelajah_spot', 1, `spot:${spotVisualId}`);
      this._lastInteractionVolumeId = null;
      this._activeInteractionVolume = null;
      return;
    }

    if (!this.world.worldRoot) {
      this.world.rebuildContent();
      this.dayNight?.pakaiLampu(this.world.lampu);
    }
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
      // Pesan dari Spot lama tidak boleh ikut pindah ruangan.
      this.bubble?.bersihkan();

      this._socketRoom = socketRoomForSpot(spot.id);
      const u = new URL(window.location.href);
      u.searchParams.set('spot', spot.id);
      window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);

      this._applySpotChrome();
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
      // Pesan dari Spot lama tidak boleh ikut pindah ruangan.
      this.bubble?.bersihkan();

      this._socketRoom = OOLA_SOCKET_ROOM;
      const u = new URL(window.location.href);
      u.searchParams.delete('spot');
      const qs = u.searchParams.toString();
      window.history.replaceState({}, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);

      this._applySpotChrome();
      this.avatar.teleport(0, 2, 0);
      this._reconnectMultiplayerAfterWarp();
      this._syncSpotVisuals(null);
    });
  }

  /** Sinkron label Spot ke HUD, tab chat, dan pill bar bawah. */
  _applySpotChrome() {
    const label = spotLabelFromSocketRoom(this._socketRoom);
    this.hud.setSpotLabel(label);
    this.chat.setSpotContext(label);
    const pill = document.getElementById('bb-spot-pill');
    if (pill) pill.textContent = label === 'Oola Hub' ? 'Oola' : label;
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
        const inp = document.getElementById('chat-input');
        if (!inp?.value.trim()) return;
        if (this._kirimChat(inp.value.trim())) inp.value = '';
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
      spotHomeHint:          ()        => {
        const label = spotLabelFromSocketRoom(this._socketRoom);
        if (label === 'Oola Hub') this.toast.show('Oola — hub utama Galantara 🌟', 'g');
        else this.toast.show(`${label} — kamu di Spot ini 🏙`, 'g');
      },
    };
  }
}
