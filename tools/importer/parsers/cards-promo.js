/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-promo
 * Base block: cards
 * Source selector: .ps-marketing-small-promo-items
 * Source: https://www.wellsfargo.com/
 * Generated: 2026-05-17
 *
 * Extracts promotional card tiles with icon, heading, description, and CTA link.
 * Each .ps-marketing-small-promo-item becomes one row with 2 columns:
 *   col1 = icon image
 *   col2 = heading + description + CTA link
 *
 * Source HTML structure (validated):
 *   .ps-marketing-small-promo-items
 *     .ps-marketing-small-promo-item  (repeated per card)
 *       .mark-small-promo-icon
 *         .ps-marketing-icon > img    (icon image)
 *         .ps-marketing-text
 *           h2                        (heading)
 *           p                         (description text)
 *           p > a                     (CTA link)
 */
export default function parse(element, { document }) {
  // Find all promo card items within the container
  // Validated selector: .ps-marketing-small-promo-item exists in source HTML
  const items = element.querySelectorAll('.ps-marketing-small-promo-item');

  const cells = [];

  items.forEach((item) => {
    // Column 1: Icon image
    // Validated selector: .ps-marketing-icon img (each item has one icon)
    const iconImg = item.querySelector('.ps-marketing-icon img');

    // Column 2: Text content from .ps-marketing-text container
    const textContainer = item.querySelector('.ps-marketing-text');
    if (!textContainer) return;

    // Extract heading: validated as h2, with fallbacks for variation
    const heading = textContainer.querySelector('h2, h3, h1');

    // Separate description paragraphs from CTA-only paragraphs
    // In source: first p = description text, second p = contains only an <a> (CTA)
    const allParagraphs = Array.from(textContainer.querySelectorAll(':scope > p'));

    // Description: paragraphs that are NOT link-only
    const descriptionParagraphs = allParagraphs.filter((p) => {
      const link = p.querySelector('a');
      // A paragraph is descriptive if it has no link, or has mixed content (link + text)
      return !link || p.textContent.trim() !== link.textContent.trim();
    });

    // CTA: paragraphs that contain only a link (link text === paragraph text)
    const ctaParagraphs = allParagraphs.filter((p) => {
      const link = p.querySelector('a');
      return link && p.textContent.trim() === link.textContent.trim();
    });

    // Build column 1: icon image (or empty if no icon found)
    const col1 = iconImg ? [iconImg] : [];

    // Build column 2: heading + description + CTA in library-example order
    const col2 = [];
    if (heading) col2.push(heading);
    descriptionParagraphs.forEach((p) => col2.push(p));
    ctaParagraphs.forEach((p) => {
      const link = p.querySelector('a');
      if (link) {
        link.textContent = link.textContent.replace(/\s*>+\s*$/, '').trim();
      }
      col2.push(p);
    });

    cells.push([col1, col2]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (promo)', cells });
  element.replaceWith(block);
}
