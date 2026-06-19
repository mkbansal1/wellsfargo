import {
  buildBlock,
  getMetadata,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Don't cannibalize a picture/h1 that already belongs to an authored block
    // (e.g. the Columns feature-banner marquee precedes a separate page H1).
    if (h1.closest('.hero, .columns') || picture.closest('.hero, .columns')) {
      return;
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds breadcrumb block and prepends to main.
 * Skipped on homepage and pages with hide-breadcrumb metadata.
 * @param {Element} main The container element
 */
function buildBreadcrumbBlock(main) {
  const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index';
  const hideBreadcrumb = document.head.querySelector('meta[name="hide-breadcrumb"]')?.content === 'true';

  if (isHomepage || hideBreadcrumb || window.isErrorPage) return;

  const section = document.createElement('div');
  section.append(buildBlock('breadcrumb', { elems: [] }));
  main.prepend(section);
}

/**
 * On error pages (e.g. 404), replace the main content with a locale-specific
 * error fragment. Spanish pages (path under /es) use /es/fragments/404; all
 * others use /fragments/404. See https://www.aem.live/docs/error-pages.
 * @param {Element} main The container element
 */
function loadErrorPage(main) {
  if (window.errorCode !== '404') return;
  const isEs = window.location.pathname.startsWith('/es/') || window.location.pathname === '/es';
  const fragmentPath = isEs ? '/es/fragments/404' : '/fragments/404';
  const link = document.createElement('a');
  link.href = fragmentPath;
  link.textContent = fragmentPath;
  const section = main.querySelector('.section');
  if (section) {
    section.replaceChildren(buildBlock('fragment', { elems: [link] }));
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main, isFragment = false) {
  try {
    // auto load `*/fragments/*` references, except those owned by reference-style
    // blocks (e.g. Accordion/Tabs reference variants) which load lazily themselves
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')]
      .filter((f) => !f.closest('.fragment, .accordion.reference, .tabs.reference'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    if (!isFragment) {
      buildBreadcrumbBlock(main);
    }
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main, isFragment = false) {
  decorateIcons(main);
  buildAutoBlocks(main, isFragment);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const theme = getMetadata('theme');
  if (theme) {
    loadCSS(`${window.hlx.codeBasePath}/styles/themes/${theme}.css`);
  }
  const main = doc.querySelector('main');
  if (main) {
    if (window.isErrorPage) loadErrorPage(main);
    decorateMain(main);
    document.body.classList.add('appear');
    // The LCP image usually lives in the hero, but auto-blocks (e.g. breadcrumb)
    // can be the first section. Eager-load through the first section that has an
    // image so its LCP candidate is fetched eagerly, not lazily.
    const sections = [...main.querySelectorAll('.section')];
    const lcpIndex = Math.max(0, sections.findIndex((section) => section.querySelector('img')));
    // Prioritize the LCP image: eager loading + high fetch priority.
    sections[lcpIndex]?.querySelector('img')?.setAttribute('fetchpriority', 'high');
    await Promise.all(sections.slice(0, lcpIndex + 1).map(
      (section, i) => loadSection(section, i === lcpIndex ? waitForFirstImage : undefined),
    ));
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  // Footnotes — load JS if metadata exists or any footnote superscript links are present
  const footnotesAttr = getMetadata('footnotes');
  const pageid = getMetadata('pageid');
  const hasFootnoteLinks = !!main.querySelector('a[href*="#tcm:"]');
  if (footnotesAttr || pageid || hasFootnoteLinks) {
    const { default: buildFootnotes } = await import('./footnotes.js');
    await buildFootnotes(footnotesAttr, pageid);
  }

  // Leaving-site interstitial — delegated on document, so it covers links in
  // main, header, footer, and lazily-injected fragments. The dialog is built
  // on first qualifying click.
  import('./leaving-site.js').then(({ default: initLeavingSite }) => initLeavingSite());

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
