#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// tools/mutasi-multiplayer.mjs — bukti bahwa uji multiplayer MENANGKAP
//
// Setiap penjaga server (ADR-0023) dan setiap perubahan klien pasangannya dicabut
// satu per satu di SALINAN repo, lalu uji multiplayer dijalankan di salinan itu.
// Mutasi yang tetap hijau = penjaga yang tidak dijaga uji mana pun.
//
// Kontrol tanpa mutasi dijalankan dulu dan HARUS hijau; kalau tidak, merahnya
// mutasi tidak membuktikan apa-apa.
//
//   node tools/mutasi-multiplayer.mjs           # semua mutasi
//   node tools/mutasi-multiplayer.mjs chat rtc  # yang namanya memuat kata itu
//
// Butuh dependensi server: npm ci --prefix galantara-server
// ═══════════════════════════════════════════════════════

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const UJI = [
  'tests/penjaga.test.mjs',
  'tests/serverMultiplayer.test.mjs',
  'tests/serverParitas.test.mjs',
  'tests/klienMultiplayer.test.mjs',
];

/** [nama, berkas, teks asli, pengganti] atau [nama, berkas, [[asli, pengganti], …]]
 *  untuk penjaga berlapis. Setiap teks asli harus muncul TEPAT sekali. */
const MUTASI = [
  // ── identitas ──
  ['id publik = socket.id', 'galantara-server/index.js',
    'idPublik: idPublikBaru(),', 'idPublik: socket.id,'],
  ['id publik = id klaim klien', 'galantara-server/index.js',
    "    const lama = pemainSaya();\n    if (lama?.room === room) {",
    "    if (typeof data.id === 'string') d.idPublik = data.id;\n    const lama = pemainSaya();\n    if (lama?.room === room) {"],
  ['tampilan membocorkan sub akun', 'galantara-server/index.js',
    'facing: bulat2(pos.facing), guest: p.tamu };', 'facing: bulat2(pos.facing), guest: p.tamu, id: p.sub };'],
  ['tamu = klaim klien', 'galantara-server/index.js',
    '    // Nama dan warna tampil diputuskan sekali per koneksi.',
    "    if (data.guest === false && !d.sub) d.sub = 'klaim-klien';"],
  ['nama warga dari payload', 'galantara-server/index.js',
    'd.nama = d.sub ? d.namaAkun :', 'd.nama = d.sub ? (data.name || d.namaAkun) :'],
  ['nama tamu bebas', 'galantara-server/penjaga.cjs',
    'if (typeof usulan === \'string\' && POLA_NAMA_TAMU.test(usulan)) return usulan;',
    'if (typeof usulan === \'string\') return usulan;'],
  ['hantu: tab hidup ikut dibuang', 'galantara-server/index.js',
    'if (p.sub === sub && p.terputus && p.idPublik !== kecuali)', 'if (p.sub === sub && p.idPublik !== kecuali)'],
  // ── token ──
  ['HS256 tanpa periksa tanda tangan', 'galantara-server/identitas.cjs',
    'sah = hitung.length === t.tanda.length && crypto.timingSafeEqual(hitung, t.tanda);', 'sah = true;'],
  ['JWKS tanpa periksa tanda tangan', 'galantara-server/identitas.cjs',
    'sah = crypto.verify(\'sha256\', t.data, kunciVerif, t.tanda);', 'sah = true;'],
  // Dua lapis: tanpa rahasia, createHmac(null) melempar — cabut keduanya.
  ['HS256 diterima walau hanya JWKS', 'galantara-server/identitas.cjs', [
    ["if (alg === 'HS256' && rahasia) {", "if (alg === 'HS256') {"],
    ["crypto.createHmac('sha256', rahasia)", "crypto.createHmac('sha256', rahasia ?? '')"]]],
  ['token kedaluwarsa diterima', 'galantara-server/identitas.cjs',
    "if (klaim.exp + LONGGAR_DETIK <= sekarangDetik) return 'token-kedaluwarsa';", ''],
  ['role selain authenticated diterima', 'galantara-server/identitas.cjs',
    "if (klaim.role !== 'authenticated') return 'token-tidak-sah';", ''],
  ['aud tidak diperiksa', 'galantara-server/identitas.cjs',
    "if (!aud.includes('authenticated')) return 'token-tidak-sah';", ''],
  ['akun anonim = warga', 'galantara-server/identitas.cjs',
    "if (klaim.is_anonymous === true) return 'akun-anonim';", ''],
  ['iss tidak diperiksa', 'galantara-server/identitas.cjs',
    "if (penerbit && klaim.iss !== penerbit) return 'token-tidak-sah';", ''],
  ['kid acak memicu ambil JWKS tiap kali', 'galantara-server/identitas.cjs',
    'if (sekarang - waktuCoba > JWKS_ULANG_MIN_MS) await ambilJwks();', 'await ambilJwks();'],
  // ── gerbang tamu ──
  ['tamu boleh chat', 'galantara-server/index.js',
    "if (p.tamu) { tolak('chat', 'tamu', pesanTamu()); return; }", ''],
  ['tamu boleh kirim sinyal voice', 'galantara-server/index.js',
    'if (p.tamu) { tolak(jenis, \'tamu\', pesanTamu()); return; }', ''],
  ['sinyal voice ke tamu / room lain', 'galantara-server/index.js',
    'if (!tujuan || tujuan === p || tujuan.tamu || tujuan.terputus) {', 'if (!tujuan) {'],
  // ── laju ──
  ['gerak tanpa batas laju', 'galantara-server/index.js',
    'if (!d.laju.ember.move.ambil(now)) { langgar(); return; }', ''],
  ['chat tanpa batas laju', 'galantara-server/index.js',
    'const bolehLaju = d.laju.ember.chat.ambil(sekarang());', 'const bolehLaju = true;'],
  ['pelanggar tidak pernah diputus', 'galantara-server/penjaga.cjs',
    'return this.jumlah > PELANGGARAN.batas;', 'return false;'],
  ['siaran gerak tanpa jarak minimum', 'galantara-server/index.js',
    'if (now - p.terakhirSiar < GERAK.siarMinMs - 2) { tandaiKotor(p); return; }', ''],
  // ── gerak ──
  ['teleport diterima seketika', 'galantara-server/penjaga.cjs',
    'if (d <= this.jatah) {', 'if (true) {'],
  ['tanpa batas dunia', 'galantara-server/penjaga.cjs',
    'if (d <= jari) return { x, z };', 'return { x, z };'],
  ['koordinat bukan angka diterima', 'galantara-server/penjaga.cjs',
    'if (!angka(x) || !angka(z)) return null;', 'if (x == null || z == null) return null;'],
  ['koordinat raksasa diterima', 'galantara-server/penjaga.cjs',
    'if (Math.abs(x) > GERAK.mutlakMaks || Math.abs(z) > GERAK.mutlakMaks) return null;', ''],
  // ── input ──
  ['room bebas', 'galantara-server/index.js',
    'if (!ruangDikenal(room)) {', "if (typeof room !== 'string') {"],
  ['sync membaca room dari payload', 'galantara-server/index.js',
    "socket.on('sync', () => {", "socket.on('sync', (x) => {\n    if (!d.room && typeof x?.room === 'string') { socket.emit('players', daftarLain(x.room, null)); return; }"],
  ['pesan kepanjangan diterima', 'galantara-server/penjaga.cjs',
    "if (Array.from(teks).length > BATAS_TEKS.pesan) return { ok: false, alasan: 'terlalu-panjang' };", ''],
  ['karakter tak terlihat lolos', 'galantara-server/penjaga.cjs',
    ".replace(TAK_TERLIHAT, '')", ''],
  ['SDP diteruskan apa adanya', 'galantara-server/penjaga.cjs',
    'return { type: tipe, sdp: v.sdp };', 'return v;'],
  ['batas ukuran pesan socket.io bawaan (1 MB)', 'galantara-server/index.js',
    'maxHttpBufferSize: 64 * 1024,', ''],
  ['warna sembarang', 'galantara-server/penjaga.cjs',
    'return Number.isInteger(c) && c >= 0 && c <= 0xffffff ? c : null;', 'return c ?? null;'],
  // ── klien ──
  ['klien: id = socket.id walau ada welcome', 'src/multiplayer/Socket.js',
    'get id() { return this._server?.id ?? this._socket?.id ?? null; }', 'get id() { return this._socket?.id ?? null; }'],
  ['klien: tamu = klaim sendiri', 'src/multiplayer/Socket.js',
    'get isGuest() { return this._server ? this._server.guest : this._guest; }', 'get isGuest() { return this._guest; }'],
  ['klien: token tidak dikirim', 'src/multiplayer/Socket.js',
    'cb(typeof token === \'string\' && token ? { token } : {});', 'cb({});'],
  ['klien: voice memanggil tamu', 'src/multiplayer/VoiceChat.js',
    'if (!idSaya || !idLawan || idSaya === idLawan || lawan.guest) return false;', 'if (!idSaya || !idLawan || idSaya === idLawan) return false;'],
  ['klien: chat lewat innerHTML', 'src/ui/Chat.js',
    "cn.textContent = String(name ?? '');", "cn.innerHTML = String(name ?? '');"],
];

