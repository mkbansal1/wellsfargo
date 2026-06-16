import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 1080px)');

function buildTopBar({
  utilities, logoEl, logoHref, signinText, signinHref,
}) {
  const topBar = document.createElement('div');
  topBar.className = 'nav-top-bar';

  const inner = document.createElement('div');
  inner.className = 'nav-top-bar-inner';

  // logo
  const brand = document.createElement('a');
  brand.className = 'nav-logo';
  brand.href = logoHref;
  brand.setAttribute('aria-label', 'Wells Fargo Home');
  if (logoEl) {
    brand.append(logoEl);
  } else {
    brand.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 36" fill="#fff" aria-hidden="true"><text x="0" y="28" font-family="\'Wells Fargo Sans\', serif" font-size="28" font-weight="700" letter-spacing="1">WELLS FARGO</text></svg>';
  }
  inner.append(brand);

  // utility links (from section-metadata)
  const utils = document.createElement('div');
  utils.className = 'nav-utilities';
  const isSpanishPage = window.location.pathname.includes('/es/');
  utilities.forEach(({ text, href }) => {
    if (text === 'English' && !isSpanishPage) return;
    if (text === 'Español' && isSpanishPage) return;
    const a = document.createElement('a');
    a.className = 'nav-util-link';
    a.href = href;
    a.textContent = text;
    utils.append(a);
  });

  // search icon + expandable search bar
  const searchBtn = document.createElement('button');
  searchBtn.className = 'nav-search-btn';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.9,15.5c2.4-3.2,2.2-7.7-0.7-10.6c-3.1-3.1-8.1-3.1-11.3,0c-3.1,3.2-3.1,8.3,0,11.4c2.9,2.9,7.5,3.1,10.6,0.6c0,0.1,0,0.1,0,0.1l4.2,4.2c0.5,0.4,1.1,0.4,1.5,0c0.4-0.4,0.4-1,0-1.4L16.9,15.5C16.9,15.5,16.9,15.5,16.9,15.5L16.9,15.5z M14.8,6.3c2.3,2.3,2.3,6.1,0,8.5c-2.3,2.3-6.1,2.3-8.5,0C4,12.5,4,8.7,6.3,6.3C8.7,4,12.5,4,14.8,6.3z"/></svg>';
  utils.append(searchBtn);

  const searchOverlay = document.createElement('div');
  searchOverlay.className = 'nav-search-overlay';
  searchOverlay.setAttribute('aria-hidden', 'true');
  searchOverlay.innerHTML = `<div class="nav-search-overlay-inner">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.9,15.5c2.4-3.2,2.2-7.7-0.7-10.6c-3.1-3.1-8.1-3.1-11.3,0c-3.1,3.2-3.1,8.3,0,11.4c2.9,2.9,7.5,3.1,10.6,0.6c0,0.1,0,0.1,0,0.1l4.2,4.2c0.5,0.4,1.1,0.4,1.5,0c0.4-0.4,0.4-1,0-1.4L16.9,15.5C16.9,15.5,16.9,15.5,16.9,15.5L16.9,15.5z M14.8,6.3c2.3,2.3,2.3,6.1,0,8.5c-2.3,2.3-6.1,2.3-8.5,0C4,12.5,4,8.7,6.3,6.3C8.7,4,12.5,4,14.8,6.3z"/></svg>
    <input type="text" class="nav-search-input" placeholder="Search" aria-label="Search">
    <button class="nav-search-close" aria-label="Close search">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/></svg>
    </button>
  </div>`;
  topBar.append(searchOverlay);

  searchBtn.addEventListener('click', () => {
    const isOpen = searchOverlay.getAttribute('aria-hidden') === 'false';
    searchOverlay.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    if (!isOpen) searchOverlay.querySelector('.nav-search-input').focus();
  });
  searchOverlay.querySelector('.nav-search-close').addEventListener('click', () => {
    searchOverlay.setAttribute('aria-hidden', 'true');
  });
  searchOverlay.querySelector('.nav-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) window.location.href = `https://www.wellsfargo.com/search/?q=${encodeURIComponent(query)}`;
    }
  });

  // sign on button
  const signonBtn = document.createElement('a');
  signonBtn.className = 'nav-signon-btn';
  signonBtn.href = signinHref;
  signonBtn.textContent = signinText;
  utils.append(signonBtn);

  inner.append(utils);
  topBar.append(inner);
  return topBar;
}

