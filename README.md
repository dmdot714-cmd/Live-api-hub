# Live API Hub — Verified Free Public APIs

A searchable directory of free public APIs — with a difference: **every entry is link-checked**, and each one carries a live status and a last-checked date. Directories go stale; Live API Hub tells you which entries still work.

- **Website:** search + filter by category, auth, pricing, HTTPS — deploy `site/` to GitHub Pages or Vercel (see below).
- **Data:** one JSON file, `data/apis.json` — machine-readable, easy to contribute to.
- **Verifier:** `scripts/verify.py` checks every docs URL weekly via GitHub Actions and commits the updated data — entries that stop answering are removed (live APIs only). No cron on your machine needed.

> v0.6.12 ships with **301 APIs across 40 categories**, all live — Try-it on 72 no-key APIs (each verified live with browser CORS), a documented free-tier note on every entry, and a **100% Free / Free Tier / Paid** badge on every card (201 fully free, 83 freemium, 17 paid, classified from official pricing pages). Platform APIs in the Social Media, SEO and Paid API categories carry a **How to get access** guide (developer portal + steps) on their cards. Only the eye-visible chips show in the main row: All, Free, Free Tier, Paid, Public API, Git Projects, Social Media, SEO. Public API holds every other API category as a sub-chip (34 categories); Git Projects holds the git categories — Mobile Agent (its Agent For Termux and Agent For Android sub-chips appear as a third level), Agent Skill, Free Agent Tools. Agent For Termux holds 22 verified open-source agent projects that run in Termux; Agent For Android holds 13. The **＋ Add** button adds an API or a Git Repo from the browser (live check + duplicate check; additions save in the browser only — copy the JSON for a permanent add). The opening page and tier views show vibe-coder essentials first (curated order) — category and search views sort free first, paid last within each category. Cards are compact (5 across on desktop). See [Roadmap](#roadmap) for what's next.

## For AI agents

This directory is built to be used by agents, not just browsed by people.
Fetch the data — don't scrape the page.

**The whole directory as JSON** (one file, 301 entries):

```bash
curl https://dmdot714-cmd.github.io/Live-api-hub/data/apis.json
```

**The whole directory as Markdown** (readable listing, grouped by category):

- Index: https://dmdot714-cmd.github.io/Live-api-hub/llms.txt
- Full listing: https://dmdot714-cmd.github.io/Live-api-hub/llms-full.txt

**Entry schema** (each object in the top-level `apis` array; full table
in [Data schema](#data-schema)):

| Field | Type | Example |
|---|---|---|
| `id` | string | `"open-meteo"` |
| `name` | string | `"Open-Meteo"` |
| `category` | string | `"Weather"` (36 categories) |
| `description` | string | `"Weather forecasts and historical weather, no key needed."` |
| `docs_url` | string | `"https://open-meteo.com/"` |
| `auth` | string | `No` / `apiKey` / `OAuth` |
| `https` | boolean | `true` |
| `cors` | string | `Yes` / `No` / `Unknown` |
| `free_tier` | string | `"Free, no key; 10,000 calls/day (non-commercial)"` |
| `status` | string | `"live"` |
| `last_checked` | string | `"2026-11-14"` |
| `sample_url` | string | Optional — a working no-key GET request (71 entries) |
| `tier` | string | `free` / `freemium` / `paid` |
| `access` | object | Optional — `{"portal", "portal_label", "steps"}` (71 entries) |

**Filtering** — filter on the JSON fields, e.g. with `jq`:

```bash
# all fully-free, no-key APIs
curl -s https://dmdot714-cmd.github.io/Live-api-hub/data/apis.json \
  | jq -r '.apis[] | select(.tier == "free" and .auth == "No") | .name'

# everything in one category
curl -s https://dmdot714-cmd.github.io/Live-api-hub/data/apis.json \
  | jq -r '.apis[] | select(.category == "FreeLLM API") | .name'
```

The canonical data file also lives in the repo at
`data/apis.json`
(`https://raw.githubusercontent.com/dmdot714-cmd/Live-api-hub/main/data/apis.json`).
The data is MIT-licensed; the weekly verifier re-checks every docs URL
and removes entries that stop answering, so a stale copy is at most a
week old. `llms-full.txt` is regenerated from the data by
`scripts/generate_llms.py` after every data change. Agents that want to
edit the project (not just use it) should read [AGENTS.md](AGENTS.md).

## How it works

```
data/apis.json          canonical data (the source of truth)
  └─ scripts/verify.py  checks docs URLs, keeps live entries only,
                        stamps last_checked, syncs a copy to site/data/apis.json
discovery/candidates.json  review queue of new APIs found by discovery
  └─ scripts/discover.py   watches the public-apis list, live-checks new
                        no-key + HTTPS + CORS entries, never adds to the directory
site/                   static site (index.html + styles.css + app.js)
  └─ loads data/apis.json, renders search + filters, no build step
.github/workflows/      weekly verification (Sundays 00:00 UTC),
                        weekly discovery (Wednesdays 00:00 UTC),
                        Pages deploy on every push to main
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
| `status` | `live` (set by the verifier — only live entries are kept) |
| `last_checked` | `YYYY-MM-DD` (set by the verifier) |
| `sample_url` | Example GET request for the Try-it button (no-key APIs only; verified live with browser CORS) |
| `tier` | `free` (completely free, no paid plan), `freemium` (free tier of a paid product), or `paid` (no free tier — major platform APIs only, with honest pricing in `free_tier`) — classified from official pricing pages |
| `access` | Optional. For platform APIs: `{"portal": "developer-portal URL", "portal_label": "short name", "steps": ["step 1", "step 2", ...]}` — shown on the card as a "How to get access" guide |

Live-only rule: the directory lists live APIs only. The verifier checks every docs URL; an entry that does not answer 2xx/3xx — whether it fails, times out, or answers 401/403/429 (server up but blocking anonymous checks) — is removed from the data. Removed entries stay in git history and can be re-added once their docs URL answers again.

## Run locally

```bash
# serve the site/ folder — the site opens at http://localhost:8000/
cd site
python3 -m http.server 8000
```

Opening `site/index.html` directly (`file://`) will not load the data — browsers block `fetch` from local files. Use the server command above (it works in Termux too).

## Verify (update statuses by hand)

```bash
python3 scripts/verify.py            # check + update data/apis.json
python3 scripts/verify.py --dry-run  # check only, print the table
```

Standard library only — no `pip install` needed.

## Discovery (finding new APIs)

```bash
python3 scripts/discover.py            # refresh discovery/candidates.json
python3 scripts/discover.py --dry-run  # report only, write nothing
```

`scripts/discover.py` watches the [public-apis](https://github.com/public-apis/public-apis) list (the biggest curated list of free APIs), keeps entries not already in our directory that are marked no-key + HTTPS + CORS, live-checks their docs URLs, and maintains the review queue in `discovery/candidates.json`. It runs weekly via GitHub Actions (Wednesdays 00:00 UTC).

The queue is **not** the directory. A candidate still needs a human to verify the free tier from the official docs, classify free vs freemium from the pricing page, and test a sample endpoint before it is added to `data/apis.json` — that review step stays manual on purpose. Entries added to the directory drop out of the queue automatically on the next run.

## Deploy the site

**GitHub Pages:** repo Settings → Pages → Source: GitHub Actions. The `.github/workflows/pages.yml` workflow verifies links and deploys `site/` on every push to `main`. The site is then live at `https://<username>.github.io/live-api-hub/`.

**Vercel:** import the repo, set the Root Directory to `site`, deploy. No build command needed.

## Add an API

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: add one JSON object to `data/apis.json` (alphabetical by `id` within its category), run `python3 scripts/verify.py --dry-run` to confirm the docs link answers, then open a PR.

## Roadmap

- **v0.2** — ✅ Done 2026-11-14: grew the directory to 90 verified entries across 29 categories (53 added; 3 candidates dropped as unreachable after repeated checks — WorldTimeAPI, FRED, Lorem Picsum).
- **v0.2.1** — ✅ Done 2026-11-15: live-only rule — removed the 3 reachable-but-not-live entries (Reddit API, SEC EDGAR, Open Brewery DB); the verifier now drops any entry that stops answering.
- **v0.3** — ✅ Done 2026-11-15: Try-it button — one-click sample request on 55 no-key APIs (each verified live with browser CORS); also corrected auth for 3 APIs that now need a free key (balldontlie, CoinCap, Noozra).
- **v0.3.1** — ✅ Done 2026-11-15: documented free-tier/rate-limit notes for all 67 previously vague entries (official docs only); removed SpaceX (API down, repo archived); corrected ReqRes auth (now needs a free key).
- **v0.4** — ✅ Done 2026-11-15: Free vs Free Tier — every entry classified from official pricing pages (57 fully free, 29 freemium); tier badge on each card + pricing filter.
- **v0.4.1** — ✅ Done 2026-11-15: preview fixes — removed the dead status filter, added a tier legend, "Limits:" label, dynamic Docs / API Key link, 320px overflow fix, favicon + social preview tags.
- **v0.4.2** — ✅ Done 2026-11-15: auto-discovery — 12 new verified APIs added (98 total, Try-it on 66); `scripts/discover.py` + weekly workflow maintain a review queue in `discovery/candidates.json` (human review still required before adding).
- **v0.5** — ✅ Done 2026-11-15: platform APIs — 17 new entries in two new categories (Social Media, SEO); access guides (portal + steps) on 18 cards; new Paid tier badge (X — the only paid entry). YouTube moved Video → Social Media (it was the only Video entry, so that category is gone for now). Kwinside (site down) and Wordtracker (free plan uncertain) held back.
- **v0.5.1** — ✅ Done 2026-11-15: SEO complete + Paid API section — 37 more verified SEO APIs (21 free-trial in SEO, 16 paid-only in the new Paid API category); X moved to Paid API; cards now sort free first, paid last within each category. 8 held back: AccuRanker, ProRankTracker, Wincher (no public docs), WhatsMySERP (no API exists), Kwinside (site down), LinkResearchTools (unverified), WebPageTest (docs fail the SSL check), SEOptimer (docs block the verifier).
- **v0.5.2** — ✅ Done 2026-11-15: tier chips + curated opening page — Free / Free Tier / Paid chips next to All (the tier filter as chips, synced with the dropdown); the opening page now shows 40 vibe-coder essentials first (prototype data, dev tools, everyday data, bots, content apps) instead of alphabetical order; filtered views keep the category / tier / name sort.
- **v0.5.3** — ✅ Done 2026-11-15: curated tier views + compact cards — the Free / Free Tier / Paid chip views now also show vibe-coder essentials first (category and search views keep the normal sort); cards are smaller and denser (240px columns, 4 across on desktop, tighter padding and type).
- **v0.5.4** — ✅ Done 2026-11-15: cards smaller still — 200px columns (5 across on desktop), 10px padding, smaller type throughout; no content removed.
- **v0.5.5** — ✅ Done 2026-11-15: chip order + Mobile Agent — chips now follow a pinned order (All, Free, Free Tier, Paid, Social Media, SEO, Mobile Agent, then the rest alphabetically); Mobile Agent is a new parent category whose two sub-categories (Termux Agent, Android App Agent) appear as a second chip row — no entries yet, behaviour to follow.
- **v0.5.6** — ✅ Done 2026-11-15: FreeLLM API chip + sub-chip repair — FreeLLM API added to the pinned chips (after Mobile Agent, no entries yet); the patch also repairs the sub-chips container in index.html if the v0.5.5 edit missed it on the phone.
- **v0.5.7** — ✅ Done 2026-11-15: sub-chips under the chip — the Termux Agent / Android App Agent sub-chips now appear directly below the Mobile Agent chip (as a chip group) instead of at the bottom of the chip row; the separate sub-chips row is gone.
- **v0.5.8** — ✅ Done 2026-11-15: eye-visible chips + Others — the main row now shows only All, Free, Free Tier, Paid, Mobile Agent, Agent Skill, FreeLLM API, Others; every other category (including Social Media and SEO) lives under Others as a sub-chip. Agent Skill is a new pinned chip (no entries yet — it will hold agent skills, tools, git projects and LLM models for mobile-agent work).
- **v0.5.9** — ✅ Done 2026-11-15: Social Media + SEO back in the main row + Agent Toolkit — Social Media and SEO return to the eye-visible chips; Others now holds the remaining 29 categories. Agent Toolkit is a new pinned chip (no entries yet — it will hold the free and best git repos for agents: agent skills, free LLM gateways, MCP servers and useful git projects, all in one place).
- **v0.5.10** — ✅ Done 2026-11-15: rename — the Agent Toolkit chip is now Free Agent Tools (the user's pick).
- **v0.5.11** — ✅ Done 2026-11-15: Agent For Termux entries — 13 verified open-source agent projects for Termux (OpenCode + its native Termux build, Codex, aichat, Ollama, Aider, LLM, ShellGPT, Fabric, tgpt, Core Termux, Termux MCP, Codebase Memory MCP); sub-chips renamed to Agent For Termux / Agent For Android; Mobile Agent sub-categories no longer appear under Others. Note: opencode-ai/opencode is archived — the live OpenCode repo is anomalyco/opencode.
- **v0.5.12** — ✅ Done 2026-11-15: Agent For Termux round 2 — Codex removed (paid-only for cloud models); 8 more verified open-source agents added (Goose with official Termux support, Pi, Open Interpreter, OpenClaw + its Android installer, GPTMe, Kimi Code, Freebuff); Aider/Fabric/ShellGPT/OpenCode card texts corrected (all work with local Ollama, no key needed). Note: `pkg install goose` installs pressly/goose, a database migration tool — not the AI agent; Codex has a free `codex --oss` Ollama path if the user wants it back.
- **v0.5.13** — ✅ Done 2026-11-15: Agent For Termux round 3 — the multi-model rule: local Ollama is not a practical free path on a phone (big models, too much RAM), so all 20 entries were re-audited for multi-model support with a practical free path (own free models, free gateways via OpenAI-compatible endpoints, or no-key backends); zero removals — kimi-code and pi both keep (kimi-code takes any OpenAI-compatible base_url, pi has a dedicated OpenRouter provider). Hermes Agent added (NousResearch/hermes-agent, MIT, 263k stars — Termux package officially still broken, fix in progress). 9 card texts rewritten to lead with free gateways / own free models instead of local Ollama; OpenCode has 14 own free models (incl. GLM-5.3-Flash Free and DeepSeek V4.1 Flash Free). Codex stays removed — its free `codex --oss` path is Ollama-only. Cline CLI and Kilo Code CLI held — Termux install untested (prebuilt binaries, likely the same glibc issue as OpenCode); Continue CLI excluded (repo read-only, unmaintained), Factory Droid excluded (proprietary, no free tier).
- **v0.6.0** — ✅ Done 2026-11-15: Manual Add — a ＋ Add button with two forms: API (paste a link → browser live check + duplicate check; GitHub links route to the Git Repo form) and Git Repo (GitHub API check: stars, license, archived?). Additions save in the browser's localStorage only and render immediately with an "Added by you" badge; Copy JSON exports the entry for a permanent directory add. API key storage was considered and deliberately NOT built (a free static site has no safe place to store secrets).
- **v0.6.1** — ✅ Done 2026-11-16: content batch — 57 new verified entries (230 total, 36 categories): Agent Skill 11, Agent For Android 9, Free Agent Tools 10, Social Media 16 more (23 total), Google Maps Platform (Geocoding), FreeLLM API 10 (OrcaRouter, Kilo Code Gateway, LLM7, UnoRouter, NVIDIA Build, OpenRouter, Pollinations, Groq, Google AI Studio, hcnsec). hcnsec included as freemium at the user's call (free via registration credits, not a permanent free tier).
- **v0.6.2** — ✅ Done 2026-11-16: two-parent categories — the main row now shows only All, Free, Free Tier, Paid, Public API, Git Projects; every API category lives under Public API as a sub-chip (32), every git category under Git Projects (Mobile Agent, Agent Skill, Free Agent Tools). Mobile Agent is a group inside Git Projects — clicking it shows Termux + Android together, with their own chips as a third level. Others is gone; Social Media and SEO moved from main chips to Public API sub-chips. Data version stays 0.6.1 (site-only change). Revised 2026-11-17: Social Media and SEO stay as main chips; Public API holds 30 sub-chips.
- **v0.6.3** — ✅ Done 2026-11-17: findarepo batch — 24 new verified entries from findarepo's daily-ranked GitHub discovery, filtered by the mobile + free rule (254 total, 36 categories): Agent For Android 4 (VoiceStudio, Concat, Plain App, Android Ad Cleaner), Agent For Termux 1 (DeepSeek Harness), Free Agent Tools 9 (OmniRoute, Magpie, Claude-Mem, yt-dlp, Gitleaks, Xerj, SkillSpector, Skill Seekers, Lazygit), Agent Skill 9 (ffmpeg-skill, Archify, ECC, Taste Skill, Hallmark, Unslop, Agentic Awesome Skills, Awesome Agent Skills, Open SEO MCP Skills), SEO 1 (Open SEO, freemium). 10 candidates held for phone tests (t3code, dsh-Go, mobile-mcp, 9router, dsh-our-free-model, ruflo, hyperresearch, wikiskill, API-mega-list, hyperframes); 7 out (cleanyourtv, new-api, orca, OpenMontage, MoneyPrinterTurbo, coolify, dokploy). This batch requires v0.6.1 applied first — the patch helper refuses older versions.
- **v0.6.4** — ✅ Done 2026-11-17: FreeLLM Try-it + CORS fixes — `sample_url` added to 5 FreeLLM entries whose /v1/models endpoints send `Access-Control-Allow-Origin: *` (OrcaRouter, LLM7, UnoRouter, OpenRouter, Pollinations — their cards gain a working Try-it button); `cors` corrected on 11 entries (Kilo Code Gateway + NVIDIA Build = No; MusicBrainz = Yes; OpenSky, Deezer, arXiv = No). Data only, 254 entries.
- **v0.6.5** — ✅ Done 2026-11-17: FreeLLMAPI + similar LLM gateways — 6 new verified entries in Free Agent Tools (260 total, 36 categories): FreeLLMAPI (tashfeenahmed/freellmapi, MIT — self-hosted router over 87 free providers, official Termux guide, experimental), LiteLLM, Portkey Gateway, awesome-freellm-apis, Bifrost (Apache-2.0), Manifest (llm-gateway). All tier free. gpt4free excluded (reverse-engineering/ToS concerns); one-api and axonhub held (server-only/Chinese docs; affiliate link). This batch requires v0.6.4 applied first — the patch helper refuses older versions.
- **v0.6.6** — ✅ Done 2026-11-18: latest-figures fix — awesome-freellm-apis card updated to the project's current figures (311+ free LLM APIs from 22 providers, was 134+/40+). Data only, 260 entries.
- **v0.6.7** — ✅ Done 2026-11-18: latest-figures fix — OpenCode free-model count corrected 14 → 13 (MiniMax M3.1 Flash Free + Nemotron 3 Ultra Free left the free roster; Hy4 Flash Free joined). Data only, 260 entries.
- **v0.6.8** — ✅ Done 2026-11-19: agent pilot — intent + install layers on 6 entries (OpenCode for Termux, FreeLLMAPI, Tavily MCP, Last30Days, YouTube API, ffmpeg-skill): `use_cases` on all 6, `install` on the 5 git projects; AGENTS.md 'you received this repo link' ask-first flow (questions with selectable options via the agent's question tool). llms-full.txt renders use cases + install inline. Data only, 260 entries.
- **v0.6.9** — ✅ Done 2026-11-20: pilot fix — opencode-termux install URL corrected (opencode-aarch64.deb does not exist in the latest release; the real asset is opencode_1.17.9_aarch64.deb). Data only, 260 entries.
- **v0.6.10** — ✅ Done 2026-11-20: AutoGLM For Android removed — its repo is gone (GitHub 404, no Luokavin user) and the entry was already marked down; removed from the data and the Android comparison table (259 total, 12 Android).
- **v0.6.11** — ✅ Done 2026-11-20: pending verified adds — 9 entries (268 total): Free Agent Tools +8 (Agent Browser, Agent Reach, box by Simular, Free Claude Code, Gitingest, Lightpanda Browser, OpenHuman, OpenWA) and Agent Skill +1 (anti-slop). Each carries an honest phone-fit note: Agent Browser, OpenHuman and Lightpanda are desktop-only; OpenWA is server-only with a WhatsApp ban-risk warning; Agent Reach is scraping-based (check platform terms); Free Claude Code's server needs a computer; box is freemium (5,000 credits once).
- **v0.6.12** — ✅ Done 2026-11-20: gap-fill batch — 33 entries (301 total, 40 categories) across the 5 thin areas: 4 NEW categories — Video Creation (11: Google Flow, fal.ai MiniMax H3 Max, Dreamina, Remotion, PixVerse, Kling AI, Adobe Firefly, HeyGen, Pixabay, Cloudinary, AssemblyAI), Web Scraping (4: Jina Reader, Firecrawl, ZenRows, Scrapy), Website Building (6: Hugo, Eleventy, Astro, GitHub Pages, Cloudflare Pages, Deed), Image Generation (3: Leonardo.Ai, Ideogram, ImagineArt) — plus Development +3 (Presend, CSR.plus, IPLogs), Free Agent Tools +4 (whisper.cpp, TruffleHog, OSV-Scanner, pip-audit), Agent Skill +1 (Claude Animated Shorts), Agent For Android +1 (dsh-Go). Video Creation's AI video-gen entries are web/app free tiers (no free video-generation API exists); Remotion and Claude Animated Shorts are desktop-only with honest notes.
- **v0.7** — CORS check in the verifier (preflight probe), per-category pages, Bengali UI toggle.
- **Later** — Submission form (GitHub issue template → PR).

## Credits

Inspired by [public-apis/public-apis](https://github.com/public-apis/public-apis) (MIT) — the original community list. Live API Hub's seed entries were independently checked on 2026-11-14; several entries (YouTube, Reddit, Bluesky, Hacker News, GNews, Noozra) came from the author's own earlier API shortlist work. This project is not affiliated with public-apis, APILayer, or any listed API provider.

## License

MIT — see [LICENSE](LICENSE).
