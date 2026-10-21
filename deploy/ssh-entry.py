#!/usr/bin/python3
"""Forced SSH command: only deploy an immutable CoCo image; no arbitrary shell."""
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

match = re.fullmatch(r"coco-deploy ([0-9a-f]{40}) ([A-Za-z0-9][A-Za-z0-9-]{0,38})", os.environ.get("SSH_ORIGINAL_COMMAND", ""))
if not match:
    sys.exit("Only coco-deploy <commit SHA> <GitHub user> is allowed")
sha, user = match.groups()
token = sys.stdin.buffer.read(8192)
if not token or len(token) == 8192:
    sys.exit("Invalid registry token")
with tempfile.TemporaryDirectory(prefix="coco-registry-") as config:
    env = {**os.environ, "DOCKER_CONFIG": config}
    subprocess.run(["docker", "login", "ghcr.io", "--username", user, "--password-stdin"], input=token, env=env, check=True)
    subprocess.run(["sh", str(Path(__file__).resolve().with_name("deploy.sh")), "ghcr.io/markcxx/coco-downloader:" + sha], env=env, check=True)
