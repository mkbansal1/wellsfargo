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
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
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

  if (isHomepage || hideBreadcrumb) return;

  const section = document.createElement('div');
  section.append(buildBlock('breadcrumb', { elems: [] }));
  main.prepend(section);
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main, isFragment = false) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
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
 * Wraps page content into a 70/30 split layout when a section with
 * data-align="right" exists.
 *
 * Strategy:
 *  - Find the first .section[data-align="right"] — this becomes the right column.
 *  - Collect every .section that comes after the breadcrumb-container (or from
 *    the very first .section if there is no breadcrumb) up to (but not including)
 *    the right-aligned section — these become the left column.
 *  - Wrap both columns in a .split-layout grid.
 *
 * Called after all sections have loaded so section-metadata blocks have already
 * applied their data-align attributes.
 * @param {Element} main The main element
 */
function wrapAlignedSections(main) {
  const rightSection = main.querySelector('.section[data-align="right"]');
  if (!rightSection) return;

  // Collect all direct .section children of main
  const allSections = [...main.querySelectorAll(':scope > .section')];

  // Start the left column after the breadcrumb (if present), otherwise from index 0
  const breadcrumbIdx = allSections.findIndex((s) => s.classList.contains('breadcrumb-container'));
  const startIdx = breadcrumbIdx >= 0 ? breadcrumbIdx + 1 : 0;

  const rightIdx = allSections.indexOf(rightSection);
  if (rightIdx < 0 || rightIdx <= startIdx) return; // nothing to wrap

  const leftSections = allSections.slice(startIdx, rightIdx);
  if (leftSections.length === 0) return;

  // Record the insertion point BEFORE any DOM moves.
  // allSections[startIdx] is still a direct child of main at this moment.
  const insertionPoint = allSections[startIdx];

  // Build wrapper
  const wrapper = document.createElement('div');
  wrapper.classList.add('split-layout');

  // Left column
  const leftCol = document.createElement('div');
  leftCol.classList.add('split-layout-left');
  leftSections.forEach((s) => leftCol.appendChild(s));

  // Right column
  const rightCol = document.createElement('div');
  rightCol.classList.add('split-layout-right');
  rightCol.appendChild(rightSection);

  wrapper.appendChild(leftCol);
  wrapper.appendChild(rightCol);

  // insertionPoint is now inside leftCol (no longer a child of main).
  // Insert wrapper before the node that is NOW at that slot in main —
  // which is whatever came after all left/right sections originally.
  // We use main.insertBefore with the node that follows the wrapper content.
  // Since leftSections + rightSection have been moved out, the next remaining
  // sibling of where they were is already detached, so we just append after breadcrumb.
  const breadcrumbSection = breadcrumbIdx >= 0 ? allSections[breadcrumbIdx] : null;
  if (breadcrumbSection && breadcrumbSection.parentNode === main) {
    breadcrumbSection.insertAdjacentElement('afterend', wrapper);
  } else {
    main.insertBefore(wrapper, main.firstChild);
  }
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
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
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

  // Group align-left / align-right section pairs into split-layout wrappers
  wrapAlignedSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  // Footnotes — only load JS if metadata exists
  const footnotesAttr = getMetadata('footnotes');
  const pageid = getMetadata('pageid');
  if (footnotesAttr || pageid) {
    const { default: buildFootnotes } = await import('./footnotes.js');
    await buildFootnotes(footnotesAttr, pageid);
  }

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
