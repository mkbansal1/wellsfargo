/* eslint-disable */
/* global WebImporter */

import cleanup from './cleanup.js';
import parseButtonAccordion from './parsers/button-accordion.js';

/**
 * Import script for old-theme Wells Fargo pages.
 * These pages have a legacy template with different structure from modern pages.
 * Handles text-heavy pages with button-style accordions and simple card grids.
 */

/**
 * Check if an h2 element is an old-theme accordion trigger.
 * Old-theme pages use: h2 > a containing an expand/plus icon image.
 */
function isAccordionH2(h2) {
  // Check all links inside the h2
  const links = h2.querySelectorAll('a');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    // Common patterns: #Expand, #collapse, javascript:void(0) with show/hide icons
    if (href.includes('#Expand') || href.includes('#expand') || href.includes('#collapse')) {
      return true;
    }
    // Check for expand/plus icons
    const img = link.querySelector('img');
    if (img) {
      const src = (img.getAttribute('src') || '').toLowerCase();
      if (src.includes('plus') || src.includes('showhide') || src.includes('expand') || src.includes('minus')) {
        return true;
      }
    }
  }
  // Also check for button pattern
  if (h2.querySelector('button')) return true;
  return false;
}

/**
 * Detect and parse old-theme accordion pattern.
 * Finds all accordion h2 elements, groups them by parent, and converts to Accordion blocks.
 */
