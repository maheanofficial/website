param(
    [string]$FtpHost     = "122.165.242.4",
    [string]$FtpUser     = "mahean",
    [string]$FtpPassword = "k4a9W6]8Xsb;EH",
    [string]$AppDir      = "/home/mahean/main_mahean.com",
    [string]$LocalRoot   = (Resolve-Path "$PSScriptRoot\..")
)

$ErrorActionPreference = "Stop"
$UploadDirs  = @("api", "dist", "scripts", "data-export")
$UploadFiles = @("package.json", "package-lock.json", "server.js")

function EnsureRemoteDir($path) {
    $uri = "ftp://$FtpHost$path"
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Method      = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $req.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
    $req.UsePassive  = $true
    $req.UseBinary   = $true
    $req.KeepAlive   = $false
    try { $req.GetResponse().Close() } catch { }
}

function UploadFile($localPath, $remotePath) {
    $uri = "ftp://$FtpHost$remotePath"
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Method      = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
    $req.UsePassive  = $true
    $req.UseBinary   = $true
    $req.KeepAlive   = $false

    $bytes = [System.IO.File]::ReadAllBytes($localPath)
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $req.GetResponse().Close()
    Write-Host "  OK  $remotePath" -ForegroundColor Green
}

function UploadDir($localDir, $remoteDir) {
    EnsureRemoteDir $remoteDir
    foreach ($item in Get-ChildItem $localDir) {
        $remotePath = "$remoteDir/$($item.Name)"
        if ($item.PSIsContainer) {
            UploadDir $item.FullName $remotePath
        } else {
            UploadFile $item.FullName $remotePath
        }
    }
}

Write-Host "`n==> Deploying to $FtpHost$AppDir`n" -ForegroundColor Cyan
EnsureRemoteDir $AppDir

foreach ($dir in $UploadDirs) {
    $local = Join-Path $LocalRoot $dir
    if (Test-Path $local) {
        Write-Host "[DIR] $dir" -ForegroundColor Yellow
        UploadDir $local "$AppDir/$dir"
    } else {
        Write-Host "[SKIP] $dir (not found)" -ForegroundColor DarkGray
    }
}

foreach ($file in $UploadFiles) {
    $local = Join-Path $LocalRoot $file
    if (Test-Path $local) {
        Write-Host "[FILE] $file" -ForegroundColor Yellow
        UploadFile $local "$AppDir/$file"
    } else {
        Write-Host "[SKIP] $file (not found)" -ForegroundColor DarkGray
    }
}

Write-Host "`n==> Deploy complete!" -ForegroundColor Cyan
Write-Host "Visit https://www.mahean.com to verify." -ForegroundColor White
