export default function decorate(block) {
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
