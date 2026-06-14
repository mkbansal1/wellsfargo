import { getMetadata } from './aem.js';

const PLACEHOLDERS_URL = '/placeholders.json';

// Built-in defaults so the interstitial works before the placeholders sheet is
// published. The sheet (DA-served) overrides these at runtime when present.
const DEFAULTS = {
  en: {
    'leaving-site-title': 'You are leaving wellsfargo.com',
    'leaving-site-body': "You're continuing to a website that Wells Fargo does not control. Wells Fargo has provided this link for your convenience but does not endorse and is not responsible for the content, links, privacy policy, or security policy of this website. You will be taken to {domain}.",
    'leaving-site-continue': 'Continue',
    'leaving-site-cancel': 'Cancel',
    'leaving-site-allow': 'wellsfargo.com, www.wellsfargo.com, wellsfargomedia.com, www17.wellsfargomedia.com',
  },
  es: {
    'leaving-site-title': 'Está saliendo de wellsfargo.com',
    'leaving-site-body': 'Está pasando a un sitio web que Wells Fargo no controla. Wells Fargo le ofrece este enlace por conveniencia, pero no respalda ni es responsable del contenido, los enlaces, la política de privacidad ni la política de seguridad de este sitio web. Se le llevará a {domain}.',
    'leaving-site-continue': 'Continuar',
    'leaving-site-cancel': 'Cancelar',
    'leaving-site-allow': 'wellsfargo.com, www.wellsfargo.com, wellsfargomedia.com, www17.wellsfargomedia.com',
  },
};

// First-party EDS hosts are never "external".
const EDS_HOST_RE = /(\.aem\.(page|live)$)|(^localhost$)/;

function getLang() {
  const locale = getMetadata('locale') || document.documentElement.lang || 'en';
  return locale.startsWith('es') ? 'es' : 'en';
}

// Synchronously-available copy: starts from built-in defaults, then gets
// overridden once the placeholders sheet loads. The click handler must stay
// synchronous (it calls preventDefault before any navigation), so it always
// reads from this cache rather than awaiting a fetch.
const strings = { ...DEFAULTS[getLang()] };

function loadPlaceholders() {
  const lang = getLang();
  fetch(`${PLACEHOLDERS_URL}?sheet=${lang}`)
    .then((resp) => (resp.ok ? resp.json() : null))
    .then((json) => {
      if (!json?.data) return;
      json.data.forEach((row) => {
        const key = row.Key || row.key;
        const text = row.Text ?? row.text ?? row.Value ?? row.value;
        if (key && text !== undefined) strings[key] = text;
      });
    })
    .catch(() => { /* keep defaults */ });
}

function getAllowList() {
  return (strings['leaving-site-allow'] || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Decide whether a link should trigger the leaving-site interstitial.
 * External = absolute http(s) URL whose host is off-origin, not an EDS host,
 * and not on the (exact-host) allow list.
 */
function isExternalLink(link, allowList) {
  const href = link.getAttribute('href');
  if (!href) return false;
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === window.location.hostname.toLowerCase()) return false;
  if (EDS_HOST_RE.test(host)) return false;
  // Exact-host exclusion: excluding "wellsfargo.com"/"www.wellsfargo.com" still
  // lets subdomains (connect.secure.wellsfargo.com, stories.wf.com, …) trigger.
  if (allowList.includes(host)) return false;
  return true;
}

let modal;
let bodyEl;
let continueBtn;
let lastFocused;
let pendingHref;

function buildModal() {
  modal = document.createElement('dialog');
  modal.className = 'leaving-site-modal';
  modal.innerHTML = `
    <div class="leaving-site-header">
      <h2 class="leaving-site-title">${strings['leaving-site-title']}</h2>
      <button type="button" class="leaving-site-close" aria-label="${strings['leaving-site-cancel']}">&times;</button>
    </div>
    <div class="leaving-site-body"></div>
    <div class="leaving-site-actions">
      <button type="button" class="leaving-site-cancel-btn button secondary">${strings['leaving-site-cancel']}</button>
      <button type="button" class="leaving-site-continue button primary">${strings['leaving-site-continue']}</button>
    </div>`;
  bodyEl = modal.querySelector('.leaving-site-body');
  continueBtn = modal.querySelector('.leaving-site-continue');

  const close = () => modal.close();
  modal.querySelector('.leaving-site-close').addEventListener('click', close);
  modal.querySelector('.leaving-site-cancel-btn').addEventListener('click', close);
  // backdrop click closes
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
  // restore focus to the triggering link on any close (Esc, button, backdrop)
  modal.addEventListener('close', () => {
    if (lastFocused) lastFocused.focus();
  });
  continueBtn.addEventListener('click', () => {
    const href = pendingHref;
    modal.close();
    if (href) window.open(href, '_blank', 'noopener');
  });
  document.body.appendChild(modal);
}

function openInterstitial(href) {
  if (!modal) buildModal();
  pendingHref = href;
  let domain = href;
  try {
    domain = new URL(href).hostname;
  } catch { /* keep raw href */ }
  bodyEl.textContent = (strings['leaving-site-body'] || '').replace('{domain}', domain);
  modal.showModal();
  continueBtn.focus();
}

function handleClick(e) {
  const link = e.target.closest('a[href]');
  if (!link) return;
  if (!isExternalLink(link, getAllowList())) return;
  e.preventDefault();
  lastFocused = link;
  openInterstitial(link.href);
}

export default function initLeavingSite() {
  if (document.body.dataset.leavingSite) return;
  document.body.dataset.leavingSite = 'true';
  loadPlaceholders();
  // Delegated on document so links inside lazily-injected fragments are covered.
  document.addEventListener('click', handleClick);
}
