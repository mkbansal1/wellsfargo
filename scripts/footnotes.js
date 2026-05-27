import { decorateIcons, getMetadata } from './aem.js';

const FOOTNOTES_SHEET_URL = '/data/footnotes.json';

function getLang() {
  const locale = getMetadata('locale') || document.documentElement.lang || 'en';
  return locale.startsWith('es') ? 'es' : 'en';
}

async function fetchFootnotes() {
  const lang = getLang();
  try {
    const resp = await fetch(`${FOOTNOTES_SHEET_URL}?sheet=${lang}`);
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
}

function renderFootnoteValue(value) {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = value;
  return wrapper;
}

export default async function buildFootnotes(footnotesAttr, pageid) {
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
