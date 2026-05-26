/* eslint-disable */
/* global WebImporter */

/**
 * Parser: contact-info / cards-no-images
 * Base block: Cards
 * Source: Wells Fargo card sections with multiple h3s and no/few images
 *
 * Block library structure (2-column rows, empty col1):
 *   | Cards |
 *   | (empty) | heading + description + CTA |
 *   | (empty) | heading + description + CTA |
 *
 * Source patterns:
 *   .card-container > div (each div = one card)
 *   .card-theme2 > div
 *   [class*="card-content"] items
 *   Or: sections with multiple h3 groups
 */
export default function parse(element, { document }) {
  // Find individual card items
  let cardItems = Array.from(element.querySelectorAll(
    '.card-container > div, .card-theme2 > div, [class*="card-content"]:not(.card-container)'
  ));

  // Fallback: look for groups of h3 + content
  if (cardItems.length === 0) {
    const container = element.querySelector('.card-container, [class*="card-container"]');
    if (container) {
      cardItems = Array.from(container.children).filter((el) => el.querySelector('h3, h4'));
    }
  }

  // Last fallback: direct children with h3s
  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(':scope > div > div')).filter((el) => el.querySelector('h3, h4'));
  }

  const cells = [];

  cardItems.forEach((card) => {
    const heading = card.querySelector('h3, h4');
    const contentParts = [];

    if (heading) {
      const h3 = document.createElement('h3');
      h3.innerHTML = heading.innerHTML;
      contentParts.push(h3);
    }

    // Get all paragraphs (description + CTA)
    const textBody = card.querySelector('.enhanced-txt-body, [class*="txt-body"]') || card;
    const paragraphs = textBody.querySelectorAll('p, div:not(:has(h3)):not(:has(h4))');
    paragraphs.forEach((p) => {
      if (p.querySelector('h3, h4')) return;
      if (p.textContent.trim() || p.querySelector('a')) {
        const para = document.createElement('p');
        para.innerHTML = p.innerHTML;
        contentParts.push(para);
      }
    });

    if (contentParts.length > 0) {
      // 2-column row: empty col1 | content col2
      cells.push([[''], contentParts]);
    }
  });

  if (cells.length > 0) {
    const block = WebImporter.Blocks.createBlock(document, { name: 'Cards', cells });
    element.replaceWith(block);
  }
}
