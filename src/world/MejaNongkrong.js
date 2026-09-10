// ═══════════════════════════════════════════════════════
// MejaNongkrong.js — social node: meja bundar + dingklik
//
// PRD (GALANTARA_BUILDER_SYSTEM §"SocialNode registry"): "warung, bangku,
// panggung = node pertama, bukan dekorasi terakhir." RESOURCES_RESEARCH
// menaruh "InteractionVolume + satu aksi (bangku duduk)" sebagai P1 dengan
// alasan "jadi betah tanpa nambah mesh".
//
// Jadi ini BUKAN prop. Ia tempat yang mengubah orang-orang yang kebetulan
// berdekatan menjadi kelompok dengan batas sosial yang jelas: kelihatan siapa
// yang sedang duduk, kelihatan masih ada tempat atau tidak, dan ikut duduk
// adalah satu tombol.
//
// KEPUTUSAN PENTING — keterisian kursi TIDAK memakai state server.
// Posisi tiap pemain sudah disiarkan lewat `player_move`, jadi tiap klien bisa
// menghitung sendiri siapa duduk di kursi mana, dan hasilnya sama di semua
// layar selama aturannya deterministik (lihat `hitungKursi`). Menambah pesan
// socket baru untuk hal yang sudah bisa diturunkan dari data yang ada hanya
// menambah cara untuk tidak sinkron.
// ═══════════════════════════════════════════════════════

const MS = (color, r = 0.75) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0.04 });

/**
 * Ukuran nyata, satu unit = satu meter. Meja warung Indonesia rendah dan
 * dingkliknya pendek — itu yang membuat orang duduk membungkuk mendekat,
 * bukan bersandar menjauh seperti kursi kafe Barat.
 */
const SPEK = Object.freeze({
  tinggiMeja: 0.68,
  jariMeja: 0.55,
  tebalDaun: 0.055,
  jariKakiMeja: 0.09,

  tinggiDingklik: 0.38,
  jariDingklik: 0.19,
  tebalDudukan: 0.05,

  /** Jarak pusat meja ke pusat dingklik. */
  jariLingkar: 1.02,

  /** Sejauh mana pemain boleh berdiri dari sebuah kursi untuk dihitung
   *  menempatinya. Cukup longgar untuk lerp jaringan, cukup ketat supaya
   *  orang yang cuma lewat tidak terhitung duduk. */
  jariKursi: 0.62,
});

/** Palet: kayu jati tua, bambu, dan gerabah — bukan plastik kafe. */
const PALET = Object.freeze({
  kayu: 0xa8703f,
  kayuTua: 0x7a4f2a,
  bambu: 0xc9a86a,
  gerabah: 0x9c5b3f,
  kain: 0xd8c39a,
  bohlam: 0xffd9a0,
});

export class MejaNongkrong {
  /**
   * @param {{
   *   id: string,
   *   x: number, z: number,
   *   kursi?: number,
   *   rotasi?: number,
   *   nama?: string,
   * }} spek
   */
  constructor({ id, x, z, kursi = 4, rotasi = 0, nama = 'Meja Nongkrong' }) {
    this.id = id;
    this.x = x;
    this.z = z;
    this.jumlahKursi = Math.max(2, Math.min(8, kursi));
    this.rotasi = rotasi;
    this.nama = nama;

    /** @type {THREE.Group | null} */
    this.grup = null;
    /** Bohlam + point light, diserahkan ke DayNight. Dikumpulkan saat dibangun,
     *  bukan dengan menyapu scene — PRD BAB 2.4. */
    this.lampu = [];
    /** Mesh untuk raycast MapBuilder. */
    this.objek = [];

    this._kursi = this._hitungLetakKursi();
  }

  /** Posisi dunia tiap kursi, menghadap pusat meja. */
  _hitungLetakKursi() {
    const out = [];
    for (let i = 0; i < this.jumlahKursi; i++) {
      const sudut = this.rotasi + (i / this.jumlahKursi) * Math.PI * 2;
      const x = this.x + Math.sin(sudut) * SPEK.jariLingkar;
      const z = this.z + Math.cos(sudut) * SPEK.jariLingkar;
      // Menghadap pusat: arah dari kursi ke meja.
      out.push({ i, x, z, facing: Math.atan2(this.x - x, this.z - z) });
    }
    return out;
  }

  /** @returns {{i:number,x:number,z:number,facing:number}[]} */
  get kursi() { return this._kursi; }

