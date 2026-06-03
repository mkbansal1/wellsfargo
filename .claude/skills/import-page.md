# Import Page Skill

Import and migrate Wells Fargo pages to AEM Edge Delivery Services (Document Authoring format).

## Invocation

User provides one or more URLs to import. Example:
- "Import https://www.wellsfargo.com/personal-loans/rates/"
- "Import these pages: [list of URLs]"

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

### Step 3: Extract Content

Use Playwright to navigate and extract:
1. **Page title** (from `<title>` tag)
2. **H1** heading
3. **Hero image** (if present — marquee/banner image)
4. **Body content** (paragraphs, headings, lists, bold text, links, images)
5. **Pageid** (DT1-..., QSR-..., or LRC-... pattern)
6. **Footnote CIDs** (any `#tcm:` references in links)
7. **Metadata footnotes** (CID list from footnote area if present)

### Step 4: Map Content to Blocks

Use the block library to find the best match. Available blocks:

| Block | Variants | Use When |
|-------|----------|----------|
| **Hero** | default, `overlay-bottom` | Full-width banner image + heading + CTA. Use `overlay-bottom` when the text/heading overlaps the bottom of the image in a centered card (image above, text card overlapping bottom). Use default when text is overlaid on the left side of the image. |
| **Cards** | `icons`, `bg-image`, `separator`, `compact`, `align-center` | Grid of items with image/icon + title + text |
| **Accordion** | `compact` | Expandable Q&A or FAQ sections (H3 + content pairs) |
| **Tabs** | `Yellow`, `Top`, `Tab-Fill`, `Panel-Border` | Tabbed content panels |
| **Columns** | `panel`, `ratio-25-75`, `ratio-33-67`, `ratio-67-33`, `ratio-75-25` | Side-by-side content |
| **Text Image** | default (float wrap), `image-left`, `image-right`, `image-top`, `compact-image` | Image + text layout |
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

**Rules:**
- Sections with H2 + major block (Cards, Accordion, Tabs) → `heading-bar, center-align`
- Sections with H2 + Accordion → `heading-bar, center-align, narrow-width`
- Hero overlay-bottom sections → `center-align, heading-bar`
- Plain H2 sections → `heading-bar` only (left-aligned by default)

### Step 6: Handle Footnotes

1. Extract all `#tcm:XX-XXXXXX-XX` references from content (href values in `<sup><a>` links)
2. Extract pageid (DT1/QSR/LRC pattern)
3. Add to metadata block:
   ```
   <div><div><p>footnotes</p></div><div><p>tcm:84-341684-16, tcm:84-221820-16, ...</p></div></div>
   <div><div><p>pageid</p></div><div><p>DT1-...</p></div></div>
   ```
4. Footnote reference format in body: `<sup><a href="#tcm:84-XXXXXX-16">N</a></sup>` (sup wraps the anchor, NOT the other way around)

### Step 7: Write Output File

Format: One section per line, DA-compatible HTML:
```html
<div><h1 id="slug">Title</h1></div>
<div><div class="hero overlay-bottom"><div><div><p><picture><img src="..." alt=""></picture></p><h2>...</h2><p>...</p></div></div></div><div class="section-metadata"><div><div><p>style</p></div><div><p>center-align, heading-bar</p></div></div></div></div>
<div><h2>Section heading</h2><div class="cards icons bg-image">...</div><div class="section-metadata">...</div></div>
...
<div><div class="fragment"><div><div><p>/fragments/path</p></div></div></div></div>
<div><div class="metadata"><div><div><p>Title</p></div><div><p>Page Title</p></div></div><div><div><p>footnotes</p></div><div><p>tcm:...</p></div></div><div><div><p>pageid</p></div><div><p>DT1-...</p></div></div></div></div>
```

### Step 8: Post-Process

Run `node tools/importer/post-process.js <output-file>` if the file was generated by an importer script. Skip if manually constructed.

### Step 9: Verify & Report

1. Check the page renders in local preview (`http://localhost:3000/content/...`)
2. Verify no content was lost (compare source sections vs output sections)
3. Cross-check footnote CIDs against `/data/footnotes.json`
4. Report missing footnotes in a table format for user to copy to sheet

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
4. **Absolute URLs** — Convert `https://www.wellsfargo.com/path` to `/path`. Keep external URLs absolute.
5. **Images** — Keep wellsfargomedia.com URLs as-is during import (will be migrated to DA assets later).
6. **Div balance** — Every line must have equal `<div>` opens and `</div>` closes.
7. **ES pages** — Use `/es/` prefix in output path. Fragment paths should also use `/es/` prefix.
8. **Missing footnotes report** — After import, check all referenced CIDs against the footnotes.json sheet and report any missing ones in table format.
9. **Hero variant selection** — Use `overlay-bottom` when the source page shows image on top with text/heading in a card overlapping the bottom of the image (centered text below image). Use default Hero when text is positioned on the left side overlaying the full image.

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
