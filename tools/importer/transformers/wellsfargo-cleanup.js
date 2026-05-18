/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Wells Fargo site-wide cleanup.
 * Removes non-authorable content (header, footer, sign-on, navigation, cookie consent,
 * modals, tracking iframes, and empty/decorative elements).
 * All selectors verified against migration-work/cleaned.html.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
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

    // Header/masthead - Found in cleaned.html line 6: <header class="ps-masthead ...">
    // Support dropdown overlay - Found in cleaned.html lines 44-46
    // Fat nav overlay - Found in cleaned.html line 153: <div class="ps-fat-nav-overlay">
    // Fat nav outer - Found in cleaned.html line 155: <div class="ps-fat-nav-outer ...">
    // Container L3 mobile - Found in cleaned.html line 1096: <div class="container-l3-mobile" ...>
    // Emergency message - Found in cleaned.html line 4: <div class="ps-emergency-message">
    // Skip link - Found in cleaned.html line 2: <a href="#skip" class="hidden">
    WebImporter.DOMUtils.remove(element, [
      'header.ps-masthead',
      '.ps-support-dropdown-overlay-container',
      '.ps-support-dropdown-overlay',
      '.ps-fat-nav-overlay',
      '.ps-fat-nav-outer',
      '#containerL3Mobile',
      '.ps-emergency-message',
      'a.hidden[href="#skip"]',
    ]);

    // Footer - Found in cleaned.html line 1700: <footer class="ps-footer-homepage">
    WebImporter.DOMUtils.remove(element, [
      'footer.ps-footer-homepage',
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
  }
}
