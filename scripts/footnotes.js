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
  const wrapper = document.createElement('div');
  wrapper.className = 'footnotes-wrapper';

  if (footnotesAttr) {
    const cids = footnotesAttr.split(',').map((id) => id.trim());
    let numberCounter = 0;

    cids.forEach((cid) => {
      const entry = sheetData.find((row) => row.cid === cid);
      if (!entry) return;

      const p = document.createElement('p');
      p.className = 'footnote-item';

      if (entry.numbered === 'true' || entry.numbered === true) {
        numberCounter += 1;
        const numSpan = document.createElement('span');
        numSpan.className = 'footnote-number';
        numSpan.textContent = `${numberCounter}.`;
        p.appendChild(numSpan);
      }

      const valueSpan = renderFootnoteValue(entry.value || '');
      p.appendChild(valueSpan);
      wrapper.appendChild(p);
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
