param(
    [Parameter(Mandatory = $true)]
    [Alias('Host')]
    [string]$CpanelHost,
    [Parameter(Mandatory = $true)]
    [string]$User,
    [int]$Port = 22,
    [string]$KeyPath = "$HOME/.ssh/id_rsa",
    [string]$AppDir = "/home/mahean/main_mahean.com",
    [string]$NodeVenvActivate = "/home/mahean/nodevenv/main_mahean.com/20/bin/activate",
    [string]$HealthcheckUrl = "https://www.mahean.com/healthz",
    [switch]$BuildFirst
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"
Assert-Command "npm"

if ($BuildFirst) {
    Write-Host "Installing dependencies and building project..."
    npm ci
    npm run build
}

$repoRoot = Resolve-Path "$PSScriptRoot/.."
$tmpDir = Join-Path $repoRoot ".deploy-tmp"
$archivePath = Join-Path $repoRoot "deploy.tgz"

if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }

New-Item -ItemType Directory -Path $tmpDir | Out-Null
Copy-Item "$repoRoot/api" "$tmpDir/api" -Recurse -Force
Copy-Item "$repoRoot/dist" "$tmpDir/dist" -Recurse -Force
Copy-Item "$repoRoot/scripts" "$tmpDir/scripts" -Recurse -Force
Copy-Item "$repoRoot/package.json" "$tmpDir/package.json" -Force
Copy-Item "$repoRoot/package-lock.json" "$tmpDir/package-lock.json" -Force
Copy-Item "$repoRoot/server.js" "$tmpDir/server.js" -Force

Push-Location $tmpDir
try {
    tar -czf $archivePath .
} finally {
    Pop-Location
}

Write-Host "Uploading deploy bundle..."
$remoteBundle = "/home/$User/deploy.tgz"
scp -i $KeyPath -P $Port $archivePath "$User@$CpanelHost`:$remoteBundle"

Write-Host "Applying deploy on server..."
$remoteScript = @"
set -e
cd "$AppDir"
tar -xzf "$remoteBundle" -C "$AppDir"
rm -f "$remoteBundle"
source "$NodeVenvActivate"
if ! npm install --omit=dev --no-audit --no-fund; then
  echo "[deploy] warning: npm install failed; continuing with existing node_modules if present."
  if [ ! -d node_modules ]; then
    echo "[deploy] node_modules missing and npm install failed."
    exit 1
  fi
fi
PUBLIC_HTACCESS="/home/$User/public_html/.htaccess"
if [ -f "$PUBLIC_HTACCESS" ] && grep -q 'PassengerStartupFile server.js' "$PUBLIC_HTACCESS" && ! grep -q 'PassengerForceMaxConcurrentRequestsPerProcess 0' "$PUBLIC_HTACCESS"; then
  awk '
    { print }
    /PassengerStartupFile server\.js/ {
      print "PassengerForceMaxConcurrentRequestsPerProcess 0"
    }
  ' "$PUBLIC_HTACCESS" > "$PUBLIC_HTACCESS.tmp"
  mv "$PUBLIC_HTACCESS.tmp" "$PUBLIC_HTACCESS"
fi
mkdir -p tmp
touch tmp/restart.txt
"@

ssh -i $KeyPath -p $Port "$User@$CpanelHost" $remoteScript

Write-Host "Waiting for health check..."
$ok = $false
for ($i = 1; $i -le 18; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $HealthcheckUrl -UseBasicParsing -TimeoutSec 15
        if ($resp.StatusCode -eq 200 -and $resp.Content.Trim().ToLower() -eq "ok") {
            $ok = $true
            break
        }
    } catch {
        # Retry.
    }
    Start-Sleep -Seconds 5
}

if (-not $ok) {
    throw "Health check failed: $HealthcheckUrl"
}

Write-Host "Deploy complete and healthy."

# Cleanup local temp files
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