  /**
   * Radius InteractionVolume di sekitar meja.
   *
   * Kursi ada di 1,02 m dan meja+dingklik memakan ~1,2 m, jadi tambahan 0,9 m
   * membuat hint baru muncul ketika orang sudah berdiri di antara dingklik —
   * terlambat untuk jadi ajakan. 1,35 m memberi kira-kira satu langkah penuh
   * untuk membaca "ada tempat kosong" sebelum sampai.
   */
  get jariInteraksi() { return SPEK.jariLingkar + 1.35; }

  // ── BANGUN 3D ────────────────────────────────────────
  /** @param {THREE.Object3D} induk */
  bangun(induk) {
    const g = new THREE.Group();
    g.position.set(this.x, 0, this.z);

    const catat = (mesh) => { g.add(mesh); this.objek.push(mesh); return mesh; };

    // Daun meja
    const daun = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEK.jariMeja, SPEK.jariMeja, SPEK.tebalDaun, 16),
      MS(PALET.kayu, 0.8),
    );
    daun.position.y = SPEK.tinggiMeja;
    daun.castShadow = true;
    daun.receiveShadow = true;
    catat(daun);

    // Kaki tunggal + tapak, supaya kaki pemain tidak menembus kaki meja
    const kaki = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEK.jariKakiMeja, SPEK.jariKakiMeja * 1.15, SPEK.tinggiMeja, 10),
      MS(PALET.kayuTua, 0.85),
    );
    kaki.position.y = SPEK.tinggiMeja / 2;
    catat(kaki);

    const tapak = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEK.jariMeja * 0.62, SPEK.jariMeja * 0.68, 0.05, 12),
      MS(PALET.kayuTua, 0.9),
    );
    tapak.position.y = 0.025;
    catat(tapak);

    // Dingklik: identik semua, jadi satu InstancedMesh per bagian.
    // Empat kursi = 2 draw call, bukan 8.
    this._pasangDingklik(g);

    // Teko + gelas — yang membuatnya terbaca sebagai "meja nongkrong",
    // bukan sekadar meja kosong.
    this._pasangTeko(g);

    // Lampu gantung kecil: alasan meja ini masih menarik saat magrib.
    this._pasangLampu(g);

    induk.add(g);
    this.grup = g;
    return this;
  }

  /** @param {THREE.Group} g */
  _pasangDingklik(g) {
    const matDudukan = MS(PALET.bambu, 0.85);
    const matKaki = MS(PALET.kayuTua, 0.9);

    // Geometri instance dibuat berukuran satu unit; ukuran sebenarnya
    // ditaruh di skala matriks tiap instance.
    const geoDudukan = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
    const geoKaki = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);

    const imDudukan = new THREE.InstancedMesh(geoDudukan, matDudukan, this.jumlahKursi);
    const imKaki = new THREE.InstancedMesh(geoKaki, matKaki, this.jumlahKursi);
    imDudukan.name = `${this.id}_dudukan`;
    imKaki.name = `${this.id}_kaki`;
    imDudukan.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const skala = new THREE.Vector3();

    this._kursi.forEach((k, i) => {
      // Lokal terhadap grup meja.
      const lx = k.x - this.x;
      const lz = k.z - this.z;

      const d = SPEK.jariDingklik * 2;
      pos.set(lx, SPEK.tinggiDingklik, lz);
      skala.set(d, SPEK.tebalDudukan, d);
      m.compose(pos, q, skala);
      imDudukan.setMatrixAt(i, m);

      pos.set(lx, SPEK.tinggiDingklik / 2, lz);
      skala.set(d * 0.42, SPEK.tinggiDingklik, d * 0.42);
      m.compose(pos, q, skala);
      imKaki.setMatrixAt(i, m);
    });

    imDudukan.instanceMatrix.needsUpdate = true;
    imKaki.instanceMatrix.needsUpdate = true;
    g.add(imDudukan, imKaki);
    this.objek.push(imDudukan, imKaki);
  }

  /** @param {THREE.Group} g */
  _pasangTeko(g) {
    const y = SPEK.tinggiMeja + SPEK.tebalDaun / 2;

    const badan = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), MS(PALET.gerabah, 0.8));
    badan.scale.y = 0.82;
    badan.position.set(0, y + 0.085, 0);
    g.add(badan);

    const tutup = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), MS(PALET.gerabah, 0.8));
    tutup.position.set(0, y + 0.165, 0);
    g.add(tutup);

    const corot = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.13, 7), MS(PALET.gerabah, 0.8));
    corot.position.set(0.115, y + 0.105, 0);
    corot.rotation.z = -Math.PI / 3.1;
    g.add(corot);

    // Gelas kecil, satu per kursi — isyarat bahwa meja ini memang untuk ramai.
    const geoGelas = new THREE.CylinderGeometry(0.5, 0.42, 1, 8);
    const imGelas = new THREE.InstancedMesh(geoGelas, MS(PALET.kain, 0.6), this.jumlahKursi);
    imGelas.name = `${this.id}_gelas`;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    this._kursi.forEach((k, i) => {
      // Digeser ke tepi daun di sisi kursinya.
      const dx = (k.x - this.x) / SPEK.jariLingkar;
      const dz = (k.z - this.z) / SPEK.jariLingkar;
      p.set(dx * SPEK.jariMeja * 0.62, y + 0.045, dz * SPEK.jariMeja * 0.62);
      s.set(0.058, 0.09, 0.058);
      m.compose(p, q, s);
      imGelas.setMatrixAt(i, m);
    });
    imGelas.instanceMatrix.needsUpdate = true;
    g.add(imGelas);
    this.objek.push(badan, imGelas);
  }

  /** @param {THREE.Group} g */
  _pasangLampu(g) {
    const tinggi = 2.25;

    const tiang = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.035, tinggi, 7),
      MS(PALET.kayuTua, 0.9),
    );
    tiang.position.set(SPEK.jariLingkar * 0.95, tinggi / 2, -SPEK.jariLingkar * 0.95);
    g.add(tiang);
    this.objek.push(tiang);

    const bohlam = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 9, 7),
      new THREE.MeshStandardMaterial({
        color: PALET.bohlam,
        emissive: new THREE.Color(PALET.bohlam),
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
    );
    bohlam.position.set(tiang.position.x, tinggi - 0.06, tiang.position.z);
    bohlam.userData.isLampu = true;
    g.add(bohlam);

    const cahaya = new THREE.PointLight(PALET.bohlam, 0, 4.6, 2);
    cahaya.position.copy(bohlam.position);
    cahaya.userData.isLampu = true;
    g.add(cahaya);

    this.lampu.push(bohlam, cahaya);
  }

  // ── KETERISIAN ───────────────────────────────────────
  /**
   * Petakan pemain ke kursi. Deterministik: pasangan (pemain, kursi) yang
   * jaraknya paling dekat menang lebih dulu, seri dipatahkan oleh kunci pemain
   * yang sudah terurut. Dengan begitu setiap klien menghasilkan peta yang sama
   * dari data posisi yang sama, tanpa perlu server memutuskan.
   *
   * @param {{kunci: string, nama: string, x: number, z: number}[]} pemain
   * @returns {({kunci: string, nama: string} | null)[]} per indeks kursi
   */
  hitungKursi(pemain) {
    const hasil = new Array(this.jumlahKursi).fill(null);
    if (!pemain?.length) return hasil;

    const batas = SPEK.jariKursi * SPEK.jariKursi;
    const calon = [];
    for (const p of pemain) {
      for (const k of this._kursi) {
        const dx = p.x - k.x;
        const dz = p.z - k.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= batas) calon.push({ d2, kursi: k.i, p });
      }
    }
    calon.sort((a, b) => (a.d2 - b.d2) || (a.p.kunci < b.p.kunci ? -1 : 1));

    const terpakai = new Set();
    for (const c of calon) {
      if (hasil[c.kursi] || terpakai.has(c.p.kunci)) continue;
      hasil[c.kursi] = { kunci: c.p.kunci, nama: c.p.nama };
      terpakai.add(c.p.kunci);
    }
    return hasil;
  }

  /**
   * Kursi kosong terdekat dari sebuah posisi, supaya "ikut nimbrung" mendudukkan
   * orang di tempat yang masuk akal — bukan di seberang meja.
   *
   * @param {{x:number,z:number}} pos
   * @param {({kunci:string}|null)[]} terisi hasil hitungKursi
   * @returns {{i:number,x:number,z:number,facing:number} | null}
   */
  kursiKosongTerdekat(pos, terisi) {
    let pilih = null;
    let terdekat = Infinity;
    for (const k of this._kursi) {
      if (terisi?.[k.i]) continue;
      const dx = pos.x - k.x;
      const dz = pos.z - k.z;
      const d = dx * dx + dz * dz;
      if (d < terdekat) { terdekat = d; pilih = k; }
    }
    return pilih;
  }

  getLampu() { return this.lampu; }

  dispose() {
    if (!this.grup) return;
    // Tanpa scene.traverse: yang dilepas adalah yang dicatat saat dibangun.
    for (const o of this.objek) {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m?.dispose?.());
    }
    this.grup.parent?.remove(this.grup);
    this.grup = null;
    this.objek = [];
    this.lampu = [];
  }
}

export { SPEK as SPEK_MEJA };
