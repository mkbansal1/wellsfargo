import { loadFragment } from '../fragment/fragment.js';

function decorateStandardAccordion(block) {
  const isNumbered = block.classList.contains('numbered');

  [...block.children].forEach((row, index) => {
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';

    if (isNumbered) {
      const number = document.createElement('span');
      number.className = 'accordion-item-number';
      number.textContent = `${index + 1}`;
      summary.append(number);
    }

    summary.append(...label.childNodes);

    const body = row.children[1];
    body.className = 'accordion-item-body';

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}

/**
 * Reference variant — each row is `| label | fragment-link-or-path |`. The body
 * of each item is loaded lazily from the referenced fragment the first time the
 * item is opened, mirroring Tabs (Reference).
 */
function decorateReferenceAccordion(block) {
  const isNumbered = block.classList.contains('numbered');

  [...block.children].forEach((row, index) => {
    const label = row.children[0];
    const contentCell = row.children[1];
    const fragmentPath = contentCell.querySelector('a')
      ? new URL(contentCell.querySelector('a').href).pathname
      : contentCell.textContent.trim();

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';

    if (isNumbered) {
      const number = document.createElement('span');
      number.className = 'accordion-item-number';
      number.textContent = `${index + 1}`;
      summary.append(number);
    }

    summary.append(...label.childNodes);

    const body = document.createElement('div');
    body.className = 'accordion-item-body reference-content';
    body.dataset.fragment = fragmentPath;

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);

    details.addEventListener('toggle', async () => {
      if (!details.open || body.dataset.loaded) return;
      const fragment = await loadFragment(fragmentPath);
      if (fragment) {
        body.replaceChildren(...fragment.childNodes);
        body.dataset.loaded = 'true';
      }
    });

    row.replaceWith(details);
  });
}

export default function decorate(block) {
  if (block.classList.contains('reference')) {
    decorateReferenceAccordion(block);
    return;
  }

  decorateStandardAccordion(block);
}
