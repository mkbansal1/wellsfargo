# Wells Fargo EDS Migration Plan

## Status
**Consolidated from two independent analysis reports** ([migration-claude.html](report/old-report/migration-claude.html) and [final.html](report/final.html)), reconciled against each other and the AGENTS.md migration rules. Step 1 (Repo Bootstrap) is already complete — fonts, tokens, and folder structure are committed.

---

## Key Decisions (Locked)

| # | Decision | Resolution | Source |
|---|---|---|---|
| D1 | **Wealth theme** | `/investing-wealth/` only uses `theme: wealth` metadata. Default everywhere else incl. Premier/CIB. | Both reports |
| D2 | **Block Party priority** | Use Block Party blocks aggressively before building custom. 70% similarity = variant, not new block. | migration-claude |
| D3 | **Header/Footer variants** | **7 variants**: Default, Default ES, Biz, Biz ES, CIB, CIB ES, Wealth. Selected via page metadata `nav:` / `footer:`. | Reconciled |
| D4 | **Spanish scope** | Phase 1: Spanish home page only (`/es/`). All other `/es/*` pages deferred. | Both reports |
| D5 | **Help framework** | Same framework as consumer pages. No separate legacy layout. | Both reports |
| D6 | **Fonts** | Self-host Wells Fargo Sans (light/regular/semibold/bold) under `/fonts/`. **Already done in Step 1.** | Both reports |
| D7 | **Image hosting** | Migrate all images from `www17.wellsfargomedia.com` to DA `/assets/`. Zero external image refs at go-live. | migration-claude |
| D8 | **Rates source** | DA-hosted spreadsheets. Rates Table block reads from sheets. | migration-claude |
| D9 | **Calculators/tools** | Phase 2 scope. Phase 1: stub pages linking to live site URLs via placeholders. | Both reports |
| D10 | **Footnote/disclosure IDs** | Author verbatim per page in Phase 1 (PM-…, DT2-…, LRC-1224). Long-term strategy deferred. | migration-claude |
| D11 | **Analytics** | Out of scope Phase 1. No tag manager. | migration-claude |
| D12 | **Cookie consent** | Copy live-site config as `/fragments/cookie-consent`. Block Party Cookie Consent block. | migration-claude |
| D13 | **Feedback widget** | Out of scope Phase 1. | migration-claude |
| D14 | **Sitemap/redirects** | EDS owns `/sitemap.xml`. 301 redirects for retired URLs before go-live. Deferred decision. | migration-claude |
| D15 | **External domains** | No migration. Links preserved for creditcards, stories, oam, connect.secure, appointments, etc. Trigger leaving-site Modal. | Both reports |
| D16 | **Project structure** | Single DA project. Folders mirror site IA. `/es/` subfolder for Spanish. | Both reports |
| D17 | **Placeholders & Configs** | `placeholders.json` for phone numbers, sign-on URLs, app store links, FDIC strings. `/configs/` for rates, theme map. | migration-claude |

---

## 1. Executive Summary

| Attribute | Value |
|---|---|
| **Source site** | https://www.wellsfargo.com/ |
| **Total URLs (sitemap)** | **~1,281** |
| **Phase 1 delivery** | **903 pages** (887 full imports + 16 calculator stubs) |
| **Deferred (future)** | **356 pages** (Spanish locale mirrors per D4) |
| **Excluded** | **22 URLs** (test/dev, CMS fragments, utility endpoints) |
| **Target** | AEM Edge Delivery Services — Document Authoring (DA) |
| **DA content host** | `content.da.live/mkbansal1/wellsfargo/` |
| **Page templates** | **16** |
| **Theme palettes** | **2** (Default + Wealth) |
| **Header/footer variants** | **7** |
| **Block Collection blocks** | **13** (to adopt and style) |
| **Block Party blocks** | **5** (community reuse per D2) |
| **Custom blocks** | **12** (build new) |
| **Font strategy** | Self-hosted Wells Fargo Sans — **already committed** |
| **Estimated effort** | **~28 days** |

---

## 2. Template Inventory

