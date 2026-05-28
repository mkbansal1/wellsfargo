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

  // Extract CTA link (button-styled link or wrapped in strong/em by cleanup transformer)
  const ctaLink = element.querySelector(
    'a.ps-btn-primary, a.ps-btn-secondary, a[class*="ps-btn"], .ps-padding a, strong > a, em > a'
  );

  // Block library structure: single row, single cell with image + heading + description + CTA
  const cellContent = [];

  if (img) {
    const picture = img.closest('picture') || img;
    cellContent.push(picture.cloneNode(true));
  }
  if (heading) {
    const h2 = document.createElement('h2');
    h2.innerHTML = heading.innerHTML;
    cellContent.push(h2);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML;
    cellContent.push(p);
  }
  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    const strong = document.createElement('strong');
    strong.appendChild(a);
    p.appendChild(strong);
    cellContent.push(p);
  }

  const cls = element.className || '';
  const variant = 'Hero';
  const cells = [[cellContent]];
  const block = WebImporter.Blocks.createBlock(document, { name: variant, cells });

  if (isFirstHero) {
    block.setAttribute('data-section-style', 'heading-bar');
  }

  element.replaceWith(block);
}
