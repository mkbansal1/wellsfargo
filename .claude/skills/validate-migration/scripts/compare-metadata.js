#!/usr/bin/env node
/* eslint-disable */
/**
 * compare-metadata.js
 *
 * Fetches an EDS page and its corresponding source/live site page, then
 * compares selected fields and outputs a structured JSON report.
 *
 * Usage:
 *   node compare-metadata.js \
 *     --eds-url     https://main--wellsfargo--mkbansal1.aem.page/mortgage/come-home \
 *     --source-url  https://www.wellsfargo.com/mortgage/come-home \
 *     [--rules      metadata,links,footnotes] \
 *     [--output     ./report.json]
 *
 * Rules available (comma-separated, default = metadata):
 *   [Rule 0 — theme detection always runs automatically, no flag needed]
 *   metadata         — title, description, keywords, hide-breadcrumb    (Rule 1)
 *   links            — sup footnote href validation vs. source page      (Rule 2)
 *   footnotes        — footnotes metadata sequence + sheet coverage      (Rule 3)
 *   hrefs            — link rewrite checks (4.1–4.5)                    (Rule 4)
 *   section-metadata — section style generation checks                  (Rule 5)
 *   broken-links     — HEAD-check all internal links; fix broken PDFs   (Rule 6)
 *
 * Rule 2 (links) — reference page support:
 *   The EDS page is scanned for blocks that reference other pages:
 *     • div.fragment           — single path in nested div text
 *     • div.tabs.reference     — each row's second cell is a path
 *   Each referenced page is fetched and its sups are also validated
 *   against the same source sup list (source renders all content inline).
 *   Fixes are tagged with a `page` field:
 *     • "main"                       — fix targets the main EDS page
 *     • "/fragments/..."             — fix targets that reference page
 *
 * Exit codes:
 *   0  all checks passed
 *   1  one or more auto-fixes required
 *   2  script error (bad args, network failure, etc.)
 */

import { parse } from 'node-html-parser';
import { writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args['eds-url'] || !args['source-url']) {
  console.error('Usage: node compare-metadata.js --eds-url <url> --source-url <url> [--rules metadata,links,footnotes] [--output report.json]');
  process.exit(2);
}

const EDS_URL = args['eds-url'].replace(/\/$/, '');
const SOURCE_URL = args['source-url'];
const RULES = (args.rules || 'metadata').split(',').map((r) => r.trim());
const OUTPUT = args.output || null;

// ---------------------------------------------------------------------------
// Derive EDS base URL and page path from EDS_URL
// ---------------------------------------------------------------------------
function parseEdsUrl(url) {
  const m = url.match(/^(https:\/\/[^/]+)(\/.*)?$/);
  return {
    baseUrl: m ? m[1] : url,
    path: m ? (m[2] || '/') : '/',
  };
}

const { baseUrl: EDS_BASE_URL, path: EDS_PATH } = parseEdsUrl(EDS_URL);

// ---------------------------------------------------------------------------
// Plain HTTP fetch helpers
// ---------------------------------------------------------------------------
function normalise(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function extractMetadata(root) {
  const meta = {};
  const titleEl = root.querySelector('title');
  if (titleEl) meta.title = normalise(titleEl.text);
  root.querySelectorAll('meta[name]').forEach((el) => {
    const name = (el.getAttribute('name') || '').toLowerCase();
    const content = normalise(el.getAttribute('content') || '');
    if (name && content) meta[name] = content;
  });
  root.querySelectorAll('meta[property]').forEach((el) => {
    const prop = (el.getAttribute('property') || '').toLowerCase();
    const content = normalise(el.getAttribute('content') || '');
    if (prop && content) meta[prop] = content;
  });
  return meta;
}

/** Plain fetch → { root, metadata, statusCode, finalUrl } */
async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const html = await response.text();
  const root = parse(html);
  return {
    root, metadata: extractMetadata(root), statusCode: response.status, finalUrl: response.url,
  };
}

/**
 * Fetch the EDS footnotes sheet.
 * Language: 'es' if EDS_PATH starts with /es, otherwise 'en'.
 * Paginates automatically if total > limit.
 */
async function fetchFootnotesSheet(baseUrl, edPath) {
  const lang = edPath.startsWith('/es') ? 'es' : 'en';
  const baseSheet = `${baseUrl}/data/footnotes.json?sheet=${lang}`;

  async function getPage(offset, limit = 1000) {
    const url = `${baseSheet}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching footnotes sheet (${url})`);
    return res.json();
  }

  const first = await getPage(0);
  const rows = [...(first.data || [])];
  const total = first.total || rows.length;
  let offset = rows.length;
  while (offset < total) {
    const next = await getPage(offset);
    rows.push(...(next.data || []));
    offset = rows.length;
  }

  console.error(`[compare-metadata] [footnotes] Sheet "${lang}": ${rows.length} entries fetched.`);
  return { rows, lang };
}

