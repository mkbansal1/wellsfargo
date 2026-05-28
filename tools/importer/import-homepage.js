/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroPromoParser from './parsers/hero-promo.js';
import cardsNavParser from './parsers/cards-nav.js';
import cardsPromoParser from './parsers/cards-promo.js';
import cardsFeatureParser from './parsers/cards-feature.js';
import fragmentParser from './parsers/fragment.js';

// TRANSFORMER IMPORTS
import wellsfargoCleanup from './transformers/wellsfargo-cleanup.js';
import wellsfargoSections from './transformers/wellsfargo-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-promo': heroPromoParser,
  'cards-nav': cardsNavParser,
  'cards-promo': cardsPromoParser,
  'cards-feature': cardsFeatureParser,
  'fragment': fragmentParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Wells Fargo consumer homepage with hero promo, product navigation, promo tile carousel, feature highlights, app promo, community columns, help-cta, and disclaimers',
  urls: [
    'https://www.wellsfargo.com/',
  ],
  blocks: [
    {
      name: 'hero-promo',
      instances: ['.marquee-container', '.ps-large-promo-full-container'],
    },
    {
      name: 'cards-nav',
      instances: ['.alt-nav-container'],
    },
    {
      name: 'cards-promo',
      instances: ['.ps-marketing-small-promo-items'],
    },
    {
      name: 'cards-feature',
      instances: [
        '.card-background-white.text-aligned-center .ps-promo-full-items',
        '.card-background-white.text-aligned-center .ps-promo-full-content',
      ],
    },
    {
      name: 'fragment',
      instances: ['.ps-native-app-container', '.contact-bar-container'],
    },
  ],
  sections: [
    {
      id: 'section-1-hero',
      name: 'Hero Marquee Banner',
      selector: '.marquee-container',
      style: null,
      blocks: ['hero-promo'],
      defaultContent: [],
    },
    {
      id: 'section-2-nav',
      name: 'Product Navigation Bar',
      selector: '.alt-nav-container',
      style: null,
      blocks: ['cards-nav'],
      defaultContent: [],
    },
    {
      id: 'section-3-promo-tiles',
      name: 'Promotional Tiles Strip',
      selector: '.ps-marketing-small-promo-items',
      style: null,
      blocks: ['cards-promo'],
      defaultContent: [],
    },
    {
      id: 'section-4-large-promo',
      name: 'Secondary Promotional Banner',
      selector: '.ps-large-promo-full-container',
      style: null,
      blocks: ['hero-promo'],
      defaultContent: [],
    },
    {
      id: 'section-5-guidance',
      name: 'Financial Guidance and Support',
      selector: 'main >.card-background-white:nth-of-type(1)',
      style: null,
      blocks: ['cards-feature'],
      defaultContent: ['.ps-mid-page-title-wrapper:nth-of-type(1)'],
    },
    {
      id: 'section-6-app',
      name: 'App Promo - Ask Fargo',
      selector: '.ps-native-app-container',
      style: 'grey',
      blocks: ['fragment'],
      defaultContent: [],
    },
    {
      id: 'section-7-community',
      name: 'Serving Our Communities',
      selector: 'main >.card-background-white:nth-of-type(2)',
      style: null,
      blocks: ['cards-feature'],
      defaultContent: ['.ps-mid-page-title-wrapper:nth-of-type(2)'],
    },
    {
      id: 'section-8-help',
      name: 'Help CTA Strip',
      selector: '.contact-bar-container',
      style: null,
      blocks: ['fragment'],
      defaultContent: [],
    },
    {
      id: 'section-9-footer',
      name: 'Footer Disclaimers',
      selector: '.ps-footer-wrapper',
      style: null,
      blocks: [],
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
