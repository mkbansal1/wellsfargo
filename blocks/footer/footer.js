import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';

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
      // All remaining sections are legal/footnote content
      section.classList.add('footer-legal');

      // Mark Equal Housing Lender paragraph
      section.querySelectorAll('p').forEach((p) => {
        const text = p.textContent.trim().toLowerCase();
        if (text.includes('equal housing lender')) {
          p.classList.add('footer-equal-housing');
        }
      });

      // Find the copyright paragraph (contains © symbol) and add separator + class
      section.querySelectorAll('p').forEach((p) => {
        const text = p.textContent.trim();
        if (text.startsWith('©') || text.startsWith('\u00A9')) {
          // Insert a horizontal rule before the copyright line
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
