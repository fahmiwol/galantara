// ═══════════════════════════════════════════════════════
// DayNight.js — Day/night cycle mengikuti timezone user
// ═══════════════════════════════════════════════════════

/**
 * Fase hari khas Nusantara. Dua hal yang membedakannya dari siklus generik:
 *
 * 1. **Senjanya pendek.** Indonesia di khatulistiwa — matahari terbit dan
 *    terbenam nyaris jam yang sama sepanjang tahun (~05:45 dan ~17:45), dan
 *    peralihan terang-gelap berlangsung cepat, bukan berlarut seperti di
 *    lintang tinggi. Magrib karena itu diberi jendela sempit dan perubahan
 *    warna paling tajam di seluruh siklus.
 * 2. **Malamnya tidak kosong.** Yang membuat malam kampung terasa syahdu
 *    bukan gelapnya, tapi kolam-kolam cahaya hangat di dalam gelap itu:
 *    lampu warung, bohlam teras, tiang lampu. Karena itu DayNight juga
 *    menggerakkan `lampGlow`, bukan cuma menggelapkan langit.
 *
 * Untuk melihat fase tertentu tanpa menunggu: `?jam=18.5`.
 *
 * ── Dua bug yang ditemukan dengan MENGUKUR PIKSEL (15 Sep 2026) ──────────
 * 1. Renderer memasang AmbientLight 0,6 yang tidak pernah disentuh siklus
 *    ini. Siang: matahari 1,29 + hemi 0,5 + ambient 0,6 → tanah #a8d5a2
 *    dirender #ffffff (median 12 titik tanah, jam 12 dan 13.30). Sepanjang
 *    07:00–17:00 pulau tampak PUTIH; hijaunya hanya muncul setelah magrib.
 *    Malam: ambient yang sama mengangkat tanah ke hijau terang, jadi kolam
 *    cahaya lampu warung nyaris tak terbaca.
 * 2. Kubah langit diserahkan saat konstruksi, SEBELUM World membangunnya —
 *    referensinya undefined, dan kubah macet di #87ceeb. Palet subuh, jingga
 *    sore, dan biru tinta malam tidak pernah tampil; hanya kabut yang berubah.
 * Keputusan warna tanah di ADR-0011 diukur dari warna MATERIAL. Yang dilihat
 * pemain adalah material × cahaya — instrumen yang benar adalah piksel.
 *
 * ── Kenapa KEYFRAME, bukan if/else per fase ─────────────────────────────
 * Versi lama menghitung tiap fase dengan rumus sendiri, dan batas antarfase
 * tidak dijamin menyambung (pagi berakhir 1,05, siang mulai 1,00). Tabel di
 * bawah diinterpolasi linear antar-jam, jadi setiap nilai kontinu dengan
 * sendirinya — dijaga tests/dayNight.test.mjs.
 */

/**
 * Keadaan cahaya di jam-jam kunci. Semua angka hidup di pipeline TANPA sRGB
 * encoding / tone mapping (lihat Renderer.js). Kalau colour pipeline
 * dinyalakan, angka ini WAJIB dikalibrasi ulang terhadap piksel, bukan
 * dibiarkan.
 *
 * Intensitas DIKALIBRASI, bukan disetel dengan mata: untuk tiap keyframe,
 * pencarian biner atas skala (matahari, hemi, ambien) sampai median kanal
 * hijau 10 titik tanah pulau yang dirender mengenai target. Hasil 15 Sep 2026
 * (Chrome, pipeline tanpa encoding), tanah material #a8d5a2:
 *
 *   00:00 #283b4c  biru tinta          12:30 #addca6  hijau segar
 *   04:30 #223344  subuh               15:00 #a9d296  menghangat
 *   05:30 #3d5258  fajar dingin        17:15 #b7ae57  zaitun keemasan
 *   06:45 #b4b16a  terbit keemasan     18:24 #61555e  ungu senja
 *   10:00 #a5d29c  ≈ warna material    19:45 #283b4a  isya
 *
 * Sebelumnya: 12:00 dan 13:30 #ffffff, 09:00 #ffffeb, 15:30 #f8ffe7.
 * Hemi mengambil warna LANGIT sebagai cahaya isi — keemasan saat jam emas,
 * tinta saat malam. Dengan hemi biru tetap, jam emas dirender hijau kebiruan.
 *
 * @type {ReadonlyArray<{jam:number, langit:number, matahari:{kuat:number, warna:number, x:number, y:number},
 *   hemi:number, ambien:{kuat:number, warna:number}, lampu:number, catatan:string}>}
 */