| # | Template | Phase 1 Pages | Future Pages | Theme | Header/Footer | Representative URL | Key Blocks |
|---|---|---|---|---|---|---|---|
| T1 | Homepage | 2 | 0 | Default | Default, Default ES | `/` | Hero (Marquee), Sign-On Tile, Carousel, Cards, Rates Table, App Promo, Fragment, help-cta |
| T2 | L1 Product Landing | 5 | 7 | Default | Default, Default ES | `/checking/`, `/savings-cds/` | Hero, Tabs, product-comparison, Cards, Accordion, App Promo, help-cta |
| T3 | Product Detail | 146 | 77 | Default | Default, Default ES | `/checking/everyday/` | Hero, Cards, Table, App Promo, Accordion, Disclaimers |
| T3s | Calculator Stub | 16 | 2 | Default | Default, Default ES | `/personal-loans/debt-consolidation-calculator/` | Stub: description + CTA via `{{placeholder}}` |
| T4 | L2 Category Hub | 21 | 18 | Default | Default, Default ES | `/auto-loans/`, `/mortgage/` | Hero, Cards, Columns, Accordion, resource-links |
| T5 | Education Article | 57 | 39 | Default | Default, Default ES | `/goals-credit/smarter-credit/credit-101/` | Default content, Cards, Help Sidebar, Disclaimers |
| T6 | Help / FAQ | 51 | 45 | Default | Default, Default ES | `/help/checking-savings/` | Tabs, Accordion, contact-info, Cards, Breadcrumb |
| T7 | Security / Fraud | 22 | 22 | Default | Default, Default ES | `/privacy-security/fraud/` | Callout, Cards, Tabs, Fragment |
| T8a | Biz Landing | 1 | 1 | Default | **Biz**, Biz ES | `/biz/` | Hero, Cards, Columns, App Promo, help-cta |
| T8b | Biz Sub-page | 106 | 64 | Default | **Biz**, Biz ES | `/biz/checking/` | Hero, Cards, product-comparison, Table, Disclaimers |
| T9 | CIB/Com Landing | 2 | 0 | Default | **CIB**, CIB ES | `/cib/`, `/com/` | Hero, Carousel, Deal Card, Cards, Quote, Embed |
| T10 | CIB/Com Sub-page | 148 | 27 | Default | **CIB**, CIB ES | `/cib/insights/*` | Default content, Cards, Quote, Embed, Disclaimers |
| T11 | Wealth / Investing | 2 | 0 | **Wealth** | **Wealth** | `/investing-wealth/` | Hero, Cards, Columns, Accordion, Disclaimers |
| T12 | Privacy/Legal/Utility | 297 | 27 | Default | Default, Default ES | `/privacy-security/`, `/atm/` | Default content, Table, Columns, Disclaimers |
| T13 | Leadership Bio | 26 | 26 | Default | Default, Default ES | `/about/corporate/governance/scharf/` | Columns, Cards, Default content |
| T14 | About Landing | 1 | 0 | Default | Default, Default ES | `/about/` | Hero, Cards, Fragment, Columns |
| | **TOTALS** | **903** | **356** | | | | |

---

## 3. Block Inventory

### 3A. Block Collection — Adopt & Style (13 blocks)

| Block | Variants | Templates |
|---|---|---|
| **Hero** | `marquee`, `compact`, `biz`, `cib`, `wealth` | T1–T4, T7–T9, T11, T14 |
| **Cards** | `icon`, `icon-belt`, `benefit`, `article`, `product`, `icon-list`, `insight`, `3-up`, `4-up` | Nearly all |
| **Columns** | `image-text`, `reverse`, `centered`, `bio-sidebar` | T4, T8a, T10–T14 |
| **Accordion** | `compact`, `numbered` | T2–T4, T6, T11 |
| **Tabs** | `product-finder`, `help-tabs`, `scam-categories` | T2, T6, T7 |
| **Table** | `striped`, `bordered`, `fee` | T3, T8b, T12 |
| **Carousel** | `promo`, `insights` | T1, T9 |
| **Quote** | — | T9, T10 |
| **Embed** | `video`, `podcast` | T9, T10, T12 |
| **Fragment** | `app-promo`, `fdic-bug`, `cookie-consent`, `leaving-site`, `footer-disclosures`, `investment-disclosures`, `careers-promo` | All |
| **Header** | 7 variants per D3 | All |
| **Footer** | 7 variants per D3 | All |
| **Form** | — | None Phase 1 |

### 3B. Block Party — Community Reuse (5 blocks)

| Block | Variants | Templates |
|---|---|---|
| **Breadcrumb** | — | T3–T7, T12 |
| **Callout / Alert** | `alert`, `info`, `warn` | T3, T7 |
| **Modal / Interstitial** | `leaving-site`, `footnote`, `spanish-not-available` | All (per D15) |
| **Cookie Consent** | — | All |
| **Search** | — | T6 |

### 3C. Custom Blocks — Build New (12 blocks)

