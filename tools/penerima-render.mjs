#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// penerima-render.mjs — terima tangkapan layar dari halaman, tulis ke berkas
//
// KENAPA ADA: untuk minta pendapat visual ke GPT, gambarnya harus ada sebagai
// BERKAS. Tiga jalur lain tidak bisa dipakai:
//   - `canvas.toDataURL()` pada renderer aplikasi mengembalikan "data:,"
//     kosong, karena WebGL membuang drawing buffer setelah compositing
//     (preserveDrawingBuffer: false). Render ke WebGLRenderer sementara
//     dengan preserveDrawingBuffer: true dulu.
//   - Unduhan lewat <a download> mati di dalam sandbox pratinjau.
//   - Menarik dataURL lewat hasil tool berarti ~200 ribu karakter menyeberang
//     percakapan. Boros dan tidak perlu.
//
// PEMAKAIAN
//   node tools/penerima-render.mjs [--port 4111] [--dir tmp/render]
//
// Lalu dari halaman:
//   await fetch('http://localhost:4111/simpan', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ nama: 'meja.png', data: dataUrl }),
//   });
//
// Berhenti sendiri setelah --sekali berkas diterima (default: tidak berhenti).
// ═══════════════════════════════════════════════════════

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};

const PORT = Number(arg('--port', 4111));
const DIR = arg('--dir', 'tmp/render');
const SEKALI = Number(arg('--sekali', 0));

fs.mkdirSync(DIR, { recursive: true });
let diterima = 0;

const server = http.createServer((req, res) => {
  // Halaman disajikan dari origin lain (localhost:4000), jadi CORS wajib.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST' || req.url !== '/simpan') { res.writeHead(404).end('bukan /simpan'); return; }

  let badan = '';
  req.on('data', (c) => {
    badan += c;
    // Pagar: satu tangkapan layar wajar di bawah 20 MB.
    if (badan.length > 20e6) { req.destroy(); }
  });
  req.on('end', () => {
    try {
      const { nama, data } = JSON.parse(badan);
      const cocok = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(data || '');
      if (!cocok) throw new Error('bukan dataURL gambar');

      // Nama berkas hanya boleh basename — jangan biarkan halaman menulis
      // ke mana pun di disk.
      const aman = path.basename(String(nama || 'render.png')).replace(/[^\w.-]/g, '_');
      const keluar = path.join(DIR, aman);
      fs.writeFileSync(keluar, Buffer.from(cocok[2], 'base64'));

      const kb = Math.round(fs.statSync(keluar).size / 1024);
      console.log(`tersimpan: ${keluar} (${kb} KB)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: keluar, kb }));

      if (SEKALI && ++diterima >= SEKALI) {
        console.log('selesai, berhenti.');
        server.close(() => process.exit(0));
      }
    } catch (e) {
      console.error('gagal:', e.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`penerima render di http://localhost:${PORT}/simpan → ${DIR}`);
});
