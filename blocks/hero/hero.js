/**
 * Decorates the promo variant of the hero block.
 * @param {Element} block The hero block element
 */
function decoratePromo(block) {
  const rows = [...block.children];
  const mediaRow = rows.find((row) => row.querySelector('picture'));
  const content = document.createElement('div');
  const media = document.createElement('div');

  content.className = 'hero-promo-content';
  media.className = 'hero-promo-media';

  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      if (row === mediaRow) {
        cell.querySelectorAll('picture').forEach((picture) => media.append(picture));
      }

      if (cell.hasChildNodes()) content.append(...cell.childNodes);
    });

    row.remove();
  });

  block.append(content);
  if (media.hasChildNodes()) {
    block.append(media);
  } else {
    block.classList.add('no-media');
  }

  const ctaWrapper = [...content.querySelectorAll('p')].reverse().find((p) => {
    const link = p.querySelector('a[href]');
    return link && p.textContent.trim() === link.textContent.trim();
  });

  if (ctaWrapper) {
    const link = ctaWrapper.querySelector('a[href]');
    const formattingWrapper = link.parentElement;

    ctaWrapper.classList.add('button-wrapper');
    link.classList.add('button', 'secondary');

    if (formattingWrapper !== ctaWrapper && ['EM', 'STRONG'].includes(formattingWrapper.tagName)) {
      formattingWrapper.replaceWith(link);
    }
  }
}

/**
 * loads and decorates the hero block
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  if (block.classList.contains('promo')) decoratePromo(block);
}
