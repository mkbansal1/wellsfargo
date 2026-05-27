import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Resolves the footer path for the current page.
 * Uses the page-level "footer" meta tag if present, otherwise falls back to /footer.
 */
function resolveFooterPath() {
  const pageMeta = getMetadata('footer');
  if (pageMeta) return new URL(pageMeta, window.location).pathname;
  return '/footer';
}

export default async function decorate(block) {
  const footerPath = resolveFooterPath();

  // Avoid duplicating content when viewing the footer document itself as a page
  if (window.location.pathname === footerPath) {
    block.closest('footer')?.setAttribute('hidden', '');
    return;
  }

  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  const sections = footer.querySelectorAll(':scope > div');
  sections.forEach((section, i) => {
    if (i === 0) {
      section.classList.add('footer-nav');

      // Some footer variants (e.g. mortgage) place the copyright <p> inside
      // the last <li> of the nav list. Move it outside the <ul> so it renders
      // as a standalone block below the nav links.
      section.querySelectorAll('p').forEach((p) => {
        const text = p.textContent.trim();
        const lower = text.toLowerCase();
        if (lower.includes('equal housing lender')) {
          p.classList.add('footer-equal-housing');
        }
        if (text.startsWith('©') || text.startsWith('\u00A9')) {
          p.classList.add('footer-copyright');
          const hr = document.createElement('hr');
          hr.classList.add('footer-gray-line');
          const wrapper = section.querySelector('.default-content-wrapper') || section;
          wrapper.append(hr);
          wrapper.append(p);
        }
      });
    } else if (i === 1) {
      section.classList.add('footer-social');
      section.querySelectorAll('a').forEach((link) => {
        const text = link.textContent.trim();
        const match = text.match(/^:([a-z-]+):$/);
        if (match) {
          const icon = match[1];
          link.textContent = '';
          link.classList.add('footer-social-icon', `icon-${icon}`);
          link.setAttribute('aria-label', `Wells Fargo ${icon} page`);
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener');
          const img = document.createElement('img');
          img.classList.add('icon');
          img.src = `/icons/${icon}.svg`;
          img.alt = '';
          img.loading = 'lazy';
          link.append(img);
        }
      });
    } else if (i === 2) {
      section.classList.add('footer-disclaimers');
    } else {
      section.classList.add('footer-legal');

      section.querySelectorAll('p').forEach((p) => {
        const text = p.textContent.trim();
        const lower = text.toLowerCase();
        if (lower.includes('equal housing lender')) {
          p.classList.add('footer-equal-housing');
        }
        if (text.startsWith('©') || text.startsWith('\u00A9')) {
          const hr = document.createElement('hr');
          hr.classList.add('footer-gray-line');
          p.before(hr);
          p.classList.add('footer-copyright');
        }
      });
    }
  });

  block.append(footer);
}
