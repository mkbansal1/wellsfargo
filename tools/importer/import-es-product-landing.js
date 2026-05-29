/* eslint-disable */
/* global WebImporter */

/**
 * Import script for Spanish (/es/) product landing pages.
 *
 * Spanish pages have the SAME visual structure as English but different source
 * DOM nesting patterns:
 *   1. Card sections use `.small-promo-combined` wrapping
 *      `.ps-marketing-small-promo-items` > `.ps-marketing-small-promo-item`
 *      (nested containers that both match the English parser's selectors,
 *       causing double-processing)
 *   2. The `.small-promo-combined` selector matches BOTH outer and inner containers
 *   3. Testimonials section uses `card-background-white` without `.ps-text-only-card`
 *
 * CRITICAL: Every line in output .plain.html MUST have balanced <div> opens/closes.
 *           DA flattens content if any line has unbalanced divs.
 */

// TRANSFORMER IMPORTS
import wellsfargoCleanup from './transformers/wellsfargo-cleanup.js';

// SHARED PARSER IMPORTS
import parseVideoShared from './parsers/video.js';
import parseTabsShared from './parsers/tabs.js';

// --- PARSER FUNCTIONS ---

/**
 * Parse hero/marquee section.
 * Source: .rsk-marquee-container, .marquee-container, .ps-large-promo-full-container
 * Output: Hero block (single cell with image + h2 + description + CTA)
 */
function parseHero(element, { document, isFirstHero }) {
  const img = element.querySelector(
    '.rsk-marquee-img-container img, .marquee-img img, .marquee-wrap img, picture img, img'
  );

  const heading = element.querySelector(
    '.rsk-marquee-inner-content h2, .rsk-marquee-content h2, .marquee-content h2, .marquee-content h1, h2, h1'
  );

  const contentArea = element.querySelector(
    '.rsk-marquee-inner-content, .rsk-marquee-content, .marquee-content'
  ) || element;

  let description = null;
  const paragraphs = contentArea.querySelectorAll('p');
  for (const p of paragraphs) {
    const btnLink = p.querySelector('a.ps-btn-primary, a.ps-btn-secondary, a[class*="btn"]');
    if (btnLink && p.textContent.trim() === btnLink.textContent.trim()) continue;
    if (p.textContent.trim()) {
      description = p;
      break;
    }
  }

  const ctaLink = element.querySelector(
    'a.ps-btn-primary, a.ps-btn-secondary, a[class*="ps-btn"], .ps-padding a'
  );

  const cellContent = [];

  if (img) {
    const picture = img.closest('picture') || img;
    cellContent.push(picture.cloneNode(true));
  }
  if (heading) {
    const h2 = document.createElement('h2');
    h2.innerHTML = heading.innerHTML;
    cellContent.push(h2);
  }
  if (description) {
    const p = document.createElement('p');
    p.innerHTML = description.innerHTML;
    cellContent.push(p);
  }
  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    const strong = document.createElement('strong');
    strong.appendChild(a);
    p.appendChild(strong);
    cellContent.push(p);
  }

  const cells = [[cellContent]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Hero', cells });

  if (isFirstHero) {
    block.setAttribute('data-section-style', 'center-align, heading-bar');
  }

  element.replaceWith(block);
}

/**
 * Parse cards with icons (small 64x64 images).
 * Source: .small-promo-combined > .ps-marketing-small-promo-items > .ps-marketing-small-promo-item
 * Also handles: .card-container with icon-sized images
 * Output: Cards (icons, bg-image) block
 *
 * IMPORTANT: We target `.ps-marketing-small-promo-item` (leaf containers) to avoid
 * double-processing from the nested `.small-promo-combined` > `.ps-marketing-small-promo-items` structure.
 */
