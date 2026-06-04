export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // Row 0: hero image
  const imageRow = rows[0];
  // Row 1: navigation links list
  const navRow = rows[1] || rows[0];

  // --- Build hero ---
  const hero = document.createElement('div');
  hero.className = 'learning-navigation-hero';

  const img = imageRow ? imageRow.querySelector('img') : null;
  if (img) {
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.classList.add('learning-navigation-hero-img');
    hero.append(img);
  }

  // --- Build nav tab strip ---
  const navContainer = document.createElement('nav');
  navContainer.className = 'learning-navigation-container';
  navContainer.setAttribute('aria-label', 'Learning navigation');

  const ul = navRow ? navRow.querySelector('ul') : null;
  if (ul) {
    ul.setAttribute('role', 'tablist');
    const currentPath = window.location.pathname.replace(/\/$/, '');
    let activeLabel = '';

    // First pass: unwrap <strong> and collect link paths
    const linkItems = [];
    ul.querySelectorAll('li').forEach((li) => {
      li.setAttribute('role', 'presentation');
      const strong = li.querySelector('strong');
      const a = li.querySelector('a');
      if (strong && a) {
        strong.replaceWith(a);
      }
      if (a) {
        a.setAttribute('role', 'tab');
        const linkPath = new URL(a.href, window.location).pathname.replace(/\/$/, '');
        linkItems.push({ li, a, linkPath });
      }
    });

    // Find the most specific (longest) matching path to avoid parent paths
    // matching child routes (e.g. /mortgage/learn matching /mortgage/learn/process)
    let bestMatch = null;
    linkItems.forEach(({ linkPath }) => {
      if (currentPath === linkPath || currentPath.startsWith(`${linkPath}/`)) {
        if (!bestMatch || linkPath.length > bestMatch.length) {
          bestMatch = linkPath;
        }
      }
    });

    // Second pass: assign active class only to best match
    linkItems.forEach(({ li, a, linkPath }, index) => {
      if (bestMatch && linkPath === bestMatch) {
        a.classList.add('active');
        a.setAttribute('aria-selected', 'true');
        li.classList.add('active');
        activeLabel = a.textContent.trim();
      } else {
        a.setAttribute('aria-selected', 'false');
      }
      if (index === 0 && !activeLabel) {
        activeLabel = a.textContent.trim();
      }
    });

    navContainer.append(ul);

    // --- Build mobile dropdown ---
    const dropdown = document.createElement('div');
    dropdown.className = 'learning-navigation-dropdown';

    const trigger = document.createElement('button');
    trigger.className = 'learning-navigation-dropdown-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.innerHTML = `<span class="learning-navigation-dropdown-label">${activeLabel}</span><span class="learning-navigation-dropdown-chevron" aria-hidden="true"></span>`;

    const panel = document.createElement('div');
    panel.className = 'learning-navigation-dropdown-panel';
    panel.setAttribute('role', 'listbox');

    ul.querySelectorAll('li a').forEach((a) => {
      const option = document.createElement('button');
      option.className = 'learning-navigation-dropdown-option';
      option.setAttribute('role', 'option');
      option.textContent = a.textContent.trim();
      if (a.classList.contains('active') || (!a.classList.contains('active') && option.textContent === activeLabel && ul.querySelector('a.active') === null)) {
        option.classList.add('active');
        option.setAttribute('aria-selected', 'true');
      }
      option.addEventListener('click', () => {
        window.location.href = a.href;
      });
      panel.append(option);
    });

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      dropdown.classList.toggle('open', !expanded);
    });

    dropdown.append(trigger);
    dropdown.append(panel);
    navContainer.append(dropdown);
  }

  block.textContent = '';
  block.append(hero);
  block.append(navContainer);
}
