# Panduan setup deploy GitHub Actions -> VPS (jalankan di PowerShell di laptop Windows).
# Tidak mengakses GitHub/VPS otomatis - hanya membantu copy dan langkah yang jelas.

$ErrorActionPreference = "Stop"
$pub = Join-Path $env:USERPROFILE ".ssh\galantara_deploy_ed25519.pub"
$priv = Join-Path $env:USERPROFILE ".ssh\galantara_deploy_ed25519"

Write-Host ""
Write-Host "========== GALANTARA - SETUP DEPLOY (bantu langkah) ==========" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $pub) -or -not (Test-Path $priv)) {
    Write-Host "File key belum ada. Buat dulu di CMD:" -ForegroundColor Yellow
    Write-Host '  mkdir "%USERPROFILE%\.ssh" 2>nul & ssh-keygen -t ed25519 -C github-actions-galantara -f "%USERPROFILE%\.ssh\galantara_deploy_ed25519" -q -N ""'
    Write-Host ""
    exit 1
}

Get-Content $pub -Raw | ForEach-Object { $_.Trim() } | Set-Clipboard
Write-Host "[OK] Public key sudah disalin ke Clipboard (pakai Ctrl+V di server)." -ForegroundColor Green
Write-Host "     File: $pub"
Write-Host ""

Write-Host "Membuka PRIVATE key di Notepad..." -ForegroundColor Yellow
Write-Host '  Salin SEMUA isi file: Ctrl+A lalu Ctrl+C. Hanya tempel di GitHub Secret bernama SSH_PRIVATE_KEY.'
Write-Host "  JANGAN kirim isi private key ke chat, email, atau repo."
Write-Host ""
Start-Process notepad.exe -ArgumentList "`"$priv`""

Write-Host "========== LANJUT DI VPS (aaPanel) ==========" -ForegroundColor Cyan
Write-Host '1) Login aaPanel, buka menu Terminal atau SSH (atau PuTTY ke root@72.62.125.6).'
Write-Host "2) Jalankan perintah ini:"
Write-Host ""
Write-Host "    mkdir -p /root/.ssh; chmod 700 /root/.ssh; nano /root/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "3) Di editor nano: kursor ke PALING BAWAH, Enter baris baru, lalu Ctrl+V untuk paste public key."
Write-Host "   Simpan: Ctrl+O, Enter. Keluar: Ctrl+X."
Write-Host "4) Lalu jalankan:"
Write-Host ""
Write-Host "    chmod 600 /root/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""

Write-Host "========== LANJUT DI GITHUB ==========" -ForegroundColor Cyan
Write-Host "Buka (sesuaikan kalau repo beda):"
Write-Host "  https://github.com/fahmiwol/galantara/settings/secrets/actions" -ForegroundColor White
Write-Host ""
Write-Host "Klik New repository secret EMPAT kali. Nama WAJIB sama persis:"
Write-Host ""
Write-Host "  SSH_HOST        nilai: 72.62.125.6"
Write-Host "  SSH_USER        nilai: root"
Write-Host "  REMOTE_PATH     nilai: /www/wwwroot/galantara.io/"
Write-Host "  SSH_PRIVATE_KEY nilai: tempel semua isi dari Notepad (private key)"
Write-Host ""

Write-Host "========== TES ==========" -ForegroundColor Cyan
Write-Host "Repo, tab Actions, workflow Deploy VPS static, Run workflow, branch main."
Write-Host ""
Write-Host "Tutup Notepad setelah selesai menyalin ke GitHub." -ForegroundColor DarkGray
Write-Host ""
