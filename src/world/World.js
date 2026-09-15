// ═══════════════════════════════════════════════════════
// World.js — Membangun dunia Oola (island melayang)
// Soft · Bubbly · Playful · Low Poly · Semi-3D · Chibi
// ═══════════════════════════════════════════════════════

import { buildProceduralGroup } from '../tools/proceduralMeshFactory.js';
import { PALETTE_SLOTS } from '../data/styleTokens.js';
import { MejaNongkrong } from './MejaNongkrong.js';
import { InteractionVolume } from '../interaction/InteractionVolume.js';
import { cincinTepi } from '../fisika/Fisika.js';
import { ISLAND_R } from '../data/config.js';
import { UKURAN_KAPSUL } from '../fisika/Karakter.js';

/** Kelompok collider Oola di dunia fisika — dilepas utuh saat pindah Spot. */
export const KELOMPOK_OOLA = 'oola';

const M = (color) => new THREE.MeshLambertMaterial({ color });
const MS = (color, r = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0.05 });

export class World {
  /**
   * Bohlam dan lampu titik yang ikut siklus hari (DayNight.pakaiLampu).
   * Diisi saat prop dibangun, bukan dengan menyapu scene — lihat PRD BAB 2.4.
   */
  lampu = [];

  /**
   * @param {THREE.Scene} scene
   * @param {{ fisika?: import('../fisika/Fisika.js').Fisika }} [opsi]
   */
  constructor(scene, { fisika = null } = {}) {
    this.scene     = scene;
    /** Dunia fisika. Boleh belum siap — pendaftaran masuk antrean. */
    this.fisika    = fisika;
    /** Social node Oola. Sampai sekarang Oola tidak punya InteractionVolume
     *  sama sekali — hanya ZONES statis dari config — jadi daftarnya lahir
     *  bersama meja pertama ini. @type {MejaNongkrong[]} */
    this.meja = [];
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
    /** @type {THREE.Group | null} */
    this.worldRoot = null; // isi Oola — bisa di-dispose saat ganti Spot visual
    this.objects   = []; // mesh di island (raycast MapBuilder) — tidak pakai scene.traverse()
    this.mapData   = null;
  }

  async init(mapPath = 'src/data/maps/default_oola.json') {
    try {
      const resp = await fetch(mapPath);
      this.mapData = await resp.json();
    } catch (e) {
      console.error('Gagal load map:', e);
    }
  }

  build() {
    this._mountIslandGeometry();
    if (!this.skyDome) this._buildSkyDome();
  }

