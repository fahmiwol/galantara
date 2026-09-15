# ADR-0007 — Pemicu deploy CI dimatikan sampai ada server

**Status:** Diterima — **premisnya dikoreksi [ADR-0018](0018-deploy-manual-terverifikasi-revalidasi-cache-dan-gzip.md)** (16 Sep 2026): server ada (VPS-2, SSH port 2222); CI gagal karena port 22. Pemicu tetap mati, dengan alasan yang baru.
**Tanggal:** 2026-09-11
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

`.github/workflows/deploy-vps.yml` berjalan tiap push ke `main` dan gagal dengan
`ssh: connect to host *** port 22: Connection timed out`.

Saya sempat menyimpulkan VPS-nya mati atau `SSH_HOST` basi, dan menulis di
handoff supaya diperiksa. **Salah arah** — servernya memang belum ada. Riwayat CI
yang pernah hijau (April 2026) membuat saya berasumsi servernya pernah ada dan
sekarang bermasalah; asumsi itu tidak saya uji sebelum menulis instruksi untuk
orang lain.

## Keputusan

Pemicu `push:` dimatikan; tinggal `workflow_dispatch`. Workflow **tidak dihapus**
— isinya sudah benar dan sudah diperbaiki.

Selama server belum ada, tiap push menghasilkan CI merah yang tidak menandakan
apa pun selain "server belum ada". **CI yang selalu merah mengajari semua orang
berhenti membacanya**; kerugiannya nyata, manfaatnya nol.

## Konsekuensi

### Yang didapat

- Sinyal CI kembali berarti.
- Perbaikan yang sudah ada (`benteng.html` dan `assets/` dulu tidak pernah ikut
  ter-rsync, jadi 3 GLB rumah adat dan 6 manifest Spot akan 404) menunggu siap
  pakai.

### Yang dibayar

- Kalau nanti ada server dan orang lupa menyalakan ulang pemicunya, deploy tidak
  akan pernah jalan dan tidak ada yang memberi tahu. Diredam dengan komentar di
  berkas workflow-nya sendiri, bukan cuma di dokumen.

## Alternatif yang ditolak

**Hapus workflow-nya.** Ditolak: perbaikan di dalamnya hilang dan harus ditemukan
ulang.

**Biarkan gagal.** Ditolak: melatih orang mengabaikan CI.

## Bukti

`.github/workflows/deploy-vps.yml`, commit `ee0c846`. Diverifikasi: push
berikutnya tidak memicu run sama sekali.
