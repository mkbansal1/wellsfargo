# Import Page Skill

Import and migrate Wells Fargo pages to AEM Edge Delivery Services (Document Authoring format).

## Invocation

User provides one or more URLs to import. Examples:

**Single page:**
> Import https://www.wellsfargo.com/about/inclusion/

**Multiple pages:**
> Import these pages:
> - https://www.wellsfargo.com/es/mortgage/manage-account/disaster-recovery/
> - https://www.wellsfargo.com/about/inclusion/

**With context:**
> Import https://www.wellsfargo.com/mortgage/rates/ — use fragment /fragments/mortgage/helpful-resources for the sidebar

## Workflow

### Step 1: Theme Detection

Navigate to the source URL using Playwright and detect the theme:

**New Theme indicators:**
- Has `<main>` tag
- Has `<nav aria-label="Breadcrumb">` (capitalized)
- Header has a MENU button (`"Abra navegación por menú"` or `"Open navigation"`)
- Uses semantic grouping (`<group>`, `<article>`)
- No Print/Share buttons in header area

**Old Theme indicators:**
- NO `<main>` tag
- Has `.c60`, `.c54`, or `.c55` CSS classes
- Has Print/Share links near the H1 (`"Imprima"`, `"Print"`, `"Comparta"`, `"Share"`)
- Has `<nav aria-label="breadcrumbs">` (lowercase)
- Has `[role="complementary"]` sections for pageid/sidebar
- Sidebar with "More Resources" heading

**Detection code (run via Playwright evaluate):**
```javascript
() => {
  const hasMain = !!document.querySelector('main');
  const hasOldClasses = !!document.querySelector('.c60, .c54, .c55');
  const hasPrintShare = !!document.querySelector('a[href="#"]') && 
    (document.body.innerText.includes('Print') || document.body.innerText.includes('Imprima'));
  const hasOldBreadcrumb = !!document.querySelector('nav[aria-label="breadcrumbs"]');
  return {
    theme: hasMain && !hasOldClasses ? 'new' : 'old',
    hasMain, hasOldClasses, hasPrintShare, hasOldBreadcrumb
  };
}
```

### Step 2: Determine Output Path

Derive from URL — the last path segment becomes the filename, parent segments become the directory:
- `https://www.wellsfargo.com/personal-loans/rates/` → `content/personal-loans/rates.plain.html`
- `https://www.wellsfargo.com/es/mortgage/refinance/` → `content/es/mortgage/refinance.plain.html`
- `https://www.wellsfargo.com/about/corporate/governance/black/` → `content/about/corporate/governance/black.plain.html`
- `https://www.wellsfargo.com/about/` → `content/about.plain.html`
- `https://www.wellsfargo.com/personal-loans/` → `content/personal-loans.plain.html`

**Rule:** The trailing path segment is ALWAYS the filename (not `index.plain.html` inside a folder). A URL like `/about/` maps to `content/about.plain.html`, NOT `content/about/index.plain.html`.

### Step 3: Run Importer Template

**ALWAYS use the importer scripts first.** Only fall back to manual construction for truly unique page types.

| Theme | Importer Script | Usage |
|-------|----------------|-------|
| New Theme | `tools/importer/import-es-product-landing.bundle.js` | Run via AEM import server or helix-importer-ui |
| Old Theme | `tools/importer/old-theme/import-old-theme.bundle.js` | Run via AEM import server or helix-importer-ui |
| Governance Bios | `tools/importer/import-governance-bios.js` | Run directly: `node tools/importer/import-governance-bios.js` |

**Running the importer:**
```bash
# For single page using the bundled importer:
node tools/importer/run-bulk-import.js <url> --template <template-name>
```

The importers handle: block detection, DA table structure, footnote extraction, section-metadata, div balance, and post-processing automatically.

**Fall back to manual only when:**
- Page type has no matching importer (e.g., CIB articles, Tabs with Reference fragments)
- Importer output needs significant corrections (>50% of content wrong)
- User explicitly requests manual import

### Step 4: Extract Content (manual fallback only)

