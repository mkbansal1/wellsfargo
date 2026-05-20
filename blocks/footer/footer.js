import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  // Outer wrapper matching WF production: ps-footer-wrapper
  const wrapper = document.createElement('div');
  wrapper.classList.add('ps-footer-wrapper');

  const sections = [];
  while (fragment.firstElementChild) {
    sections.push(fragment.firstElementChild);
  }

  sections.forEach((section, i) => {
    const container = document.createElement('div');

    if (i === 0) {
      // ── Nav links ──────────────────────────────────────────────
      const nav = document.createElement('nav');
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', 'Footer navigation');
      nav.classList.add('ps-footer-links');

      const ul = section.querySelector('ul');
      if (ul) {
        ul.querySelectorAll('li').forEach((li) => {
          li.classList.add('ps-footer-link');
          // wrap inner text in a span if not already
          if (!li.querySelector('span')) {
            const span = document.createElement('span');
            span.innerHTML = li.innerHTML;
            li.innerHTML = '';
            li.append(span);
          }
        });
        nav.append(ul);
      }
      container.append(nav);

    } else if (i === 1) {
      // ── Social icons ───────────────────────────────────────────
      const socialDiv = document.createElement('div');
      socialDiv.classList.add('ps-footer-social-icons');

      const ul = document.createElement('ul');
      const socialLinks = section.querySelectorAll('a');
      const icons = ['facebook', 'linkedin', 'instagram', 'pinterest', 'youtube', 'x'];

      socialLinks.forEach((link, idx) => {
        const icon = icons[idx] || link.textContent.trim().toLowerCase().replace(/^:(.+):$/, '$1');
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.href || '#';
        a.target = '_blank';
        a.rel = 'noopener';
        a.classList.add(`icon-${icon}`, 'social-icon');
        a.setAttribute('aria-label', `Wells Fargo ${icon} page`);
        a.setAttribute('data-exit', 'true');

        const img = document.createElement('img');
        img.src = `/icons/${icon === 'x' ? 'x' : icon}.svg`;
        img.alt = '';
        img.loading = 'lazy';
        img.classList.add('icon');
        a.append(img);
        li.append(a);
        ul.append(li);
      });

      socialDiv.append(ul);
      container.append(socialDiv);

    } else if (i === 2) {
      // ── Investment / insurance disclaimer (NOT NOT) ────────────
      container.classList.add('ps-not-not');
      container.innerHTML = section.innerHTML;

    } else {
      // ── All remaining footnote / legal / copyright sections ────
      const isLast = i === sections.length - 1;

      if (isLast) {
        // Copyright row
        const grayLine = document.createElement('div');
        grayLine.classList.add('ps-gray-line-container');
        const line = document.createElement('div');
        line.classList.add('ps-gray-line');
        line.innerHTML = '&zwj;';
        grayLine.append(line);

        const copyright = document.createElement('div');
        copyright.classList.add('ps-copyright');
        copyright.innerHTML = section.innerHTML;

        container.append(grayLine);
        container.append(copyright);
      } else if (section.querySelector('.footer-legal, p') || section.textContent.trim()) {
        // Check if it's the Equal Housing row
        const text = section.textContent.trim();
        if (text.toLowerCase().includes('equal housing') || text.toLowerCase().includes('lender')) {
          container.classList.add('ps-footnote-footer');
          const icon = document.createElement('span');
          icon.classList.add('ps-home-lending-icon');
          icon.innerHTML = '&zwj;';
          container.append(icon);
          container.append(document.createTextNode('Equal Housing Lender'));
        } else {
          container.classList.add('ps-footnote-text');
          container.innerHTML = section.innerHTML;
        }
      }
    }

    wrapper.append(container);
  });

  block.append(wrapper);
}