// ---------------------------------------------------------------------------
// Reference page extraction
//
// Scans the EDS page for blocks that embed other pages by path:
//   div.fragment        — the path is text inside the first nested div > div
//   div.tabs.reference  — each row's second child div contains the path
//
// Returns [{ type: 'fragment'|'tab', path: '/fragments/...' }]
// Deduplicates by path; ignores external URLs (not starting with /).
// ---------------------------------------------------------------------------
function extractReferencePaths(root) {
  const refs = [];
  const seen = new Set();

  function addRef(type, rawPath) {
    const path = rawPath.trim();
    if (path.startsWith('/') && !seen.has(path)) {
      seen.add(path);
      refs.push({ type, path });
    }
  }

  for (const blockDiv of root.querySelectorAll('div[class]')) {
    const cls = (blockDiv.getAttribute('class') || '').split(/\s+/);

    // Fragment block: div.fragment (without tabs)
    if (cls.includes('fragment') && !cls.includes('tabs')) {
      // path lives inside the deepest plain-text div
      const inner = blockDiv.querySelector('div > div');
      if (inner) addRef('fragment', inner.text);
    }

    // Tabs reference block: div.tabs.reference
    if (cls.includes('tabs') && cls.includes('reference')) {
      for (const row of blockDiv.querySelectorAll(':scope > div')) {
        const cells = row.querySelectorAll(':scope > div');
        if (cells.length >= 2) {
          // Second cell is always the path (last cell handles any extra columns)
          addRef('tab', cells[1].text);
        }
      }
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Playwright fetch — shared session for links (Rule 2), footnotes (Rule 3),
// and link-style buttons (Rule 4.4)
// ---------------------------------------------------------------------------
async function fetchSourceRendered(url, { needSups, needFootnotes, needLinkStyles }) {
  const { chromium } = require('playwright');

  console.error('[compare-metadata] Launching Playwright to render source page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const result = {};

    if (needSups) {
      result.sups = await page.evaluate(() => {
        // Selector covers both themes:
        //   New theme — <sup class="c20ref" data-footnote="tcm:..."><a href="#tcm:...">N</a></sup>
        //   Old theme — <sup class="c20ref" data-footnote="tcm:..." type="footnote">N</sup>
        //               (no <a> inside; JS injects the number; href derived from data-footnote)
        const all = Array.from(document.querySelectorAll('sup.c20ref, sup[data-footnote]'));
        return all.map((sup, idx) => {
          const tcmId = sup.getAttribute('data-footnote');
          const anchor = sup.querySelector('a');
          const href = anchor?.getAttribute('href') ?? null;

          // Strip hidden accessibility spans that are inside the sup (new theme only)
          const hidden = sup.querySelector('.hidden, [data-translation-text]');
          let text = (anchor ?? sup).textContent;
          if (hidden) text = text.replace(hidden.textContent, '');
          text = text.trim();

          // Old-theme fallback: sup has data-footnote but JS has not yet injected the
          // visible number (or the page rendered too slowly).  Old theme always numbers
          // sups in document order, so document index + 1 is the correct number.
          if (!text && !anchor && sup.hasAttribute('data-footnote')) {
            text = String(idx + 1);
          }

          const number = parseInt(text, 10);
          // 'old' = data-footnote only, no <a> inside (href derived from tcmId)
          // 'new' = has <a href="..."> inside sup
          const supTheme = anchor ? 'new' : 'old';

          // Capture text immediately before the sup in its parent — used by patch-document.js
          // to locate the correct paragraph in EDS when the sup is missing (ADD_SUP action).
          // Strip "Footnote N" hidden-span text and special chars (®, ™, etc.) so the
          // context words tokenise cleanly for word-score matching.
          let contextBefore = '';
          try {
            const range = document.createRange();
            range.setStart(sup.parentElement, 0);
            range.setEndBefore(sup);
            contextBefore = range.toString()
              .replace(/footnote\s*\d+/gi, '') // strip "Footnote N" accessibility text
              .replace(/[^\w\s]/g, ' ') // strip ® ™ etc.
              .replace(/\s+/g, ' ')
              .trim()
              .slice(-80);
          } catch (_) { /* ignore — context is best-effort */ }

          return {
            tcmId, href, number: isNaN(number) ? null : number, supTheme, contextBefore,
          };
        }).filter((s) => s.tcmId && s.number !== null);
      });

      const oldCount = result.sups.filter((s) => s.supTheme === 'old').length;
      const newCount = result.sups.filter((s) => s.supTheme === 'new').length;
      console.error(`[compare-metadata] [links] Source sups found (raw): ${result.sups.length} (new-theme: ${newCount}, old-theme: ${oldCount})`);

      // Deduplicate by sup number — same number may appear multiple times when
      // the source page renders the same footnote across several tab sections.
      const dedupedSups = [];
      const seenNums = new Set();
      for (const s of result.sups) {
        if (!seenNums.has(s.number)) { seenNums.add(s.number); dedupedSups.push(s); }
      }
      result.sups = dedupedSups;
      console.error(`[compare-metadata] [links] Source sups (unique): ${result.sups.length}`);
    }

    if (needFootnotes) {
      result.footnotes = await page.evaluate(() => {
        // Footnote container differs by theme:
        //   New theme — div.ps-footnote  (ps-rsk stack)
        //   Old theme — div.c20          (TCM/legacy stack)
        // Both share the same item-level attributes: data-cid, data-ctid, data-numbered, .c20no
        const container = document.querySelector('.ps-footnote') || document.querySelector('div.c20');
        if (!container) return [];
        const footnotesTheme = container.classList.contains('ps-footnote') ? 'new' : 'old';
        return Array.from(container.querySelectorAll('[data-cid]')).map((el) => {
          const cid = el.getAttribute('data-cid') || '';
          const ctid = el.getAttribute('data-ctid') || '';
          const numbered = el.getAttribute('data-numbered') === 'true';
          const c20Text = el.querySelector('.c20Text');
          const c20no = el.querySelector('.c20no');
          let value; let
            valueText;
          if (c20Text) {
            // New theme: text is wrapped in .c20Text
            value = c20Text.innerHTML.trim();
            valueText = c20Text.textContent.trim();
          } else {
            // Old theme: text is directly in the div; strip the .c20no number label
            // Clone to avoid mutating the live DOM, then remove the number span
            const clone = el.cloneNode(true);
            const cloneNo = clone.querySelector('.c20no');
            if (cloneNo) cloneNo.remove();
            // Remove non-standard attributes (e.g. enrollmentid) from all anchors
            clone.querySelectorAll('a[enrollmentid]').forEach((a) => a.removeAttribute('enrollmentid'));
            value = clone.innerHTML.trim();
            valueText = clone.textContent.trim();
          }
          return {
            cid, ctid, numbered, value, valueText, footnotesTheme,
          };
        }).filter((f) => f.cid);
      });
      const theme = result.footnotes[0]?.footnotesTheme || 'unknown';
      console.error(`[compare-metadata] [footnotes] Source footnotes found: ${result.footnotes.length} (theme: ${theme})`);
    }

    // 4.4: styled CTA button links (JS-rendered) — two theme variants:
    //   New theme: a.ps-btn-primary (primary)  |  a.ps-btn-secondary (secondary)
    //   Old theme: a.c93 without .secondarybtn (primary)  |  a.c93.secondarybtn (secondary)
    if (needLinkStyles) {
      result.linkStyles = await page.evaluate(() => Array.from(document.querySelectorAll('a.ps-btn-primary, a.ps-btn-secondary, a.c93')).map((a) => {
        let style; let
          sourceClass;
        if (a.classList.contains('ps-btn-primary')) {
          style = 'primary'; sourceClass = 'ps-btn-primary';
        } else if (a.classList.contains('ps-btn-secondary')) {
          style = 'secondary'; sourceClass = 'ps-btn-secondary';
        } else if (a.classList.contains('secondarybtn')) {
          // a.c93.secondarybtn — old-theme secondary
          style = 'secondary'; sourceClass = 'c93 secondarybtn';
        } else {
          // a.c93 without secondarybtn — old-theme primary
          style = 'primary'; sourceClass = 'c93';
        }
        return {
          href: a.getAttribute('href') || '', text: a.textContent.trim(), style, sourceClass,
        };
      }));
      const oldCount = result.linkStyles.filter((b) => b.sourceClass?.startsWith('c93')).length;
      const newCount = result.linkStyles.filter((b) => b.sourceClass?.startsWith('ps-btn')).length;
      console.error(`[compare-metadata] [hrefs] 4.4: Source styled buttons found: ${result.linkStyles.length} (new-theme: ${newCount}, old-theme: ${oldCount})`);
    }

    return result;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Rule 0: theme detection (always runs — foundation for all other rules)
// ---------------------------------------------------------------------------

/**
 * Detect whether the source page uses the new ps-rsk theme or the legacy old theme.
 *
 * New theme: <body id="ps-rsk-foundation"> — ps-rsk CSS/JS stack
 * Old theme: plain <body> with no id — legacy TCM/jQuery stack
 *
 * @param {import('node-html-parser').HTMLElement} sourceRoot
 * @returns {{ detected: object }}
 */
function ruleTheme(sourceRoot) {
  const isNewTheme = !!sourceRoot.querySelector('#ps-rsk-foundation');
  const theme = isNewTheme ? 'new' : 'old';

  return {
    detected: {
      theme,
      detector: isNewTheme
        ? '<body id="ps-rsk-foundation"> present'
        : 'no <body id="ps-rsk-foundation"> (plain body)',
      status: 'ok',
      action: 'NONE',
      note: isNewTheme
        ? 'New theme — ps-rsk CSS/JS stack.'
        : 'Old theme — legacy TCM/jQuery stack. Pages are migrated to EDS using the new theme design.',
    },
  };
}

// ---------------------------------------------------------------------------
// Rule 1: metadata (title / description / keywords / hide-breadcrumb)
// ---------------------------------------------------------------------------

/**
 * @param {object} edsMeta     — metadata extracted from EDS rendered page
 * @param {object} sourceMeta  — metadata extracted from source rendered page
 * @param {object} sourceRoot  — parsed source HTML root (for DOM checks)
 */
// Fields that must NOT appear in page metadata — they come from global metadata only.
const GLOBAL_ONLY_FIELDS = ['locale', 'nav', 'footer', 'template'];

function ruleMetadata(edsMeta, sourceMeta, sourceRoot) {
  const FIELDS = ['title', 'description', 'keywords'];
  const results = {};

  // Check for global-metadata-only fields that must be removed from page metadata
  for (const field of GLOBAL_ONLY_FIELDS) {
    if (edsMeta[field]) {
      results[field] = {
        eds: edsMeta[field],
        source: null,
        status: 'forbidden',
        action: 'REMOVE',
        note: `"${field}" must come from global metadata, not page metadata. Will be removed.`,
      };
    }
  }

  for (const field of FIELDS) {
    const edsVal = edsMeta[field] || '';
    const sourceVal = sourceMeta[field] || '';
    const edsTrim = edsVal.toLowerCase().trim();
    const srcTrim = sourceVal.toLowerCase().trim();

    let status; let action; let
      note;

    if (!sourceVal) {
      status = 'source_missing'; action = 'NONE';
      note = 'Source page has no value for this field — skip.';
    } else if (!edsVal) {
      status = 'eds_missing'; action = 'ADD';
      note = 'EDS document is missing this field. Will be added from source.';
    } else if (edsTrim !== srcTrim) {
      status = 'mismatch'; action = 'UPDATE';
      note = 'Values differ. EDS will be updated to match source.';
    } else {
      status = 'ok'; action = 'NONE';
      note = 'Values match.';
    }

    results[field] = {
      eds: edsVal || null, source: sourceVal || null, status, action, note,
    };
  }

  // Theme detection + breadcrumb check
  //
  // Theme indicator (from source page body element):
  //   New theme  →  <body id="ps-rsk-foundation">
  //   Old theme  →  <body>  (no id)
  //
  // Breadcrumb selectors by theme:
  //   New theme  →  .ps-rsk-breadcrumb-container
  //   Old theme  →  <nav aria-label="breadcrumbs"> (case-insensitive aria-label)
  //
  // If EITHER selector is found the source has a visible breadcrumb trail;
  // no hide-breadcrumb metadata is added to EDS.
  // If NEITHER is found the breadcrumb should be hidden in EDS.
  if (sourceRoot) {
    const isNewTheme = !!sourceRoot.querySelector('#ps-rsk-foundation');
    const theme = isNewTheme ? 'new' : 'old';

    // New-theme breadcrumb
    const hasNewThemeBreadcrumb = !!sourceRoot.querySelector('.ps-rsk-breadcrumb-container');

    // Old-theme breadcrumb — two possible patterns:
    //   1. <nav aria-label="breadcrumbs"> (case-insensitive aria-label)
    //   2. <ul class="c67"> — TCM legacy breadcrumb widget
    const hasOldThemeBreadcrumb = Array.from(sourceRoot.querySelectorAll('nav')).some((nav) => (nav.getAttribute('aria-label') || '').toLowerCase().includes('breadcrumb'))
      || !!sourceRoot.querySelector('ul.c67');

    const hasBreadcrumb = hasNewThemeBreadcrumb || hasOldThemeBreadcrumb;
    const edsHideBreadcrumb = (edsMeta['hide-breadcrumb'] || '').toLowerCase().trim();

    console.error(`[compare-metadata] [metadata] Theme: ${theme} | breadcrumb: ${hasBreadcrumb} (new=${hasNewThemeBreadcrumb}, old=${hasOldThemeBreadcrumb} [nav-aria=${Array.from(sourceRoot.querySelectorAll('nav')).some((n) => (n.getAttribute('aria-label') || '').toLowerCase().includes('breadcrumb'))} ul.c67=${!!sourceRoot.querySelector('ul.c67')}])`);

    if (!hasBreadcrumb) {
      const alreadySet = edsHideBreadcrumb === 'true';
      results['hide-breadcrumb'] = {
        eds: edsHideBreadcrumb || null,
        source: 'true',
        status: alreadySet ? 'ok' : 'eds_missing',
        action: alreadySet ? 'NONE' : 'ADD',
        note: alreadySet
          ? `Source (${theme} theme) has no breadcrumb; hide-breadcrumb=true already set in EDS.`
          : `Source (${theme} theme) has no breadcrumb — adding hide-breadcrumb=true to EDS.`,
      };
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Rule 2: links — multi-page sup validation
// ---------------------------------------------------------------------------

/**
 * Extract numeric sup links from a parsed HTML root.
 * Returns:
 *   linked — Map<number, href>   <a href="..."><sup>N</sup></a>
 *   bare   — Set<number>         <sup>N</sup> not inside any <a>
 */
function extractEdsSupLinks(root) {
  const linked = new Map();
  const bare = new Set();

  for (const anchor of root.querySelectorAll('a')) {
    const sup = anchor.querySelector('sup');
    if (!sup) continue;
    const num = parseInt(sup.text.trim(), 10);
    if (isNaN(num) || num < 1 || String(num) !== sup.text.trim()) continue;
    linked.set(num, anchor.getAttribute('href') || '');
  }

  for (const sup of root.querySelectorAll('sup')) {
    const num = parseInt(sup.text.trim(), 10);
    if (isNaN(num) || num < 1 || String(num) !== sup.text.trim()) continue;
    if (linked.has(num)) continue;
    let parent = sup.parentNode;
    let inAnchor = false;
    while (parent) { if (parent.tagName === 'A') { inAnchor = true; break; } parent = parent.parentNode; }
    if (!inAnchor) bare.add(num);
  }

  return { linked, bare };
}

/**
 * Validate sup footnote links across the main EDS page and all reference pages.
 *
 * @param {Array} pageContexts  — [{ pageKey: 'main'|'/fragments/...', root }]
 * @param {Array} sourceSups    — unique [{ tcmId, href, number }] from Playwright
 *
 * Result keys:
 *   main page sups     →  "sup-N"
 *   reference sups     →  "/fragments/.../sup-N"
 *
 * Each detail carries a `page` field so fixes know which DA document to patch.
 *
 * MISSING_CONTENT is reported only when a source sup is absent from every page context.
 */
function ruleSupLinksAllPages(pageContexts, sourceSups) {
  if (sourceSups.length === 0) {
    console.error('[compare-metadata] [links] No c20ref sups found on source page — nothing to validate.');
    return {};
  }

  const results = {};

  // Pass 1: check each page context for each source sup
  for (const { pageKey, root } of pageContexts) {
    const { linked, bare } = extractEdsSupLinks(root);

    for (const {
      tcmId, href: sourceHref, number, supTheme,
    } of sourceSups) {
      // Old theme has no <a> in source — expected href is derived from data-footnote.
      // New theme has an explicit <a href="..."> — use that href directly.
      const expectedHref = sourceHref || `#${tcmId}`;
      const resultKey = pageKey === 'main' ? `sup-${number}` : `${pageKey}/sup-${number}`;
      const themeNote = supTheme === 'old'
        ? ` [old-theme: href derived from data-footnote="${tcmId}"]`
        : '';

      if (linked.has(number)) {
        const edsHref = linked.get(number);
        const ok = edsHref === expectedHref;
        results[resultKey] = {
          supNumber: number,
          tcmId,
          page: pageKey,
          supTheme: supTheme || 'new',
          eds: { href: edsHref },
          source: { tcmId, expectedHref },
          status: ok ? 'ok' : 'mismatch',
          action: ok ? 'NONE' : 'UPDATE_HREF',
          note: ok
            ? `Footnote ${number} href is correct (page: ${pageKey})${themeNote}.`
            : `Href is "${edsHref}", expected "${expectedHref}" (page: ${pageKey})${themeNote}.`,
        };
      } else if (bare.has(number)) {
        results[resultKey] = {
          supNumber: number,
          tcmId,
          page: pageKey,
          supTheme: supTheme || 'new',
          eds: { href: null },
          source: { tcmId, expectedHref },
          status: 'missing_anchor',
          action: 'WRAP_ANCHOR',
          note: `<sup>${number}</sup> exists in "${pageKey}" but is not wrapped in <a href="${expectedHref}">${themeNote}.`,
        };
      }
      // Not found in this page — handled in Pass 2
    }
  }

  // Pass 2: any source sup not found in any page context → MISSING_CONTENT
  // Action is ADD_SUP (auto-fixable via text-context matching in patch-document.js).
  // If no matching paragraph is found in EDS, patch-document logs it as unresolved.
  for (const {
    tcmId, href: sourceHref, number, supTheme, contextBefore,
  } of sourceSups) {
    const foundSomewhere = Object.values(results).some((r) => r.supNumber === number);
    if (!foundSomewhere) {
      const expectedHref = sourceHref || `#${tcmId}`;
      const themeNote = supTheme === 'old'
        ? ` [old-theme: href derived from data-footnote="${tcmId}"]`
        : '';
      results[`sup-${number}`] = {
        supNumber: number,
        tcmId,
        page: 'main',
        supTheme: supTheme || 'new',
        contextBefore: contextBefore || '',
        eds: null,
        source: { tcmId, expectedHref },
        status: 'missing_content',
        action: 'ADD_SUP',
        note: `<sup>${number}</sup> is absent from all EDS pages — will attempt to auto-insert at matched paragraph. Add <a href="${expectedHref}"><sup>${number}</sup></a>${themeNote}.`,
      };
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Rule 5: section-metadata
//
// Scans every section (main > div) in the rendered EDS page and derives
// which section-metadata styles SHOULD be present based on content:
//
//   H2 (direct child) + any major block  →  heading-bar, center-align
//   H2 (direct child) alone              →  heading-bar
//   Accordion block present              →  narrow-width  (always, in addition)
//
// Only MISSING expected styles are reported — extra styles are left untouched.
// Each finding is tagged with sectionIndex so patch-document.js can target
// the correct section in the DA source HTML.
// ---------------------------------------------------------------------------

const MAJOR_BLOCKS = ['cards', 'accordion', 'tabs', 'columns', 'carousel'];

/**
 * Get the style classes currently applied to a section div.
 * These come from the section-metadata block after EDS rendering.
 */
function getSectionStyles(section) {
  return (section.getAttribute('class') || '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Compute what styles SHOULD be on a section based on its content.
 *
 * H2 detection: only direct children of the section count as section headings;
 * h2 elements inside block wrappers (cards, accordion, etc.) are ignored.
 *
 * Note: node-html-parser exposes `.childNodes` (not `.children`).
 *       `.tagName` is already uppercase on HTMLElement nodes.
 */
function computeExpectedStyles(section) {
  // Direct-child h2 only (section heading, not a heading buried inside a block).
  // Use childNodes because node-html-parser does not expose `.children`.
  const hasH2 = Array.from(section.childNodes || [])
    .some((c) => c.tagName === 'H2');

  // Any major block anywhere in the section (blocks may be wrapped in an extra div)
  const hasMajorBlock = MAJOR_BLOCKS.some((b) => !!section.querySelector(`.${b}`));
  const hasAccordion = !!section.querySelector('.accordion');

  const expected = [];
  if (hasH2) expected.push('heading-bar');
  if (hasH2 && hasMajorBlock) expected.push('center-align');
  if (hasAccordion) expected.push('narrow-width');

  return {
    expected, hasH2, hasMajorBlock, hasAccordion,
  };
}

/**
 * Rule 5: validate section-metadata styles for every section.
 * @param {object} edsRoot — parsed rendered EDS HTML root
 */
function ruleSectionMetadata(edsRoot) {
  const results = {};
  const sections = Array.from(edsRoot.querySelectorAll('main > div'));

  if (sections.length === 0) {
    console.error('[compare-metadata] [section-metadata] No sections found under <main>.');
    return results;
  }

  console.error(`[compare-metadata] [section-metadata] Scanning ${sections.length} section(s)...`);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionKey = `section-${i + 1}`;

    const actual = getSectionStyles(section);
    const {
      expected, hasH2, hasMajorBlock, hasAccordion,
    } = computeExpectedStyles(section);

    if (expected.length === 0) continue; // No rules apply — skip silently

    const missing = expected.filter((s) => !actual.includes(s));

    results[sectionKey] = {
      sectionIndex: i,
      actualStyles: actual,
      expectedStyles: expected,
      missingStyles: missing,
      hasH2,
      hasMajorBlock,
      hasAccordion,
      status: missing.length === 0 ? 'ok' : 'missing-styles',
      action: missing.length === 0 ? 'NONE' : 'UPDATE_SECTION_META',
      note: missing.length === 0
        ? `Section ${i + 1}: styles correct (${expected.join(', ')}).`
        : `Section ${i + 1}: missing [${missing.join(', ')}]; current styles: [${actual.join(', ') || 'none'}].`,
    };
  }

  const total = Object.keys(results).length;
  const needFix = Object.values(results).filter((r) => r.action !== 'NONE').length;
  console.error(`[compare-metadata] [section-metadata] ${total} section(s) with expected styles; ${needFix} need fix.`);

  return results;
}

// ---------------------------------------------------------------------------
// Rule 6: broken-links — check all internal links on the EDS page
//
// Two passes:
//   Pass 1 — Dead links (no HTTP check needed):
//     href=""   → empty href, link goes nowhere
//     href="#"  → bare fragment, placeholder/unresolved link
//
//   Pass 2 — HTTP HEAD-check root-relative hrefs (10 concurrent, 10s timeout):
//     200           → ok  (NONE)
//     301/302/3xx   → redirect  (NONE — redirect is intentional)
//     404, pdf      → FIX_PDF   (auto: download from source, upload to DA)
//     404, page     → MANUAL    (report — page must be published or redirected)
//     other         → MANUAL    (report — unexpected status)
// ---------------------------------------------------------------------------

const BROKEN_LINKS_CONCURRENCY = 10;
const BROKEN_LINKS_TIMEOUT_MS = 10000;

/**
 * Check all internal links found in the EDS page root.
 * Returns a plain object keyed by a unique field id per finding.
 */
async function ruleBrokenLinks(edsRoot, edsBaseUrl, sourceBaseUrl) {
  const results = {};

  // --- Pass 1: Dead links (empty href or bare "#") ---
  let deadIdx = 0;
  for (const a of edsRoot.querySelectorAll('a')) {
    const rawHref = (a.getAttribute('href') ?? '').trim();
    const text = (a.textContent || '').trim().slice(0, 80);
    if (rawHref === '' || rawHref === '#') {
      const key = `dead-link-${++deadIdx}`;
      const reason = rawHref === '' ? 'Empty href ("")' : 'Bare fragment href ("#")';
      results[key] = {
        path: rawHref || '(empty)',
        url: null,
        status: 'DEAD',
        type: 'dead',
        action: 'MANUAL',
        linkText: text,
        note: `${reason} — placeholder or unresolved link. Update href or remove the anchor.`,
      };
    }
  }
  if (deadIdx > 0) {
    console.error(`[compare-metadata] [broken-links] ${deadIdx} dead link(s) found (empty or "#" href).`);
  }

  // --- Pass 2: HTTP HEAD-check root-relative paths ---
  // Collect unique root-relative paths (strip fragment + query for dedup)
  const seen = new Set();
  const links = [];

  for (const a of edsRoot.querySelectorAll('a[href]')) {
    const href = (a.getAttribute('href') || '').trim();
    if (!href.startsWith('/')) continue; // skip external, mailto:, tel:, dead links already handled
    const path = href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    if (path === '/' || seen.has(path)) continue;
    seen.add(path);
    links.push({ path, url: `${edsBaseUrl}${path}`, isPdf: path.toLowerCase().endsWith('.pdf') });
  }

  console.error(`[compare-metadata] [broken-links] ${links.length} unique internal link(s) to check...`);

  let idx = 0;

  async function worker() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-plusplus
      const link = links[idx++];
      if (!link) break;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), BROKEN_LINKS_TIMEOUT_MS);
        const res = await fetch(link.url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
        clearTimeout(timer);
        const { status } = res;

        if (status === 200) {
          results[link.path] = { path: link.path, url: link.url, status, type: link.isPdf ? 'pdf' : 'page', action: 'NONE', note: 'OK' };
        } else if (status === 404) {
          if (link.isPdf) {
            results[link.path] = {
              path: link.path,
              url: link.url,
              sourceUrl: `${sourceBaseUrl}${link.path}`,
              status,
              type: 'pdf',
              action: 'FIX_PDF',
              note: `PDF 404 on EDS. Will download from source (${sourceBaseUrl}${link.path}) and upload to DA.`,
            };
          } else {
            results[link.path] = { path: link.path, url: link.url, status, type: 'page', action: 'MANUAL', note: 'Page not found on EDS (404). Publish the page or configure a redirect.' };
          }
        } else if ([301, 302, 307, 308].includes(status)) {
          results[link.path] = { path: link.path, url: link.url, status, type: link.isPdf ? 'pdf' : 'page', action: 'NONE', note: `Redirect (${status}) — intentional, no action needed.` };
        } else {
          results[link.path] = { path: link.path, url: link.url, status, type: link.isPdf ? 'pdf' : 'page', action: 'MANUAL', note: `Unexpected HTTP status ${status}.` };
        }
      } catch (err) {
        const isTimeout = err.name === 'AbortError';
        results[link.path] = {
          path: link.path,
          url: link.url,
          status: isTimeout ? 'TIMEOUT' : 'ERROR',
          type: link.isPdf ? 'pdf' : 'page',
          action: 'MANUAL',
          note: isTimeout ? 'Request timed out after 10s.' : `Network error: ${err.message}`,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: BROKEN_LINKS_CONCURRENCY }, worker));

  const ok = Object.values(results).filter((r) => r.action === 'NONE').length;
  const broken = Object.values(results).filter((r) => r.action !== 'NONE').length;
  console.error(`[compare-metadata] [broken-links] Done — ${ok} ok, ${broken} broken/issue(s).`);

  return results;
}

// ---------------------------------------------------------------------------
// Rule 4: hrefs — link-rewrite validation
//
// Detects five classes of link problems in the EDS page (main + reference pages):
//
//   4.1 REWRITE_ABSOLUTE   — href starts with https://www.wellsfargo.com/
//                            → convert to root-relative: /path
//
//   4.2 STRIP_SLASH        — internal path has a trailing / before end, ?, or #
//                            e.g. /rates/  → /rates
//                                 /rates/?q → /rates?q
//                                 /about/#x → /about#x
//
//   4.3 STRIP_ARROW        — link text ends with a trailing >, &gt;, or ›
//                            (CSS arrow decoration baked into content)
//
//   4.5 FIX_PDF_LINK       — href under /assets/pdf/ ends with -pdf instead of .pdf
//                            AND/OR link text contains "opens in new window"
//                            → rename extension; strip accessibility label from text
//
// Detection runs on the main EDS page AND all discovered reference pages.
// Each finding is tagged with `page` so patch-document.js knows which DA
// document to patch.
// ---------------------------------------------------------------------------

const WF_ORIGIN = 'https://www.wellsfargo.com/';
const SLASH_RE = /^(\/.+?)\/([?#].*)?$/;
const ARROW_TEXT = /[>›]\s*$/;
const PDF_PATH_RE = /^\/assets\/pdf\//;
const PDF_EXT_RE = /-pdf$/i;
const NEW_WINDOW_RE_TEST = /opens?\s+in\s+new\s+window/i;

/**
 * Scan one page root for the three sub-rules.
 * @param {object} root     — parsed HTML
 * @param {string} pageKey  — 'main' or '/fragments/...'
 * @param {object} results  — accumulator (mutated in-place)
 * @param {{ count: number }} seq — shared sequence counter
 */
function scanPageHrefs(root, pageKey, results, seq) {
  for (const anchor of root.querySelectorAll('a[href]')) {
    const rawHref = anchor.getAttribute('href') || '';
    const { text } = anchor;

    // --- 4.1: absolute first-party URL ---
    let hrefAfter41 = rawHref;
    if (rawHref.startsWith(WF_ORIGIN)) {
      seq.count++;
      hrefAfter41 = `/${rawHref.slice(WF_ORIGIN.length)}`;
      results[`wf-${seq.count}`] = {
        subRule: '4.1',
        type: 'absolute-wf',
        action: 'REWRITE_ABSOLUTE',
        page: pageKey,
        href: rawHref,
        expectedHref: hrefAfter41,
        note: `Absolute first-party href → root-relative: "${hrefAfter41}" (page: ${pageKey})`,
      };
    }

    // --- 4.2: trailing slash on internal link ---
    // Check on hrefAfter41 so a link that also needs 4.1 is handled correctly.
    if (hrefAfter41.startsWith('/')) {
      const m = hrefAfter41.match(SLASH_RE);
      if (m) {
        seq.count++;
        const fixedHref = m[1] + (m[2] || '');
        results[`slash-${seq.count}`] = {
          subRule: '4.2',
          type: 'trailing-slash',
          action: 'STRIP_SLASH',
          page: pageKey,
          href: hrefAfter41,
          expectedHref: fixedHref,
          note: `Trailing slash in internal path → "${fixedHref}" (page: ${pageKey})`,
        };
      }
    }

    // --- 4.3: trailing arrow glyph in link text ---
    if (ARROW_TEXT.test(text)) {
      seq.count++;
      const glyphMatch = text.match(/\s*([>›])\s*$/);
      const glyph = glyphMatch ? glyphMatch[1] : '>';
      const fixedText = text.replace(/\s*[>›]\s*$/, '').trimEnd();
      results[`arrow-${seq.count}`] = {
        subRule: '4.3',
        type: 'trailing-arrow',
        action: 'STRIP_ARROW',
        page: pageKey,
        href: rawHref,
        text,
        expectedText: fixedText,
        note: `Trailing arrow "${glyph}" in link text → "${fixedText}" (page: ${pageKey})`,
      };
    }

    // --- 4.5: PDF link — broken extension (-pdf → .pdf) and/or "opens in new window" text ---
    // Only applies to hrefs under /assets/pdf/ (after 4.1 normalization).
    if (PDF_PATH_RE.test(hrefAfter41)) {
      const hasBrokenExt = PDF_EXT_RE.test(hrefAfter41);
      const hasNewWindow = NEW_WINDOW_RE_TEST.test(text);
      if (hasBrokenExt || hasNewWindow) {
        seq.count++;
        const fixedHref = hasBrokenExt
          ? hrefAfter41.replace(/-pdf$/i, '.pdf')
          : hrefAfter41;
        const fixedText = hasNewWindow
          ? text.replace(/\s*\(?\s*opens?\s+in\s+new\s+window\s*\)?\s*/gi, '').trim()
          : text;
        const noteParts = [];
        if (hasBrokenExt) noteParts.push(`href "${hrefAfter41}" → "${fixedHref}"`);
        if (hasNewWindow) noteParts.push('text: stripped "opens in new window"');
        results[`pdf-${seq.count}`] = {
          subRule: '4.5',
          type: 'pdf-link',
          action: 'FIX_PDF_LINK',
          page: pageKey,
          href: hrefAfter41,
          expectedHref: fixedHref,
          text,
          expectedText: fixedText,
          hasBrokenExt,
          hasNewWindow,
          note: `${noteParts.join('; ')} (page: ${pageKey})`,
        };
      }
    }
  }
}

/**
 * Normalize an href for cross-page matching.
 * Strips the https://www.wellsfargo.com prefix so that
 * source absolute links compare equal to EDS root-relative equivalents.
 */
function normalizeHrefForMatch(href) {
  const WF = 'https://www.wellsfargo.com';
  return href.startsWith(WF) ? href.slice(WF.length) || '/' : href;
}

/**
 * Sub-rule 4.4: Link styles
 *
 * For each source button (ps-btn-primary / ps-btn-secondary) extracted via
 * Playwright, finds the matching anchor in EDS pages (by normalized href) and
 * checks whether it is wrapped in <strong> (primary) or <em> (secondary).
 *
 * Buttons with empty or "#" hrefs are skipped — they are modal toggles with
 * no content equivalent in EDS.
 *
 * Reports:
 *   WRAP_STRONG — link exists in EDS but is not wrapped in <strong>
 *   WRAP_EM     — link exists in EDS but is not wrapped in <em>
 *   MANUAL      — link not found in any EDS page (inspect manually)
 */
function scanLinkStyles(pageContexts, sourceButtons, results, seq) {
  const meaningful = sourceButtons.filter((b) => b.href && b.href !== '#');
  if (meaningful.length === 0) return;

  console.error(`[compare-metadata] [hrefs] 4.4: ${meaningful.length} styled button(s) to validate (skipped href='#' ones)`);

  for (const btn of meaningful) {
    const wrapTag = btn.style === 'primary' ? 'strong' : 'em';
    const action = btn.style === 'primary' ? 'WRAP_STRONG' : 'WRAP_EM';
    const normSrc = normalizeHrefForMatch(btn.href);

    let foundInAnyPage = false;

    for (const { pageKey, root } of pageContexts) {
      for (const anchor of root.querySelectorAll('a[href]')) {
        const normEds = normalizeHrefForMatch(anchor.getAttribute('href') || '');
        if (normEds !== normSrc) continue;

        foundInAnyPage = true;
        seq.count++;

        const parentTag = (anchor.parentNode?.rawTagName || '').toLowerCase();
        const isWrapped = parentTag === wrapTag;

        results[`style-${seq.count}`] = {
          subRule: '4.4',
          type: 'link-style',
          action: isWrapped ? 'NONE' : action,
          status: isWrapped ? 'ok' : 'missing-wrapper',
          page: pageKey,
          href: normSrc, // root-relative (for patch-document matching)
          sourceHref: btn.href,
          text: btn.text,
          wrapper: wrapTag,
          buttonStyle: btn.style,
          sourceClass: btn.sourceClass || '',
          note: isWrapped
            ? `[${btn.sourceClass}] link "${btn.text}" already wrapped in <${wrapTag}> on "${pageKey}".`
            : `[${btn.sourceClass}] link "${btn.text}" (href: ${normSrc}) found on "${pageKey}" but NOT wrapped in <${wrapTag}>.`,
        };
      }
    }

    if (!foundInAnyPage) {
      seq.count++;
      results[`style-${seq.count}`] = {
        subRule: '4.4',
        type: 'link-style',
        action: 'MANUAL',
        status: 'missing-content',
        page: 'main',
        href: normSrc,
        sourceHref: btn.href,
        text: btn.text,
        wrapper: wrapTag,
        buttonStyle: btn.style,
        sourceClass: btn.sourceClass || '',
        note: `[${btn.sourceClass}] link "${btn.text}" (href: ${btn.href}) not found in any EDS page — verify manually.`,
      };
    }
  }
}

/**
 * Run Rule 4 across all page contexts.
 * @param {Array}  pageContexts  — [{ pageKey, root }]
 * @param {Array}  sourceButtons — JS-rendered ps-btn-* links from Playwright (4.4)
 * Sub-rules 4.1–4.3 and 4.5 run via scanPageHrefs; 4.4 runs via scanLinkStyles.
 */
function ruleLinkRewrites(pageContexts, sourceButtons = []) {
  const results = {};
  const seq = { count: 0 };
  for (const { pageKey, root } of pageContexts) {
    scanPageHrefs(root, pageKey, results, seq);
    console.error(`[compare-metadata] [hrefs] Scanned "${pageKey}": ${seq.count} issue(s) so far`);
  }
  if (sourceButtons.length > 0) {
    scanLinkStyles(pageContexts, sourceButtons, results, seq);
    console.error(`[compare-metadata] [hrefs] 4.4 scan done — total issues: ${seq.count}`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Rule 3: footnotes
// ---------------------------------------------------------------------------
const PAGE_ID_RE = /^(DT1|DT2|QSR|LRC|PM|RO)-/;

function ruleFootnotes(edsMeta, sourceFootnotes, sheetRows) {
  // Split source footnotes into two groups:
  //   pageIdEntries  — valueText matches DT1/DT2/QSR/LRC/PM prefix  → go to `pageid` metadata
  //   realFootnotes  — everything else                               → go to `footnotes` metadata
  const pageIdEntries = sourceFootnotes.filter((f) => PAGE_ID_RE.test(f.valueText));
  const realFootnotes = sourceFootnotes.filter((f) => !PAGE_ID_RE.test(f.valueText));
  console.error(`[compare-metadata] [footnotes] Real footnotes (after filter): ${realFootnotes.length}`);
  if (pageIdEntries.length > 0) {
    console.error(`[compare-metadata] [footnotes] PageId entries found: ${pageIdEntries.map((f) => f.valueText).join(', ')}`);
  }

  const fields = {};

  // ---- footnotes field ----
  const expectedCids = realFootnotes.map((f) => f.cid);
  const expectedStr = expectedCids.join(', ');

  const edsCidsStr = (edsMeta.footnotes || '').trim();
  const edsCids = edsCidsStr ? edsCidsStr.split(',').map((s) => s.trim()) : [];

  let fnStatus; let fnAction; let
    fnNote;
  if (!expectedStr && !edsCidsStr) {
    // No real footnotes on source and none on EDS — nothing to add (don't write an empty row).
    fnStatus = 'ok'; fnAction = 'NONE';
    fnNote = 'Source has no footnotes (only pageId entries); EDS has none. Nothing to do.';
  } else if (!edsCidsStr) {
    fnStatus = 'eds_missing'; fnAction = 'ADD';
    fnNote = `EDS page has no "footnotes" metadata. ${expectedCids.length} cid(s) will be added.`;
  } else if (edsCids.join(', ') !== expectedStr) {
    fnStatus = 'mismatch'; fnAction = 'UPDATE';
    fnNote = `Footnote sequence differs — EDS has ${edsCids.length} cid(s), source has ${expectedCids.length}. Sequence matters; EDS will be updated.`;
  } else {
    fnStatus = 'ok'; fnAction = 'NONE';
    fnNote = `All ${expectedCids.length} footnote cid(s) present and in correct sequence.`;
  }
  fields.footnotes = {
    eds: edsCidsStr || null, source: expectedStr, status: fnStatus, action: fnAction, note: fnNote,
  };

  // ---- pageid field ----
  // Source may have one or more pageId entries. Join them as a comma-separated list.
  // The valueText (e.g. "DT1-04012027-18-8449606-1.1") is the pageid value — not the TCM cid.
  if (pageIdEntries.length > 0) {
    const sourcePageId = pageIdEntries.map((f) => f.valueText.trim()).join(', ');
    const edsPageId = (edsMeta.pageid || '').trim();
    let piStatus; let piAction; let
      piNote;

    if (!edsPageId) {
      piStatus = 'eds_missing'; piAction = 'ADD';
      piNote = `EDS page is missing "pageid" metadata. Source pageId: "${sourcePageId}".`;
    } else if (edsPageId !== sourcePageId) {
      piStatus = 'mismatch'; piAction = 'UPDATE';
      piNote = `EDS pageid "${edsPageId}" differs from source "${sourcePageId}".`;
    } else {
      piStatus = 'ok'; piAction = 'NONE';
      piNote = `pageid "${edsPageId}" matches source.`;
    }
    fields.pageid = {
      eds: edsPageId || null, source: sourcePageId, status: piStatus, action: piAction, note: piNote,
    };
    console.error(`[compare-metadata] [footnotes] pageid: ${piStatus} (EDS="${edsPageId || 'none'}", source="${sourcePageId}")`);
  }

  // ---- sheet coverage (real footnotes only) ----
  const sheetCids = new Set(sheetRows.map((r) => r.cid));
  const missingFromSheet = realFootnotes
    .filter((f) => !sheetCids.has(f.cid))
    .map(({
      cid, ctid, numbered, value,
    }) => ({
      cid, ctid, numbered, value,
    }));

  if (missingFromSheet.length > 0) {
    console.error(`[compare-metadata] [footnotes] Missing from sheet: ${missingFromSheet.map((f) => f.cid).join(', ')}`);
  }

  return { fields, missingFromSheet };
}

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------
function buildReport({
  edsUrl, sourceUrl, sourceTheme, edsFetch, sourceFetch, ruleResults, missingFromSheet, refPages,
}) {
  const fixes = [];

  for (const [ruleName, fields] of Object.entries(ruleResults)) {
    for (const [field, detail] of Object.entries(fields)) {
      if (detail.action === 'NONE') continue;

      let fix;

      if (ruleName === 'section-metadata') {
        fix = {
          rule: 'section-metadata',
          field,
          action: detail.action,
          page: 'main',
          currentValue: detail.actualStyles?.join(', ') || null,
          expectedValue: detail.expectedStyles?.join(', ') || null,
          sectionIndex: detail.sectionIndex,
          missingStyles: detail.missingStyles || [],
          note: detail.note,
        };
      } else if (ruleName === 'hrefs') {
        // hrefs rule has a different shape — no eds/source comparison objects
        fix = {
          rule: 'hrefs',
          field,
          action: detail.action,
          subRule: detail.subRule,
          page: detail.page || 'main',
          currentValue: detail.href ?? detail.text ?? null,
          expectedValue: detail.expectedHref ?? detail.expectedText ?? null,
          note: detail.note,
        };
        if (detail.type === 'trailing-arrow') {
          fix.href = detail.href;
          fix.text = detail.text;
          fix.expectedText = detail.expectedText;
        }
        if (detail.type === 'link-style') {
          fix.href = detail.href; // normalized root-relative href
          fix.text = detail.text;
          fix.wrapper = detail.wrapper; // 'strong' or 'em'
          fix.buttonStyle = detail.buttonStyle; // 'primary' or 'secondary'
        }
      } else if (ruleName === 'broken-links') {
        fix = {
          rule: 'broken-links',
          field,
          action: detail.action,
          page: 'main',
          type: detail.type,       // 'pdf' | 'page' | 'dead'
          httpStatus: detail.status,
          currentValue: detail.url ?? detail.path,
          expectedValue: detail.action === 'FIX_PDF' ? detail.sourceUrl : null,
          ...(detail.linkText ? { linkText: detail.linkText } : {}),
          note: detail.note,
        };
      } else {
        fix = {
          rule: ruleName,
          field,
          action: detail.action,
          currentValue: detail.eds?.href ?? detail.eds ?? null,
          expectedValue: detail.source?.expectedHref ?? detail.source ?? null,
          note: detail.note,
        };
        if (ruleName === 'links') {
          fix.supNumber = detail.supNumber;
          fix.tcmId = detail.tcmId;
          fix.page = detail.page || 'main';
          if (detail.contextBefore) fix.contextBefore = detail.contextBefore;
        }
      }

      fixes.push(fix);
    }
  }

  // Rule 0 (theme) is informational — exclude it from field-level pass/fail counts
  const allDetails = Object.entries(ruleResults)
    .filter(([name]) => name !== 'theme')
    .flatMap(([, r]) => Object.values(r));
  const passed = allDetails.filter((d) => d.status === 'ok').length;
  const total = allDetails.length;
  const autoFixes = fixes.filter((f) => f.action !== 'MANUAL').length;
  const manualFixes = fixes.filter((f) => f.action === 'MANUAL').length;

  return {
    edsUrl,
    sourceUrl,
    timestamp: new Date().toISOString(),
    sourceTheme: sourceTheme || 'unknown',
    edsFetch: { statusCode: edsFetch.statusCode, finalUrl: edsFetch.finalUrl },
    sourceFetch: { statusCode: sourceFetch.statusCode, finalUrl: sourceFetch.finalUrl },
    refPages: refPages || [],
    rules: ruleResults,
    fixes,
    missingFromSheet: missingFromSheet || [],
    summary: {
      rulesChecked: RULES.length + 1, // +1 for Rule 0 (theme, always runs)
      fieldsChecked: total,
      passed,
      failed: total - passed,
      actionsRequired: autoFixes,
      manualRequired: manualFixes,
      missingFromSheet: (missingFromSheet || []).length,
      brokenPdfs: fixes.filter((f) => f.rule === 'broken-links' && f.action === 'FIX_PDF').length,
      brokenPages: fixes.filter((f) => f.rule === 'broken-links' && f.action === 'MANUAL' && f.type === 'page').length,
      deadLinks: fixes.filter((f) => f.rule === 'broken-links' && f.type === 'dead').length,
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.error(`[compare-metadata] EDS    : ${EDS_URL}`);
  console.error(`[compare-metadata] Source : ${SOURCE_URL}`);
  console.error(`[compare-metadata] Rules  : ${RULES.join(', ')}`);

  // Always fetch both pages (metadata rule + EDS DOM for links/footnotes)
  let edsFetch; let
    sourceFetch;
  try {
    [edsFetch, sourceFetch] = await Promise.all([
      fetchPage(EDS_URL),
      fetchPage(SOURCE_URL),
    ]);
  } catch (err) {
    console.error(`[compare-metadata] Fetch error: ${err.message}`);
    process.exit(2);
  }

  // Detect source page theme — used in Rule 1 and included in the report.
  //   New theme: <body id="ps-rsk-foundation">  (ps-rsk CSS/JS stack)
  //   Old theme: plain <body>  (legacy jQuery/TCM stack, tcm:222-* PIDs)
  const sourceTheme = sourceFetch.root.querySelector('#ps-rsk-foundation') ? 'new' : 'old';
  console.error(`[compare-metadata] Source theme: ${sourceTheme}`);

  // Playwright (links + footnotes + hrefs/4.4 share one browser session)
  const needSups = RULES.includes('links');
  const needFootnotes = RULES.includes('footnotes');
  const needLinkStyles = RULES.includes('hrefs');
  let rendered = { sups: [], footnotes: [], linkStyles: [] };

  if (needSups || needFootnotes || needLinkStyles) {
    try {
      rendered = await fetchSourceRendered(SOURCE_URL, { needSups, needFootnotes, needLinkStyles });
    } catch (err) {
      console.error(`[compare-metadata] Playwright error: ${err.message}`);
      if (needSups) RULES.splice(RULES.indexOf('links'), 1);
      if (needFootnotes) RULES.splice(RULES.indexOf('footnotes'), 1);
      // hrefs 4.1–4.3 don't need Playwright; 4.4 just skips (linkStyles stays [])
    }
  }

  // Reference pages (for links rule and hrefs rule)
  let refPages = [];
  const refRoots = []; // [{ pageKey, root }]

  if (RULES.includes('links') || RULES.includes('hrefs')) {
    refPages = extractReferencePaths(edsFetch.root);
    if (refPages.length > 0) {
      console.error(`[compare-metadata] [links] Reference pages found: ${refPages.map((r) => r.path).join(', ')}`);

      // Fetch all reference pages in parallel
      const fetches = await Promise.allSettled(
        refPages.map((r) => fetchPage(`${EDS_BASE_URL}${r.path}`)),
      );

      for (let i = 0; i < refPages.length; i++) {
        const result = fetches[i];
        if (result.status === 'fulfilled') {
          refRoots.push({ pageKey: refPages[i].path, root: result.value.root });
        } else {
          console.error(`[compare-metadata] [links] Could not fetch reference page "${refPages[i].path}": ${result.reason?.message}`);
        }
      }
      console.error(`[compare-metadata] [links] Reference pages fetched: ${refRoots.length}/${refPages.length}`);
    }
  }

  // Footnotes sheet
  let sheetRows = [];
  if (RULES.includes('footnotes')) {
    try {
      const sheet = await fetchFootnotesSheet(EDS_BASE_URL, EDS_PATH);
      sheetRows = sheet.rows;
    } catch (err) {
      console.error(`[compare-metadata] [footnotes] Sheet fetch error: ${err.message} — sheet check skipped.`);
    }
  }

  // ---- Run rules ----
  const ruleResults = {};
  let missingFromSheet = [];

  // Rule 0 — always runs regardless of --rules flag
  ruleResults.theme = ruleTheme(sourceFetch.root);

  for (const rule of RULES) {
    switch (rule) {
      case 'metadata':
        ruleResults.metadata = ruleMetadata(edsFetch.metadata, sourceFetch.metadata, sourceFetch.root);
        break;

      case 'links': {
        // Build page context list: main page first, then all reference pages
        const pageContexts = [
          { pageKey: 'main', root: edsFetch.root },
          ...refRoots,
        ];
        ruleResults.links = ruleSupLinksAllPages(pageContexts, rendered.sups || []);
        break;
      }

      case 'footnotes': {
        const { fields, missingFromSheet: missing } = ruleFootnotes(
          edsFetch.metadata,
          rendered.footnotes || [],
          sheetRows,
        );
        ruleResults.footnotes = fields;
        missingFromSheet = missing;
        break;
      }

      case 'hrefs': {
        // Build page context list: main page + all reference pages
        const pageContexts = [
          { pageKey: 'main', root: edsFetch.root },
          ...refRoots,
        ];
        // Pass JS-rendered source buttons for sub-rule 4.4
        ruleResults.hrefs = ruleLinkRewrites(pageContexts, rendered.linkStyles || []);
        break;
      }

      case 'section-metadata': {
        ruleResults['section-metadata'] = ruleSectionMetadata(edsFetch.root);
        break;
      }

      case 'broken-links': {
        // Derive source base URL (strip path from SOURCE_URL)
        const srcBase = SOURCE_URL.replace(/\/[^/]*$/, '').replace(/\/$/, '');
        // eslint-disable-next-line no-await-in-loop
        ruleResults['broken-links'] = await ruleBrokenLinks(edsFetch.root, EDS_BASE_URL, srcBase);
        break;
      }

      default:
        console.error(`[compare-metadata] Unknown rule: "${rule}" — skipping.`);
    }
  }

  const report = buildReport({
    edsUrl: EDS_URL,
    sourceUrl: SOURCE_URL,
    sourceTheme,
    edsFetch,
    sourceFetch,
    ruleResults,
    missingFromSheet,
    refPages,
  });

  const json = JSON.stringify(report, null, 2);

  if (OUTPUT) {
    writeFileSync(OUTPUT, json, 'utf8');
    console.error(`[compare-metadata] Report saved to: ${OUTPUT}`);
  } else {
    console.log(json);
  }

  process.exit(report.summary.actionsRequired > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[compare-metadata] Unexpected error: ${err.message}`);
  process.exit(2);
});