If using manual import, use Playwright to navigate and extract:
1. **Page title** (from `<title>` tag)
2. **Meta description** (from `<meta name="description" content="...">`)
3. **Meta keywords** (from `<meta name="keywords" content="...">`)
4. **H1** heading
5. **Hero image** (if present — marquee/banner image)
6. **Body content** (paragraphs, headings, lists, bold text, links, images)
7. **Pageid** (DT1-..., QSR-..., or LRC-... pattern)
8. **Footnote CIDs** (any `#tcm:` references in links)
9. **Metadata footnotes** (CID list from footnote area if present)

**Always include in Metadata block:** Title, Description, Keywords, footnotes (if any), and pageid. Extract each value VERBATIM from the source — never trim, truncate, or summarize any metadata content (full keyword lists, full descriptions).

**Critical extraction rules:**
- **Redirect handling:** After navigation, check `window.location.href`. If the page redirected to `/es/` but the requested URL was English (no `/es/` prefix), navigate again with `locale: 'en-US'` headers or use the English URL directly. Always verify you're extracting from the correct language version.
- **Expand all accordions:** Before extracting content, expand all `<details>` elements by setting `d.open = true` on each. This ensures hidden accordion panel content is accessible in the DOM.
- **Never skip hidden content:** Some content is in collapsed panels, hidden tabs, or lazy-loaded sections. Always expand/reveal all interactive content before extraction.
- **Verify image placement visually:** Always take a screenshot or check DOM position relative to H2 headings before assigning images to sections. Never guess from filenames or class names alone.

### Step 4: Map Content to Blocks

Use the block library to find the best match. Available blocks:

| Block | Variants | Use When |
|-------|----------|----------|
| **Hero** | default, `overlay-bottom`, `no-image`, `text-right` | Full-width banner image + heading + CTA. Use `overlay-bottom` when the text/heading overlaps the bottom of the image in a centered card (image above, text card overlapping bottom). Use default when text is overlaid on the left side. Use `text-right` when text is on the right side. Use `no-image` for text-only hero banners. |
| **Cards** | `icons`, `icons-middle`, `icons-bottom`, `highlight`, `bg-image`, `bg-light`, `separator`, `align-center`, `no-border`, `two-up`, `three-up`, `four-up`, `list`, `promo`, `callout` | Grid of items with image/icon + title + text. Use `icons bg-image` ONLY for small icon images (64x64 or similar). For full-size card images (616x353 or similar), use plain `cards` with no variant. Use `highlight` for stat cards with gradient heading area. Use `icons-bottom` for text on top + icon bottom-right (stats/progress). Use `icons-middle` for heading top + icon middle + CTA bottom. Use `two-up`/`three-up`/`four-up` to force column counts. Use `no-border` to remove card borders. Use `callout` for single-card CTAs. Use `list` for list-style cards. Use `promo` for promotional cards. |
| **Accordion** | `compact`, `numbered` | Expandable Q&A or FAQ sections (H3 + content pairs). Use `numbered` when panels should display sequential numbering. |
| **Tabs** | `Yellow`, `Indigo`, `Top`, `Tab-Fill`, `Panel-Border`, `Centered`, `Text-Center`, `Reference` | Tabbed content panels. Use `Yellow` for yellow indicator, `Indigo` for indigo indicator. Use `Centered` for centered tab list. Use `Text-Center` for centered tab text. Use `Reference` when tab panels need to contain other blocks — each tab cell contains a fragment path. Combine variants: `Tabs (Yellow, Top, Tab-Fill, Panel-Border, Reference)`. |
| **Columns** | `panel`, `center`, `center-headings`, `contact`, `badges`, `ratio-25-75`, `ratio-33-67`, `ratio-67-33`, `ratio-75-25` | Side-by-side content. Use `panel` variant for image + text in a card/panel container. Use `center` for centered column content. Use `center-headings` for centered headings only. Use `contact` for contact info layout. Use `badges` for badge/icon grid. |
| **Table** | default, `striped`, `bordered`, `no-border`, `no-header`, `row-header` | Data tables. Use `no-border` for clean borderless tables (e.g., finance breakdowns). Use `striped` for alternating row colors. Use `bordered` for full borders. Use `row-header` when first column is the header. Combine: `Table (Striped, Bordered)`. |
| **Text Image** | default (float wrap), `image-left`, `image-right`, `image-top`, `compact-image` | Image + text layout. Combine: `Text Image (compact-image, image-right)`. |
| **Fragment** | — | Shared content referenced by path |
| **Contact Bar** | — | Phone/hours/location info |
| **Learning Navigation** | — | Image + nav link list |
| **Video** | — | Embedded video |
| **iFrame** | — | Embedded external content |
| **Divider** | — | Visual separator between sections |

