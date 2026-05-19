/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Wells Fargo section breaks.
 *
 * afterTransform: Inserts <hr> before each direct child of the main content area
 * that starts a new logical section. In the Wells Fargo DOM, each major section
 * is a direct child of main (or .ps-body-wrapper). After parsers have run, blocks
 * are still wrapped in their original parent containers.
 *
 * Strategy: Insert <hr> before every direct child of the main content area that
 * is NOT the first child. This creates one EDS section per top-level DOM element.
 */
export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;

  const doc = element.ownerDocument || element.getRootNode();

  // Find the main content area — prefer main, fallback to .ps-body-wrapper, then body
  const main = element.querySelector('main') || element.querySelector('.ps-body-wrapper') || element;

  // Get all direct children that are actual content (not scripts/styles/empty)
  const children = Array.from(main.children).filter((el) => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return false;
    if (el.tagName === 'HR') return false; // Don't count existing hrs
    if (!el.textContent.trim() && !el.querySelector('img, picture, table')) return false;
    return true;
  });

  // Insert <hr> before each child after the first to create section breaks
  for (let i = 1; i < children.length; i++) {
    const hr = doc.createElement('hr');
    children[i].before(hr);
  }
}
