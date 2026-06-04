export default function decorate(block) {
  const isNumbered = block.classList.contains('numbered');
  const isPlusMinus = block.classList.contains('plus-minus');

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

    if (isPlusMinus) {
      const btn = document.createElement('span');
      btn.className = 'accordion-plus-btn';
      btn.setAttribute('aria-hidden', 'true');
      summary.append(btn);
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