### Step 5: Apply Section Metadata

Each section (line in .plain.html) can have section-metadata:

| Style | Effect |
|-------|--------|
| `heading-bar` | Yellow bar above H2 |
| `center-align` | Center-aligned text |
| `narrow-width` | Extra horizontal padding on desktop |
| `light` | Light warm background (#F9F7F6) |
| `warm` | Warm beige background (#F4F0ED) |
| `dark` | Dark background (#141414) with white text |
| `cream` | Cream/yellow background (#FFF7E2) |
| `border` | Bottom border separator between sections |

**Rules:**
- Only add `heading-bar` if the source H2 has a heading-bar indicator before it in the DOM. Indicators include: `div.ps-mid-page-title-top-line`, a zero-width joiner character (`‍` / `‍`), or a thin decorative element immediately before the H2.
- Sections with H2 (with heading-bar) + Cards or Tabs → `heading-bar, center-align`
- Sections with Accordion (with or without H2) → ALWAYS include `narrow-width` (e.g., `heading-bar, center-align, narrow-width`)
- Hero overlay-bottom sections → `center-align, heading-bar`
- Plain H2 without heading-bar indicator → no section-metadata needed

**MANDATORY: Per-section check.** For EVERY section that contains an H2, verify whether the source has a heading-bar indicator before that H2. Do NOT skip any section. Missing section metadata is a recurring error — check each one individually.

### Step 6: Handle Footnotes

Extract ALL footnote CIDs from THREE sources:

1. **Superscript references in body** — `#tcm:XX-XXXXXX-XX` href values in `<sup><a>` links
2. **Page-specific footnotes** — Extract ALL `data-cid` values from elements in the footnotes section at the bottom of the page (`.ps-footnote-text` or similar containers between last content and pageid). These include numbered footnotes, legal disclaimers, and any page-specific disclosures.
3. **Standard disclosure footnotes** — Always check for these known CIDs in the footnotes section:
   - "Wells Fargo Bank, N.A. Member FDIC." → CID: `tcm:84-20661-16`
   - "Equal Housing Lender" → CID: `tcm:84-226264-16`
   - "Wells Fargo Home Mortgage is a division of Wells Fargo Bank, N.A." → include if present

**Extraction method (Playwright):**
```javascript
// Get ALL footnote CIDs from the page
document.querySelectorAll('[data-cid]').forEach(el => {
  const cid = el.getAttribute('data-cid');
  // Include if it's in the footnotes area (not nav/header)
});
```

**Footnote ordering & duplication rules:**
- **Preserve source order** — the footnotes metadata CID list MUST follow the exact sequence the footnotes appear in on the source page (top to bottom). Do not reorder or sort.
- **Duplicates are kept** — if the same footnote is displayed multiple times on the page, add its CID multiple times in the metadata footnotes field (once per occurrence), preserving position.
- **Numbered vs. unnumbered** — a footnote is "numbered" only if its source has a matching superscript reference (`a[href*="#tcm:<cid>"]`) in the page body. Footnotes with no in-body superscript reference (e.g. standalone disclosures like Member FDIC, Equal Housing Lender) are unnumbered.
- **Never use `<ol>`** for footnote numbering — numbering comes from the `<sup><a>` markers in body content and the footnotes engine, not an ordered list.
- **Superscript format** — any source `<sup>` footnote reference MUST be authored as `<sup><a href="#tcm:...">N</a></sup>` (the `<sup>` wraps the anchor, never the reverse).

4. Extract pageid (DT1/QSR/LRC/PM pattern)
5. Add ALL collected CIDs to metadata footnotes field:
   ```
   <div><div><p>footnotes</p></div><div><p>tcm:84-341684-16, tcm:84-47895-16, tcm:84-20661-16, tcm:84-226264-16</p></div></div>
   <div><div><p>pageid</p></div><div><p>DT1-...</p></div></div>
   ```
6. Footnote reference format in body: `<sup><a href="#tcm:84-XXXXXX-16">N</a></sup>` (sup wraps the anchor, NOT the other way around)

**Critical:** Do NOT only extract footnotes referenced by superscript. Also extract page-specific disclaimers (like legal disclaimers with their own CID) and standard disclosures. The source of truth is the `data-cid` attributes in the footnotes section at the bottom of the page — capture ALL of them.

**NEVER include footnote body text in page content.** The footnote/disclaimer text at the bottom of the source page (EEO statements, legal disclosures, FDIC notices, etc.) must NOT be imported into the page as default content, Cards, or any block. Only the CID goes in the metadata `footnotes` field. The footnote text lives in `/data/footnotes.json` (sheet `default` for EN, sheet `es` for Spanish) and is rendered automatically by the Disclaimers auto-block.

### Step 7: Write Output File

**Format: DA table authoring format.** Pages pushed to DA MUST use `<table>` blocks with the block name in the first row and `<hr>` section breaks between sections. This is the ONLY format the DA editor renders as proper blocks. Do NOT use the rendered `<div class="blockname">` format — DA shows that as raw text (e.g. "style / heading-bar") and does not reconstruct the block tables.

**Key rules for DA table format:**
- Each section is separated by an `<hr>` (DA's section-break marker). Do NOT wrap sections in extra `<div>`s.
- A block is a `<table>`; the first row is a single cell with the block name (`<tr><td>Hero</td></tr>` or, for multi-column blocks, `<tr><td colspan="2">Cards</td></tr>`).
- `colspan="2"` (or matching column count) is REQUIRED on the block-name header row of any block whose body rows have 2+ columns (Cards, Accordion, Section Metadata, Columns, Metadata, Table). Single-cell blocks (Hero, Divider, Fragment) use a plain `<td>`.
- **Hero** is single-cell: image + heading + CTA all in one `<td>` (hero.js reads `:scope > div > div`).
- **Section Metadata** is its own table after the block: `<table><tr><td colspan="2">Section Metadata</td></tr><tr><td>style</td><td>center-align, heading-bar</td></tr></table>`.
- **Footnote refs** stay as `<sup><a href="#tcm:...">N</a></sup>` (bare hash — DA keeps it when the doc is in table format).

```html
<h1 id="slug">Title</h1>
<hr>
<table><tr><td>Hero</td></tr><tr><td><picture><img src="..." alt=""></picture><h2>...</h2><p>... <sup><a href="#tcm:84-XXXXXX-16">1</a></sup></p></td></tr></table>
<table><tr><td colspan="2">Section Metadata</td></tr><tr><td>style</td><td>center-align, heading-bar</td></tr></table>
<hr>
<h2>Section heading</h2>
<table><tr><td colspan="2">Cards</td></tr><tr><td><picture><img src="..." alt=""></picture></td><td><h3>Card title</h3><p>...</p></td></tr></table>
<table><tr><td colspan="2">Section Metadata</td></tr><tr><td>style</td><td>heading-bar, center-align</td></tr></table>
<hr>
<table><tr><td>Fragment</td></tr><tr><td>/fragments/path</td></tr></table>
<hr>
<table><tr><td colspan="2">Metadata</td></tr><tr><td>Title</td><td>Page Title</td></tr><tr><td>Description</td><td>...</td></tr><tr><td>Keywords</td><td>...</td></tr><tr><td>footnotes</td><td>tcm:...</td></tr><tr><td>pageid</td><td>DT1-...</td></tr></table>
```

**DA-pulled pages are different.** When a page is pulled DOWN from DA it comes in *rendered* format (`<body><header></header><main>…<div class="hero">…</main><footer></footer></body>`). That format renders on the live site but is NOT editable as blocks in the DA editor. To re-author or re-push such a page, first convert it back to the table format above.

### Step 8: Post-Process

**ALWAYS run post-process** on the output file — whether from importer or manually constructed:
```bash
node tools/importer/post-process.js <output-file>
```
Post-process handles: div balance, hero serialization fixes, footnote ref format (`<sup><a>`, including anchors with extra attributes), trailing-slash removal on internal links (incl. before `?query`/`#hash`), trailing-arrow removal from link text (`>`, `&gt;`, `›` are CSS decoration, never content), `<ol>`→`<p>` flattening for footnotes, pageid stripped from the footnotes CID list, section-metadata generation (accordions always get `narrow-width`), and orphan line joining.

The script also emits `⚠` warnings (it cannot auto-fix these — an author must act):
- **Footnote CID lost on import** — a footnote anchor that points at `/` or `#` and still shows "Opens a modal dialog for footnote N" has lost its CID. Post-process reduces it to a bare `<sup>N</sup>` and warns; look up the correct `#tcm:` CID from `/data/footnotes.json` and wire it back as `<sup><a href="#tcm:...">N</a></sup>`.
- **Keywords row missing** — a Metadata block with no Keywords row almost always means keywords weren't carried over. Copy the source `<meta name="keywords">` content verbatim into a Keywords row (after Description).

The script auto-detects the DA-pulled `<body>/<main>` wrapper and adapts (unwraps, processes, re-wraps), so it works on both freshly-imported files and DA-pulled files. It does NOT convert rendered `<div class="blockname">` markup into DA table format — that conversion is manual (see Step 7).

### Step 9: Post-Import Validation Checklist (MANDATORY)

Run through EVERY item before reporting import as done. Do NOT skip any.

**Metadata checks:**
- [ ] Title extracted verbatim from `<title>` tag?
- [ ] Description extracted from `<meta name="description">`?
- [ ] Keywords extracted from `<meta name="keywords">`? (if present on source)
- [ ] ALL footnote CIDs collected from `data-cid` attributes (numbered + disclosures)?
- [ ] Pageid extracted (DT1/QSR/LRC/PM)?

**Content checks:**
- [ ] Screenshot taken to verify image placement matches source?
- [ ] No content sections missing (compare source H2 count vs imported H2 count)?
- [ ] Text imported VERBATIM (not paraphrased/translated)?
- [ ] Internal links have NO trailing slash (except `/` homepage)?
- [ ] Footnote body text NOT included in page content (no EEO, FDIC, legal text as default content or blocks)?

**Section metadata checks:**
- [ ] EVERY section with an H2 checked individually for heading-bar indicator?
- [ ] Heading-bar indicator includes: `div.ps-mid-page-title-top-line`, zero-width joiner, or thin decorative element before H2?
- [ ] Sections with heading-bar + Cards/Tabs have `heading-bar, center-align`?

**Block structure checks:**
- [ ] No block nesting (e.g., accordion inside tabs → use Reference + Fragments)?
- [ ] Block tables use `<td>` for block name row (not `<th>`)?
- [ ] Cards use plain variant for full-size images, `icons bg-image` only for small icons?

**DA format checks (before pushing to DA):**
- [ ] File is in DA TABLE format (`<table>` blocks + `<hr>` section breaks), NOT rendered `<div class="blockname">` format?
- [ ] Multi-column block headers have `colspan="2"` (Cards, Accordion, Section Metadata, Columns, Metadata, Table)?
- [ ] Section Metadata renders as a table (NOT as literal "style / heading-bar" text)?
- [ ] Footnote refs are `<sup><a href="#tcm:...">N</a></sup>` (bare hash, sup wraps anchor)?
- [ ] Metadata block includes Title, Description, Keywords, footnotes, pageid (Keywords not dropped)?
- [ ] After pushing to DA, reload the DA editor and confirm blocks render as tables (not raw text)?

**Render check:**
- [ ] Page renders in local preview without errors?
- [ ] Cross-check footnote CIDs against `/data/footnotes.json`?

### Step 10: Report

1. Report import complete with page structure summary
2. Report missing footnotes in table format for user to copy to sheet

## Theme-Specific Import Strategies

### New Theme Pages

These pages have a modern responsive structure. Use `import-es-product-landing.bundle.js` pattern:
- Hero: detected from marquee/banner containers
- Cards: detected from `.small-promo-combined`, `.ps-marketing-small-promo-items`, or grid card patterns
- Accordion: detected from `<details>/<summary>` or show/hide button patterns
- FAQ: usually `<group>` elements with `<button>` triggers

### Old Theme Pages

These pages have legacy layout. Use patterns from `old-theme/import-old-theme.js`:
- Accordion: H2 with expand/collapse buttons or `<a href="#Expand">`
- Cards: Simple grids with `.c54`/`.c55`/`.c60` column layouts
- Content: Primarily default content (paragraphs, lists, bold labels)
- Sidebar: "More Resources" → extract as Fragment reference
- Bio pages (governance): Portrait + text → Text Image block (default float variant)

### Governance/Bio Pages

Use `import-governance-bios.js` pattern:
- Portrait photo floated left with bio text wrapping around it
- Text Image block (default variant — float wrap)
- Fragment: `/fragments/about/corporate/governance/contact-us` (EN) or `/es/fragments/about/corporate/governance/contact-us` (ES)

## Critical Rules

1. **Never lose content** — If content doesn't match a known block pattern, import it as default content (paragraphs, headings, lists). Flag it for user review.
2. **Footnote format** — `<sup>` must wrap `<a>`, never the reverse: `<sup><a href="#tcm:...">N</a></sup>`
3. **No pageid in footnotes** — DT1/QSR/LRC IDs go in pageid metadata only, never in footnotes list.
4. **Absolute URLs** — Convert `https://www.wellsfargo.com/path` to `/path`. Keep external URLs absolute. Internal links must NOT have a trailing slash anywhere in the path: strip it before a query string or hash too (`/about/investor-relations`, `/mortgage/rates?utm=x`, `/about#team` — never `/about/investor-relations/`, `/mortgage/rates/?utm=x`, `/about/#team`). The only exception is `/` for the homepage.
5. **Images** — Keep wellsfargomedia.com URLs as-is during import (will be migrated to DA assets later).
6. **Div balance** — Every line must have equal `<div>` opens and `</div>` closes.
7. **ES pages** — Use `/es/` prefix in output path. Fragment paths should also use `/es/` prefix.
8. **Missing footnotes report** — After import, check all referenced CIDs against the footnotes.json sheet and report any missing ones in table format.
9. **Hero variant selection** — Use `overlay-bottom` when the source page shows image on top with text/heading in a card overlapping the bottom of the image (centered text below image). Use default Hero when text is positioned on the left side overlaying the full image.
10. **Never paraphrase or translate** — Import text VERBATIM from the source page. Never reword, summarize, or translate headings, paragraphs, or link text. If the page redirected to Spanish but the requested URL is English, you MUST re-navigate to get the English content. Never manually translate Spanish text to English.
11. **No block nesting** — EDS does not support blocks inside blocks. If a tab panel needs to contain an Accordion (or any other block), use the `Tabs (Reference)` variant where each tab panel references a Fragment path. The fragment page then contains the nested block. Same applies to any scenario where one block's content needs another block inside it.
12. **Leaving-site interstitial is automatic** — Off-site links show a "You are leaving wellsfargo.com" confirmation popup before navigating, handled globally by `scripts/leaving-site.js` (loaded in the lazy phase). Authors do NOT mark links manually and there is no `data-href-id` indirection — just keep the real external URL on the link's `href` (absolute, per Rule 4). A link triggers the popup when its host is off-origin, not an EDS host, does NOT contain `wellsfargo`, and is not on the exclusion list. **Any host containing `wellsfargo` is auto-excluded** (treated as first-party — no popup), covering `wellsfargo.com` and all subdomains (`connect.secure.wellsfargo.com`, `creditcards.wellsfargo.com`, etc.) without listing them. Additional non-`wellsfargo` trusted hosts (e.g. `wf.com`, `wellsfargomedia.com`) go in the `leaving-site-allow` key of `placeholders.json` (matched by exact host). Interstitial copy (`leaving-site-title`, `leaving-site-body` with a `{domain}` token, `leaving-site-continue`, `leaving-site-cancel`) is localized in `placeholders.json` (sheets `en`/`es`); the script ships built-in EN/ES defaults so it works before the sheet is published.

## Output: Missing Footnotes Report

After every import, present missing footnotes like this:

```
**Missing Footnote CIDs (not in /data/footnotes.json):**

| cid | Referenced on page |
|-----|-------------------|
| tcm:84-XXXXXX-16 | /personal-loans/rates |
| tcm:84-YYYYYY-16 | /personal-loans/rates |
```

If no footnotes are missing, state: "All footnote CIDs are present in footnotes.json."
