import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
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
    } else if (i === 3) {
      section.classList.add('footer-legal');
    }
  });

  block.append(footer);
}
