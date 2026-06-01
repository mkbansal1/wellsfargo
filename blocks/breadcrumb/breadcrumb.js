let indexCache = null;
let esIndexCache = null;

async function fetchIndex(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function getIndex() {
  if (!indexCache) {
    indexCache = fetchIndex('/query-index.json');
  }
  return indexCache;
}

async function getEsIndex() {
  if (!esIndexCache) {
    esIndexCache = fetchIndex('/es/query-index.json');
  }
  return esIndexCache;
}

function titleFromPath(segment) {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function lookupTitle(path) {
  const isSpanish = window.location.pathname.startsWith('/es/');

  if (isSpanish) {
    const esIndex = await getEsIndex();
    const esEntry = esIndex.find((e) => e.path === path);
    if (esEntry) return esEntry.title;

    const enPath = path.replace(/^\/es\//, '/');
    const enIndex = await getIndex();
    const enEntry = enIndex.find((e) => e.path === enPath);
    if (enEntry) return enEntry.title;
  } else {
    const enIndex = await getIndex();
    const enEntry = enIndex.find((e) => e.path === path);
    if (enEntry) return enEntry.title;
  }

  const segments = path.split('/').filter(Boolean);
  return titleFromPath(segments[segments.length - 1] || '');
}

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

async function buildBreadcrumbFromPath() {
  const { pathname } = window.location;
  const segments = pathname.split('/').filter(Boolean);
  const items = [];
  const isSpanish = pathname.startsWith('/es/');

  const homeTitle = isSpanish ? 'Personal' : 'Personal';
  const homePath = isSpanish ? '/es/' : '/';
  items.push(createBreadcrumbItem(homeTitle, homePath));

  let accumulated = '';
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    accumulated += `/${segment}`;
    const isLast = i === segments.length - 1;

    if (segment !== 'es') {
      /* eslint-disable no-await-in-loop */
      const title = await lookupTitle(accumulated);
      items.push(createBreadcrumbItem(title, isLast ? null : accumulated));
    }
  }

  return items;
}

export default async function decorate(block) {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  const items = await buildBreadcrumbFromPath();
  items.forEach((li) => ol.append(li));

  nav.append(ol);
  block.textContent = '';
  block.append(nav);
}
