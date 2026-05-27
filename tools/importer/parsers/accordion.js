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
  const detailsList = element.tagName === 'DETAILS'
    ? [element]
    : Array.from(element.querySelectorAll('details'));

  const cells = [];

  detailsList.forEach((details) => {
    const summary = details.querySelector('summary');
    if (!summary) return;

    // Wells Fargo FAQ summaries duplicate text in a hidden span + an anchor.
    // Extract from the anchor or the hidden span to avoid duplication.
    const anchor = summary.querySelector('a');
    const hiddenSpan = summary.querySelector('.hidden');
    const questionText = (anchor && anchor.textContent.trim())
      || (hiddenSpan && hiddenSpan.textContent.trim())
      || summary.textContent.trim();

    const bodyContent = [];
    [...details.children].forEach((child) => {
      if (child.tagName !== 'SUMMARY') {
        bodyContent.push(child);
      }
    });

    if (questionText) {
      const questionCell = document.createElement('h3');
      questionCell.textContent = questionText;
      cells.push([[questionCell], bodyContent.length ? bodyContent : ['']]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (compact)', cells });
  element.replaceWith(block);
}
