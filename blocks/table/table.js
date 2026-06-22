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

/**
 * comparison variant — mobile-first product grid.
 * Desktop shows all columns; mobile shows a 2-column sliding window
 * (step 1, so columns overlap) with prev/next + dot pagination.
 */
function decorateComparison(block, table) {
  const firstRow = table.querySelector('tr');
  const colCount = firstRow ? firstRow.children.length : 0;
  const perScreen = 2;
  if (colCount <= perScreen) return;
  const screens = colCount - perScreen + 1;

  const nav = document.createElement('nav');
  nav.className = 'table-pagination';
  nav.setAttribute('aria-label', 'Compare accounts');

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'table-page-prev';
  prev.setAttribute('aria-label', 'View previous screen');
  prev.innerHTML = '<span aria-hidden="true">&#8249;</span>';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'table-page-next';
  next.setAttribute('aria-label', 'View next screen');
  next.innerHTML = '<span aria-hidden="true">&#8250;</span>';

  const dots = [];
  for (let s = 1; s <= screens; s += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'table-page-dot';
    dot.dataset.start = String(s);
    dots.push(dot);
  }

  const update = (start) => {
    block.dataset.start = String(start);
    prev.disabled = start <= 1;
    next.disabled = start >= screens;
    dots.forEach((dot, i) => {
      const idx = i + 1;
      const selected = idx === start;
      dot.setAttribute('aria-current', selected ? 'true' : 'false');
      dot.setAttribute('aria-label', `${selected ? 'Selected' : 'View'} screen ${idx} of ${screens}`);
    });
  };

  prev.addEventListener('click', () => update(Math.max(1, Number(block.dataset.start) - 1)));
  next.addEventListener('click', () => update(Math.min(screens, Number(block.dataset.start) + 1)));
  dots.forEach((dot) => dot.addEventListener('click', () => update(Number(dot.dataset.start))));

  nav.append(prev, ...dots, next);
  block.prepend(nav);
  update(1);
}

/**
 * compare variant — one continuous comparison table.
 * Row taxonomy keyed off authored cell count:
 *   first multi-col row  → thead column headers (accent bars via CSS)
 *   1-cell row with a heading → full-width centered section divider
 *   1-cell row without a heading → full-width left-aligned label row
 *   other multi-col rows → data rows
 */
function decorateCompare(block, table, maxCols) {
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);
  let headerAssigned = false;

  [...block.children].forEach((child) => {
    const row = document.createElement('tr');
    const isFullWidth = child.children.length === 1;
    const isSection = isFullWidth && !!child.querySelector('h2, h3, h4');

    if (isFullWidth && isSection) row.classList.add('compare-section-row');
    else if (isFullWidth) row.classList.add('compare-label-row');

    if (!headerAssigned && !isFullWidth) {
      row.classList.add('compare-header-row');
      headerAssigned = true;
      thead.append(row);
    } else {
      tbody.append(row);
    }

    [...child.children].forEach((col) => {
      let cell;
      if (row.classList.contains('compare-header-row')) {
        cell = document.createElement('th');
        cell.setAttribute('scope', 'col');
      } else if (isFullWidth) {
        cell = document.createElement('td');
        cell.colSpan = maxCols;
        cell.className = isSection ? 'compare-section' : 'compare-label';
      } else {
        cell = document.createElement('td');
      }
      const align = col.getAttribute('data-align');
      if (align) cell.style.textAlign = align;
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });
}

export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  if (block.classList.contains('compare')) {
    const maxCompareCols = Math.max(
      1,
      ...[...block.children].map((row) => row.children.length),
    );
    decorateCompare(block, table, maxCompareCols);
    block.innerHTML = '';
    block.append(table);
    // Fix: remove overflow:auto from any ancestor EDS wrappers that break
    // position:sticky on the thead. We walk up and neutralise overflow on
    // .section and .section-wrapper elements only — safe to do because the
    // compare variant is always full-bleed and never needs to clip content.
    let ancestor = block.parentElement;
    while (ancestor && ancestor !== document.body) {
      const { overflow, overflowX, overflowY } = window.getComputedStyle(ancestor);
      const breaksSticky = ['auto', 'scroll', 'hidden'].includes(overflow)
        || ['auto', 'scroll', 'hidden'].includes(overflowX)
        || ['auto', 'scroll', 'hidden'].includes(overflowY);
      if (breaksSticky) {
        ancestor.style.overflow = 'visible';
      }
      ancestor = ancestor.parentElement;
    }
    return;
  }

  const isNoBorder = block.classList.contains('no-border');
  const isProductCard = block.classList.contains('product-card');
  const hasColHeader = !block.classList.contains('no-header') && !isNoBorder && !isProductCard;
  const hasRowHeader = block.classList.contains('row-header') || isNoBorder;

  if (isProductCard) {
    const headingText = block.children[0]?.textContent || '';
    if (block.classList.contains('relationship') || /relationship/i.test(headingText)) {
      block.classList.add('relationship');
    }
  }

  const maxCols = Math.max(
    1,
    ...[...block.children].map((row) => row.children.length),
  );

  let headerRowAssigned = false;

  if (hasColHeader) table.append(thead);
  table.append(tbody);

  [...block.children].forEach((child, i) => {
    const row = document.createElement('tr');
    const isFullWidthRow = isProductCard && child.children.length === 1;
    const isHeaderRow = isProductCard && child.children.length > 1 && !headerRowAssigned;

    if (isFullWidthRow) row.classList.add('full-width-row');
    if (isHeaderRow) {
      row.classList.add('header-row');
      headerRowAssigned = true;
    }
    if (hasColHeader && i === 0) thead.append(row);
    else tbody.append(row);

    [...child.children].forEach((col, j) => {
      let cell;
      if (isFullWidthRow) {
        cell = document.createElement('td');
        cell.colSpan = maxCols;
      } else if (isHeaderRow) {
        cell = document.createElement('th');
        cell.setAttribute('scope', 'col');
      } else if (hasRowHeader && j === 0) {
        cell = buildCell(i, true);
      } else {
        cell = buildCell(hasColHeader ? i : i + 1, false);
      }
      const align = col.getAttribute('data-align');
      const valign = col.getAttribute('data-valign');
      if (align && !(isFullWidthRow && isProductCard)) cell.style.textAlign = align;
      if (valign) cell.style.verticalAlign = valign;
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });

  block.innerHTML = '';
  block.append(table);

  if (block.classList.contains('comparison')) decorateComparison(block, table);
}