| Block | Variants | Templates | Rationale |
|---|---|---|---|
| **Sign-On Tile** | `cons`, `biz`, `vantage` | T1, T9 | No BC/BP equivalent |
| **product-comparison** | `checking`, `savings`, `cards` | T2, T8b | Richer than Table; responsive collapse |
| **product-card** | `compact`, `detailed` | T2, T3 | Label/value pairs + CTAs; not Cards |
| **Rates Table** | `cd`, `savings`, `mortgage` | T1, T12 | DA spreadsheet-driven per D8 |
| **App Promo** | `compact`, `side-by-side` | T1, T3, T4, T8a | Device mockup + store badges |
| **help-cta** | `default`, `product`, `biz` | T1–T6 | ~600+ pages; authored as fragments |
| **Deal Card** | — | T9, T10 | CIB deal structure |
| **Disclaimers** | — | All | Auto-blocked from "Footnotes" heading |
| **resource-links** | `3-col`, `4-col` | T2, T4, T6, T8a, T12 | Categorized link grids |
| **contact-info** | — | T6, T12, T13 | Dept phone numbers |
| **Help Sidebar** | — | T5 | "How do I…" sidebar |
| **Section Theme** | `default`, `wealth` | T11 | Wealth palette per D1 |

### 3D. Default Content (David's Model)

Page title, body prose, headings, lists, inline links, images with captions, long-form FAQ headings, footnote bodies inside Disclaimers. **Prefer default content over blocks per AGENTS.md Rule 1.**

---

## 4. Design Tokens

### 4.1 Colors — Default Theme (already in `styles.css`)

| Token | Hex | Usage |
|---|---|---|
| `--wf-red` | `#D71E28` | Primary brand, CTAs, alerts |
| `--wf-yellow` | `#FCC60A` | Secondary accent, highlights |
| `--wf-dark` | `#141414` | Dark hero/promo backgrounds, footer |
| `--wf-text-primary` | `#3B3331` | Primary body/heading text |
| `--wf-text-secondary` | `#787070` | Muted text, captions |
| `--wf-link` | `#5A469B` | Link color (purple) |
| `--wf-link-hover` | `#6048AD` | Link hover |
| `--wf-bg-warm` | `#F4F0ED` | Warm section backgrounds |
| `--wf-bg-light` | `#F9F7F6` | Light section backgrounds |
| `--wf-bg-gray` | `#E2DEDE` | Dividers, borders |
| `--wf-green` | `#468254` | Success, checkmarks |
| `--wf-cream` | `#FFF7E2` | Cream-tinted promos |

### 4.2 Colors — Wealth Theme (scoped to `[data-theme="wealth"]` per D1)

| Token | Hex | Usage |
|---|---|---|
| `--wf-wealth-primary` | `#0C2340` | Navy primary |
| `--wf-wealth-accent` | `#B89060` | Gold accent |
| `--wf-wealth-accent-deep` | `#8B6F3F` | Deep gold |
| `--wf-wealth-bg` | `#F5EFE6` | Cream canvas |
| `--wf-wealth-text` | `#1C2533` | Wealth text |

### 4.3 Typography (already in `styles.css`)

| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `--fs-h1` | 34px | 1.25 | 400 | Page title |
| `--fs-h2` | 28px | 1.25 | 400 | Section heading |
| `--fs-h3` | 22px | 1.3 | 400–600 | Sub-section |
| `--fs-h4` | 18px | 1.35 | 600 | Card titles |
| `--fs-body` | 17px | 1.5 | 400 | Body copy |
| `--fs-small` | 14px | 1.45 | 400 | Captions, footnotes |
| `--fs-micro` | 12px | 1.4 | 500 | Disclosures, legal |

**Font stack:** `"Wells Fargo Sans", Arial, Helvetica, sans-serif` — self-hosted, `font-display: swap`

### 4.4 Spacing & Layout (already in `styles.css`)

| Token | Value |
|---|---|
| Max content width | **1400px** |
| Section vertical padding | 40–60px |
| Card gap | 24–32px |
| Button border-radius | 24px (pill) |
| Card border-radius | 8–12px |
| Nav height | ~64px |
| Focus ring | 2px solid `--wf-red`, 1px offset |

### 4.5 Section-Metadata Styles

| Style | Background | Text | Use |
|---|---|---|---|
| `warm` | `#F4F0ED` | `--wf-text-primary` | Warm-toned content |
| `dark` | `#141414` | `#FFFFFF` | Dark hero/promo, footer |
| `highlight` | `#F9F7F6` | `--wf-text-primary` | Subtle emphasis |
| `cream` | `#FFF7E2` | `--wf-text-primary` | Yellow-tinted promos |
| `wealth` | `#F5EFE6` | Wealth palette swap | Full palette for T11 |

---

## 5. Navigation Plan

