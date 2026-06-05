# EDS Migration Skills — Reference Guide

A suite of Claude Code skills for auditing, validating, and quality-checking AEM Edge Delivery Services (EDS) sites. Use them in sequence for a complete pre-launch sign-off, or individually for targeted checks.

---

## Recommended Workflow

Run skills in this order for a full site audit:

```
1. eds-sitemap-checker    → Which pages exist on EDS?
2. eds-content-validator  → Is the content correct and complete?
3. eds-seo-validator      → Are SEO metadata and performance in order?
4. eds-visual-compare     → Does the site look right?
```

Each skill saves `/tmp/sitemap-urls.json` as a shared input — run `eds-sitemap-checker` first and the others reuse it automatically.

---

## Skills at a Glance

| Skill | What it does | Output |
|-------|-------------|--------|
| `eds-sitemap-checker` | Checks every sitemap URL against EDS for HTTP status | CSV + HTML |
| `eds-content-validator` | Validates content parity and site quality | CSV + HTML |
| `eds-seo-validator` | Audits SEO metadata, Lighthouse scores, and real-user CWV | CSV + HTML |
| `eds-visual-compare` | Screenshot diffs across desktop, tablet, and mobile | HTML report with images |

---

## 1. EDS Sitemap Checker

**Invoke:** `check sitemap for <url>`

Fetches the live site's sitemap, maps every URL to the EDS domain, and checks HTTP status for each one. The first step in any migration audit — establishes which pages are live, missing, or redirected.

### What it checks
- Pages returning **200 OK** — live and accessible
- Pages returning **404** — not yet published or migrated on EDS
- Pages with **redirects** (301/302/307/308) — redirect rules may need updating
- Pages timing out or erroring

### Output
| File | Contents |
|------|----------|
| `/tmp/eds-url-check.csv` | Per-URL: original URL, EDS URL, status, redirect destination |
| `/tmp/eds-url-check.html` | Interactive report: LIVE / 404 / REDIRECT / ERROR badges |

### When to use
- Before any other skill — establishes the URL baseline
- When checking migration completeness ("are all pages live?")
- When configuring redirect rules

### Options
| Flag | Description |
|------|-------------|
| `--auth=user:pass` | HTTP Basic Auth for htaccess-protected environments |

---

## 2. EDS Content Validator

**Invoke:** `run content validation` / `run content audit`

Three modes for different depths of content checking:

### Mode A — Fast Compare
**Invoke:** `run fast content compare`

Compares text content between the live production site and EDS using Jaccard similarity scoring. No browser required — pure HTTP fetch.

- **Speed:** ~2–3 min / 100 pages
- **Best for:** CI-style migration audits, quick parity check
- **Scores:** MATCH (≥90%) / PARTIAL (50–90%) / MISMATCH (<50%)
- **Checks:** Full-page text similarity, heading match, CTA match, word count delta

### Mode B — Deep Compare
**Invoke:** `run deep content compare`

Same as fast compare but uses a real Chromium browser (Playwright). Captures content that only renders after JavaScript execution.

- **Speed:** ~8–12 min / 50 pages
- **Best for:** Pages with accordions, tabs, carousels, lazy-loaded fragments
- **Extra:** Expands accordions, scrolls to trigger lazy sections, strips cookie banners

### Mode C — Site Audit
**Invoke:** `run content audit`

Audits the EDS site itself — no production comparison needed. Catches quality issues left in authored content.

- **Speed:** ~3–5 min / 100 pages
- **Best for:** Pre-launch quality gate

**Checks:**

| Category | What it flags |
|----------|--------------|
| COMPLETENESS | Lorem ipsum, placeholder/TODO text, `[[templates]]`, ALL CAPS blocks, stub pages (<20 words) |
| IMAGES | Missing `alt` text, broken image URLs (404) |
| VIDEOS | `<video>` missing `poster` attribute |
| LINKS | Absolute links to prod domain (should be relative), old CMS domain links, generic anchor text ("click here", "read more") |
| QUALITY | No H1, multiple H1s |
| NAV/FOOTER | Nav and footer pages accessible, no broken links inside them |

