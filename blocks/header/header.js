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
  utilities.forEach(({ text, href }) => {
    const a = document.createElement('a');
    a.className = 'nav-util-link';
    a.href = href;
    a.textContent = text;
    utils.append(a);
  });

  // search icon
  const searchBtn = document.createElement('button');
  searchBtn.className = 'nav-search-btn';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.9,15.5c2.4-3.2,2.2-7.7-0.7-10.6c-3.1-3.1-8.1-3.1-11.3,0c-3.1,3.2-3.1,8.3,0,11.4c2.9,2.9,7.5,3.1,10.6,0.6c0,0.1,0,0.1,0,0.1l4.2,4.2c0.5,0.4,1.1,0.4,1.5,0c0.4-0.4,0.4-1,0-1.4L16.9,15.5C16.9,15.5,16.9,15.5,16.9,15.5L16.9,15.5z M14.8,6.3c2.3,2.3,2.3,6.1,0,8.5c-2.3,2.3-6.1,2.3-8.5,0C4,12.5,4,8.7,6.3,6.3C8.7,4,12.5,4,14.8,6.3z"/></svg>';
  utils.append(searchBtn);

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

function buildPrimaryNav(navLists, activeIndex = 0) {
  const primaryNav = document.createElement('div');
  primaryNav.className = 'nav-primary';

  const inner = document.createElement('div');
  inner.className = 'nav-primary-inner';

  const ul = document.createElement('ul');
  ul.className = 'nav-primary-tabs';

  navLists.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'nav-primary-tab';
    if (i === activeIndex) li.classList.add('active');

    const link = item.link.cloneNode(true);
    link.className = 'nav-primary-link';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      ul.querySelectorAll('.nav-primary-tab').forEach((tab) => tab.classList.remove('active'));
      li.classList.add('active');
      const subNav = primaryNav.closest('nav').querySelector('.nav-sub');
      if (subNav) {
        buildSubNavContent(subNav, item.children);
      }
    });
    li.append(link);
    ul.append(li);
  });

  inner.append(ul);
  primaryNav.append(inner);
  return primaryNav;
}

function buildSubNav(navLists, activeIndex = 0) {
  const subNav = document.createElement('div');
  subNav.className = 'nav-sub';
  if (navLists[activeIndex] && navLists[activeIndex].children.length > 0) {
    buildSubNavContent(subNav, navLists[activeIndex].children);
  }
  return subNav;
}

function buildMobileNav(navLists, signinText, signinHref) {
  const mobileNav = document.createElement('div');
  mobileNav.className = 'nav-mobile-menu';
  mobileNav.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'nav-mobile-content';

  // mobile header: Sign On + Close
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'nav-mobile-header';
  mobileHeader.innerHTML = `
    <a href="${signinHref}" class="nav-mobile-signon">${signinText}</a>
    <button class="nav-mobile-close" aria-label="Close navigation">
      <span class="nav-mobile-close-icon"></span>
      <span class="nav-mobile-close-text">CLOSE</span>
    </button>
  `;
  content.append(mobileHeader);

  // search bar
  const searchBar = document.createElement('div');
  searchBar.className = 'nav-mobile-search';
  searchBar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.9,15.5c2.4-3.2,2.2-7.7-0.7-10.6c-3.1-3.1-8.1-3.1-11.3,0c-3.1,3.2-3.1,8.3,0,11.4c2.9,2.9,7.5,3.1,10.6,0.6c0,0.1,0,0.1,0,0.1l4.2,4.2c0.5,0.4,1.1,0.4,1.5,0c0.4-0.4,0.4-1,0-1.4L16.9,15.5C16.9,15.5,16.9,15.5,16.9,15.5L16.9,15.5z M14.8,6.3c2.3,2.3,2.3,6.1,0,8.5c-2.3,2.3-6.1,2.3-8.5,0C4,12.5,4,8.7,6.3,6.3C8.7,4,12.5,4,14.8,6.3z"/></svg><span>Search</span>';
  content.append(searchBar);

  // nav sections — first one open by default
  navLists.forEach((item, i) => {
    const section = document.createElement('div');
    section.className = 'nav-mobile-section';
    if (i === 0) section.classList.add('active');

    const header = document.createElement('button');
    header.className = 'nav-mobile-section-header';
    header.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
    header.textContent = item.link.textContent;
    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      content.querySelectorAll('.nav-mobile-section').forEach((s) => {
        s.classList.remove('active');
        s.querySelector('.nav-mobile-section-header')?.setAttribute('aria-expanded', 'false');
      });
      if (!expanded) {
        section.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    });

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
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
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

  // build primary nav tabs
  const primaryNav = buildPrimaryNav(navLists, 0);
  nav.append(primaryNav);

  // build sub-nav for active tab
  const subNav = buildSubNav(navLists, 0);
  nav.append(subNav);

  // build mobile menu
  const mobileMenu = buildMobileNav(navLists, signinText, signinHref);
  nav.append(mobileMenu);

  // mobile close button
  const closeBtn = mobileMenu.querySelector('.nav-mobile-close');
  if (closeBtn) closeBtn.addEventListener('click', () => toggleMobileMenu(nav, false));

  // hamburger (right side on mobile, with MENU label)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
    <span class="nav-hamburger-label">MENU</span>
  </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  topBar.querySelector('.nav-top-bar-inner').append(hamburger);

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