### 5.1 Header / Footer Variants (7)

| Variant | Header Path | Footer Path | Used By |
|---|---|---|---|
| **Default** | `/nav` | `/footer` | T1–T7, T12–T14 |
| **Default ES** | `/es/nav` | `/es/footer` | Spanish home |
| **Biz** | `/biz/nav` | `/biz/footer` | T8a, T8b |
| **Biz ES** | `/es/biz/nav` | `/es/biz/footer` | (future) |
| **CIB** | `/cib/nav` | `/cib/footer` | T9, T10 |
| **CIB ES** | `/es/cib/nav` | `/es/cib/footer` | (future) |
| **Wealth** | `/investing-wealth/nav` | `/investing-wealth/footer` | T11 |

### 5.2 Page Metadata Pattern

```yaml
nav: /cib/nav
footer: /cib/footer
theme: default
locale: en
```

### 5.3 DA Folder Structure (per D16)

```
/                                — homepage
/checking/, /savings-cds/, /auto-loans/, /personal-loans/, /mortgage/,
  /credit-cards/, /debit-card/, /rewards/, /premier/, /atm/     — consumer
/biz/, /com/, /cib/, /investing-wealth/, /about/                — other LOBs
/financial-education/, /financial-goals/, /financial-health/,
  /goals-credit/, /goals-investing/                             — education
/help/, /privacy-security/, /online-banking/, /mobile-online-banking/ — utility
/es/                             — Spanish home (Phase 1); full mirror (future)
/fragments/                      — shared fragments
/configs/                        — placeholders.json, theme-map, rates/*.json
/assets/                         — migrated images (per D7)
```

### 5.4 External Link Handling (per D15)

External-domain links (`creditcards.wellsfargo.com`, `connect.secure.wellsfargo.com`, `appointments.wellsfargo.com`, `stories.wf.com`, `oam.wellsfargo.com`) trigger the **leaving-site Modal** block (Block Party). `www17.wellsfargomedia.com` fully replaced per D7.

---

## 6. Bulk Import Strategy

### 6.1 Three-Gate Approach

| Gate | Pages | Purpose |
|---|---|---|
| **Gate 1** | 15 | 1 per template — parser validation |
| **Gate 2** | ~79 | 5–10 per template — edge cases, variants |
| **Gate 3** | ~793 | Remaining production — waved import |
| **Phase 4** | 1 (+356 future) | Spanish home + deferred mirror |

### 6.2 Template Import Priority

| Priority | Template(s) | Gate 1 URL | Gate 2 Batch |
|---|---|---|---|
| 1 | T1 Homepage | `/` | n/a (single page) |
| 2 | T2 Product Landing | `/checking/` | /biz/checking/, /savings-cds/, /credit-cards/, /auto-loans/, /mortgage/ |
| 3 | T3 Product Detail | `/checking/everyday/` | /checking/premier/, /checking/clear-access-banking/, /checking/prime/, /savings-cds/way2save/, /savings-cds/platinum/, /savings-cds/certificate-of-deposit/ |
| 4 | T6 Help/FAQ | `/help/checking-savings/` | /help/credit-cards/, /help/mobile-features/, /help/security-and-fraud/, + 3 deep articles |
| 5 | T13 Leadership Bio | `/about/corporate/governance/scharf/` | 5–7 additional bios |
| 6 | T8a+T8b Business | `/biz/` | /biz/checking/, /biz/merchant/, /biz/online-banking/, + 5 sub-pages |
| 7 | T9+T10 CIB/Commercial | `/cib/` | /cib/global-markets/, /cib/investment-banking/, /cib/insights/, + 5 articles |
| 8 | T11 Wealth | `/investing-wealth/` | 5–7 deeper investing pages |
| 9 | T14 About Landing | `/about/` | /about/inclusion/, /about/investor-relations/, /about/responsibility-and-impact/ |
| 10 | T4 Category Hub | `/auto-loans/` | /mortgage/buying-a-house/, /financial-goals/save/, /rewards/ |
| 11 | T5 Education Article | `/goals-credit/smarter-credit/credit-101/` | 5–7 financial-education articles |
| 12 | T7 Security/Fraud | `/privacy-security/fraud/bank-scams/` | /privacy-security/fraud/, /privacy-security/fraud/report/, + 5 articles |
| 13 | T12 Privacy/Legal | `/atm/` | /foreign-exchange/, /international-remittances/mexico/, /tax-center/ |
| 14 | Spanish home | `/es/` | n/a |

### 6.3 Gate Acceptance Criteria

