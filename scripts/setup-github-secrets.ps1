# ============================================================
# GitHub Actions Secrets Setup Script
# Run this ONCE to enable auto-deploy on every git push
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GitHub Auto-Deploy Setup for mahean.com  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Check gh CLI ----
Write-Host "[1/5] Checking GitHub CLI..." -ForegroundColor Yellow
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id GitHub.cli -e --silent
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}
Write-Host "  GitHub CLI found." -ForegroundColor Green

# ---- Step 2: GitHub Login ----
Write-Host ""
Write-Host "[2/5] Checking GitHub login..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Not logged in. Opening browser for GitHub login..." -ForegroundColor Yellow
    gh auth login --web --git-protocol https
} else {
    Write-Host "  Already logged in to GitHub." -ForegroundColor Green
}

$REPO = "maheanofficial/website"

# ---- Step 3: Collect cPanel credentials ----
Write-Host ""
Write-Host "[3/5] Enter your cPanel / FTP credentials" -ForegroundColor Yellow
Write-Host "  (These will be saved as GitHub Secrets - NOT stored locally)" -ForegroundColor Gray
Write-Host ""

$CPANEL_HOST     = Read-Host "  cPanel Host/IP (e.g. 88.218.224.4 or server.mahean.com)"
$CPANEL_USER     = Read-Host "  cPanel Username (e.g. mahean)"
$CPANEL_PASSWORD = Read-Host "  cPanel / FTP Password" -AsSecureString
$CPANEL_PASSWORD_Plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($CPANEL_PASSWORD)
)

Write-Host ""
$APP_DIR_Input = Read-Host "  App directory on server (press Enter for default: /home/$CPANEL_USER/main_mahean.com)"
if ([string]::IsNullOrWhiteSpace($APP_DIR_Input)) {
    $CPANEL_APP_DIR = "/home/$CPANEL_USER/main_mahean.com"
} else {
    $CPANEL_APP_DIR = $APP_DIR_Input
}

$APP_DIR_FTP_Input = Read-Host "  FTP app directory (press Enter for default: /main_mahean.com)"
if ([string]::IsNullOrWhiteSpace($APP_DIR_FTP_Input)) {
    $CPANEL_APP_DIR_FTP = "/main_mahean.com"
} else {
    $CPANEL_APP_DIR_FTP = $APP_DIR_FTP_Input
}

$STATIC_DIR_FTP_Input = Read-Host "  FTP static/public_html directory (press Enter for default: /public_html)"
if ([string]::IsNullOrWhiteSpace($STATIC_DIR_FTP_Input)) {
    $CPANEL_STATIC_DIR_FTP = "/public_html"
} else {
    $CPANEL_STATIC_DIR_FTP = $STATIC_DIR_FTP_Input
}

Write-Host ""
Write-Host "  Secrets to be set:" -ForegroundColor Gray
Write-Host "    CPANEL_HOST     = $CPANEL_HOST" -ForegroundColor Gray
Write-Host "    CPANEL_USER     = $CPANEL_USER" -ForegroundColor Gray
Write-Host "    CPANEL_PASSWORD = ********" -ForegroundColor Gray
Write-Host "    CPANEL_APP_DIR  = $CPANEL_APP_DIR" -ForegroundColor Gray
Write-Host "    CPANEL_APP_DIR_FTP     = $CPANEL_APP_DIR_FTP" -ForegroundColor Gray
Write-Host "    CPANEL_STATIC_DIR_FTP  = $CPANEL_STATIC_DIR_FTP" -ForegroundColor Gray
Write-Host "    CPANEL_HEALTHCHECK_URL = https://www.mahean.com/healthz" -ForegroundColor Gray
Write-Host "    DEPLOY_RUN_DB_INIT     = true" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "  Set these secrets on GitHub repo '$REPO'? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 0
}

# ---- Step 4: Set secrets on GitHub ----
Write-Host ""
Write-Host "[4/5] Setting GitHub repository secrets..." -ForegroundColor Yellow

function Set-GhSecret {
    param([string]$Name, [string]$Value)
    Write-Host "  Setting $Name..." -NoNewline
    $Value | gh secret set $Name --repo $REPO
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

Set-GhSecret "CPANEL_HOST"             $CPANEL_HOST
Set-GhSecret "CPANEL_USER"             $CPANEL_USER
Set-GhSecret "CPANEL_PASSWORD"         $CPANEL_PASSWORD_Plain
Set-GhSecret "CPANEL_FTP_PORT"         "21"
Set-GhSecret "CPANEL_APP_DIR"          $CPANEL_APP_DIR
Set-GhSecret "CPANEL_APP_DIR_FTP"      $CPANEL_APP_DIR_FTP
Set-GhSecret "CPANEL_STATIC_DIR_FTP"   $CPANEL_STATIC_DIR_FTP
Set-GhSecret "CPANEL_HEALTHCHECK_URL"  "https://www.mahean.com/healthz"
Set-GhSecret "DEPLOY_RUN_DB_INIT"      "true"
Set-GhSecret "DEPLOY_RUN_DB_FIX_ENCODING" "false"

# Clear password from memory
$CPANEL_PASSWORD_Plain = $null
[System.GC]::Collect()

# ---- Step 5: Trigger test deploy ----
Write-Host ""
Write-Host "[5/5] Triggering a test deployment..." -ForegroundColor Yellow
gh workflow run deploy.yml --repo $REPO --ref main
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Workflow triggered! Watch it at:" -ForegroundColor Green
    Write-Host "  https://github.com/$REPO/actions" -ForegroundColor Cyan
} else {
    Write-Host "  Could not trigger workflow automatically." -ForegroundColor Yellow
    Write-Host "  Go to: https://github.com/$REPO/actions and click 'Run workflow'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "  From now on, every 'git push' to main    " -ForegroundColor Cyan
Write-Host "  will auto-deploy to www.mahean.com       " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
