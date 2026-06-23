import { getMetadata } from './aem.js';

const PLACEHOLDERS_URL = '/placeholders.json';

// Built-in defaults so the block message works before the placeholders sheet is
// published. The sheet (DA-served) overrides these at runtime when present.
const DEFAULTS = {
  en: {
    'leaving-site-blocked': 'Access to external sites is temporarily disabled.',
  },
  es: {
    'leaving-site-blocked': 'El acceso a sitios externos está deshabilitado temporalmente.',
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

/**
 * Decide whether a link is external (off-site).
 * External = absolute http(s) URL whose host is off-origin and not a first-party
 * EDS host (*.aem.page / *.aem.live / localhost). All other domains are blocked.
 */
function isExternalLink(link) {
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
  return true;
}

function handleClick(e) {
  const link = e.target.closest('a[href]');
  if (!link) return;
  if (!isExternalLink(link)) return;
  // Block navigation to external sites and notify the user.
  e.preventDefault();
  // eslint-disable-next-line no-alert
  window.alert(strings['leaving-site-blocked']);
}

export default function initLeavingSite() {
  if (document.body.dataset.leavingSite) return;
  document.body.dataset.leavingSite = 'true';
  loadPlaceholders();
  // Delegated on document so links inside lazily-injected fragments are covered.
  document.addEventListener('click', handleClick);
}