- Visual diff vs. live: hero, primary content, CTAs match brand intent
- All links resolved or marked external with leaving-site modal
- Placeholder-driven values render from `placeholders.json`
- Correct nav/footer variant per page metadata
- Wealth theme on T11 only (per D1)
- Images served from DA (zero `www17.wellsfargomedia.com` refs per D7)
- Lighthouse mobile: perf ≥ 90, a11y ≥ 95, SEO ≥ 95
- No broken nav, breadcrumb, or missing fragment
- Disclosure/footnote IDs preserved verbatim (per D10)

---

## 7. Out of Scope

| Item | Reason |
|---|---|
| Auth-gated content (sign-on, dashboards, MFA) | Requires secure session |
| Application/commerce flows (creditcards.wellsfargo.com) | External domain per D15 |
| Interactive calculators/tools (~16 pages) | Phase 2 — stub pages link to live per D9 |
| ATM locator / appointment scheduling | Third-party API/external service |
| Analytics & MarTech (Adobe Launch, Target, Audience Manager) | Per D11 — handled via `delayed.js` |
| "How was your experience?" feedback widget | Per D13 |
| Site-wide search | Requires query-index post-migration |
| Spanish content beyond `/es/` home | Per D4 — deferred |
| MSM / LiveCopy / translation rollouts | Not applicable to EDS |
| Pixel-perfect visual parity | Brand-faithful, not pixel-identical |
| Custom server-side logic (geo-IP rate decisions) | No server-side in EDS |
| Email/push/SMS templates | Separate system |
| PDFs and downloadable assets | Linked as-is |
| Test/dev pages (~11 URLs) | Excluded |
| CMS fragments (`_navlinks`, `_reusable`; ~9 URLs) | Internal, not public |
| Utility endpoints (~2 URLs) | Excluded |

---

## 8. Step-by-Step Migration Worklist

### Step 1 — Repo & Project Bootstrap ✅ DONE (1 day)

**What:** DA project setup against EDS boilerplate. Create folder structure (`/fragments/`, `/configs/`, `/assets/`, `/es/`). Install Sidekick. Commit baseline `styles.css` with WF brand tokens (1400px max-width, 17px body, 34px H1, pill buttons, WF color palette). Self-host Wells Fargo Sans fonts (4 weights). Wire AEM Code Sync. Re-baseline page count against live sitemap.

**Depends on:** Nothing

**Status:** Complete — fonts downloaded, tokens committed, folder structure created.

---

### Step 2 — Single-Page Migration: T1 Homepage (1 day)

**What:** Hand-author `/` (Homepage) as the pilot page. Use Block Collection blocks (Hero, Cards, Carousel) + Fragment references + Default content. Custom-block placeholders where the real block doesn't exist yet. Download homepage images to `/assets/` per D7. Validate the full page lifecycle: author → preview → publish.

**Depends on:** Step 1

**Validates:** Fragment loading, Hero marquee, Carousel promo tiles, help-cta pattern, Disclaimers footer, basic nav/footer rendering.

---

### Step 3 — Single-Page Migration: T2, T3, T6, T13 Pilots (3 days)

**What:** Import one representative page each for the four templates with the widest block variety:
- **T2** `/checking/` — product-comparison, Tabs (product-finder), product-card, App Promo, help-cta
- **T3** `/checking/everyday/` — Hero, Cards (benefit), Table (fee), Accordion (FAQ), Disclaimers
- **T6** `/help/checking-savings/` — Tabs (help-tabs), Accordion, contact-info, Breadcrumb
- **T13** `/about/corporate/governance/scharf/` — Columns (bio+sidebar), default content, leadership bio layout

**Depends on:** Step 1

**Validates:** The 4 most structurally diverse templates. Confirms block table structures, section ordering, metadata patterns.

---

### Step 4 — Design Phase 1: Default Palette & Typography (2 days)

**What:** Complete `styles.css` implementation beyond the bootstrap tokens already committed. Add:
- Full heading scale (H1–H6) with responsive breakpoints at 600/900/1200px
- Button hover/focus/disabled states for primary (WF Red), secondary (outlined), accent (WF Yellow)
- Focus ring: `2px solid var(--wf-red)`, `1px offset`
- Print stylesheet baseline in `lazy-styles.css`
- `placeholders.json` initial structure with sign-on URLs, phone numbers, app store links, FDIC strings per D17

**Depends on:** Steps 2–3 (pilot pages provide real content to test against)

**Validates:** All Default-palette typography, colors, and button styles render correctly on pilot pages.

---

### Step 5 — Design Phase 1: Wealth Palette & Theme (1 day)

