"""Fetches the ResPlan dataset and its loading utilities.

Only `ResPlan.zip` (the ~17k-plan pickle, too big for a normal git blob) is a
GitHub *release* asset — its exact filename is discovered through the releases
API rather than hardcoded, since a stale hardcoded name would fail with a
confusing 404 deep in a download call instead of a clear error. `split.json`
and `resplan_utils.py` are ordinary files checked into the repo root (verified
against the repo's actual contents, not assumed), so those are fetched directly
via raw.githubusercontent.com like any other repo file.

Usage:
    python -m floorplan_gen.data.download --dest data/
"""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

import requests

REPO = "m-agour/ResPlan"
RELEASES_API = f"https://api.github.com/repos/{REPO}/releases/latest"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/main"
UTILS_RAW_URL = f"{RAW_BASE}/resplan_utils.py"
SPLIT_RAW_URL = f"{RAW_BASE}/split.json"


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 20):
                f.write(chunk)


def _find_asset(assets: list[dict], *, name_contains: str, suffix: str) -> dict:
    matches = [
        a
        for a in assets
        if name_contains.lower() in a["name"].lower() and a["name"].lower().endswith(suffix)
    ]
    if not matches:
        available = ", ".join(a["name"] for a in assets) or "(no assets on the release)"
        raise RuntimeError(
            f"No release asset matching '*{name_contains}*{suffix}' found for {REPO}. "
            f"Available assets: {available}. The release layout may have changed — "
            f"check https://github.com/{REPO}/releases and adjust the match pattern."
        )
    if len(matches) > 1:
        raise RuntimeError(
            f"Multiple release assets match '*{name_contains}*{suffix}': "
            f"{[a['name'] for a in matches]}. Narrow the match pattern."
        )
    return matches[0]


def download_resplan(dest: Path, *, force: bool = False) -> Path:
    """Downloads resplan_utils.py, ResPlan.zip (extracted), and split.json into `dest`.

    Returns `dest` for chaining. Idempotent unless `force=True`: skips files that
    already exist so re-running a notebook cell doesn't re-download 17k plans.
    """
    dest.mkdir(parents=True, exist_ok=True)

    utils_path = dest / "resplan_utils.py"
    if force or not utils_path.exists():
        _download(UTILS_RAW_URL, utils_path)

    split_path = dest / "split.json"
    if force or not split_path.exists():
        _download(SPLIT_RAW_URL, split_path)

    resp = requests.get(RELEASES_API, timeout=30)
    resp.raise_for_status()
    release = resp.json()
    assets = release.get("assets", [])

    zip_path = dest / "ResPlan.zip"
    pkl_path = dest / "ResPlan.pkl"
    if force or not pkl_path.exists():
        asset = _find_asset(assets, name_contains="resplan", suffix=".zip")
        _download(asset["browser_download_url"], zip_path)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(dest)
        if not pkl_path.exists():
            extracted_pkls = list(dest.glob("*.pkl"))
            if len(extracted_pkls) == 1:
                extracted_pkls[0].rename(pkl_path)
            else:
                raise RuntimeError(
                    f"Expected a single .pkl inside {asset['name']}, found: "
                    f"{[p.name for p in extracted_pkls]}. Inspect the zip contents manually."
                )

    return dest


def load_split(dest: Path) -> dict[str, list[int]]:
    with open(dest / "split.json") as f:
        return json.load(f)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dest", type=Path, default=Path("data"))
    parser.add_argument("--force", action="store_true", help="Re-download even if files exist")
    args = parser.parse_args()

    out = download_resplan(args.dest, force=args.force)
    splits = load_split(out)
    sizes = {k: len(v) for k, v in splits.items()}
    print(f"Downloaded to {out}. Split sizes: {sizes}")
