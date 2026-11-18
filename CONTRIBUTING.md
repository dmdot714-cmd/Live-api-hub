# Contributing to Live API Hub

Thanks for helping keep this directory honest. The one rule that matters: **don't add anything you haven't checked.**

## Adding an API

1. Add one JSON object to `data/apis.json`, in the right category, alphabetical by `id`.
2. Fill in every field (see the schema in the README). Rules:
   - **Free tier normally required.** The exception is a major platform API with no free tier (e.g. X): it may be added with `tier: "paid"` and honest pricing in `free_tier` — never a "Free Tier" badge on a paid-only API.
   - **`tier` is required** — `free`, `freemium`, or `paid` — classified from the official pricing page, not from a review site.
   - **`docs_url` must be the official docs**, and it must answer (see step 3).
   - **`cors`: use `Unknown` when unsure.** Don't guess — a wrong `Yes` wastes someone's afternoon.
   - **`free_tier`: write only what you verified.** If no limit is published, say so honestly (e.g. `Free, no key; no published limit`).
   - **`sample_url`:** for no-key APIs only, and only after verifying it returns JSON in the browser (CORS). No sample for key/OAuth APIs.
   - **`access`:** for platform APIs that need signup/approval, add the developer-portal URL and numbered steps (see the schema in the README).
   - **`status` / `last_checked`:** set `status` to `unknown` and leave `last_checked` as today's date; the verifier will stamp the real status.
   - **Description:** one line, plain words, no marketing copy.
3. Check the link before you submit:
   ```bash
   python3 scripts/verify.py --dry-run
   ```
   Your entry should come back `live`. Anything else means the docs URL doesn't answer — fix the URL or don't submit it. (Live-only rule: entries that stop answering are removed.)
4. Open a PR. One API per PR keeps review fast.

## Fixing an entry

Dead link, wrong auth type, changed free tier — same flow: edit `data/apis.json`, run the dry-run check, open a PR. Say what you verified and how.

## Categories

Use an existing category when the API fits one. A new category needs at least 3 APIs to earn its own section — otherwise put the entry in the closest existing category and note it in the PR.

## Code changes

- The site is vanilla HTML/CSS/JS, no build step, no dependencies. Keep it that way.
- `scripts/verify.py` is standard-library-only Python. Keep it that way too — it must run in Termux and in GitHub Actions with zero installs.
- Test the site locally before submitting: from the `site/` folder, run `python3 -m http.server 8000`, then open `http://localhost:8000/`.

## What we don't accept

- Paid-only APIs, except the documented major-platform exception above (with `tier: "paid"`).
- "Free trials" that need a card.
- APIs whose docs are login-walled with no public page.
- Scrapers, unofficial wrappers presented as official APIs, or anything that violates a provider's terms.
- Entries copied from another directory without checking them first.