export const KEYFRAME = Object.freeze([
  { jam: 0, catatan: 'malam — biru tinta, bukan hitam; cahaya bulan dari atas',
    langit: 0x1b2140, matahari: { kuat: 0.31, warna: 0x8fa0e8, x: -6, y: 14 }, hemi: 0.43, ambien: { kuat: 0.235, warna: 0x4a5aa8 }, lampu: 1 },
  { jam: 4.5, catatan: 'subuh — langit belum pecah, udara paling dingin',
    langit: 0x14182e, matahari: { kuat: 0.39, warna: 0x8fa0e8, x: -14, y: 6 }, hemi: 0.55, ambien: { kuat: 0.33, warna: 0x4a5aa8 }, lampu: 1 },
  { jam: 5.5, catatan: 'fajar — ufuk mulai merah muda',
    langit: 0x33405e, matahari: { kuat: 0.58, warna: 0xe0a0b0, x: -18, y: 2 }, hemi: 0.69, ambien: { kuat: 0.4, warna: 0x7a7fb0 }, lampu: 0.55 },
  { jam: 6.75, catatan: 'pagi — matahari terbit menghangatkan rumput, kabut tipis di lembah',
    langit: 0xe8a77a, matahari: { kuat: 0.83, warna: 0xffc896, x: -14, y: 9 }, hemi: 0.455, ambien: { kuat: 0.295, warna: 0xffe2c4 }, lampu: 0 },
  { jam: 10, catatan: 'siang — jernih, hijau paling segar',
    langit: 0x9fc6de, matahari: { kuat: 0.656, warna: 0xfff1d6, x: -6, y: 17 }, hemi: 0.356, ambien: { kuat: 0.244, warna: 0xfff4e0 }, lampu: 0 },
  { jam: 12.5, catatan: 'tengah hari — matahari nyaris tegak, udara berkabut panas',
    langit: 0xb4cfdd, matahari: { kuat: 0.624, warna: 0xfff8ea, x: 0, y: 22 }, hemi: 0.347, ambien: { kuat: 0.243, warna: 0xfff6e8 }, lampu: 0 },
  { jam: 15, catatan: 'sore — bayangan mulai memanjang, semuanya menghangat',
    langit: 0xb4cfdd, matahari: { kuat: 0.671, warna: 0xffecc4, x: 6, y: 15 }, hemi: 0.365, ambien: { kuat: 0.249, warna: 0xfff0da }, lampu: 0 },
  { jam: 17.25, catatan: 'jam emas — jam bermain di halaman sebelum dipanggil pulang',
    // Matahari rendah (sudut datang ±22°) mengirim sedikit cahaya ke tanah, jadi
    // kuatnya DINAIKKAN supaya jam emas benar-benar keemasan, dan hemi
    // diturunkan supaya cahaya datang dari satu arah hangat, bukan rata.
    langit: 0xf2c48a, matahari: { kuat: 1.38, warna: 0xffb866, x: 14, y: 7 }, hemi: 0.3, ambien: { kuat: 0.3, warna: 0xffc890 }, lampu: 0.2 },
  { jam: 18.4, catatan: 'magrib habis — jingga ke ungu dalam waktu singkat, lampu menyala',
    langit: 0x6d4a6b, matahari: { kuat: 0.6, warna: 0xe07a8a, x: 18, y: 0.5 }, hemi: 0.715, ambien: { kuat: 0.477, warna: 0x9a70a0 }, lampu: 0.9 },
  { jam: 19.75, catatan: 'isya — langit biru tinta, lampu sudah berkuasa',
    langit: 0x232a4a, matahari: { kuat: 0.294, warna: 0x8fa0e8, x: -6, y: 14 }, hemi: 0.405, ambien: { kuat: 0.221, warna: 0x4a5aa8 }, lampu: 1 },
  { jam: 24, catatan: 'sama dengan jam 0',
    langit: 0x1b2140, matahari: { kuat: 0.31, warna: 0x8fa0e8, x: -6, y: 14 }, hemi: 0.43, ambien: { kuat: 0.235, warna: 0x4a5aa8 }, lampu: 1 },
]);

function lerp(a, b, t) { return a + (b - a) * t; }

/** Interpolasi warna hex per kanal. */
export function lerpWarna(from, to, t) {
  const fr = (from >> 16) & 0xff, fg = (from >> 8) & 0xff, fb = from & 0xff;
  const tr = (to >> 16) & 0xff, tg = (to >> 8) & 0xff, tb = to & 0xff;
  return (Math.round(lerp(fr, tr, t)) << 16) | (Math.round(lerp(fg, tg, t)) << 8) | Math.round(lerp(fb, tb, t));
}

/**
 * Keadaan cahaya untuk sebuah jam (0–24, boleh pecahan). Murni, jadi bisa
 * diuji tanpa WebGL.
 * @param {number} jam
 */