function parseCardsIcons(element, { document }) {
  // Target the LEAF card items to avoid double-processing
  // Spanish DOM: .small-promo-combined > .ps-marketing-small-promo-items > .ps-marketing-small-promo-item
  let cardItems = Array.from(element.querySelectorAll('.ps-marketing-small-promo-item'));

  // Fallback: .enhanced-txt-cm.mid-size-promo (English-like structure)
  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(
      '.enhanced-txt-cm.mid-size-promo, .ps-promo-full-item, [class*="card-content"]:not(.card-container)'
    ));
  }

  // Fallback: card-container children
  if (cardItems.length === 0) {
    const container = element.querySelector('.card-container, [class*="promo-full-items"]');
    if (container) {
      cardItems = Array.from(container.children);
    }
  }

  // Last resort: direct child divs with h3/h4
  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(':scope > div')).filter(
      (el) => el.querySelector('h3, h4')
    );
  }

  const cells = [];

  cardItems.forEach((card) => {
    const image = card.querySelector('img');
    const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text, [class*="txt-body"]') || card;

    const heading = textBody.querySelector('h3, h4') || card.querySelector('h3, h4');

    let description = null;
    const candidates = textBody.querySelectorAll(':scope > div, :scope > p');
    for (const child of candidates) {
      if (child.querySelector('h2, h3, h4')) continue;
      const link = child.querySelector('a');
      if (link && child.textContent.trim() === link.textContent.trim()) continue;
      if (child.textContent.trim()) {
        description = child;
        break;
      }
    }

    const ctaLink = textBody.querySelector('p > a, a.cta, a.button') || card.querySelector('p > a');

    const contentCell = [];

    if (heading) {
      const h3 = document.createElement('h3');
      h3.innerHTML = heading.innerHTML;
      contentCell.push(h3);
    }

    if (description) {
      const p = document.createElement('p');
      p.innerHTML = description.innerHTML;
      contentCell.push(p);
    }

    if (ctaLink) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = ctaLink.href;
      link.textContent = ctaLink.textContent.replace(/\s*>+\s*$/, '').trim();
      p.appendChild(link);
      contentCell.push(p);
    }

    if (image || contentCell.length > 0) {
      cells.push([image || '', contentCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (icons, bg-image)', cells });
  element.replaceWith(block);
}

/**
 * Parse cards with photos (separator variant - larger images).
 * Source: .card-container with large images, photo cards
 * Output: Cards (separator) block
 */
function parseCardsSeparator(element, { document }) {
  let cardItems = Array.from(element.querySelectorAll(
    '.enhanced-txt-cm.mid-size-promo, .ps-promo-full-item, [class*="card-content"]:not(.card-container)'
  ));

  if (cardItems.length === 0) {
    const container = element.querySelector('.card-container, [class*="promo-full-items"]');
    if (container) {
      cardItems = Array.from(container.children);
    }
  }

  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(':scope > div')).filter(
      (el) => el.querySelector('h3, h4')
    );
  }

  const cells = [];

  cardItems.forEach((card) => {
    const image = card.querySelector('img');
    const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text, [class*="txt-body"]') || card;
    const heading = textBody.querySelector('h3, h4') || card.querySelector('h3, h4');

    let description = null;
    const candidates = textBody.querySelectorAll(':scope > div, :scope > p');
    for (const child of candidates) {
      if (child.querySelector('h2, h3, h4')) continue;
      const link = child.querySelector('a');
      if (link && child.textContent.trim() === link.textContent.trim()) continue;
      if (child.textContent.trim()) {
        description = child;
        break;
      }
    }

    const ctaLink = textBody.querySelector('p > a, a.cta, a.button') || card.querySelector('p > a');

    const contentCell = [];

    if (heading) {
      const h3 = document.createElement('h3');
      h3.innerHTML = heading.innerHTML;
      contentCell.push(h3);
    }

    if (description) {
      const p = document.createElement('p');
      p.innerHTML = description.innerHTML;
      contentCell.push(p);
    }

    if (ctaLink) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = ctaLink.href;
      link.textContent = ctaLink.textContent.replace(/\s*>+\s*$/, '').trim();
      p.appendChild(link);
      contentCell.push(p);
    }

    if (image || contentCell.length > 0) {
      cells.push([image || '', contentCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards', cells });
  element.replaceWith(block);
}

/**
 * Parse cards without images (noimage variant).
 * Source: .card-container with text-only cards (no images at all)
 * Output: Cards (bg-image) block
 */
function parseCardsNoImage(element, { document }) {
  let cardItems = Array.from(element.querySelectorAll('.ps-marketing-small-promo-item'));

  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(
      '.card-container > div, .card-theme2 > div, [class*="card-content"]:not(.card-container)'
    ));
  }

  if (cardItems.length === 0) {
    const container = element.querySelector('.card-container, [class*="card-container"]');
    if (container) {
      cardItems = Array.from(container.children).filter((el) => el.querySelector('h3, h4'));
    }
  }

  if (cardItems.length === 0) {
    cardItems = Array.from(element.querySelectorAll(':scope > div > div')).filter(
      (el) => el.querySelector('h3, h4')
    );
  }

  const cells = [];

  cardItems.forEach((card) => {
    const heading = card.querySelector('h3, h4');
    const contentParts = [];

    if (heading) {
      const h3 = document.createElement('h3');
      h3.innerHTML = heading.innerHTML;
      contentParts.push(h3);
    }

    const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text, [class*="txt-body"]') || card;
    const paragraphs = textBody.querySelectorAll('p, div:not(:has(h3)):not(:has(h4))');
    paragraphs.forEach((p) => {
      if (p.querySelector('h3, h4')) return;
      if (p.textContent.trim() || p.querySelector('a')) {
        const para = document.createElement('p');
        para.innerHTML = p.innerHTML;
        contentParts.push(para);
      }
    });

    if (contentParts.length > 0) {
      // noimage variant: empty col1 | content col2
      cells.push([[''], contentParts]);
    }
  });

  if (cells.length > 0) {
    const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (bg-image)', cells });
    element.replaceWith(block);
  }
}

// Use shared video parser
const parseVideo = parseVideoShared;

/**
 * Parse accordion/FAQ section.
 * Source: details.show-hide-content-wrapper elements
 * Output: Accordion (compact) block
 */
function parseAccordion(element, { document }) {
  const detailsList = element.tagName === 'DETAILS'
    ? [element]
    : Array.from(element.querySelectorAll('details'));

  const cells = [];

  detailsList.forEach((details) => {
    const summary = details.querySelector('summary');
    if (!summary) return;

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

/**
 * Parse testimonials/columns section.
 * Spanish source: `card-background-white` without `.ps-text-only-card`
 * Output: Columns block (2-col with quote + attribution)
 */
function parseColumns(element, { document }) {
  // Find testimonial items — each contains a quote paragraph + attribution
  const items = Array.from(element.querySelectorAll(
    '.ps-text-only-card, [class*="testimonial"], [class*="card-content"]'
  ));

  // Fallback: look for child divs containing quotes (paragraphs with quotes)
  let testimonials = items;
  if (testimonials.length === 0) {
    const container = element.querySelector('.card-container, [class*="card-container"]') || element;
    testimonials = Array.from(container.children).filter((el) => {
      const text = el.textContent || '';
      return text.includes('"') || text.includes('“') || text.includes('”');
    });
  }

  // Build single-row columns block: each testimonial is one column cell
  const row = [];
  testimonials.forEach((item) => {
    const cellContent = [];
    const paras = item.querySelectorAll('p');
    if (paras.length === 0) {
      // Try using the whole text content
      const p = document.createElement('p');
      p.textContent = item.textContent.trim();
      cellContent.push(p);
    } else {
      paras.forEach((para) => {
        const p = document.createElement('p');
        p.innerHTML = para.innerHTML;
        cellContent.push(p);
      });
    }
    row.push(cellContent);
  });

  if (row.length > 0) {
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: 'Columns', cells });
    element.replaceWith(block);
  }
}

// --- VARIANT DETECTION ---

/**
 * Determine the cards variant from an element's content.
 * Returns: 'icons' | 'separator' | 'bg-image'
 */
function detectCardsVariant(el) {
  const images = el.querySelectorAll('img');
  const headings = el.querySelectorAll('h3, h4');

  if (images.length === 0) return 'bg-image';

  let iconCount = 0;
  let photoCount = 0;
  images.forEach((img) => {
    const w = parseInt(img.getAttribute('width') || '0', 10);
    const h = parseInt(img.getAttribute('height') || '0', 10);
    const src = (img.src || img.getAttribute('src') || '').toLowerCase();
    const isIcon = (w > 0 && w <= 100) || (h > 0 && h <= 100)
      || src.includes('64x64') || src.includes('icon') || src.includes('sprite')
      || src.includes('gradient-64') || src.includes('-64x');
    if (isIcon) iconCount++;
    else photoCount++;
  });

  if (iconCount >= headings.length) return 'icons';
  if (photoCount >= headings.length) return 'separator';
  if (images.length >= 2) return 'separator';
  return 'separator';
}

/**
 * Detect whether a section contains testimonials/quotes (for columns variant).
 */
function isTestimonialsSection(el) {
  const text = el.textContent || '';
  const cls = el.className || '';
  // Spanish: "Escuche a nuestros clientes" or contains quotation marks in child cards
  if (text.includes('Escuche a nuestros clientes') || text.includes('Hear from our customers')) {
    return true;
  }
  // Check for card-background-white without .ps-text-only-card — testimonial pattern in Spanish
  if (cls.includes('card-background-white') && !cls.includes('promo') && !cls.includes('small-promo')) {
    const quotes = el.querySelectorAll('p');
    let quoteCount = 0;
    quotes.forEach((p) => {
      const t = p.textContent || '';
      if (t.startsWith('"') || t.startsWith('“')) quoteCount++;
    });
    if (quoteCount >= 2) return true;
  }
  return false;
}

// --- SECTION STYLE DETECTION ---

function detectSectionStyle(el) {
  const cls = el.className || '';
  const styles = [];
  if (cls.includes('card-background-gray') || cls.includes('background-gray')) styles.push('light');
  if (cls.includes('text-aligned-center')) styles.push('center-align');
  if (el.querySelector && el.querySelector('.ps-mid-page-title-top-line, .ps-mid-page-title-wrapper')) styles.push('heading-bar');
  return styles.length > 0 ? styles.join(', ') : null;
}

// --- FRAGMENT PATTERNS ---
// Paths are relative — prefix is added dynamically based on URL locale

function getFragmentPatterns(url) {
  const prefix = (url && url.includes('/es/')) ? '/es' : '';
  return [
    { match: 'Hable con un consultor hipotecario', path: prefix + '/fragments/mortgage/talk-to-mortgage-consultant' },
    { match: 'Talk to a mortgage consultant', path: prefix + '/fragments/mortgage/talk-to-mortgage-consultant' },
    { match: 'Explore el centro de aprendizaje', path: prefix + '/fragments/mortgage/explore-learning-center' },
    { match: 'Explore the mortgage learning center', path: prefix + '/fragments/mortgage/explore-learning-center' },
    { match: 'How can we help', path: prefix + '/fragments/help-cta-default' },
    { match: 'Cómo podemos ayudar', path: prefix + '/fragments/help-cta-default' },
  ];
}

// --- MAIN TRANSFORM ---

/**
 * Phase 1: Run parsers on the DOM in-place.
 * Uses deduplication via `processed` set to prevent double-processing
 * of nested `.small-promo-combined` containers.
 */
function runParsers(main, document, url, params) {
  const processed = new Set();

  // LEARNING NAVIGATION: Detect FIRST sub-nav with /mortgage/learn/ links
  // Block structure: Row 1 = hero image, Row 2 = <ul> with nav links
  let learningNavProcessed = false;
  main.querySelectorAll('nav').forEach((nav) => {
    if (processed.has(nav) || learningNavProcessed) return;
    const links = nav.querySelectorAll('a');
    const learnLinks = Array.from(links).filter((a) => {
      const href = a.getAttribute('href') || '';
      return href.includes('/mortgage/learn') || href.includes('/es/mortgage/learn');
    });
    if (learnLinks.length >= 3) {
      processed.add(nav);
      learningNavProcessed = true;

      // Row 1: Find hero image (preceding picture/img before this nav)
      let heroImg = null;
      let prevEl = nav.previousElementSibling;
      while (prevEl) {
        const img = prevEl.querySelector('picture') || prevEl.querySelector('img');
        if (img) { heroImg = img.closest('picture') || img; break; }
        prevEl = prevEl.previousElementSibling;
      }

      // Row 2: Build <ul> with nav links
      const ul = document.createElement('ul');
      learnLinks.forEach((a) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.setAttribute('href', a.getAttribute('href') || '');
        link.textContent = a.textContent.trim();
        li.appendChild(link);
        ul.appendChild(li);
      });

      const cells = [];
      if (heroImg) {
        cells.push([[heroImg.cloneNode(true)]]);
        // Remove original image element from DOM
        const imgParent = heroImg.closest('p') || heroImg.parentElement;
        if (imgParent && imgParent !== main) imgParent.remove();
      }
      cells.push([[ul]]);

      const block = WebImporter.Blocks.createBlock(document, { name: 'Learning Navigation', cells });
      nav.replaceWith(block);

      // Remove any duplicate navs with same links
      main.querySelectorAll('nav').forEach((dupNav) => {
        const dupLinks = Array.from(dupNav.querySelectorAll('a')).filter((a) => {
          const href = a.getAttribute('href') || '';
          return href.includes('/mortgage/learn') || href.includes('/es/mortgage/learn');
        });
        if (dupLinks.length >= 3) {
          processed.add(dupNav);
          dupNav.remove();
        }
      });
    }
  });

  // TABS: Detect tabbed interfaces before cards/fragments (so panels aren't consumed as Cards)
  parseTabsShared(main, { document, url, params });

  // FRAGMENTS: Detect shared content patterns FIRST
  const fragmentPatterns = getFragmentPatterns(url);
  main.querySelectorAll(':scope > div, :scope > [class*="card-background"]').forEach((el) => {
    if (processed.has(el)) return;
    const h2 = el.querySelector('h2');
    if (!h2) return;
    const headingText = h2.textContent.trim();
    const fragmentMatch = fragmentPatterns.find((p) => headingText.includes(p.match));
    if (fragmentMatch) {
      processed.add(el);
      const block = WebImporter.Blocks.createBlock(document, {
        name: 'Fragment',
        cells: [[[fragmentMatch.path]]],
      });
      el.replaceWith(block);
    }
  });

  // HERO: marquee/promo containers with images
  let heroCount = 0;
  main.querySelectorAll('.rsk-marquee-container, .marquee-container, .ps-large-promo-full-container').forEach((el) => {
    if (processed.has(el)) return;
    const hasImg = el.querySelector('img, picture');
    const hasHeading = el.querySelector('h1, h2');
    const h3Count = el.querySelectorAll('h3').length;
    if (hasImg && hasHeading && h3Count <= 1) {
      processed.add(el);
      heroCount += 1;
      try { parseHero(el, { document, isFirstHero: heroCount === 1 }); } catch (e) { /* keep as-is */ }
    }
  });

  // HERO (content-based): large landscape image pattern
  main.querySelectorAll(':scope > div').forEach((el) => {
    if (processed.has(el)) return;
    const img = el.querySelector('img, picture img');
    if (!img) return;
    const src = (img.src || img.getAttribute('src') || '').toLowerCase();
    const isLargeHeroImage = src.includes('1600x') || src.includes('1700x')
      || src.includes('lpromo') || src.includes('marquee');
    if (!isLargeHeroImage) return;
    const hasH2 = el.querySelector('h2');
    const h3Count = el.querySelectorAll('h3').length;
    if (hasH2 && h3Count <= 1) {
      processed.add(el);
      heroCount += 1;
      try { parseHero(el, { document, isFirstHero: heroCount === 1 }); } catch (e) { /* keep as-is */ }
    }
  });

  // VIDEO: detect sections with <video> elements
  main.querySelectorAll(':scope > div, :scope > [class*="enhanced-txt"]').forEach((el) => {
    if (processed.has(el)) return;
    const video = el.querySelector('video');
    if (!video) return;
    processed.add(el);
    // Also mark the transcript <details> inside as processed so accordion parser skips it
    el.querySelectorAll('details').forEach((d) => processed.add(d));
    try { parseVideo(el, { document }); } catch (e) { /* keep as-is */ }
  });

  // ACCORDION: group consecutive <details> siblings (skip processed ones from video)
  const accordionItems = Array.from(main.querySelectorAll('details.show-hide-content-wrapper')).filter(d => !processed.has(d));
  if (accordionItems.length > 0) {
    const parent = accordionItems[0].parentElement;
    if (parent === main) {
      const wrapper = document.createElement('div');
      wrapper.className = '__accordion-group';
      accordionItems[0].before(wrapper);
      accordionItems.forEach((item) => { processed.add(item); wrapper.appendChild(item); });
      processed.add(wrapper);
      try { parseAccordion(wrapper, { document }); } catch (e) { /* keep as-is */ }
    } else if (!processed.has(parent)) {
      processed.add(parent);
      try { parseAccordion(parent, { document }); } catch (e) { /* keep as-is */ }
    }
  }

  // TESTIMONIALS / COLUMNS: Detect BEFORE cards to avoid cards parser swallowing them
  main.querySelectorAll(':scope > div, :scope > [class*="card-background"]').forEach((el) => {
    if (processed.has(el)) return;
    if (isTestimonialsSection(el)) {
      processed.add(el);

      // Extract section heading before replacing
      const sectionH2 = el.querySelector(':scope > .ps-mid-page-title-wrapper h2, :scope > h2, :scope > div > h2');
      const sectionStyle = detectSectionStyle(el);
      if (sectionH2 || sectionStyle) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-section-style', sectionStyle || 'center-align');
        if (sectionH2) {
          const h2 = document.createElement('h2');
          h2.textContent = sectionH2.textContent.trim();
          wrapper.appendChild(h2);
        }
        el.before(wrapper);
      }

      try { parseColumns(el, { document }); } catch (e) { /* keep as-is */ }
    }
  });

  // CARDS: Detect and choose variant using heuristics
  // CRITICAL: Process only OUTERMOST matching containers to avoid double-processing.
  // Spanish DOM nests `.small-promo-combined` > `.ps-marketing-small-promo-items` >
  // `.ps-marketing-small-promo-item`. We must only process the outermost container.
  const cardCandidates = main.querySelectorAll(
    '.small-promo-combined, [class*="card-background"]:has(.card-container), .ps-marketing-small-promo-items'
  );

  cardCandidates.forEach((el) => {
    if (processed.has(el)) return;

    // DEDUP: Skip if this element is INSIDE an already-processed container
    let ancestor = el.parentElement;
    let isNested = false;
    while (ancestor && ancestor !== main) {
      if (processed.has(ancestor)) {
        isNested = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (isNested) return;

    const headings = el.querySelectorAll('h3, h4');
    if (headings.length < 2) return;

    processed.add(el);
    // Also mark all child containers as processed to prevent re-entry
    el.querySelectorAll('.small-promo-combined, .ps-marketing-small-promo-items').forEach((child) => {
      processed.add(child);
    });

    const variant = detectCardsVariant(el);

    // Extract section h2 heading before parser replaces the element
    const sectionH2 = el.querySelector(
      ':scope > .ps-mid-page-title-wrapper h2, :scope > h2, :scope > div > h2.ps-mid-page-title, :scope > div > h2'
    );
    const sectionStyle = detectSectionStyle(el);
    if (sectionH2 || sectionStyle) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-section-style', sectionStyle || 'center-align');
      if (sectionH2) {
        const h2 = document.createElement('h2');
        h2.textContent = sectionH2.textContent.trim();
        wrapper.appendChild(h2);
      }
      el.before(wrapper);
    }

    // Use appropriate parser
    if (variant === 'bg-image') {
      try { parseCardsNoImage(el, { document }); } catch (e) { /* keep */ }
    } else if (variant === 'icons') {
      try { parseCardsIcons(el, { document }); } catch (e) { /* keep */ }
    } else {
      try { parseCardsSeparator(el, { document }); } catch (e) { /* keep */ }
    }
  });

  // FOOTNOTES: Extract cids for page metadata
  const footnoteEl = main.querySelector('.ps-footnote');
  if (footnoteEl && !processed.has(footnoteEl)) {
    processed.add(footnoteEl);
    const cids = [];
    let pageid = '';
    footnoteEl.querySelectorAll('[data-cid]').forEach((item) => {
      const cid = item.getAttribute('data-cid');
      if (cid) cids.push(cid);
    });
    if (cids.length === 0) {
      footnoteEl.querySelectorAll(':scope > p, :scope > div').forEach((item) => {
        const cidLink = item.querySelector('a[href*="tcm:"]');
        if (cidLink) {
          const href = cidLink.getAttribute('href') || '';
          const cid = href.replace('#', '');
          if (cid) cids.push(cid);
        }
      });
    }
    // Also look for tcm: references in data-footnote attributes on the page
    if (cids.length === 0) {
      main.querySelectorAll('[data-footnote]').forEach((item) => {
        const cid = item.getAttribute('data-footnote');
        if (cid && !cids.includes(cid)) cids.push(cid);
      });
    }
    const allText = footnoteEl.textContent;
    const dtMatch = allText.match(/(DT\d+-\d+-\d+-\d+-[\d.]+)/);
    if (dtMatch) pageid = dtMatch[1];
    main.setAttribute('data-footnotes', cids.join(', '));
    if (pageid) main.setAttribute('data-pageid', pageid);
    footnoteEl.remove();
  }

  // Fallback: if no footnote section found, still gather footnote cids from page
  if (!main.getAttribute('data-footnotes')) {
    const cids = [];
    main.querySelectorAll('[data-footnote]').forEach((item) => {
      const cid = item.getAttribute('data-footnote');
      if (cid && !cids.includes(cid)) cids.push(cid);
    });
    if (cids.length > 0) {
      main.setAttribute('data-footnotes', cids.join(', '));
    }
  }
}

/**
 * Phase 2: Walk the transformed DOM and build sections.
 * Groups content into logical sections with section-metadata.
 */
function buildSections(main, document) {
  const children = Array.from(main.children).filter((el) => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return false;
    if (!el.textContent.trim() && !el.querySelector('img, picture, table') && !(el.className || '').includes('divider')) return false;
    return true;
  });

  function getStyle(el) {
    const cls = el.className || '';
    const styles = [];
    if (cls.includes('card-background-gray') || cls.includes('background-gray')) styles.push('light');
    if (cls.includes('text-aligned-center')) styles.push('center-align');
    if (el.querySelector && el.querySelector('.ps-mid-page-title-top-line, .ps-mid-page-title-wrapper')) styles.push('heading-bar');
    if (el.querySelector && el.querySelector('[class*="accordion"], details')) styles.push('narrow-width');
    return styles.length > 0 ? styles.join(', ') : null;
  }

  const sections = [];
  let current = { els: [], style: null };

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const cls = el.className || '';

    // Divider handling
    if (cls.includes('divider') && !cls.includes('__accordion')) {
      if (cls.includes('desktop-hidden')) continue;
      if (current.els.length > 0) sections.push(current);
      const divBlock = WebImporter.Blocks.createBlock(document, { name: 'Divider', cells: [] });
      current = { els: [divBlock], style: null };
      continue;
    }

    // Grouping: CTA links after blocks stay in same section
    if (sections.length > 0) {
      const prevSection = sections[sections.length - 1];
      if (prevSection.els.length > 0) {
        const text = (el.textContent || '').trim();
        if (el.children && el.children.length <= 2) {
          const links = el.querySelectorAll('a');
          if (links.length === 1 && text.length < 100) {
            const prevHasBlock = prevSection.els.some((e) =>
              (e.className || '').includes('accordion') || (e.className || '').includes('cards') || e.tagName === 'TABLE'
            );
            if (prevHasBlock) {
              prevSection.els.push(el);
              continue;
            }
          }
        }
        if (text.match(/^(more|review|see all|learn more|view all|más|obtenga más|vea más)/i) && el.querySelector('a')) {
          prevSection.els.push(el);
          continue;
        }
      }
    }

    // data-section-style wrapper: contains h2 heading + style for the next block
    if (el.hasAttribute && el.hasAttribute('data-section-style')) {
      if (current.els.length > 0) sections.push(current);
      const style = el.getAttribute('data-section-style') || null;
      current = { els: [], style };
      Array.from(el.children).forEach((child) => current.els.push(child));
      continue;
    }

    // Heading-only wrapper
    if (el.querySelector && el.querySelector('.ps-mid-page-title') && !el.querySelector('table, .card-container, details, .enhanced-txt-cm')) {
      if (current.els.length > 0) sections.push(current);
      const heading = el.querySelector('h2, .ps-mid-page-title');
      const style = getStyle(el);
      current = { els: [], style };
      if (heading) {
        const h2 = document.createElement('h2');
        h2.textContent = heading.textContent.trim();
        current.els.push(h2);
      }
      continue;
    }

    // Section boundary: containers with background classes
    const isSectionBoundary = cls.includes('card-background-')
      || (cls.includes('enhanced-txt-cm') && current.els.length > 0);
    if (isSectionBoundary) {
      if (current.els.length > 0) sections.push(current);
      const style = getStyle(el);
      current = { els: [], style };
    }

    // Default: add to current section
    const style = getStyle(el);
    if (!isSectionBoundary && style && !current.style) current.style = style;
    current.els.push(el);

    // After a block table, start a new section
    const isBlock = el.tagName === 'TABLE' || (cls.includes('block') && !cls.includes('card-background'));
    if (isBlock) {
      sections.push(current);
      current = { els: [], style: null };
    }
  }

  if (current.els.length > 0) sections.push(current);

  // Merge H1-only sections with the following section
  for (let i = sections.length - 2; i >= 0; i--) {
    const sec = sections[i];
    const isH1Only = sec.els.length === 1 && sec.els[0] && sec.els[0].tagName === 'H1';
    if (isH1Only && sections[i + 1]) {
      const nextFirst = sections[i + 1].els[0];
      const nextIsBlock = nextFirst && nextFirst.tagName === 'TABLE';
      if (!nextIsBlock) {
        sections[i + 1].els.unshift(sec.els[0]);
        if (sec.style && !sections[i + 1].style) sections[i + 1].style = sec.style;
        sections.splice(i, 1);
      }
    }
  }

  // Enrich section styles
  sections.forEach((section) => {
    const hasAccordion = section.els.some((el) => {
      const cls = el.className || '';
      if (cls.includes('accordion')) return true;
      if (el.tagName === 'TABLE') {
        const firstCell = el.querySelector('th, td');
        if (firstCell && firstCell.textContent.toLowerCase().includes('accordion')) return true;
      }
      return false;
    });
    if (hasAccordion) {
      const existing = section.style || '';
      if (!existing.includes('heading-bar')) {
        section.style = existing ? existing + ', heading-bar' : 'center-align, heading-bar';
      }
    }
  });

  // Render: clear main, insert sections with hrs and section-metadata
  while (main.firstChild) main.removeChild(main.firstChild);

  sections.forEach((section, i) => {
    if (section.els.length === 0) return;
    if (i > 0) main.appendChild(document.createElement('hr'));
    section.els.forEach((el) => main.appendChild(el));

    if (section.style) {
      const metaCells = [[['style'], [section.style]]];
      const metaBlock = WebImporter.Blocks.createBlock(document, { name: 'Section Metadata', cells: metaCells });
      main.appendChild(metaBlock);
    }
  });
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('main') || document.body;

    // Phase 0: Clean up non-content (nav, footer, modals, tag mappings)
    wellsfargoCleanup('beforeTransform', main, payload);
    wellsfargoCleanup('afterTransform', main, payload);

    // Convert footnote reference links to superscript numbers
    main.querySelectorAll('a').forEach((a) => {
      const text = a.textContent || '';
      if (!text.includes('footnote') && !text.includes('modal')) return;
      const match = text.match(/(\d+)\s*$/);
      if (!match) return;
      const num = match[1];
      const href = a.getAttribute('href') || a.href || '#';
      const sup = a.querySelector('sup');
      if (sup) {
        const newSup = document.createElement('sup');
        const newA = document.createElement('a');
        newA.setAttribute('href', href);
        newA.textContent = num;
        newSup.appendChild(newA);
        a.replaceWith(newSup);
      } else {
        a.textContent = num;
      }
    });

    // Convert absolute wellsfargo.com links to relative paths
    main.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('https://www.wellsfargo.com/')) {
        a.setAttribute('href', href.replace('https://www.wellsfargo.com', ''));
      }
    });

    // Phase 1: Run block parsers with variant heuristics
    runParsers(main, document, url, params);

    // Phase 2: Build sections with grouping rules
    buildSections(main, document);

    // Phase 3: Add page metadata
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);

    // Add footnotes and pageid to metadata block
    const footnoteCids = main.getAttribute('data-footnotes');
    const footnotePageid = main.getAttribute('data-pageid');
    if (footnoteCids || footnotePageid) {
      const metaTable = main.querySelector('table:last-of-type');
      if (metaTable) {
        const tbody = metaTable.querySelector('tbody') || metaTable;
        if (footnoteCids) {
          const row = document.createElement('tr');
          row.innerHTML = `<td>footnotes</td><td>${footnoteCids}</td>`;
          tbody.appendChild(row);
        }
        if (footnotePageid) {
          const row = document.createElement('tr');
          row.innerHTML = `<td>pageid</td><td>${footnotePageid}</td>`;
          tbody.appendChild(row);
        }
      }
    }
    main.removeAttribute('data-footnotes');
    main.removeAttribute('data-pageid');

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
        template: 'es-product-landing',
      },
    }];
  },
};