function buildSubNavContent(subNav, links) {
  const inner = subNav.querySelector('.nav-sub-inner') || document.createElement('div');
  inner.className = 'nav-sub-inner';
  inner.innerHTML = '';

  const ul = document.createElement('ul');
  ul.className = 'nav-sub-links';
  links.forEach((child) => {
    const li = document.createElement('li');
    const a = child.cloneNode(true);
    a.className = 'nav-sub-link';
    li.append(a);
    ul.append(li);
  });
  inner.append(ul);

  if (!subNav.contains(inner)) subNav.append(inner);
}

function getActiveNavState(navLists) {
  const currentPath = window.location.pathname;
  const normalizedCurrent = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;

  // first pass: check for exact top-level match
  for (let i = 0; i < navLists.length; i += 1) {
    try {
      const linkPath = new URL(navLists[i].link.href, window.location.origin).pathname;
      const normalizedLink = linkPath.endsWith('/') ? linkPath : `${linkPath}/`;
      if (normalizedCurrent === normalizedLink) {
        return { activeIdx: i, isTopLevel: true };
      }
    } catch { /* skip */ }
  }

  // second pass: check if current page matches a child link
  for (let i = 0; i < navLists.length; i += 1) {
    const { children } = navLists[i];
    for (let j = 0; j < children.length; j += 1) {
      try {
        const childPath = new URL(children[j].href, window.location.origin).pathname;
        const normalizedChild = childPath.endsWith('/') ? childPath : `${childPath}/`;
        if (normalizedCurrent === normalizedChild
          || (childPath !== '/' && currentPath.startsWith(childPath))) {
          return { activeIdx: i, isTopLevel: false };
        }
      } catch { /* skip */ }
    }
  }

  return { activeIdx: -1, isTopLevel: false };
}

function buildPrimaryNav(navLists, activeIndex = -1) {
  const primaryNav = document.createElement('div');
  primaryNav.className = 'nav-primary';

  const inner = document.createElement('div');
  inner.className = 'nav-primary-inner';

  const ul = document.createElement('ul');
  ul.className = 'nav-primary-tabs';

  navLists.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'nav-primary-tab';
    if (activeIndex >= 0 && i === activeIndex) li.classList.add('active');

    const link = item.link.cloneNode(true);
    link.className = 'nav-primary-link';
    li.append(link);
    ul.append(li);
  });

  inner.append(ul);
  primaryNav.append(inner);
  return primaryNav;
}

function buildSubNav(navLists, activeIndex = -1) {
  const subNav = document.createElement('div');
  subNav.className = 'nav-sub';
  if (activeIndex >= 0 && navLists[activeIndex] && navLists[activeIndex].children.length > 0) {
    buildSubNavContent(subNav, navLists[activeIndex].children);
  }
  return subNav;
}

function buildMobileNav(navLists, utilities) {
  const mobileNav = document.createElement('div');
  mobileNav.className = 'nav-mobile-menu';
  mobileNav.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'nav-mobile-content';

  // search bar with input
  const searchBar = document.createElement('div');
  searchBar.className = 'nav-mobile-search';
  searchBar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.9,15.5c2.4-3.2,2.2-7.7-0.7-10.6c-3.1-3.1-8.1-3.1-11.3,0c-3.1,3.2-3.1,8.3,0,11.4c2.9,2.9,7.5,3.1,10.6,0.6c0,0.1,0,0.1,0,0.1l4.2,4.2c0.5,0.4,1.1,0.4,1.5,0c0.4-0.4,0.4-1,0-1.4L16.9,15.5C16.9,15.5,16.9,15.5,16.9,15.5L16.9,15.5z M14.8,6.3c2.3,2.3,2.3,6.1,0,8.5c-2.3,2.3-6.1,2.3-8.5,0C4,12.5,4,8.7,6.3,6.3C8.7,4,12.5,4,14.8,6.3z"/></svg><input type="text" placeholder="Search" aria-label="Search">';
  searchBar.querySelector('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) window.location.href = `https://www.wellsfargo.com/search/?q=${encodeURIComponent(query)}`;
    }
  });
  content.append(searchBar);

  // determine which section matches the current page
  const { activeIdx } = getActiveNavState(navLists);

  // nav sections — active section determined by current page URL
  navLists.forEach((item, i) => {
    const section = document.createElement('div');
    section.className = 'nav-mobile-section';
    if (activeIdx >= 0 && i === activeIdx) section.classList.add('active');

    const header = document.createElement('a');
    header.className = 'nav-mobile-section-header';
    header.href = item.link.href || '#';
    header.textContent = item.link.textContent;

    const subList = document.createElement('ul');
    subList.className = 'nav-mobile-sub-links';
    item.children.forEach((child) => {
      const li = document.createElement('li');
      const a = child.cloneNode(true);
      li.append(a);
      subList.append(li);
    });

    section.append(header, subList);
    content.append(section);
  });

  // utility links at the bottom
  if (utilities.length > 0) {
    const utilsSection = document.createElement('div');
    utilsSection.className = 'nav-mobile-utils';
    const isSpanish = window.location.pathname.includes('/es/');
    utilities.forEach(({ text, href }) => {
      // language logic: show opposite language
      if (text === 'English' && !isSpanish) return;
      if (text === 'Español' && isSpanish) return;
      const a = document.createElement('a');
      a.className = 'nav-mobile-util-link';
      a.href = href;
      a.textContent = text;
      utilsSection.append(a);
    });
    content.append(utilsSection);
  }

  mobileNav.append(content);
  return mobileNav;
}

