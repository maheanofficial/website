#!/usr/bin/env python3
"""
Auto deploy script for cPanel FTP — optimised for speed.

Speed improvements vs original:
  • Parallel uploads using a thread pool (WORKERS connections at once)
  • Git-aware: only uploads files changed since the last deploy tag/ref
    (set DEPLOY_FULL=true env var to force a full upload)
  • Skips the `scripts/` directory (server doesn't need deploy helpers)
  • Skips `node_modules`, build-cache artefacts, and other junk

Expected local config (ignored by git): .deploy.local.json
{
  "host": "122.165.242.4",
  "user": "mahean",
  "password": "secret",
  "port": 21,
  "app_dir": "/main_mahean.com",
  "static_dir": "/public_html",
  "healthcheck_url": "https://www.mahean.com/healthz"
}
"""

from __future__ import annotations

import argparse
import ftplib
import json
import os
import posixpath
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / ".deploy.local.json"
SEO_FILES = ("ads.txt", "sitemap.xml", "robots.txt")
WORKERS = 8          # parallel FTP connections
DEPLOY_TAG = "last-ftp-deploy"   # git tag used to track last deploy


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_log_lock = threading.Lock()


def _log(message: str) -> None:
    with _log_lock:
        print(f"[auto-deploy] {message}", flush=True)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def _load_config() -> Dict[str, str]:
    config: Dict[str, str] = {}
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open("r", encoding="utf-8-sig") as fh:
            payload = json.load(fh)
            if isinstance(payload, dict):
                config.update(
                    {str(k): str(v) for k, v in payload.items() if v is not None}
                )

    env_map = {
        "host":             "CPANEL_FTP_HOST",
        "user":             "CPANEL_FTP_USER",
        "password":         "CPANEL_FTP_PASSWORD",
        "port":             "CPANEL_FTP_PORT",
        "app_dir":          "CPANEL_APP_DIR_FTP",
        "static_dir":       "CPANEL_STATIC_DIR_FTP",
        "healthcheck_url":  "CPANEL_HEALTHCHECK_URL",
    }
    for key, env_name in env_map.items():
        val = os.environ.get(env_name, "").strip()
        if val:
            config[key] = val

    config.setdefault("port", "21")
    config.setdefault("app_dir", "/main_mahean.com")
    config.setdefault("static_dir", "/public_html")
    config.setdefault("healthcheck_url", "https://www.mahean.com/healthz")

    missing = [n for n in ("host", "user", "password") if not config.get(n)]
    if missing:
        raise SystemExit(
            f"Missing deploy config fields: {', '.join(missing)}. "
            "Set them in .deploy.local.json or CPANEL_FTP_HOST/USER/PASSWORD env vars."
        )
    return config


# ---------------------------------------------------------------------------
# Git helpers — find only changed files since last deploy
# ---------------------------------------------------------------------------

def _git_changed_files(since_ref: str) -> Optional[List[str]]:
    """Return list of repo-relative paths changed since *since_ref*, or None on error."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=ACM", since_ref, "HEAD"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return None
        return [p.strip() for p in result.stdout.splitlines() if p.strip()]
    except Exception:
        return None


def _last_deploy_ref() -> Optional[str]:
    """Return the git ref of the last successful deploy tag, or None."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", DEPLOY_TAG],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None


