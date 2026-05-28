import { toClassName } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function decorateProductFinder(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];
  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const contentCell = row.lastElementChild;
    const id = toClassName(tabCell.textContent.trim());

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tabCell.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();

    const isCompare = contentCell.querySelector('table') || contentCell.querySelectorAll('h3').length > 1;
    if (isCompare) {
      contentCell.className = 'product-compare';
    } else {
      contentCell.className = 'product-card';
    }
  });

  block.prepend(tablist);
}

function decorateHelpTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];
  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const contentCell = row.lastElementChild;
    const id = toClassName(tabCell.textContent.trim());

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tabCell.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();
    contentCell.className = 'help-content';
  });

  block.prepend(tablist);
}

function decorateInfoTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];
  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const contentCell = row.lastElementChild;
    const id = toClassName(tabCell.textContent.trim());

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tabCell.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();
    contentCell.className = 'category-content';

    // Wrap h3 + following p pairs into card divs
    const cards = contentCell.querySelectorAll('h3');
    if (cards.length > 0) {
      const cardsWrapper = document.createElement('div');
      cardsWrapper.className = 'category-cards';
      cards.forEach((h3) => {
        const card = document.createElement('div');
        card.appendChild(h3.cloneNode(true));
        let sibling = h3.nextElementSibling;
        while (sibling && sibling.tagName !== 'H3') {
          const next = sibling.nextElementSibling;
          card.appendChild(sibling.cloneNode(true));
          sibling = next;
        }
        cardsWrapper.appendChild(card);
      });
      // Remove original h3s and their content, keep intro paragraph
      const intro = contentCell.querySelector('p');
      contentCell.replaceChildren();
      if (intro) contentCell.appendChild(intro);
      contentCell.appendChild(cardsWrapper);
    }
  });

  block.prepend(tablist);
}

function decorateGuideTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];
  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const contentCell = row.lastElementChild;
    const id = toClassName(tabCell.textContent.trim());

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tabCell.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();
    contentCell.className = 'guide-content';
  });

  block.prepend(tablist);
}

async function decorateReferenceTabs(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];
  rows.forEach((row, i) => {
    const tabCell = row.firstElementChild;
    const contentCell = row.lastElementChild;
    const label = tabCell.textContent.trim();
    const id = toClassName(label);
    const fragmentPath = contentCell.querySelector('a')
      ? new URL(contentCell.querySelector('a').href).pathname
      : contentCell.textContent.trim();

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.textContent = label;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.dataset.fragment = fragmentPath;

    button.addEventListener('click', async () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      row.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);

      if (!contentCell.dataset.loaded) {
        const fragment = await loadFragment(fragmentPath);
        if (fragment) {
          contentCell.replaceChildren(...fragment.childNodes);
          contentCell.dataset.loaded = 'true';
        }
      }
    });
    tablist.append(button);

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('aria-hidden', !!i);
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.setAttribute('role', 'tabpanel');
    tabCell.remove();
    contentCell.className = 'reference-content';
  });

  block.prepend(tablist);

  // Load the first tab's fragment eagerly
  const firstPanel = block.querySelector('.reference-content');
  const firstPath = tablist.querySelector('button').dataset.fragment;
  if (firstPanel && firstPath) {
    const fragment = await loadFragment(firstPath);
    if (fragment) {
      firstPanel.replaceChildren(...fragment.childNodes);
      firstPanel.dataset.loaded = 'true';
    }
  }
}

export default async function decorate(block) {
  if (block.classList.contains('reference')) {
    await decorateReferenceTabs(block);
    return;
  }

  if (block.classList.contains('product-finder')) {
    decorateProductFinder(block);
    return;
  }

  if (block.classList.contains('help-tabs')) {
    decorateHelpTabs(block);
    return;
  }

  if (block.classList.contains('info-tabs')) {
    decorateInfoTabs(block);
    return;
  }

  if (block.classList.contains('guide-tabs')) {
    decorateGuideTabs(block);
    return;
  }

  // Default tabs behavior
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const tabs = [...block.children].map((child) => child.firstElementChild);
  tabs.forEach((tab, i) => {
    const id = toClassName(tab.textContent);

    const tabpanel = block.children[i];
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);
    tab.remove();
  });

  block.prepend(tablist);
}
