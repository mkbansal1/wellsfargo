function buildCell(rowIndex, isRowHeader) {
  if (isRowHeader) {
    const cell = document.createElement('th');
    cell.setAttribute('scope', 'row');
    return cell;
  }
  const cell = rowIndex ? document.createElement('td') : document.createElement('th');
  if (!rowIndex) cell.setAttribute('scope', 'col');
  return cell;
}

export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const isNoBorder = block.classList.contains('no-border');
  const hasColHeader = !block.classList.contains('no-header') && !isNoBorder;
  const hasRowHeader = block.classList.contains('row-header') || isNoBorder;

  if (hasColHeader) table.append(thead);
  table.append(tbody);

  [...block.children].forEach((child, i) => {
    const row = document.createElement('tr');
    if (hasColHeader && i === 0) thead.append(row);
    else tbody.append(row);

    [...child.children].forEach((col, j) => {
      let cell;
      if (hasRowHeader && j === 0) {
        cell = buildCell(i, true);
      } else {
        cell = buildCell(hasColHeader ? i : i + 1, false);
      }
      const align = col.getAttribute('data-align');
      const valign = col.getAttribute('data-valign');
      if (align) cell.style.textAlign = align;
      if (valign) cell.style.verticalAlign = valign;
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });

  block.innerHTML = '';
  block.append(table);
}
