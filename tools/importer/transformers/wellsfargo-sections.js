/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Wells Fargo section breaks and section metadata.
 * Inserts <hr> between sections and adds Section Metadata blocks for sections with a style.
 * Runs in afterTransform only, using payload.template.sections from page-templates.json.
 *
 * Template sections (from page-templates.json):
 *   1. section-1-hero: .marquee-container (no style)
 *   2. section-2-nav: .alt-nav-container (no style)
 *   3. section-3-promo-tiles: .ps-marketing-small-promo-items (no style)
 *   4. section-4-large-promo: .ps-large-promo-full-container (no style)
 *   5. section-5-guidance: .ps-body-wrapper > .card-background-white:nth-of-type(1) (no style)
 *   6. section-6-app: .ps-native-app-container (style: "grey")
 *   7. section-7-community: .ps-body-wrapper > .card-background-white:nth-of-type(2) (no style)
 *   8. section-8-help: .contact-bar-container (no style)
 *   9. section-9-footer: .ps-footer-wrapper (no style)
 *
 * Expected: 8 <hr> elements (one before each section except the first), 1 Section Metadata block (for section-6-app).
 * All selectors verified against migration-work/cleaned.html.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.after) {
    const { template } = payload;
    if (!template || !template.sections || template.sections.length < 2) return;

    const { document } = element.ownerDocument ? { document: element.ownerDocument } : { document: element.getRootNode() };
    const sections = template.sections;

    // Process sections in reverse order to avoid shifting DOM positions
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      const sectionEl = element.querySelector(section.selector);

      if (!sectionEl) continue;

      // Add Section Metadata block if section has a style
      if (section.style) {
        const sectionMetadata = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        sectionEl.after(sectionMetadata);
      }

      // Insert <hr> before each section that is not the first, and only when there is
      // preceding content (i.e. the section element has a previous sibling)
      if (i > 0 && sectionEl.previousElementSibling) {
        const hr = document.createElement('hr');
        sectionEl.before(hr);
      }
    }
  }
}
