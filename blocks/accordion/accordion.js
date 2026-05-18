export default function decorate(block) {
  [...block.children].forEach((row) => {
    const label = row.children[0];
    const body = row.children[1];
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    details.append(summary);
    body.className = 'accordion-item-body';
    details.append(body);
    row.replaceWith(details);
  });
}
