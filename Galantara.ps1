param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$url = 'http://127.0.0.1:4000'
$healthy = $false
try { $healthy = (Invoke-RestMethod "$url/local-health" -TimeoutSec 2).app -eq 'galantara-local' } catch {}
if (-not $healthy) {
    if (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 4000 sedang dipakai aplikasi lain. Tidak ada proses yang dihentikan.'
    }
    $nodeExe = (Get-Command node -ErrorAction Stop).Source
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'galantara-server/node_modules/three'))) {
        & npm.cmd ci --prefix (Join-Path $projectRoot 'galantara-server')
        if ($LASTEXITCODE -ne 0) { throw 'Instalasi dependency gagal.' }
    }
    $logDir = Join-Path $projectRoot '.local'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Start-Process -FilePath $nodeExe -ArgumentList 'galantara-server/index.js','--local' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server-error.log') | Out-Null
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try { $healthy = (Invoke-RestMethod "$url/local-health" -TimeoutSec 1).app -eq 'galantara-local' } catch {}
        if ($healthy) { break }
    }
    if (-not $healthy) { throw "Server belum siap. Periksa $logDir/server-error.log" }
}
Write-Host "Galantara lokal siap: $url"
if (-not $NoBrowser) { Start-Process $url }