function parseNavContent(container) {
  const utilities = [];
  const navLists = [];
  let logoEl = null;
  let logoHref = '/';
  let signinText = 'Sign On';
  let signinHref = '#';

  // Try decorated sections first (local dev with loadFragment)
  const sections = [...container.querySelectorAll(':scope > .section')];

  if (sections.length >= 2) {
    // Section 1: logo (picture wrapped in a link)
    const logoSection = sections[0];
    const logoLink = logoSection.querySelector('a');
    if (logoLink) logoHref = logoLink.href;
    const picture = logoSection.querySelector('picture');
    if (picture) logoEl = picture.cloneNode(true);

    // Section 2: nav lists
    const navSection = sections[1];
    navSection.querySelectorAll('ul').forEach((ul) => {
      if (ul.parentElement && ul.parentElement.closest('ul')) return;
      ul.querySelectorAll(':scope > li').forEach((li) => {
        const linkEl = li.querySelector(':scope > p > a') || li.querySelector(':scope > a');
        if (!linkEl) return;
        const children = [...li.querySelectorAll(':scope > ul > li > a')];
        navLists.push({ link: linkEl, children });
      });
    });

    // Section 3: utilities — from section-metadata block or data attributes on div
    const utilSection = sections[2] || sections[0];
    if (utilSection) {
      const metaDiv = utilSection.querySelector('.section-metadata');
      if (metaDiv) {
        metaDiv.querySelectorAll(':scope > div').forEach((row) => {
          const key = row.children[0]?.textContent?.trim().toLowerCase();
          const linkEl = row.children[1]?.querySelector('a');
          const text = linkEl?.textContent?.trim() || row.children[1]?.textContent?.trim();
          const href = linkEl?.href || '';
          if (!key) return;
          if (key === 'signin') {
            signinText = text || 'Sign On';
            signinHref = href || '#';
          } else if (key !== 'languages' && href) {
            utilities.push({ text, href });
          } else if (key === 'languages') {
            // multiple language links in one cell
            row.children[1]?.querySelectorAll('a').forEach((a) => {
              utilities.push({ text: a.textContent.trim(), href: a.href });
            });
          }
        });
      } else {
        // data attributes on the div (AEM renders section-metadata as data-*)
        const dataset = utilSection.dataset || {};
        if (dataset.signin) signinHref = dataset.signin;
        if (dataset.locator) utilities.push({ text: 'ATMs/Locations', href: dataset.locator });
        if (dataset.help) utilities.push({ text: 'Help', href: dataset.help });
        if (dataset.languages) {
          const langs = dataset.languages.split(',');
          const langNames = ['English', 'Español'];
          langs.forEach((url, i) => {
            if (url.trim()) utilities.push({ text: langNames[i] || url.trim(), href: url.trim() });
          });
        }
      }
    }
  } else {
    // Fallback: raw div structure (no .section classes)
    const divs = [...container.querySelectorAll(':scope > div')];

    // Find logo div (has picture or data-logo-img-url)
    const logoDiv = divs.find((d) => d.querySelector('picture') || d.dataset?.logoImgUrl);
    if (logoDiv) {
      const logoLink = logoDiv.querySelector('a');
      if (logoLink) logoHref = logoLink.href;
      const picture = logoDiv.querySelector('picture');
      if (picture) {
        logoEl = picture.cloneNode(true);
      } else if (logoDiv.dataset?.logoImgUrl) {
        const img = document.createElement('img');
        img.src = logoDiv.dataset.logoImgUrl;
        img.alt = logoDiv.dataset.logoAlt || 'Wells Fargo';
        img.height = 23;
        logoEl = img;
      }
    }

    // Find nav div (has <ul>)
    const navDiv = divs.find((d) => d.querySelector('ul'));
    if (navDiv) {
      navDiv.querySelectorAll('ul').forEach((ul) => {
        if (ul.parentElement && ul.parentElement.closest('ul')) return;
        ul.querySelectorAll(':scope > li').forEach((li) => {
          const linkEl = li.querySelector(':scope > p > a') || li.querySelector(':scope > a');
          if (!linkEl) return;
          const children = [...li.querySelectorAll(':scope > ul > li > a')];
          navLists.push({ link: linkEl, children });
        });
      });
    }

    // Find utilities div (has data-signin, data-locator, etc.)
    const utilDiv = divs.find((d) => d.dataset?.signin || d.dataset?.locator);
    if (utilDiv) {
      const { dataset } = utilDiv;
      if (dataset.signin) signinHref = dataset.signin;
      if (dataset.locator) utilities.push({ text: 'ATMs/Locations', href: dataset.locator });
      if (dataset.help) utilities.push({ text: 'Help', href: dataset.help });
      if (dataset.languages) {
        const langs = dataset.languages.split(',');
        const langNames = ['English', 'Español'];
        langs.forEach((url, i) => {
          if (url.trim()) utilities.push({ text: langNames[i] || url.trim(), href: url.trim() });
        });
      }
    }
  }

  return {
    utilities, navLists, logoEl, logoHref, signinText, signinHref,
  };
}

