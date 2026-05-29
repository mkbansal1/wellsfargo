/* eslint-disable */
/* global WebImporter */

// Parser: tabs
// Detects tabbed interfaces with anchor-linked panels and converts to Tabs (reference) block.
// Each tab panel with complex content (columns/cards) → tabs (reference) variant with fragment links.
//
// Source DOM pattern:
//   <p>Tab Label <a href="#anchorid">Tab Label</a></p>
//   <div class="...">  ← panel content (Products H3 + Services H3 in 2-col layout)
//
// Output:
//   - Tabs (reference) block on main page
//   - Fragment files generated for each tab panel (returned via params.fragmentOutputs)

const TAB_ANCHORS = [
  { id: 'nationalbanks', label: 'National banks', slug: 'tab-national-banks' },
  { id: 'regionalandcommunitybanks', label: 'Regional and community banks', slug: 'tab-regional-and-community-banks' },
  { id: 'creditunions', label: 'Credit unions', slug: 'tab-credit-unions' },
  { id: 'mortgagebrokers', label: 'Mortgage brokers', slug: 'tab-mortgage-brokers' },
  { id: 'onlineonlymortgagelenders', label: 'Online-only mortgage lenders', slug: 'tab-online-only-mortgage-lenders' },
];

export default function parse(container, { document, url, params }) {
  if (!url || !container) return false;

  // Detect tab pattern: look for anchor links like <a href="#nationalbanks">
  const allAnchors = container.querySelectorAll('a[href^="#"]');
  const tabAnchors = [];
  for (const a of allAnchors) {
    const href = (a.getAttribute('href') || '').replace('#', '');
    const match = TAB_ANCHORS.find((t) => t.id === href);
    if (match && !tabAnchors.find((t) => t.id === match.id)) {
      tabAnchors.push({ ...match, anchorEl: a });
    }
  }

  // Need at least 3 tab anchors to consider this a tab section
  if (tabAnchors.length < 3) return false;

  // Determine the page path for fragment URLs
  let pagePath = '';
  try {
    const urlObj = new URL(url);
    pagePath = urlObj.pathname.replace(/\/$/, '').replace(/^\//, '');
  } catch (e) {
    pagePath = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '').replace(/^\//, '');
  }
  const fragmentBase = '/fragments/' + pagePath;

  // Find tab panels: the content after each tab label paragraph
  // Pattern: <p>Label <a href="#id">Label</a></p> followed by sibling container with H3 Products/Services
  const tabData = [];
  const elementsToRemove = new Set();
  let firstTabLabelEl = null;

  for (const tab of TAB_ANCHORS) {
    // Find the first anchor for this tab (skip duplicates from mobile/desktop views)
    const anchor = container.querySelector(`a[href="#${tab.id}"]`);
    if (!anchor) continue;

    // The anchor is inside a <p> or <div> — find the label paragraph
    const labelEl = anchor.closest('p') || anchor.closest('div');
    if (!labelEl) continue;

    if (!firstTabLabelEl) firstTabLabelEl = labelEl;

    // The panel content is the next sibling element after the label
    const panelEl = labelEl.nextElementSibling;
    if (!panelEl) continue;

    // Extract Products and Services content from the panel
    const h3s = panelEl.querySelectorAll('h3');
    let productsContent = '';
    let servicesContent = '';

    for (const h3 of h3s) {
      const text = h3.textContent.trim().toLowerCase();
      // Get all paragraph siblings after this h3 until next h3
      let content = '';
      let sibling = h3.nextElementSibling;
      while (sibling && sibling.tagName !== 'H3') {
        content += sibling.outerHTML || '';
        sibling = sibling.nextElementSibling;
      }
      // Fallback: get parent cell content
      if (!content) {
        const cell = h3.closest('div');
        if (cell) {
          content = cell.innerHTML.replace(h3.outerHTML, '').trim();
        }
      }

      if (text.includes('product')) {
        productsContent = content;
      } else if (text.includes('service')) {
        servicesContent = content;
      }
    }

    // If we couldn't extract from H3 siblings, try the cards structure
    // (the importer may have already created cards rows)
    if (!productsContent && !servicesContent) {
      const rows = panelEl.querySelectorAll(':scope > div');
      for (const row of rows) {
        const h3 = row.querySelector('h3');
        if (!h3) continue;
        const text = h3.textContent.trim().toLowerCase();
        const cellContent = row.querySelector(':scope > div:last-child');
        if (!cellContent) continue;
        const content = cellContent.innerHTML.replace(/<h3[^>]*>.*?<\/h3>/i, '').trim();
        if (text.includes('product')) productsContent = content;
        else if (text.includes('service')) servicesContent = content;
      }
    }

    tabData.push({
      label: tab.label,
      slug: tab.slug,
      fragmentPath: fragmentBase + '/' + tab.slug,
      productsContent,
      servicesContent,
    });

    // Mark elements for removal
    elementsToRemove.add(labelEl);
    elementsToRemove.add(panelEl);
  }

  if (tabData.length < 3) return false;

  // Also remove duplicate tab panels (mobile/desktop duplication)
  // Find all remaining tab label paragraphs and their panels
  const allLabelsAndPanels = container.querySelectorAll('p');
  for (const p of allLabelsAndPanels) {
    const anchor = p.querySelector('a[href^="#"]');
    if (!anchor) continue;
    const href = (anchor.getAttribute('href') || '').replace('#', '');
    if (TAB_ANCHORS.find((t) => t.id === href)) {
      elementsToRemove.add(p);
      // Also remove the next sibling if it's a panel
      const next = p.nextElementSibling;
      if (next && (next.querySelector('h3') || next.className.includes('cards'))) {
        elementsToRemove.add(next);
      }
    }
  }

  // Remove duplicate tab navigation list (mobile view shows all labels in one paragraph)
  const allParagraphs = container.querySelectorAll('p');
  for (const p of allParagraphs) {
    const anchors = p.querySelectorAll('a[href^="#"]');
    if (anchors.length >= 3) {
      const tabIds = Array.from(anchors).map((a) => (a.getAttribute('href') || '').replace('#', ''));
      const matchCount = tabIds.filter((id) => TAB_ANCHORS.find((t) => t.id === id)).length;
      if (matchCount >= 3) elementsToRemove.add(p);
    }
  }

  // Build the Tabs (reference) block
  const cells = tabData.map((tab) => [[tab.label], [tab.fragmentPath]]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs (reference)', cells });

  // Replace the first tab label element with the block
  if (firstTabLabelEl && firstTabLabelEl.parentNode) {
    firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
  }

  // Remove all tab-related elements
  elementsToRemove.forEach((el) => {
    if (el.parentNode) el.remove();
  });

  return true;
}
