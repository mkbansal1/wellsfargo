/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-promo
 * Base block: hero
 * Source selectors: .marquee-container, .ps-large-promo-full-container
 * Source: https://www.wellsfargo.com/
 * Generated: 2026-05-17
 *
 * Source HTML structure:
 *   div.marquee-container > div.marquee-container-wrap > div.marquee-wrap
 *     div.marquee-img > img (background image)
 *     div.marquee-content > h2 (heading), p (description), div.ps-padding > a (CTA)
 *
 * Target table structure (from library example + description):
 *   Row 1: block name (hero-promo)
 *   Row 2: background image
 *   Row 3: heading
 *   Row 4: description text
 *   Row 5: CTA link
 */
export default function parse(element, { document }) {
  // Extract background image from .marquee-img or fallback selectors
  const bgImage = element.querySelector('.marquee-img img, .marquee-wrap img, img[class*="hero"], img[class*="banner"]');

  // Extract heading from .marquee-content h2 or fallback heading levels
  const heading = element.querySelector('.marquee-content h2, .marquee-content h1, .marquee-content h3, h2, h1, h3');

  // Extract description paragraph from .marquee-content p
  const description = element.querySelector('.marquee-content p, .marquee-content .description, p');

  // Extract CTA link from .ps-padding a or fallback anchor selectors
  const ctaLink = element.querySelector('.marquee-content .ps-padding a, .marquee-content a.ps-btn-secondary, .marquee-content a.ps-btn-primary, .marquee-content a[class*="btn"], .marquee-content a');

  // Build cells array matching target table structure
  const cells = [];

  // Row 2: background image (optional - add only if present)
  if (bgImage) {
    cells.push([bgImage]);
  }

  // Row 3: heading
  if (heading) {
    cells.push([heading]);
  }

  // Row 4: description text (optional - some hero variants may not have description)
  if (description) {
    cells.push([description]);
  }

  // Row 5: CTA link (optional - some hero variants may not have CTA)
  if (ctaLink) {
    cells.push([ctaLink]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Hero (promo)', cells });
  element.replaceWith(block);
}
