# Prompt deploy — Galantara (galantara.io)

Dokumen ini punya dua bagian: **(A) prompt siap salin** untuk Cursor/ag lain, dan **(B) ringkasan cepat** untuk manusia.

---

## A) Salin prompt ini (untuk agen / Cursor)

```
Kamu bertugas MENDEPLOY situs statis Galantara ke VPS produksi.

KONTEKS REPO (lokal, Windows path contoh):
- Root proyek: folder Galantara berisi index.html, about.html, admin.html, src/, data/
- Game memuat ES module dari /src/main.js — folder src/ WAJIB ada di root web server yang sama dengan index.html.
- data/ wajib berisi minimal contributors.json untuk landing & admin.html.
- index.html memuat /three.min.js dengan fallback CDN — idealnya upload three.min.js ke root situs ATAU biarkan fallback.

TARGET PRODUKSI:
- Domain: https://galantara.io
- Panel: aaPanel (Hostinger KVM)
- Path dokumen web (Nginx root): /www/wwwroot/galantara.io/
- IP VPS (contoh dari dokumentasi internal): 72.62.125.6
- User SSH sering: root (sesuaikan jika pakai user lain)

FILE YANG HARUS TERSINKRON KE /www/wwwroot/galantara.io/:
1. index.html
2. about.html
3. admin.html
4. seluruh isi folder src/ (struktur path tetap: .../galantara.io/src/...)
5. seluruh isi folder data/ (minimal data/contributors.json)

CARA KERJA YANG DIHARAPKAN:
1. Pastikan di mesin lokal file-file di atas sudah commit / sesuai versi yang mau di-deploy.
2. Deploy statis dengan SCP atau rsync dari root repo Galantara. Contoh PowerShell:
   cd D:\Projects\Galantara
   scp index.html about.html admin.html USER@HOST:/www/wwwroot/galantara.io/
   scp -r src data USER@HOST:/www/wwwroot/galantara.io/
   Ganti USER@HOST dengan kredensial SSH yang benar. Jika SSH key belum dipasang, minta user menjalankan perintah interaktif atau pasang key dulu.
3. Jangan commit secret. Jangan tulis token/password ke repo.
4. Setelah upload, minta user (atau cek sendiri jika punya akses) membuka:
   - https://galantara.io/
   - https://galantara.io/about.html
   - https://galantara.io/admin.html
   - https://galantara.io/src/main.js (harus 200, bukan 404)
5. Backend multiplayer (galantara-server, Node, default port 3005) adalah deploy terpisah. Untuk admin.html memanggil API dari origin yang sama:
   - Disarankan: Nginx reverse proxy location /api/ ke http://127.0.0.1:3005 (path /api/admin/summary harus sampai ke Node).
   - Set environment di proses Node: ADMIN_API_TOKEN (wajib untuk endpoint admin). Opsional: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY untuk ringkasan user Auth.
6. Jika ada error 404 pada /src/* atau halaman putih di game, prioritas: periksa apakah folder src/ lengkap di server dan permission file.

OUTPUT YANG KAMU BERIKAN:
- Ringkasan perintah yang dijalankan atau yang user harus jalankan
- Daftar verifikasi URL
- Catatan follow-up (Nginx / env server) jika di luar akses deploy statis
```

---

## A2) Salin prompt — Git **push** / **pull** (repo, bukan VPS)

**Push** = kirim commit dari laptop ke remote (GitHub/GitLab).  
**Pull** = ambil perubahan terbaru dari remote ke laptop (atau di server kalau deploy pakai git).

```
Kamu bantu workflow Git untuk repo Galantara (Windows, path contoh D:\Projects\Galantara).

PUSH (lokal → remote):
1. Cek status: git status
2. Stage + commit jika ada perubahan (pesan commit jelas, Conventional Commits boleh).
3. Pastikan branch benar (mis. main). Push: git push origin <branch>
4. Jika push ditolak: git pull --rebase origin <branch> lalu push lagi (jelaskan konflik jika ada).

PULL (remote → lokal):
1. Simpan/stash pekerjaan lokal jika perlu: git stash -u (opsional)
2. git fetch origin && git pull origin <branch>
3. Pop stash jika ada: git stash pop

Jangan force push ke main kecuali user secara eksplisit minta dan paham risikonya. Jangan tulis token SSH atau PAT di chat — gunakan credential manager / SSH key.

OUTPUT: perintah yang dijalankan + ringkasan hasil.
```

---

## A3) Salin prompt — **Pull** di VPS (kalau situs di-deploy dari `git clone`)

Hanya relevan jika di server ada clone repo / subtree, lalu Nginx root mengarah ke folder itu.