### Output
All modes write to a named output directory:
```
<output-dir>/
├── index.html         ← Interactive HTML report
├── results.json       ← Machine-readable (used by merge script)
└── content-report.csv ← Per-page CSV with all metrics
```

### When to use
| Scenario | Mode |
|----------|------|
| Quick check — is all the text there? | Fast compare |
| Pages have accordions / lazy sections | Deep compare |
| Pre-launch quality gate (no prod needed) | Site audit |
| Finding placeholder text or broken images | Site audit |

---

## 3. EDS SEO Validator

**Invoke:** `run seo audit` / `run deep seo audit` / `run CWV check`

Four modes covering everything from basic metadata to full Lighthouse scores and real-user field data.

### Mode A — Fast SEO (`check-seo.js`)
**Invoke:** `run fast seo audit` / `run seo audit`

HTTP fetch + regex extraction. No browser required.

- **Speed:** ~2–3 min / 100 pages
- **Checks:** Title, meta description, keywords, OG tags (og:title, og:description, og:image, og:url, og:type), Twitter card tags
- **Also:** HEAD-checks `og:image` and `twitter:image` URLs for 200 status; flags duplicate titles/descriptions across pages

### Mode B — Deep SEO (`check-seo-deep.js`)
**Invoke:** `run deep seo audit`

Full Playwright Chromium audit against 68 of 80 SEO checklist items.

- **Speed:** ~8–10 min / 73 pages
- **Checks:**

| Section | What it validates |
|---------|------------------|
| §1 Metadata | Title (50–60 chars), description (140–160 chars), no keywords tag, robots meta |
| §2 JSON-LD | WebSite schema, BreadcrumbList on non-homepage, required fields, placement in `<head>` |
| §3 Headings | Single H1, no skipped heading levels (H1→H2→H3) |
| §4 Canonical | Present, HTTPS, self-referencing |
| §5 Crawlability | robots.txt + sitemap, custom 404 |
| §6 URL | Lowercase, hyphens not underscores |
| §7 Links | Generic anchor text, image links without alt, breadcrumb navigation |
| §8 Redirects | HTTP→HTTPS (301), www consistency |
| §9 OG + Twitter | All required tags, `og:image` dimensions (1200×630), `twitter:site` handle |
| §10 CWV | TTFB ≤800ms, FCP ≤1800ms, LCP ≤2500ms, CLS ≤0.1 (synthetic, via Playwright) |
| §11 Images/A11y | Missing `alt`, buttons without labels, favicon |
| §12 Mobile | `width=device-width` viewport, no horizontal scroll at 390px |
| §13 Pagination | `rel=next/prev` on paginated URLs |
| Aggregate | Duplicate titles, descriptions, H1 text across all pages |

### Mode C — CWV Check (`check-cwv.mjs`)
**Invoke:** `run CWV check` / `check core web vitals`

Uses Google PageSpeed Insights API for authoritative Lighthouse lab scores + real-user CrUX field data.

- **Speed:** ~1 min / 20 pages (with API key)
- **Strategies:** Mobile, desktop, or **both** (default — runs sequentially, produces one combined report)
- **Lab data:** Performance score, LCP, FCP, CLS, TTFB, TBT, Speed Index, TTI
- **Field data (CrUX p75):** LCP, FCP, CLS, **INP** (only measurable here), TTFB — rated GOOD / NEEDS_IMPROVEMENT / POOR
- **Note:** URLs must be publicly accessible — CrUX crawls from Google's servers, cannot use htaccess credentials

### Mode D — SEO Compare (`check-seo-compare.js`)
**Invoke:** `run seo compare` / `compare seo between prod and EDS`

Compares SEO metadata between the live production site and EDS, side-by-side.

- **Best for:** Verifying meta tags were migrated correctly (not just that they exist, but that values match)

