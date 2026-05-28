/* eslint-disable */
/* global WebImporter */

/**
 * Parser: disclaimers
 * Custom block: Disclaimers
 * Source selector: .ps-footnote
 * Source: https://www.wellsfargo.com/mortgage/
 *
 * Extracts numbered footnotes into a Disclaimers block.
 * Each footnote = one row: col1 = footnote number, col2 = disclaimer text.
 */
export default function parse(element, { document }) {
  const footnoteItems = element.querySelectorAll(':scope > p, :scope > div');
  const cells = [];

  footnoteItems.forEach((item) => {
    const numberEl = item.querySelector('[class*="footnote-number"], :scope > span:first-child, :scope > div:first-child');
    let number = '';
    let body = null;

    if (numberEl && numberEl.textContent.trim().match(/^\d+\.?$/)) {
      number = numberEl.textContent.trim();
      const bodyEl = item.querySelector(':scope > span:last-child, :scope > div:last-child, :scope > p, :scope > generic');
      if (bodyEl && bodyEl !== numberEl) {
        body = bodyEl;
      } else {
        const clone = item.cloneNode(true);
        const firstChild = clone.querySelector(':scope > span:first-child, :scope > div:first-child');
        if (firstChild) firstChild.remove();
        body = clone;
      }
    } else {
      const text = item.textContent.trim();
      const match = text.match(/^(\d+)\.\s*/);
      if (match) {
        number = match[1] + '.';
        body = item;
      } else if (text) {
        body = item;
      }
    }

    if (body) {
      const numCell = document.createElement('p');
      numCell.textContent = number;
      cells.push([[numCell], [body]]);
    }
  });

  if (cells.length > 0) {
    const block = WebImporter.Blocks.createBlock(document, { name: 'Disclaimers', cells });
    element.replaceWith(block);
  }
}
