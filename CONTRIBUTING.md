# Contributing to Live API Hub

Thanks for helping keep this directory honest. The one rule that matters: **don't add anything you haven't checked.**

## Adding an API

1. Add one JSON object to `data/apis.json`, in the right category, alphabetical by `id`.
2. Fill in every field (see the schema in the README). Rules:
   - **Free tier must exist.** If the API has no usable free tier, don't add it.
   - **`docs_url` must be the official docs**, and it must answer (see step 3).
   - **`cors`: use `Unknown` when unsure.** Don't guess — a wrong `Yes` wastes someone's afternoon.
   - **`free_tier`: write only what you verified.** If the limits aren't published, write `Free tier listed; limits not verified.` — that's honest and acceptable.
   - **`status` / `last_checked`:** set `status` to `unknown` and leave `last_checked` as today's date; the verifier will stamp the real status.
   - **Description:** one line, plain words, no marketing copy.
3. Check the link before you submit:
   ```bash
   python3 scripts/verify.py --dry-run
   ```
   Your entry should come back `live` or `reachable`. If it's `down`, fix the URL or don't submit it.
4. Open a PR. One API per PR keeps review fast.

## Fixing an entry

Dead link, wrong auth type, changed free tier — same flow: edit `data/apis.json`, run the dry-run check, open a PR. Say what you verified and how.

## Categories

Use an existing category when the API fits one. A new category needs at least 3 APIs to earn its own section — otherwise put the entry in the closest existing category and note it in the PR.

## Code changes

- The site is vanilla HTML/CSS/JS, no build step, no dependencies. Keep it that way.
- `scripts/verify.py` is standard-library-only Python. Keep it that way too — it must run in Termux and in GitHub Actions with zero installs.
- Test the site locally before submitting: `python3 -m http.server 8000`, then open `http://localhost:8000/site/`.

## What we don't accept

- Paid-only APIs, or "free trials" that need a card.
- APIs whose docs are login-walled with no public page.
- Scrapers, unofficial wrappers presented as official APIs, or anything that violates a provider's terms.
- Entries copied from another directory without checking them first.