export function keadaanCahaya(jam) {
  const h = ((jam % 24) + 24) % 24;
  let i = 0;
  while (i < KEYFRAME.length - 2 && KEYFRAME[i + 1].jam <= h) i++;
  const a = KEYFRAME[i];
  const b = KEYFRAME[i + 1];
  const t = (h - a.jam) / (b.jam - a.jam);
  return {
    langit: lerpWarna(a.langit, b.langit, t),
    matahari: {
      kuat: lerp(a.matahari.kuat, b.matahari.kuat, t),
      warna: lerpWarna(a.matahari.warna, b.matahari.warna, t),
      x: lerp(a.matahari.x, b.matahari.x, t),
      y: lerp(a.matahari.y, b.matahari.y, t),
    },
    hemi: lerp(a.hemi, b.hemi, t),
    ambien: { kuat: lerp(a.ambien.kuat, b.ambien.kuat, t), warna: lerpWarna(a.ambien.warna, b.ambien.warna, t) },
    lampu: lerp(a.lampu, b.lampu, t),
  };
}

export class DayNight {
  constructor(renderer) {
    this.renderer = renderer; // { sun, hemi, ambient, renderer, skyDome }
    this.lampGlow = 0;        // 0 = padam, 1 = menyala penuh
    this._lampu = [];         // bohlam emissive yang ikut dinyalakan
  }

  /**
   * Terima daftar lampu yang sudah dikumpulkan World saat prop dibangun.
   * Sengaja TIDAK menyapu scene: PRD BAB 2.4 melarang `scene.traverse`.
   */
  pakaiLampu(daftar) {
    this._lampu = Array.isArray(daftar) ? daftar : [];
    return this._lampu.length;
  }

  /**
   * Terima kubah langit SETELAH World membangunnya. Diserahkan saat konstruksi,
   * kubahnya belum ada — dan langit macet di satu warna selamanya.
   */
  pakaiLangit(kubah) {
    this.renderer.skyDome = kubah ?? null;
    return !!kubah;
  }

  // Dipanggil setiap frame — t = elapsed seconds
  update(t) {
    const paksa = typeof location !== 'undefined'
      && new URLSearchParams(location.search).get('jam');
    const hour = paksa !== null && paksa !== undefined && paksa !== ''
      && Number.isFinite(Number(paksa))
      ? Number(paksa)
      : new Date().getHours() + new Date().getMinutes() / 60;
    this._applyTime(hour);
  }

  _applyTime(hour) {
    const { sun, hemi, ambient, renderer: r, skyDome } = this.renderer;
    const k = keadaanCahaya(hour);
    const lampGlow = k.lampu;

    this.lampGlow = lampGlow;
    for (const lampu of this._lampu) {
      // Sebuah lampu boleh menyatakan dirinya lebih redup dari yang lain lewat
      // userData.kuatRelatif. Itu yang membuat komposisi cahaya mungkin —
      // satu pusat terang dengan pendamping yang jauh lebih lemah membaca
      // sebagai tempat yang hangat; semua lampu sama terang membaca sebagai
      // penerangan umum. Bawaannya 1, jadi lampu lama tidak berubah.
      const kuat = lampu.userData?.kuatRelatif ?? 1;
      if (lampu.isLight) {
        lampu.intensity = lampGlow * 1.6 * kuat;
      } else if (lampu.material) {
        // Bohlam padam pun tetap terlihat sebagai benda, jadi sisakan sedikit.
        lampu.material.emissiveIntensity = (0.12 + lampGlow * 1.5) * kuat;
      }
    }

    // Apply
    if (sun) {
      sun.intensity = k.matahari.kuat;
      sun.color.setHex(k.matahari.warna);
      sun.position.set(k.matahari.x, k.matahari.y, 10);
    }
    if (hemi) {
      hemi.intensity = k.hemi;
      // Cahaya isi dari langit berwarna langit.
      hemi.color.setHex(k.langit);
    }
    if (ambient) {
      ambient.intensity = k.ambien.kuat;
      ambient.color.setHex(k.ambien.warna);
    }
    if (r?.renderer) r.renderer.setClearColor(k.langit, 1);
    if (skyDome) skyDome.material.color.setHex(k.langit);

    // Sync fog color ke sky
    if (r?.scene?.fog) r.scene.fog.color.setHex(k.langit);

    // Stars — muncul saat gelap
    const isNight = (hour < 5 || hour >= 19);
    if (this._stars) this._stars.visible = isNight;
  }

  // Build bintang-bintang (dipanggil sekali)
  buildStars(scene) {
    const count = 300;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.5; // upper hemisphere only
      const r     = 120;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true }),
    );
    this._stars.visible = false;
    scene.add(this._stars);
    return this;
  }

  // Lerp antara dua hex colors (dipertahankan untuk pemanggil lama)
  _lerp(from, to, t) {
    return lerpWarna(from, to, t);
  }
}
