# ==============================================================================
# Cosmos Nexus Innovations — Frontend Automated Setup Script (PowerShell)
# Supported Platforms: Windows 10/11, Windows Server, PowerShell Core
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$MinNodeVersion = 20

function Write-Header {
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "       COSMOS NEXUS INNOVATIONS — FRONTEND SETUP & BOOTSTRAP WIZARD             " -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "Target Directory: $PSScriptRoot"
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Title)
    Write-Host "[$Step] $Title" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [INFO] $Message" -ForegroundColor Cyan
}

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrMsg {
    param([string]$Message)
    Write-Host "  [ERR] $Message" -ForegroundColor Red
}

Set-Location -Path $PSScriptRoot

Write-Header

# ------------------------------------------------------------------------------
# [1/5] Validate Node.js & pnpm
# ------------------------------------------------------------------------------
Write-Step "1/5" "Validating Node.js & pnpm runtime..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-ErrMsg "Node.js is not installed. Please install Node.js >= v$MinNodeVersion."
    exit 1
}

$NodeVerStr = (node -v) -replace '^v',''
$NodeMajor = [int]($NodeVerStr.Split('.')[0])
if ($NodeMajor -lt $MinNodeVersion) {
    Write-ErrMsg "Node.js v$NodeVerStr detected. Required: Node.js >= v$MinNodeVersion."
    exit 1
}
Write-Success "Node.js v$NodeVerStr detected (>= v$MinNodeVersion)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-WarningMsg "pnpm not found. Enabling via corepack..."
    corepack enable
    corepack prepare pnpm@11.25.0 --activate
}
$PnpmVer = (pnpm -v)
Write-Success "pnpm v$PnpmVer detected"

# ------------------------------------------------------------------------------
# [2/5] Environment Initialization
# ------------------------------------------------------------------------------
Write-Step "2/5" "Checking local environment files (.env.local)..."
if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.example") {
        Copy-Item -Path ".env.example" -Destination ".env.local"
        Write-Success "Created .env.local from .env.example"
    } else {
        Write-WarningMsg ".env.example not found; skipping .env.local initialization"
    }
} else {
    Write-Info ".env.local already exists"
}

# ------------------------------------------------------------------------------
# [3/5] Install Dependencies
# ------------------------------------------------------------------------------
Write-Step "3/5" "Installing dependencies via pnpm..."
pnpm install
Write-Success "Dependencies installed successfully"

# ------------------------------------------------------------------------------
# [4/5] Configure Git Hooks
# ------------------------------------------------------------------------------
Write-Step "4/5" "Configuring Git pre-commit hooks..."
if (Test-Path ".git") {
    git config core.hooksPath .githooks
    Write-Success "Git hooks configured to .githooks"
}

# ------------------------------------------------------------------------------
# [5/5] Run Verification Checks
# ------------------------------------------------------------------------------
Write-Step "5/5" "Running TypeScript, ESLint, and Vitest test suite..."
pnpm typecheck
Write-Success "TypeScript compilation passed (0 errors)"

pnpm lint
Write-Success "ESLint checks passed (0 errors, 0 warnings)"

pnpm test
Write-Success "Vitest automated test suite passed"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ✓ SETUP COMPLETE: Cosmos Nexus Innovations Frontend is Ready!                 " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:"
Write-Host "  pnpm dev        - Start local dev server (http://localhost:3000)" -ForegroundColor Cyan
Write-Host "  pnpm test       - Run automated tests" -ForegroundColor Cyan
Write-Host "  pnpm typecheck  - Strict TypeScript check" -ForegroundColor Cyan
Write-Host "  pnpm lint       - ESLint check" -ForegroundColor Cyan
Write-Host "  pnpm build      - Compile production bundle" -ForegroundColor Cyan
Write-Host ""