def _tag_deploy() -> None:
    """Move the last-deploy tag to HEAD."""
    try:
        subprocess.run(
            ["git", "tag", "-f", DEPLOY_TAG],
            cwd=ROOT,
            capture_output=True,
            timeout=10,
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# File collection
# ---------------------------------------------------------------------------

# Directories to deploy (scripts/ excluded — server doesn't need them)
DEPLOY_DIRS = ("api", "dist")
DEPLOY_FILES = ("package.json", "package-lock.json", "server.js")


def _is_problem_story_path(rel: str) -> bool:
    if not rel.startswith("dist/stories/"):
        return False
    if rel == "dist/stories/index.html":
        return False
    try:
        rel.encode("ascii")
        return False
    except UnicodeEncodeError:
        return True


def _collect_all_uploads() -> List[Tuple[Path, str]]:
    uploads: List[Tuple[Path, str]] = []
    for top in DEPLOY_DIRS:
        local_dir = ROOT / top
        if not local_dir.exists():
            continue
        for f in local_dir.rglob("*"):
            if not f.is_file():
                continue
            rel = f.relative_to(ROOT).as_posix()
            if _is_problem_story_path(rel):
                continue
            uploads.append((f, rel))
    for fname in DEPLOY_FILES:
        lf = ROOT / fname
        if lf.exists():
            uploads.append((lf, fname))
    uploads.sort(key=lambda x: x[1])
    return uploads


def _collect_changed_uploads(changed: List[str]) -> List[Tuple[Path, str]]:
    changed_set = set(changed)
    uploads: List[Tuple[Path, str]] = []
    for top in DEPLOY_DIRS:
        local_dir = ROOT / top
        if not local_dir.exists():
            continue
        for f in local_dir.rglob("*"):
            if not f.is_file():
                continue
            rel = f.relative_to(ROOT).as_posix()
            if rel not in changed_set:
                continue
            if _is_problem_story_path(rel):
                continue
            uploads.append((f, rel))
    for fname in DEPLOY_FILES:
        if fname in changed_set:
            lf = ROOT / fname
            if lf.exists():
                uploads.append((lf, fname))
    uploads.sort(key=lambda x: x[1])
    return uploads


# ---------------------------------------------------------------------------
# FTP helpers
# ---------------------------------------------------------------------------

_dir_cache: set[str] = set()
_dir_lock = threading.Lock()


def _make_ftp(config: Dict[str, str]) -> ftplib.FTP:
    ftp = ftplib.FTP()
    ftp.connect(config["host"], int(config["port"]), timeout=60)
    ftp.login(config["user"], config["password"])
    ftp.set_pasv(True)
    return ftp


def _ensure_remote_dir(ftp: ftplib.FTP, remote_dir: str) -> None:
    norm = remote_dir.replace("\\", "/").strip("/")
    parts = norm.split("/")
    current = ""
    for part in parts:
        if not part:
            continue
        current = f"{current}/{part}"
        with _dir_lock:
            if current in _dir_cache:
                continue
        try:
            ftp.mkd(current)
        except ftplib.error_perm:
            pass
        with _dir_lock:
            _dir_cache.add(current)


def _upload_one(config: Dict[str, str], local_file: Path, remote_file: str) -> None:
    ftp = _make_ftp(config)
    try:
        _ensure_remote_dir(ftp, posixpath.dirname(remote_file))
        with local_file.open("rb") as fh:
            ftp.storbinary(f"STOR {remote_file}", fh)
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


# ---------------------------------------------------------------------------
# Upload bundle (parallel)
# ---------------------------------------------------------------------------

def _upload_bundle(config: Dict[str, str], uploads: List[Tuple[Path, str]], dry_run: bool) -> None:
    app_dir = config["app_dir"].rstrip("/") or "/"
    _log(f"Uploading {len(uploads)} files → {app_dir}  (workers={WORKERS})")

    if dry_run:
        _log("Dry run — no files uploaded.")
        return

    failures: List[str] = []
    completed = [0]
    total = len(uploads)

    def task(item: Tuple[Path, str]) -> Optional[str]:
        local_file, rel = item
        remote_file = posixpath.join(app_dir, rel)
        try:
            _upload_one(config, local_file, remote_file)
        except ftplib.all_errors as exc:
            if rel.startswith("dist/stories/"):
                return f"skip:{rel}:{exc}"
            raise
        with _dir_lock:
            completed[0] += 1
            done = completed[0]
        if done % 50 == 0 or done == total:
            _log(f"  {done}/{total} uploaded")
        return None

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(task, item): item for item in uploads}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                failures.append(result)

    if failures:
        _log(f"Skipped {len(failures)} story files due to FTP limitations")

    # SEO files → both app_dir and static_dir
    for file_name in SEO_FILES:
        local_dist = ROOT / "dist" / file_name
        if not local_dist.exists():
            continue
        app_target = posixpath.join(app_dir, file_name)
        static_target = posixpath.join(config["static_dir"].rstrip("/") or "/", file_name)
        _upload_one(config, local_dist, app_target)
        _upload_one(config, local_dist, static_target)

    # Touch tmp/restart.txt to restart Passenger
    restart_payload = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=ROOT) as tmp:
        tmp.write(restart_payload)
        temp_path = Path(tmp.name)
    try:
        _upload_one(config, temp_path, posixpath.join(app_dir, "tmp", "restart.txt"))
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def _wait_for_healthcheck(url: str, dry_run: bool) -> bool:
    if dry_run:
        return True
    for attempt in range(1, 31):
        try:
            with urllib.request.urlopen(url, timeout=12) as resp:
                body = resp.read().decode("utf-8", errors="ignore").strip().lower()
                if resp.status == 200 and body == "ok":
                    _log("Health check passed ✓")
                    return True
        except Exception:
            pass
        _log(f"Waiting for health check ({attempt}/30)")
        time.sleep(4)
    return False


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Fast parallel cPanel FTP deploy.")
    parser.add_argument("--build",    action="store_true", help="Run npm run build first.")
    parser.add_argument("--full",     action="store_true", help="Upload all files (ignore git diff).")
    parser.add_argument("--dry-run",  action="store_true", help="List actions without uploading.")
    args = parser.parse_args()

    config = _load_config()
    force_full = args.full or os.environ.get("DEPLOY_FULL", "").lower() in ("1", "true", "yes")

    if args.build:
        _log("Building…")
        cmd = ["npm.cmd" if os.name == "nt" else "npm", "run", "build"]
        subprocess.run(cmd, cwd=ROOT, check=True)

    # Decide which files to upload
    if force_full:
        _log("Full deploy requested — uploading all files.")
        uploads = _collect_all_uploads()
    else:
        last_ref = _last_deploy_ref()
        if last_ref:
            changed = _git_changed_files(last_ref)
            if changed is not None and changed:
                _log(f"Incremental deploy — {len(changed)} file(s) changed since last deploy.")
                uploads = _collect_changed_uploads(changed)
                if not uploads:
                    _log("No deployable files changed. Deploy skipped.")
                    _tag_deploy()
                    return 0
            else:
                _log("No git changes detected. Falling back to full deploy.")
                uploads = _collect_all_uploads()
        else:
            _log("No previous deploy tag found — performing full deploy.")
            uploads = _collect_all_uploads()

    _upload_bundle(config, uploads, dry_run=args.dry_run)

    if not args.dry_run:
        _tag_deploy()

    if not _wait_for_healthcheck(config["healthcheck_url"], dry_run=args.dry_run):
        _log("Health check failed ✗")
        return 1

    _log("Deploy complete ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
