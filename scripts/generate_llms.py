#!/usr/bin/env python3
"""Regenerate site/llms.txt and site/llms-full.txt from data/apis.json.

Usage (from the repo root):

    python3 scripts/generate_llms.py

Standard library only — no pip install needed. Re-run after any data
change (new entries, version bump) so the agent-facing files stay in
sync with the directory. The script reads data/apis.json (canonical)
and writes both files into site/ (which is what GitHub Pages serves).

- llms.txt: curated index per the llmstxt.org convention (title,
  description block, sections of markdown links). Compact on purpose.
- llms-full.txt: the complete directory in readable Markdown — one
  section per category, every entry with name, tier, auth,
  description, free-tier note, docs URL, and Try-it / access links
  where present.
"""

import json
import os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_PATH = os.path.join(ROOT, "data", "apis.json")
SITE_DIR = os.path.join(ROOT, "site")

BASE_URL = "https://dmdot714-cmd.github.io/Live-api-hub"
REPO_URL = "https://github.com/dmdot714-cmd/Live-api-hub"

AUTH_LABEL = {"No": "No auth", "apiKey": "API key", "OAuth": "OAuth"}


def clean(text):
    """Single-line text for a markdown list item (no newlines, no stray whitespace)."""
    return " ".join(str(text).split())


def header_lines(n_entries, n_cats, n_free, n_freemium, n_paid):
    return [
        "# Live API Hub",
        "",
        "> A verified directory of free public APIs, mobile agents, agent skills, "
        "and free LLM gateways — "
        f"{n_entries} entries across {n_cats} categories, all link-checked live "
        f"and tagged by free tier ({n_free} fully free, {n_freemium} freemium, "
        f"{n_paid} paid). Built for phone-first builders: every entry works from "
        "a phone (Termux/Android) or a browser, with no PC needed.",
        "",
    ]


def build_llms_txt(n_entries, n_cats, n_free, n_freemium, n_paid):
    lines = header_lines(n_entries, n_cats, n_free, n_freemium, n_paid)
    lines += [
        "## Directory",
        "",
        f"- [Live API Hub]({BASE_URL}/): Searchable directory — search and filter "
        "by category, auth, pricing, and HTTPS.",
        f"- [Full data (JSON)]({BASE_URL}/data/apis.json): The whole directory as "
        f"one JSON file — {n_entries} entries with name, category, tier, auth, "
        "docs URL, free-tier notes, and last-checked date.",
        f"- [Full listing (Markdown)]({BASE_URL}/llms-full.txt): Every entry in "
        "readable Markdown, grouped by category.",
        "",
        "## Project",
        "",
        f"- [GitHub repo]({REPO_URL}): Source code, data, and automation.",
        f"- [README]({REPO_URL}#readme): Project overview, data schema, and how "
        "to contribute.",
        f"- [Contributing]({REPO_URL}/blob/main/CONTRIBUTING.md): Rules for "
        "adding or fixing an entry.",
        "",
        "## Optional",
        "",
        f"- [Full listing (Markdown)]({BASE_URL}/llms-full.txt): The complete "
        "directory — fetch this when you need every entry, not just the index.",
        "",
    ]
    return "\n".join(lines)


def entry_line(entry):
    """One markdown list line for an entry in llms-full.txt."""
    tier = entry.get("tier", "?")
    auth = AUTH_LABEL.get(entry.get("auth", "?"), entry.get("auth", "?"))
    description = clean(entry["description"]).rstrip(".")
    free_tier = clean(entry.get("free_tier", "")).rstrip(".")
    parts = [
        f"- **{clean(entry['name'])}** ({tier}, {auth}) — {description}."
    ]
    parts.append(f"Free tier: {free_tier}.")
    parts.append(f"Docs: {entry['docs_url']}")
    if entry.get("sample_url"):
        parts.append(f"Try it: {entry['sample_url']}")
    access = entry.get("access")
    if access:
        parts.append(
            f"Access: {clean(access.get('portal_label', 'Portal'))} — "
            f"{access.get('portal', '')}"
        )
    return " ".join(parts)


def build_llms_full_txt(data):
    apis = data["apis"]
    n_entries = len(apis)
    n_cats = len({e["category"] for e in apis})
    tiers = defaultdict(int)
    for e in apis:
        tiers[e.get("tier")] += 1
    version = data.get("version", "?")
    updated = data.get("updated", "?")

    lines = header_lines(
        n_entries, n_cats, tiers["free"], tiers["freemium"], tiers["paid"]
    )
    lines += [
        f"Generated from data/apis.json (v{version}, updated {updated}). The "
        "canonical machine-readable copy is "
        f"{BASE_URL}/data/apis.json — fetch that for structured access; this "
        "file is the human- and agent-readable listing. Data is MIT-licensed "
        "and re-verified weekly (dead entries are removed).",
        "",
    ]

    by_category = defaultdict(list)
    for e in apis:
        by_category[e["category"]].append(e)
    for category in sorted(by_category):
        entries = sorted(by_category[category], key=lambda e: e["id"])
        lines.append(f"## {category} ({len(entries)})")
        lines.append("")
        for e in entries:
            lines.append(entry_line(e))
        lines.append("")

    return "\n".join(lines)


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)
    apis = data["apis"]
    n_entries = len(apis)
    n_cats = len({e["category"] for e in apis})
    tiers = defaultdict(int)
    for e in apis:
        tiers[e.get("tier")] += 1

    llms_txt = build_llms_txt(
        n_entries, n_cats, tiers["free"], tiers["freemium"], tiers["paid"]
    )
    llms_full_txt = build_llms_full_txt(data)

    out_txt = os.path.join(SITE_DIR, "llms.txt")
    out_full = os.path.join(SITE_DIR, "llms-full.txt")
    with open(out_txt, "w", encoding="utf-8") as f:
        f.write(llms_txt)
    with open(out_full, "w", encoding="utf-8") as f:
        f.write(llms_full_txt)

    print(f"data: v{data.get('version')} ({data.get('updated')}), "
          f"{n_entries} entries, {n_cats} categories")
    print(f"wrote {out_txt} ({len(llms_txt.encode('utf-8'))} bytes)")
    print(f"wrote {out_full} ({len(llms_full_txt.encode('utf-8'))} bytes, "
          f"{llms_full_txt.count('- **')} entries)")


if __name__ == "__main__":
    main()
