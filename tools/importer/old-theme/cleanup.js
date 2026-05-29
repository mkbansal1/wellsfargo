/* eslint-disable */
/* global WebImporter */

/**
 * Old-theme cleanup for legacy Wells Fargo pages.
 * Removes non-content elements, converts sidebar to Fragment block,
 * extracts metadata from aside/complementary, and applies generic transforms.
 */
export default function cleanup(document, url) {
  const main = document.querySelector('main')
    || document.querySelector('#mainColumns')
    || document.querySelector('#shell')
    || document.body;

  // --- Remove cookie consent / OneTrust overlay (run on full document) ---
  const removeSelectors = [
    '#onetrust-consent-sdk',
    '.onetrust-pc-dark-filter',
    '[id*="onetrust"]',
    '#ot-sdk-btn-floating',
    '.ep-modal',
    '.signon-container',
    '.hidden',
    '[class*="hidden"]',
    '#persistent-cta',
    'iframe',
    'noscript',
    '.visuallyHidden',
    'link',
    'script',
    'a[href="#skip"]',
    '.skip-to-content',
  ];
  removeSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // Remove skip-to-content links by text
  document.querySelectorAll('a').forEach((a) => {
    const text = (a.textContent || '').trim().toLowerCase();
    if (text === 'skip to content' || text === 'skip to main content') {
      a.remove();
    }
  });

  // --- Remove header and footer ---
  document.querySelectorAll('header').forEach((el) => el.remove());
  document.querySelectorAll('footer').forEach((el) => el.remove());
  document.querySelectorAll('.ps-masthead, .ps-footer-wrapper, .ps-footer-homepage').forEach((el) => el.remove());

  // --- Remove Spanish language popups/modals ---
  // Walk direct children of main/body to find popup containers
  const walkTargets = [main, document.body];
  walkTargets.forEach((parent) => {
    if (!parent) return;
    Array.from(parent.children).forEach((child) => {
      const text = child.textContent || '';
      // Remove popup containers with "Comienzo de ventana emergente"
      if (text.includes('Comienzo de ventana emergente') && text.includes('Fin de ventana emergente')) {
        child.remove();
        return;
      }
      // Remove Spanish-only modal
      if (text.includes('Esta página solo está disponible en inglés') && text.length < 500) {
        child.remove();
        return;
      }
      // Remove "Navegó a una página que no está disponible en español"
      if (text.includes('Navegó a una página que no está disponible en español') && text.length < 500) {
        child.remove();
      }
    });
  });

  // --- Remove "leaving site" modals and social share dialogs ---
  // These are dialog/modal containers with "leaving wellsfargo.com" or "You are leaving" text
  const removeByContent = (parent) => {
    Array.from(parent.querySelectorAll('div, section')).forEach((el) => {
      const text = el.textContent || '';
      // Remove leaving-site modals
      if ((text.includes('You are leaving wellsfargo.com') || text.includes('leaving wellsfargo.com'))
        && text.includes('Cancel') && text.length < 600) {
        el.remove();
        return;
      }
      // Remove social share dialogs ("Choose a link above" + LinkedIn/Twitter share links)
      if (text.includes('Choose a link above') && text.includes('Wells Fargo does not control') && text.length < 600) {
        el.remove();
      }
    });
  };
  removeByContent(main);

  // --- Remove print/share toolbar ---
  // Look for elements containing links with "Imprima"/"Print" + social share links
  const printShareEls = main.querySelectorAll('a');
  const toolbarCandidates = new Set();
  printShareEls.forEach((a) => {
    const text = a.textContent || '';
    const href = a.getAttribute('href') || '';
    if ((text.includes('Imprima') || text.includes('Print')) || href.includes('/exit/social')) {
      // Walk up to find the toolbar container
      let toolbar = a.parentElement;
      for (let i = 0; i < 4; i++) {
        if (toolbar && toolbar !== main && toolbar !== document.body) {
          const links = toolbar.querySelectorAll('a');
          const hasPrint = Array.from(links).some((l) => l.textContent.includes('Imprima') || l.textContent.includes('Print'));
          const hasSocial = Array.from(links).some((l) => (l.getAttribute('href') || '').includes('/exit/social')
            || (l.getAttribute('href') || '').includes('linkedin.com/share')
            || (l.getAttribute('href') || '').includes('twitter.com/share'));
          if (hasPrint || hasSocial) {
            toolbarCandidates.add(toolbar);
          }
          toolbar = toolbar.parentElement;
        }
      }
    }
  });
  toolbarCandidates.forEach((el) => el.remove());

  // --- Remove breadcrumb navigation ---
  document.querySelectorAll('nav[aria-label*="breadcrumb"], nav.breadcrumbs, [class*="breadcrumb"]').forEach((el) => el.remove());

  // --- Remove empty complementary aside elements ---
  document.querySelectorAll('[role="complementary"]').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img')) {
      el.remove();
    }
  });

  // --- Extract footnote CIDs from div.c20 (BEFORE sidebar detection which may remove #contentBottom) ---
  const footnoteCids = [];
  let pageid = '';
  const c20 = main.querySelectorAll('.c20');
  c20.forEach((el) => {
    if (el.querySelector('.c20equal')) {
      footnoteCids.push('tcm:84-226264-16');
    }
    const cidItems = el.querySelectorAll('[data-cid]');
    cidItems.forEach((item) => {
      const cid = item.getAttribute('data-cid');
      if (!cid) return;
      const text = item.textContent.trim();
      const dtMatch = text.match(/DT1-\d+-\d+-\d+-[\d.]+/);
      const qsrMatch = text.match(/QSR-\d+-\d+\.\d+\.\d+/);
      const lrcMatch = text.match(/LRC-\d+/);
      if (dtMatch) pageid = dtMatch[0];
      else if (qsrMatch) pageid = qsrMatch[0];
      else if (lrcMatch) pageid = lrcMatch[0];
      else if (!footnoteCids.includes(cid)) footnoteCids.push(cid);
    });
    el.remove();
  });

  // Extract from aside/complementary too
  const asides = document.querySelectorAll('aside, [role="complementary"]');
  for (const aside of asides) {
    const text = aside.textContent || '';
    if (!pageid) {
      const dtMatch = text.match(/DT1-\d+-\d+-\d+-[\d.]+/);
      const qsrMatch = text.match(/QSR-\d+-\d+\.\d+\.\d+/);
      const lrcMatch = text.match(/LRC-\d+/);
      if (dtMatch) pageid = dtMatch[0];
      else if (qsrMatch) pageid = qsrMatch[0];
      else if (lrcMatch) pageid = lrcMatch[0];
    }
    const cidItems = aside.querySelectorAll('[data-cid]');
    cidItems.forEach((item) => {
      const cid = item.getAttribute('data-cid');
      if (cid && !footnoteCids.includes(cid)) {
        const itemText = item.textContent.trim();
        if (!itemText.match(/^(DT1|QSR|LRC)-/)) footnoteCids.push(cid);
      }
    });
    aside.remove();
  }

  if (pageid) {
    main.setAttribute('data-pageid', pageid);
    document.body.setAttribute('data-pageid', pageid);
  }
  if (footnoteCids.length > 0) {
    main.setAttribute('data-footnotes', footnoteCids.join(', '));
    document.body.setAttribute('data-footnotes', footnoteCids.join(', '));
  }

  // --- Sidebar → Fragment ---
  const isSpanish = url && url.includes('/es/');
  const prefix = isSpanish ? '/es' : '';

  // Find right-column sidebar with help/questions content.
  // Strategy: find the heading element, then walk UP to find the narrowest container
  // that holds the entire sidebar content (not the whole page).
  let sidebarEl = null;

  // Pattern 1: H2 "¿Tiene más preguntas?" or "More questions?"
  const allH2s = main.querySelectorAll('h2');
  for (const h2 of allH2s) {
    const hText = h2.textContent.trim();
    if (hText.includes('¿Tiene más preguntas?') || hText.includes('More questions?')) {
      // Walk up from the h2 to find the sidebar container
      // The sidebar container is typically a direct child of a two-column layout
      sidebarEl = h2.parentElement;
      // Go up until we find an element that is NOT the main content area
      while (sidebarEl && sidebarEl.parentElement && sidebarEl.parentElement !== main && sidebarEl.parentElement !== document.body) {
        const parent = sidebarEl.parentElement;
        // Stop at content column wrappers — never replace the main content area
        if (parent.classList.contains('mainContentCol') || parent.id === 'mainColumns') {
          break;
        }
        // Stop if parent contains significantly more content (it's a layout wrapper)
        const parentChildren = Array.from(parent.children);
        if (parentChildren.length > 1 && parent.textContent.length > sidebarEl.textContent.length * 3) {
          break;
        }
        sidebarEl = parent;
      }
      break;
    }
  }

  // Pattern 2: H3 "Quick help"/"Ayuda rápida" + H3 "Call us"/"Llámenos"
  if (!sidebarEl) {
    const allH3s = main.querySelectorAll('h3');
    let quickHelpH3 = null;
    let callUsH3 = null;
    for (const h3 of allH3s) {
      const t = h3.textContent.trim().toLowerCase();
      if (t.includes('quick help') || t.includes('ayuda rápida')) quickHelpH3 = h3;
      if (t.includes('call us') || t.includes('llámenos')) callUsH3 = h3;
    }
    if (quickHelpH3 && callUsH3) {
      // Find common ancestor of both h3s that is narrow enough to be a sidebar
      sidebarEl = quickHelpH3.parentElement;
      while (sidebarEl && !sidebarEl.contains(callUsH3)) {
        sidebarEl = sidebarEl.parentElement;
      }
      // Make sure we haven't gone all the way up to main
      if (sidebarEl === main || sidebarEl === document.body) {
        sidebarEl = quickHelpH3.parentElement;
      }
    }
  }

  if (sidebarEl && sidebarEl !== main && sidebarEl !== document.body
    && !sidebarEl.classList.contains('mainContentCol') && sidebarEl.id !== 'contentBody') {
    const block = WebImporter.Blocks.createBlock(document, {
      name: 'Fragment',
      cells: [[[prefix + '/fragments/mortgage/talk-to-mortgage-consultant']]],
    });
    sidebarEl.replaceWith(block);
  }


  // --- Remove contentBottom AFTER footnote extraction ---
  main.querySelectorAll('.contentBottom, #contentBottom, [id*="contentBottom"]').forEach((el) => el.remove());

  // --- Generic transforms ---

  // div.title2-SemiBold → <h3>
  main.querySelectorAll('div.title2-SemiBold').forEach((el) => {
    const h3 = document.createElement('h3');
    h3.innerHTML = el.innerHTML;
    el.replaceWith(h3);
  });

  // div.headline → <h4>
  main.querySelectorAll('div.headline').forEach((el) => {
    const h4 = document.createElement('h4');
    h4.innerHTML = el.innerHTML;
    el.replaceWith(h4);
  });

  // Footnote refs: <a> containing <sup> with footnote/modal text → <sup><a>N</a></sup>
  main.querySelectorAll('a').forEach((a) => {
    const text = a.textContent || '';
    if (!text.includes('footnote') && !text.includes('modal')) return;
    const match = text.match(/(\d+)\s*$/);
    if (!match) return;
    const num = match[1];
    const href = a.getAttribute('href') || '#';
    const newSup = document.createElement('sup');
    const newA = document.createElement('a');
    newA.setAttribute('href', href);
    newA.textContent = num;
    newSup.appendChild(newA);
    a.replaceWith(newSup);
  });

  // Absolute URLs → relative
  main.querySelectorAll('a').forEach((a) => {
    let href = a.getAttribute('href') || '';
    if (href.startsWith('https://www.wellsfargo.com/')) {
      href = href.replace('https://www.wellsfargo.com', '');
      a.setAttribute('href', href);
    }
  });

  // Strip trailing slash (but not bare '/')
  main.querySelectorAll('a').forEach((a) => {
    let href = a.getAttribute('href') || '';
    if (href.length > 1 && href.endsWith('/')) {
      a.setAttribute('href', href.slice(0, -1));
    }
  });

  // Secondary buttons → wrap in <em> (check secondary FIRST before primary, since a.c93.secondarybtn matches both)
  main.querySelectorAll('a.ps-btn-secondary, a[class*="ps-btn-secondary"], a.c93.secondarybtn').forEach((a) => {
    const em = document.createElement('em');
    const newA = document.createElement('a');
    newA.setAttribute('href', a.getAttribute('href') || '');
    newA.textContent = a.textContent.trim();
    em.appendChild(newA);
    a.replaceWith(em);
  });

  // Primary buttons → wrap in <strong>
  main.querySelectorAll('a.ps-btn-primary, a.ps-btn, a[class*="ps-btn-primary"], a.c93:not(.secondarybtn)').forEach((a) => {
    const strong = document.createElement('strong');
    const newA = document.createElement('a');
    newA.setAttribute('href', a.getAttribute('href') || '');
    newA.textContent = a.textContent.trim();
    strong.appendChild(newA);
    a.replaceWith(strong);
  });

  // Strip trailing '>' from link text
  main.querySelectorAll('a').forEach((a) => {
    const text = a.textContent || '';
    if (/\s*>+\s*$/.test(text)) {
      a.textContent = text.replace(/\s*>+\s*$/, '').trim();
    }
  });
}
