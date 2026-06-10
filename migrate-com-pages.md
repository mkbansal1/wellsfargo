# Migrate /com/* Pages

## Purpose
Scrape, categorize, and migrate all Wells Fargo Commercial Banking pages under /com/* to AEM Edge Delivery Services via Document Authoring (DA). Includes recursive visual comparison and auto-fix.

## Trigger
Invoke when the user says "migrate com pages", "import com pages", "scrape and extract /com/ pages", or references this skill by name.

## URL Inventory (93 pages)

### Category 1: Homepage (1 page)
- https://www.wellsfargo.com/com/

### Category 2: Industry Hub + Detail Pages (13 pages)
- https://www.wellsfargo.com/com/industry/
- https://www.wellsfargo.com/com/industry/auto-dealerships/
- https://www.wellsfargo.com/com/industry/beverage/
- https://www.wellsfargo.com/com/industry/commodity-finance/
- https://www.wellsfargo.com/com/industry/education/
- https://www.wellsfargo.com/com/industry/food-and-agribusiness/
- https://www.wellsfargo.com/com/industry/government/
- https://www.wellsfargo.com/com/industry/growth-segments/
- https://www.wellsfargo.com/com/industry/healthcare/
- https://www.wellsfargo.com/com/industry/hospitality/
- https://www.wellsfargo.com/com/industry/oil-and-gas/
- https://www.wellsfargo.com/com/industry/sponsor-coverage/
- https://www.wellsfargo.com/com/industry/technology-banking/

### Category 3: Solutions Hub + Detail Pages (14 pages)
- https://www.wellsfargo.com/com/solutions/
- https://www.wellsfargo.com/com/solutions/asset-based-lending/
- https://www.wellsfargo.com/com/solutions/commercial-lines-and-loans/
- https://www.wellsfargo.com/com/solutions/equipment-financing/
- https://www.wellsfargo.com/com/solutions/equipment-financing/rail/
- https://www.wellsfargo.com/com/solutions/global-payments-liquidity/
- https://www.wellsfargo.com/com/solutions/global-receivables-and-trade/
- https://www.wellsfargo.com/com/solutions/global-receivables-and-trade/supplier-finance/
- https://www.wellsfargo.com/com/solutions/inventory-finance/
- https://www.wellsfargo.com/com/solutions/merchant-services/
- https://www.wellsfargo.com/com/solutions/renewable-energy-and-environmental-finance/
- https://www.wellsfargo.com/com/solutions/strategic-capital/
- https://www.wellsfargo.com/com/solutions/strategic-capital-leadership/

### Category 4: Insights Hub + Articles (34 pages)
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/big-crop-different-dynamic/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/fourth-july-food-report/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/GLP1-shifting-patterns/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/line-of-scrimmage/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/mothers-day/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/rethinking-nutrition/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/ripe-for-change/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/spending-on-food/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/superbowl/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/thanksgiving-food-report/
- https://www.wellsfargo.com/com/insights/agri-food-intelligence/thermostat-of-investment/
- https://www.wellsfargo.com/com/insights/bankers-on-a-mission/
- https://www.wellsfargo.com/com/insights/build-a-strong-management-team/
- https://www.wellsfargo.com/com/insights/business-viewpoints-podcast/
- https://www.wellsfargo.com/com/insights/channel-finance-versus-open-account/
- https://www.wellsfargo.com/com/insights/chicago-market-chomps/
- https://www.wellsfargo.com/com/insights/chicago-market-clients/
- https://www.wellsfargo.com/com/insights/chicago-qa-biodrowski/
- https://www.wellsfargo.com/com/insights/despite-uncertainty-sustainable-energy-tech-poised-for-growth/
- https://www.wellsfargo.com/com/insights/don-mooney-they-believed-in-me/
- https://www.wellsfargo.com/com/insights/drive-company-value/
- https://www.wellsfargo.com/com/insights/end-of-edi-api-propel-dealer-manufacturer/
- https://www.wellsfargo.com/com/insights/equipment-finance/
- https://www.wellsfargo.com/com/insights/every-business-owner-needs-contingency-plan/
- https://www.wellsfargo.com/com/insights/fintech-baas-shift-banking-strategies-improve-compliance-scalability/
- https://www.wellsfargo.com/com/insights/franchise-automotive-dealerships/
- https://www.wellsfargo.com/com/insights/future-proof-your-sales-pipeline-with-channel-finance/
- https://www.wellsfargo.com/com/insights/government-staffing-shortage-affects-everyone/
- https://www.wellsfargo.com/com/insights/how-hn-group-built-a-global-seafood-business/
- https://www.wellsfargo.com/com/insights/how-proptech-can-solve-three-common/
- https://www.wellsfargo.com/com/insights/how-to-rethink-treasury/
- https://www.wellsfargo.com/com/insights/making-waves-in-chicagoland/
- https://www.wellsfargo.com/com/insights/manage-government-staffing-shortages-with-automation/
- https://www.wellsfargo.com/com/insights/new-banking-relationship-set-up-for-long-term-success/
- https://www.wellsfargo.com/com/insights/protect-payments-as-ai-changes-landscape/
- https://www.wellsfargo.com/com/insights/renegotiating-terms-consider-supply-chain-finance/
- https://www.wellsfargo.com/com/insights/skeptical-about-channel-finance-reasons-to-reconsider/
- https://www.wellsfargo.com/com/insights/source-company-first-credit-facility/
- https://www.wellsfargo.com/com/insights/three-questions-business-owners-answer/
- https://www.wellsfargo.com/com/insights/treasury-takeaways/
- https://www.wellsfargo.com/com/insights/veteran-spotlight-video-series/
- https://www.wellsfargo.com/com/insights/what-to-keep-where-to-store-when-to-shred/
- https://www.wellsfargo.com/com/insights/working-capital-guarantee-can-unlock-growth-for-exporters/

### Category 5: Fraud & Security Pages (6 pages)
- https://www.wellsfargo.com/com/fraud/
- https://www.wellsfargo.com/com/fraud/fraud-schemes/
- https://www.wellsfargo.com/com/fraud/fraud/
- https://www.wellsfargo.com/com/fraud/online-mobile-fraud/
- https://www.wellsfargo.com/com/fraud/payments-fraud/
- https://www.wellsfargo.com/com/fraud/report-fraud/

### Category 6: Disclaimer Pages (3 pages)
- https://www.wellsfargo.com/com/disclaimer/
- https://www.wellsfargo.com/com/disclaimer/acb/
- https://www.wellsfargo.com/com/disclaimer/ged5/

### Category 7: Focus/Campaign Pages (4 pages)
- https://www.wellsfargo.com/com/focus/convenience-stores/
- https://www.wellsfargo.com/com/focus/fdic-pass-through/
- https://www.wellsfargo.com/com/focus/iso-20022/
- https://www.wellsfargo.com/com/focus/tigercat-finance/

### Category 8: Vantage Product Pages (3 pages)
- https://www.wellsfargo.com/com/vantage/biometric-authentication/
- https://www.wellsfargo.com/com/vantage/mobile-deposit-video/
- https://www.wellsfargo.com/com/vantage/mobile-token/

### Category 9: Leadership (1 page)
- https://www.wellsfargo.com/com/leadership/

### Category 10: Corporate Sponsored Mortgage (1 page)
- https://www.wellsfargo.com/com/corporate-sponsored-mortgage/

### Category 11: Spanish (es) Pages (8 pages)
- https://www.wellsfargo.com/es/com/corporate-sponsored-mortgage/
- https://www.wellsfargo.com/es/com/focus/convenience-stores/
- https://www.wellsfargo.com/es/com/focus/fdic-pass-through/
- https://www.wellsfargo.com/es/com/focus/iso-20022/
- https://www.wellsfargo.com/es/com/insights/agri-food-intelligence/ripe-for-change/
- https://www.wellsfargo.com/es/com/insights/agri-food-intelligence/spending-on-food/
- https://www.wellsfargo.com/es/com/insights/business-viewpoints-podcast/
- https://www.wellsfargo.com/es/com/insights/treasury-takeaways/

## Workflow

### Phase 1: Scrape & Analyze (per category)
For each category, process pages in batch:
1. Navigate to each URL using Playwright
2. Extract full page structure (DOM snapshot)
3. Extract all images (src URLs, dimensions)
4. Identify sections and map to existing blocks:
   - Hero (default, overlay-bottom)
   - Cards (icons, two-up, three-up, four-up, separator, highlight, bg-image, callout)
   - Columns (center, contact, panel, ratio-*)
   - Accordion (default, compact, numbered)
   - Tabs (default, reference)
   - Video, iFrame, Divider, Fragment, Contact Bar
   - Default content (H1-H6, paragraphs, lists, links, images)
5. Record section metadata (style: center-align, heading-bar, light, dark, warm, cream)
6. Extract footnote IDs (RO-*, LRC-*, DT*-*)
7. Identify page metadata (title, description, nav, footer, theme, locale)

### Phase 2: Generate Content HTML (per page)
For each page, generate `content/<path>.plain.html`:
1. Build EDS-compliant HTML structure with proper block markup
2. Use source image URLs directly (wellsfargomedia.com) for immediate preview
3. Include Section Metadata blocks where styling differs from default
4. Include Metadata block with all required fields
5. Set `nav: /com/nav` and `footer: /footer` for all pages
6. Set `locale: es` for Spanish pages, `locale: en` for English
7. Preserve all footnote IDs verbatim in `footnotes` metadata

### Phase 3: Visual Comparison & Fix Loop
For each migrated page, run recursive comparison:
1. Take screenshot of original page (Playwright at 1440px width)
2. Take screenshot of migrated page preview
3. Compare sections visually — identify differences:
   - Missing content
   - Wrong block variant used
   - Missing images
   - Incorrect alignment/spacing
   - Missing section metadata (background, centering, heading-bar)
4. Fix identified issues by updating the content HTML
5. Re-compare — repeat until no significant visual differences remain
6. Maximum 3 fix iterations per page

### Phase 4: Validate Compliance
For each migrated page, verify:
- [ ] No `www17.wellsfargomedia.com` in committed code (Rule 6 — content uses source URLs temporarily)
- [ ] All external links (wellsfargojobs.com, stories.wf.com, info.wf.com) noted for leaving-site modal (Rule 7)
- [ ] Footnote IDs preserved verbatim (Rule 8)
- [ ] No hardcoded phone numbers or sign-on URLs (Rule 5)
- [ ] Blocks follow mandatory reuse tier (Rule 1)

## Block Library Reference

Available blocks in this project (from `blocks/` directory):
| Block | Variants |
|-------|----------|
| hero | default, overlay-bottom |
| cards | icons, two-up, three-up, four-up, separator, highlight, bg-image, bg-light, callout, icons-middle, align-center, no-border |
| columns | center, center-headings, contact, panel, ratio-25-75, ratio-33-67, ratio-75-25, ratio-67-33 |
| accordion | default, compact, numbered |
| tabs | default, reference, yellow, indigo, bottom, top, tab-fill, icons, tab-center, tab-left, text-center, text-left, panel-border |
| contact-bar | default |
| divider | default, polygon, red, purple, gray, teal, green, periwinkle, pastel-blue, pastel-peach, light-gray, desktop-hidden |
| video | default |
| iframe | default |
| fragment | default |
| breadcrumb | auto-generated |
| text-image | default |
| learning-navigation | default |
| foundations-search | default |

## Section Metadata Styles
Available section styles (combinable): `light`, `warm`, `dark`, `cream`, `center-align`, `heading-bar`, `narrow-width`

## Image Handling
- Use original `wellsfargomedia.com` URLs directly in content HTML for immediate preview
- Images will be migrated to DA later when auth is available
- All image references use `<picture><source srcset="..."><img src="..."></picture>` pattern

## Page Metadata Template
Every migrated page must include:
| Metadata | | title | [page title] | | description | [page description] | | nav | /com/nav | | footer | /footer | | theme | default | | locale | en (or es for Spanish pages) | | footnotes | [comma-separated IDs if present] | | pageid | Page ID |


## Output Location
All content files go in: `content/com/<path>.plain.html`
- `/com/industry/healthcare/` → `content/com/industry/healthcare.plain.html`
- `/com/insights/article-slug/` → `content/com/insights/article-slug.plain.html`
- `/es/com/insights/article/` → `content/es/com/insights/article.plain.html`

## Execution Order
1. Start with hub/landing pages (they define the template pattern)
2. Then detail pages within each category (they follow the template)
3. Spanish pages last (translate metadata, reuse same block structure)
4. Run visual comparison after each batch of 5 pages
