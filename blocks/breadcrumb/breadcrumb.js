function createBreadcrumbItem(title, path) {
  const li = document.createElement('li');
  if (path) {
    const a = document.createElement('a');
    a.href = path;
    a.textContent = title;
    li.append(a);
  } else {
    li.textContent = title;
    li.setAttribute('aria-current', 'page');
  }
  return li;
}

function buildBreadcrumbFromPath() {
  const { pathname } = window.location;
  const segments = pathname.split('/').filter(Boolean);
  const items = [];

  items.push(createBreadcrumbItem('Personal', '/'));

  let accumulated = '';
  segments.forEach((segment, i) => {
    accumulated += `/${segment}`;
    const title = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = i === segments.length - 1;
    items.push(createBreadcrumbItem(title, isLast ? null : accumulated));
  });

  return items;
}

export default function decorate(block) {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  const items = buildBreadcrumbFromPath();
  items.forEach((li) => ol.append(li));

  nav.append(ol);
  block.textContent = '';
  block.append(nav);
}
