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

// Line-of-business base paths whose pages start their breadcrumb at the base
// itself (dropping the "Personal"/"Inicio" home root). Longest prefixes first
// so e.g. /es/biz wins over /es.
const BREADCRUMB_BASES = [
  '/es/biz',
  '/es/about',
  '/es/cib',
  '/investing-wealth',
  '/biz',
  '/com',
  '/cib',
  '/about',
];

function findBasePath(pathname) {
  const match = BREADCRUMB_BASES.find(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (match) return match;
  if (pathname === '/es' || pathname.startsWith('/es/')) return '/es';
  return '/';
}

async function buildBreadcrumbFromPath() {
  const { pathname } = window.location;
  const segments = pathname.split('/').filter(Boolean);
  const items = [];

  const base = findBasePath(pathname);
  const baseSegments = base === '/' ? [] : base.split('/').filter(Boolean);
  const baseIsCurrent = baseSegments.length === segments.length;

  // On an LOB base landing page (e.g. /biz, /es/about) the only crumb would be
  // the base itself, which offers no navigation — render nothing so the block
  // can be hidden.
  if (baseIsCurrent && base !== '/' && base !== '/es') return [];

  // Starting crumb: the home root for default/Spanish-home paths, otherwise the
  // matched LOB base path itself.
  let startTitle;
  if (base === '/') startTitle = 'Personal';
  else if (base === '/es') startTitle = 'Inicio';
  else startTitle = await lookupTitle(base);
  items.push(createBreadcrumbItem(startTitle, baseIsCurrent ? null : base));

  let accumulated = base === '/' ? '' : base;
  for (let i = baseSegments.length; i < segments.length; i += 1) {
    accumulated += `/${segments[i]}`;
    const isLast = i === segments.length - 1;

    /* eslint-disable no-await-in-loop */
    const title = await lookupTitle(accumulated);
    items.push(createBreadcrumbItem(title, isLast ? null : accumulated));
  }

  return items;
}

export default async function decorate(block) {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const items = await buildBreadcrumbFromPath();
  if (items.length === 0) {
    block.textContent = '';
    block.setAttribute('hidden', '');
    return;
  }

  const ol = document.createElement('ol');
  items.forEach((li) => ol.append(li));

  nav.append(ol);
  block.textContent = '';
  block.append(nav);
}
