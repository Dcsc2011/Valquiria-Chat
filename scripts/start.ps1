#
# start.ps1 — Valquiria Chat
# Instala dependencias, prepara a base de dados JSON, inicia backend + frontend
# e tenta expor a aplicacao publicamente (Cloudflared -> LocalTunnel -> Ngrok).
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

# ---------------------------------------------------------------------------
# 1. Estrutura de pastas e ficheiros de dados
# ---------------------------------------------------------------------------
Write-Title "A preparar estrutura de pastas e base de dados JSON"

$dbDir = Join-Path $root "database"
$uploadsDir = Join-Path $root "uploads"

New-Item -ItemType Directory -Force -Path $dbDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "images") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "documents") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "audio") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "avatars") | Out-Null

$jsonDefaults = @{
    "users.json"    = "[]"
    "chats.json"    = "[]"
    "messages.json" = "[]"
    "sessions.json" = "[]"
    "config.json"   = '{"appName":"Valquiria Chat","theme":"dark","port":4000,"openRegistration":true,"allowUploads":true,"maxUploadSizeMb":15}'
}

foreach ($file in $jsonDefaults.Keys) {
    $path = Join-Path $dbDir $file
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value $jsonDefaults[$file] -Encoding UTF8
        Write-Host "Criado: database\$file" -ForegroundColor Green
    }
}

# ---------------------------------------------------------------------------
# 2. Ficheiro .env do backend
# ---------------------------------------------------------------------------
$backendEnv = Join-Path $root "backend\.env"
if (-not (Test-Path $backendEnv)) {
    Write-Title "A criar backend\.env"
    @"
PORT=4000
JWT_SECRET=$(New-Guid)
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CLIENT_URL=http://localhost:5173
NODE_ENV=development
"@ | Set-Content -Path $backendEnv -Encoding UTF8
    Write-Host "Ficheiro backend\.env criado com valores padrao." -ForegroundColor Green
    Write-Host "IMPORTANTE: muda ADMIN_USERNAME / ADMIN_PASSWORD antes de expor publicamente!" -ForegroundColor Yellow
}

$frontendEnv = Join-Path $root "frontend\.env"
if (-not (Test-Path $frontendEnv)) {
    "VITE_BACKEND_URL=http://localhost:4000" | Set-Content -Path $frontendEnv -Encoding UTF8
}

# ---------------------------------------------------------------------------
# 3. Instalar dependencias
# ---------------------------------------------------------------------------
Write-Title "A instalar dependencias do backend"
Set-Location (Join-Path $root "backend")
npm install

Write-Title "A instalar dependencias do frontend"
Set-Location (Join-Path $root "frontend")
npm install

Set-Location $root

# ---------------------------------------------------------------------------
# 4. Iniciar backend e frontend em novas janelas do PowerShell
# ---------------------------------------------------------------------------
Write-Title "A iniciar backend (porta 4000) e frontend (porta 5173)"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm run dev"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 3

# ---------------------------------------------------------------------------
# 5. Tentar expor publicamente: Cloudflared -> LocalTunnel -> Ngrok
# ---------------------------------------------------------------------------
Write-Title "A tentar expor a aplicacao para a Internet"

function Test-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

$publicUrl = $null

if (Test-Command "cloudflared") {
    Write-Host "Cloudflared encontrado. A criar tunel..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel --url http://localhost:5173"
    $publicUrl = "Ver a janela do Cloudflared para o link publico (https://xxxx.trycloudflare.com)"
}
elseif (Test-Command "lt") {
    Write-Host "LocalTunnel encontrado. A criar tunel..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "lt --port 5173"
    $publicUrl = "Ver a janela do LocalTunnel para o link publico (https://xxxx.loca.lt)"
}
elseif (Test-Command "ngrok") {
    Write-Host "Ngrok encontrado. A criar tunel..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5173"
    $publicUrl = "Ver a janela do Ngrok para o link publico (https://xxxx.ngrok-free.app)"
}
else {
    Write-Host "Nenhuma ferramenta de tunel encontrada." -ForegroundColor Yellow
    Write-Host "Instala uma das seguintes para expores a app publicamente:" -ForegroundColor Yellow
    Write-Host "  - Cloudflared: https://github.com/cloudflare/cloudflared/releases"
    Write-Host "  - LocalTunnel: npm install -g localtunnel"
    Write-Host "  - Ngrok:       https://ngrok.com/download"
    $publicUrl = "Nao exposto publicamente (instala cloudflared, localtunnel ou ngrok)"
}

# ---------------------------------------------------------------------------
# 6. Resumo final
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
Write-Host ""
