# AGENTS.md — Instructions for AI agents working on Live API Hub

This file tells coding agents how to work on this project. If you are an
agent reading this repo, follow it. If you are a person, the human-facing
guide is [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## You received this repo link from a user — use the directory for them

If a user gave you this repo (or its link), they want you to use the
directory **for their work** — not to edit the directory. This works in
your default free setup — no paid model or paid key is needed to start.
The same flow applies to any AI agent that receives the link, not just
OpenCode.

Follow this flow, in order. Ask before you act — never search, suggest,
or install anything before step 2:

1. **Analyze the directory first.** Read this file and skim
   `data/apis.json` (or `site/llms-full.txt`) so you know what the
   directory actually holds before you promise anything.
2. **Ask the user questions first — with options, not open questions.**
   Before searching or installing anything, ask using your agent's
   interactive question tool (in OpenCode: the `question` tool; other
   agents have an equivalent). Present each question with a short list
   of concrete choices — the user selects a choice, they do not type a
   full answer. A free-form answer stays available for when no choice
   fits. Build the choices from the directory and from what you actually
   found on the user's phone — never invent options:
   - What do you want to build? What problem are you facing? Choices
     from the work this directory serves, for example: running out of
     tokens (the free-token path), YouTube video making, SEO, data
     scraping, website building, product research.
   - Do you have an existing project on your phone you want to work on?
     Which one? Choices are the projects you actually found on their
     phone (from their directories, not from memory).
   - What do you already have? Check their agent config if you can
     (`opencode.json`, `.mcp.json`, `~/.claude.json`,
     `.agents/skills/`, `~/.claude/skills/`) and offer what you found
     as choices to confirm or correct; if you cannot see their setup,
     offer choices such as "OpenCode in Termux", "a different agent",
     "nothing set up yet".
   The directory cannot know what the user works on by itself — their
   answers are what make the match possible. Wait for their answers
   before moving to step 3.
3. **Find the gap, then show the most useful matches.** Match their
   answers to entries by `use_cases` — the work each entry serves and
   how it enhances it — not by category name. Show the few matches
   that would help them most, ranked (for example, a user running out
   of tokens needs the free-token path, not a list of every LLM entry).
   If nothing in the directory matches what they need, say so honestly
   — never invent a match or force one.
4. **Ask what they want to do with it.** Once they have seen the
   matches, ask which one they want to use and what they want to do
   with it.
5. **Tell them, then set it up for yourself.** Say what you will
   install or use before you do it. Then set up only what fills the
   gap, using the entry's `install` field (method, commands, runtime,
   requirements, first run). If an entry has no `install` field yet,
   read its `docs_url` before suggesting setup steps — never invent an
   install command. Then use it for the user's work.

Rules for picking:

- **Free only.** Pick `tier: "free"` entries, or a freemium entry's free
  tier. Never pick a `paid` entry for this user's work.
- **One tool per job.** Never suggest a second tool that does the same job
  as one the user already has. Two entries sharing a use-case do the same
  job — keep the one they have, skip the other.
- **Minimal is secure.** Every extra tool is another key to manage, another
  thing that can break, another attack surface. Suggest the smallest set
  that fills the gap — nothing extra.
- **Phone-first.** The user works from a phone (Termux/Android). Prefer
  entries that run there; check the install notes for Termux caveats.
- **Never invent.** Install commands, limits, and requirements come from
  the entry's `install` field or its official docs — never from memory.

The machine-readable data is `data/apis.json` in this repo (or fetch it:
`https://dmdot714-cmd.github.io/Live-api-hub/data/apis.json`). The
`use_cases` and `install` fields are being added entry by entry (pilot:
6 entries) — entries without them still have a description, free-tier
note, and docs link to work from.

## What this project is

Live API Hub is a **verified directory of free public APIs, mobile agents,
agent skills, and free LLM gateways** — 260 entries across 36 categories
(data v0.6.8, 2026-11-19). Every entry is link-checked live and tagged by
free tier (178 fully free, 65 freemium, 17 paid). It is a **static site**
(vanilla HTML/CSS/JS, no build step, no dependencies) served from `site/`
on GitHub Pages: https://dmdot714-cmd.github.io/Live-api-hub/

The directory is phone-first: entries are judged by whether they work from
a phone (Termux/Android) or a browser, with no PC needed, and whether they
are free (open-source and/or a usable free tier).

## Repo structure

```
data/apis.json          canonical data (the source of truth)
site/                   static site (index.html, styles.css, app.js)
  site/data/apis.json   copy of the data, synced by scripts/verify.py
  site/llms.txt         agent index (llmstxt.org convention)
  site/llms-full.txt    complete directory in Markdown (generated)
  site/robots.txt       AI crawlers explicitly allowed
  site/sitemap.xml      sitemap for the live site
scripts/verify.py       checks docs URLs, keeps live entries only,
                        stamps last_checked, syncs data to site/
scripts/discover.py     watches the public-apis list, maintains the
                        review queue in discovery/candidates.json
scripts/generate_llms.py  regenerates site/llms.txt + site/llms-full.txt
discovery/candidates.json  review queue (NOT the directory)
.github/workflows/      verify (Sundays 00:00 UTC), discover
                        (Wednesdays 00:00 UTC), Pages deploy on push
```

