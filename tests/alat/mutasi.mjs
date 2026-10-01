#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// tests/alat/mutasi.mjs — prove that the M1 world-client safeguards are really tested.
//
// For each entry: remove or bend ONE safeguard in the working tree, run the tests that should
// catch it, expect red, restore the file byte for byte. A control run without any mutation
// must be green first; otherwise every "red" below would prove nothing.
//
//   node tests/alat/mutasi.mjs            all mutations
//   node tests/alat/mutasi.mjs proxy      only ids/safeguards containing "proxy"
//
// Not part of `npm test` (it edits files in place). Run it on a clean tree.
// ═══════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const APP = join(import.meta.dirname, '..', '..');
const ROOT = join(APP, '..', '..');
const TES = (...f) => f.map((x) => (x.startsWith('/') ? x : join(APP, 'tests', x)));
const TES_AKAR = (...f) => f.map((x) => join(ROOT, 'tools', 'test', x));

export const MUTASI = [
  // Vendored contract parity (root test).
  { id: 'vendor-byte', pengaman: 'paritas vendor', berkas: 'vendor/party-contract/party.js', cari: 'MAX_SLOTS = 4', ganti: 'MAX_SLOTS = 5', tes: TES_AKAR('party-vendor.test.mjs') },
  // PartyKlien / apiRuntime.
  { id: 'party-validasi', pengaman: 'validasi party di klien', berkas: 'src/party/PartyKlien.js', cari: 'if (!vonis.ok) {', ganti: 'if (false) {', tes: TES('partyKlien.test.mjs') },
  { id: 'party-penuh', pengaman: 'slot ke-5 ditolak sebelum permintaan', berkas: 'src/party/PartyKlien.js', cari: 'if (this.jumlah() >= MAX_SLOTS) {', ganti: 'if (false) {', tes: TES('partyKlien.test.mjs') },
  { id: 'party-ganda', pengaman: 'agen yang sama tidak direkrut dua kali', berkas: 'src/party/PartyKlien.js', cari: 'if (ada && this._slotDari(ada.agen.instance_id) >= 0) {', ganti: 'if (false) {', tes: TES('partyKlien.test.mjs') },
  { id: 'party-bentrok', pengaman: 'versi bentrok: muat ulang + ulang sekali', berkas: 'src/party/PartyKlien.js', cari: "err.kode === 'VERSI_BENTROK' && sisaUlang > 0) {\n        await Promise.all", ganti: "false) {\n        await Promise.all", tes: TES('partyKlien.test.mjs') },
  { id: 'cache-findsecrets', pengaman: 'localStorage bersih menurut findSecrets', berkas: 'src/party/PartyKlien.js', cari: 'if (findSecrets(isi).length) {\n      // Never write', ganti: 'if (false) {\n      // Never write', tes: TES('partyKlien.test.mjs') },
  { id: 'cache-allowlist', pengaman: 'cache hanya field yang diizinkan', berkas: 'src/party/PartyKlien.js', cari: "const a = { instance_id: id, template: { id: item?.agen.template?.id ?? null } };", ganti: 'const a = { ...(item?.agen ?? { instance_id: id }) };', tes: TES('partyKlien.test.mjs') },
  { id: 'api-header', pengaman: 'tulisan membawa x-galantara-world', berkas: 'src/party/apiRuntime.js', cari: "headers['x-galantara-world'] = '1';", ganti: '', tes: TES('apiRuntime.test.mjs') },
  { id: 'api-cookie', pengaman: "credentials:'include'", berkas: 'src/party/apiRuntime.js', cari: "credentials: 'include',", ganti: "credentials: 'omit',", tes: TES('apiRuntime.test.mjs') },
  { id: 'api-segmen', pengaman: 'id di jalur URL divalidasi', berkas: 'src/party/apiRuntime.js', cari: "if (typeof id !== 'string' || !POLA_ID[jenis]?.test(id)) {", ganti: 'if (false) {', tes: TES('apiRuntime.test.mjs') },
  // /rt proxy in galantara-server.
  { id: 'proxy-jalur', pengaman: 'proxy: hanya /rt/api/<segmen polos>', berkas: 'galantara-server/proxyRuntime.js', cari: 'if (!JALUR_API.test(jalur)) return null;', ganti: '', tes: TES('proxyRuntime.test.mjs') },
  { id: 'proxy-kueri', pengaman: 'proxy: kueri hanya karakter RFC 3986', berkas: 'galantara-server/proxyRuntime.js', cari: 'if (kueri && !KUERI.test(kueri)) return null;', ganti: '', tes: TES('proxyRuntime.test.mjs') },
  { id: 'proxy-hop', pengaman: 'proxy: header hop-by-hop tidak menyeberang', berkas: 'galantara-server/proxyRuntime.js', cari: 'if (!HOP.has(k) && !perHop.has(k) && v !== undefined)', ganti: 'if (!perHop.has(k) && v !== undefined)', tes: TES('proxyRuntime.test.mjs') },
  { id: 'proxy-connection', pengaman: 'proxy: header yang disebut Connection ikut hop-by-hop', berkas: 'galantara-server/proxyRuntime.js', cari: 'if (!HOP.has(k) && !perHop.has(k) && v !== undefined)', ganti: 'if (!HOP.has(k) && v !== undefined)', tes: TES('proxyRuntime.test.mjs') },
  { id: 'proxy-galat-json', pengaman: 'proxy: runtime mati = JSON yang bisa ditampilkan', berkas: 'galantara-server/proxyRuntime.js', cari: 'balasJson(res, habis ? 504 : 502, {', ganti: 'res.destroy(); void ({', tes: TES('proxyRuntime.test.mjs') },
  { id: 'proxy-terpasang', pengaman: 'server --local benar-benar memasang proxy', berkas: 'galantara-server/index.js', cari: 'if (RUNTIME_URL) app.use(', ganti: 'if (false) app.use(', tes: TES('localServerRuntime.test.mjs') },
  // PerilakuNpc / NPC.js / ChatBubble.
  { id: 'npc-dt', pengaman: 'NPC: kecepatan m/dtk × dt', berkas: 'src/entities/PerilakuNpc.js', cari: 'const maju = v * dt;', ganti: 'const maju = v * (1 / 60);', tes: TES('perilakuNpc.test.mjs') },
  { id: 'npc-overshoot', pengaman: 'NPC: tiba tanpa lewat titik', berkas: 'src/entities/PerilakuNpc.js', cari: 'if (jarak <= maju || jarak < 1e-6) {', ganti: 'if (jarak < 1e-6) {', tes: TES('perilakuNpc.test.mjs') },
  { id: 'npc-dialog', pengaman: 'NPC: berhenti saat dialog terbuka', berkas: 'src/entities/PerilakuNpc.js', cari: 'if (dialogTerbuka) {', ganti: 'if (false) {', tes: TES('perilakuNpc.test.mjs') },
  { id: 'npc-radius', pengaman: 'NPC: keliling dalam radius', berkas: 'src/entities/PerilakuNpc.js', cari: 'const r = RADIUS_KELILING * Math.sqrt(this.rng());', ganti: 'const r = 2 * RADIUS_KELILING * Math.sqrt(this.rng());', tes: TES('perilakuNpc.test.mjs') },
  { id: 'npc-lapor', pengaman: 'NPC: lapor berhenti sejangkauan tangan', berkas: 'src/entities/PerilakuNpc.js', cari: 'if (jarak <= JARAK_LAPOR) {', ganti: 'if (jarak <= 0.01) {', tes: TES('perilakuNpc.test.mjs') },
  { id: 'npc-delegasi', pengaman: 'NPC.js meneruskan dialog ke perilaku', berkas: 'src/entities/NPC.js', cari: 'dialogTerbuka: ctx.dialogNpcId === npc.data.id,', ganti: 'dialogTerbuka: false,', tes: TES('npcManager.test.mjs') },
  { id: 'npc-tersembunyi', pengaman: 'NPC tersembunyi (di Spot) tidak ditawarkan bicara', berkas: 'src/entities/NPC.js', cari: 'if (!this._terlihat) return null;', ganti: '', tes: TES('npcManager.test.mjs') },
  { id: 'balon-tetap', pengaman: 'balon status tetap tidak kedaluwarsa', berkas: 'src/ui/ChatBubble.js', cari: 'b.kadaluarsa = opsi.tetap ? Infinity : performance.now() + lama * 1000;', ganti: 'b.kadaluarsa = performance.now() + lama * 1000;', tes: TES('chatBubble.test.mjs') },
  { id: 'kait-aman', pengaman: 'kait 3D yang rusak tidak memutus alur misi', berkas: 'src/party/kaitDunia.js', cari: 'return kaitDunia[nama](...args);\n  } catch (err) {', ganti: 'return kaitDunia[nama](...args);\n  } finally {} if (0) { const err = 0;', tes: TES('kaitDunia.test.mjs') },
  // Views & renderer (src/ui/gw/*, pesanGalat).
  { id: 'ui-textcontent', pengaman: 'teks hanya lewat textContent', berkas: 'src/ui/gw/pohon.js', cari: 'if (teks !== undefined && teks !== null) el.textContent = String(teks);', ganti: 'if (teks !== undefined && teks !== null) el.innerHTML = String(teks);', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-href', pengaman: 'tautan hanya https (http hanya localhost)', berkas: 'src/ui/gw/pohon.js', cari: "if (u.protocol === 'https:') return u.href;", ganti: 'return u.href;', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-atribut', pengaman: 'atribut on*/style ditolak', berkas: 'src/ui/gw/pohon.js', cari: 'if (!ATTR_BOLEH.test(k) || v === undefined', ganti: 'if (v === undefined', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-slot-lipat', pengaman: 'slot kosong dilipat jadi satu baris', berkas: 'src/ui/gw/tampilan.js', cari: 'const isi = anggota.filter(Boolean);', ganti: "const isi = anggota.map((a) => a ?? { instance_id: 'kosong', nama: 'Slot kosong', kelas: '', status: null, brain: null });", tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-nol-sumber', pengaman: 'nol sumber = peringatan dugaan', berkas: 'src/ui/gw/tampilan.js', cari: "h('p', { kelas: 'gw-peringatan', teks: 'Tidak ada sumber. Perlakukan ini sebagai dugaan, bukan fakta.' })", ganti: 'null', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-rujukan', pengaman: 'nomor sumber mengikuti rujukan laporan', berkas: 'src/ui/gw/tampilan.js', cari: 'nomor.get(temuan.get(t)?.sumber)', ganti: 'Number(String(t).slice(1))', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-otak-label', pengaman: 'otak selalu berlabel', berkas: 'src/ui/gw/tampilan.js', cari: "h('div', { kelas: 'gw-otak' }, h('span', { teks: `Otak: ${namaOtak(a.brain)}` }), labelOtakChip(a.brain)),", ganti: "h('div', { kelas: 'gw-otak' }, h('span', { teks: `Otak: ${namaOtak(a.brain)}` })),", tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-kartu-tombol', pengaman: 'setiap galat berupa kartu bertombol', berkas: 'src/party/pesanGalat.js', cari: "KUNCI_DITEMPEL: { pesan: 'Sepertinya kamu menempelkan kunci API. Jangan tulis kunci di misi. Simpan di Kantor.', tombol: [T('Hapus teks', 'hapusTeks', true), T('Buka Kantor ↗', 'bukaKantor')] },", ganti: "KUNCI_DITEMPEL: { pesan: 'Sepertinya kamu menempelkan kunci API. Jangan tulis kunci di misi. Simpan di Kantor.', tombol: [] },", tes: TES('tampilanMarkas.test.mjs') },
  // Dialog actions (Panels.js) and the M1 glue (DuniaParty.js).
  { id: 'dialog-tutup', pengaman: 'aksi dialog menutup dialog', berkas: 'src/ui/Panels.js', cari: 'delete this._dialogState[npcData.id];\n            this._closeDialog();\n            try {', ganti: 'delete this._dialogState[npcData.id];\n            try {', tes: TES('dialogAksi.test.mjs') },
  { id: 'dialog-syarat', pengaman: 'pilihan bersyarat tersembunyi tanpa penyaring', berkas: 'src/ui/Panels.js', cari: 'return this._syarat ? Boolean(this._syarat(c.syarat, npcData)) : false;', ganti: 'return this._syarat ? Boolean(this._syarat(c.syarat, npcData)) : true;', tes: TES('dialogAksi.test.mjs') },
  { id: 'glue-titik-kerja', pengaman: 'misi dikirim = agen berjalan ke meja Markas', berkas: 'src/party/DuniaParty.js', cari: "this.game.npcs?.perintah(spesiesId, { jenis: 'menuju', titik: rute ?? ruteKerja(spesiesId), lalu: 'bekerja' });", ganti: '', tes: TES('duniaParty.test.mjs') },
  // B ↔ C adapter (sambungDunia3D) and its use in the glue, NPC.js and PerilakuNpc.
  { id: 'c3d-status-dulu', pengaman: 'status ke 3D sebelum berjalan (meja milik agen ini)', berkas: 'src/party/DuniaParty.js', cari: 'this._gerakkan(sp.id, st, this._status3D(sp.id, st));', ganti: 'this._gerakkan(sp.id, st, { rute: null, pose: null });', tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-rute-status', pengaman: 'agen berjalan ke tempat yang diberi 3D untuk statusnya', berkas: 'src/party/DuniaParty.js', cari: "    } else if (r.rute) {\n      npcs.perintah(spId, { jenis: 'menuju', titik: r.rute, lalu: 'bekerja' });\n", ganti: '', tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-toast-satu', pengaman: 'toast hanya bila status belum tampak di dunia', berkas: 'src/party/DuniaParty.js', cari: "if (!tampak) this.game.toast?.show(`Hasil ${nama} siap.", ganti: "this.game.toast?.show(`Hasil ${nama} siap.", tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-gulungan-selesai', pengaman: 'misi selesai = gulungan (sebelum disetujui)', berkas: 'src/party/DuniaParty.js', cari: "if (HASIL_ADA.has(misi.status) && gabung?.putusan !== 'buang') gulungan(gabung);", ganti: '', tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-gulungan-dibaca', pengaman: 'hasil dibuka = gulungan jadi kertas', berkas: 'src/party/DuniaParty.js', cari: 'if (HASIL_ADA.has(misi.status)) gulunganDibaca(misi);', ganti: '', tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-lepas', pengaman: 'agen keluar party = meja dilepas', berkas: 'src/party/DuniaParty.js', cari: 'lepasAgen(spId); // frees', ganti: '// frees', tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-satu-kanal', pengaman: 'penanda teks B mengalah pada ikon 3D', berkas: 'src/party/DuniaParty.js', cari: 'status: diParty && !statusTerlihat(id) ?', ganti: 'status: diParty ?', tes: TES('duniaParty.test.mjs') },
  { id: 'c3d-mesh-sekali', pengaman: 'adaptor: mesh dikirim ke C sekali per agen', berkas: 'src/party/sambungDunia3D.js', cari: 'if (!meshTerkirim.has(npcId)) {', ganti: 'if (true) {', tes: TES('sambungDunia3D.test.mjs', 'duniaParty.test.mjs') },
  { id: 'c3d-mesh-ulang', pengaman: 'adaptor: direkrut lagi = mesh dikirim lagi', berkas: 'src/party/sambungDunia3D.js', cari: 'meshTerkirim.delete(npcId); // recruited again', ganti: '// recruited again', tes: TES('sambungDunia3D.test.mjs') },
  { id: 'c3d-kursi-dekat', pengaman: 'adaptor: kursi didekati lewat titik dekatnya', berkas: 'src/party/sambungDunia3D.js', cari: 'if (titik.duduk && titikSah(titik.dekat)) return [titik.dekat, titik];', ganti: '', tes: TES('sambungDunia3D.test.mjs', 'duniaParty.test.mjs') },
  { id: 'c3d-kit-lepas', pengaman: 'adaptor: kit gagal tidak membawa penanda ✦', berkas: 'src/party/sambungDunia3D.js', cari: "try { agen.pasangPenandaAgen(mesh); } catch (err) { console.warn('[sambungDunia3D] penanda agen gagal', npcId, err); }\n      }\n      const kelas = kelasDari(npcId);\n      if (kelas && fungsi(agen, 'pasangKitKelas')) {\n        try { agen.pasangKitKelas(mesh, kelas); } catch", ganti: "try { agen.pasangPenandaAgen(mesh); } catch (err) { console.warn('[sambungDunia3D] penanda agen gagal', npcId, err); }\n      }\n      const kelas = kelasDari(npcId);\n      if (kelas && fungsi(agen, 'pasangKitKelas')) {\n        agen.pasangKitKelas(mesh, kelas); try {} catch", tes: TES('sambungDunia3D.test.mjs') },
  { id: 'c3d-gerak-halus', pengaman: 'adaptor: prefers-reduced-motion diteruskan ke pose', berkas: 'src/party/sambungDunia3D.js', cari: '{ kurangiGerak: Boolean(kurangiGerak()) }', ganti: '{ kurangiGerak: false }', tes: TES('sambungDunia3D.test.mjs') },
  { id: 'c3d-cek-fungsi', pengaman: 'adaptor: fungsi C yang tidak ada tidak dipasang', berkas: 'src/party/sambungDunia3D.js', cari: "if (fungsi(markas, 'tambahGulungan')) impl.tambahGulungan", ganti: 'impl.tambahGulungan', tes: TES('sambungDunia3D.test.mjs') },
  { id: 'npc-tanpa-kaster', pengaman: 'NPC tidak memancarkan bayangan (gumpal saja)', berkas: 'src/entities/NPC.js', cari: "      body.scale.y = 1.15;\n      body.castShadow = false;", ganti: "      body.scale.y = 1.15;\n      body.castShadow = true;", tes: TES('npcManager.test.mjs') },
  { id: 'npc-gumpal-lantai', pengaman: 'gumpal bayangan tetap di lantai saat badan naik-turun', berkas: 'src/entities/NPC.js', cari: 'if (npc.bayangan) npc.bayangan.position.y = BAYANGAN_GUMPAL.tinggi - bobY;', ganti: '', tes: TES('npcManager.test.mjs') },
  { id: 'npc-pose-3d', pengaman: 'NPC memegang pose 3D setelah tiba', berkas: 'src/entities/NPC.js', cari: 'npc.mesh.position.set(p.x, lantai + dy, p.z);', ganti: 'npc.mesh.position.set(p.x, dy, p.z);', tes: TES('npcManager.test.mjs') },
  { id: 'npc-pose-jam', pengaman: 'jam pose mulai saat tiba', berkas: 'src/entities/NPC.js', cari: 'npc._poseMulai ??= t;', ganti: 'npc._poseMulai ??= 0;', tes: TES('npcManager.test.mjs') },
  { id: 'npc-lantai', pengaman: 'tinggi lantai naik sepanjang langkah', berkas: 'src/entities/PerilakuNpc.js', cari: 'this.y += (ty - this.y) * (maju / jarak);', ganti: '', tes: TES('perilakuNpc.test.mjs') },
  { id: 'handoff-buang', pengaman: '?mighan= dibuang dari URL', berkas: 'src/core/kodeHandoff.js', cari: 'u.searchParams.delete(PARAM_HANDOFF);\n  riwayat.replaceState', ganti: '  riwayat.replaceState', tes: TES('kodeHandoff.test.mjs') },
  { id: 'eta-belum-terukur', pengaman: 'eta null = "belum terukur", bukan angka', berkas: 'src/party/DuniaParty.js', cari: "Number.isFinite(misi.eta_detik) && misi.eta_detik >= 0 ?", ganti: 'true ?', tes: TES('duniaParty.test.mjs') },
  { id: 'plakat-atas-ikon', pengaman: 'plakat naik di atas ikon status 3D', berkas: 'src/ui/PenandaAgen.js', cari: '(this.adaIkon(a.id) ? TINGGI_PLAKAT_DI_ATAS_IKON : TINGGI_PLAKAT)', ganti: 'TINGGI_PLAKAT', tes: TES('duniaParty.test.mjs') },
  { id: 'ui-alasan-runtime', pengaman: 'alasan gagal dari runtime ditampilkan apa adanya', berkas: 'src/ui/gw/tampilan.js', cari: "? h('p', { kelas: 'gw-peringatan', teks: misi.alasan.pesan })", ganti: '? null', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'ui-alasan-basi', pengaman: 'alasan hanya untuk misi gagal/menunggu otak', berkas: 'src/ui/gw/tampilan.js', cari: "(misi?.status === 'gagal' || misi?.status === 'menunggu_otak') && typeof misi?.alasan?.pesan", ganti: 'typeof misi?.alasan?.pesan', tes: TES('tampilanMarkas.test.mjs') },
  { id: 'css-toast-bungkus', pengaman: 'toast membungkus teks (viewport HP tidak melebar)', berkas: 'src/ui/gw-markas.css', cari: 'white-space:normal;overflow-wrap:anywhere;', ganti: '', tes: TES('cssHp.test.mjs') },
  { id: 'sheet-tahan', pengaman: 'render ulang ditahan saat jari menekan sheet', berkas: 'src/ui/Sheet.js', cari: 'if (this._ditekan) {\n      this._tunda = { nama, pohon };\n      return true;\n    }', ganti: '', tes: TES('sheet.test.mjs') },
  { id: 'sheet-tunda-basi', pengaman: 'tampilan baru membuang pembaruan yang menunggu', berkas: 'src/ui/Sheet.js', cari: 'this._tunda = null; // a fresh view', ganti: '// a fresh view', tes: TES('sheet.test.mjs') },
  { id: 'glue-lapor', pengaman: 'hasil siap tanpa Markas 3D = agen datang melapor', berkas: 'src/party/DuniaParty.js', cari: "npcs.perintah(spId, { jenis: 'lapor' });", ganti: '', tes: TES('duniaParty.test.mjs') },
  { id: 'glue-kunci-isian', pengaman: 'kunci tempelan tidak dikembalikan ke formulir', berkas: 'src/party/DuniaParty.js', cari: "const aman = err.kode === 'KUNCI_DITEMPEL' ? {} : masukan;", ganti: 'const aman = masukan;', tes: TES('duniaParty.test.mjs') },
  // MisiKlien.
  { id: 'misi-kunci', pengaman: 'findSecrets di input misi', berkas: 'src/party/MisiKlien.js', cari: 'if (adaKunci(...dikirim)) throw', ganti: 'if (false) throw', tes: TES('misiKlien.test.mjs') },
  // misi-kunci-token retired 27 Sep: the contract's findSecrets (ADR-0007 sync) now finds keys mid-string, so
  // the per-token split is a second layer; removing it alone stays green by design (LOG-B2).
  { id: 'misi-kunci-catatan', pengaman: 'findSecrets di catatan putusan', berkas: 'src/party/MisiKlien.js', cari: 'if (adaKunci(catatan))', ganti: 'if (false)', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-https', pengaman: 'sumber wajib https', berkas: 'src/party/MisiKlien.js', cari: "if (!u || u.protocol !== 'https:') {", ganti: 'if (!u) {', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-maks-sumber', pengaman: 'maksimal 3 sumber', berkas: 'src/party/MisiKlien.js', cari: 'if (alamat.length > MAKS_SUMBER)', ganti: 'if (false)', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-tersembunyi', pengaman: 'tanpa timer saat tab tersembunyi', berkas: 'src/party/MisiKlien.js', cari: '// Hidden tab: set no timer at all. The visibilitychange handler resumes.\n    if (this._tersembunyi()) return;', ganti: '', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-tersembunyi-tanya', pengaman: 'tanpa permintaan saat tab tersembunyi', berkas: 'src/party/MisiKlien.js', cari: 'if (p.berhenti || p.sedangTanya) return;\n    if (this._tersembunyi()) return;', ganti: 'if (p.berhenti || p.sedangTanya) return;', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-akhir', pengaman: 'berhenti di status akhir', berkas: 'src/party/MisiKlien.js', cari: 'if (STATUS_AKHIR.has(misi?.status)) {', ganti: 'if (false) {', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-batas', pengaman: 'batas waktu pantau', berkas: 'src/party/MisiKlien.js', cari: 'this.jam.sekarang() - p.mulai >= this.batasMs', ganti: 'false', tes: TES('misiKlien.test.mjs') },
  { id: 'misi-mundur', pengaman: 'mundur saat galat', berkas: 'src/party/MisiKlien.js', cari: 'Math.min(this.mundurMaksMs, this.intervalMs * 2 ** p.gagalBeruntun)', ganti: 'this.intervalMs', tes: TES('misiKlien.test.mjs') },
  // ── Sprint 02 (M2 "Party kerja") ──
  { id: 'm2-konteks-kunci', pengaman: 'kunci di konteks pecah-tugas tertangkap', berkas: 'src/party/MisiKlien.js', cari: 'jenis === JENIS.PECAH ? [teks.tujuan, teks.konteks]', ganti: 'jenis === JENIS.PECAH ? [teks.tujuan]', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-konteks-maks', pengaman: 'konteks maksimal 1.500', berkas: 'src/party/MisiKlien.js', cari: 'if (teks.konteks.length > MAKS_KONTEKS)', ganti: 'if (false)', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-panduan-bahan', pengaman: 'panduan butuh sumber atau rujukan', berkas: 'src/party/MisiKlien.js', cari: 'if (!alamat.length && !rujuk) throw', ganti: 'if (false) throw', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-jenis-kelas', pengaman: 'misi dikirim dengan jenis keahlian agen', berkas: 'src/party/DuniaParty.js', cari: 'const isi = { jenis: this._jenis(sp.id) ?? JENIS.RISET, ...masukan };', ganti: 'const isi = { ...masukan, jenis: JENIS.RISET };', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-teruskan-setujui', pengaman: 'teruskan hanya setelah disetujui', berkas: 'src/ui/gw/tampilan.js', cari: "const bisaDiteruskan = putus === 'setujui' && misi?.status === 'selesai';", ganti: "const bisaDiteruskan = misi?.status === 'selesai';", tes: TES('partyKerja.test.mjs') },
  { id: 'm2-rujuk-kirim', pengaman: 'rujuk_misi ikut dikirim', berkas: 'src/party/DuniaParty.js', cari: 'if (rujukan) isi.rujuk_misi = rujukan.id;', ganti: '', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-rekan-sibuk', pengaman: 'rekan yang sibuk tidak ditawari', berkas: 'src/ui/gw/tampilan.js', cari: 'rekan.map((r) => (r.sibuk', ganti: 'rekan.map((r) => (false', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-izin-batas', pengaman: 'menunggu izin tidak menghabiskan batas waktu', berkas: 'src/party/MisiKlien.js', cari: 'if (misi?.status === STATUS_MENUNGGU_IZIN) p.mulai = this.jam.sekarang();', ganti: '', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-izin-tolak', pengaman: 'Tolak mengirim setuju:false', berkas: 'src/party/DuniaParty.js', cari: 'tolak: () => this.putuskanIzin(instanceId, false),', ganti: 'tolak: () => this.putuskanIzin(instanceId, true),', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-xp-data', pengaman: 'pengalaman hanya dari bilangan bulat data', berkas: 'src/ui/gw/tampilan.js', cari: "if (!p || typeof p !== 'object' || !bulatSah(p.xp) || !bulatSah(p.level)) return null;", ganti: "if (!p || typeof p !== 'object') return null;", tes: TES('partyKerja.test.mjs') },
  { id: 'm2-gpu-label', pengaman: 'GPU sewaan berlabel sendiri (ADR-0007)', berkas: 'src/party/PartyKlien.js', cari: "if (jenis === 'gpu_sewaan') {", ganti: 'if (false) {', tes: TES('partyKerja.test.mjs') },
  { id: 'm2-ikut-jeda', pengaman: 'pendamping k di t − k·0,35', berkas: 'src/party/JejakPemilik.js', cari: 'const waktu = this.t - slot * JEDA_PENDAMPING;', ganti: 'const waktu = this.t - JEDA_PENDAMPING;', tes: TES('partyIkut.test.mjs') },
  { id: 'm2-ikut-jarak-hilang', pengaman: 'gerak lambat tidak menumpuk pada pemain', berkas: 'src/party/JejakPemilik.js', cari: 'const jarak = this.s - slot * JARAK_LINTASAN_PENDAMPING;', ganti: 'const jarak = this.s;', tes: TES('jejakJarak.test.mjs') },
  { id: 'm2-ikut-jarak-lemah', pengaman: '1,2 m lintasan per slot, bukan 0,2 m', berkas: 'src/party/JejakPemilik.js', cari: 'JARAK_LINTASAN_PENDAMPING = 1.2;', ganti: 'JARAK_LINTASAN_PENDAMPING = 0.2;', tes: TES('jejakJarak.test.mjs') },
  { id: 'm2-ikut-jejak-lambat', pengaman: 'riwayat lintasan tetap tersedia saat lambat', berkas: 'src/party/JejakPemilik.js', cari: ' && this.titik[1].s <= batasJarak', ganti: '', tes: TES('jejakJarak.test.mjs') },
  { id: 'm2-ikut-jam-frame-lambat', pengaman: 'frame lambat tidak merekam kecepatan melebihi avatar', berkas: 'src/party/JejakPemilik.js', cari: 'Math.max(Math.min(dt, 0.25), d / KECEPATAN)', ganti: 'Math.min(dt, 0.25)', tes: TES('jejakJarak.test.mjs') },
  { id: 'm2-ikut-diam', pengaman: 'berhenti = barisan tetap', berkas: 'src/party/JejakPemilik.js', cari: "if (d < DIAM || !(dt > 0)) return 'diam';", ganti: "if (!(dt > 0)) return 'diam';", tes: TES('partyIkut.test.mjs') },
  { id: 'm2-ikut-lompat', pengaman: 'lompatan = jejak baru', berkas: 'src/party/JejakPemilik.js', cari: 'if (d > JARAK_LOMPAT) {', ganti: 'if (false) {', tes: TES('partyIkut.test.mjs') },
  { id: 'm2-ikut-misi', pengaman: 'agen yang misi tidak ikut', berkas: 'src/party/DuniaParty.js', cari: "if (!a || a.hilang || !BOLEH_IKUT.has(a.status_kerja ?? null)) continue;", ganti: 'if (!a || a.hilang) continue;', tes: TES('partyIkut.test.mjs') },
  { id: 'm2-ikut-cepat', pengaman: 'pendamping menyusul, dibatasi', berkas: 'src/entities/PerilakuNpc.js', cari: 'const v = Math.min(KECEPATAN_IKUT_MAKS, Math.max(KECEPATAN_MENUJU, jarak / WAKTU_SUSUL));', ganti: 'const v = Math.max(KECEPATAN_MENUJU, jarak / WAKTU_SUSUL);', tes: TES('partyIkut.test.mjs') },
  { id: 'm2-ikut-sapa', pengaman: 'pendamping tidak merebut petunjuk Ngobrol', berkas: 'src/entities/NPC.js', cari: "if (npc.perilaku?.keadaan === 'ikut') return;", ganti: '', tes: TES('partyIkut.test.mjs') },
  { id: 'm2-box-bawa', pengaman: 'Markas-box: Bawa tanpa rekrut kedua', berkas: 'src/party/PartyKlien.js', cari: 'if (kosong < 0) throw penuh();', ganti: '', tes: TES('markasBox.test.mjs') },
  { id: 'm2-julukan-kunci', pengaman: 'julukan berbentuk kunci ditolak', berkas: 'src/party/PartyKlien.js', cari: 'if (bersih && adaKunciDi(bersih)) throw', ganti: 'if (false) throw', tes: TES('markasBox.test.mjs') },
  { id: 'm2-julukan-versi', pengaman: 'julukan: versi bentrok diulang sekali', berkas: 'src/party/PartyKlien.js', cari: "if (err.kode === 'VERSI_BENTROK' && sisaUlang > 0) {\n          await this._muatRoster();\n          return simpan(", ganti: "if (false) {\n          await this._muatRoster();\n          return simpan(", tes: TES('markasBox.test.mjs') },
  { id: 'm2-buku-siluet', pengaman: 'spesies belum ditemui tanpa nama', berkas: 'src/party/BukuWarga.js', cari: ": { id: sp.id, ditemui: false, nama: null, kelas: null,", ganti: ": { id: sp.id, ditemui: false, nama: sp.nama, kelas: sp.kelas_kerja,", tes: TES('markasBox.test.mjs') },
  { id: 'm2-buku-rahasia', pengaman: 'Buku Warga: isi berkunci tidak dipercaya', berkas: 'src/party/BukuWarga.js', cari: '|| findSecrets(isi).length) return;', ganti: ') return;', tes: TES('markasBox.test.mjs') },
  { id: 'm2-handoff-sekali', pengaman: 'kode masuk ditukar sekali', berkas: 'src/party/DuniaParty.js', cari: 'this._kodeMasuk = null; // one try', ganti: '// one try', tes: TES('handoffDunia.test.mjs') },
  { id: 'm2-handoff-bentuk', pengaman: 'kode rusak tidak dikirim', berkas: 'src/core/kodeHandoff.js', cari: 'kode: semua.length === 1 && kodeSah(semua[0]) ? semua[0] : null', ganti: 'kode: semua[0] ?? null', tes: TES('handoffDunia.test.mjs') },
  { id: 'm2-handoff-tab', pengaman: 'tab Kantor tanpa opener', berkas: 'src/party/DuniaParty.js', cari: 'try { tab.opener = null; }', ganti: 'try { }', tes: TES('handoffDunia.test.mjs') },
  { id: 'm2-ringan-5dtk', pengaman: 'Mode Ringan: baru setelah 5 dtk lambat', berkas: 'src/core/ModeRingan.js', cari: 'if (this._lambat < DETIK_LAMBAT) return false;', ganti: '', tes: TES('modeRingan.test.mjs') },
  { id: 'm2-ringan-jeda', pengaman: 'Mode Ringan: jeda tab bukan lambat', berkas: 'src/core/ModeRingan.js', cari: 'if (dt > JEDA) {', ganti: 'if (false) {', tes: TES('modeRingan.test.mjs') },
  { id: 'm2-ringan-mati', pengaman: 'Mode Ringan: pilihan mati dihormati', berkas: 'src/core/ModeRingan.js', cari: "if (this.pilihan !== 'otomatis' || this.nyala) return false;", ganti: 'if (this.nyala) return false;', tes: TES('modeRingan.test.mjs') },
  { id: 'm2-avatar-nyata', pengaman: 'avatar berjalan waktu nyata di FPS rendah', berkas: 'src/entities/Avatar.js', cari: 'maks: WAKTU_AVATAR_MAKS });', ganti: 'maks: 0.05 });', tes: TES('langkah.test.mjs') },
  { id: 'm2-avatar-langkah', pengaman: 'langkah avatar ≤ 0,05 dtk', berkas: 'src/entities/Avatar.js', cari: 'pecahLangkah(dtMentah, { langkah: LANGKAH_MAKS,', ganti: 'pecahLangkah(dtMentah, { langkah: 1,', tes: TES('langkah.test.mjs') },
  // Invitation sign-in (ADR-0011).
  { id: 'undangan-kosong', pengaman: 'kode kosong dijawab di klien, tanpa permintaan', berkas: 'src/party/PartyKlien.js', cari: "    if (!teks) throw galat('KODE_UNDANGAN_KOSONG', 'Ketik kode undangan dulu.');", ganti: '', tes: TES('masukUndangan.test.mjs') },
  { id: 'undangan-bukan-dev', pengaman: 'produksi masuk dengan kode, bukan login dev', berkas: 'src/party/DuniaParty.js', cari: '        await this.party.masukUndangan(kode);', ganti: '        await this.party.masukDev(normalisasiPemilik(getOrCreateGuestId()));', tes: TES('masukUndangan.test.mjs') },
  { id: 'undangan-tak-disimpan', pengaman: 'kode tidak disimpan di objek klien', berkas: 'src/party/PartyKlien.js', cari: "    const teks = typeof kode === 'string' ? kode.trim() : '';", ganti: "    const teks = typeof kode === 'string' ? kode.trim() : ''; this.kodeTerakhir = teks;", tes: TES('masukUndangan.test.mjs') },
  { id: 'undangan-tak-ke-storage', pengaman: 'kode tidak ditulis ke penyimpanan peramban', berkas: 'src/party/PartyKlien.js', cari: "    const teks = typeof kode === 'string' ? kode.trim() : '';", ganti: "    const teks = typeof kode === 'string' ? kode.trim() : ''; try { this.penyimpanan?.setItem('gw-undangan', teks); } catch { /* */ }", tes: TES('masukUndangan.test.mjs') },
  { id: 'undangan-kartu-form', pengaman: 'tombol Masuk di kartu membuka formulir kode (produksi)', berkas: 'src/party/DuniaParty.js', cari: "      case 'masuk': return this.lokal ? this.masuk() : this.bukaMasuk();", ganti: "      case 'masuk': return this.masuk();", tes: TES('masukUndangan.test.mjs') },
  { id: 'undangan-nama-isian', pengaman: 'isian bernama undangan (dibaca saat kirim)', berkas: 'src/ui/gw/tampilan.js', cari: "type: 'text', name: 'undangan',", ganti: "type: 'text', name: 'kode',", tes: TES('masukUndangan.test.mjs') },
];

function jalankan(files, cwd) {
  const r = spawnSync(process.execPath, ['--experimental-default-type=module', '--test', '--test-timeout=60000', ...files], { cwd, encoding: 'utf8' });
  const pass = Number(/^# pass (\d+)/m.exec(r.stdout)?.[1] ?? 0);
  const fail = Number(/^# fail (\d+)/m.exec(r.stdout)?.[1] ?? 0);
  return { code: r.status, pass, fail };
}

function main(filter) {
  const pilih = MUTASI.filter((m) => !filter || m.id.includes(filter) || m.pengaman.includes(filter));
  const semuaTes = [...new Set(pilih.flatMap((m) => m.tes))];
  const kontrol = jalankan(semuaTes, APP);
  console.log(`Kontrol tanpa mutasi: ${kontrol.code === 0 ? 'HIJAU' : 'MERAH'} (${kontrol.pass} lulus, ${kontrol.fail} gagal)`);
  if (kontrol.code !== 0 || kontrol.pass === 0) {
    console.error('Kontrol harus hijau dulu; hasil mutasi tidak berarti apa-apa. Berhenti.');
    return 1;
  }
  let lolos = 0;
  console.log('\n| Mutasi | Pengaman | Hasil |\n|---|---|---|');
  for (const m of pilih) {
    const jalur = join(APP, m.berkas);
    const asli = readFileSync(jalur);
    const teks = asli.toString('utf8');
    // Windows checkouts are CRLF (core.autocrlf) while this list is written with \n (R25-4).
    const crlf = teks.includes('\r\n');
    const cari = crlf ? m.cari.replaceAll('\n', '\r\n') : m.cari;
    const ganti = crlf ? m.ganti.replaceAll('\n', '\r\n') : m.ganti;
    const n = teks.split(cari).length - 1;
    if (n !== 1) {
      console.log(`| ${m.id} | ${m.pengaman} | BASI: pola ditemukan ${n}× (perbarui daftar mutasi) |`);
      continue;
    }
    try {
      writeFileSync(jalur, teks.replace(cari, () => ganti));
      const h = jalankan(m.tes, APP);
      const merah = h.code !== 0;
      if (merah) lolos++;
      console.log(`| ${m.id} | ${m.pengaman} | ${merah ? `merah (${h.fail} gagal)` : '**HIJAU: pengaman tidak teruji**'} |`);
    } finally {
      writeFileSync(jalur, asli);
    }
  }
  console.log(`\nMutasi tertangkap: ${lolos}/${pilih.length}`);
  return lolos === pilih.length ? 0 : 1;
}

process.exitCode = main(process.argv[2]);
