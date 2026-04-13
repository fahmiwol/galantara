# Deploy statis ke VPS dari mesin Windows (boleh dijalankan agen Cursor dengan izin network).
# Salin .env.deploy.example → .env.deploy, isi nilai, lalu:
#   .\.env.deploy tidak perlu di-dotsource manual — skrip memuat baris KEY=VALUE.
# Atau set variabel lingkungan yang sama sebelum menjalankan skrip.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "index.html"))) {
    Write-Error "index.html tidak ditemukan di $Root — jalankan skrip dari repo Galantara."
}

$envFile = Join-Path $Root ".env.deploy"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($k, $v, "Process")
        }
    }
}

$host_ = $env:GALANTARA_SSH_HOST
$user = $env:GALANTARA_SSH_USER
$path = $env:GALANTARA_REMOTE_PATH

if (-not $host_ -or -not $user -or -not $path) {
    Write-Error "Set GALANTARA_SSH_HOST, GALANTARA_SSH_USER, GALANTARA_REMOTE_PATH (via .env.deploy atau environment)."
}

$dest = "${user}@${host_}:$path"
Push-Location $Root
try {
    scp index.html about.html admin.html $dest
    scp -r src $dest
    scp -r data $dest
    Write-Host "Deploy selesai ke $dest"
}
finally {
    Pop-Location
}
