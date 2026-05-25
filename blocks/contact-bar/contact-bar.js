const LOCATOR_URL = 'https://locations.wellsfargo.com/search';

function setupLocationSearch(panel) {
  const input = panel.querySelector('input[type="text"]');
  const goBtn = panel.querySelector('.panel-search-btn');
  if (!input || !goBtn) return;

  const navigate = () => {
    const query = input.value.trim();
    if (query) {
      window.open(`${LOCATOR_URL}?qp=${encodeURIComponent(query)}`, '_blank', 'noopener');
    }
  };

  goBtn.addEventListener('click', navigate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate();
  });
}

export default function decorate(block) {
  const heading = block.querySelector('h2');
  const ul = document.createElement('ul');
  ul.className = 'contact-bar-items';

  [...block.children].forEach((row) => {
    if (row.querySelector('h2')) return;

    const cell = row.querySelector('div');
    if (!cell) return;

    const link = cell.querySelector('a');
    const icon = cell.querySelector('.icon');
    const panel = cell.querySelector('.contact-bar-panel');

    const li = document.createElement('li');
    li.className = 'contact-bar-item';

    if (link && !panel) {
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
      const text = cell.querySelector('p')?.textContent.trim()
        || cell.childNodes[0]?.textContent.trim() || '';
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

      if (panel) {
        panel.hidden = true;
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
        if (panel.querySelector('.panel-search-btn')) {
          setupLocationSearch(panel);
        }
      }
    }

    ul.append(li);
  });

  block.textContent = '';
  if (heading) block.append(heading);
  block.append(ul);
}
