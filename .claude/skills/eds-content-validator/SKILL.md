---
name: eds-content-validator
description: Use this skill when the user wants to validate, audit, or compare the text content of AEM Edge Delivery Services (EDS) pages. Triggers on phrases like "content validation", "content audit", "content compare", "compare content", "content parity", "content migration check", "missing content", "content gaps", "word count diff", "heading structure check", "CTA text gaps", "verify migrated content", "check content", "content coverage".
version: 1.0.0
---

# EDS Content Validator

Two modes depending on depth required:

| Mode | Script | How | Speed | Use For |
|------|--------|-----|-------|---------|
| **Fast compare** | `check-content.mjs` | HTTP fetch + Jaccard | ~2–3 min / 100 pages | Quick prod-vs-EDS content parity check, no browser required |
| **Deep compare** | `check-content-deep.mjs` | Playwright + scroll | ~8–12 min / 50 pages | Lazy-loaded sections, accordion content, fragments |

Both modes compare production content against EDS using Jaccard word-set similarity — markup-agnostic, scoped to `<main>` content only, so structural HTML differences don't cause false negatives.

Use **fast compare** for a broad sweep or CI-style check.
Use **deep compare** when fast shows unexpectedly low similarity (content may be lazy-loaded) or when pages use accordions, tabs, or fragments.

---

## When to Use This Skill

Use this skill when:
- Verifying that migrated EDS pages contain the same content as the live production site
- Finding pages where sections are missing, partially migrated, or have different copy
- Auditing heading structure preservation after migration
- Identifying CTA text gaps (buttons and links)
- Getting a migration completeness score across the full sitemap

**Do NOT use when:**
- You only need to check visual layout — use `eds-visual-compare`
- You only need SEO metadata — use `eds-seo-validator`
- You only need to check which pages exist on EDS — use `eds-sitemap-checker`

---

## Execution Model

This skill uses a **two-phase approach**:

1. **Input gathering** (main agent) — confirm sitemap, probe for auth, determine mode, collect any missing parameters
2. **Sub-agent execution** — once all inputs are known, dispatch a `general-purpose` sub-agent via the Agent tool to run the script and return results

This keeps the main context window clean (script output can be thousands of lines) and allows multiple batches to run in parallel as separate sub-agents.

---

## Step 0: Confirm Sitemap URLs + Probe for Auth

```bash
test -f /tmp/sitemap-urls.json \
  && node -e "const u=require('/tmp/sitemap-urls.json'); console.log(u.length, 'URLs ready')" \
  || echo "MISSING — run eds-sitemap-checker first"
```

Once confirmed, **probe the first URL** on EDS:

```bash
node -e "
const urls = require('/tmp/sitemap-urls.json');
const base = 'https://main--wellsfargo--mkbansal1.aem.live';
const { URL } = require('url');
const first = base + new URL(urls[0]).pathname;
fetch(first, { method: 'HEAD' }).then(r => console.log('Probe status:', r.status, first));
"
```

- **401** → ask for `user:password` credentials, pass as `--auth-eds=user:pass` and/or `--auth-prod=user:pass`
- **Any other status** → proceed without auth

---

## Mode 1: Fast Compare (`check-content.mjs`)

### When to use
- Quick content parity check across many pages
- No Playwright dependency required
- Good for CI-style migration audits

### Dispatch sub-agent

```
Run this command and return the results as described below.

node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-validator/scripts/check-content.mjs \
  /tmp/sitemap-urls.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/eds-content-report \
  [--threshold=90] \
  [--concurrency=5] \
  [--max=N] \
  [--offset=N] \
  [--auth-prod=user:pass] \
  [--auth-eds=user:pass]

Return:
1. Full stdout output from the script
2. A structured summary with these exact sections:
   - Run metadata: date/time, mode, threshold, prod URL, EDS URL
   - Stats table: Pages checked / Match / Partial / Mismatch / Prod Blocked / Errors / Avg Similarity %
   - Per-page results table: Page path | Similarity % | Status | Prod Words | EDS Words | Δ Words | Headings matched | CTA match — sorted by similarity ascending
   - Missing content list: for pages with PARTIAL or MISMATCH status, list the missing headings
   - Priority fix list: rank pages by similarity ascending, note likely cause
3. Report path and CSV path
```

