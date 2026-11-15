# Live API Hub — Verified Free Public APIs

A searchable directory of free public APIs — with a difference: **every entry is link-checked**, and each one carries a live status and a last-checked date. Directories go stale; Live API Hub tells you which entries still work.

- **Website:** search + filter by category, auth, status, HTTPS — deploy `site/` to GitHub Pages or Vercel (see below).
- **Data:** one JSON file, `data/apis.json` — machine-readable, easy to contribute to.
- **Verifier:** `scripts/verify.py` checks every docs URL weekly via GitHub Actions and commits the updated statuses. No cron on your machine needed.

> v0.2 ships with **90 APIs across 29 categories**, all checked on 2026-11-14 (87 live, 3 reachable). See [Roadmap](#roadmap) for what's next.

## How it works

```
data/apis.json          canonical data (the source of truth)
  └─ scripts/verify.py  checks docs URLs, stamps status + last_checked,
                        syncs a copy to site/data/apis.json
site/                   static site (index.html + styles.css + app.js)
  └─ loads data/apis.json, renders search + filters, no build step
.github/workflows/      weekly scheduled verification (Sundays 00:00 UTC)
```

## Data schema

Each entry in `data/apis.json`:

| Field | Meaning |
|---|---|
| `id` | URL-safe slug, unique |
| `name` | Display name |
| `category` | One of the existing categories (or a new one, if it earns it) |
| `description` | One line, what the API does |
| `docs_url` | Link to the official docs (this is what the verifier checks) |
| `auth` | `No` / `apiKey` / `OAuth` |
| `https` | `true` / `false` |
| `cors` | `Yes` / `No` / `Unknown` (use `Unknown` when unsure — don't guess) |
| `free_tier` | Short note on the free tier / limits, e.g. `60 req/hour without a key` |
| `status` | `live` / `reachable` / `down` / `unknown` (set by the verifier) |
| `last_checked` | `YYYY-MM-DD` (set by the verifier) |

Status meanings:

- **live** — docs URL answered 2xx/3xx on the last check.
- **reachable** — server answered 401/403/429: it's up, but blocks anonymous checks.
- **down** — timeout, DNS failure, connection error, or 5xx.
- **unknown** — not checked yet.

## Run locally

```bash
# from the repo root — serves the site at http://localhost:8000/site/
python3 -m http.server 8000
```

Opening `site/index.html` directly (`file://`) will not load the data — browsers block `fetch` from local files. Use the server command above (it works in Termux too).

## Verify (update statuses by hand)

```bash
python3 scripts/verify.py            # check + update data/apis.json
python3 scripts/verify.py --dry-run  # check only, print the table
```

Standard library only — no `pip install` needed.

## Deploy the site

**GitHub Pages:** repo Settings → Pages → Source: Deploy from a branch → Branch: `main`, folder: `/site`. The site is then live at `https://<username>.github.io/live-api-hub/`.

**Vercel:** import the repo, set the Root Directory to `site`, deploy. No build command needed.

## Add an API

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: add one JSON object to `data/apis.json` (alphabetical by `id` within its category), run `python3 scripts/verify.py --dry-run` to confirm the docs link answers, then open a PR.

## Roadmap

- **v0.2** — ✅ Done 2026-11-14: grew the directory to 90 verified entries across 29 categories (53 added; 3 candidates dropped as unreachable after repeated checks — WorldTimeAPI, FRED, Lorem Picsum).
- **v0.3** — Try-it: one-click sample request per API (for no-key GET endpoints).
- **v0.4** — CORS check in the verifier (preflight probe), per-category pages, Bengali UI toggle.
- **Later** — Submission form (GitHub issue template → PR), dead-link auto-flagging after 2 failed weekly checks.

## Credits

Inspired by [public-apis/public-apis](https://github.com/public-apis/public-apis) (MIT) — the original community list. Live API Hub's seed entries were independently checked on 2026-11-14; several entries (YouTube, Reddit, Bluesky, Hacker News, GNews, Noozra) came from the author's own earlier API shortlist work. This project is not affiliated with public-apis, APILayer, or any listed API provider.

## License

MIT — see [LICENSE](LICENSE).
