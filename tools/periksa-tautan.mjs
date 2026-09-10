#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// periksa-tautan.mjs — pastikan tautan relatif di Markdown menunjuk sesuatu
//
// KENAPA ADA: repo ini punya README, PAPER, BACKLOG, LIVING_LOG, 14 ADR, dan
// belasan dokumen lain yang saling menunjuk. Tautan yang rusak di dokumen
// TIDAK menghasilkan error apa pun — ia cuma membuat pembaca buntu, dan
// pembaca yang buntu tidak melapor, ia pergi.
//
// Ini kelas kesalahan yang sama dengan "komentar kode yang bohong": tidak ada
// yang gagal, jadi tidak ada yang memeriksanya.
//
// PEMAKAIAN
//   node tools/periksa-tautan.mjs [--diam]
//
// Keluar dengan kode 1 kalau ada tautan rusak, supaya bisa dipakai di CI nanti.
// Tautan http(s) dan jangkar murni (#bagian) sengaja TIDAK diperiksa — yang
// pertama butuh jaringan, yang kedua butuh mengurai heading dan belum sepadan.
// ═══════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';

const DIAM = process.argv.includes('--diam');
const ABAIKAN = new Set(['node_modules', '.git', 'tmp', 'vendor', '.local', '.cursor']);

function kumpulkan(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ABAIKAN.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) kumpulkan(p, keluar);
    else if (e.name.toLowerCase().endsWith('.md')) keluar.push(p);
  }
  return keluar;
}

// [teks](tujuan) — tujuan tidak boleh mengandung spasi atau tanda kurung.
const TAUTAN = /\[[^\]]*\]\(([^)\s]+)\)/g;

const berkas = kumpulkan('.');
let diperiksa = 0;
const rusak = [];

for (const f of berkas) {
  const isi = fs.readFileSync(f, 'utf8');
  const baris = isi.split('\n');
  for (let i = 0; i < baris.length; i++) {
    for (const m of baris[i].matchAll(TAUTAN)) {
      const mentah = m[1];
      if (/^(https?:|mailto:|#)/i.test(mentah)) continue;
      diperiksa++;
      // Buang jangkar: dokumen.md#bagian → dokumen.md
      const tujuan = decodeURIComponent(mentah.split('#')[0]);
      if (!tujuan) continue;
      const abs = tujuan.startsWith('/')
        ? path.join('.', tujuan)
        : path.resolve(path.dirname(f), tujuan);
      if (!fs.existsSync(abs)) {
        rusak.push({ dari: f.replace(/\\/g, '/'), baris: i + 1, tujuan: mentah });
      }
    }
  }
}

if (!DIAM) {
  console.log(`${berkas.length} berkas Markdown, ${diperiksa} tautan relatif diperiksa.`);
}

if (rusak.length) {
  console.error(`\n${rusak.length} TAUTAN RUSAK:\n`);
  for (const r of rusak) console.error(`  ${r.dari}:${r.baris}  →  ${r.tujuan}`);
  console.error('');
  process.exit(1);
}

if (!DIAM) console.log('Semua tautan relatif menunjuk berkas yang ada.');
