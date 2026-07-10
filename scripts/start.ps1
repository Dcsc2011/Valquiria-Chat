#
# start.ps1 — Valquiria Chat
# Arranca o backend + frontend e tenta expor publicamente
# (Cloudflared -> Ngrok -> LocalTunnel). Corre o install.ps1 primeiro se
# ainda nao o fizeste.
#

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
Set-Location $root

function Write-Title($text) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " $text" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Test-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

# ---------------------------------------------------------------------------
# 0. Verificar se a instalacao ja foi feita
# ---------------------------------------------------------------------------
$backendModules = Join-Path $root "backend\node_modules"
$frontendModules = Join-Path $root "frontend\node_modules"
$backendEnv = Join-Path $root "backend\.env"

if (-not (Test-Path $backendModules) -or -not (Test-Path $frontendModules) -or -not (Test-Path $backendEnv)) {
    Write-Host "Parece que ainda nao correste a instalacao." -ForegroundColor Yellow
    Write-Host "A correr install.ps1 primeiro..." -ForegroundColor Yellow
    & (Join-Path $scriptDir "install.ps1")
}

# ---------------------------------------------------------------------------
# 1. Iniciar backend e frontend em novas janelas do PowerShell
# ---------------------------------------------------------------------------
Write-Title "A iniciar backend (porta 4000) e frontend (porta 5173)"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm run dev"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 3

# ---------------------------------------------------------------------------
# 2. Tentar expor publicamente: Cloudflared -> Ngrok -> LocalTunnel
# ---------------------------------------------------------------------------
Write-Title "A tentar expor a aplicacao para a Internet"

$publicUrl = $null

if (Test-Command "cloudflared") {
    Write-Host "Cloudflared encontrado. A criar tunel..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel --url http://localhost:5173"
    $publicUrl = "Ve a janela do Cloudflared para o link publico (https://xxxx.trycloudflare.com)"
}
elseif (Test-Command "ngrok") {
    Write-Host "Ngrok encontrado. A criar tunel..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5173"
    $publicUrl = "Ve a janela do Ngrok para o link publico (https://xxxx.ngrok-free.app)"
}
elseif (Test-Command "lt") {
    Write-Host "LocalTunnel encontrado. A criar tunel..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "lt --port 5173"
    $publicUrl = "Ve a janela do LocalTunnel para o link publico (https://xxxx.loca.lt)"
}
else {
    Write-Host "Nenhuma ferramenta de tunel encontrada." -ForegroundColor Yellow
    Write-Host "Instala uma das seguintes para expores a app publicamente:" -ForegroundColor Yellow
    Write-Host "  - Ngrok:       https://ngrok.com/download"
    Write-Host "  - Cloudflared: https://github.com/cloudflare/cloudflared/releases"
    Write-Host "  - LocalTunnel: npm install -g localtunnel"
    $publicUrl = "Nao exposto publicamente (instala ngrok, cloudflared ou localtunnel)"
}

# ---------------------------------------------------------------------------
# 3. Resumo final
# ---------------------------------------------------------------------------
Write-Title "Valquiria Chat esta a correr"

Write-Host ""
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "Backend:   http://localhost:4000" -ForegroundColor White
Write-Host "API:       http://localhost:4000/api" -ForegroundColor White
Write-Host "Socket:    ws://localhost:4000" -ForegroundColor White
Write-Host "Admin:     http://localhost:5173/admin/login" -ForegroundColor White
Write-Host "Link publico: $publicUrl" -ForegroundColor Magenta
Write-Host ""
Write-Host "Credenciais admin padrao -> username: admin | senha: admin123 (troca em backend\.env)" -ForegroundColor Yellow
Write-Host "A primeira conta registada no site fica automaticamente Admin + Dono + Fundador." -ForegroundColor Yellow
Write-Host ""
