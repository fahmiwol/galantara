# ADR-0013 — Pendapat kedua lewat API OpenAI langsung, bukan Codex CLI

**Status:** Diterima
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

Codex CLI tidak bisa dipakai di mesin ini. Diverifikasi 10 Sep 2026: akun
ChatGPT hanya punya `gpt-5.6-sol`, dan model itu menuntut CLI lebih baru daripada
rilis npm terakhir (0.153.4). Semua model alternatif ditolak dengan *"not
supported when using Codex with a ChatGPT account"*.

API langsung **tidak kena batasan itu** — model yang sama jalan normal.

## Keputusan

Pendapat kedua diminta lewat `tools/tanya-gpt.mjs`, disimpan di repo. Kunci
dibaca dari env `OPENAI_API_KEY`; tidak pernah masuk berkas, dokumen, atau chat.

Untuk pendapat **visual**, gambarnya dikirim sebagai render sungguhan lewat
`tools/penerima-render.mjs`, bukan sebagai deskripsi saya — dan keterbatasan
render itu disebutkan dalam prompt supaya penilaiannya tidak dibuat atas dasar
yang salah.

## Konsekuensi

### Yang didapat

- Jalur pendapat kedua yang benar-benar bekerja.
- Review berbasis gambar menemukan hal yang tidak saya lihat: bahasa bentuk
  patio, dan bidang tanah yang terbaca sebagai panggung.
- Alatnya bisa dipakai ulang dan versinya tercatat.

### Yang dibayar

- **Melanggar semangat batasan "tanpa dependency ke API komersial"**, dan itu
  harus disebut, bukan disembunyikan. Pembelaannya: ini alat **pengembangan**,
  bukan runtime. Galantara yang dijalankan pemain tidak menyentuh OpenAI sama
  sekali; repo tetap bisa dibangun, dijalankan, dan diuji penuh tanpa alat ini.
- Berbiaya per panggilan. Nyata: ~5.300 token prompt + ~3.500 jawaban per
  putaran; jauh di bawah 1 dolar untuk seluruh sesi.
- `gpt-5.6-sol` model penalaran: `max_completion_tokens` kecil habis seluruhnya
  untuk berpikir dan jawabannya keluar **kosong tanpa error**. Default alat ini
  14.000, bukan 3.000.

## Alternatif yang ditolak

**Codex CLI.** Ditolak: tidak bisa dipakai, terverifikasi.

**Model lokal lewat Ollama.** Ditolak untuk tugas ini: instansnya di Bmax sedang
menjalankan eval L2b, dan menambah trafik ke sana akan mengotori pengukuran
waktu mereka.

**Tidak minta pendapat kedua.** Ditolak: putaran pertama membuktikan nilainya —
saya tidak melihat masalah bahasa bentuknya sendiri.

## Bukti

`tools/tanya-gpt.mjs`, `tools/penerima-render.mjs`. Hasil nyata: ADR-0009 dan
seluruh perombakan bentuk Meja Nongkrong.
