# EDS Visual Compare

Full-page visual regression comparison between a production site and an AEM Edge Delivery Services (EDS) domain. Captures screenshots at desktop, tablet, and mobile viewports using Playwright, diffs them pixel-by-pixel with pixelmatch, and generates a self-contained HTML report with before / after / diff images.

## When to Use This Skill

Use this skill when:
- Validating that migrated EDS pages match the visual design of the live site
- Catching layout regressions before go-live
- Getting a side-by-side comparison of prod vs EDS across all breakpoints
- Identifying which pages have the largest visual drift

**Do NOT use when:**
- You only need SEO metadata comparison (use `eds-seo-compare`)
- The prod site is WAF-protected and cannot be reached by Playwright — the tool will mark those pages as PROD_BLOCKED and still capture the EDS screenshot

---

## Prerequisites

Install dependencies and Playwright Chromium in the skill directory:

```bash
cd .claude/skills/eds-visual-compare && npm install && npx playwright install chromium
```

This only needs to be run once per machine.

---

## Workflow

### Step 1: Confirm sitemap JSON

The script expects the same `/tmp/sitemap-urls.json` format used by `eds-sitemap-checker` and `eds-seo-validator` — a JSON array of original sitemap URLs (e.g. from `www.wellsfargo.com`).

```bash
node -e "const u=require('/tmp/sitemap-urls.json'); console.log(u.length, 'URLs ready')"
```

If missing, run `eds-sitemap-checker` first.

For large sitemaps, use `--max=N` to limit the run to a subset.

---

### Step 2: Confirm output directory

Create an output directory for screenshots and the HTML report:

```bash
mkdir -p /tmp/eds-visual-report
```

---

### Step 3: Dispatch sub-agent

Once the sitemap JSON and output directory are confirmed, dispatch a `general-purpose` sub-agent:

```
Run this command and return the results as described below.

cd .claude/skills/eds-visual-compare && node scripts/check-visual.mjs \
  <SITEMAP_JSON> \
  "<PROD_BASE_URL>" \
  "<EDS_BASE_URL>" \
  <OUTPUT_DIR> \
  [--threshold=5] \
  [--concurrency=2] \
  [--max=N] \
  [--viewports=desktop,tablet,mobile] \
  [--auth-prod=user:pass] \
  [--auth-eds=user:pass]

Return:
1. Full stdout output from the script
2. A structured summary with these exact sections:
   - Run metadata: date/time, threshold, viewports, prod URL, EDS URL
   - Stats table: Pages checked / Failed (>threshold%) / Passed / Prod Blocked / Errors
   - Per-page results table: Page path | Desktop % | Tablet % | Mobile % | Max Diff — sorted by max diff descending
   - Height mismatches table: for every viewport where prod and EDS heights differ, show Page | Viewport | Prod Height | EDS Height | Delta
   - Priority fix list: rank pages by max diff, note likely cause (missing section, height delta, layout shift)
3. Report path
```

**Must run from `.claude/skills/eds-visual-compare/`** so Node.js resolves the local `playwright`, `pixelmatch`, and `pngjs` packages.

### Step 4: Present summary

After the sub-agent returns, always present the full structured summary directly in the conversation. Do not just show the report path — the user must be able to read the results without opening the file. Format as markdown tables.

### Step 5: Offer zip export

After presenting the summary, always ask:

> "Would you like the report saved as a zip file in the project?"

If the user says yes:

1. Determine the dated filename using the current date: `YYYY-MM-DD` format (e.g. `2026-06-04`)
2. Ensure the output directory exists:
   ```bash
   mkdir -p testing/visual-comparison
   ```
3. Create the zip from the report output directory:
   ```bash
   zip -r testing/visual-comparison/<YYYY-MM-DD>.zip <OUTPUT_DIR>
   ```
4. Confirm to the user: `Report saved to testing/visual-comparison/<YYYY-MM-DD>.zip`

