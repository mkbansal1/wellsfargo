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
import wellsfargoSections from './transformers/wellsfargo-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-promo': heroPromoParser,
  'cards-feature': cardsFeatureParser,
  'cards-no-images': cardsFeatureParser,
  'accordion': accordionParser,
  'contact-info': contactInfoParser,
  'disclaimers': disclaimersParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'product-landing',
  description: 'Wells Fargo L1 product landing page with hero, feature cards, FAQ accordion, customer testimonials, contact info, and disclaimers',
  urls: [
    'https://www.wellsfargo.com/mortgage/',
  ],
  blocks: [
    {
      name: 'hero-promo',
      instances: ['.rsk-marquee-container'],
    },
    {
      name: 'cards-feature',
      instances: ['.small-promo-combined'],
    },
    {
      name: 'cards-no-images',
      instances: ['.card-background-white.text-aligned-center .card-container'],
    },
    {
      name: 'accordion',
      instances: ['details.show-hide-content-wrapper'],
    },
    {
      name: 'contact-info',
      instances: ['.card-background-white.text-aligned-center:has(h3)'],
    },
    {
      name: 'disclaimers',
      instances: ['.ps-footnote'],
    },
  ],
  sections: [
    {
      id: 'section-1-title',
      name: 'Page Title',
      selector: '.ps-page-title',
      style: null,
      blocks: [],
      defaultContent: ['.ps-page-title h1'],
    },
    {
      id: 'section-2-hero',
      name: 'Hero Marquee',
      selector: '.rsk-marquee-container',
      style: null,
      blocks: ['hero-promo'],
      defaultContent: [],
    },
    {
      id: 'section-3-rate-cta',
      name: 'Rate Quote CTA',
      selector: 'main >.enhanced-txt-cm.text-aligned-center:first-of-type',
      style: null,
      blocks: [],
      defaultContent: ['h3', 'p'],
    },
    {
      id: 'section-4-homebuying',
      name: 'Homebuying Cards',
      selector: 'main >.small-promo-combined:nth-of-type(1)',
      style: null,
      blocks: ['cards-feature'],
      defaultContent: [],
    },
    {
      id: 'section-5-refinancing',
      name: 'Refinancing Cards',
      selector: 'main >.small-promo-combined:nth-of-type(2)',
      style: null,
      blocks: ['cards-feature'],
      defaultContent: [],
    },
    {
      id: 'section-6-benefits',
      name: 'Get More Benefits',
      selector: 'main >.card-background-white:nth-of-type(1)',
      style: null,
      blocks: ['cards-no-images'],
      defaultContent: [],
    },
    {
      id: 'section-7-tools',
      name: 'Mortgage Tools',
      selector: 'main >.small-promo-combined:nth-of-type(3)',
      style: null,
      blocks: ['cards-feature'],
      defaultContent: [],
    },
    {
      id: 'section-8-faq',
      name: 'FAQ Accordion',
      selector: 'main >.card-background-white:nth-of-type(2)',
      style: null,
      blocks: ['accordion'],
      defaultContent: [],
    },
    {
      id: 'section-9-testimonials',
      name: 'Customer Testimonials',
      selector: 'main >.card-background-white:nth-of-type(3)',
      style: null,
      blocks: [],
      defaultContent: [],
    },
    {
      id: 'section-10-contact',
      name: 'Talk to a Consultant',
      selector: 'main >.card-background-white:nth-of-type(4)',
      style: null,
      blocks: ['contact-info'],
      defaultContent: [],
    },
    {
      id: 'section-11-quickhelp',
      name: 'Quick Help',
      selector: 'main >.enhanced-txt-cm.text-aligned-left:nth-of-type(1)',
      style: null,
      blocks: [],
      defaultContent: ['h3', 'ul'],
    },
    {
      id: 'section-12-footnotes',
      name: 'Footnotes',
      selector: '.ps-footnote',
      style: null,
      blocks: ['disclaimers'],
      defaultContent: [],
    },
  ],
};

// TRANSFORMER REGISTRY
const transformers = [
  wellsfargoCleanup,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [wellsfargoSections] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    executeTransformers('afterTransform', main, payload);

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
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
