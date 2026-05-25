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
 * Detect section style from source element's CSS classes.
 */
function detectSectionStyle(el) {
  const cls = el.className || '';
  const styles = [];
  if (cls.includes('card-background-gray') || cls.includes('background-gray')) styles.push('light');
  if (cls.includes('text-aligned-center')) styles.push('center-align');
  if (el.querySelector('.ps-mid-page-title-top-line, .ps-mid-page-title-wrapper')) styles.push('heading-bar');
  return styles.length > 0 ? styles.join(', ') : null;
}

/**
 * Phase 1: Run all parsers on the DOM in-place.
 * Parsers use element.replaceWith() so the DOM is mutated.
 */
function runParsers(main, document, url, params) {
  // HERO: marquee/promo containers
  main.querySelectorAll('.rsk-marquee-container, .marquee-container, .ps-large-promo-full-container').forEach((el) => {
    const hasImg = el.querySelector('img, picture');
    const hasHeading = el.querySelector('h1, h2');
    const h3Count = el.querySelectorAll('h3').length;
    if (hasImg && hasHeading && h3Count <= 1) {
      try { parsers['hero'](el, { document, url, params }); } catch (e) { /* keep as-is */ }
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
      accordionItems.forEach((item) => wrapper.appendChild(item));
      try { parsers['accordion'](wrapper, { document, url, params }); } catch (e) { /* keep as-is */ }
    } else {
      try { parsers['accordion'](parent, { document, url, params }); } catch (e) { /* keep as-is */ }
    }
  }

  // CARDS WITH IMAGES
  main.querySelectorAll('.small-promo-combined, [class*="card-background"]:has(.card-container)').forEach((el) => {
    const headings = el.querySelectorAll('h3, h4');
    const images = el.querySelectorAll('img');
    if (headings.length >= 2 && images.length >= 2) {
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
      try { parsers['cards-with-images'](el, { document, url, params }); } catch (e) { /* keep as-is */ }
    }
  });

  // CARDS WITHOUT IMAGES
  main.querySelectorAll('[class*="card-background"]').forEach((el) => {
    const headings = el.querySelectorAll('h3, h4');
    const images = el.querySelectorAll('img');
    if (headings.length >= 2 && images.length <= 1) {
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
      try { parsers['cards-no-images'](el, { document, url, params }); } catch (e) { /* keep as-is */ }
    }
  });

  // DISCLAIMERS
  const footnoteEl = main.querySelector('.ps-footnote');
  if (footnoteEl) {
    try { parsers['disclaimers'](footnoteEl, { document, url, params }); } catch (e) { /* keep as-is */ }
  }
}

/**
 * Phase 2: Walk the transformed DOM and build sections.
 * Groups content logically:
 * - Headings stay with the block that follows them in the same section
 * - Dividers become their own section
 * - Section metadata is detected from source CSS classes
 * - Section breaks (hr) are inserted between sections
 */
function buildSections(main, document) {
  const children = Array.from(main.children).filter((el) => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return false;
    if (!el.textContent.trim() && !el.querySelector('img, picture, table') && !(el.className || '').includes('divider')) return false;
    return true;
  });

  // Detect section styles from original class names still present
  function getStyle(el) {
    const cls = el.className || '';
    const styles = [];
    if (cls.includes('card-background-gray') || cls.includes('background-gray')) styles.push('light');
    if (cls.includes('text-aligned-center')) styles.push('center-align');
    if (el.querySelector && el.querySelector('.ps-mid-page-title-top-line, .ps-mid-page-title-wrapper')) styles.push('heading-bar');
    return styles.length > 0 ? styles.join(', ') : null;
  }

  // Group children into sections
  const sections = [];
  let current = { els: [], style: null };

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const cls = el.className || '';

    // Divider: own section
    if (cls.includes('divider') && !cls.includes('__accordion')) {
      // Flush current
      if (current.els.length > 0) sections.push(current);
      // Divider section
      const divBlock = WebImporter.Blocks.createBlock(document, { name: 'Divider', cells: [] });
      sections.push({ els: [divBlock], style: null });
      current = { els: [], style: null };
      continue;
    }

    // data-section-style wrapper: contains h2 heading + style for the next block
    if (el.hasAttribute && el.hasAttribute('data-section-style')) {
      // Flush previous section
      if (current.els.length > 0) sections.push(current);
      const style = el.getAttribute('data-section-style') || null;
      current = { els: [], style };
      // Move children (h2) into current section
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

    // Block tables (already converted by parsers) — check for preceding style
    const style = getStyle(el);
    if (style && !current.style) current.style = style;

    current.els.push(el);

    // After a block table, start a new section
    const isBlock = el.tagName === 'TABLE' || (cls.includes('block') && !cls.includes('card-background'));
    if (isBlock) {
      sections.push(current);
      current = { els: [], style: null };
    }
  }

  // Flush remaining
  if (current.els.length > 0) sections.push(current);

  // Render: clear main, insert sections with hrs and section-metadata
  while (main.firstChild) main.removeChild(main.firstChild);

  sections.forEach((section, i) => {
    if (section.els.length === 0) return;

    if (i > 0) {
      main.appendChild(document.createElement('hr'));
    }

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

    // Phase 1: Run block parsers (mutate DOM in-place)
    runParsers(main, document, url, params);

    // Phase 2: Build sections with metadata and breaks
    buildSections(main, document);

    // Phase 3: Add page metadata
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
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
