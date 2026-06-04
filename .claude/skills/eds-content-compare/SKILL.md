# EDS Content Compare

Compare the text content of a production site against an AEM Edge Delivery Services (EDS) domain. Uses Jaccard word-set similarity to measure how much content has been migrated — markup-agnostic, so structural HTML differences don't cause false negatives.

## When to Use This Skill

Use this skill when:
- Verifying that migrated EDS pages contain the same content as the live site
- Finding pages where sections are missing, partially migrated, or have different copy
- Auditing heading structure preservation after migration
- Identifying CTA text gaps (buttons and links)

**Do NOT use when:**
- You only need to check visual layout (use `eds-visual-compare`)
- You only need SEO metadata (use `eds-seo-validator`)

---

## Two Modes

| Mode | Script | How | Speed | Best For |
|------|--------|-----|-------|---------|
| **Fast** | `check-content.mjs` | HTTP fetch + regex | ~2–3 min / 100 pages | Quick content audit, no browser required |
| **Deep** | `check-content-deep.mjs` | Playwright + scroll | ~8–12 min / 50 pages | Lazy-loaded sections, fragments, accordion content |

**Choose fast mode** for a broad sweep or CI-style check.
**Choose deep mode** when fast mode shows unexpectedly low similarity (content may be lazy-loaded) or when the page uses accordions/tabs/fragments.

---

## Prerequisites

**Fast mode** — no dependencies (uses Node.js 18+ built-in `fetch`).

**Deep mode** — install Playwright Chromium once:

```bash
cd .claude/skills/eds-content-compare && npm install && npx playwright install chromium
```

---

## Workflow

### Step 1: Confirm sitemap JSON

Both modes expect `/tmp/sitemap-urls.json` — the same file produced by `eds-sitemap-checker`.

```bash
node -e "const u=require('/tmp/sitemap-urls.json'); console.log(u.length, 'URLs ready')"
```

If missing, run `eds-sitemap-checker` first.

---

### Step 2: Create output directory

```bash
mkdir -p /tmp/eds-content-report
```

---

### Step 3: Dispatch sub-agent

Once the sitemap JSON and output directory are confirmed, dispatch a `general-purpose` sub-agent.

**Fast mode:**

```
Run this command and return the results as described below.

node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-compare/scripts/check-content.mjs \
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
   - Priority fix list: rank pages by similarity ascending, note likely cause (missing sections, large word-count delta, low heading match)
3. Report path and CSV path
```

**Deep mode:**

```
Run this command and return the results as described below.

cd /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-compare && \
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

Return: (same structured summary as fast mode)
```

**Must run deep mode from `.claude/skills/eds-content-compare/`** so Node.js resolves the local `playwright` package.

---

### Step 4: Present summary

After the sub-agent returns, always present the full structured summary directly in the conversation as markdown tables. Do not just show the report path.

---

### Step 5: Offer zip export

After presenting the summary, always ask:

> "Would you like the report saved as a zip file in the project?"

If the user says yes:

1. Determine the dated filename: `YYYY-MM-DD` format (e.g. `2026-06-04`)
2. Ensure the output directory exists:
   ```bash
   mkdir -p testing/content-comparison
   ```
3. Create the zip:
   ```bash
   zip -r testing/content-comparison/<YYYY-MM-DD>.zip <OUTPUT_DIR>
   ```
4. Confirm: `Report saved to testing/content-comparison/<YYYY-MM-DD>.zip`

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

For large sitemaps, split into batches of 100 pages (fast) or 50 pages (deep), dispatch as parallel sub-agents, then merge.

### Recommended settings

| Sitemap size | Mode | Batch size | Concurrency/batch | Parallel batches | Est. time |
|---|---|---|---|---|---|
| 200 pages | fast | 100 | 5 | 2 | ~5–10 min |
| 500 pages | fast | 100 | 5 | 5 | ~15–20 min |
| 1200 pages | fast | 100 | 5 | 5 → 3 waves | ~30–45 min |
| 200 pages | deep | 50 | 2 | 4 | ~30–40 min |
| 500 pages | deep | 50 | 2 | 5 → 2 waves | ~60–90 min |