**What:** Navigate to `/investing-wealth/` on the live site and extract the Wealth-specific CSS values. Implement the `theme: wealth` metadata swap using `[data-theme="wealth"]` selector that overrides CSS custom properties:
- `--wf-wealth-primary: #0C2340`, `--wf-wealth-accent: #B89060`, `--wf-wealth-accent-deep: #8B6F3F`, `--wf-wealth-bg: #F5EFE6`, `--wf-wealth-text: #1C2533`
- Scope strictly to `/investing-wealth/` per D1 — NEVER apply to Premier, CIB, or Biz

Pilot on a T11 representative page.

**Depends on:** Step 4

**Validates:** Wealth palette renders only on T11 pages. Default palette unaffected site-wide.

---

### Step 6 — Navigation: 7 Header/Footer Variants (2 days)

**What:** Author all 7 nav/footer document pairs in DA:
- `/nav` + `/footer` (Default consumer)
- `/biz/nav` + `/biz/footer` (Business)
- `/cib/nav` + `/cib/footer` (CIB/Institutional)
- `/investing-wealth/nav` + `/investing-wealth/footer` (Wealth)
- `/es/nav` + `/es/footer` (Spanish — Phase 1 home only)
- Biz ES + CIB ES stubs for future

Wire `page-metadata` selection: each page's `nav:` and `footer:` properties select the correct variant. Build the **leaving-site Modal** (Block Party per D2) for all external-domain links per D15. Implement LOB-aware Sign On link logic (LOB=CONS, LOB=BIZ, etc.).

**Depends on:** Step 4

**Validates:** Every template renders its correct header/footer. External links trigger modal. Sign On URL varies by LOB.

---

### Step 7 — Design Phase 2: Block Styles & Fragments (4 days)

**What:** The largest step. Two parallel tracks:

**Track A — Block Collection styling (13 blocks):**
CSS for Hero (5 variants), Cards (9 variants), Columns (4 variants), Accordion (2 variants), Tabs (3 variants), Table (3 variants), Carousel (2 variants), Quote, Embed. Each styled to match Wells Fargo brand.

**Track B — Custom block builds (12 blocks):**
Build JS + CSS for: product-comparison, product-card, App Promo, help-cta, Deal Card, Disclaimers (auto-blocked), resource-links, contact-info, Sign-On Tile, Rates Table, Help Sidebar, Section Theme config.

**Track C — Fragment authoring:**
Author shared fragments in DA: cookie-consent (D12), leaving-site modal, app-promo, FDIC bug, careers-promo, investment-disclosures, footer-disclosures, help-cta-default, help-cta-product, help-cta-biz.

**Depends on:** Step 5

**Validates:** All 30 blocks render correctly. Fragment loading works. Custom blocks match source site patterns.

---

### Step 8 — Block Party Scan & Integration (1 day)

**What:** Per D2: systematically walk the Block Party catalog. For every custom block built in Step 7, check if a Block Party community block exists that matches ≥70% of its structure or behavior. If so, swap the custom block for the Block Party adoption + CSS class variant. This may eliminate 1–3 custom blocks.

**Depends on:** Step 7

**Validates:** Maximum reuse per AGENTS.md Rule 1 tier ordering. No unnecessary custom blocks.

---

### Step 9 — Block Critique (1.5 days)

**What:** Visual side-by-side comparison of every block (BC + BP + custom) against the live source site. For each block:
1. Screenshot the source site block
2. Screenshot the EDS-rendered block
3. Identify CSS/structural gaps
4. Fix (up to 3 iteration rounds per block)

Any block found ≥70% similar to another block gets folded as a CSS class variant. Re-author any pilot pages that lose a block in this pass.

**Depends on:** Step 8

**Validates:** All blocks are visually brand-faithful. No redundant blocks.

---

### Step 10 — Image Migration Tooling (1 day) ⚡ PARALLEL

**What:** Per D7: build a script that:
1. Enumerates all `www17.wellsfargomedia.com` image references across the sitemap
2. Downloads each image
3. Uploads to DA `/assets/` with folder structure mirroring source paths
4. Emits a URL-rewrite map for the bulk importer

This step runs **in parallel** with Steps 2–9 (no dependency on block/design work).

**Depends on:** Step 1 only

**Validates:** Image pipeline works end-to-end. Rewrite map is accurate.

---

### Step 11 — Gate 1 Import: 1 Page per Template (1.5 days)

**What:** Import 1 representative page per template (15 pages total). T1 is already done from Step 2. Import the remaining: T4, T5, T7, T8a, T8b, T9, T10, T11, T12, T14, plus Spanish home `/es/`.

For each page: run import, apply URL-rewrite map from Step 10, verify against Gate acceptance criteria (§6.3).

