const LOCATOR_URL = 'https://locations.wellsfargo.com/search';

function setupLocationSearch(panel) {
  const input = panel.querySelector('input[type="text"]');
  const goBtn = panel.querySelector('.panel-search-btn');
  if (!input || !goBtn) return;

  const navigate = () => {
    const query = input.value.trim();
    if (query) {
      window.open(`${LOCATOR_URL}?searchTxt=${encodeURIComponent(query)}`, '_blank', 'noopener');
    }
  };

  goBtn.addEventListener('click', navigate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate();
  });
}

function buildLocationSearchPanel() {
  const panel = document.createElement('div');
  panel.className = 'contact-bar-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="panel-search">
      <input type="text" placeholder=" " aria-label="Enter City, State or ZIP to find a location">
      <span class="panel-search-label">City, State or ZIP</span>
    </div>
    <button type="button" class="panel-search-btn">Go</button>
  `;
  setupLocationSearch(panel);
  return panel;
}

function buildContentPanel(contentCell) {
  const panel = document.createElement('div');
  panel.className = 'contact-bar-panel';
  panel.hidden = true;
  panel.append(...contentCell.childNodes);
  return panel;
}

export default function decorate(block) {
  const heading = block.querySelector('h2');
  const ul = document.createElement('ul');
  ul.className = 'contact-bar-items';

  [...block.children].forEach((row) => {
    if (row.querySelector('h2')) return;

    const cells = [...row.children];
    const cell = cells[0];
    const panelCell = cells[1];
    if (!cell) return;

    const link = cell.querySelector('a');
    const icon = cell.querySelector('.icon');
    const hasPanelContent = panelCell && panelCell.innerHTML.trim().length > 0;

    const li = document.createElement('li');
    li.className = 'contact-bar-item';

    if (link && !hasPanelContent) {
      const a = document.createElement('a');
      a.href = link.href;
      a.setAttribute('aria-label', link.textContent.trim());
      if (icon) a.append(icon);
      const label = document.createElement('span');
      label.className = 'contact-bar-label';
      label.textContent = link.textContent.trim();
      a.append(label);
      li.append(a);
    } else {
      const btn = document.createElement('button');
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-expanded', 'false');
      const text = cell.textContent.trim();
      btn.setAttribute('aria-label', text);
      if (icon) btn.append(icon);
      const label = document.createElement('span');
      label.className = 'contact-bar-label';
      label.textContent = text;
      btn.append(label);

      const chevron = document.createElement('span');
      chevron.className = 'contact-bar-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      btn.append(chevron);

      li.append(btn);

      let panel = null;
      if (hasPanelContent) {
        const isLocationSearch = panelCell.textContent.trim().toLowerCase() === 'location-search';
        if (isLocationSearch) {
          panel = buildLocationSearchPanel();
        } else {
          panel = buildContentPanel(panelCell);
        }
      }

      if (panel) {
        li.append(panel);
        btn.addEventListener('click', () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          ul.querySelectorAll('button[aria-expanded="true"]').forEach((other) => {
            other.setAttribute('aria-expanded', 'false');
            other.closest('.contact-bar-item').querySelector('.contact-bar-panel').hidden = true;
          });
          if (!expanded) {
            btn.setAttribute('aria-expanded', 'true');
            panel.hidden = false;
          }
        });
      }
    }

    ul.append(li);
  });

  block.textContent = '';
  if (heading) block.append(heading);
  block.append(ul);
}
