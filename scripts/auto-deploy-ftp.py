import os
import sys
import ftplib
import hashlib
import json
import urllib.request
import concurrent.futures
from pathlib import Path
from typing import Dict, List, Set

ROOT = Path(__file__).resolve().parent.parent

# Files/Dirs to sync
BUNDLE_DIRS = ("api", "dist", "scripts", "data-export", "uploads")
BUNDLE_FILES = ("package.json", "package-lock.json", "server.js", ".env.cpanel")

def _log(msg: str):
    print(f"[auto-deploy] {msg}", flush=True)

def _get_md5(path: Path) -> str:
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def _load_config() -> Dict[str, str]:
    required = [
        "CPANEL_FTP_HOST", "CPANEL_FTP_USER", "CPANEL_FTP_PASSWORD",
        "CPANEL_APP_DIR_FTP", "CPANEL_HEALTHCHECK_URL"
    ]
    conf = {}
    for r in required:
        val = os.environ.get(r)
        if not val:
            print(f"Error: Environment variable {r} is missing.")
            sys.exit(1)
        conf[r.replace("CPANEL_FTP_", "").replace("CPANEL_", "").lower()] = val
    conf["port"] = int(os.environ.get("CPANEL_FTP_PORT", "21"))
    return conf

def _ensure_remote_dir(ftp: ftplib.FTP, remote_path: str):
    parts = remote_path.strip("/").split("/")
    current = ""
    for p in parts:
        current += "/" + p
        try:
            ftp.mkd(current)
        except ftplib.error_perm:
            pass

def _upload_file(host, user, password, port, local_file: Path, remote_file: str):
    try:
        with ftplib.FTP() as ftp:
            ftp.connect(host, port, timeout=30)
            ftp.login(user, password)
            _ensure_remote_dir(ftp, os.path.dirname(remote_file))
            with open(local_file, "rb") as f:
                ftp.storbinary(f"STOR {remote_file}", f)
    except Exception as e:
        _log(f"Failed to upload {local_file.name}: {e}")
        raise

def main():
    config = _load_config()
    _log(f"Starting parallel sync to {config['host']}...")

    # 1. Collect local files and hashes
    local_files: Dict[str, str] = {}
    
    for dname in BUNDLE_DIRS:
        dpath = ROOT / dname
        if dpath.exists():
            for p in dpath.rglob("*"):
                if p.is_file():
                    rel = p.relative_to(ROOT).as_posix()
                    local_files[rel] = _get_md5(p)
    
    for fname in BUNDLE_FILES:
        fpath = ROOT / fname
        if fpath.exists():
            rel = fpath.relative_to(ROOT).as_posix()
            local_files[rel] = _get_md5(fpath)

    # 2. Get remote manifest (if exists)
    remote_manifest: Dict[str, str] = {}
    try:
        with ftplib.FTP() as ftp:
            ftp.connect(config["host"], config["port"], timeout=30)
            ftp.login(config["user"], config["password"])
            manifest_path = f"{config['app_dir_ftp']}/.deploy_manifest.json"
            
            import io
            r = io.BytesIO()
            ftp.retrbinary(f"RETR {manifest_path}", r.write)
            remote_manifest = json.loads(r.getvalue().decode())
    except Exception:
        _log("No remote manifest found. Performing full sync.")

    # 3. Determine files to upload
    to_upload: List[str] = []
    for rel, md5 in local_files.items():
        if remote_manifest.get(rel) != md5:
            to_upload.append(rel)

    if not to_upload:
        _log("Everything is up to date!")
    else:
        _log(f"Uploading {len(to_upload)} changed files...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for rel in to_upload:
                local_path = ROOT / rel
                remote_path = f"{config['app_dir_ftp']}/{rel}"
                futures.append(executor.submit(
                    _upload_file, 
                    config["host"], config["user"], config["password"], config["port"],
                    local_path, remote_path
                ))
            concurrent.futures.wait(futures)
            
            # Check for failures
            for f in futures:
                if f.exception():
                    _log("One or more uploads failed. Sync incomplete.")
                    sys.exit(1)

    # 4. Upload new manifest
    try:
        with ftplib.FTP() as ftp:
            ftp.connect(config["host"], config["port"], timeout=30)
            ftp.login(config["user"], config["password"])
            manifest_path = f"{config['app_dir_ftp']}/.deploy_manifest.json"
            
            manifest_json = json.dumps(local_files).encode()
            import io
            ftp.storbinary(f"STOR {manifest_path}", io.BytesIO(manifest_json))
            
            # Trigger app restart (cPanel)
            try:
                ftp.mkd(f"{config['app_dir_ftp']}/tmp")
            except: pass
            with io.BytesIO(b"") as f:
                ftp.storbinary(f"STOR {config['app_dir_ftp']}/tmp/restart.txt", f)
    except Exception as e:
        _log(f"Failed to update manifest: {e}")

    # 5. Trigger Data Sync via Node.js API
    _log("Triggering database sync via Node.js API...")
    sync_url = f"{config['healthcheck_url'].rstrip('/')}/api/sync-data?key=sync_default_secret_9988"
    try:
        with urllib.request.urlopen(sync_url, timeout=60) as response:
            res_data = json.loads(response.read().decode())
            _log(f"Sync Result: {res_data.get('message', 'Done')}")
    except Exception as e:
        _log(f"Warning: Data sync trigger failed: {e}")

    # 6. Final Health Check
    _log("Verifying site health...")
    try:
        with urllib.request.urlopen(config['healthcheck_url'], timeout=30) as response:
            if response.status == 200:
                _log("Site is healthy! ✅")
            else:
                _log(f"Site returned status {response.status} ⚠️")
    except Exception as e:
        _log(f"Health check failed: {e} ❌")

if __name__ == "__main__":
    main()