function parseOldThemeAccordion(main, document) {
  // Find ALL h2 elements in the tree that match the accordion pattern
  const allH2s = Array.from(main.querySelectorAll('h2'));
  const accordionH2s = allH2s.filter(isAccordionH2);

  if (accordionH2s.length < 2) return false;

  // Group accordion h2s by their container.
  // On old-theme pages, each accordion item is often wrapped in its own div:
  //   grandparent > div.wrapper > h2 + answer
  // So we need to detect this pattern and group by grandparent instead.
  const parentGroups = new Map();
  accordionH2s.forEach((h2) => {
    const parent = h2.parentElement;
    if (!parentGroups.has(parent)) parentGroups.set(parent, []);
    parentGroups.get(parent).push(h2);
  });

  // Check if all parents have exactly 1 h2 and share the same grandparent
  // If so, regroup by grandparent using the parent wrappers as the "elements"
  const allSingle = Array.from(parentGroups.values()).every((arr) => arr.length === 1);
  if (allSingle && parentGroups.size >= 2) {
    // Regroup by grandparent
    const grandparentGroups = new Map();
    accordionH2s.forEach((h2) => {
      const wrapper = h2.parentElement;
      const grandparent = wrapper ? wrapper.parentElement : null;
      if (grandparent) {
        if (!grandparentGroups.has(grandparent)) grandparentGroups.set(grandparent, []);
        grandparentGroups.get(grandparent).push({ h2, wrapper });
      }
    });

    // Process grandparent groups
    grandparentGroups.forEach((entries, grandparent) => {
      if (entries.length < 2) return;

      // Build accordion items from the wrapper divs
      const items = [];
      entries.forEach(({ h2, wrapper }) => {
        // Extract question text
        const link = h2.querySelector('a');
        let questionText = '';
        if (link) {
          const clone = link.cloneNode(true);
          clone.querySelectorAll('img, picture').forEach((img) => img.remove());
          questionText = clone.textContent.trim();
        }
        if (!questionText) questionText = h2.textContent.trim();

        // Answer = all siblings of h2 within the wrapper
        const answer = [];
        Array.from(wrapper.children).forEach((child) => {
          if (child !== h2) answer.push(child);
        });

        if (questionText) {
          items.push({ question: questionText, answer });
        }
      });

      if (items.length === 0) return;

      // Build Accordion (compact) block
      const cells = [];
      items.forEach(({ question, answer }) => {
        const questionH3 = document.createElement('h3');
        questionH3.textContent = question;
        cells.push([[questionH3], answer.length > 0 ? answer : ['']]);
      });

      const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (compact)', cells });

      // Replace the wrapper divs with the block
      const firstWrapper = entries[0].wrapper;
      firstWrapper.before(block);
      entries.forEach(({ wrapper }) => {
        if (wrapper.parentElement) wrapper.remove();
      });
    });

    return true;
  }

  // Process each parent group (for cases where h2s are direct siblings)
  parentGroups.forEach((h2sInParent, parent) => {
    if (h2sInParent.length < 2) return;

    const parentChildren = Array.from(parent.children);

    // Find runs of consecutive accordion items within this parent
    const runs = [];
    let currentRun = [];

    for (let i = 0; i < parentChildren.length; i++) {
      const el = parentChildren[i];
      if (h2sInParent.includes(el)) {
        currentRun.push(el);
      } else if (currentRun.length > 0) {
        // Check if there's another accordion h2 after this element in the same parent
        const nextAccIdx = parentChildren.findIndex((e, idx) => idx > i && h2sInParent.includes(e));
        if (nextAccIdx > -1) {
          // Content between accordion items — keep in run
          currentRun.push(el);
        } else {
          // End of run — include this trailing content as the last answer
          currentRun.push(el);
          runs.push(currentRun);
          currentRun = [];
        }
      }
    }
    if (currentRun.length > 0) runs.push(currentRun);

    // Process each run into an Accordion block
    runs.forEach((run) => {
      const accH2sInRun = run.filter((el) => h2sInParent.includes(el));
      if (accH2sInRun.length < 2) return;

      // Build accordion items
      const items = [];
      let currentQuestion = null;
      let currentAnswer = [];

      run.forEach((el) => {
        if (h2sInParent.includes(el)) {
          // Save previous item
          if (currentQuestion) {
            items.push({ question: currentQuestion, answer: currentAnswer });
          }
          // Extract question text (strip expand link/image)
          const link = el.querySelector('a');
          let questionText = '';
          if (link) {
            const clone = link.cloneNode(true);
            clone.querySelectorAll('img, picture').forEach((img) => img.remove());
            questionText = clone.textContent.trim();
          }
          if (!questionText) questionText = el.textContent.trim();
          currentQuestion = questionText;
          currentAnswer = [];
        } else {
          currentAnswer.push(el);
        }
      });
      // Save last item
      if (currentQuestion) {
        items.push({ question: currentQuestion, answer: currentAnswer });
      }

      if (items.length === 0) return;

      // Build Accordion (compact) block
      const cells = [];
      items.forEach(({ question, answer }) => {
        const questionH3 = document.createElement('h3');
        questionH3.textContent = question;
        cells.push([[questionH3], answer.length > 0 ? answer : ['']]);
      });

      const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (compact)', cells });

      // Replace the run elements with the block
      const firstEl = run[0];
      firstEl.before(block);
      run.forEach((el) => {
        if (el.parentElement) el.remove();
      });
    });
  });

  return true;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('main') || document.body;

    // Phase 0: Cleanup (removes header, footer, breadcrumbs, sidebar → fragment, etc.)
    cleanup(document, url);

    // Phase 0.5: Flatten nested layout wrappers
    // Old-theme pages nest content in divs like .ps-content-wrapper > .ps-left-col
    // Unwrap single-child div wrappers to bring content to main level
    function flattenMain(el) {
      let changed = true;
      while (changed) {
        changed = false;
        const children = Array.from(el.children);
        // If main has exactly one child div (layout wrapper), unwrap it
        if (children.length === 1 && children[0].tagName === 'DIV') {
          const wrapper = children[0];
          // Move all wrapper's children to main
          while (wrapper.firstChild) {
            el.appendChild(wrapper.firstChild);
          }
          wrapper.remove();
          changed = true;
        }
      }
    }
    flattenMain(main);

    // Phase 1: Parsers

    // 1a. Old-theme accordion: h2 > a[href="#Expand"] pattern (most common on old-theme)
    parseOldThemeAccordion(main, document);

    // 1b. Button accordion fallback: h2 > button pattern
    const mainContent = main.querySelector('.content-area, .main-content, [role="main"]') || main;
    const containers = [mainContent, ...Array.from(main.querySelectorAll(':scope > div, :scope > section'))];
    const processedContainers = new Set();

    containers.forEach((container) => {
      if (processedContainers.has(container)) return;
      const h2Buttons = container.querySelectorAll(':scope > h2 > button');
      if (h2Buttons.length >= 2) {
        processedContainers.add(container);
        parseButtonAccordion(container, { document });
      }
    });

    // Also check main directly for h2 > button patterns (flat structure)
    if (!processedContainers.has(main)) {
      const mainH2Buttons = main.querySelectorAll(':scope > h2 > button');
      if (mainH2Buttons.length >= 2) {
        const h2Elements = Array.from(main.querySelectorAll(':scope > h2'));
        const firstAccH2 = h2Elements.find((h2) => h2.querySelector('button'));
        if (firstAccH2) {
          const wrapper = document.createElement('div');
          wrapper.className = '__accordion-wrapper';
          firstAccH2.before(wrapper);

          let sibling = wrapper.nextSibling;
          while (sibling) {
            const next = sibling.nextSibling;
            wrapper.appendChild(sibling);
            sibling = next;
          }
          parseButtonAccordion(wrapper, { document });
        }
      }
    }

    // 1c. Detect resources grid: container with 3+ child divs each having a <p> + link
    main.querySelectorAll(':scope > div, :scope > section').forEach((container) => {
      if (processedContainers.has(container)) return;
      const childDivs = Array.from(container.querySelectorAll(':scope > div'));
      if (childDivs.length < 3) return;

      const resourceDivs = childDivs.filter((div) => {
        const hasLink = div.querySelector('a');
        const hasText = div.querySelector('p');
        return hasLink && hasText;
      });

      if (resourceDivs.length >= 3) {
        processedContainers.add(container);

        const cells = [];
        resourceDivs.forEach((div) => {
          const heading = div.querySelector('h3, h4, strong');
          const link = div.querySelector('a');
          const desc = div.querySelector('p');

          const contentCell = [];
          if (heading) {
            const h3 = document.createElement('h3');
            h3.textContent = heading.textContent.trim();
            contentCell.push(h3);
          }
          if (desc && desc.textContent.trim() !== (link ? link.textContent.trim() : '')) {
            const p = document.createElement('p');
            p.textContent = desc.textContent.trim();
            contentCell.push(p);
          }
          if (link) {
            const p = document.createElement('p');
            const a = document.createElement('a');
            a.setAttribute('href', link.getAttribute('href') || '');
            a.textContent = link.textContent.trim();
            p.appendChild(a);
            contentCell.push(p);
          }

          if (contentCell.length > 0) {
            cells.push([contentCell]);
          }
        });

        if (cells.length > 0) {
          const block = WebImporter.Blocks.createBlock(document, { name: 'Cards', cells });
          container.replaceWith(block);
        }
      }
    });

    // Phase 2: Build sections — walk main children, break on H2, create sections with <hr>
    const children = Array.from(main.children).filter((el) => {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return false;
      if (!el.textContent.trim() && !el.querySelector('img, picture, table')) return false;
      return true;
    });

    const sections = [];
    let current = [];

    children.forEach((el) => {
      // Break on H2 that is NOT inside a block TABLE
      if (el.tagName === 'H2' && el.closest('table') === null) {
        if (current.length > 0) {
          sections.push(current);
        }
        current = [el];
      } else {
        current.push(el);
      }
    });
    if (current.length > 0) sections.push(current);

    // Rebuild main with section breaks
    while (main.firstChild) main.removeChild(main.firstChild);

    sections.forEach((section, i) => {
      if (i > 0) main.appendChild(document.createElement('hr'));
      section.forEach((el) => main.appendChild(el));
    });

    // Phase 3: Metadata
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);

    // Add pageid and footnotes to the Metadata block (the LAST table in main)
    const pageid = main.getAttribute('data-pageid');
    const footnotes = main.getAttribute('data-footnotes');

    if (pageid || footnotes) {
      // Find the metadata table — it's the last table and should have "Metadata" in its header
      const allTables = main.querySelectorAll('table');
      let metaTable = null;
      for (let i = allTables.length - 1; i >= 0; i--) {
        const firstCell = allTables[i].querySelector('th, td');
        if (firstCell && firstCell.textContent.trim().toLowerCase().includes('metadata')) {
          metaTable = allTables[i];
          break;
        }
      }
      // Fallback to absolute last table
      if (!metaTable) metaTable = allTables[allTables.length - 1];

      if (metaTable) {
        const tbody = metaTable.querySelector('tbody') || metaTable;
        if (pageid) {
          const row = document.createElement('tr');
          row.innerHTML = `<td>pageid</td><td>${pageid}</td>`;
          tbody.appendChild(row);
        }
        if (footnotes) {
          const row = document.createElement('tr');
          row.innerHTML = `<td>footnotes</td><td>${footnotes}</td>`;
          tbody.appendChild(row);
        }
      }
    }

    main.removeAttribute('data-pageid');
    main.removeAttribute('data-footnotes');

    // Adjust image URLs
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '') || '/index',
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: 'old-theme',
      },
    }];
  },
};