  /** Lepas island Oola (tanpa sky). Dipanggil sebelum mount Spot lain (mis. Bogor). */
  disposeContent() {
    if (this.worldRoot) {
      const stack = [this.worldRoot];
      while (stack.length) {
        const obj = stack.pop();
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose?.());
        }
        if (obj.children?.length) stack.push(...obj.children);
      }
      this.scene.remove(this.worldRoot);
      this.worldRoot = null;
    }
    this.halo       = null;
    this.warpPortal = null;
    this.objects    = [];
    this.lampu      = [];
    // Collider ikut dilepas, dengan kelompoknya — bukan disapu dari dunia fisika.
    this.fisika?.lepasKelompok(KELOMPOK_OOLA);
    // Mesh-nya ikut terlepas bersama worldRoot di atas; yang perlu dibersihkan
    // di sini adalah daftarnya, supaya Spot berikutnya tidak mewarisi meja Oola.
    this.meja       = [];
    this.interactionVolumes = [];
  }

  /** Bangun ulang island dari `mapData` (sky tetap). */
  rebuildContent() {
    this._mountIslandGeometry();
  }

  _ensureWorldRoot() {
    if (!this.worldRoot) {
      this.worldRoot = new THREE.Group();
      this.worldRoot.name = 'world:oola';
      this.scene.add(this.worldRoot);
    }
  }

  /** Tambah mesh ke island + daftar raycast */
  _addToIsland(mesh) {
    this._ensureWorldRoot();
    this.worldRoot.add(mesh);
    this.objects.push(mesh);
    return mesh;
  }

  /**
   * Daftarkan collider satu prop ke kelompok Oola. Aman tanpa fisika (no-op)
   * dan sebelum fisika siap (antrean).
   */
  _daftarFisika(deskriptor, induk, putarY = 0, pemilik = 'oola') {
    this.fisika?.daftarkan(KELOMPOK_OOLA, deskriptor, induk, putarY, pemilik);
  }

  _mountIslandGeometry() {
    this.lampu = [];
    this.meja = [];
    this.interactionVolumes = [];
    this._ensureWorldRoot();
    this._buildGround();
    this._buildIslandBase();

    if (this.mapData && this.mapData.objects) {
      this.mapData.objects.forEach((obj) => {
        if (obj.type === 'native' && typeof this[obj.method] === 'function') {
          this[obj.method](obj.pos.x, obj.pos.y, obj.pos.z, obj.id);
        }
      });
    } else {
      this._buildPurpleTree(0, 0, 0, 'landmark_tree');
      this._buildWarpPortal(-7, 0, -2);
      this._buildInfoBoard(1, 0, 0);
      this._buildSuggestionBox(-9, 0, 3);
      this._buildDevHub(8, 0, -2.5);
      this._buildDecorations();
    }

    if (this.mapData?.procedural_props?.length) {
      for (const prop of this.mapData.procedural_props) {
        if (!prop?.archetype || !prop?.pos) continue;
        const paletteId = prop.paletteId || 'oola_heavenly';
        const pal = PALETTE_SLOTS[paletteId] || PALETTE_SLOTS.oola_heavenly;
        const g = buildProceduralGroup(
          prop.archetype,
          pal,
          prop.seed ?? 42,
          typeof prop.scale === 'number' ? prop.scale : 1,
        );
        g.position.set(prop.pos.x, prop.pos.y, prop.pos.z);
        g.rotation.y = Number.isFinite(prop.rotationY) ? prop.rotationY : 0;
        g.userData.mapId = prop.id || '';
        // Kumpulkan lampu SEKARANG, saat grupnya masih di tangan. PRD BAB 2.4
        // melarang scene.traverse; menyapu scene setelahnya untuk mencari
        // lampu akan melanggar aturan itu tanpa alasan.
        for (const anak of g.children) {
          if (anak.userData?.isLampu) this.lampu.push(anak);
        }
        this.addObject(g, prop.id || `prop_${prop.archetype}`);
      }
    }

    this._buildMejaNongkrong();
  }

  /**
   * Meja nongkrong Oola.
   *
   * Ditaruh di sisi seberang pintu Benteng, bukan di tengah: yang dicari orang
   * saat baru datang adalah sesuatu untuk DILAKUKAN, dan yang dicari orang
   * setelah beberapa menit adalah tempat untuk BERHENTI. Dua-duanya harus
   * kelihatan dari titik spawn, tapi tidak berebut tempat yang sama.
   */
  _buildMejaNongkrong() {
    const meja = new MejaNongkrong({
      id: 'meja_oola_1',
      nama: 'Meja Nongkrong',
      x: -4.6,
      z: 4.4,
      kursi: 4,
      rotasi: Math.PI * 0.25,
    });
    meja.bangun(this.worldRoot);
    meja.daftarkanFisika(this.fisika, KELOMPOK_OOLA);
    this.meja.push(meja);
    this.lampu.push(...meja.getLampu());
    this.objects.push(...meja.objek);

    this.interactionVolumes.push(new InteractionVolume({
      id: meja.id,
      shape: 'sphere',
      center: { x: meja.x, z: meja.z },
      radius: meja.jariInteraksi,
      hint: `🍵 ${meja.nama}`,
      useKeyHint: '[F] ikut nimbrung',
    }));
  }

  /** Tambahkan objek baru ke dunia secara runtime (untuk Game Builder) */
  addObject(group, id) {
    if (!this.worldRoot) this._ensureWorldRoot();
    group.name = id;
    this.worldRoot.add(group);
    this.objects.push(group);
    // Prop dari peta maupun dari Game Builder didaftarkan di SATU tempat ini.
    // MapBuilder hanya MENARUH (tidak memindah), jadi posisi saat ini adalah
    // posisinya.
    this._daftarFisikaProp(group, id);
    return group;
  }

  /**
   * Collider prop prosedural dari `userData.fisika` yang dinyatakan builder-nya.
   * Prop tanpa pernyataan sama sekali diperingatkan: diam-diam tembus adalah
   * persis jenis bug yang tidak dilaporkan siapa pun.
   */
  _daftarFisikaProp(g, id) {
    if (g.userData.fisikaTerdaftar) return;
    g.userData.fisikaTerdaftar = true;
    const deskriptor = g.userData.fisika;
    if (deskriptor === undefined) {
      console.warn(`[fisika] prop "${id}" tidak menyatakan collider (userData.fisika) — bisa ditembus`);
      return;
    }
    this._daftarFisika(deskriptor, g.position, g.rotation.y, id);
  }

  // ── GROUND PLANE ──────────────────────────────────
  _buildGround() {
    // Alas miniatur berlapis: permukaan gading, bibir lavender, lalu lis emas.
    // Oola tetap taman surgawi — bukan tanah kampung yang dipindah ke hub.
    // Permukaan atas: rumput surgawi, BUKAN gading.
    //
    // Gading (#f8f1ff) memang setia pada palet "putih" di PRD BAB 4.2, tapi
    // diukur ia larut ke langit: dE*ab cuma 18,5 terhadap langit siang, jadi
    // pulaunya hilang dan prop terlihat melayang di ruang putih.
    //
    // Catatan metode: kontras luminansi WCAG adalah alat yang SALAH untuk
    // pertanyaan ini. Hijau lama pun cuma 1,14 terhadap langit siang, padahal
    // terbaca jelas — yang bekerja adalah beda RONA, bukan terang-gelap.
    // Diukur dengan dE*ab: hijau lama 48,1 · gading 18,5.
    //
    // #a8d5a2 menjaga rasa surgawi-pastel (PRD tetap dihormati lewat lis emas
    // dan bibir lavender) sambil lolos di SEMUA fase langit:
    //   pagi 40,5 · siang 35,5 · sore 36,5 · magrib 71,9 · malam 85,2
    //
    // KOREKSI 15 Sep 2026 (ADR-0017): angka di atas dihitung dari warna
    // MATERIAL. Diukur dari piksel yang dirender, tanah ini tampil #ffffff
    // sepanjang siang karena cahaya dunia terlalu kuat. Siklus cahaya sudah
    // dikalibrasi ulang terhadap piksel (DayNight.js); warna materialnya tetap.
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20.55, 0.72, 48),
      MS(0xa8d5a2, 0.86),
    );
    top.position.set(0, -0.36, 0);
    top.receiveShadow = true;
    top.name = 'diorama_top';
    this._addToIsland(top);

    // Tanah fisika = permukaan atas diorama, dan dinding cincin tak terlihat.
    // Permukaan DALAM cincin ditaruh di ISLAND_R − 1 + jari kapsul, supaya
    // pusat pemain berhenti tepat di 17 m — sama dengan clamp radial lama,
    // bedanya sekarang pemain MELUNCUR menyusuri tepi, bukan tertahan lengket.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [40, 0.72, 40] }], { x: 0, y: -0.36, z: 0 }, 0, 'tanah_oola');
    this._daftarFisika(cincinTepi(ISLAND_R - 1 + UKURAN_KAPSUL[0] / 2), { x: 0, y: 0, z: 0 }, 0, 'tepi_oola');

    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(20.55, 21.45, 0.72, 48),
      MS(0xc4b5fd, 0.84),
    );
    edge.position.set(0, -1.03, 0);
    edge.name = 'diorama_lavender_edge';
    this._addToIsland(edge);

    const goldTrim = new THREE.Mesh(
      new THREE.TorusGeometry(20.58, 0.13, 6, 48),
      new THREE.MeshStandardMaterial({ color: 0xe9c86a, roughness: 0.68, metalness: 0.14 }),
    );
    goldTrim.position.set(0, -0.72, 0);
    goldTrim.rotation.x = Math.PI / 2;
    goldTrim.name = 'diorama_gold_trim';
    this._addToIsland(goldTrim);

    // Rok bawah sengaja GELAP, dan itu keputusan terukur, bukan selera.
    // Seluruh palet Oola terang (putih/emas/lavender per PRD BAB 4.2), jadi
    // di langit siang tidak ada satu pun unsur yang memisahkan siluet pulau
    // dari latarnya — diukur, kontras alas gading vs langit sore cuma 1,46
    // dan bibir lavender 1,15. Pulau terlihat larut.
    //
    // Bawah pulau melayang memang berada di bayangan, jadi satu unsur gelap
    // di sini benar secara fisik sekaligus menyelesaikan keterbacaan:
    //   pagi 3,17 · siang 3,53 · sore 3,56  ← rok bawah yang menopang
    //   magrib 6,69 · malam 14,21           ← alas gading yang menopang
    // Tiap fase punya minimal satu unsur >= 3:1. Jangan diterangkan lagi
    // tanpa mengukur ulang ketiganya.
    const under = new THREE.Mesh(
      new THREE.CylinderGeometry(19.35, 20.8, 0.72, 48),
      MS(0x6b5f8f, 0.9),
    );
    under.position.set(0, -1.72, 0);
    under.name = 'diorama_underplate';
    this._addToIsland(under);

    // Cakram air/langit pucat memisahkan alas dari awan di bawahnya.
    const waterGeo = new THREE.CylinderGeometry(24.5, 24.5, 0.22, 48);
    const waterMat = MS(0x9dd7ea, 0.42);
    waterMat.transparent = true;
    waterMat.opacity = 0.58;
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -2.18, 0);
    water.name = 'diorama_sky_pool';
    this._addToIsland(water);
  }

  // ── ISLAND BASE (floating clouds underneath) ──────
  _buildIslandBase() {
    // Puncak tiap bola HARUS di bawah pelat bawah diorama (y = -2.08),
    // kalau tidak awan menembus permukaan pulau dan menyapu layar jadi putih.
    // Bola r=8 di y=-2.5 dulu memuncak di y=+5.5 — enam satuan DI ATAS tanah
    // yang diinjak pemain. Rumusnya: y + r <= -2.5.
    //   [x, y, z, radius]
    const positions = [[0, -11.5, 0, 8], [-6, -8.5, 4, 5], [5, -7.5, -6, 4], [-3, -6.5, -5, 3]];
    positions.forEach(([x, y, z, r]) => {
      const geo = new THREE.SphereGeometry(r, 8, 6);
      const mat = MS(0xF0F8FF, 0.3);
      mat.transparent = true; mat.opacity = 0.6;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this._addToIsland(mesh);
    });
  }

  // ── PURPLE TREE (landmark utama Oola) ─────────────
  _buildPurpleTree(x = 0, y = 0, z = 0, id = 'purple_tree') {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
      MS(0x6B3F1A),
    );
    trunk.position.set(x, y + 2, z);
    trunk.castShadow = true;
    trunk.name = `${id}_trunk`;
    this._addToIsland(trunk);
    // Batang meruncing 0,5 → 0,3; setinggi badan pemain rata-ratanya ±0,47.
    // Kanopi dan halo tidak menghalangi.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [0.95, 4, 0.95], letak: [0, 2, 0] }], { x, y, z }, 0, id);

    // Canopy layers (3 spheres)
    //
    // Ungu DIREDAM (brief suasana gpt-5.6-sol + sintesis, 15 Sep 2026). Ungu
    // jenuh #7C3AED membaca sebagai "pohon fantasi aset toko", bukan pohon
    // tempat orang berteduh. Tiga lapis dengan terang berbeda memberi kedalaman
    // tanpa menambah bentuk. Keterbacaan diukur dulu (ADR-0011), bukan ditebak:
    //   dE*ab terhadap tanah #a8d5a2: 85,1 · 74,6 · 66,7
    //   dE*ab terhadap langit siang #87CEEB: 54,9 · 44,5 · 37,8
    // Semua di atas pulau itu sendiri terhadap langit (35,5), jadi pohon tidak
    // larut.
    const canopyColors = [0x8067B7, 0x9B83C8, 0xB39AD5];
    const canopyData   = [
      [x, y + 4.5, z, 2.8],
      [x - 0.8, y + 4, z + 0.8, 2.0],
      [x + 0.8, y + 3.8, z - 0.8, 1.8]
    ];
    canopyData.forEach(([cx, cy, cz, cr], i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(cr, 10, 8),
        MS(canopyColors[i], 0.8),
      );
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = true;
      mesh.name = `${id}_canopy_${i}`;
      this._addToIsland(mesh);
    });

    // Halo: BUSUR 225° yang DIAM, bukan cincin utuh yang berputar.
    //
    // Sintesis suasana menyebut cincin bercahaya yang berputar konstan sebagai
    // bahasa lobby game fantasi — bentuk melingkar sempurna + gerak tanpa henti
    // tanpa fungsi sosial. Busur yang terbuka dan diam masih memberi Oola
    // penanda emasnya, dan sedikit digeser dari sumbu supaya tidak terbaca
    // sebagai aset yang dipasang presisi. Segitiga turun (24 ruas, bukan 32).
    const haloGeo = new THREE.TorusGeometry(2.2, 0.12, 8, 24, Math.PI * 1.25);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xFDE68A });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.set(x + 0.25, y + 7.5, z - 0.2);
    this.halo.rotation.x = Math.PI / 2;
    // Celah busur menghadap arah kamera awal (theta = π/4), supaya terbaca
    // sebagai busur yang disengaja, bukan cincin yang terpotong di belakang.
    this.halo.rotation.z = Math.PI * 0.625;
    this.halo.name = `${id}_halo`;
    this._addToIsland(this.halo);
  }

  // ── WARP PORTAL ───────────────────────────────────
  _buildWarpPortal(x = -7, y = 0, z = -2) {
    // Ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.15, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x7C3AED }),
    );
    ring.position.set(x, y + 1.5, z);
    this._addToIsland(ring);

    // Inner glow disc
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x4F46E5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    disc.position.set(x, y + 1.5, z);
    disc.rotation.y = Math.PI / 2;
    this._addToIsland(disc);

    // Pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 0.5, 8),
      MS(0x4B5563),
    );
    ped.position.set(x, y + 0.25, z);
    this._addToIsland(ped);
    // Hanya pedestal yang padat. Cincinnya BERPUTAR di sumbu Y (animate), jadi
    // collider tetap yang mana pun salah separuh waktu — dan ini portal:
    // melangkah ke dalam cincinnya memang yang diharapkan orang.
    // Volume 0,60 walau pedestalnya 0,50: benda 0,40–0,45 m masih bisa dinaiki
    // kapsul (ambang nyata), jadi 0,50 terlalu dekat dengan ambangnya.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [1.4, 0.6, 1.4], letak: [0, 0.3, 0] }], { x, y, z }, 0, 'warp_portal');

    // Label sign
    this._buildSign(x, y + 2.8, z, '🌀 Warp Portal', 0x4F46E5);

    this.warpPortal = ring;
  }

  // ── INFO BOARD ────────────────────────────────────
  _buildInfoBoard(x = 1, y = 0, z = 0) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2, 6),
      MS(0x92400E),
    );
    post.position.set(x, y + 1, z);
    this._addToIsland(post);
    // Papannya mulai 1,80 m — di atas kepala. Tiangnya saja.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [0.2, 2, 0.2], letak: [0, 1, 0] }], { x, y, z }, 0, 'papan_info');

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1, 0.08),
      MS(0xFDE68A, 0.9),
    );
    board.position.set(x, y + 2.3, z);
    this._addToIsland(board);
  }

  // ── SUGGESTION BOX ────────────────────────────────
  _buildSuggestionBox(x = -9, y = 0, z = 3) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.5),
      MS(0xEC4899),
    );
    box.position.set(x, y + 0.35, z);
    box.castShadow = true;
    this._addToIsland(box);
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [0.7, 0.7, 0.5], letak: [0, 0.35, 0] }], { x, y, z }, 0, 'kotak_saran');
  }

  // ── DEVELOPER HUB ─────────────────────────────────
  _buildDevHub(x = 8, y = 0, z = -2.5) {
    // Palet Oola, bukan kios teknologi. Kotak gelap #1E1040 dengan layar neon
    // #00FF88 memutus gading-emas-lavender dan terbaca sebagai lobby game
    // generik (brief suasana Oola, 15 Sep 2026). Badan gading, atap lavender.
    // Building base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.8, 2),
      MS(0xF4EAD6),
    );
    base.position.set(x, y + 0.9, z);
    base.castShadow = true;
    this._addToIsland(base);
    // Badan bangunan; atap 2,8 × 2,3 mulai 1,80 m, di atas kepala.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [2.5, 1.8, 2], letak: [0, 0.9, 0] }], { x, y, z }, 0, 'dev_hub');

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.2, 2.3),
      MS(0xC4B5FD),
    );
    roof.position.set(x, y + 1.9, z);
    this._addToIsland(roof);

    // Layar: kaca teal gelap yang sedikit bercahaya, bukan neon.
    // MENYIMPANG dari usulan brief (#BFE3D0) karena diukur: dE*ab-nya terhadap
    // badan gading hanya 17,4 — layarnya hilang. #5E8C7A memberi 43,7.
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x5E8C7A,
        emissive: new THREE.Color(0x5E8C7A),
        emissiveIntensity: 0.18,
        roughness: 0.35,
      }),
    );
    screen.position.set(x, y + 0.9, z + 1.02);
    this._addToIsland(screen);

    this._buildSign(x, y + 2.5, z, '💻 Dev Hub', 0x7C3AED);
  }

  // ── DECORATIONS (benches, flowers, rocks) ─────────
  _buildBench(x, y, z, id = 'bench') {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.2, 0.4),
      MS(0x92400E, 0.9),
    );
    bench.position.set(x, y, z);
    bench.name = id;
    this._addToIsland(bench);
    // Papan 0,10–0,30 m ada di BAWAH batas naik tangga (0,35): tanpa volume
    // yang lebih tinggi dari mesh-nya, pemain berjalan di atas bangku.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [1.2, 0.6, 0.4], letak: [0, 0.3, 0] }], { x, y: 0, z }, 0, id);
  }

  _buildDecorations() {
    // Benches default
    const benchPositions = [[3, 0.2, -2], [-4, 0.2, 1], [0, 0.2, -6]];
    benchPositions.forEach(([x, y, z], i) => this._buildBench(x, y, z, `bench_${i}`));

    // Flower clusters
    const flowerColors = [0xF97316, 0xEC4899, 0xFDE68A, 0x10B981, 0x38BDF8];
    const flowerPos = [[4, -4], [-6, -3], [2, 6], [-2, -7], [8, 5], [-10, -2], [5, 8]];
    flowerPos.forEach(([x, z], i) => {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 6, 5),
        MS(flowerColors[i % flowerColors.length], 0.9),
      );
      flower.position.set(x + (Math.random() - 0.5), 0.25, z + (Math.random() - 0.5));
      this._addToIsland(flower);
    });
  }

  // ── SKY DOME ──────────────────────────────────────
  _buildSkyDome() {
    const geo = new THREE.SphereGeometry(150, 16, 8);
    geo.scale(-1, 1, -1); // flip inside out
    this.skyMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
    this.skyDome = new THREE.Mesh(geo, this.skyMat);
    this.scene.add(this.skyDome);
  }

  // ── HELPER: floating sign text ────────────────────
  _buildSign(x, y, z, _label, color) {
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.set(x, y, z);
    this._addToIsland(marker);
  }

  // ── ANIMATE (portal pulse) ─────────────────────────
  // Halo tidak lagi berputar — lihat _buildPurpleTree.
  animate(t) {
    if (this.warpPortal) {
      this.warpPortal.rotation.y = t * 0.8;
      this.warpPortal.material.color.setHSL(0.75 + Math.sin(t) * 0.05, 0.8, 0.5);
    }
  }

  // ── DUNGEON PORTAL (show/hide) ────────────────────
  showDungeonPortal(visible) {
    // Placeholder — akan ditambah geometry dungeon portal
    document.getElementById('dg-portal')?.classList.toggle('on', visible);
  }
}