**Depends on:** Steps 6–10 (all design, nav, blocks, and image tooling complete)

**Validates:** Every template's parser works. Every block renders. Every nav variant loads.

---

### Step 12 — Gate 2 Import: Validation Batch (~79 pages) (2 days)

**What:** Import 5–10 pages per template using the batch lists from §6.2. This catches edge cases, variant layouts, and content patterns not visible in the single-page Gate 1.

Key batches:
- T3: `/checking/premier/`, `/checking/clear-access-banking/`, `/savings-cds/way2save/`, etc.
- T8b: `/biz/checking/`, `/biz/merchant/`, `/biz/online-banking/`, etc.
- T6: `/help/credit-cards/`, `/help/mobile-features/`, `/help/security-and-fraud/`
- T10: `/cib/global-markets/`, `/cib/investment-banking/`, `/cib/insights/`, etc.

Side-by-side comparison with live. Fix block CSS/structure issues at this gate.

**Depends on:** Step 11

**Validates:** Edge cases, block variant coverage, import stability across diverse content.

---

### Step 13 — Page Critique (1 day)

**What:** Cross-template walkthrough with stakeholder: sample 15 pages across all templates. Confirm Gate acceptance criteria are met. Lock the spec for Gate 3 bulk production import.

**Depends on:** Step 12

**Validates:** Stakeholder sign-off. No blocking issues before bulk import.

---

### Step 14 — Gate 3 Bulk Import: Full EN (~793 pages) (3 days)

**What:** Import all remaining English pages in waves, prioritized by template size:
- **Wave 1:** T12 Privacy/Legal (297 pages) in 40-page batches
- **Wave 2:** T10 CIB/Commercial Sub-page (148 pages) in 40-page batches
- **Wave 3:** T3 Product Detail (146 pages) in 30-page batches
- **Wave 4:** T8b Biz Sub-page (106 pages) in 30-page batches
- **Wave 5:** T5 Education (57 pages), T6 Help (51 pages), T13 Bio (26 pages) — single batch each
- **Wave 6:** All remaining small templates — single batch

Daily sanity check: 20 random page spot-checks. Broken-link sweep at end of each wave.

**Depends on:** Step 13

**Validates:** Full-scale import works. Wave batching prevents overload.

---

### Step 15 — Image Migration Execution (1 day)

**What:** Run the Step 10 script across all imported pages. Rewrite every `www17.wellsfargomedia.com` URL to the DA `/assets/` equivalent. Verify zero external image references remain site-wide per D7.

**Depends on:** Steps 10, 14

**Validates:** `grep -r "www17.wellsfargomedia.com" .` returns nothing (per AGENTS.md Rule 6).

---

### Step 16 — Spanish Home Page (0.5 day)

**What:** Author `/es/` per D4. Author `/es/nav` and `/es/footer` with Spanish strings and English fallback for not-yet-translated links. Verify the Default ES header/footer variant renders correctly.

**Depends on:** Step 14

**Validates:** Spanish locale pattern works. Foundation for future Phase 2 expansion.

---

### Step 17 — QA Pass (1 day)

**What:** Comprehensive quality check:
- Spot-check ~10% of pages across all 16 templates
- Lighthouse mobile: perf ≥ 90, a11y ≥ 95, SEO ≥ 95 on 5 representative pages
- Disclosure/footnote-fragment diff against live site (per D10 / R1)
- Image-migration completeness audit (per D7 / R2)
- External-link leaving-site modal test (per D15)
- Placeholder rendering verification (per D17)
- Wealth theme isolation check: confirm no wealth variables outside `/investing-wealth/` (per D1)

**Depends on:** Steps 14–16

**Validates:** Production-ready quality. All acceptance criteria met.

---

### Step 18 — Project Documentation (1 day)

**What:** Generate comprehensive handover documentation:
- **Block catalog:** One page per block with DA table structure, CSS classes, screenshot, usage notes
- **Authoring guide:** How to create pages, use fragments, set metadata, manage promos
- **Fragment index:** All shared fragments with paths and purposes
- **Placeholder index:** All `placeholders.json` keys with descriptions
- **Config index:** `/configs/` structure, rates sheets, theme map
- **Theme guide:** Default vs. Wealth palette usage rules
- **Bulk-importer runbook:** How to re-run imports for new pages
- **Decision log:** D1–D17 with rationale and dates

**Depends on:** Step 17

**Validates:** Project can be handed off to content authors and maintainers.

---

### Summary Timeline

