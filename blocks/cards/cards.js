import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    let hasImage = false;
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
        hasImage = true;
      } else if (div.textContent.trim() === '' && !div.querySelector('picture, img')) {
        div.remove();
      } else {
        div.className = 'cards-card-body';
      }
    });
    if (!hasImage) li.classList.add('no-image');
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    if (!img.src.startsWith('http') || img.src.includes(window.location.hostname)) {
      img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
    }
  });
  ul.querySelectorAll('.cards-card-body a').forEach((a) => {
    const last = a.lastChild;
    if (last && last.nodeType === Node.TEXT_NODE) {
      last.textContent = last.textContent.replace(/\s*>+\s*$/, '');
    }
  });

  // Generic link text (e.g. "Learn more", "Más información (en inglés)") gives screen
  // reader users no context. Add an aria-label combining the link text with the card's
  // heading so the destination is clear out of context.
  const GENERIC_LINK_TEXT = [
    'learn more',
    'más información (en inglés)',
    'más información',
    'get inspired',
  ];
  ul.querySelectorAll('li').forEach((li) => {
    const heading = li.querySelector('h2, h3, h4');
    if (!heading) return;
    const headingText = heading.textContent.trim();
    if (!headingText) return;
    li.querySelectorAll('.cards-card-body a').forEach((a) => {
      if (a.hasAttribute('aria-label')) return;
      const linkText = a.textContent.trim();
      if (GENERIC_LINK_TEXT.includes(linkText.toLowerCase())) {
        const label = `${linkText} about ${headingText}`;
        a.setAttribute('aria-label', label);
        a.setAttribute('title', label);
      }
    });
  });

  // promo variant: restructure DOM — h3 on top, then image + text row below
  if (block.classList.contains('promo')) {
    ul.querySelectorAll('li').forEach((li) => {
      const body = li.querySelector('.cards-card-body');
      const image = li.querySelector('.cards-card-image');
      const h3 = body ? body.querySelector('h3') : null;
      if (h3 && image && body) {
        const title = document.createElement('div');
        title.className = 'cards-card-title';
        title.append(h3);
        const row = document.createElement('div');
        row.className = 'cards-card-row';
        row.append(image, body);
        li.innerHTML = '';
        li.append(title, row);
      }
    });
  }

  block.replaceChildren(ul);
}