---

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--threshold=N` | `5` | % pixel difference to flag as FAIL |
| `--concurrency=N` | `2` | Pages processed in parallel |
| `--max=N` | all | Limit to first N pages (useful for sampling) |
| `--viewports=...` | `desktop,tablet,mobile` | Comma-separated list of viewports to check |
| `--auth-prod=user:pass` | — | HTTP Basic Auth for prod site |
| `--auth-eds=user:pass` | — | HTTP Basic Auth for EDS site |

---

## Viewport Definitions

| Name | Width | Height | Scale | Notes |
|------|-------|--------|-------|-------|
| `desktop` | 1440px | 900px | 1× | Standard desktop |
| `tablet` | 768px | 1024px | 1× | iPad portrait |
| `mobile` | 390px | 844px | 2× | iPhone 14 |

---

## How It Works

For each URL × viewport:

1. **Navigate** to both prod and EDS URLs in a real Chromium browser (full user-agent, cookie support — bypasses most WAFs)
2. **Scroll** the full page in 600px increments (200ms pause each) to trigger lazy-loaded images and content
3. **Wait** 600ms + 400ms for final render to settle
4. **Take full-page screenshot** (`fullPage: true`)
5. **Pad** images to the same dimensions (shorter page padded with white below)
6. **Diff** with pixelmatch at 0.1 sensitivity — highlights changed pixels in red
7. **Calculate** diff % = diffPixels / (width × height)
8. **Flag** as FAIL if diff % > threshold (default 5%)

---

## Output

```
<output-dir>/
├── index.html              ← HTML report (open in browser)
└── screenshots/
    ├── page-0001/
    │   ├── desktop-prod.png
    │   ├── desktop-eds.png
    │   ├── desktop-diff.png
    │   ├── tablet-prod.png
    │   ├── tablet-eds.png
    │   ├── tablet-diff.png
    │   ├── mobile-prod.png
    │   ├── mobile-eds.png
    │   └── mobile-diff.png
    ├── page-0002/
    │   └── ...
```

### HTML Report

- **Summary bar**: total pages, failed count, passed count, WAF-blocked count, errors
- **Per-page rows**: path, max diff %, expandable screenshots per viewport
- **Screenshot panel**: Prod | EDS | Diff (diff image highlights changed pixels in red)
- **Height note**: shown when prod and EDS page heights differ
- All images are referenced as external files (not embedded) — keeps the HTML small

---

## Status Values

| Status | Meaning |
|--------|---------|
| `PASS` | Diff % ≤ threshold |
| `FAIL` | Diff % > threshold |
| `PROD_BLOCKED` | Prod returned WAF block ("Request Rejected" etc.) — EDS screenshot still saved |
| `EDS_NOT_FOUND` | EDS returned non-200 status |
| `ERROR` | Network error or timeout |
| `DIFF_ERROR` | Screenshot captured but pixel diff failed |

---

## Performance

| Pages | Viewports | Concurrency | Estimated time |
|-------|-----------|-------------|----------------|
| 10 | 3 | 2 | ~5–8 min |
| 50 | 3 | 2 | ~25–40 min |
| 434 | 3 | 2 | ~3–5 hours |
| 434 | 3 | 5 | ~1.5–2 hours |

For a first run, use `--max=20` to validate the setup, then scale up.

---

## Known Limitations

- **WAF-protected prod sites**: Playwright uses a real Chromium browser with a standard user-agent, which bypasses most simple bot blocks. But advanced WAFs (Akamai, Cloudflare enterprise) may still block headless Chrome.
- **Height differences**: If prod and EDS render pages at different heights (e.g. different footer, fewer sections), the extra content on the taller page will be counted as 100% diff pixels in that region.
- **Dynamic content**: Countdowns, ads, carousels in autoplay, or personalised content will cause false positives. Use a higher threshold or `--viewports=desktop` for a faster focused check.
- **Font rendering**: Slight sub-pixel differences in font rendering between runs may produce a small non-zero diff even on identical pages. The 5% default threshold absorbs this.

---

## Example

```bash
# Quick test with 5 pages
cd .claude/skills/eds-visual-compare && node scripts/check-visual.mjs \
  /tmp/sitemap-live-urls.json \
  "https://www.wellsfargo.com" \
  "https://main--wellsfargo--mkbansal1.aem.live" \
  /tmp/eds-visual-report \
  --max=5 \
  --threshold=5

# Open report
open /tmp/eds-visual-report/index.html
```
