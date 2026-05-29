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
    let main = document.querySelector('main')
      || document.querySelector('#contentBody')
      || document.querySelector('#mainColumns')
      || document.querySelector('#shell')
      || document.body;

    // Phase 0: Cleanup (removes header, footer, breadcrumbs, sidebar → fragment, etc.)
    cleanup(document, url);

    // Extract H1 and hero from shell-level siblings before narrowing to content body
    const shell = document.querySelector('#shell') || document.querySelector('.t8');
    let extractedH1 = null;
    let extractedHero = null;

    if (shell) {
      // H1 from div.c42 > #title
      const titleDiv = shell.querySelector('.c42 h1, #title h1');
      if (titleDiv) {
        extractedH1 = document.createElement('h1');
        extractedH1.textContent = titleDiv.textContent.trim();
      }

      // Hero from #contentTop
      const contentTop = shell.querySelector('#contentTop, [id*="contentTop"]');
      if (contentTop) {
        const heroImg = contentTop.querySelector('img');
        const heroH2 = contentTop.querySelector('h2');
        const heroDesc = contentTop.querySelector('p');
        let ctaLink = contentTop.querySelector('a');
        if (heroH2) {
          extractedHero = { img: heroImg, h2: heroH2, desc: heroDesc, cta: ctaLink };
        }
        contentTop.remove();
      }
    }

    // Re-resolve main after cleanup — prefer the most specific content container
    main = document.querySelector('#contentBody')
      || document.querySelector('#mainColumns')
      || document.querySelector('main')
      || document.querySelector('#shell')
      || document.querySelector('.t8')
      || document.body;

    

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

    // Phase 0.55: Unwrap content column wrappers to bring c54 separators to main level
    // Source nests content in: #mainColumns > .mainContentCol > #contentBody > (actual content + c54)
    const contentCol = main.querySelector('.mainContentCol') || main.querySelector('[class*="ContentCol"]');
    if (contentCol) {
      // Find the innermost wrapper that contains the actual content (with c54 siblings)
      let target = contentCol;
      while (target.children.length === 1 && target.children[0].tagName === 'DIV') {
        target = target.children[0];
      }
      // Move target's children directly into main (clearing the wrapper chain)
      while (target.firstChild) {
        main.appendChild(target.firstChild);
      }
      // Remove the now-empty wrapper chain
      contentCol.remove();
    }
    // Re-run flatten in case we still have single-child wrappers
    flattenMain(main);

    // Phase 0.6: Remove hatched background divs (decorative only, skip content-bearing ones like c55)
    main.querySelectorAll('.hatched, [class*="hatched"]').forEach((el) => {
      if (el.classList.contains('c55') || el.querySelector('.c55')) return;
      el.remove();
    });

    // Phase 0.7: Prepend extracted H1 and Hero to main
    if (extractedHero) {
      const cellContent = [];
      if (extractedHero.img) {
        const pic = extractedHero.img.closest('picture') || extractedHero.img;
        cellContent.push(pic.cloneNode(true));
      }
      const h2 = document.createElement('h2');
      h2.textContent = extractedHero.h2.textContent.trim();
      cellContent.push(h2);
      if (extractedHero.desc && extractedHero.desc.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = extractedHero.desc.textContent.trim();
        cellContent.push(p);
      }
      if (extractedHero.cta) {
        const ctaP = document.createElement('p');
        const strong = document.createElement('strong');
        const a = document.createElement('a');
        a.setAttribute('href', extractedHero.cta.getAttribute('href') || '');
        a.textContent = extractedHero.cta.textContent.trim();
        strong.appendChild(a);
        ctaP.appendChild(strong);
        cellContent.push(ctaP);
      }
      const heroBlock = WebImporter.Blocks.createBlock(document, { name: 'Hero', cells: [[cellContent]] });
      main.insertBefore(heroBlock, main.firstChild);
    }
    if (extractedH1) {
      main.insertBefore(extractedH1, main.firstChild);
    }

    // Fallback: Phase 0.7 legacy hero detection (for pages where contentTop is inside main)
    const contentTop = main.querySelector('#contentTop, [id*="contentTop"]');
    if (contentTop) {
      const heroImg = contentTop.querySelector('img');
      const heroH2 = contentTop.querySelector('h2');
      const heroDesc = contentTop.querySelector('p');
      let ctaLink = contentTop.querySelector('a');
      if (heroH2 && ctaLink) {
        const cellContent = [];
        if (heroImg) cellContent.push((heroImg.closest('picture') || heroImg).cloneNode(true));
        const h2 = document.createElement('h2');
        h2.textContent = heroH2.textContent.trim();
        cellContent.push(h2);
        if (heroDesc && heroDesc.textContent.trim()) {
          const p = document.createElement('p');
          p.textContent = heroDesc.textContent.trim();
          cellContent.push(p);
        }
        const ctaP = document.createElement('p');
        const strong = document.createElement('strong');
        const a = document.createElement('a');
        a.setAttribute('href', ctaLink.getAttribute('href') || '');
        a.textContent = ctaLink.textContent.trim();
        strong.appendChild(a);
        ctaP.appendChild(strong);
        cellContent.push(ctaP);
        const block = WebImporter.Blocks.createBlock(document, { name: 'Hero', cells: [[cellContent]] });
        contentTop.replaceWith(block);
      }
    }

    // Phase 0.8: Cards from div.c60
    // CARDS from div.c60: variant depends on image size (icons ≤100px vs separator for large images)
    const processed = new Set();
    main.querySelectorAll('.c60').forEach((c60) => {
      if (processed.has(c60)) return;
      const childDivs = Array.from(c60.querySelectorAll(':scope > div'));
      if (childDivs.length < 2) return;

      // Determine variant by first image
      const firstImg = c60.querySelector('img');
      const src = (firstImg && (firstImg.getAttribute('src') || '')).toLowerCase();
      const width = parseInt(firstImg && firstImg.getAttribute('width') || '0', 10);
      const isIcon = (width > 0 && width <= 100) || src.includes('64x64') || src.includes('icon') || src.includes('gradient-64') || src.includes('-64x');
      const variant = isIcon ? 'Cards (icons, bg-image)' : 'Cards (separator)';

      const cells = [];
      childDivs.forEach((div) => {
        const img = div.querySelector('img');
        const heading = div.querySelector('h2, h3, h4');
        const contentCell = [];
        if (heading) {
          const h3 = document.createElement('h3');
          h3.textContent = heading.textContent.trim();
          contentCell.push(h3);
        }
        div.querySelectorAll('p').forEach((p) => {
          if (p.querySelector('img')) return;
          if (p.textContent.trim()) contentCell.push(p.cloneNode(true));
        });
        if (img || contentCell.length > 0) {
          cells.push([img || '', contentCell]);
        }
      });

      if (cells.length > 0) {
        const block = WebImporter.Blocks.createBlock(document, { name: variant, cells });
        c60.replaceWith(block);
      }
    });

    
    // Phase 0.9: Columns (panel) from div.c55 or div.c5
    // Pattern: container has an image + text content. Image → col 1, text → col 2.
    main.querySelectorAll('.c55, .c5').forEach((c55) => {
      if (processed.has(c55)) return;
      const img = c55.querySelector('img');
      if (!img) return;

      // Col 1: image
      const pic = img.closest('picture') || img;

      // Col 2: clone c55, remove image, collect remaining paragraphs
      const contentClone = c55.cloneNode(true);
      const clonedImg = contentClone.querySelector('img');
      if (clonedImg) {
        const imgWrapper = clonedImg.closest('picture') || clonedImg.closest('p') || clonedImg;
        imgWrapper.remove();
      }
      const col2Content = [];
      contentClone.querySelectorAll('p, ul, ol').forEach((el) => {
        if (!el.textContent.trim()) return;
        // Skip nested paragraphs already inside a captured parent
        if (el.tagName === 'P' && el.parentElement.closest('p')) return;
        col2Content.push(el.cloneNode(true));
      });

      if (col2Content.length === 0) return;

      const block = WebImporter.Blocks.createBlock(document, {
        name: 'Columns (panel)',
        cells: [[[pic.cloneNode(true)], col2Content]],
      });
      processed.add(c55);
      c55.replaceWith(block);
    });

    // Phase 0.95: Tabs from ul.tabs / [role="tablist"]
    // If tab content has complex blocks (accordion, columns, etc.) → tabs (reference) with fragments
    // If tab content is simple freetext → standard Tabs
    const tablist = main.querySelector('ul.tabs, [role="tablist"]');
    if (tablist) {
      const tabLinks = tablist.querySelectorAll('a[href^="#"], [role="tab"] a');
      const tabData = [];
      tabLinks.forEach((a) => {
        const label = a.textContent.trim();
        const href = a.getAttribute('href') || '';
        const panelId = href.replace('#', '');
        if (!label || !panelId) return;
        const panel = main.querySelector('#' + panelId) || main.querySelector('[id="' + panelId + '"]');
        if (!panel) return;
        const content = panel.innerHTML || '';
        // Check if panel has complex content (accordion patterns, nested blocks)
        const hasAccordion = panel.querySelector('.c58, [href="#Expand"], .rebranded-show-hide, details, h2 > button, h3 > a[href*="Expand"]');
        const hasComplexBlock = panel.querySelector('.c60, .c55, .c5, [role="tablist"]');
        const isComplex = !!(hasAccordion || hasComplexBlock);
        const slug = 'tab-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        tabData.push({ label, content, panel, isComplex, slug });
      });

      if (tabData.length >= 2) {
        // Determine variant: if ANY panel has complex content → tabs (reference)
        const useReference = tabData.some((t) => t.isComplex);

        if (useReference) {
          // Build fragment paths
          const pagePath = new URL(params.originalURL || url).pathname.replace(/\/$/, '').replace(/^\//, '');
          const fragmentBase = '/fragments/' + pagePath;
          const cells = tabData.map((tab) => [[tab.label], [fragmentBase + '/' + tab.slug]]);
          const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs (reference)', cells });
          tablist.before(block);
        } else {
          // Standard tabs with inline content
          const cells = tabData.map((tab) => {
            const contentEl = document.createElement('div');
            contentEl.innerHTML = tab.content;
            return [[tab.label], [contentEl]];
          });
          const block = WebImporter.Blocks.createBlock(document, { name: 'Tabs', cells });
          tablist.before(block);
        }

        tablist.remove();
        tabData.forEach((tab) => { if (tab.panel && tab.panel.parentElement) tab.panel.remove(); });
      }
    }

    // Phase 1: Parsers

    // 1a. Rebranded show-hide accordion: group .rebranded-show-hide items, break on H3
    // H3 before a group becomes that group's heading (placed before the accordion block)
    const showHideItems = main.querySelectorAll('.rebranded-show-hide');
    if (showHideItems.length > 0) {
      const parent = showHideItems[0].parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        let currentGroup = [];
        let currentHeading = null;
        const groups = [];

        siblings.forEach((el) => {
          const cls = el.className || '';
          if (cls.includes('rebranded-show-hide')) {
            currentGroup.push(el);
          } else if (el.tagName === 'H3') {
            // H3 breaks current group and becomes heading for the NEXT group
            if (currentGroup.length > 0) {
              groups.push({ items: currentGroup, heading: currentHeading, beforeEl: currentGroup[0] });
              currentGroup = [];
            }
            currentHeading = el;
          } else if (cls.includes('c54')) {
            if (currentGroup.length > 0) {
              groups.push({ items: currentGroup, heading: currentHeading, beforeEl: currentGroup[0] });
              currentGroup = [];
              currentHeading = null;
            }
          }
        });
        if (currentGroup.length > 0) {
          groups.push({ items: currentGroup, heading: currentHeading, beforeEl: currentGroup[0] });
        }

        // Convert each group to an Accordion (compact) block with heading before it
        groups.forEach(({ items, heading, beforeEl }) => {
          const cells = [];
          items.forEach((item) => {
            const h2 = item.querySelector('h2');
            const questionText = h2 ? h2.textContent.trim() : '';
            const answerEls = Array.from(item.children).filter((c) => c.tagName !== 'H2');
            if (questionText) {
              const qH3 = document.createElement('h3');
              qH3.textContent = questionText;
              cells.push([[qH3], answerEls.length > 0 ? answerEls : ['']]);
            }
          });
          if (cells.length > 0) {
            const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (compact)', cells });
            // Place heading (H3) before the accordion block if present
            if (heading) {
              beforeEl.before(heading);
            }
            beforeEl.before(block);
            items.forEach((item) => item.remove());
          }
        });
      }
    }

    // 1a-fallback: Old-theme accordion: h2 > a[href="#Expand"] pattern
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
          const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (separator)', cells });
          container.replaceWith(block);
        }
      }
    });

    // Phase 1.9: Deep flatten — ensure all block-level content is a direct child of main
    // Unwrap any remaining single-purpose wrapper divs that don't have meaningful classes
    Array.from(main.children).forEach((child) => {
      if (child.tagName === 'DIV' && child.children.length > 0 && !child.className && child.querySelector('.c54, .rebranded-show-hide, h2, h3, table')) {
        // This is a layout wrapper with no class — unwrap its children to main
        while (child.firstChild) {
          main.insertBefore(child.firstChild, child);
        }
        child.remove();
      }
    });

    // Phase 2: Build sections — break on H2 and div.c54 separators
    const children = Array.from(main.children).filter((el) => {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return false;
      if (!el.textContent.trim() && !el.querySelector('img, picture, table') && !(el.className || '').includes('c54')) return false;
      return true;
    });

    const sections = [];
    let current = [];

    children.forEach((el) => {
      const cls = el.className || '';
      // div.c54 = section separator (skip the element itself, just break)
      if (cls.includes('c54')) {
        if (current.length > 0) {
          sections.push(current);
          current = [];
        }
        return;
      }
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

    // Rebuild main: wrap each section in a <div> for proper serialization
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
    const pageid = main.getAttribute('data-pageid') || document.body.getAttribute('data-pageid') || '';
    const footnotes = main.getAttribute('data-footnotes') || document.body.getAttribute('data-footnotes') || '';

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

    // Wrap each section in its own <div> for proper serialization
    // The helix importer serializes each top-level child of the returned element
    const wrapper = document.createElement('div');
    const mainChildren = Array.from(main.children);
    let sectionDiv = document.createElement('div');

    mainChildren.forEach((el) => {
      if (el.tagName === 'HR') {
        // Section break: push current section, start new one
        if (sectionDiv.children.length > 0) {
          wrapper.appendChild(sectionDiv);
          sectionDiv = document.createElement('div');
        }
      } else {
        sectionDiv.appendChild(el);
      }
    });
    if (sectionDiv.children.length > 0) wrapper.appendChild(sectionDiv);

    // Clear main, move wrapper children to main
    while (main.firstChild) main.removeChild(main.firstChild);
    while (wrapper.firstChild) main.appendChild(wrapper.firstChild);

    const path = new URL(params.originalURL || url).pathname.replace(/\/$/, '').replace(/\.html$/, '') || '/index';

    return [{
      element: main,
      path,
      report: { title: document.title, template: 'old-theme' },
    }];
  },
};
