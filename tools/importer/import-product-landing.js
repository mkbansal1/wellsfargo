/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroPromoParser from './parsers/hero-promo.js';
import cardsFeatureParser from './parsers/cards-feature.js';
import accordionParser from './parsers/accordion.js';
import contactInfoParser from './parsers/contact-info.js';
import disclaimersParser from './parsers/disclaimers.js';

// TRANSFORMER IMPORTS
import wellsfargoCleanup from './transformers/wellsfargo-cleanup.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroPromoParser,
  'cards-with-images': cardsFeatureParser,
  'cards-no-images': contactInfoParser,
  'accordion': accordionParser,
  'disclaimers': disclaimersParser,
};

/**
 * VARIANT RULES — Heuristics for choosing the right block variant.
 */
const VARIANT_RULES = {
  // Image size threshold: below this = icon, above = photo
  ICON_MAX_SIZE: 100, // px (width or height)

  // Cards variant selection based on image analysis
  getCardsVariant(el) {
    const images = el.querySelectorAll('img');
    const headings = el.querySelectorAll('h3, h4');
    if (images.length === 0) return 'Cards';

    // Check if images are icons (small, typically 64x64 or similar)
    let iconCount = 0;
    let photoCount = 0;
    images.forEach((img) => {
      const w = parseInt(img.getAttribute('width') || '0', 10);
      const h = parseInt(img.getAttribute('height') || '0', 10);
      // Also check src for common icon patterns
      const src = (img.src || img.getAttribute('src') || '').toLowerCase();
      const isIcon = (w > 0 && w <= this.ICON_MAX_SIZE) || (h > 0 && h <= this.ICON_MAX_SIZE)
        || src.includes('64x64') || src.includes('icon') || src.includes('sprite')
        || src.includes('gradient-64') || src.includes('-64x');
      if (isIcon) iconCount++;
      else photoCount++;
    });

    if (iconCount >= headings.length) return 'Cards (icons, bg-image)';
    if (photoCount >= headings.length) return 'Cards (separator)';
    if (images.length >= 2) return 'Cards (separator)';
    return 'Cards';
  },

  // Hero variant: overlay-bottom if no large background image
  getHeroVariant(el) {
    const img = el.querySelector('img, picture img');
    if (!img) return 'Hero (overlay-bottom)';

    const src = (img.src || img.getAttribute('src') || '').toLowerCase();
    // Large landscape images (marquee/banner) = default hero
    if (src.includes('marquee') || src.includes('1700x') || src.includes('1600x')
      || src.includes('banner') || src.includes('lpromo')) {
      return 'Hero';
    }
    return 'Hero';
  },

  // Sections that should use narrow-width
  shouldBeNarrow(el) {
    const cls = el.className || '';
    // Accordion/FAQ sections benefit from narrow width
    if (el.querySelector('details, .show-hide-content-wrapper')) return true;
    if (cls.includes('narrow')) return true;
    return false;
  },
};

/**
 * SECTION GROUPING RULES — Determines what stays together.
 */
const GROUPING_RULES = {
  // Elements that should stay in the PREVIOUS section (not start a new one)
  shouldJoinPreviousSection(el, prevSection) {
    if (!prevSection || prevSection.els.length === 0) return false;
    const text = (el.textContent || '').trim();
    const cls = el.className || '';

    // CTA links after accordion/cards stay in same section
    // Pattern: short element with just a link, following a block
    if (el.children && el.children.length <= 2) {
      const links = el.querySelectorAll('a');
      if (links.length === 1 && text.length < 100) {
        // Check if previous section has an accordion or cards block
        const prevHasBlock = prevSection.els.some((e) =>
          (e.className || '').includes('accordion') || (e.className || '').includes('cards') || e.tagName === 'TABLE'
        );
        if (prevHasBlock) return true;
      }
    }

    // "More FAQs", "Learn more", "Review all" type CTAs
    if (text.match(/^(more|review|see all|learn more|view all)/i) && el.querySelector('a')) return true;

    return false;
  },
};

/**
 * Detect section style from source element's CSS classes.
 */
function detectSectionStyle(el) {
  const cls = el.className || '';
  const styles = [];
  if (cls.includes('card-background-gray') || cls.includes('background-gray')) styles.push('light');
  if (cls.includes('text-aligned-center')) styles.push('center-align');
  if (el.querySelector('.ps-mid-page-title-top-line, .ps-mid-page-title-wrapper')) styles.push('heading-bar');
  if (VARIANT_RULES.shouldBeNarrow(el)) styles.push('narrow-width');
  return styles.length > 0 ? styles.join(', ') : null;
}

/**
 * Phase 1: Run all parsers on the DOM in-place.
 * Uses VARIANT_RULES to select correct block variant.
 */
