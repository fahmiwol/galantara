# Galantara — Deploy Guide

Prompt siap salin untuk agen (Cursor, dll.): **`docs/DEPLOY_PROMPT.md`**.

## Untuk Deploy ke galantara.io

### File & folder yang dibutuhkan (root repo `Galantara/`)
- `index.html` — game Oola (entry)
- `about.html` — landing Tentang (cerita, changelog, Three.js ringan)
- `admin.html` — konsol maintainer (panggil API server; `noindex`)
- `data/` — minimal `contributors.json` untuk dewan kontributor di landing & admin
- `src/` — seluruh modul ES (`main.js`, `core/`, `data/`, …)

Game memuat `<script type="module" src="/src/main.js">` — **tanpa folder `src/` di server, halaman putih.**

### VPS Info
- Provider: Hostinger KVM 2
- IP: 72.62.125.6
- Panel: aaPanel
- Path web: `/www/wwwroot/galantara.io/`

### Three.js di server
- `index.html` memuat `/three.min.js` (self-host) dengan fallback CDN.
- Pastikan `three.min.js` ada di root situs **atau** biarkan fallback CDN jika file belum di-upload.

### Deploy via SCP (dari mesin lokal, repo root)
PowerShell / Git Bash:
```powershell
cd D:\Projects\Galantara
scp index.html about.html admin.html root@72.62.125.6:/www/wwwroot/galantara.io/
scp -r src data root@72.62.125.6:/www/wwwroot/galantara.io/
```

### Konsol maintainer (`admin.html`)
- Di server Node (`galantara-server`), set environment:
  - **`ADMIN_API_TOKEN`** — string rahasia; isi yang sama di form konsol (Bearer).
  - Opsional **`SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** — agar ringkasan menampilkan total user Auth (jangan pernah expose service role ke frontend selain lewat API server ini).
- Pastikan browser bisa memanggil `GET /api/admin/summary` dengan header `Authorization: Bearer <token>`:
  - **Opsi A:** Nginx reverse-proxy `location /api/` ke `http://127.0.0.1:3005` (disarankan — konsol pakai Base URL = `https://galantara.io`).
  - **Opsi B:** Buka port **3005** ke publik dan di konsol isi Base URL `https://galantara.io:3005` (kurang ideal).

Satu baris `rsync` (jika tersedia — lebih aman untuk sync bertahap):
```bash
rsync -avz ./index.html ./about.html ./admin.html ./data/ root@72.62.125.6:/www/wwwroot/galantara.io/
rsync -avz --delete ./src/ root@72.62.125.6:/www/wwwroot/galantara.io/src/
```
(`--delete` hanya pada `src/` — hati-hati jika ada file manual di dalam `src/` di server.)

### SSL
- Let's Encrypt via aaPanel — sudah aktif
- Force HTTPS — sudah aktif

### DNS (di Hostinger)
```
A @ 72.62.125.6
A www 72.62.125.6
```

### Status: LIVE sejak 2026-04-09
- https://galantara.io
- SSL
- GA4: G-WNDQL8J455