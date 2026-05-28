/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Wells Fargo site-wide cleanup.
 * Removes non-authorable content (header, footer, sign-on, navigation, cookie consent,
 * modals, tracking iframes, and empty/decorative elements).
 * All selectors verified against migration-work/cleaned.html.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

// Map source CSS classes to semantic HTML tags (add new mappings as needed)
// Use `className` to preserve a class on the replacement element
const TAG_MAPPINGS = [
  { selector: 'div.title2-SemiBold', tag: 'h3' },
  { selector: 'div.headline', tag: 'h4' },
];

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Convert non-semantic elements to proper HTML tags based on class mappings
    TAG_MAPPINGS.forEach(({ selector, tag, className }) => {
      element.querySelectorAll(selector).forEach((el) => {
        const replacement = element.ownerDocument.createElement(tag);
        replacement.innerHTML = el.innerHTML;
        if (className) replacement.className = className;
        el.replaceWith(replacement);
      });
    });

    // Remove cookie consent / OneTrust overlay (blocks parsing if present)
    // Found in cleaned.html line 1863: <div id="onetrust-consent-sdk">
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
    ]);

    // Remove sign-on form and container (blocks parsing, not authorable content)
    // Found in cleaned.html line 1101: <div class="signon-container ...">
    // Found in cleaned.html line 1105: <form id="frmSignon">
    WebImporter.DOMUtils.remove(element, [
      '.signon-container',
    ]);

    // Remove "leaving site" modals (outside main, block parsing)
    // Found in cleaned.html line 1511+: <div class="ep-modal">
    WebImporter.DOMUtils.remove(element, [
      '.ep-modal',
    ]);
  }

  if (hookName === H.after) {
    // --- Remove non-authorable site shell elements ---

    // Header/masthead/nav - all header variants across page types
    WebImporter.DOMUtils.remove(element, [
      'header',
      '.ps-masthead',
      '.ps-support-dropdown-overlay-container',
      '.ps-support-dropdown-overlay',
      '.ps-fat-nav-overlay',
      '.ps-fat-nav-outer',
      '#containerL3Mobile',
      '.ps-emergency-message',
      'a.hidden[href="#skip"]',
      'nav[aria-label="Breadcrumb"]',
      '.breadcrumb',
      '#feedbackSurvey',
      '.feedback-survey',
    ]);

    // Footer - all footer variants (homepage uses .ps-footer-homepage, other pages use footer tag)
    WebImporter.DOMUtils.remove(element, [
      'footer',
      '.ps-footer-homepage',
      '.ps-footer-wrapper',
    ]);

    // Remove iframes (tracking, font detection, challenge)
    // Found in cleaned.html line 1861: <iframe id="challengeFrame" ...>
    // Found in cleaned.html lines 2091-2098: <iframe id="cd__fontDetectionFrame">
    // Found in cleaned.html lines 2099-2106: tracking iframes (doubleclick, etc.)
    WebImporter.DOMUtils.remove(element, [
      'iframe',
    ]);

    // Remove hidden/decorative elements
    // Found in cleaned.html line 1860: <div class="visuallyHidden">
    WebImporter.DOMUtils.remove(element, [
      '.visuallyHidden',
    ]);

    // Remove noscript and link elements (safe to remove in afterTransform)
    WebImporter.DOMUtils.remove(element, [
      'noscript',
      'link',
    ]);

    // Strip trailing ">" or ">>" from link text — CSS adds chevrons via ::after
    element.querySelectorAll('a').forEach((a) => {
      const text = a.textContent;
      if (/\s*>+\s*$/.test(text)) {
        a.textContent = text.replace(/\s*>+\s*$/, '').trim();
      }
    });

    // Convert footnote reference links to superscript numbers
    // Pattern 1: <a href="...tcm:..."><sup>Opens a modal dialog for footnote N</sup></a> → <sup><a href="...">N</a></sup>
    // Pattern 2: <a href="...tcm:...">Opens a modal dialog for footnote N</a> (inside <sup>) → <a href="...">N</a>
    element.querySelectorAll('a').forEach((a) => {
      const text = a.textContent || '';
      if (!text.includes('footnote') && !text.includes('modal')) return;
      const match = text.match(/(\d+)\s*$/);
      if (!match) return;
      const num = match[1];
      const href = a.getAttribute('href') || a.href || '#';
      const doc = element.ownerDocument;
      const sup = a.querySelector('sup');
      if (sup) {
        const newSup = doc.createElement('sup');
        const newA = doc.createElement('a');
        newA.setAttribute('href', href);
        newA.textContent = num;
        newSup.appendChild(newA);
        a.replaceWith(newSup);
      } else {
        a.textContent = num;
      }
    });

    // Convert absolute wellsfargo.com links to relative paths and strip trailing slash
    element.querySelectorAll('a').forEach((a) => {
      let href = a.getAttribute('href') || '';
      if (href.startsWith('https://www.wellsfargo.com/')) {
        href = href.replace('https://www.wellsfargo.com', '');
      }
      if (href.length > 1 && href.endsWith('/')) {
        href = href.slice(0, -1);
      }
      if (href !== (a.getAttribute('href') || '')) {
        a.setAttribute('href', href);
      }
    });

    // Convert button links: primary → bold, secondary → italic
    element.querySelectorAll('a.ps-btn-primary, a.ps-btn, a[class*="ps-btn-primary"]').forEach((a) => {
      const doc = element.ownerDocument;
      const strong = doc.createElement('strong');
      const newA = doc.createElement('a');
      newA.setAttribute('href', a.getAttribute('href') || '');
      newA.textContent = a.textContent.trim();
      strong.appendChild(newA);
      a.replaceWith(strong);
    });
    element.querySelectorAll('a.ps-btn-secondary, a[class*="ps-btn-secondary"]').forEach((a) => {
      const doc = element.ownerDocument;
      const em = doc.createElement('em');
      const newA = doc.createElement('a');
      newA.setAttribute('href', a.getAttribute('href') || '');
      newA.textContent = a.textContent.trim();
      em.appendChild(newA);
      a.replaceWith(em);
    });
  }
}
