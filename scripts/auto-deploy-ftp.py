#!/usr/bin/env python3
"""
Auto deploy script for cPanel FTP.

Expected local config file (ignored by git): .deploy.local.json
Example:
{
  "host": "88.218.224.4",
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
import time
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / ".deploy.local.json"
SEO_FILES = ("ads.txt", "sitemap.xml", "robots.txt")


def _log(message: str) -> None:
    print(f"[auto-deploy] {message}", flush=True)


def _load_config() -> Dict[str, str]:
    config: Dict[str, str] = {}
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open("r", encoding="utf-8-sig") as fh:
            payload = json.load(fh)
            if isinstance(payload, dict):
                config.update({str(key): str(value) for key, value in payload.items() if value is not None})

    env_map = {
        "host": "CPANEL_FTP_HOST",
        "user": "CPANEL_FTP_USER",
        "password": "CPANEL_FTP_PASSWORD",
        "port": "CPANEL_FTP_PORT",
        "app_dir": "CPANEL_APP_DIR_FTP",
        "static_dir": "CPANEL_STATIC_DIR_FTP",
        "healthcheck_url": "CPANEL_HEALTHCHECK_URL",
    }
    for key, env_name in env_map.items():
        env_value = os.environ.get(env_name, "").strip()
        if env_value:
            config[key] = env_value

    if "port" not in config:
        config["port"] = "21"
    if "app_dir" not in config:
        config["app_dir"] = "/main_mahean.com"
    if "static_dir" not in config:
        config["static_dir"] = "/public_html"
    if "healthcheck_url" not in config:
        config["healthcheck_url"] = "https://www.mahean.com/healthz"

    missing = [name for name in ("host", "user", "password") if not config.get(name)]
    if missing:
        joined = ", ".join(missing)
        raise SystemExit(
            f"Missing deploy config fields: {joined}. "
            "Set them in .deploy.local.json or env vars CPANEL_FTP_HOST/USER/PASSWORD."
        )

    return config


def _run_command(command: List[str]) -> None:
    if os.name == "nt" and command and command[0] == "npm":
        command = ["npm.cmd", *command[1:]]
    _log(f"Running: {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True)


def _ensure_remote_dir(ftp: ftplib.FTP, remote_dir: str) -> None:
    normalized = remote_dir.replace("\\", "/").strip()
    if not normalized.startswith("/"):
        normalized = "/" + normalized

    current = ""
    for part in (segment for segment in normalized.split("/") if segment):
        current = f"{current}/{part}"
        try:
            ftp.mkd(current)
        except ftplib.error_perm:
            # Already exists or no permission to create. Existing dirs are fine.
            pass


def _upload_file(ftp: ftplib.FTP, local_file: Path, remote_file: str) -> None:
    _ensure_remote_dir(ftp, posixpath.dirname(remote_file))
    with local_file.open("rb") as fh:
        ftp.storbinary(f"STOR {remote_file}", fh)


def _is_problem_story_path(relative_path: str) -> bool:
    # Some FTP servers reject unicode story slugs. Keep the index page and ASCII paths only.
    if not relative_path.startswith("dist/stories/"):
        return False
    if relative_path == "dist/stories/index.html":
        return False
    try:
        relative_path.encode("ascii")
        return False
    except UnicodeEncodeError:
        return True


def _collect_uploads() -> List[Tuple[Path, str]]:
    uploads: List[Tuple[Path, str]] = []

    top_dirs = ("api", "dist", "scripts")
    for top in top_dirs:
        local_dir = ROOT / top
        if not local_dir.exists():
            continue
        for local_file in local_dir.rglob("*"):
            if not local_file.is_file():
                continue
            rel = local_file.relative_to(ROOT).as_posix()
            if _is_problem_story_path(rel):
                continue
            uploads.append((local_file, rel))

    for file_name in ("package.json", "package-lock.json", "server.js"):
        local_file = ROOT / file_name
        if local_file.exists():
            uploads.append((local_file, file_name))

    uploads.sort(key=lambda item: item[1])
    return uploads


def _upload_bundle(ftp: ftplib.FTP, config: Dict[str, str], dry_run: bool) -> None:
    uploads = _collect_uploads()
    app_dir = config["app_dir"].rstrip("/") or "/"

    _log(f"Preparing to upload {len(uploads)} files to {app_dir}")
    failures: List[str] = []

    for index, (local_file, rel_posix) in enumerate(uploads, start=1):
        remote_file = posixpath.join(app_dir, rel_posix)
        if dry_run:
            continue
        try:
            _upload_file(ftp, local_file, remote_file)
        except ftplib.all_errors as exc:
            # Allow story page edge cases to skip without stopping full deploy.
            if rel_posix.startswith("dist/stories/"):
                failures.append(f"skip:{rel_posix}:{exc}")
                continue
            raise
        if index % 50 == 0 or index == len(uploads):
            _log(f"Uploaded {index}/{len(uploads)}")

    if failures:
        _log(f"Skipped {len(failures)} story files due FTP limitations")

    for file_name in SEO_FILES:
        local_dist = ROOT / "dist" / file_name
        if not local_dist.exists():
            continue
        app_target = posixpath.join(app_dir, file_name)
        static_target = posixpath.join(config["static_dir"].rstrip("/") or "/", file_name)
        if not dry_run:
            _upload_file(ftp, local_dist, app_target)
            _upload_file(ftp, local_dist, static_target)

    restart_payload = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=ROOT) as tmp:
        tmp.write(restart_payload)
        temp_path = Path(tmp.name)

    try:
        restart_target = posixpath.join(app_dir, "tmp", "restart.txt")
        if not dry_run:
            _upload_file(ftp, temp_path, restart_target)
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass


def _wait_for_healthcheck(url: str, dry_run: bool) -> bool:
    if dry_run:
        return True

    for attempt in range(1, 31):
        try:
            with urllib.request.urlopen(url, timeout=12) as response:
                body = response.read().decode("utf-8", errors="ignore").strip().lower()
                if response.status == 200 and body == "ok":
                    _log("Health check passed")
                    return True
        except Exception:
            pass
        _log(f"Waiting for health check ({attempt}/30)")
        time.sleep(4)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy current repo to cPanel over FTP.")
    parser.add_argument("--build", action="store_true", help="Run npm run build before upload.")
    parser.add_argument("--dry-run", action="store_true", help="Validate config and list actions without uploading.")
    args = parser.parse_args()

    config = _load_config()

    if args.build:
        _run_command(["npm", "run", "build"])

    if args.dry_run:
        _upload_bundle(ftp=ftplib.FTP(), config=config, dry_run=True)
        _log("Dry run complete")
        return 0

    ftp = ftplib.FTP()
    try:
        _log(f"Connecting to FTP {config['host']}:{config['port']}")
        ftp.connect(config["host"], int(config["port"]), timeout=60)
        ftp.login(config["user"], config["password"])
        ftp.set_pasv(True)

        _upload_bundle(ftp=ftp, config=config, dry_run=False)
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()

    if not _wait_for_healthcheck(config["healthcheck_url"], dry_run=False):
        _log("Health check failed")
        return 1

    _log("Deploy complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
