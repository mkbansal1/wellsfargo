/* eslint-disable */
/* global WebImporter */

/**
 * Parser: button-accordion
 * Base block: Accordion (compact)
 * Source: Old-theme Wells Fargo pages with h2 > button accordion pattern.
 *
 * Detects consecutive <h2> elements containing a <button> child within a container.
 * Collects question/answer pairs and produces an Accordion (compact) block.
 */
export default function parse(container, { document }) {
  const children = Array.from(container.children);
  const accordionItems = [];
  let i = 0;

  while (i < children.length) {
    const el = children[i];

    // Detect h2 > button pattern
    if (el.tagName === 'H2' && el.querySelector('button')) {
      const button = el.querySelector('button');
      const questionText = button.textContent.trim();

      // Collect answer elements: everything between this h2>button and the next h2>button
      const answerElements = [];
      i++;
      while (i < children.length) {
        const next = children[i];
        // Stop if we hit another h2 with a button (next accordion item)
        if (next.tagName === 'H2' && next.querySelector('button')) break;
        answerElements.push(next);
        i++;
      }

      if (questionText) {
        accordionItems.push({ questionText, answerElements });
      }
    } else {
      i++;
    }
  }

  if (accordionItems.length === 0) return null;

  // Build cells: each row = [[questionH3], [answerElements]]
  const cells = [];
  accordionItems.forEach(({ questionText, answerElements }) => {
    const questionH3 = document.createElement('h3');
    questionH3.textContent = questionText;
    cells.push([[questionH3], answerElements.length > 0 ? answerElements : ['']]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (compact)', cells });
  container.replaceWith(block);
  return block;
}
