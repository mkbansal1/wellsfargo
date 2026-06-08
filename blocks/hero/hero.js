/**
 * loads and decorates the hero block
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
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
