#
# install.ps1 — Valquiria Chat
# Corre isto UMA VEZ (ou sempre que mudares de PC/pasta). Instala as
# dependencias do backend e do frontend, cria a estrutura de pastas, a base
# de dados JSON vazia, e os ficheiros .env com valores por omissao.
#
# Depois de correr este script, usa sempre o start.ps1 para arrancar a app.
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
# 0. Verificar Node.js
# ---------------------------------------------------------------------------
Write-Title "A verificar requisitos"

if (-not (Test-Command "node")) {
    Write-Host "Node.js nao encontrado. Instala a partir de https://nodejs.org (versao 20 LTS recomendada)." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js encontrado: $(node --version)" -ForegroundColor Green

if (-not (Test-Command "npm")) {
    Write-Host "npm nao encontrado (normalmente vem com o Node.js)." -ForegroundColor Red
    exit 1
}
Write-Host "npm encontrado: $(npm --version)" -ForegroundColor Green

# ---------------------------------------------------------------------------
# 1. Estrutura de pastas e ficheiros de dados
# ---------------------------------------------------------------------------
Write-Title "A preparar estrutura de pastas e base de dados JSON"

$dbDir = Join-Path $root "database"
$uploadsDir = Join-Path $root "uploads"

New-Item -ItemType Directory -Force -Path $dbDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $dbDir "backups") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "images") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "documents") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "audio") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "avatars") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "banners") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $uploadsDir "group-avatars") | Out-Null

$jsonDefaults = @{
    "users.json"         = "[]"
    "chats.json"         = "[]"
    "messages.json"      = "[]"
    "sessions.json"      = "[]"
    "codes.json"         = "[]"
    "notifications.json" = "[]"
    "auditLog.json"      = "[]"
    "config.json"        = '{"appName":"Valquiria Chat","theme":"dark","port":4000,"openRegistration":true,"allowUploads":true,"maxUploadSizeMb":15,"announcement":null}'
}

foreach ($file in $jsonDefaults.Keys) {
    $path = Join-Path $dbDir $file
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value $jsonDefaults[$file] -Encoding UTF8
        Write-Host "Criado: database\$file" -ForegroundColor Green
    }
}
# catalog.json e gerado automaticamente pelo backend na primeira vez que arranca
# (contem o catalogo de cosmeticos da loja), por isso nao o criamos aqui.

# ---------------------------------------------------------------------------
# 2. Ficheiros .env
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
else {
    Write-Host "backend\.env ja existe, nao foi alterado." -ForegroundColor DarkGray
}

$frontendEnv = Join-Path $root "frontend\.env"
if (-not (Test-Path $frontendEnv)) {
    "VITE_BACKEND_URL=http://localhost:4000" | Set-Content -Path $frontendEnv -Encoding UTF8
    Write-Host "Ficheiro frontend\.env criado." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. Instalar dependencias
# ---------------------------------------------------------------------------
Write-Title "A instalar dependencias do backend"
Set-Location (Join-Path $root "backend")
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Falha ao instalar dependencias do backend." -ForegroundColor Red; exit 1 }

Write-Title "A instalar dependencias do frontend"
Set-Location (Join-Path $root "frontend")
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Falha ao instalar dependencias do frontend." -ForegroundColor Red; exit 1 }

Set-Location $root

# ---------------------------------------------------------------------------
# 4. Verificar ferramentas de tunel opcionais
# ---------------------------------------------------------------------------
Write-Title "A verificar ferramentas de tunel (opcional, para partilhar publicamente)"

if (Test-Command "cloudflared") {
    Write-Host "Cloudflared encontrado — sera usado por omissao pelo start.ps1." -ForegroundColor Green
}
elseif (Test-Command "ngrok") {
    Write-Host "Ngrok encontrado — sera usado pelo start.ps1." -ForegroundColor Green
}
elseif (Test-Command "lt") {
    Write-Host "LocalTunnel encontrado — sera usado pelo start.ps1." -ForegroundColor Green
}
else {
    Write-Host "Nenhuma ferramenta de tunel encontrada (opcional)." -ForegroundColor Yellow
    Write-Host "Se quiseres partilhar a app publicamente sem Railway, instala uma:" -ForegroundColor Yellow
    Write-Host "  - Ngrok:       https://ngrok.com/download (recomendado, mais estavel)"
    Write-Host "  - Cloudflared: https://github.com/cloudflare/cloudflared/releases"
    Write-Host "  - LocalTunnel: npm install -g localtunnel"
    Write-Host "Nota: se estiveres a fazer deploy no Railway, nao precisas de nenhuma destas — o Railway ja te da um URL publico." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 5. Resumo final
# ---------------------------------------------------------------------------
Write-Title "Instalacao concluida"
Write-Host ""
Write-Host "Tudo pronto! Agora corre:" -ForegroundColor Green
Write-Host "  .\start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Credenciais admin padrao -> username: admin | senha: admin123 (troca em backend\.env)" -ForegroundColor Yellow
Write-Host "A primeira conta que registares no site fica automaticamente Admin + Dono + Fundador." -ForegroundColor Yellow
Write-Host ""