### Step 1: Split sitemap into batch files

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

Send a **single Agent tool message** with one call per batch. Each sub-agent uses `--offset` to produce unique slugs:

```
# Sub-agent for batch 1 (pages 1–100):
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-compare/scripts/check-content.mjs \
  /tmp/sitemap-batch-1.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/content-batch-1 \
  --max=100 --concurrency=5 --offset=0

# Sub-agent for batch 2 (pages 101–200):
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-compare/scripts/check-content.mjs \
  /tmp/sitemap-batch-2.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/content-batch-2 \
  --max=100 --concurrency=5 --offset=100
```

Run up to 5 batches in parallel. For larger sitemaps, use waves.

### Step 3: Merge batch outputs

```bash
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-compare/scripts/merge-content-reports.mjs \
  /tmp/eds-content-merged \
  /tmp/content-batch-1 \
  /tmp/content-batch-2 \
  /tmp/content-batch-3 \
  ...
```

The merge script:
- Reads `results.json` from each batch dir
- Generates a unified `index.html`, `results.json`, and `content-report.csv`
- Prints the merged summary

Then present the merged summary and follow Steps 4–5 (present summary → offer zip).

---

## How It Works

### Fast mode

For each URL:
1. **Fetch** raw HTML from both prod and EDS via Node.js `fetch` (5 concurrent, 25s timeout)
2. **Strip noise** — removes `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<noscript>`, `<iframe>`, `<svg>`
3. **Extract** headings (H1–H6), CTAs (buttons + links), and full text
4. **Build word sets** — lowercase, strip punctuation, filter words ≤2 chars
5. **Jaccard similarity** — `|A ∩ B| / |A ∪ B|` on word sets (reordering-tolerant)
6. **Section comparison** — matches H1–H3 headings by text, computes Jaccard per section
7. **Status** — MATCH ≥threshold%, PARTIAL 50–threshold%, MISMATCH <50%

### Deep mode

Same comparison algorithm, but replaces HTTP fetch with:
1. **Playwright Chromium** — real browser, full JavaScript execution
2. **Scroll** in 600px increments with 200ms pause → triggers lazy-loaded sections and images
3. **Expand hidden content** — opens all `<details>` elements, clicks `[aria-expanded="false"]`
4. **`page.evaluate()`** — extracts structured content from the live DOM after lazy loading settles

---

## Output

```
<output-dir>/
├── index.html          ← HTML report (open in browser)
├── results.json        ← Machine-readable results (used by merge script)
└── content-report.csv  ← Per-page CSV with all metrics
```

### HTML Report

- **Summary bar**: total pages, avg similarity, match/partial/mismatch/blocked/error counts
- **Per-page rows**: path, similarity %, word counts, heading match, CTA match rate
- **Expandable details**: missing headings list, per-section similarity breakdown

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

---

## Status Values

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

- **Personalised content** (account data, location-aware text) differs between prod and EDS by design — use a higher `--threshold` or exclude those pages with `--max/--offset`.
- **Navigation text**: nav and footer are stripped before comparison. If a page has nav/footer content duplicated in main content, word counts may differ slightly.
- **Fast mode misses lazy content**: carousels, fragment includes, and accordion panels that load via JavaScript won't appear in the HTTP fetch. Use deep mode for these pages.
- **Jaccard is reorder-tolerant but not gap-sensitive**: a page that has all the right words in a different order will still score high. The section-level breakdown and word-count delta expose reordering/missing-section issues.

---

## Example

```bash
# Quick test with 5 pages (fast mode)
node /Users/nishantgupta/Developer/Code/wellsfargo/.claude/skills/eds-content-compare/scripts/check-content.mjs \
  /tmp/sitemap-urls.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/eds-content-report \
  --max=5 --threshold=90

# Open report
open /tmp/eds-content-report/index.html

# Deep mode for 5 pages
cd .claude/skills/eds-content-compare && \
node scripts/check-content-deep.mjs \
  /tmp/sitemap-urls.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/eds-content-report-deep \
  --max=5 --threshold=90
```
