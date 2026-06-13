#!/usr/bin/env node
/*
 * Footnote validation for post-processed content files.
 *
 * For each content file:
 *   - Extracts every footnote CID referenced in the body (#tcm:...) and in the
 *     Metadata "footnotes" field.
 *   - Cross-checks each CID against the live footnotes sheet (en or es,
 *     chosen by the file path: /es/ -> es, otherwise en).
 *   - Reports CIDs that are NOT present in the sheet (the ones an author must
 *     add), deduplicated across all files.
 *
 * Usage:
 *   node check-footnotes.mjs <file1.plain.html> [file2 ...] [--base=URL] [--json]
 *
 * Default base: https://main--wellsfargo--mkbansal1.aem.live
 */
import fs from 'fs';

const DEFAULT_BASE = 'https://main--wellsfargo--mkbansal1.aem.live';
const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const baseArg = args.find((a) => a.startsWith('--base='));
const BASE = baseArg ? baseArg.split('=')[1] : DEFAULT_BASE;
const asJson = args.includes('--json');

if (files.length === 0) {
  console.error('Usage: node check-footnotes.mjs <file...> [--base=URL] [--json]');
  process.exit(1);
}

// pageid prefixes that must never be treated as footnote CIDs
const PAGEID_RE = /^(DT1|DT2|QSR|LRC|PM)-/;

const sheetCache = new Map(); // sheet name -> Set of cids
async function loadSheet(sheet) {
  if (sheetCache.has(sheet)) return sheetCache.get(sheet);
  const set = new Set();
  try {
    const resp = await fetch(`${BASE}/data/footnotes.json?sheet=${sheet}`);
    if (resp.ok) {
      const json = await resp.json();
      (json.data || []).forEach((row) => {
        if (row.cid) set.add(row.cid.trim());
      });
    }
  } catch {
    // network failure -> empty set; everything reports as missing (visible signal)
  }
  sheetCache.set(sheet, set);
  return set;
}

function sheetForFile(filePath) {
  return /(^|\/)es\//.test(filePath) ? 'es' : 'en';
}

// Extract footnote CIDs from body links (#tcm:...) preserving first-seen order.
function extractCids(html) {
  const bodyCids = [];
  const seen = new Set();
  const hrefRe = /href="#?(tcm:[0-9-]+)"/g;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const cid = m[1];
    if (!seen.has(cid)) { seen.add(cid); bodyCids.push(cid); }
  }
  // CIDs declared in the Metadata footnotes field
  const metaCids = [];
  const metaMatch = html.match(/footnotes<\/p><\/div><div><p>([^<]*)<\/p>/)
    || html.match(/<td>footnotes<\/td>\s*<td>([^<]*)<\/td>/);
  if (metaMatch) {
    metaMatch[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((cid) => metaCids.push(cid));
  }
  return { bodyCids, metaCids };
}

async function run() {
  const perFile = [];
  const missingByCid = new Map(); // cid -> Set(pages)

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      perFile.push({ filePath, error: 'FILE_NOT_FOUND' });
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const sheet = sheetForFile(filePath);
    // eslint-disable-next-line no-await-in-loop
    const sheetCids = await loadSheet(sheet);
    const { bodyCids, metaCids } = extractCids(html);

    const allCids = [...new Set([...bodyCids, ...metaCids])]
      .filter((cid) => !PAGEID_RE.test(cid));

    const missing = allCids.filter((cid) => !sheetCids.has(cid));
    const pagePath = `/${filePath.replace(/^content\//, '').replace(/\.plain\.html$/, '').replace(/\.html$/, '')}`;

    missing.forEach((cid) => {
      if (!missingByCid.has(cid)) missingByCid.set(cid, new Set());
      missingByCid.get(cid).add(pagePath);
    });

    perFile.push({
      filePath,
      pagePath,
      sheet,
      bodyCount: bodyCids.length,
      metaCount: metaCids.length,
      totalCids: allCids.length,
      missingCount: missing.length,
      missing,
    });
  }

  const result = {
    base: BASE,
    files: perFile,
    missing: [...missingByCid.entries()].map(([cid, pages]) => ({
      cid,
      sheet: [...pages].some((p) => /^\/es\//.test(p)) ? 'es' : 'en',
      pages: [...pages],
    })),
  };

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable
  console.log(`\nFootnote validation (sheet base: ${BASE})\n`);
  perFile.forEach((f) => {
    if (f.error) {
      console.log(`  ✗ ${f.filePath} — ${f.error}`);
      return;
    }
    const flag = f.missingCount ? `⚠ ${f.missingCount} missing` : '✓ all present';
    console.log(`  ${f.pagePath} [${f.sheet}] — ${f.totalCids} CIDs, ${flag}`);
  });

  if (result.missing.length === 0) {
    console.log('\nAll footnote CIDs are present in footnotes.json.\n');
    return;
  }

  console.log(`\n=== Missing footnote CIDs (${result.missing.length} unique) ===\n`);
  console.log('| cid | sheet | Referenced on page(s) |');
  console.log('|-----|-------|----------------------|');
  result.missing.forEach((r) => {
    console.log(`| ${r.cid} | ${r.sheet} | ${r.pages.join(', ')} |`);
  });
  console.log('');
}

run();
