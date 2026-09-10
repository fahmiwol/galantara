#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// tanya-gpt.mjs — minta pendapat kedua ke OpenAI, dari dalam repo
//
// KENAPA ADA: Codex CLI tidak bisa dipakai di mesin ini (akun ChatGPT hanya
// punya gpt-5.6-sol, dan model itu menuntut CLI yang lebih baru daripada rilis
// npm terakhir 0.153.4). API langsung TIDAK kena batasan itu — model yang sama
// jalan normal. Alat ini jalur yang bekerja.
//
// KUNCI TIDAK PERNAH MASUK BERKAS INI. Ia dibaca dari env OPENAI_API_KEY, dan
// tidak pernah dicetak ke mana pun:
//
//   export OPENAI_API_KEY=$(tr -d ' \r\n' < "C:/omiga/.openAI_tokens.txt")
//
// PEMAKAIAN
//   node tools/tanya-gpt.mjs --tanya "..." [pilihan]
//   node tools/tanya-gpt.mjs --peran seni --gambar tmp/render.png --tanya "..."
//
// PILIHAN
//   --tanya <teks>       Pertanyaannya. Wajib.
//   --peran <nama>       seni | kode | desain | polos   (default: polos)
//   --berkas <path>      Sertakan isi berkas repo. Boleh diulang.
//   --gambar <path>      Sertakan gambar (PNG/JPG). Boleh diulang.
//   --model <id>         Default gpt-5.6-sol.
//   --nalar <tingkat>    minimal | low | medium | high   (default: medium)
//   --maks <n>           Batas token jawaban. Default 14000.
//   --simpan <path>      Tulis jawabannya ke berkas juga.
//
// CATATAN YANG MENYELAMATKAN WAKTU: gpt-5.6-sol model PENALARAN. Batas token
// yang kecil habis seluruhnya untuk berpikir dan jawabannya keluar KOSONG
// tanpa pesan error. Karena itu default --maks di sini 14000, bukan 3000.
// ═══════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';

const PERAN = {
  polos: '',

  seni: `Kamu art director yang paham betul rasa visual Indonesia — bukan turis yang menempelkan batik ke mana-mana.
Arah proyek ini: Nusantara syahdu, tahun 90-an sampai awal 2000-an, low-poly stylized, kamera isometrik, palet hangat.
Nilai yang dipakai: sederhana tapi spesifik, hangat tapi tidak manis, sepi tapi tidak kosong.
Kalau sesuatu terlihat generik atau seperti aset toko, katakan dengan jujur dan sebutkan APA yang membuatnya generik.
Beri usulan yang bisa dikerjakan dan diukur — bentuk, proporsi, warna dalam hex, jumlah elemen — bukan kata sifat.`,

  desain: `Kamu game designer yang paham budaya berkumpul orang Indonesia: warung, alun-alun, pos ronda, angkringan.
Nilai yang dipakai: satu aksi yang jelas lebih baik daripada lima yang samar; orang harus tahu kapan boleh ikut nimbrung.
Beri usulan konkret yang bisa diukur, bukan kata sifat. Tolak usulanmu sendiri kalau ia menambah beban tanpa menambah alasan orang bertahan.`,

  kode: `Kamu engineer senior. Cari cacat NYATA: bug, kebocoran memori, kasus tepi, race.
Sebutkan berkas dan nama fungsi. Kalau tidak ada yang serius, katakan begitu — jangan mengarang cacat demi terlihat teliti.`,
};

const EKOR = `

Jawab dalam Bahasa Indonesia, ringkas dan padat. Kalau kamu tidak punya dasarnya, tulis "belum punya dasarnya" — jangan mengarang.`;

function baca(argv) {
  const o = { berkas: [], gambar: [], peran: 'polos', model: 'gpt-5.6-sol', nalar: 'medium', maks: 14000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const nilai = () => argv[++i];
    if (a === '--tanya') o.tanya = nilai();
    else if (a === '--peran') o.peran = nilai();
    else if (a === '--berkas') o.berkas.push(nilai());
    else if (a === '--gambar') o.gambar.push(nilai());
    else if (a === '--model') o.model = nilai();
    else if (a === '--nalar') o.nalar = nilai();
    else if (a === '--maks') o.maks = Number(nilai());
    else if (a === '--simpan') o.simpan = nilai();
    else { console.error(`Pilihan tidak dikenal: ${a}`); process.exit(2); }
  }
  return o;
}

const JENIS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function gambarJadiBagian(p) {
  const ext = path.extname(p).toLowerCase();
  const mime = JENIS[ext];
  if (!mime) throw new Error(`Jenis gambar tidak didukung: ${ext}`);
  const b64 = fs.readFileSync(p).toString('base64');
  return { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } };
}

const o = baca(process.argv);
if (!o.tanya) {
  console.error('Butuh --tanya "...". Lihat komentar di atas berkas ini.');
  process.exit(2);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY belum ada di environment.\n' +
    'Jalankan dulu: export OPENAI_API_KEY=$(tr -d \' \\r\\n\' < "C:/omiga/.openAI_tokens.txt")');
  process.exit(2);
}
if (!(o.peran in PERAN)) {
  console.error(`Peran tidak dikenal: ${o.peran}. Pilih: ${Object.keys(PERAN).join(', ')}`);
  process.exit(2);
}

let teks = (PERAN[o.peran] ? PERAN[o.peran] + '\n\n' : '') + o.tanya;

for (const f of o.berkas) {
  let isi;
  try { isi = fs.readFileSync(f, 'utf8'); }
  catch { console.error(`Tidak bisa membaca ${f} — dihentikan, bukan dilewati diam-diam.`); process.exit(1); }
  teks += `\n\n### ${f}\n\`\`\`\n${isi}\n\`\`\``;
}
teks += EKOR;

const bagian = [{ type: 'text', text: teks }];
for (const g of o.gambar) {
  try { bagian.push(gambarJadiBagian(g)); }
  catch (e) { console.error(`Gambar gagal: ${e.message}`); process.exit(1); }
}

const badan = {
  model: o.model,
  messages: [{ role: 'user', content: o.gambar.length ? bagian : teks }],
  max_completion_tokens: o.maks,
};
if (o.nalar) badan.reasoning_effort = o.nalar;

const r = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify(badan),
});

const d = await r.json();
if (d.error) { console.error('ERROR:', d.error.message); process.exit(1); }

const jawab = d.choices?.[0]?.message?.content ?? '';
if (!jawab.trim()) {
  console.error('Jawaban KOSONG. Hampir selalu berarti seluruh anggaran token habis untuk penalaran —');
  console.error(`naikkan --maks (sekarang ${o.maks}) atau turunkan --nalar. Pemakaian:`, JSON.stringify(d.usage));
  process.exit(1);
}

console.log(jawab);
console.log('\n──────── pemakaian ────────');
console.log(`model ${d.model} · prompt ${d.usage?.prompt_tokens} · jawaban ${d.usage?.completion_tokens}` +
  ` (penalaran ${d.usage?.completion_tokens_details?.reasoning_tokens ?? '?'})`);

if (o.simpan) {
  fs.mkdirSync(path.dirname(o.simpan), { recursive: true });
  fs.writeFileSync(o.simpan, jawab, 'utf8');
  console.log(`tersimpan: ${o.simpan}`);
}
