// ═══════════════════════════════════════════════════════
// KutaSpotRuntime.js — Spot Bali: pantai, candi bentar, selancar
// Pola sama Monas/Bogor: root, raycast ground, volume + [F], manifest GLB.
// Palet PRD BAB 4.2 — Oranye primer, Biru sekunder, Krem aksen.
// Dasar bentuk: docs/RISET_3D_NUSANTARA.md §13.
// Collider: ADR-0016 — tiap collider ditulis di sebelah mesh yang diwakilinya,
// dengan angka yang sama; volume permainan, bukan salinan bentuk.
// ═══════════════════════════════════════════════════════

import { dindingPersegi } from '../../fisika/Fisika.js';
import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal, FISIKA_ALAS_PORTAL } from '../spotWarpPortal.js';

// THREE global — jangan `import 'three'`; klien memuatnya lewat tag script.
const MS = (color, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });

const PALET = {
  pasir:    0xefe2c8,   // krem — aksen PRD, dan memang warna pasir Kuta
  pasirBsh: 0xd8c6a4,   // pasir basah di batas air, lebih gelap
  laut:     0x3d8fb8,   // biru — sekunder PRD
  buih:     0xd9eef5,
  batu:     0x8b8378,   // candi bentar, batu paras
  batuTua:  0x6e6960,   // bayangan undakan
  kelapa:   0x6b4a2f,
  daun:     0x3f7d4a,
  papan:    0xe2703a,   // oranye — primer PRD, di papan selancar
  payung:   0xe2703a,
};

// Sumbu: +Z darat, -Z laut. Semua penempatan mengacu ke sini.
export const PANTAI_LEBAR = 32;
export const PANTAI_DALAM = 15;
export const GARIS_AIR_Z = -PANTAI_DALAM / 2 + 3;
/** Balok pasir setebal ini, permukaannya di y = 0. */
const PASIR_TEBAL = 0.9;
/** Pita buih (posisi diam): tengahnya 0,4 m ke arah laut dari garis air. */
const BUIH_Z = GARIS_AIR_Z - 0.4;
const BUIH_DALAM = 0.8;

/**
 * Batas ke laut — permukaan DALAM dinding tak terlihat di sisi laut.
 *
 * Pemain boleh sampai buih, tidak lebih. Dinding menempel di tepi luar pita
 * buih, jadi kapsul (jari 0,40) berhenti di situ dan PUSAT pemain di tengah
 * buih: kaki disapu buih yang maju-mundur ±0,45 m, badan tidak pernah
 * melewatinya. Di balik buih tidak ada kegiatan dan tidak ada lantai yang
 * dijanjikan — bidang laut hanya bidang biru di y −0,06.
 *
 * Batas ini diikat ke buih dan garis air, BUKAN ke tepi balok pasir: balok
 * pasir menjorok 3 m melewati GARIS_AIR_Z (sampai z −7,5) dan menutupi awal
 * bidang laut. Kalau tumpang-tindih itu kelak dibetulkan, batas ini tetap benar.
 */
export const BATAS_LAUT_Z = BUIH_Z - BUIH_DALAM / 2;

/**
 * Bagian benda yang pangkalnya di atas ketinggian ini tidak pernah tersentuh
 * kapsul pemain (tinggi 1,30 + offset 0,02) — tanpa collider (ADR-0016).
 */
const ATAS_KEPALA = 1.4;

