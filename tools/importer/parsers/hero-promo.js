/* eslint-disable */
/* global WebImporter */

/**
 * Parser: hero-promo
 * Base block: Hero (default variant from block library)
 * Source selectors: .marquee-container, .rsk-marquee-container, .ps-large-promo-full-container
 * Source: https://www.wellsfargo.com/mortgage/buying-a-house/
 *
 * Block library structure (single cell with all content):
 *   | Hero |
 *   | image + heading + description + CTA button |
 *
 * Source structures:
 *   .rsk-marquee-container (product pages):
 *     .rsk-marquee-img-container > picture > img
 *     .rsk-marquee-content > .rsk-marquee-inner-content > h2, p, a.ps-btn-primary
 *
 *   .marquee-container (homepage):
 *     .marquee-img > img
 *     .marquee-content > h2, p, .ps-padding > a
 */
export default function parse(element, { document, isFirstHero }) {
  // Extract image — support both marquee variants
  const img = element.querySelector(
    '.rsk-marquee-img-container img, .marquee-img img, .marquee-wrap img, picture img, img'
  );

  // Extract heading
  const heading = element.querySelector(
    '.rsk-marquee-inner-content h2, .rsk-marquee-content h2, .marquee-content h2, .marquee-content h1, h2, h1'
  );

  // Extract description paragraph (first <p> inside content area, not the CTA paragraph)
  const contentArea = element.querySelector(
    '.rsk-marquee-inner-content, .rsk-marquee-content, .marquee-content'
  ) || element;

  let description = null;
  const paragraphs = contentArea.querySelectorAll('p');
  for (const p of paragraphs) {
    // Skip paragraphs that only contain a button/CTA link
    const btnLink = p.querySelector('a.ps-btn-primary, a.ps-btn-secondary, a[class*="btn"]');
    if (btnLink && p.textContent.trim() === btnLink.textContent.trim()) continue;
    if (p.textContent.trim()) {
      description = p;
      break;
    }
  }

  // Extract CTA link (button-styled link)
  const ctaLink = element.querySelector(
    'a.ps-btn-primary, a.ps-btn-secondary, a[class*="ps-btn"], .ps-padding a'
  );

  // Block library structure: row 1 = image, row 2 = heading + description + CTA in one cell
  const cells = [];

  // Row 1: Background image
  if (img) {
    const picture = img.closest('picture') || img;
    cells.push([picture.cloneNode(true)]);
  }

  // Row 2: Text content (heading + description + CTA) all in one cell
  const textContent = [];
  if (heading) {
    const h2 = document.createElement('h2');
    h2.innerHTML = heading.innerHTML;
    textContent.push(h2);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML;
    textContent.push(p);
  }
  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    const strong = document.createElement('strong');
    strong.appendChild(a);
    p.appendChild(strong);
    textContent.push(p);
  }
  if (textContent.length > 0) {
    cells.push([textContent]);
  }

  const cls = element.className || '';
  const variant = 'Hero';
  const block = WebImporter.Blocks.createBlock(document, { name: variant, cells });

  if (isFirstHero) {
    block.setAttribute('data-section-style', 'heading-bar');
  }

  element.replaceWith(block);
}
