/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-feature
 * Base block: cards
 * Source: https://www.wellsfargo.com/
 * Generated: 2026-05-17
 *
 * Extracts feature card items from the source DOM and produces a Cards block table.
 * Target structure (from library example):
 *   | Cards (feature) | |
 *   | [image]         | heading + description + CTA link |
 *   | [image]         | heading + description + CTA link |
 *
 * Source structure (validated against source.html):
 *   .card-background-white.text-aligned-center
 *     .card-container (.three-card or .two-card)
 *       .enhanced-txt-cm.mid-size-promo (.three-card-content or .two-card-content)
 *         div > img                          -> col1: image
 *         .enhanced-txt-body
 *           h3                               -> col2: heading
 *           div (text)                       -> col2: description
 *           p > a                            -> col2: CTA link
 *
 * Handles variations: 2-card and 3-card layouts, .ps-promo-full-* selectors.
 */
export default function parse(element, { document }) {
  // Find individual card items within the element.
  // Primary: .enhanced-txt-cm.mid-size-promo (validated in source.html)
  // Fallback: [class*="card-content"] matches .three-card-content / .two-card-content
  // Fallback: .ps-promo-full-item for alternate selector patterns
  let cardItems = Array.from(element.querySelectorAll(
    '.enhanced-txt-cm.mid-size-promo, .ps-promo-full-item, [class*="card-content"]:not(.card-container)'
  ));

  // If no card items found, look inside a card-container wrapper
  if (cardItems.length === 0) {
    const container = element.querySelector('.card-container, [class*="promo-full-items"]');
    if (container) {
      cardItems = Array.from(container.children);
    }
  }

  // Last resort: direct child divs of the element
  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(':scope > div'));
  }

  const cells = [];

  cardItems.forEach((card) => {
    // --- Col 1: Image ---
    // Source: first div > img inside each card
    const image = card.querySelector('img');

    // --- Col 2: Content (heading + description + CTA) ---
    const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text') || card;

    // Heading: h3 is primary from source, fallback h2/h4 for variation
    const heading = textBody.querySelector('h3, h2, h4')
      || card.querySelector('h3, h2, h4');

    // Description: div child of .enhanced-txt-body that is not a heading wrapper
    // and not a paragraph containing only a CTA link
    let description = null;
    const candidates = textBody.querySelectorAll(':scope > div, :scope > p');
    for (const child of candidates) {
      if (child.querySelector('h2, h3, h4')) continue;
      const link = child.querySelector('a');
      if (link && child.textContent.trim() === link.textContent.trim()) continue;
      if (child.textContent.trim()) {
        description = child;
        break;
      }
    }

    // CTA link: p > a inside .enhanced-txt-body (validated in source.html)
    const ctaLink = textBody.querySelector('p > a, a.cta, a.button')
      || card.querySelector('p > a');

    // Build content cell: references to source elements (no unnecessary copies)
    const contentCell = [];

    if (heading) {
      const h3 = document.createElement('h3');
      h3.innerHTML = heading.innerHTML;
      contentCell.push(h3);
    }

    if (description) {
      const p = document.createElement('p');
      p.innerHTML = description.innerHTML;
      contentCell.push(p);
    }

    if (ctaLink) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = ctaLink.href;
      // Strip trailing ">" arrows — the block CSS adds these via ::after
      link.textContent = ctaLink.textContent.replace(/\s*>\s*$/, '').trim();
      p.appendChild(link);
      contentCell.push(p);
    }

    // Only add row if we have meaningful content
    if (image || contentCell.length > 0) {
      cells.push([image || '', contentCell]);
    }
  });

  // Determine variant: icons if images are small (64x64 icon-size), separator if photos
  let variant = 'Cards (separator)';
  const firstImg = element.querySelector('img');
  if (firstImg) {
    const src = (firstImg.src || firstImg.getAttribute('src') || '').toLowerCase();
    const w = parseInt(firstImg.getAttribute('width') || '0', 10);
    if (w > 0 && w <= 100 || src.includes('64x64') || src.includes('icon') || src.includes('-64x') || src.includes('gradient-64')) {
      variant = 'Cards (icons, bg-image)';
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: variant, cells });
  element.replaceWith(block);
}
