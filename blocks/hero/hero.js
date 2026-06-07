function decorateAppPromo(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  if (rows.length < 1) return;

  const row = rows[0];
  const cols = [...row.querySelectorAll(':scope > div')];

  const imageCol = document.createElement('div');
  imageCol.className = 'hero-device';

  const contentCol = document.createElement('div');
  contentCol.className = 'hero-content';

  if (cols.length >= 2) {
    imageCol.append(...cols[0].childNodes);
    contentCol.append(...cols[1].childNodes);
  } else if (cols.length === 1) {
    const picture = cols[0].querySelector('picture');
    if (picture) {
      imageCol.append(picture);
      contentCol.append(...cols[0].childNodes);
    }
  }

  while (block.firstChild) block.firstChild.remove();
  block.append(imageCol, contentCol);
}

/**
 * loads and decorates the hero block
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  if (block.classList.contains('app-promo')) {
    decorateAppPromo(block);
    return;
  }

  const cell = block.querySelector(':scope > div > div');
  if (!cell) return;

  const picture = cell.querySelector('picture');

  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-bg';
    bg.append(picture);
    block.prepend(bg);
  }

  const content = document.createElement('div');
  content.className = 'hero-content';
  content.append(...cell.childNodes);

  while (block.querySelector(':scope > div:not(.hero-bg):not(.hero-content)')) {
    block.querySelector(':scope > div:not(.hero-bg):not(.hero-content)').remove();
  }

  block.append(content);

  if (!picture) {
    block.classList.add('no-image');
  }
}
