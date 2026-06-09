import { toClassName } from '../../scripts/aem.js';

/**
 * Product tabs variant.
 * Authored structure per row (single cell):
 *   - h3              → tab button label
 *   - <p>--Content--</p> → separator marker
 *   - everything after --Content-- → panel content shown on tab click
 */
export default function decorateProductTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];

  rows.forEach((row, i) => {
    // The single content cell
    const contentCell = row.firstElementChild;

    // Use the h3 inside the cell as the tab label
    const heading = contentCell.querySelector('h3');
    const label = heading ? heading.textContent.trim() : `Tab ${i + 1}`;
    const id = toClassName(label);

    // Build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.textContent = label;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', 'true');
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', 'false');
      });
      row.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-selected', 'true');
    });

    tablist.append(button);

    // Remove h3 tab label from panel
    if (heading) heading.remove();

    // Find the --Content-- separator and remove everything up to and including it
    const allChildren = [...contentCell.children];
    const separatorIdx = allChildren.findIndex(
      (el) => el.tagName === 'P' && el.textContent.trim() === '--Content--',
    );
    if (separatorIdx >= 0) {
      allChildren.slice(0, separatorIdx + 1).forEach((el) => el.remove());
    }

    // --- Restructure panel to match product-table-details layout ---

    // 1. Extract hero image — may be in a <p> or inside an <h4>
    const heroImgEl = contentCell.querySelector('picture, img:not(picture img)');
    if (heroImgEl) {
      const heroWrap = document.createElement('div');
      heroWrap.className = 'product-hero-img';
      const pictureEl = heroImgEl.closest('picture') || heroImgEl;
      // The picture may be wrapped in a <p> or <h4> — pull it out cleanly
      const picParent = pictureEl.parentElement;
      heroWrap.append(pictureEl);
      if (picParent && !picParent.hasChildNodes()) picParent.remove();
      contentCell.prepend(heroWrap);
    }

    // 2. Extract h2 account name heading (the first h2 after the hero)
    const accountHeading = contentCell.querySelector('h2');
    if (accountHeading) {
      const headingWrap = document.createElement('div');
      headingWrap.className = 'product-account-heading';
      headingWrap.append(accountHeading);
      const hero = contentCell.querySelector('.product-hero-img');
      if (hero) {
        hero.insertAdjacentElement('afterend', headingWrap);
      } else {
        contentCell.prepend(headingWrap);
      }
    }

    // 3. Split content on <hr> separators:
    //    - Everything before last <hr> → details grid (label+value rows)
    //    - Everything after last <hr>  → footer (CTAs)
    const allSibs = [...contentCell.children].filter(
      (el) => !el.classList.contains('product-hero-img') && !el.classList.contains('product-account-heading'),
    );

    // Find last <hr> to split body from footer
    let lastHrIdx = -1;
    allSibs.forEach((el, idx) => { if (el.tagName === 'HR') lastHrIdx = idx; });

    const bodyItems = lastHrIdx >= 0 ? allSibs.slice(0, lastHrIdx) : allSibs;
    const footerItems = lastHrIdx >= 0 ? allSibs.slice(lastHrIdx + 1) : [];

    // Remove any intermediate <hr> from bodyItems (keep only logical separators)
    bodyItems.forEach((el) => { if (el.tagName === 'HR') el.remove(); });

    // Build label+value rows from bodyItems
    const grid = document.createElement('div');
    grid.className = 'product-details-grid';

    let currentValue = null;
    bodyItems.forEach((el) => {
      if (el.tagName === 'HR') return; // skip intermediate hrs

      // A label is a <p> whose only/first child is <strong> with no <a> inside,
      // and whose text equals that strong's text
      const firstStrong = el.firstElementChild?.tagName === 'STRONG' ? el.firstElementChild : null;
      const isLabel = el.tagName === 'P'
        && firstStrong
        && !firstStrong.querySelector('a')
        && el.textContent.trim() === firstStrong.textContent.trim();

      if (isLabel) {
        const currentRow = document.createElement('div');
        currentRow.className = 'product-table-row';
        const labelDiv = document.createElement('div');
        labelDiv.className = 'product-table-label';
        labelDiv.append(el);
        currentValue = document.createElement('div');
        currentValue.className = 'product-table-value';
        currentRow.append(labelDiv);
        currentRow.append(currentValue);
        grid.append(currentRow);
      } else if (currentValue) {
        currentValue.append(el);
      } else {
        grid.append(el);
      }
    });

    contentCell.append(grid);

    // 4. Build footer (CTAs after last <hr>)
    if (footerItems.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'product-table-footer';
      footerItems.forEach((el) => footer.append(el));
      contentCell.append(footer);
    }

    // Set up the panel
    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
  });

  block.prepend(tablist);
}
