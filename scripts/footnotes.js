import { decorateIcons, getMetadata } from './aem.js';

const FOOTNOTES_SHEET_URL = '/data/footnotes.json';

const MODAL_TITLE = { en: 'Footnote', es: 'Nota al pie' };
const CLOSE_LABEL = { en: 'Close', es: 'Cerrar' };

function getLang() {
  const locale = getMetadata('locale') || document.documentElement.lang || 'en';
  return locale.startsWith('es') ? 'es' : 'en';
}

let sheetPromise;
async function fetchFootnotes() {
  if (!sheetPromise) {
    const lang = getLang();
    sheetPromise = fetch(`${FOOTNOTES_SHEET_URL}?sheet=${lang}`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => json.data || [])
      .catch(() => []);
  }
  return sheetPromise;
}

function renderFootnoteValue(value) {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = value;
  return wrapper;
}

/* cid -> { number, value }. Numbering follows the footnotes metadata order. */
function buildFootnoteMap(sheetData, footnotesAttr) {
  const map = new Map();
  if (!footnotesAttr) return map;
  let numberCounter = 0;
  footnotesAttr.split(',').map((id) => id.trim()).forEach((cid) => {
    const entry = sheetData.find((row) => row.cid === cid);
    if (!entry) return;
    const isNumbered = entry.numbered === 'true' || entry.numbered === true;
    if (isNumbered) numberCounter += 1;
    map.set(cid, { number: isNumbered ? numberCounter : null, value: entry.value || '' });
  });
  return map;
}

let modal;
let modalBody;
function getModal() {
  if (modal) return modal;
  const lang = getLang();
  modal = document.createElement('dialog');
  modal.className = 'footnote-modal';
  modal.innerHTML = `
    <div class="footnote-modal-header">
      <h2 class="footnote-modal-title">${MODAL_TITLE[lang]}</h2>
      <button type="button" class="footnote-modal-close" aria-label="${CLOSE_LABEL[lang]}">&times;</button>
    </div>
    <div class="footnote-modal-body"></div>`;
  modalBody = modal.querySelector('.footnote-modal-body');
  modal.querySelector('.footnote-modal-close').addEventListener('click', () => modal.close());
  // backdrop click closes
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
  document.body.appendChild(modal);
  return modal;
}

function openFootnote(entry) {
  getModal();
  modalBody.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'footnote-item';
  if (entry.number) {
    const numSpan = document.createElement('span');
    numSpan.className = 'footnote-number';
    numSpan.textContent = `${entry.number}.`;
    item.appendChild(numSpan);
  }
  item.appendChild(renderFootnoteValue(entry.value));
  modalBody.appendChild(item);
  modal.showModal();
}

/* Delegated handler — covers superscripts inside fragments/lazy content too. */
async function handleFootnoteClick(e) {
  const link = e.target.closest('a[href*="#tcm:"]');
  if (!link) return;
  const hashIndex = link.getAttribute('href').indexOf('#tcm:');
  const cid = link.getAttribute('href').slice(hashIndex + 1);

  const sheetData = await fetchFootnotes();
  const row = sheetData.find((r) => r.cid === cid);
  if (!row) return; // not found — allow default anchor behavior

  // Number shown in the popup comes from the superscript link text itself
  // (the authoritative displayed marker), falling back to the metadata map.
  const linkNumber = link.textContent.replace(/[^0-9]/g, '');
  let number = linkNumber || null;
  if (!number) {
    const map = buildFootnoteMap(sheetData, getMetadata('footnotes'));
    number = map.get(cid)?.number || null;
  }

  e.preventDefault();
  openFootnote({ number, value: row.value || '' });
}

function decorateSuperscriptLinks(root) {
  root.querySelectorAll('a[href*="#tcm:"]').forEach((link) => {
    if (link.dataset.footnoteDecorated) return;
    link.dataset.footnoteDecorated = 'true';
    link.setAttribute('role', 'button');
    const num = link.textContent.trim();
    link.setAttribute('aria-label', num ? `Open footnote ${num}` : 'Open footnote');
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        link.click();
      }
    });
  });
}

export function initFootnotePopups() {
  const main = document.querySelector('main');
  if (!main || main.dataset.footnotePopups) return;
  main.dataset.footnotePopups = 'true';
  main.addEventListener('click', handleFootnoteClick);
  decorateSuperscriptLinks(main);
  // re-decorate lazily-injected superscripts (fragments, tabs)
  const obs = new MutationObserver(() => decorateSuperscriptLinks(main));
  obs.observe(main, { childList: true, subtree: true });
}

export default async function buildFootnotes(footnotesAttr, pageid) {
  // Always enable popups (works even without footnotes metadata).
  initFootnotePopups();

  if (!footnotesAttr && !pageid) return;

  const sheetData = await fetchFootnotes();
  if (!sheetData.length && !pageid) return;

  const section = document.createElement('div');
  section.className = 'section';
  const wrapper = document.createElement('div');
  wrapper.className = 'footnotes-wrapper';

  if (footnotesAttr) {
    const cids = footnotesAttr.split(',').map((id) => id.trim());
    let numberCounter = 0;

    cids.forEach((cid) => {
      const entry = sheetData.find((row) => row.cid === cid);
      if (!entry) return;

      const item = document.createElement('div');
      item.className = 'footnote-item';
      item.setAttribute('data-cid', entry.cid || '');
      item.setAttribute('data-ctid', entry.ctid || '');
      item.setAttribute('data-numbered', entry.numbered || 'false');

      const isNumbered = entry.numbered === 'true' || entry.numbered === true;
      if (isNumbered) {
        numberCounter += 1;
        item.id = cid;
        const numSpan = document.createElement('span');
        numSpan.className = 'footnote-number';
        numSpan.textContent = `${numberCounter}.`;
        item.appendChild(numSpan);
      }

      const valueSpan = renderFootnoteValue(entry.value || '');
      item.appendChild(valueSpan);
      wrapper.appendChild(item);
    });
  }

  if (pageid) {
    const p = document.createElement('p');
    p.className = 'footnote-pageid';
    p.textContent = pageid;
    wrapper.appendChild(p);
  }

  section.appendChild(wrapper);
  decorateIcons(section);

  const main = document.querySelector('main');
  if (main) main.appendChild(section);
}
