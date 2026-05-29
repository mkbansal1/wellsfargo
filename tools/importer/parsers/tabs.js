/* eslint-disable */
/* global WebImporter */

// Parser: tabs
// Detects tabbed interfaces and converts to Tabs block.
//
// Two detection strategies:
//   1. Known tab anchors (e.g., #nationalbanks) → Tabs (reference) with fragment links
//   2. Generic tab pattern: <p>Label <a href="#anchor">Label</a></p> followed by panel content
//      → Standard Tabs block (label | panel HTML content)
//
// Variant decision:
//   - If tab panel has 2-column layout (Products/Services) → tabs (reference) + fragments
//   - If tab panel has simple freetext (headings + paragraphs + lists) → standard Tabs

const KNOWN_REFERENCE_TABS = [
  { id: 'nationalbanks', label: 'National banks', slug: 'tab-national-banks' },
  { id: 'regionalandcommunitybanks', label: 'Regional and community banks', slug: 'tab-regional-and-community-banks' },
  { id: 'creditunions', label: 'Credit unions', slug: 'tab-credit-unions' },
  { id: 'mortgagebrokers', label: 'Mortgage brokers', slug: 'tab-mortgage-brokers' },
  { id: 'onlineonlymortgagelenders', label: 'Online-only mortgage lenders', slug: 'tab-online-only-mortgage-lenders' },
];

function isKnownReferenceTab(anchorId) {
  return KNOWN_REFERENCE_TABS.find((t) => t.id === anchorId);
}

function parseReferenceTabs(container, document, url, tabAnchors) {
  let pagePath = '';
  try {
    const urlObj = new URL(url);
    pagePath = urlObj.pathname.replace(/\/$/, '').replace(/^\//, '');
  } catch (e) {
    pagePath = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '').replace(/^\//, '');
  }
  const fragmentBase = '/fragments/' + pagePath;

  const tabData = [];
  const elementsToRemove = new Set();
  let firstTabLabelEl = null;

  for (const tab of KNOWN_REFERENCE_TABS) {
    const anchor = container.querySelector(`a[href="#${tab.id}"]`);
    if (!anchor) continue;
    const labelEl = anchor.closest('p') || anchor.closest('div');
    if (!labelEl) continue;
    if (!firstTabLabelEl) firstTabLabelEl = labelEl;

    const panelEl = labelEl.nextElementSibling;
    if (panelEl) elementsToRemove.add(panelEl);
    elementsToRemove.add(labelEl);

    tabData.push({
      label: tab.label,
      fragmentPath: fragmentBase + '/' + tab.slug,
    });
  }

  if (tabData.length < 3) return false;

  // Remove duplicate panels and navigation lists
  const allParagraphs = container.querySelectorAll('p');
  for (const p of allParagraphs) {
    const anchor = p.querySelector('a[href^="#"]');
    if (!anchor) continue;
    const href = (anchor.getAttribute('href') || '').replace('#', '');
    if (isKnownReferenceTab(href)) {
      elementsToRemove.add(p);
      const next = p.nextElementSibling;
      if (next && (next.querySelector('h3') || (next.className || '').includes('cards'))) {
        elementsToRemove.add(next);
      }
    }
  }
  for (const p of allParagraphs) {
    const anchors = p.querySelectorAll('a[href^="#"]');
    if (anchors.length >= 3) {
      const matchCount = Array.from(anchors)
        .filter((a) => isKnownReferenceTab((a.getAttribute('href') || '').replace('#', '')))
        .length;
      if (matchCount >= 3) elementsToRemove.add(p);
    }
  }

  const cells = tabData.map((tab) => [[tab.label], [tab.fragmentPath]]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs (reference)', cells });

  if (firstTabLabelEl && firstTabLabelEl.parentNode) {
    firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
  }
  elementsToRemove.forEach((el) => { if (el.parentNode) el.remove(); });
  return true;
}

function parseGenericTabs(container, document, tabAnchors) {
  // Generic tabs: tab labels as <p> with anchors, panel content follows each label
  // Build standard Tabs block with label | content cells
  const tabData = [];
  const elementsToRemove = new Set();
  let firstTabLabelEl = null;

  for (const { id, label, anchorEl } of tabAnchors) {
    const labelEl = anchorEl.closest('p') || anchorEl.parentElement;
    if (!labelEl) continue;
    if (!firstTabLabelEl) firstTabLabelEl = labelEl;

    // Panel is the next sibling after the label
    const panelEl = labelEl.nextElementSibling;
    if (!panelEl) continue;

    // Extract panel HTML content (headings, paragraphs, lists)
    const panelContent = panelEl.innerHTML || '';

    tabData.push({ label, content: panelContent });
    elementsToRemove.add(labelEl);
    elementsToRemove.add(panelEl);
  }

  if (tabData.length < 2) return false;

  // Remove duplicate tab navigation (mobile view with all labels in one <p>)
  const allParagraphs = container.querySelectorAll('p');
  const knownIds = tabAnchors.map((t) => t.id);
  for (const p of allParagraphs) {
    const anchors = p.querySelectorAll('a[href^="#"]');
    if (anchors.length >= tabAnchors.length) {
      const matchCount = Array.from(anchors)
        .filter((a) => knownIds.includes((a.getAttribute('href') || '').replace('#', '')))
        .length;
      if (matchCount >= tabAnchors.length) elementsToRemove.add(p);
    }
  }

  // Remove duplicate panels (mobile/desktop duplication)
  for (const p of allParagraphs) {
    if (elementsToRemove.has(p)) continue;
    const anchor = p.querySelector('a[href^="#"]');
    if (!anchor) continue;
    const href = (anchor.getAttribute('href') || '').replace('#', '');
    if (knownIds.includes(href)) {
      elementsToRemove.add(p);
      const next = p.nextElementSibling;
      if (next && (next.querySelector('h3') || next.querySelector('p'))) {
        elementsToRemove.add(next);
      }
    }
  }

  // Build standard Tabs block (label | content)
  const cells = tabData.map((tab) => {
    const contentEl = document.createElement('div');
    contentEl.innerHTML = tab.content;
    return [[tab.label], [contentEl]];
  });
  const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs', cells });

  if (firstTabLabelEl && firstTabLabelEl.parentNode) {
    firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
  }
  elementsToRemove.forEach((el) => { if (el.parentNode) el.remove(); });
  return true;
}

export default function parse(container, { document, url, params }) {
  if (!url || !container) return false;

  // Detect tab anchors
  const allAnchors = container.querySelectorAll('a[href^="#"]');
  const tabAnchors = [];
  const seenIds = new Set();

  for (const a of allAnchors) {
    const href = (a.getAttribute('href') || '').replace('#', '');
    if (!href || href === 'skip' || seenIds.has(href)) continue;
    // Only consider anchors that look like tab IDs (lowercase, no spaces)
    if (/^[a-z][a-z0-9]*$/.test(href) || /^[a-z]+[a-z!]*$/.test(href)) {
      const label = a.textContent.trim();
      if (label && label.length > 2 && label.length < 80) {
        seenIds.add(href);
        tabAnchors.push({ id: href, label, anchorEl: a });
      }
    }
  }

  if (tabAnchors.length < 2) return false;

  // Check if this is a known reference-tabs pattern
  const knownCount = tabAnchors.filter((t) => isKnownReferenceTab(t.id)).length;
  if (knownCount >= 3) {
    return parseReferenceTabs(container, document, url, tabAnchors);
  }

  // Otherwise use generic tabs (standard variant with inline content)
  if (tabAnchors.length >= 2) {
    return parseGenericTabs(container, document, tabAnchors);
  }

  return false;
}
