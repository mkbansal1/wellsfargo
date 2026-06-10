/**
 * Decorates the sign-on variation of the hero block.
 * Authored with two rows:
 *   Row 1 — hero image + headline + CTA
 *   Row 2 — sign-on card (heading, Sign On button, supporting links)
 * @param {Element} block The hero block element
 */
function decorateSignOn(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const heroCell = rows[0]?.querySelector(':scope > div');
  const signonCell = rows[1]?.querySelector(':scope > div');
  if (!heroCell) return;

  // Build hero background from the picture in row 1
  const picture = heroCell.querySelector('picture');
  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-bg';
    bg.append(picture);
    block.prepend(bg);
  } else {
    block.classList.add('no-image');
  }

  // Build the main hero content from the remaining row 1 nodes
  const content = document.createElement('div');
  content.className = 'hero-content';
  content.append(...heroCell.childNodes);
  block.append(content);

  // Build the sign-on card from row 2
  if (signonCell) {
    const signon = document.createElement('div');
    signon.className = 'hero-signon';
    signon.append(...signonCell.childNodes);
    block.append(signon);
  }

  // Remove the original authored rows now that content is relocated
  rows.forEach((row) => row.remove());
}

/**
 * loads and decorates the hero block
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  if (block.classList.contains('sign-on')) {
    decorateSignOn(block);
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

  const allHeroes = document.querySelectorAll('.hero');
  if (allHeroes[0] === block) {
    block.classList.add('overlay-bottom-mobile');
  }
}
