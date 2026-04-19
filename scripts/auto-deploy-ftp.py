#!/usr/bin/env python3
import os
import sys
import argparse
import ftplib
import zipfile
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DEPLOY_TAG = "last-ftp-deploy"

# Files/Dirs to include in the bundle
BUNDLE_DIRS = ("api", "dist", "scripts", "data-export")
BUNDLE_FILES = ("package.json", "package-lock.json", "server.js", ".env.cpanel")

def _log(msg: str):
    print(f"[auto-deploy] {msg}", flush=True)

def _load_config() -> Dict[str, str]:
    required = [
        "CPANEL_FTP_HOST", "CPANEL_FTP_USER", "CPANEL_FTP_PASSWORD",
        "CPANEL_APP_DIR_FTP", "CPANEL_STATIC_DIR_FTP", "CPANEL_HEALTHCHECK_URL"
    ]
    conf = {}
    for r in required:
        val = os.environ.get(r)
        if not val:
            print(f"Error: Environment variable {r} is missing.")
            sys.exit(1)
        conf[r.replace("CPANEL_FTP_", "").replace("CPANEL_", "").lower()] = val
    conf["port"] = os.environ.get("CPANEL_FTP_PORT", "21")
    return conf

# ---------------------------------------------------------------------------
# Bundling
# ---------------------------------------------------------------------------

def _create_bundle(zip_path: Path):
    _log(f"Creating bundle: {zip_path.name}")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add directories
        for dname in BUNDLE_DIRS:
            dpath = ROOT / dname
            if dpath.exists():
                for f in dpath.rglob("*"):
                    if f.is_file():
                        rel = f.relative_to(ROOT)
                        zf.write(f, rel)
        # Add files
        for fname in BUNDLE_FILES:
            fpath = ROOT / fname
            if fpath.exists():
                zf.write(fpath, fname)

def _create_php_extractor(zip_name: str, app_dir_rel: str) -> str:
    # A simple PHP script to extract the zip and then delete itself and the zip.
    # It also touches tmp/restart.txt to restart the Node app.
    return f"""<?php
header('Content-Type: text/plain');
// Path to zip relative to this PHP script (e.g. ../main_mahean.com/zip)
$zipFile = __DIR__ . '/{app_dir_rel}/{zip_name}';
$extractTo = __DIR__ . '/{app_dir_rel}';

if (!file_exists($zipFile)) {{
    // Try absolute path if relative fails (for some cPanel setups)
    $zipFile = "{app_dir_rel}/" . "{zip_name}";
    $extractTo = "{app_dir_rel}";
}}

if (!file_exists($zipFile)) {{
    die("Error: Zip file not found at $zipFile");
}}

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {{
    echo "Extracting $zipFile to $extractTo\\n";
    $zip->extractTo($extractTo);
    $zip->close();
    echo "Extraction successful!\\n";
}} else {{
    die("Error: Could not open zip file.");
}}

// Optional: Run migration if node is available
$output = [];
$return_var = 0;
chdir($extractTo);
exec('node scripts/migrate-json-to-mysql.cjs 2>&1', $output, $return_var);
echo "Migration Status: " . ($return_var === 0 ? "Success" : "Failed") . "\\n";
echo implode("\\n", $output) . "\\n";

// Restart Node app
$restartFile = $extractTo . '/tmp/restart.txt';
if (!is_dir($extractTo . '/tmp')) mkdir($extractTo . '/tmp', 0755, true);
file_put_contents($restartFile, time());
echo "Restarted Node app via tmp/restart.txt\\n";

// Cleanup
unlink($zipFile);
unlink(__FILE__);
echo "Cleanup complete. Deployment finished.";
?>"""

# ---------------------------------------------------------------------------
# Deployment
# ---------------------------------------------------------------------------

def _upload_file(ftp: ftplib.FTP, local_path: Path, remote_path: str):
    _log(f"Uploading {local_path.name} -> {remote_path}")
    with open(local_path, "rb") as f:
        ftp.storbinary(f"STOR {remote_path}", f)

def main():
    config = _load_config()
    zip_name = f"deploy_{int(time.time())}.zip"
    php_name = "deploy_extract.php"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        zip_path = tmp_path / zip_name
        php_path = tmp_path / php_name
        
        # 1. Bundle
        _create_bundle(zip_path)
        
        # 2. PHP Extractor
        # We need the relative path from static_dir to app_dir for PHP
        # E.g. static is /public_html, app is /main_mahean.com
        # Relative is ../main_mahean.com
        app_dir_rel = os.path.relpath(config["app_dir_ftp"], config["static_dir_ftp"])
        
        with open(php_path, "w") as f:
            f.write(_create_php_extractor(zip_name, app_dir_rel))
            
        # 3. FTP Upload
        _log(f"Connecting to {config['host']}...")
        ftp = ftplib.FTP()
        ftp.connect(config["host"], int(config["port"]))
        ftp.login(config["user"], config["password"])
        ftp.set_pasv(True)
        
        # Upload Zip to app directory
        ftp.cwd(config["app_dir_ftp"])
        _upload_file(ftp, zip_path, zip_name)
        
        # Upload PHP to static directory
        ftp.cwd(config["static_dir_ftp"])
        _upload_file(ftp, php_path, php_name)
        ftp.quit()
        
        # 4. Trigger Extraction
        trigger_url = f"{config['healthcheck_url'].replace('/healthz', '')}/{php_name}"
        _log(f"Triggering extraction via {trigger_url}...")
        try:
            with urllib.request.urlopen(trigger_url, timeout=300) as resp:
                result = resp.read().decode("utf-8")
                print(result)
        except Exception as e:
            _log(f"Warning: Extraction trigger failed or timed out: {e}")
            _log("The extraction might still be running on the server.")

        # 5. Wait for Health Check
        _log("Waiting for app to restart...")
        time.sleep(5)
        success = False
        for attempt in range(1, 16):
            try:
                with urllib.request.urlopen(config["healthcheck_url"], timeout=10) as resp:
                    if resp.status == 200 and resp.read().decode("utf-8").strip().lower() == "ok":
                        _log("Health check passed ✓")
                        success = True
                        break
            except:
                pass
            _log(f"Waiting for health check ({attempt}/15)...")
            time.sleep(10)
            
        if not success:
            _log("Health check failed ✗")
            sys.exit(1)
            
        _log("Deploy complete! The site should be updated and data synced.")

if __name__ == "__main__":
    main()
