import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Converts an EDS URL glob pattern (using ** wildcards) to a RegExp.
 * e.g. "/mortage/**" => matches "/mortage/anything/nested"
 *      "/**"         => matches everything
 */
function globToRegex(pattern) {
  // Escape special regex chars except * which we handle separately
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Replace ** with a regex that matches any characters (including slashes)
  const regexStr = escaped.replace(/\*\*/g, '.*');
  return new RegExp(`^${regexStr}$`);
}

/**
 * Resolves the footer path for the current page by consulting the
 * metadata sheet (/metadata.json).  Rows that carry a non-empty
 * "footer" column and whose "URL" glob pattern matches the current
 * pathname take priority over the page-level meta tag.
 *
 * Matching is done in order; the first matching row wins.
 */
async function resolveFooterPath() {
  // Page-level meta tag (set on individual pages via metadata block)
  const pageMeta = getMetadata('footer');

  

  // Fall back to page-level meta tag, then to the default /footer
  if (pageMeta) return new URL(pageMeta, window.location).pathname;
  return '/footer';
}

export default async function decorate(block) {
  const footerPath = await resolveFooterPath();

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

      // Some footer variants (e.g. mortgage) have only one section and place
      // the copyright line as a <p> inside the last <li> of the nav list.
      // Detect it, mark it, then move it (and its <hr> separator) out of the
      // <li>/<ul> so it renders as a standalone block below the nav links.
      section.querySelectorAll('p').forEach((p) => {
        const text = p.textContent.trim();
        const lower = text.toLowerCase();
        if (lower.includes('equal housing lender')) {
          p.classList.add('footer-equal-housing');
        }
        if (text.startsWith('©') || text.startsWith('\u00A9')) {
          p.classList.add('footer-copyright');

          // Build the separator
          const hr = document.createElement('hr');
          hr.classList.add('footer-gray-line');

          // Find the nearest wrapper to append to (outside the ul/li)
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