```
Kamu punya akses SSH ke VPS Galantara (aaPanel). Path deploy dari Git: [ISI path clone, mis. /www/wwwroot/galantara.io/repo].

Tugas:
1. SSH ke server, cd ke folder repo tersebut.
2. git fetch && git pull origin <branch> (branch produksi, biasanya main).
3. Pastikan build statis / symlink ke Nginx root masih benar setelah pull.
4. Jika ada PM2 untuk Node (galantara-server): restart proses setelah pull file server: pm2 restart <nama>

Jangan hardcode secret. Laporkan error git (permission, conflict) dengan jelas.
```

---

## A4) Salin prompt — **Supabase `db push`** (schema ke cloud)

Ini **bukan** Git — ini push **migration SQL** ke project Supabase.

```
Kamu bantu menjalankan migrasi Galantara ke Supabase Cloud.

KONTEKS:
- File SQL ada di repo: supabase/migrations/ (urutan 20260412000001 … 00015).
- Panduan: supabase/README.md

LANGKAH:
1. Pastikan Supabase CLI terpasang: supabase --version
2. supabase login (interaktif — minta user selesaikan di browser jika perlu)
3. supabase link --project-ref <REF_DARI_DASHBOARD>
4. supabase db push
5. Jika error: salin pesan error, cek urutan migration / konflik dengan schema yang sudah ada.

JANGAN commit service role key. JANGAN paste secret ke repo.
```

---

## B) Ringkasan perintah (manusia)

### SCP (dari folder repo Galantara)

```powershell
cd D:\Projects\Galantara
scp index.html about.html admin.html root@72.62.125.6:/www/wwwroot/galantara.io/
scp -r src data root@72.62.125.6:/www/wwwroot/galantara.io/
```

### rsync (Git Bash / WSL — hati-hati `--delete` pada `src`)

```bash
cd /d/Projects/Galantara
rsync -avz --delete ./src/ root@72.62.125.6:/www/wwwroot/galantara.io/src/
rsync -avz ./index.html ./about.html ./admin.html ./data/ root@72.62.125.6:/www/wwwroot/galantara.io/
```

### Cek cepat

| URL | Yang diharapkan |
|-----|------------------|
| `https://galantara.io/` | Game Oola load |
| `https://galantara.io/about.html` | Landing movement |
| `https://galantara.io/admin.html` | Konsol maintainer |
| `https://galantara.io/data/contributors.json` | JSON valid |

### Referensi tambahan

- Detail singkat: `apps/web/README-DEPLOY.md`
- Changelog: `CHANGELOG.md`
- Posting sosial (bukan deploy): `docs/POST_PROMPTS_GALANTARA.md`

---

## C) Arti **push** vs **pull** di konteks Galantara

| Istilah | Arti umum | Perintah / alat |
|---------|-----------|-----------------|
| **Git push** | Kirim commit **laptop →** GitHub/GitLab | `git push origin main` |
| **Git pull** | Ambil commit **GitHub →** laptop (atau VPS) | `git pull origin main` |
| **Deploy push** | Kirim file **laptop →** VPS (situs live) | `scp` / `rsync` (lihat bagian B) |
| **Supabase db push** | Kirim migration **lokal →** database cloud | `supabase db push` |
| **Pull backup dari VPS** | Ambil salinan file **VPS →** laptop (jarang) | `scp root@HOST:/path/file ./` atau `rsync` arah terbalik |

Alur yang sering dipakai: **`git pull`** (update lokal) → kerja → **`git commit` + `git push`** → **`scp`/`rsync`** (deploy statis) → (opsional) **`supabase db push`**.

---

## D) Supaya agen (Cursor) bisa **deploy** tanpa mengetik `scp` manual

Agen hanya bisa menjalankan perintah di mesinmu; dia **tidak punya** password VPS kecuali kamu sediakan lewat file/env yang **tidak** di-commit.

### Opsi 1 — GitHub Actions (paling rapi untuk “push = live”)

1. Commit file workflow: `.github/workflows/deploy-vps.yml`.
2. Di repo GitHub: **Settings → Secrets and variables → Actions**, isi:
   - `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` (key deploy khusus, bukan key utama pribadi kalau bisa), `REMOTE_PATH` (mis. `/www/wwwroot/galantara.io/`).
3. Setelah itu: **`git push origin main`** → runner Ubuntu men-`rsync` otomatis. Di chat kamu cukup minta agen **commit + push**; deploy ikut jalan.

### Opsi 2 — Skrip lokal + SSH key sudah jalan di mesinmu

1. Salin `.env.deploy.example` → `.env.deploy`, isi host/user/path (file ini di-ignore Git).
2. Pastikan `ssh USER@HOST` **tanpa password** (SSH key + `ssh-agent` atau `~/.ssh/config`).
3. Minta agen: *“jalankan `powershell -File scripts/deploy-local.ps1`”* dan setujui izin **network**. Agen menjalankan `scp` yang sama seperti di bagian B.

Tanpa salah satu di atas, agen tidak bisa deploy ke VPS secara andal (dan **jangan** menaruh password di repo atau di chat).

---

*Update: 2026-04-13 · tambah Git + Supabase prompts; bagian D deploy otomatis*
