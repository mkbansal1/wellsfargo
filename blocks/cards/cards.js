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
    a.textContent = a.textContent.replace(/\s*>+\s*$/, '');
  });
  block.replaceChildren(ul);
}