function runParsers(main, document, url, params) {
  const processed = new Set();

  // HERO: marquee/promo containers with images
  main.querySelectorAll('.rsk-marquee-container, .marquee-container, .ps-large-promo-full-container').forEach((el) => {
    if (processed.has(el)) return;
    const hasImg = el.querySelector('img, picture');
    const hasHeading = el.querySelector('h1, h2');
    const h3Count = el.querySelectorAll('h3').length;
    if (hasImg && hasHeading && h3Count <= 1) {
      processed.add(el);
      try { parsers['hero'](el, { document, url, params }); } catch (e) { /* keep as-is */ }
    }
  });

  // HERO (overlay-bottom): sections with h2 + description + CTA but NO image
  // Pattern: centered text block that acts as a hero without background image
  main.querySelectorAll(':scope > [class*="enhanced-txt-cm"], :scope > div:not([class*="card"]):not([class*="promo"]):not([class*="footnote"])').forEach((el) => {
    if (processed.has(el)) return;
    const hasH2 = el.querySelector('h2');
    const hasLink = el.querySelector('a[class*="btn"], a.ps-btn');
    const h3Count = el.querySelectorAll('h3').length;
    const hasImg = el.querySelector('img, picture');
    // Hero overlay-bottom: h2 + text + button-link, no image, no h3s (not cards)
    if (hasH2 && hasLink && !hasImg && h3Count === 0) {
      const textLen = (el.textContent || '').trim().length;
      if (textLen < 300) { // Short content = hero-like CTA section
        processed.add(el);
        try { parsers['hero'](el, { document, url, params }); } catch (e) { /* keep as-is */ }
      }
    }
  });

  // ACCORDION: group consecutive <details> siblings
  const accordionItems = main.querySelectorAll('details.show-hide-content-wrapper');
  if (accordionItems.length > 0) {
    const parent = accordionItems[0].parentElement;
    if (parent === main) {
      const wrapper = document.createElement('div');
      wrapper.className = '__accordion-group';
      accordionItems[0].before(wrapper);
      accordionItems.forEach((item) => { processed.add(item); wrapper.appendChild(item); });
      processed.add(wrapper);
      try { parsers['accordion'](wrapper, { document, url, params }); } catch (e) { /* keep as-is */ }
    } else if (!processed.has(parent)) {
      processed.add(parent);
      try { parsers['accordion'](parent, { document, url, params }); } catch (e) { /* keep as-is */ }
    }
  }

  // CARDS: Detect and choose variant using heuristics
  main.querySelectorAll('.small-promo-combined, [class*="card-background"]:has(.card-container), .ps-marketing-small-promo-items').forEach((el) => {
    if (processed.has(el)) return;
    const headings = el.querySelectorAll('h3, h4');
    if (headings.length < 2) return;

    processed.add(el);
    const variant = VARIANT_RULES.getCardsVariant(el);

    // Preserve section h2 heading before parser replaces the element
    const sectionH2 = el.querySelector(':scope > .ps-mid-page-title-wrapper h2, :scope > h2, :scope > div > h2.ps-mid-page-title');
    const sectionStyle = detectSectionStyle(el);
    if (sectionH2 || sectionStyle) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-section-style', sectionStyle || '');
      if (sectionH2) {
        const h2 = document.createElement('h2');
        h2.textContent = sectionH2.textContent.trim();
        wrapper.appendChild(h2);
      }
      el.before(wrapper);
    }

    // Use appropriate parser based on variant
    if (variant === 'Cards') {
      try { parsers['cards-no-images'](el, { document, url, params }); } catch (e) { /* keep */ }
    } else {
      try { parsers['cards-with-images'](el, { document, url, params }); } catch (e) { /* keep */ }
    }
  });

  // FRAGMENTS: Detect known shared content patterns and replace with Fragment block
  const FRAGMENT_PATTERNS = [
    { match: 'Talk to a mortgage consultant', path: '/fragments/mortgage/talk-to-mortgage-consultant' },
    { match: 'How can we help', path: '/fragments/help-cta-default' },
  ];

  main.querySelectorAll(':scope > div, :scope > [class*="card-background"]').forEach((el) => {
    if (processed.has(el)) return;
    const h2 = el.querySelector('h2');
    if (!h2) return;
    const headingText = h2.textContent.trim();
    const fragmentMatch = FRAGMENT_PATTERNS.find((p) => headingText.includes(p.match));
    if (fragmentMatch) {
      processed.add(el);
      const block = WebImporter.Blocks.createBlock(document, {
        name: 'Fragment',
        cells: [[[fragmentMatch.path]]],
      });
      el.replaceWith(block);
    }
  });

  // FOOTNOTES: Extract cids for page metadata instead of inline rendering
  const footnoteEl = main.querySelector('.ps-footnote');
  if (footnoteEl && !processed.has(footnoteEl)) {
    processed.add(footnoteEl);
    // Extract footnote cids and pageid
    const cids = [];
    let pageid = '';
    footnoteEl.querySelectorAll('[data-cid]').forEach((item) => {
      const cid = item.getAttribute('data-cid');
      if (cid) cids.push(cid);
    });
    // Fallback: extract from numbered items if no data-cid
    if (cids.length === 0) {
      footnoteEl.querySelectorAll(':scope > p, :scope > div').forEach((item) => {
        const numEl = item.querySelector('[class*="footnote-number"], :scope > span:first-child');
        if (numEl) {
          const cidLink = item.querySelector('a[href*="tcm:"]');
          if (cidLink) {
            const href = cidLink.getAttribute('href') || '';
            const cid = href.replace('#', '');
            if (cid) cids.push(cid);
          }
        }
      });
    }
    // Find pageid (DT... pattern)
    const allText = footnoteEl.textContent;
    const dtMatch = allText.match(/(DT\d+-\d+-\d+-\d+-[\d.]+)/);
    if (dtMatch) pageid = dtMatch[1];
    // Store for metadata (used in Phase 3)
    main.setAttribute('data-footnotes', cids.join(', '));
    if (pageid) main.setAttribute('data-pageid', pageid);
    // Remove the footnote section from DOM
    footnoteEl.remove();
  }
}

