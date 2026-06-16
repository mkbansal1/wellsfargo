#!/usr/bin/env node
/**
 * patch-document.js
 *
 * Reads a DA (Document Authoring) HTML source, applies metadata fixes from a
 * compare-metadata report, and writes the patched HTML to stdout (or a file).
 *
 * DA metadata block format:
 *
 *   <div class="metadata">
 *     <div><div><p>Title</p></div><div><p>Page Title</p></div></div>
 *     <div><div><p>description</p></div><div><p>Description text</p></div></div>
 *     <div><div><p>keywords</p></div><div><p>kw1, kw2</p></div></div>
 *   </div>
 *
 * If no metadata block exists, a new one is created before </main>.
 *
 * Usage:
 *   node patch-document.js \
 *     --source source.html \
 *     --report report.json \
 *     [--output patched.html] \
 *     [--page  "main"|"/fragments/some/path"]
 *
 * --page (default: "main")
 *   Selects which page's fixes to apply from the report.
 *   • "main"          — applies metadata/footnotes fixes + links fixes for the main EDS page
 *   • "/fragments/..."— applies only links fixes tagged for that reference page path
 *
 * Exit codes:
 *   0  patch applied (or no changes needed)
 *   2  script error
 */

import { parse } from 'node-html-parser';
import { readFileSync, writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// CLI args
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

const args   = parseArgs(process.argv);
const SOURCE = args['source'];
const REPORT = args['report'];
const OUTPUT = args['output'] || null;
// PAGE selects which fixes to apply. Defaults to 'main'.
// For reference pages pass the EDS path e.g. /fragments/mortgage/learn/rate-lock/tab-about-your-rate
const PAGE   = args['page'] || 'main';

if (!SOURCE || !REPORT) {
  console.error('Usage: node patch-document.js --source <html-file> --report <report.json> [--output <patched.html>] [--page main|/fragments/...]');
  process.exit(2);
}

console.error(`[patch-document] Page context: "${PAGE}"`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// DA metadata block helpers
// ---------------------------------------------------------------------------

/**
 * Find the DA metadata div: <div class="metadata">
 * Guards against section-metadata by requiring at least one child div pair.
 */
function findDaMetadataDiv(root) {
  for (const div of root.querySelectorAll('div')) {
    const cls = (div.getAttribute('class') || '').split(/\s+/);
    if (cls.includes('metadata')) {
      const rows = div.querySelectorAll(':scope > div');
      if (rows.length > 0) return div;
    }
  }
  return null;
}

/**
 * Read existing key→value entries from a DA metadata div.
 * Returns Map<lowercase-key, { rowNode, keyNode, valueNode }>
 */
function readDaMetadataRows(metaDiv) {
  const map = new Map();
  for (const row of metaDiv.querySelectorAll(':scope > div')) {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length >= 2) {
      const key = cells[0].text.trim().toLowerCase();
      if (key) map.set(key, { rowNode: row, keyNode: cells[0], valueNode: cells[1] });
    }
  }
  return map;
}

/** Single DA row: <div><div><p>key</p></div><div><p>value</p></div></div> */
function buildDaRow(key, value) {
  return `<div><div><p>${escapeHtml(key)}</p></div><div><p>${escapeHtml(value)}</p></div></div>`;
}

/** Full DA metadata block for when none exists yet. */
function buildDaMetadataBlock(rows) {
  const rowsHtml = rows.map(([k, v]) => `  ${buildDaRow(k, v)}`).join('\n');
  return `<div class="metadata">\n${rowsHtml}\n</div>`;
}

/**
 * Patch a DA metadata div in-place.
 * Updates existing rows, appends missing ones.
 */
function patchDaMetadata(metaDiv, fixes) {
  const rowMap = readDaMetadataRows(metaDiv);
  const applied = [];

  for (const fix of fixes) {
    const key = fix.field.toLowerCase();
    const val = fix.expectedValue || '';

    if (fix.action === 'REMOVE') {
      if (rowMap.has(key)) {
        rowMap.get(key).rowNode.remove();
        console.error(`  [metadata] Removed "${key}" (global-metadata-only field)`);
        applied.push({ action: 'REMOVE', key });
      }
    } else if (rowMap.has(key)) {
      rowMap.get(key).valueNode.innerHTML = `<p>${escapeHtml(val)}</p>`;
      console.error(`  [metadata] Updated "${key}": "${val}"`);
      applied.push({ action: 'UPDATE', key, val });
    } else {
      metaDiv.insertAdjacentHTML('beforeend', buildDaRow(key, val));
      console.error(`  [metadata] Added   "${key}": "${val}"`);
      applied.push({ action: 'ADD', key, val });
    }
  }

  return applied;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const sourceHtml = readFileSync(SOURCE, 'utf8');
  const report     = JSON.parse(readFileSync(REPORT, 'utf8'));

  if (!report.fixes || report.fixes.length === 0) {
    console.error('[patch-document] No fixes required — document unchanged.');
    if (OUTPUT) writeFileSync(OUTPUT, sourceHtml, 'utf8');
    else process.stdout.write(sourceHtml);
    process.exit(0);
  }

  // Filter fixes for this page context:
  //   - metadata / footnotes fixes only apply to the main page
  //   - links fixes apply when fix.page matches PAGE (or no page field → treat as main)
  //   - hrefs fixes apply when fix.page matches PAGE
  const isMainPage  = PAGE === 'main';
  const pageFixes   = report.fixes.filter(f => {
    if (f.rule === 'metadata' || f.rule === 'footnotes') return isMainPage;
    if (f.rule === 'links')            return (f.page || 'main') === PAGE;
    if (f.rule === 'hrefs')            return (f.page || 'main') === PAGE;
    if (f.rule === 'section-metadata') return isMainPage;
    return false;
  });

  if (pageFixes.length === 0) {
    console.error(`[patch-document] No fixes for page "${PAGE}" — document unchanged.`);
    if (OUTPUT) writeFileSync(OUTPUT, sourceHtml, 'utf8');
    else process.stdout.write(sourceHtml);
    process.exit(0);
  }

  console.error(`[patch-document] Applying ${pageFixes.length} fix(es) for page "${PAGE}"...`);

  // -------------------------------------------------------------------------
  // Rule 4.1 — REWRITE_ABSOLUTE: global string replace BEFORE DOM parse
  // Done at raw-text level so it catches occurrences in any attribute, not
  // just href=. The patched string is then fed to the parser below.
  // -------------------------------------------------------------------------
  let htmlToParse = sourceHtml;
  const has41 = pageFixes.some(f => f.rule === 'hrefs' && f.action === 'REWRITE_ABSOLUTE');
  if (has41) {
    const WF_RE    = /https:\/\/www\.wellsfargo\.com\//g;
    const count41  = (htmlToParse.match(WF_RE) || []).length;
    htmlToParse    = htmlToParse.replace(WF_RE, '/');
    console.error(`[patch-document] [hrefs] 4.1: replaced ${count41} occurrence(s) of https://www.wellsfargo.com/`);
  }

  const root    = parse(htmlToParse, { comment: true });
  let   format  = 'da';
  const applied = [];

  // -------------------------------------------------------------------------
  // Rules: metadata + footnotes — both patch the DA metadata block
  //   metadata  → title, description, keywords rows
  //   footnotes → footnotes row (comma-separated cids)
  //   (only runs when PAGE === 'main')
  // -------------------------------------------------------------------------
  const metaFixes = pageFixes.filter(f => f.rule === 'metadata' || f.rule === 'footnotes');

  if (metaFixes.length > 0) {
    const daDiv = findDaMetadataDiv(root);

    if (daDiv) {
      format = 'da';
      console.error(`[patch-document] Found DA metadata block — patching in-place.`);
      applied.push(...patchDaMetadata(daDiv, metaFixes));
    } else {
      format = 'da-new';
      console.error(`[patch-document] No metadata block found — creating new DA block.`);
      const newRows   = metaFixes.map(f => [f.field.toLowerCase(), f.expectedValue || '']);
      const blockHtml = buildDaMetadataBlock(newRows);
      const main = root.querySelector('main');
      const body = root.querySelector('body');
      if (main)       main.insertAdjacentHTML('beforeend', `\n${blockHtml}\n`);
      else if (body)  body.insertAdjacentHTML('beforeend', `\n${blockHtml}\n`);
      else            root.insertAdjacentHTML('beforeend', `\n${blockHtml}\n`);
      applied.push(...metaFixes.map(f => ({ action: 'ADD', key: f.field, val: f.expectedValue })));
      console.error(`  [metadata] Created block with ${newRows.length} row(s).`);
    }
  }

  // -------------------------------------------------------------------------
  // Rule: links — fix sup footnote hrefs
  //   UPDATE_HREF  : <a href="WRONG"><sup>N</sup></a>  →  correct href
  //   WRAP_ANCHOR  : <sup>N</sup> (bare)               →  <a href="..."><sup>N</sup></a>
  //   ADD_SUP      : sup absent entirely               →  find best-match paragraph via
  //                  context-before text and append <a href="..."><sup>N</sup></a> to it.
  //                  Falls back to UNRESOLVED if no paragraph matches ≥ 50% of context words.
  // -------------------------------------------------------------------------
  const linkFixes = pageFixes.filter(f => f.rule === 'links');

  if (linkFixes.length > 0) {
    console.error(`[patch-document] Applying ${linkFixes.length} links fix(es)...`);

    for (const fix of linkFixes) {
      const { supNumber, action, expectedValue } = fix;

      if (action === 'UPDATE_HREF') {
        // Find every <a ...><sup>N</sup></a> and update its href
        let count = 0;
        for (const anchor of root.querySelectorAll('a')) {
          const sup = anchor.querySelector('sup');
          if (sup && sup.text.trim() === String(supNumber)) {
            const oldHref = anchor.getAttribute('href');
            anchor.setAttribute('href', expectedValue);
            console.error(`  [links] sup-${supNumber}: href "${oldHref}" → "${expectedValue}"`);
            count++;
          }
        }
        if (count === 0) {
          console.error(`  [links] sup-${supNumber}: WARNING — no matching <a><sup>${supNumber}</sup></a> found in document.`);
        }
        applied.push({ action, key: `sup-${supNumber}`, val: expectedValue });

      } else if (action === 'WRAP_ANCHOR') {
        // Wrap bare <sup>N</sup> (not inside <a>) with the correct anchor
        let count = 0;
        for (const sup of root.querySelectorAll('sup')) {
          if (sup.text.trim() !== String(supNumber)) continue;
          // Check it's not already inside an <a>
          let parent = sup.parentNode;
          let insideAnchor = false;
          while (parent) {
            if (parent.tagName === 'A') { insideAnchor = true; break; }
            parent = parent.parentNode;
          }
          if (insideAnchor) continue;
          // Replace the sup's outer HTML with the wrapped version
          sup.replaceWith(parse(`<a href="${expectedValue}">${sup.outerHTML}</a>`));
          console.error(`  [links] sup-${supNumber}: wrapped bare <sup> with <a href="${expectedValue}">`);
          count++;
        }
        if (count === 0) {
          console.error(`  [links] sup-${supNumber}: WARNING — no bare <sup>${supNumber}</sup> found to wrap.`);
        }
        applied.push({ action, key: `sup-${supNumber}`, val: expectedValue });

      } else if (action === 'ADD_SUP') {
        // Sup is absent from EDS entirely. Attempt to locate the correct paragraph using
        // the text snippet captured immediately before the sup in the source page.
        // Strategy:
        //   1. Tokenise contextBefore into significant words (length > 4).
        //   2. Score every <p> and <li> in the EDS document by what fraction of those
        //      words appear in its text content.
        //   3. If the best score is ≥ 0.50, append <a href="..."><sup>N</sup></a> to it.
        //   4. Otherwise log UNRESOLVED — the paragraph was not migrated; manual fix needed.
        const supHtml     = `<a href="${expectedValue}"><sup>${supNumber}</sup></a>`;
        // Normalise: strip special chars (®, ™ …) so "online®" doesn't mis-tokenise,
        // then lowercase and split into significant words (length > 4).
        const ctxRaw      = (fix.contextBefore || '')
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ').trim().toLowerCase();
        const ctxWords    = ctxRaw.split(/\s+/).filter(w => w.length > 4);

        let bestEl    = null;
        let bestScore = 0;

        if (ctxWords.length > 0) {
          for (const el of root.querySelectorAll('p, li')) {
            const elText = el.text.replace(/\s+/g, ' ').trim().toLowerCase();
            if (elText.length < 10) continue;
            const hits  = ctxWords.filter(w => elText.includes(w)).length;
            const score = hits / ctxWords.length;
            if (score > bestScore) { bestScore = score; bestEl = el; }
          }
        }

        if (bestEl && bestScore >= 0.5) {
          bestEl.insertAdjacentHTML('beforeend', supHtml);
          console.error(`  [links] sup-${supNumber}: appended to best-match paragraph (score: ${(bestScore * 100).toFixed(0)}%)`);
          console.error(`  [links] sup-${supNumber}:   context: "${ctxRaw.slice(-60)}"`);
          applied.push({ action: 'ADD_SUP', key: `sup-${supNumber}`, val: `${expectedValue} (match score: ${(bestScore * 100).toFixed(0)}%)` });
        } else {
          // No paragraph matched well enough — paragraph may not have been migrated.
          console.error(`  [links] sup-${supNumber}: ⚠️  UNRESOLVED — no EDS paragraph matched context (best score: ${(bestScore * 100).toFixed(0)}%).`);
          console.error(`  [links] sup-${supNumber}:    Manual fix: add ${supHtml} in the relevant paragraph.`);
          console.error(`  [links] sup-${supNumber}:    Context: "${ctxRaw.slice(-80)}"`);
          applied.push({ action: 'ADD_SUP_UNRESOLVED', key: `sup-${supNumber}`, val: expectedValue });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rule: hrefs — sub-rules 4.2 and 4.3 (4.1 was applied before DOM parse above)
  //
  //   4.2 STRIP_SLASH  — strip trailing / from internal href before end, ?, or #
  //   4.3 STRIP_ARROW  — strip trailing >, &gt;, or › from anchor innerHTML
  // -------------------------------------------------------------------------
  const hrefFixes = pageFixes.filter(f => f.rule === 'hrefs');

  if (hrefFixes.length > 0) {
    const has42 = hrefFixes.some(f => f.action === 'STRIP_SLASH');
    const has43 = hrefFixes.some(f => f.action === 'STRIP_ARROW');

    if (has41) applied.push({ action: 'REWRITE_ABSOLUTE', key: 'wf-*', val: '→ / (root-relative)' });

    // --- 4.2: strip trailing slash from internal href paths ---
    if (has42) {
      const SLASH_RE = /^(\/.+?)\/([?#].*)?$/;
      let count42 = 0;
      for (const anchor of root.querySelectorAll('a[href]')) {
        const href = anchor.getAttribute('href') || '';
        if (!href.startsWith('/')) continue;
        const m = href.match(SLASH_RE);
        if (m) {
          const fixed = m[1] + (m[2] || '');
          anchor.setAttribute('href', fixed);
          console.error(`  [hrefs] 4.2: "${href}" → "${fixed}"`);
          count42++;
        }
      }
      console.error(`  [hrefs] 4.2: ${count42} trailing slash(es) stripped`);
      applied.push({ action: 'STRIP_SLASH', key: 'slash-*', val: `${count42} link(s) fixed` });
    }

    // --- 4.3: strip trailing arrow glyph from anchor innerHTML ---
    // Negative lookbehind on > so we don't strip the > of a closing tag (e.g. </em>).
    if (has43) {
      const ARROW_RE = /\s*(?:&gt;|›|&rsaquo;|(?<![a-zA-Z0-9\/])>)\s*$/;
      let count43 = 0;
      for (const anchor of root.querySelectorAll('a')) {
        const inner = anchor.innerHTML;
        const fixed = inner.replace(ARROW_RE, '');
        if (fixed !== inner) {
          anchor.innerHTML = fixed;
          console.error(`  [hrefs] 4.3: stripped trailing arrow from <a href="${anchor.getAttribute('href') || ''}">`);
          count43++;
        }
      }
      console.error(`  [hrefs] 4.3: ${count43} trailing arrow(s) stripped`);
      applied.push({ action: 'STRIP_ARROW', key: 'arrow-*', val: `${count43} link(s) fixed` });
    }

    // --- 4.4: WRAP_STRONG / WRAP_EM — wrap anchor in <strong> (primary) or <em> (secondary) ---
    // fix.href is the normalized root-relative href used to locate the anchor in the DOM.
    // After 4.1 runs (string replace above), all https://www.wellsfargo.com/ prefixes have
    // already been stripped, so the EDS DOM now has root-relative hrefs that match fix.href.
    const wrap44Fixes = hrefFixes.filter(f => f.action === 'WRAP_STRONG' || f.action === 'WRAP_EM');
    if (wrap44Fixes.length > 0) {
      let count44 = 0;
      // Build a deduplicated set of (href, wrapTag) pairs so we don't double-wrap
      // if the report contains multiple findings for the same link.
      const alreadyWrapped = new Set();
      for (const fix of wrap44Fixes) {
        const wrapTag   = fix.action === 'WRAP_STRONG' ? 'strong' : 'em';
        const targetHref = fix.href;   // normalized root-relative

        for (const anchor of root.querySelectorAll('a[href]')) {
          if (anchor.getAttribute('href') !== targetHref) continue;

          // Skip if already wrapped by a prior fix pass
          const parentTag = (anchor.parentNode?.rawTagName || '').toLowerCase();
          if (parentTag === wrapTag) continue;

          // Wrap the anchor
          anchor.replaceWith(parse(`<${wrapTag}>${anchor.outerHTML}</${wrapTag}>`));
          console.error(`  [hrefs] 4.4: <a href="${targetHref}"> wrapped with <${wrapTag}>`);
          count44++;
        }
      }
      console.error(`  [hrefs] 4.4: ${count44} link(s) wrapped`);
      if (count44 > 0) {
        applied.push({ action: 'WRAP_LINK_STYLE', key: 'style-*', val: `${count44} link(s) wrapped` });
      }
    }

    // --- 4.5: FIX_PDF_LINK — fix -pdf extension + strip "opens in new window" from text ---
    // Scans ALL /assets/pdf/ anchors in the DOM (not just those in the report) so a single
    // pass fixes every broken PDF link on the page without needing per-link report entries.
    const has45 = hrefFixes.some(f => f.action === 'FIX_PDF_LINK');
    if (has45) {
      let count45Ext = 0, count45Text = 0;
      for (const anchor of root.querySelectorAll('a[href]')) {
        const href = anchor.getAttribute('href') || '';
        if (!/^\/assets\/pdf\//i.test(href)) continue;

        // Fix -pdf → .pdf extension
        if (/-pdf$/i.test(href)) {
          const fixedHref = href.replace(/-pdf$/i, '.pdf');
          anchor.setAttribute('href', fixedHref);
          console.error(`  [hrefs] 4.5: href "${href}" → "${fixedHref}"`);
          count45Ext++;
        }

        // Strip "opens in new window" (with optional surrounding parens/spaces)
        const inner    = anchor.innerHTML;
        const fixedInner = inner.replace(/\s*\(?\s*opens?\s+in\s+new\s+window\s*\)?\s*/gi, '').trim();
        if (fixedInner !== inner) {
          anchor.innerHTML = fixedInner;
          console.error(`  [hrefs] 4.5: stripped "opens in new window" from <a href="${anchor.getAttribute('href')}">`);
          count45Text++;
        }
      }
      console.error(`  [hrefs] 4.5: ${count45Ext} extension(s) fixed, ${count45Text} "opens in new window" stripped`);
      const parts = [];
      if (count45Ext  > 0) parts.push(`${count45Ext} href(s) fixed (-pdf → .pdf)`);
      if (count45Text > 0) parts.push(`${count45Text} link(s) stripped "opens in new window"`);
      if (parts.length > 0) {
        applied.push({ action: 'FIX_PDF_LINK', key: 'pdf-*', val: parts.join(', ') });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rule: section-metadata — add/update section Style in DA source sections
  //
  //   UPDATE_SECTION_META : add missing style names to the section's
  //                         <div class="section-metadata"> Style row.
  //                         Creates the block (and Style row) if absent.
  //
  // Sections in the DA source are indexed as main > div.
  // The sectionIndex in each fix matches the 0-based position of the section
  // in the rendered EDS page (same order as DA source sections).
  // -------------------------------------------------------------------------
  const sectionMetaFixes = pageFixes.filter(f => f.rule === 'section-metadata');

  if (sectionMetaFixes.length > 0) {
    console.error(`[patch-document] Applying ${sectionMetaFixes.length} section-metadata fix(es)...`);

    // In DA source, sections are plain <div> children of <main>
    const mainSections = Array.from(root.querySelectorAll('main > div'));

    for (const fix of sectionMetaFixes) {
      const { sectionIndex, missingStyles } = fix;

      if (!missingStyles || missingStyles.length === 0) continue; // nothing to do

      const section = mainSections[sectionIndex];
      if (!section) {
        console.error(`  [section-metadata] section ${sectionIndex + 1}: not found (only ${mainSections.length} sections) — skipping`);
        continue;
      }

      // ── find or create <div class="section-metadata"> ───────────────────
      // Use childNodes — node-html-parser does not expose .children
      let sectionMetaDiv = null;
      for (const child of Array.from(section.childNodes || [])) {
        if (child.tagName === 'DIV' &&
            (child.getAttribute('class') || '').trim() === 'section-metadata') {
          sectionMetaDiv = child;
          break;
        }
      }

      if (!sectionMetaDiv) {
        // ── CREATE new section-metadata block with Style row ──────────────
        const stylesHtml = missingStyles.join(', ');
        section.insertAdjacentHTML(
          'beforeend',
          `<div class="section-metadata"><div><div><p>style</p></div><div><p>${escapeHtml(stylesHtml)}</p></div></div></div>`
        );
        console.error(`  [section-metadata] section ${sectionIndex + 1}: created section-metadata { style: "${stylesHtml}" }`);
        applied.push({ action: 'CREATE_SECTION_META', key: `section-${sectionIndex + 1}`, val: stylesHtml });

      } else {
        // ── UPDATE existing section-metadata — find the Style row ─────────
        // Use childNodes — node-html-parser does not expose .children
        let styleValueCell = null;
        for (const row of Array.from(sectionMetaDiv.childNodes || [])) {
          if (row.tagName !== 'DIV') continue;
          const cells = Array.from(row.childNodes || []).filter(n => n.tagName === 'DIV');
          if (cells.length >= 2 &&
              cells[0].text.trim().toLowerCase() === 'style') {
            styleValueCell = cells[1];
            break;
          }
        }

        if (styleValueCell) {
          // Merge missing styles into existing value
          const existing = styleValueCell.text.trim()
            .split(',').map(s => s.trim()).filter(Boolean);
          const merged = [...existing];
          for (const s of missingStyles) {
            if (!merged.includes(s)) merged.push(s);
          }
          styleValueCell.innerHTML = `<p>${escapeHtml(merged.join(', '))}</p>`;
          console.error(`  [section-metadata] section ${sectionIndex + 1}: updated Style → "${merged.join(', ')}"`);
          applied.push({ action: 'UPDATE_SECTION_META', key: `section-${sectionIndex + 1}`, val: merged.join(', ') });

        } else {
          // Existing section-metadata but no Style row — add one
          sectionMetaDiv.insertAdjacentHTML(
            'beforeend',
            `<div><div><p>style</p></div><div><p>${escapeHtml(missingStyles.join(', '))}</p></div></div>`
          );
          const added = missingStyles.join(', ');
          console.error(`  [section-metadata] section ${sectionIndex + 1}: added Style row "${added}"`);
          applied.push({ action: 'ADD_SECTION_META_ROW', key: `section-${sectionIndex + 1}`, val: added });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Output
  // -------------------------------------------------------------------------
  const patched = root.toString();

  if (OUTPUT) {
    writeFileSync(OUTPUT, patched, 'utf8');
    console.error(`[patch-document] Patched document saved to: ${OUTPUT}`);
  } else {
    process.stdout.write(patched);
  }

  const patchSummary = {
    page: PAGE,
    format,
    appliedFixes: pageFixes.map(f => ({
      rule:   f.rule,
      field:  f.field,
      action: f.action,
      value:  f.expectedValue,
      ...(f.page && f.page !== 'main' ? { page: f.page } : {}),
    })),
    outputFile: OUTPUT || '(stdout)',
  };
  console.error(`\n[patch-document] Summary:\n${JSON.stringify(patchSummary, null, 2)}`);

  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(`[patch-document] Error: ${err.message}`);
  process.exit(2);
}
