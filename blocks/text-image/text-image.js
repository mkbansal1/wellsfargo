const DEFAULT_IMAGE = '/icons/placeholder.svg';

export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  if (!row) return;

  const cols = [...row.children];
  const imageCol = cols[0];
  const textCol = cols[1];

  imageCol.classList.add('text-image-image');
  if (textCol) textCol.classList.add('text-image-content');

  if (!imageCol.querySelector('picture, img')) {
    imageCol.innerHTML = `<picture><img src="${DEFAULT_IMAGE}" alt=""></picture>`;
  }
}