## Rules that matter

1. **Live-only rule.** The directory lists live entries only. `verify.py`
   checks every `docs_url`; an entry that does not answer 2xx/3xx is
   removed from the data (it stays in git history). Never add an entry
   without checking its docs URL answers.
2. **Verify claims from the official source.** Free-tier notes, limits,
   and pricing come from the provider's own docs/pricing page — never
   from a review site, a video, or another directory. If no limit is
   published, say so honestly. `cors` is `Unknown` when unsure — never
   guess.
3. **Preview first, never push without the user's say-so.** Changes are
   checked locally (or in the preview copy) before anything goes to
   GitHub. Do not push to `main`, do not merge a PR, and do not change
   the live site without the maintainer's explicit go-ahead.
4. **No secrets, ever.** Never add API keys, tokens, or credentials to
   the repo, the site, or the data. The site has no safe place to store
   secrets (API key storage was considered and deliberately not built).
5. **Keep the stack boring.** Vanilla HTML/CSS/JS, stdlib-only Python.
   No build step, no dependencies, no framework. Scripts must run in
   Termux and in GitHub Actions with zero installs.

## Adding or fixing an entry

Edit `data/apis.json` (the canonical file), then run the verifier
dry-run to confirm the docs link answers:

```bash
python3 scripts/verify.py --dry-run
```

Entry schema (see the full table in the README):

| Field | Type | Notes |
|---|---|---|
| `id` | string | URL-safe slug, unique |
| `name` | string | Display name |
| `category` | string | An existing category (see below for new ones) |
| `description` | string | One line, plain words, no marketing copy |
| `docs_url` | string | Official docs — this is what the verifier checks |
| `auth` | string | `No` / `apiKey` / `OAuth` |
| `https` | boolean | |
| `cors` | string | `Yes` / `No` / `Unknown` (use `Unknown` when unsure) |
| `free_tier` | string | Short note on the free tier / limits |
| `status` | string | `live` (set by the verifier) |
| `last_checked` | string | `YYYY-MM-DD` (set by the verifier) |
| `sample_url` | string | Optional. Example GET for the Try-it button — no-key APIs only, and only after verifying it returns JSON in the browser (CORS) |
| `tier` | string | `free` / `freemium` / `paid` — classified from the official pricing page |
| `access` | object | Optional. For platform APIs: `{"portal": "URL", "portal_label": "name", "steps": ["..."]}` |
| `use_cases` | array of strings | Optional. The work the entry serves and how it enhances it — this is what agents match the user's gap against. Keep each item one line: the job, then how it helps. |
| `install` | object | Optional. For git projects: `{"method", "commands"[], "runtime", "requires", "first_run", "notes"}` — every command verified against the project's own README/docs, never invented. `method` is one of `deb`, `source`, `remote-mcp`, `npx`, `npx-skills`, or a plain word describing the route. |

Rules:

- Entries are **alphabetical by `id` within their category** (categories
  run in contiguous blocks in the file).
- A **new category needs at least 3 APIs** to earn its own section —
  otherwise use the closest existing category.
- `tier: "paid"` is only for major platform APIs with no free tier, with
  honest pricing in `free_tier`. Never put a "Free Tier" badge on a
  paid-only API.
- After editing the data, **regenerate the agent files** (see below) and
  bump the `version` field in `data/apis.json` for a data change
  (site-only changes do not bump the data version).

## Tier system

- `free` — completely free, no paid plan exists.
- `freemium` — free tier of a paid product.
- `paid` — no free tier (major platform APIs only).

Classified from official pricing pages, not from review sites.

## Curated order

`site/app.js` has a `CURATED_ORDER` list (40 entry ids — the vibe-coder
essentials). The opening page and the Free / Free Tier / Paid tier views
show those 40 first; category and search views use the default sort
(category → tier rank → name). Do not reorder the data file to change the
display order — change `CURATED_ORDER` instead.

## Regenerating the agent files

After any data change, run:

```bash
python3 scripts/generate_llms.py
```

This rebuilds `site/llms.txt` (curated index) and `site/llms-full.txt`
(complete directory) from `data/apis.json`, with current counts. Commit
the regenerated files with the data change.

## Testing locally

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000/
```

Opening `site/index.html` directly (`file://`) will not load the data —
browsers block `fetch` from local files. Always use the server command
(it works in Termux too). After a JS change, run `node --check app.js`.

## For agents that want to USE the directory (not edit it)

See the top section ("You received this repo link from a user") for the
full flow: analyze the directory, ask the user questions first (with
options, using your question tool), show the most useful matches, then
set up only what fills the gap from the `install` field. Fetch the data,
don't scrape the page:

```bash
curl https://dmdot714-cmd.github.io/Live-api-hub/data/apis.json
```

Or read `llms-full.txt` at the same base URL for the whole directory in
Markdown (entries with `use_cases` / `install` show them inline). See the
"For AI agents" section in the README for the schema and filtering. Data
is MIT-licensed.