function salinRepo() {
  const tujuan = mkdtempSync(path.join(tmpdir(), 'mutasi-mp-'));
  cpSync(AKAR, tujuan, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(AKAR, src);
      return !(rel === '.git' || rel.startsWith(`.git${path.sep}`) || rel.split(path.sep).includes('node_modules'));
    },
  });
  for (const nm of ['node_modules', 'galantara-server/node_modules']) {
    if (existsSync(path.join(AKAR, nm))) symlinkSync(path.join(AKAR, nm), path.join(tujuan, nm), 'dir');
  }
  return tujuan;
}

function jalankanUji(dir) {
  const r = spawnSync(process.execPath,
    ['--experimental-default-type=module', '--test', '--test-timeout=60000', ...UJI],
    { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const angka = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, 'm')) ?? [])[1] ?? NaN);
  const gagal = [...r.stdout.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]);
  return { kode: r.status, lulus: angka('pass'), gagal: angka('fail'), lewat: angka('skipped'), namaGagal: gagal };
}

const saring = process.argv.slice(2).map((s) => s.toLowerCase());
const dipilih = saring.length ? MUTASI.filter(([n]) => saring.some((s) => n.toLowerCase().includes(s))) : MUTASI;
const dir = salinRepo();
try {
  const kontrol = jalankanUji(dir);
  console.log(`Kontrol tanpa mutasi: ${kontrol.lulus} lulus, ${kontrol.gagal} gagal, ${kontrol.lewat} dilewati`);
  if (kontrol.kode !== 0 || !(kontrol.lulus > 0) || kontrol.lewat > 0) {
    console.error('!! Kontrol harus hijau tanpa uji yang dilewati (pasang: npm ci --prefix galantara-server).');
    process.exit(2);
  }
  let lolos = 0;
  for (const [nama, berkas, asli, ganti] of dipilih) {
    const p = path.join(dir, berkas);
    const isi = readFileSync(p, 'utf8');
    const pasangan = Array.isArray(asli) ? asli : [[asli, ganti]];
    const usang = pasangan.find(([a]) => isi.split(a).length - 1 !== 1);
    if (usang) {
      console.log(`?? ${nama}: teks asli tidak muncul tepat sekali di ${berkas} — mutasi usang, perbarui daftar`);
      lolos += 1;
      continue;
    }
    writeFileSync(p, pasangan.reduce((t, [a, g]) => t.replace(a, g), isi));
    try {
      const h = jalankanUji(dir);
      if (h.kode === 0) {
        lolos += 1;
        console.log(`HIJAU  ${nama}  ← tidak ada uji yang menangkap`);
      } else {
        console.log(`merah  ${nama}  (${h.gagal} gagal: ${h.namaGagal.slice(0, 2).join(' | ')})`);
      }
    } finally {
      writeFileSync(p, isi);
    }
  }
  console.log(`\n${dipilih.length - lolos}/${dipilih.length} mutasi tertangkap.`);
  process.exitCode = lolos ? 1 : 0;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