### How it works
1. **Fetch** raw HTML from both prod and EDS via Node.js `fetch` (5 concurrent, 25s timeout)
2. **Scope to `<main>`** — extracts only `<main>` content; falls back to full body if absent
3. **Strip noise** — removes `<script>`, `<style>`, `<nav>`, `<noscript>`, `<iframe>`, `<svg>`, `<sup>`
4. **Extract** headings (H1–H6), CTAs (buttons + links), and full text
5. **Build word sets** — lowercase, strip punctuation, filter words ≤2 chars
6. **Jaccard similarity** — `|A ∩ B| / |A ∪ B|` on word sets (reordering-tolerant)
7. **Section comparison** — matches H1–H3 headings, computes Jaccard per section; skips sections with <8 prod content words
8. **Status** — MATCH ≥threshold%, PARTIAL 50–threshold%, MISMATCH <50%

---

## Mode 2: Deep Compare (`check-content-deep.mjs`)

### When to use
- Pages use accordions, tabs, carousels, or lazy-loaded fragments
- Fast mode shows unexpectedly low similarity
- Pre-launch content sign-off requiring full JavaScript execution

### Prerequisites

Install Playwright Chromium once:

```bash
cd .claude/skills/eds-content-validator && npm install && npx playwright install chromium
```

### Dispatch sub-agent

```
Run this command and return the results as described below.

cd /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-validator && \
node scripts/check-content-deep.mjs \
  /tmp/sitemap-urls.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/eds-content-report \
  [--threshold=90] \
  [--concurrency=2] \
  [--max=N] \
  [--offset=N] \
  [--auth-prod=user:pass] \
  [--auth-eds=user:pass]

Return: (same structured summary as fast compare)
```

**Must run from `.claude/skills/eds-content-validator/`** so Node.js resolves the local `playwright` package.

### How it works (additions over fast mode)
1. **Playwright Chromium** — real browser, full JavaScript execution
2. **Scroll** in 600px increments with 200ms pause → triggers lazy-loaded sections
3. **Expand hidden content** — opens all `<details>` elements, clicks `[aria-expanded="false"]`
4. **Cookie/share UI stripping** — removes cookie consent modals, share drawers, and language banners by CSS selector before extraction
5. **Noise heading filter** — blocks known prod-only heading strings (cookie categories, "Share this page", language notices) from affecting similarity scores
6. **`page.evaluate()`** — extracts structured content from the live DOM after all loading settles

---

## Step 3: Present Summary

After the sub-agent returns, always present the full structured summary directly in the conversation as markdown tables. Do not just show the report path.

---

## Step 4: Offer Zip Export

After presenting the summary, always ask:

> "Would you like the report saved as a zip file in the project?"

If yes:
```bash
mkdir -p testing/content-comparison
zip -r testing/content-comparison/<YYYY-MM-DD>.zip <OUTPUT_DIR>
```