### Output (all modes)
| File | Contents |
|------|----------|
| `<output>.csv` | Per-page CSV with all metric columns |
| `<output>.html` | Interactive HTML: stat cards by category, PASS/FAILED/ERROR badges, colour-coded issue badges per page |

### When to use
| Scenario | Mode |
|----------|------|
| Quick metadata scan | Fast |
| Full pre-launch SEO audit | Deep |
| Checking heading structure, JSON-LD, mobile | Deep |
| Authoritative Lighthouse scores | CWV |
| Real-user field data (INP, CrUX p75) | CWV |
| Verifying metadata matches production | SEO Compare |

---

## 4. EDS Visual Compare

**Invoke:** `run visual compare`

Full-page screenshot comparison between production and EDS across desktop, tablet, and mobile viewports. Uses Playwright + pixelmatch to diff pages pixel-by-pixel.

### How it works
1. Opens both prod and EDS pages in a real Chromium browser
2. Scrolls the full page to trigger lazy-loaded images
3. Takes full-page screenshots at each viewport
4. Diffs with pixelmatch — changed pixels highlighted in red
5. Flags pages where diff % exceeds the threshold (default 5%)

### Viewports
| Viewport | Resolution |
|----------|-----------|
| Desktop | 1440×900 |
| Tablet | 768×1024 |
| Mobile | 390×844 (2× scale) |

### Output
```
<output-dir>/
├── index.html              ← HTML report
└── screenshots/
    └── page-NNNN/
        ├── desktop-prod.png
        ├── desktop-eds.png
        ├── desktop-diff.png   ← changed pixels in red
        ├── tablet-*.png
        └── mobile-*.png
```

The HTML report shows Prod | EDS | Diff side-by-side for each page and viewport, sorted by largest diff first.

### Status values
| Status | Meaning |
|--------|---------|
| PASS | Diff ≤ threshold |
| FAIL | Diff > threshold |
| PROD_BLOCKED | WAF blocked prod — EDS screenshot still saved |
| EDS_NOT_FOUND | EDS returned non-200 |

### When to use
- Visual regression check before go-live
- Catching layout issues not visible in content or SEO audits
- Getting a side-by-side comparison stakeholders can review

### Options
| Flag | Default | Description |
|------|---------|-------------|
| `--threshold=N` | `5` | % pixel diff to flag as FAIL |
| `--max=N` | all | Limit pages (use 5–20 for a quick first check) |
| `--viewports=...` | all | Comma-separated: `desktop,tablet,mobile` |
| `--auth-prod=user:pass` | — | Basic Auth for prod |
| `--auth-eds=user:pass` | — | Basic Auth for EDS |

---

## Common Patterns

### HTTP Basic Auth
All skills support htaccess-protected environments. The main agent probes the first URL before running — if it returns 401, credentials are requested in `user:password` format.

### Large Sitemaps (500+ pages)
All skills support `--max=N` and `--offset=N` for batching. The main agent can split the sitemap and dispatch multiple parallel sub-agents, then merge results.

### Shared sitemap file
Once `eds-sitemap-checker` runs and creates `/tmp/sitemap-urls.json`, all other skills reuse it automatically. No need to re-fetch the sitemap between audits.

### Sub-agent pattern
All scripts are dispatched as background sub-agents to keep the main conversation clean. Script output (which can be thousands of lines) is summarised before being returned.

---

## Quick Invocation Reference

| What you want | Say |
|---------------|-----|
| Check which pages are live on EDS | `check sitemap for <url>` |
| Quick content parity check | `run fast content compare` |
| Full content audit (no prod needed) | `run content audit` |
| Find placeholder text / broken images | `run content audit` |
| Quick SEO metadata scan | `run seo audit` |
| Full SEO pre-launch audit | `run deep seo audit` |
| Lighthouse + CWV scores | `run CWV check` |
| Visual screenshot comparison | `run visual compare` |
| Verify SEO tags match production | `run seo compare` |