```
Week 1:  Step 1 ✅ | Steps 2–3 (pilots) | Step 10 (image tooling, parallel)
Week 2:  Steps 4–5 (design) | Step 6 (navigation)
Week 3:  Step 7 (blocks + fragments — 4 days)
Week 4:  Steps 8–9 (Block Party scan + critique) | Step 11 (Gate 1)
Week 5:  Steps 12–13 (Gate 2 + page critique)
Week 6:  Step 14 (Gate 3 bulk import — 3 days)
Week 7:  Steps 15–16 (images + Spanish) | Steps 17–18 (QA + docs)
```

**Total: ~28 days / ~7 weeks**

---

## 9. Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Legal/disclosure drift** | **HIGH** | Author disclosures as dated fragments. Pin footnote IDs verbatim per D10. Pre-publish diff vs. live. |
| R2 | **Image migration at scale** | **HIGH** | Dedicated tooling (step 10). Verify zero external refs at QA. Cap upload concurrency. |
| R3 | **product-comparison complexity** | **HIGH** | Purpose-built block. Responsive collapse below 768px. Validate in step 3. |
| R4 | **Trademark/a11y preservation** | **HIGH** | Preserve ®, ™ verbatim. Re-add skip-link/SR-only at template level. |
| R5 | **Font licensing** | **MED** | Fonts already self-hosted. Confirm legal review before step 4. System fallback wired. |
| R6 | **Calculator stubs going stale** | **MED** | Route through placeholders for one-line config swap. |
| R7 | **help-cta strip variants** | **MED** | Three fragment variants. Page selects via metadata. |
| R8 | **Sitemap inflation (±15%)** | **MED** | Step 1 pre-flight: parse sitemap, drop non-200. Re-baseline. |
| R9 | **CSP/bot protection** | **MED** | Headless browser fallback. Throttle ~1/sec with retry. |
| R10 | **Fragment authoring training** | **MED** | Document in authoring guide. Example fragments in step 7. |
| R11 | **Footnote modal UX loss** | **MED** | Block Party Modal preserves pattern. `data-modal` superscripts. |
| R12 | **Large template wave overload** | **MED** | Batch T12/T3 in 30–40 page waves. Monitor per wave. |
| R13 | **SEO regressions** | **LOW** | Metadata block preserved. Lighthouse SEO ≥ 95 gate. |
| R14 | **Wealth theme bleed** | **LOW** | Variable swap scoped to section wrapper, not document. |
| R15 | **Single-project scale** | **LOW** | DA handles ~1,281 pages. Folder structure mirrors IA. |

---

## 10. Open Items

| # | Item | Phase 1 Default | Decision Needed |
|---|---|---|---|
| D9 | Calculators beyond Phase 1 | Stub pages with CTAs | Rebuild vs. embed vs. new origin? |
| D10 | Footnote ID strategy | Verbatim per page | Registry or regenerate long-term? |
| D14 | Sitemap/redirects | EDS owns sitemap; 301s | Exact redirect map before go-live |
| — | `/about/` header variant | Default header | 5th variant needed? |
| — | Block acceptance criteria | Visual match to live | Detailed spec per block? |
| — | Performance baselines | Lighthouse ≥ 90 perf | Formal SLAs? |
| — | Spanish Phase 2 timeline | Deferred | Target quarter? |

---

## 11. URL Inventory Summary

### Phase Breakdown

| Phase | Pages | Description |
|---|---|---|
| **Gate 1** | 15 | 1 per template |
| **Gate 2** | 79 | 5–10 per template |
| **Gate 3** | 793 | Remaining production (waved) |
| **Stubs** | 16 | Calculator stubs |
| **Phase 1 Total** | **903** | |
| **Deferred** | 356 | Spanish `/es/*` mirror |
| **Excluded** | 22 | Test/dev, CMS fragments |
| **Grand Total** | **1,281** | |

### Largest Template Families

| Template | Phase 1 Pages | Notes |
|---|---|---|
| T12 Privacy/Legal/Utility | 297 | Largest — batch in 40-page waves |
| T10 CIB/Commercial Sub-page | 148 | Heavy article content |
| T3 Product Detail | 146 | Batch in 30-page waves |
| T8b Biz Sub-page | 106 | Deep sub-tree |
| T5 Education Article | 57 | Multi-path article content |
| T13 Leadership Bio | 26 | Governance bios — uniform structure |

### Excluded URLs (22 total)

- `/_navlinks/*` (3 EN + 1 ES) — internal CMS fragments
- `/savings-cds/test/*` (2) — test pages
- `/es/devtest/*` (4) — dev pages
- `/es/testBCP1/` (1) — test page
- `/es/_reusable/*` (4) — CMS fragments
- Utility endpoints (2)
