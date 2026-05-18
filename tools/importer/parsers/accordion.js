/* eslint-disable */
/* global WebImporter */

/**
 * Parser: accordion
 * Base block: Accordion (Block Collection)
 * Source selector: details.show-hide-content-wrapper
 * Source: https://www.wellsfargo.com/mortgage/
 *
 * Extracts FAQ accordion items from <details> elements.
 * Each details element = one row: col1 = summary (question), col2 = body (answer).
 */
export default function parse(element, { document }) {
  const allDetails = element.closest('.ps-body-wrapper, main')
    ? document.querySelectorAll('details.show-hide-content-wrapper')
    : [element];

  const cells = [];

  const detailsList = element.tagName === 'DETAILS'
    ? [element]
    : Array.from(element.querySelectorAll('details'));

  detailsList.forEach((details) => {
    const summary = details.querySelector('summary');
    const questionText = summary ? summary.textContent.trim() : '';

    const bodyContent = [];
    [...details.children].forEach((child) => {
      if (child.tagName !== 'SUMMARY') {
        bodyContent.push(child);
      }
    });

    if (questionText) {
      const questionCell = document.createElement('p');
      questionCell.textContent = questionText;
      cells.push([[questionCell], bodyContent.length ? bodyContent : ['']]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (faq)', cells });
  element.replaceWith(block);
}
