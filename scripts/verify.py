#!/usr/bin/env python3
"""Live API Hub verifier — checks every docs URL in data/apis.json and stamps
status + last_checked. Standard library only, so it runs anywhere
(Termux, GitHub Actions, plain python3) with no pip installs.

Usage:
    python3 scripts/verify.py            # check + update data/apis.json
    python3 scripts/verify.py --dry-run  # check only, print the table

Status rules (same as the docs-URL check used to seed v0.1):
    live       docs URL answered 2xx/3xx
    reachable  server answered 401/403/429 (up, but blocks anonymous checks)
    down       timeout, DNS failure, connection error, or 5xx

After updating data/apis.json, the script copies it to site/data/apis.json
so the static site always serves the latest verified data.
"""

import argparse
import datetime
import json
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "apis.json"
SITE_DATA_FILE = ROOT / "site" / "data" / "apis.json"

USER_AGENT = "Mozilla/5.0 (compatible; LiveAPIHub-Verifier/0.1)"
TIMEOUT = 12


def check_url(url):
    """Return (status, http_code_or_error)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return "live", resp.status
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 429):
            return "reachable", e.code
        if 200 <= e.code < 400:
            return "live", e.code
        return "down", e.code
    except Exception as e:  # timeout, DNS, SSL, connection errors
        return "down", type(e).__name__


def main():
    parser = argparse.ArgumentParser(description="Verify Live API Hub docs URLs.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Check only; do not write any files.")
    args = parser.parse_args()

    if not DATA_FILE.exists():
        print(f"error: {DATA_FILE} not found", file=sys.stderr)
        return 1

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    apis = data.get("apis", [])
    today = datetime.date.today().isoformat()

    counts = {"live": 0, "reachable": 0, "down": 0}
    changed = []
    rows = []
    for api in apis:
        status, detail = check_url(api["docs_url"])
        counts[status] = counts.get(status, 0) + 1
        old = api.get("status")
        if old != status:
            changed.append(f"{api['id']}: {old} -> {status} ({detail})")
        api["status"] = status
        api["last_checked"] = today
        rows.append(f"{status:10} {detail!s:>12}  {api['id']}")

    print("\n".join(rows))
    print(f"\n{len(apis)} checked: "
          f"{counts.get('live', 0)} live, "
          f"{counts.get('reachable', 0)} reachable, "
          f"{counts.get('down', 0)} down")
    if changed:
        print("changed:")
        for line in changed:
            print(f"  {line}")
    else:
        print("no status changes")

    if args.dry_run:
        print("(dry run — no files written)")
        return 0

    data["updated"] = today
    DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                         encoding="utf-8")
    SITE_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(DATA_FILE, SITE_DATA_FILE)
    print(f"wrote {DATA_FILE} and synced {SITE_DATA_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