/**
 * Phase 2: Walk the transformed DOM and build sections.
 * Uses GROUPING_RULES to decide what belongs together.
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
    // Check if section contains accordion — add narrow-width
    if (el.querySelector && el.querySelector('[class*="accordion"], details')) styles.push('narrow-width');
    return styles.length > 0 ? styles.join(', ') : null;
  }

  const sections = [];
  let current = { els: [], style: null };

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const cls = el.className || '';

    // Divider: own section
    if (cls.includes('divider') && !cls.includes('__accordion')) {
      if (current.els.length > 0) sections.push(current);
      const divBlock = WebImporter.Blocks.createBlock(document, { name: 'Divider', cells: [] });
      sections.push({ els: [divBlock], style: null });
      current = { els: [], style: null };
      continue;
    }

    // Check grouping rules: should this join the previous section?
    if (sections.length > 0 && GROUPING_RULES.shouldJoinPreviousSection(el, sections[sections.length - 1])) {
      sections[sections.length - 1].els.push(el);
      continue;
    }

    // data-section-style wrapper: contains h2 heading + style for the next block
    if (el.hasAttribute && el.hasAttribute('data-section-style')) {
      if (current.els.length > 0) sections.push(current);
      const style = el.getAttribute('data-section-style') || null;
      current = { els: [], style };
      Array.from(el.children).forEach((child) => current.els.push(child));
      continue;
    }

    // Heading-only wrapper (ps-mid-page-title-wrapper without block content)
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

    // Check for data-section-style on block elements (set by parsers)
    if (el.hasAttribute && el.hasAttribute('data-section-style')) {
      const blockStyle = el.getAttribute('data-section-style');
      if (blockStyle && !current.style) current.style = blockStyle;
      else if (blockStyle) current.style = current.style + ', ' + blockStyle;
    }

    // Default: add to current section
    const style = getStyle(el);
    if (style && !current.style) current.style = style;
    current.els.push(el);

    // After a block table, start a new section
    // BUT: keep H1 together with the first block (they belong in same section)
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
      sections[i + 1].els.unshift(sec.els[0]);
      if (sec.style && !sections[i + 1].style) sections[i + 1].style = sec.style;
      sections.splice(i, 1);
    }
  }

  // Render: clear main, insert sections with hrs and section-metadata
  while (main.firstChild) main.removeChild(main.firstChild);

  // Enrich section styles before rendering
  sections.forEach((section) => {
    const hasAccordion = section.els.some((el) => {
      const cls = el.className || '';
      if (cls.includes('accordion')) return true;
      // Check if it's a TABLE with accordion in the first cell
      if (el.tagName === 'TABLE') {
        const firstCell = el.querySelector('th, td');
        if (firstCell && firstCell.textContent.toLowerCase().includes('accordion')) return true;
      }
      return false;
    });
    if (hasAccordion) {
      section.style = section.style ? section.style + ', narrow-width' : 'narrow-width';
    }
  });

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

    // Phase 0: Clean up non-content (nav, footer, modals)
    wellsfargoCleanup('beforeTransform', main, payload);
    wellsfargoCleanup('afterTransform', main, payload);

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
        template: 'product-landing',
      },
    }];
  },
};