function toggleMobileMenu(nav, open) {
  const mobileMenu = nav.querySelector('.nav-mobile-menu');
  const hamburger = nav.querySelector('.nav-hamburger button');
  if (!mobileMenu) return;

  const isOpen = open !== undefined ? open : mobileMenu.getAttribute('aria-hidden') === 'true';
  mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  hamburger?.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  nav.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflowY = isOpen && !isDesktop.matches ? 'hidden' : '';
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  // Locale-aware fallback: pages without a "nav" meta (e.g. error pages) use the
  // Spanish nav under /es, otherwise the default nav.
  const isSpanish = window.location.pathname.startsWith('/es/') || window.location.pathname === '/es';
  const defaultNav = isSpanish ? '/es/nav' : '/nav';
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : defaultNav;
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const {
    utilities, navLists, logoEl, logoHref, signinText, signinHref,
  } = parseNavContent(nav);

  // clear raw content
  nav.innerHTML = '';

  // build top bar (red bar with logo + utilities)
  const topBar = buildTopBar({
    utilities, logoEl, logoHref, signinText, signinHref,
  });
  nav.append(topBar);

  // build primary nav tabs (active tab determined by current page URL)
  const { activeIdx: activeNavIdx, isTopLevel } = getActiveNavState(navLists);
  const primaryNav = buildPrimaryNav(navLists, activeNavIdx);
  nav.append(primaryNav);

  // build sub-nav only when on the exact top-level nav page
  const subNavIdx = isTopLevel ? activeNavIdx : -1;
  const subNav = buildSubNav(navLists, subNavIdx);
  nav.append(subNav);

  if (subNavIdx < 0) {
    document.querySelector('header')?.classList.add('no-subnav');
  }

  // build mobile menu
  const mobileMenu = buildMobileNav(navLists, utilities);
  nav.append(mobileMenu);

  // hamburger (right side on mobile, with MENU label)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
    <span class="nav-hamburger-label">MENU</span>
  </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  topBar.querySelector('.nav-top-bar-inner').append(hamburger);

  // close button (replaces hamburger when menu is open)
  const navCloseBtn = document.createElement('div');
  navCloseBtn.className = 'nav-close';
  navCloseBtn.innerHTML = `<button type="button" aria-label="Close navigation">
    <span class="nav-close-icon"></span>
    <span class="nav-close-label">CLOSE</span>
  </button>`;
  navCloseBtn.addEventListener('click', () => toggleMobileMenu(nav, false));
  topBar.querySelector('.nav-top-bar-inner').append(navCloseBtn);

  // handle resize
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      toggleMobileMenu(nav, false);
    }
  });

  // close on escape
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') toggleMobileMenu(nav, false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
