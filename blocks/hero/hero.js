/**
 * loads and decorates the hero block
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const hasMultipleRows = rows.length > 1;

  // Multi-row hero: row 1 = sign-on overlay (top-left), row 2 = main content
  if (hasMultipleRows) {
    const signonRow = rows[0].querySelector(':scope > div');
    const contentRow = rows[1].querySelector(':scope > div');

    // Extract picture from either row (whichever has it)
    const picture = signonRow?.querySelector('picture') || contentRow?.querySelector('picture');

    if (picture) {
      const bg = document.createElement('div');
      bg.className = 'hero-bg';
      bg.append(picture);
      block.prepend(bg);
    }

    // Build sign-on overlay from row 1
    if (signonRow) {
      const signon = document.createElement('div');
      signon.className = 'hero-signon';
      signon.append(...signonRow.childNodes);
      block.append(signon);
    }

    // Build main content from row 2
    if (contentRow) {
      const content = document.createElement('div');
      content.className = 'hero-content';
      content.append(...contentRow.childNodes);
      block.append(content);
    }

    // Remove original rows
    rows.forEach((row) => row.remove());

    if (!picture) block.classList.add('no-image');
    return;
  }

  // Single-row hero (default behavior)
  const cell = rows[0]?.querySelector(':scope > div');
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