---

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--threshold=N` | `90` | % Jaccard similarity to count as MATCH |
| `--concurrency=N` | `5` (fast) / `2` (deep) | Pages processed in parallel |
| `--max=N` | all | Limit to first N pages from offset |
| `--offset=N` | `0` | Skip first N pages (for batching) |
| `--auth-prod=user:pass` | — | HTTP Basic Auth for prod site |
| `--auth-eds=user:pass` | — | HTTP Basic Auth for EDS site |

---

## Large Sitemaps — Batched Parallel Execution (500+ pages)

| Sitemap size | Mode | Batch size | Concurrency/batch | Parallel batches | Est. time |
|---|---|---|---|---|---|
| 200 pages | fast | 100 | 5 | 2 | ~5–10 min |
| 500 pages | fast | 100 | 5 | 5 | ~15–20 min |
| 1200 pages | fast | 100 | 5 | 5 → 3 waves | ~30–45 min |
| 200 pages | deep | 50 | 2 | 4 | ~30–40 min |
| 500 pages | deep | 50 | 2 | 5 → 2 waves | ~60–90 min |

### Step 1: Split sitemap

```bash
node -e "
const fs = require('fs');
const urls = JSON.parse(fs.readFileSync('/tmp/sitemap-urls.json', 'utf8'));
const BATCH = 100;
let count = 0;
for (let i = 0; i < urls.length; i += BATCH) {
  fs.writeFileSync(\`/tmp/sitemap-batch-\${++count}.json\`, JSON.stringify(urls.slice(i, i + BATCH)));
}
console.log(\`Created \${count} batch files (\${urls.length} URLs total)\`);
"
```

### Step 2: Dispatch parallel sub-agents

Send a **single Agent tool message** with one call per batch:

```
# Batch 1 (pages 1–100):
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-validator/scripts/check-content.mjs \
  /tmp/sitemap-batch-1.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/content-batch-1 \
  --max=100 --concurrency=5 --offset=0

# Batch 2 (pages 101–200):
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-validator/scripts/check-content.mjs \
  /tmp/sitemap-batch-2.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/content-batch-2 \
  --max=100 --concurrency=5 --offset=100
```

### Step 3: Merge batch outputs

```bash
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-validator/scripts/merge-content-reports.mjs \
  /tmp/eds-content-merged \
  /tmp/content-batch-1 \
  /tmp/content-batch-2 \
  ...
```

---

## Output

```
<output-dir>/
├── index.html          ← HTML report (open in browser)
├── results.json        ← Machine-readable results (used by merge script)
└── content-report.csv  ← Per-page CSV with all metrics
```

### CSV columns

| Column | Description |
|--------|-------------|
| `slug` | Internal page identifier (page-0001, ...) |
| `url_path` | URL path compared |
| `status` | MATCH / PARTIAL / MISMATCH / PROD_BLOCKED / EDS_NOT_FOUND / ERROR |
| `overall_sim_pct` | Jaccard similarity % across full page text |
| `prod_word_count` / `eds_word_count` | Word counts |
| `word_count_delta_pct` | `(eds−prod)/prod × 100` — negative means EDS has fewer words |
| `prod_heading_count` / `eds_heading_count` | Heading counts |
| `matched_heading_count` | Headings present in both |
| `missing_headings` | Pipe-separated list of headings in prod but not EDS |
| `cta_match_rate_pct` | % of prod CTAs found in EDS |
| `prod_h1` / `eds_h1` | H1 text from each side |

### Status values

| Status | Meaning |
|--------|---------|
| `MATCH` | Jaccard similarity ≥ threshold (default 90%) |
| `PARTIAL` | Similarity 50–90% — some content missing or changed |
| `MISMATCH` | Similarity < 50% — major content gap |
| `PROD_BLOCKED` | Prod returned WAF block — EDS check still proceeds |
| `EDS_NOT_FOUND` | EDS returned 404 |
| `ERROR` | Network error, timeout, or comparison failure |

---

## Known Limitations

- **Personalised content** (account data, location-aware text, time-of-day greetings) differs between prod and EDS by design — use a higher `--threshold` or exclude those pages.
- **Fast mode misses lazy content**: carousels, fragment includes, and accordion panels that load via JavaScript won't appear in the HTTP fetch. Use deep compare for these pages.
- **Jaccard is reorder-tolerant but not gap-sensitive**: a page with all the right words in a different order will still score high. The section-level breakdown and word-count delta expose reordering/missing-section issues.
- **Governance bios and similar pages** on prod include "Related Information" sidebar content not yet authored on EDS — scores of 50–75% are expected until those sections are migrated.

---

## Related Skills

- **eds-sitemap-checker** — check which pages from the sitemap are live on EDS (run first)
- **eds-seo-validator** — validate SEO metadata parity between prod and EDS
- **eds-visual-compare** — screenshot diff to catch visual/layout regressions
