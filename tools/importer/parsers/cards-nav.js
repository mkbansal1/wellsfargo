/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-nav
 * Base block: cards
 * Source: https://www.wellsfargo.com/
 * Selector: .alt-nav-container
 * Description: Parses the product navigation bar (9 icon+label links) into a Cards (nav) block.
 *   Source structure: ul.alt-nav-links > li > a.alt-nav-link > span[class*="-icon"] + text
 *   Target: 2-column Cards table — col1: icon reference, col2: link with label text.
 * Generated: 2026-05-17
 */
export default function parse(element, { document }) {
  // Extract all navigation link items from the source
  const navItems = element.querySelectorAll('ul.alt-nav-links > li > a.alt-nav-link, ul[class*="nav"] > li > a');

  const cells = [];

  navItems.forEach((anchor) => {
    // Extract the icon span — look for span with class containing "icon"
    const iconSpan = anchor.querySelector('span[class*="icon"], span[class*="Icon"]');

    // Extract icon name from the class (e.g. "alt-personal-checking-icon" -> "checking")
    // Map source icon class names to meaningful icon identifiers
    let iconName = '';
    if (iconSpan) {
      const iconClass = Array.from(iconSpan.classList).find(
        (cls) => cls.includes('icon') || cls.includes('Icon')
      );
      if (iconClass) {
        // Strip common prefixes and "-icon" suffix to get a clean icon name
        iconName = iconClass
          .replace(/^alt-personal-/, '')
          .replace(/^alt-/, '')
          .replace(/-icon$/, '')
          .replace(/-/g, '-');
      }
    }

    // Build the icon cell — create a text node with :icon-name: syntax
    // If no icon found, leave cell empty
    const iconCell = [];
    if (iconName) {
      const iconRef = document.createTextNode(`:${iconName}:`);
      iconCell.push(iconRef);
    }

    // Build the link cell — preserve the anchor as a semantic link
    const linkHref = anchor.getAttribute('href') || '#';
    // Get the text content of the anchor (excluding the icon span text)
    let labelText = '';
    anchor.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        // Text node
        labelText += node.textContent.trim();
      } else if (node.nodeName !== 'SPAN') {
        // Non-span elements (in case of nested elements with text)
        labelText += node.textContent.trim();
      }
    });

    if (!labelText) {
      labelText = anchor.textContent.trim();
    }
    labelText = labelText.replace(/\s*>+\s*$/, '').trim();

    const link = document.createElement('a');
    link.setAttribute('href', linkHref);
    link.textContent = labelText;

    // Each row = [icon cell, link cell] matching Cards 2-column structure
    cells.push([iconCell, [link]]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (nav)', cells });
  element.replaceWith(block);
}