export class KutaSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:kuta';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** Dunia fisika dari ctx saat mount; null = tanpa fisika.
     *  @type {import('../../fisika/Fisika.js').Fisika | null} */
    this._fisika = null;
    /** @type {string | undefined} */
    this._kelompokFisika = undefined;
    /** @type {THREE.Object3D[]} */
    this._lampu = [];
    /** @type {THREE.Mesh | null} */
    this._buih = null;
    /** @type {THREE.Object3D[]} */
    this._pelepah = [];
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
  }

  /** Candi bentar: satu candi dibelah dua, celah di tengah, profil BERUNDAK.
   *  Muka berhias, sisi lorong polos — itu memang cirinya, dan kebetulan
   *  hemat poligon (riset §13). */
  _candiBentar(g, x, z, rotY) {
    const gerbang = new THREE.Group();
    gerbang.name = 'kuta_candi_bentar';
    const CELAH = 1.9;          // lebar jalan di tengah
    const UNDAK = 5;            // jumlah undakan profil
    const UNDAK_TINGGI = 0.62;
    const UNDAK_TEBAL = 0.9;
    const LEBAR_DASAR = 1.5;    // undakan terbawah, yang paling lebar
    const ANAK_TINGGI = 0.16;   // anak tangga lorong
    // Collider dikumpulkan di sebelah mesh-nya, lalu didaftarkan SEKALI dengan
    // posisi dan putaran grup gerbang — `letak` di bawah ini koordinat lokal.
    const fisika = [];

    for (const sisi of [-1, 1]) {
      for (let i = 0; i < UNDAK; i += 1) {
        // Menyempit ke atas — itulah profil berundaknya.
        const lebar = LEBAR_DASAR - i * 0.19;
        const blok = new THREE.Mesh(
          new THREE.BoxGeometry(lebar, UNDAK_TINGGI, UNDAK_TEBAL),
          MS(i % 2 ? PALET.batuTua : PALET.batu, 0.92),
        );
        blok.position.set(
          sisi * (CELAH / 2 + lebar / 2),
          UNDAK_TINGGI / 2 + i * UNDAK_TINGGI,
          0,
        );
        blok.castShadow = true;
        gerbang.add(blok);
      }
      // Tiap belahan SATU volume: tapak undakan terbawah, setinggi seluruh
      // susunan. Undakan di atasnya menyempit dari sisi LUAR saja (sisi lorong
      // rata), tiap tingkat 0,62 m — tidak bisa dinaiki — dan kapsul yang
      // berdiri di tanah sudah tertahan undakan terbawah yang paling lebar.
      // Lima balok salinan tidak mengubah gerak apa pun selain jumlahnya.
      fisika.push({
        bentuk: 'kotak',
        ukuran: [LEBAR_DASAR, UNDAK * UNDAK_TINGGI, UNDAK_TEBAL],
        letak: [sisi * (CELAH / 2 + LEBAR_DASAR / 2), (UNDAK * UNDAK_TINGGI) / 2, 0],
      });
      // Puncak runcing tiap belahan.
      const puncak = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.8, 4),
        MS(PALET.batu, 0.9),
      );
      puncak.rotation.y = Math.PI / 4;
      puncak.position.set(sisi * (CELAH / 2 + 0.45), UNDAK * UNDAK_TINGGI + 0.4, 0);
      gerbang.add(puncak);
      // Puncak mulai 3,10 m, di atas kepala: tanpa collider.
    }
    // Celah 1,9 m sengaja TERBUKA: gerbang ini untuk dilalui. Kapsul 0,80
    // lewat dengan sisa 0,55 m di tiap sisi.

    // Lorong ditinggikan beberapa anak tangga (sesuai sumber).
    for (let s = 0; s < 3; s += 1) {
      const anak = new THREE.Mesh(
        new THREE.BoxGeometry(CELAH + 2.6, ANAK_TINGGI, 0.55),
        MS(PALET.batu, 0.9),
      );
      anak.position.set(0, ANAK_TINGGI / 2 + s * ANAK_TINGGI, 0.75 + s * 0.55);
      anak.receiveShadow = true;
      gerbang.add(anak);
      // Mesh anak tangga MELAYANG (balok 0,16 m di ketinggian 0,16·s); volumenya
      // dari tanah sampai permukaannya — kolong setinggi 0,16–0,32 m tidak bisa
      // dilewati avatar 1,30 m. Tiap anak naik 0,16, di bawah batas naik tangga
      // 0,35: dinaiki satu per satu dari celah gerbang, itu desain level.
      //
      // Tangganya NAIK MENJAUHI gerbang (s besar = lebih tinggi = lebih jauh),
      // jadi dari pantai yang pertama ditemui tepi 0,48 m — di bawah ambang
      // panjat serong ±0,50. Terukur di Kuta: tegak lurus tertahan, serong
      // ≥ 50° naik (29 dari 375 pendekatan). Dari samping, lewat anak 0–1, lalu
      // masuk celah: 43 dari 44 sampai ke sisi darat; satu bertengger di pojok
      // ujung tangga dan muka belahan. Darat → celah → tangga → pantai: 25/25.
      // Volume tetap setia pada tinggi yang terlihat: bibir tak terlihat
      // ≥ 0,70 di tepi itu membuat pemain melayang di anak teratas, karena
      // dalamnya 0,55 < kapsul 0,80. Perbaikannya di mesh, bukan di sini.
      const permukaan = ANAK_TINGGI * (s + 1);
      fisika.push({
        bentuk: 'kotak',
        ukuran: [CELAH + 2.6, permukaan, 0.55],
        letak: [0, permukaan / 2, 0.75 + s * 0.55],
      });
    }

    gerbang.position.set(x, 0, z);
    gerbang.rotation.y = rotY;
    g.add(gerbang);
    this._daftarFisika(fisika, { x, y: 0, z }, rotY, gerbang.name);
    return gerbang;
  }

  /** Kelapa: batang MELENGKUNG, itu tandanya. Batang lurus terbaca sebagai
   *  tiang, bukan kelapa. */
  _kelapa(g, x, z, tinggi, condong) {
    const pohon = new THREE.Group();
    pohon.name = `kuta_kelapa_${x}`;
    const RUAS = 5;
    const fisika = [];
    for (let i = 0; i < RUAS; i += 1) {
      const t = i / RUAS;
      const jariPangkal = 0.16 - t * 0.04;
      const ruas = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13 - t * 0.04, jariPangkal, tinggi / RUAS, 6),
        MS(PALET.kelapa, 0.85),
      );
      // Lengkung: makin ke atas makin menjauh dari pangkal.
      const lx = Math.sin(t * condong) * tinggi * 0.28;
      const ly = tinggi / RUAS / 2 + i * (tinggi / RUAS);
      ruas.position.set(lx, ly, 0);
      ruas.rotation.z = -t * condong * 0.55;
      ruas.castShadow = true;
      pohon.add(ruas);
      // Batang, bukan pelepah — dan hanya ruas yang pangkalnya di bawah kepala
      // (ruas 0 dan 1; ruas 2 mulai 1,84–2,20 m). Silinder tegak selebar pangkal
      // ruasnya, di letak yang sama, jadi lengkungnya ikut: ruas 1 sudah
      // bergeser 0,13–0,19 m. Miring ruas (≤ 0,08 rad) menggeser ujungnya < 4 cm
      // dan diabaikan — bentuk.js memang menolak putaran selain Y.
      if (i * (tinggi / RUAS) < ATAS_KEPALA) {
        fisika.push({ bentuk: 'silinder', ukuran: [jariPangkal * 2, tinggi / RUAS, jariPangkal * 2], letak: [lx, ly, 0] });
      }
    }
    const puncakX = Math.sin(condong) * tinggi * 0.28;
    for (let d = 0; d < 6; d += 1) {
      const pelepah = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 2.5, 4),
        MS(PALET.daun, 0.88),
      );
      const a = (d / 6) * Math.PI * 2;
      pelepah.position.set(puncakX + Math.cos(a) * 0.95, tinggi + 0.2, Math.sin(a) * 0.95);
      pelepah.rotation.set(Math.PI / 2.4, 0, -a);
      pelepah.castShadow = true;
      pohon.add(pelepah);
      this._pelepah.push(pelepah);
    }
    // Pelepah di ketinggian batang + 0,2 m dan bergoyang: tanpa collider.
    pohon.position.set(x, 0, z);
    g.add(pohon);
    this._daftarFisika(fisika, { x, y: 0, z }, 0, pohon.name);
    return pohon;
  }

  /**
   * @param {THREE.Scene} scene
   * @param {{
   *   toast: { show: (m: string, t?: string) => void },
   *   openPanel?: (id: string) => void,
   *   fisika?: import('../../fisika/Fisika.js').Fisika,
   *   kelompokFisika?: string,
   * }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    // Kuta menyatakan tanah dan batasnya sendiri. Bawaan Game (lantai 120 × 120
    // di y 0 + cincin 17 m) salah untuk pantai ini: pasirnya 32 × 15, jadi
    // pemain akan berjalan di udara sampai 9,5 m di belakang pasir dan 12,5 m
    // melewati garis air ke laut.
    this.fisikaTanah = true;
    this._fisika = ctx?.fisika ?? null;
    this._kelompokFisika = ctx?.kelompokFisika;

    // Pasir — permukaan yang dijalani.
    const pasir = new THREE.Mesh(
      new THREE.BoxGeometry(PANTAI_LEBAR, PASIR_TEBAL, PANTAI_DALAM),
      MS(PALET.pasir, 0.95),
    );
    pasir.position.set(0, -PASIR_TEBAL / 2, 0);
    pasir.receiveShadow = true;
    g.add(pasir);
    this.raycastMeshes.push(pasir);
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [PANTAI_LEBAR, PASIR_TEBAL, PANTAI_DALAM] }],
      { x: 0, y: -PASIR_TEBAL / 2, z: 0 }, 0, 'kuta_pasir');

    // Pita pasir basah. Tanpa ini pasir dan laut cuma dua bidang yang
    // bersentuhan — pelajaran yang sama dari anjungan Losari.
    const basah = new THREE.Mesh(
      new THREE.BoxGeometry(PANTAI_LEBAR, 0.04, 2.2),
      MS(PALET.pasirBsh, 0.9),
    );
    basah.name = 'kuta_pasir_basah';
    basah.position.set(0, 0.02, GARIS_AIR_Z + 1.1);
    g.add(basah);
    // Ikut jadi tanah: permukaannya yang terlihat 4 cm di atas pasir, dan kaki
    // berdiri DI ATASNYA, bukan tenggelam. 4 cm jauh di bawah naik tangga 0,35.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [PANTAI_LEBAR, 0.04, 2.2] }],
      { x: 0, y: 0.02, z: GARIS_AIR_Z + 1.1 }, 0, basah.name);

    // Laut tanpa collider: tidak ada yang boleh berdiri di sana (BATAS_LAUT_Z).
    const laut = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 100),
      MS(PALET.laut, 0.4),
    );
    laut.rotation.x = -Math.PI / 2;
    laut.position.set(0, -0.06, GARIS_AIR_Z - 50);
    laut.receiveShadow = true;
    g.add(laut);

    const buih = new THREE.Mesh(
      new THREE.BoxGeometry(PANTAI_LEBAR + 8, 0.05, BUIH_DALAM),
      MS(PALET.buih, 0.55),
    );
    buih.position.set(0, -0.02, BUIH_Z);
    g.add(buih);
    this._buih = buih;
    // Buih bergerak dan setipis 5 cm: tanpa collider. Ia yang menentukan batas
    // ke laut — lihat BATAS_LAUT_Z.
    //
    // Batas area: dinding tak terlihat. Sisi darat dan kedua sisi samping
    // MENEMPEL di tepi pasir, jadi seluruh kapsul tetap di atas pasir dan pusat
    // pemain berhenti 0,40 (+ offset 0,02) di dalam tepinya. Di balik tepi itu
    // tidak ada apa-apa — balok pasir jatuh 0,9 m ke ruang kosong — dan badan
    // yang menjorok ke sana terbaca melayang. Sisi laut di tepi luar buih.
    const panjangJalan = PANTAI_DALAM / 2 - BATAS_LAUT_Z;
    this._daftarFisika(dindingPersegi(PANTAI_LEBAR, panjangJalan),
      { x: 0, y: 0, z: BATAS_LAUT_Z + panjangJalan / 2 }, 0, 'kuta_batas');

    // Candi bentar sebagai gerbang menuju pantai — persis peran aslinya
    // di Kuta, bukan hiasan yang ditempel biar terasa Bali.
    this._candiBentar(g, 0, PANTAI_DALAM / 2 - 2.2, Math.PI);

    // Kelapa berderet di sisi darat, condong ke arah laut.
    const posisiKelapa = [-12, -8.5, 8.5, 12.5];
    posisiKelapa.forEach((x, i) => {
      this._kelapa(g, x, PANTAI_DALAM / 2 - 5.5, 4.6 + (i % 2) * 0.9, 0.5 + (i % 3) * 0.12);
    });

    // Papan selancar ditancapkan di pasir — penanda surfing yang terbaca
    // dari kamera orbit tanpa perlu animasi ombak.
    const PAPAN_X = -5.5;
    const PAPAN_Z = GARIS_AIR_Z + 4.2;
    const PAPAN_JARAK = 0.95;
    const PAPAN_CONDONG = 0.09;   // rad, per papan dari tengah deret
    for (let i = 0; i < 4; i += 1) {
      const papan = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 2.3, 0.09),
        MS(i % 2 ? PALET.papan : PALET.buih, 0.55),
      );
      papan.name = `kuta_papan_${i}`;
      papan.position.set(PAPAN_X + i * PAPAN_JARAK, 1.05, PAPAN_Z);
      papan.rotation.z = (i - 1.5) * PAPAN_CONDONG;
      papan.castShadow = true;
      g.add(papan);
    }
    // Celah antarpapan 0,45 m, lebih sempit dari kapsul 0,80: keempat papan
    // SATU volume (ADR-0016, benda rapat). Papan terluar condong 1,5 · 0,09 rad
    // dan pangkalnya bergeser keluar (2,3 / 2) · sin(0,135) ≈ 0,15 m — lebar
    // volume ditambah itu di kedua sisi. Dari pasir sampai pucuk papan (2,2 m).
    const geserPangkal = (2.3 / 2) * Math.sin(1.5 * PAPAN_CONDONG);
    this._daftarFisika([{
      bentuk: 'kotak',
      ukuran: [3 * PAPAN_JARAK + 0.5 + 2 * geserPangkal, 2.2, 0.09],
      letak: [0, 1.1, 0],
    }], { x: PAPAN_X + 1.5 * PAPAN_JARAK, y: 0, z: PAPAN_Z }, 0, 'kuta_papan_selancar');

    // Payung + kursi berjemur.
    const PAYUNG_X = 6.5;
    for (let i = 0; i < 2; i += 1) {
      const z = GARIS_AIR_Z + 4.5 + i * 3.2;
      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6),
        MS(PALET.kelapa, 0.8),
      );
      tiang.name = `kuta_payung_${i}`;
      tiang.position.set(PAYUNG_X, 1.1, z);
      g.add(tiang);
      // Tiangnya saja — kanopi mulai 2,1 m, di atas kepala. Collider 0,20, bukan
      // 0,10, mengikuti tiang lampu prosedural (alasan yang dicatat di sana:
      // tiang setipis mesh membuat pemain tersangkut di tepinya).
      this._daftarFisika([{ bentuk: 'silinder', ukuran: [0.2, 2.2, 0.2], letak: [0, 1.1, 0] }],
        { x: PAYUNG_X, y: 0, z }, 0, tiang.name);

      const kanopi = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 0.6, 8),
        MS(PALET.payung, 0.85),
      );
      kanopi.position.set(PAYUNG_X, 2.4, z);
      kanopi.castShadow = true;
      g.add(kanopi);

      const kursi = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.16, 0.62),
        MS(PALET.buih, 0.8),
      );
      kursi.name = `kuta_kursi_${i}`;
      kursi.position.set(PAYUNG_X - 0.2, 0.35, z + 0.9);
      kursi.rotation.x = -0.18;
      kursi.castShadow = true;
      g.add(kursi);
      // Kursi tanpa kaki: dudukannya melayang miring 0,22–0,48 m. Penghalang
      // dimulai dari tanah, dan setinggi 0,70 supaya tidak bisa dinaiki — aturan
      // kerja untuk benda di bawah ±0,55 m. Disapu 160 pendekatan
      // (tools/fisika/sapu-panjat.mjs): volume 0,50 dipanjat 66 kali, 0,60 dan
      // 0,70 nol; 0,70 memberi margin yang sama dengan alas portal.
      this._daftarFisika([{ bentuk: 'kotak', ukuran: [1.7, 0.7, 0.62], letak: [0, 0.35, 0] }],
        { x: PAYUNG_X - 0.2, y: 0, z: z + 0.9 }, 0, kursi.name);
    }

    // Obor pantai — Kuta terkenal karena matahari terbenamnya, jadi lampu
    // di sini ikut siklus hari seperti Spot lain.
    for (const x of [-14, 14]) {
      const batang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6),
        MS(PALET.kelapa, 0.8),
      );
      batang.name = `kuta_obor_${x}`;
      batang.position.set(x, 1.2, GARIS_AIR_Z + 3);
      g.add(batang);
      // Api dan cahayanya di 2,5 m, di atas kepala: batangnya saja. Pangkal
      // 0,18 → collider 0,20, alasan yang sama dengan tiang payung.
      this._daftarFisika([{ bentuk: 'silinder', ukuran: [0.2, 2.4, 0.2], letak: [0, 1.2, 0] }],
        { x, y: 0, z: GARIS_AIR_Z + 3 }, 0, batang.name);

      const api = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        MS(0xffb35c, 0.4),
      );
      api.position.set(x, 2.5, GARIS_AIR_Z + 3);
      api.material.emissive = new THREE.Color(0xffb35c);
      api.material.emissiveIntensity = 0.3;
      api.userData.isLampu = true;
      g.add(api);
      this._lampu.push(api);

      const nyala = new THREE.PointLight(0xffb35c, 0, 7, 2);
      nyala.position.set(x, 2.5, GARIS_AIR_Z + 3);
      nyala.userData.isLampu = true;
      g.add(nyala);
      this._lampu.push(nyala);
    }

    scene.add(g);

    const warpX = -11;
    const warpZ = PANTAI_DALAM / 2 - 2.5;
    const { warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;
    // Satu deskriptor alas untuk semua Spot, dinyatakan di sebelah mesh-nya
    // di spotWarpPortal.js.
    this._daftarFisika(FISIKA_ALAS_PORTAL, { x: warpX, y: 0, z: warpZ }, 0, 'kuta_portal');

    this.interactionVolumes = [];
    if (ctx?.toast) {
      const T = ctx.toast;
      this.interactionVolumes = [
        new InteractionVolume({
          id: 'spot_warp_portal',
          shape: 'sphere',
          center: { x: warpX, z: warpZ },
          radius: 2.7,
          hint: '🌀 Warp Portal — pilih Spot lain',
          useKeyHint: '[F]',
          onUse: () => {
            if (ctx?.openPanel) ctx.openPanel('map-panel');
            else T.show('Buka Peta Spot dari bar bawah (ikon peta) 🗺', 'g');
          },
        }),
        new InteractionVolume({
          id: 'kuta_selancar',
          shape: 'sphere',
          center: { x: PAPAN_X + 1.4, z: GARIS_AIR_Z + 4.2 },
          radius: 2.8,
          hint: '🏄 Sewa papan selancar',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Sewa papan + mini-game selancar — menyusul 🏄', 'a');
          },
        }),
        new InteractionVolume({
          id: 'kuta_candi_bentar',
          shape: 'sphere',
          center: { x: 0, z: PANTAI_DALAM / 2 - 2.2 },
          radius: 3.0,
          hint: '⛩ Candi bentar — gerbang pantai',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Gerbang belah dua: lambang dualitas yang seimbang ⛩', 'g');
          },
        }),
        new InteractionVolume({
          id: 'kuta_sunset',
          shape: 'sphere',
          center: { x: PAYUNG_X, z: GARIS_AIR_Z + 5.4 },
          radius: 3.0,
          hint: '🌅 Kursi pantai — lihat matahari terbenam',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Duduk & lihat sunset Kuta 🌅', 'g');
          },
        }),
      ];
    }

    return this;
  }

  /**
   * Daftarkan collider satu benda Spot ini ke kelompok milik Game. Aman tanpa
   * ctx (no-op) dan sebelum fisika siap (antrean di Fisika). Melepasnya bukan
   * urusan runtime: Game melepas kelompok 'spot' utuh saat warp.
   */
  _daftarFisika(deskriptor, induk, putarY = 0, pemilik = 'kuta') {
    this._fisika?.daftarkan(this._kelompokFisika, deskriptor, induk, putarY, pemilik);
  }

  /** Dikumpulkan saat mount, bukan disapu dari scene (PRD BAB 2.4). */
  getLampu() {
    return this._lampu;
  }

  /** @param {THREE.Scene} scene */
  dispose(scene) {
    for (const v of this.interactionVolumes) v.reset();
    this.interactionVolumes = [];
    scene.remove(this.root);
    this.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose?.());
      }
    });
    this.raycastMeshes = [];
    this._lampu = [];
    this._pelepah = [];
    this._buih = null;
    this._warpRing = null;
    this._fisika = null;
  }

  /** @param {number} t */
  animate(t) {
    // Buih maju-mundur pelan. Amplitudo kecil — ombak yang bergerak jauh
    // terbaca sebagai bug, bukan laut.
    if (this._buih) {
      this._buih.position.z = BUIH_Z + Math.sin(t * 0.7) * 0.45;
    }
    // Pelepah kelapa bergoyang. Fase digeser per pelepah supaya tidak
    // bergerak serempak seperti satu benda.
    for (let i = 0; i < this._pelepah.length; i += 1) {
      this._pelepah[i].rotation.x = Math.PI / 2.4 + Math.sin(t * 0.9 + i * 0.7) * 0.045;
    }
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
