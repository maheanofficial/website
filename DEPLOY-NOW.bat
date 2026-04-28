@echo off
REM =====================================================
REM  One-click cPanel deploy for mahean.com
REM  Just double-click this file to push dist/ to live.
REM =====================================================

setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo   mahean.com - cPanel FTP Deploy
echo ======================================================
echo.

REM --- Clean stray .fresh backup files (left over from prior recovery) ---
del /q /s "%~dp0src\*.fresh" >nul 2>&1

REM --- Optional: regenerate thumbnails + rebuild before deploy. ---
REM     DEPLOY-NOW.bat               -> just upload existing dist/
REM     DEPLOY-NOW.bat build         -> npm run build, then upload
REM     DEPLOY-NOW.bat full          -> regenerate thumbnails + build + upload
set MODE=upload
if /i "%~1"=="build" set MODE=build
if /i "%~1"=="--build" set MODE=build
if /i "%~1"=="full" set MODE=full
if /i "%~1"=="--full" set MODE=full

if "%MODE%"=="full" (
    echo [1a/4] Regenerating story thumbnails with Li Subha Letterpress Unicode font...
    call node scripts\regenerate-story-thumbnails.cjs
    if errorlevel 1 (
        echo.
        echo THUMBNAIL REGENERATION FAILED. Aborting deploy.
        pause
        exit /b 1
    )
)

if "%MODE%"=="full" goto DOBUILD
if "%MODE%"=="build" goto DOBUILD
goto SKIPBUILD

:DOBUILD
echo.
echo [1b/4] Building production bundle...
call npm run build
if errorlevel 1 (
    echo.
    echo BUILD FAILED. Aborting deploy.
    pause
    exit /b 1
)
goto AFTERBUILD

:SKIPBUILD
echo [1/3] Skipping build ^(using existing dist/^).
echo       Run "DEPLOY-NOW.bat build" for fresh build,
echo       or "DEPLOY-NOW.bat full" to also regenerate thumbnails.

:AFTERBUILD
echo.
echo [2/3] Uploading files to cPanel via FTP...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-ftp.ps1"
if errorlevel 1 (
    echo.
    echo FTP UPLOAD FAILED.
    pause
    exit /b 1
)

echo.
echo [3/3] Triggering app restart on cPanel...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ftp='ftp://122.165.242.4/home/mahean/main_mahean.com/tmp/restart.txt';" ^
    "try{ $r=[System.Net.FtpWebRequest]::Create('ftp://122.165.242.4/home/mahean/main_mahean.com/tmp'); $r.Method='MKD'; $r.Credentials=New-Object System.Net.NetworkCredential('mahean','k4a9W6]8Xsb;EH'); $r.UsePassive=$true; try{$r.GetResponse().Close()}catch{} }catch{};" ^
    "$req=[System.Net.FtpWebRequest]::Create($ftp); $req.Method='STOR'; $req.Credentials=New-Object System.Net.NetworkCredential('mahean','k4a9W6]8Xsb;EH'); $req.UsePassive=$true; $req.UseBinary=$true; $bytes=New-Object byte[] 0; $req.ContentLength=0; $s=$req.GetRequestStream(); $s.Close(); $req.GetResponse().Close(); Write-Host '  OK  restart.txt uploaded' -ForegroundColor Green"

echo.
echo ======================================================
echo   Deploy complete! Verifying live site...
echo ======================================================
timeout /t 5 /nobreak >nul
powershell -NoProfile -Command ^
    "try { $r = Invoke-WebRequest -Uri 'https://www.mahean.com/healthz' -UseBasicParsing -TimeoutSec 30; Write-Host ('  Health: ' + $r.StatusCode + ' / ' + $r.Content) -ForegroundColor Green } catch { Write-Host ('  Health check failed: ' + $_.Exception.Message) -ForegroundColor Yellow }"

echo.
echo Open https://www.mahean.com to see your changes.
echo.
pause
endlocal
