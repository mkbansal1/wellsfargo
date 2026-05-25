import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

function buildTopBar(sectionMeta) {
  const topBar = document.createElement('div');
  topBar.className = 'nav-top-bar';

  const inner = document.createElement('div');
  inner.className = 'nav-top-bar-inner';

  // logo
  const logoLink = sectionMeta.get('logo-url') || '/';
  const brand = document.createElement('a');
  brand.className = 'nav-logo';
  brand.href = logoLink;
  brand.setAttribute('aria-label', 'Wells Fargo Home');
  brand.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 36" fill="#fff" aria-hidden="true">
    <text x="0" y="28" font-family="'Wells Fargo Sans', serif" font-size="28" font-weight="700" letter-spacing="1">WELLS FARGO</text>
  </svg>`;
  inner.append(brand);

  // utility links
  const utils = document.createElement('div');
  utils.className = 'nav-utilities';
  utils.innerHTML = `
    <a href="/locator/" class="nav-util-link">ATMs/Locations</a>
    <a href="/help/" class="nav-util-link">Help</a>
    <a href="/es/" class="nav-util-link">Español</a>
  `;

  // search
  const searchAlt = sectionMeta.get('search-alt-text') || 'Search';
  const searchBtn = document.createElement('button');
  searchBtn.className = 'nav-search-btn';
  searchBtn.setAttribute('aria-label', searchAlt);
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.9,15.5c2.4-3.2,2.2-7.7-0.7-10.6c-3.1-3.1-8.1-3.1-11.3,0c-3.1,3.2-3.1,8.3,0,11.4c2.9,2.9,7.5,3.1,10.6,0.6c0,0.1,0,0.1,0,0.1l4.2,4.2c0.5,0.4,1.1,0.4,1.5,0c0.4-0.4,0.4-1,0-1.4L16.9,15.5C16.9,15.5,16.9,15.5,16.9,15.5L16.9,15.5z M14.8,6.3c2.3,2.3,2.3,6.1,0,8.5c-2.3,2.3-6.1,2.3-8.5,0C4,12.5,4,8.7,6.3,6.3C8.7,4,12.5,4,14.8,6.3z"/></svg>';
  utils.append(searchBtn);

  // sign on button
  const signonText = sectionMeta.get('signin-text') || 'Sign On';
  const signonBtn = document.createElement('a');
  signonBtn.className = 'nav-signon-btn';
  signonBtn.href = '#';
  signonBtn.textContent = signonText;
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

function buildMobileNav(navLists) {
  const mobileNav = document.createElement('div');
  mobileNav.className = 'nav-mobile-menu';
  mobileNav.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'nav-mobile-content';

  navLists.forEach((item) => {
    const section = document.createElement('div');
    section.className = 'nav-mobile-section';

    const header = document.createElement('button');
    header.className = 'nav-mobile-section-header';
    header.setAttribute('aria-expanded', 'false');
    header.textContent = item.link.textContent;
    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      content.querySelectorAll('.nav-mobile-section-header').forEach((h) => {
        h.setAttribute('aria-expanded', 'false');
        h.nextElementSibling?.setAttribute('aria-hidden', 'true');
      });
      if (!expanded) {
        header.setAttribute('aria-expanded', 'true');
        header.nextElementSibling?.setAttribute('aria-hidden', 'false');
      }
    });

    const subList = document.createElement('ul');
    subList.className = 'nav-mobile-sub-links';
    subList.setAttribute('aria-hidden', 'true');
    item.children.forEach((child) => {
      const li = document.createElement('li');
      const a = child.cloneNode(true);
      li.append(a);
      subList.append(li);
    });

    section.append(header, subList);
    content.append(section);
  });

  // mobile utility links
  const mobileUtils = document.createElement('div');
  mobileUtils.className = 'nav-mobile-utils';
  mobileUtils.innerHTML = `
    <a href="/locator/">ATMs/Locations</a>
    <a href="/help/">Help</a>
    <a href="/es/">Español</a>
  `;
  content.append(mobileUtils);

  mobileNav.append(content);
  return mobileNav;
}

function parseNavContent(container) {
  const sectionMeta = new Map();
  const navLists = [];

  // parse section metadata
  const metaDiv = container.querySelector('.section-metadata');
  if (metaDiv) {
    metaDiv.querySelectorAll(':scope > div').forEach((row) => {
      const key = row.children[0]?.textContent?.trim().toLowerCase();
      const val = row.children[1]?.querySelector('a')?.href || row.children[1]?.textContent?.trim();
      if (key && val) sectionMeta.set(key, val);
    });
  }

  // parse nav lists — find all top-level <ul> elements (those whose parent is not a <li>)
  container.querySelectorAll('ul').forEach((ul) => {
    if (ul.parentElement && ul.parentElement.closest('ul')) return;
    ul.querySelectorAll(':scope > li').forEach((li) => {
      const linkEl = li.querySelector(':scope > p > a') || li.querySelector(':scope > a');
      if (!linkEl) return;
      const children = [...li.querySelectorAll(':scope > ul > li > a')];
      navLists.push({ link: linkEl, children });
    });
  });

  return { sectionMeta, navLists };
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

  const { sectionMeta, navLists } = parseNavContent(nav);

  // clear raw content
  nav.innerHTML = '';

  // build top bar (red bar with logo + utilities)
  const topBar = buildTopBar(sectionMeta);
  nav.append(topBar);

  // build primary nav tabs
  const primaryNav = buildPrimaryNav(navLists, 0);
  nav.append(primaryNav);

  // build sub-nav for active tab
  const subNav = buildSubNav(navLists, 0);
  nav.append(subNav);

  // build mobile menu
  const mobileMenu = buildMobileNav(navLists);
  nav.append(mobileMenu);

  // hamburger
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
  </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  topBar.querySelector('.nav-top-bar-inner').prepend(hamburger);

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
