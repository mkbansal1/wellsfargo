/* eslint-disable */
/* global WebImporter */

/**
 * Parser: contact-info
 * Base block: Columns (contact) variant
 * Source selector: .card-background-white with contact phone numbers
 * Source: https://www.wellsfargo.com/mortgage/
 *
 * Extracts contact information columns (phone + hours + CTA) into a Columns (contact) block.
 * Each column = one row with its H3 heading + phone + hours + links.
 */
export default function parse(element, { document }) {
  const columns = element.querySelectorAll('.card-container > div, .card-theme2 > div, [class*="card-content"]');

  if (columns.length === 0) {
    const innerDivs = element.querySelectorAll(':scope > div > div > div');
    if (innerDivs.length > 1) {
      const cells = [];
      innerDivs.forEach((col) => {
        cells.push([col]);
      });
      const block = WebImporter.Blocks.createBlock(document, { name: 'Columns (contact)', cells });
      element.replaceWith(block);
      return;
    }
  }

  const cells = [];
  const row = [];
  columns.forEach((col) => {
    row.push(col);
  });

  if (row.length > 0) {
    cells.push(row);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Columns (contact)', cells });
  element.replaceWith(block);
}
