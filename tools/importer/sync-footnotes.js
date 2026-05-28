#!/usr/bin/env node

/**
 * Sync Footnotes to DA Sheet
 *
 * Reads imported page metadata for footnote cids, checks if they exist
 * in the DA footnotes sheet, and adds missing entries.
 *
 * Usage:
 *   DA_TOKEN=<token> node tools/importer/sync-footnotes.js \
 *     --source-url https://www.wellsfargo.com/mortgage/page/ \
 *     --lang en
 *
 * Prerequisites:
 *   - DA_TOKEN environment variable set
 *   - Source page accessible (for extracting footnote values)
 *   - DA sheet exists at /data/footnotes.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const DA_ORG = 'mkbansal1';
const DA_SITE = 'wellsfargo';
const SHEET_PREVIEW_URL = `https://main--${DA_SITE}--${DA_ORG}.aem.page/data/footnotes.json`;

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace('--', '');
    args[key] = process.argv[i + 1];
  }
  return args;
}

async function fetchExistingSheet(lang) {
  const url = `${SHEET_PREVIEW_URL}?sheet=${lang}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data || [];
  } catch (e) {
    console.error(`Failed to fetch sheet: ${e.message}`);
    return [];
  }
}

async function fetchSourceFootnotes(sourceUrl) {
  // Use a simple fetch to get the HTML and parse footnotes
  try {
    const resp = await fetch(sourceUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    return extractFootnotesFromHTML(html);
  } catch (e) {
    console.error(`Failed to fetch source page: ${e.message}`);
    return [];
  }
}

function extractFootnotesFromHTML(html) {
  const footnotes = [];

  // Find the ps-footnote section
  const footnoteMatch = html.match(/<div[^>]*class="[^"]*ps-footnote[^"]*"[^>]*>([\s\S]*?)(?=<\/div>\s*<(?:footer|div[^>]*class="[^"]*ps-footer))/i);
  if (!footnoteMatch) return footnotes;

  const footnoteHTML = footnoteMatch[1];

  // Extract ALL entries with data-cid (both numbered and non-numbered)
  const cidPattern = /(<[^>]*data-cid="([^"]*)"[^>]*data-ctid="([^"]*)"[^>]*>)([\s\S]*?)(?=<\/(?:p|div)>\s*(?:<(?:p|div)[^>]*data-cid|<div[^>]*class="[^"]*ps-|$))/gi;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = cidPattern.exec(footnoteHTML)) !== null) {
    const fullTag = match[1];
    const cid = match[2];
    const ctid = match[3];
    const rawValue = match[4];

    // Skip if value looks like modal/overlay content
    if (rawValue.includes('You are leaving') || rawValue.includes('ps-btn-secondary')) continue;
    // Skip pageid entries (DT pattern)
    if (/^DT\d+-/.test(cleanValue(rawValue))) continue;

    // Determine if numbered: check data-numbered attribute on the tag, then fallback to content patterns
    const isNumbered = fullTag.includes('data-numbered="true"')
      || /^\s*(<[^>]*>)?\s*\d+\./.test(rawValue) || rawValue.includes('footnote-number');

    footnotes.push({
      cid,
      ctid,
      numbered: isNumbered ? 'true' : 'false',
      value: cleanValue(rawValue),
    });
  }

  // Fallback if no data-cid attributes found: parse by structure
  if (footnotes.length === 0) {
    // Match numbered paragraphs: <span>N.</span> followed by content
    const numPattern = /<(?:span|div)[^>]*class="[^"]*footnote-number[^"]*"[^>]*>\s*(\d+)\.\s*<\/(?:span|div)>\s*([\s\S]*?)(?=<(?:span|div)[^>]*class="[^"]*footnote-number|$)/gi;
    // eslint-disable-next-line no-cond-assign
    while ((match = numPattern.exec(footnoteHTML)) !== null) {
      footnotes.push({
        cid: '',
        ctid: '',
        numbered: 'true',
        value: cleanValue(match[2]),
      });
    }
  }

  return footnotes;
}

function cleanValue(html) {
  // Clean whitespace but preserve <p> and inline tags (sup, a, strong)
  let cleaned = html
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Ensure wrapped in <p> if not already
  if (!cleaned.startsWith('<p')) {
    cleaned = `<p>${cleaned}</p>`;
  }
  return cleaned;
}

async function reportMissingEntries(entries, lang) {
  const existing = await fetchExistingSheet(lang);
  const existingCids = new Set(existing.map((e) => e.cid));

  const newEntries = entries.filter((e) => e.cid && !existingCids.has(e.cid));

  if (newEntries.length === 0) {
    console.log('✅ All footnotes already exist in sheet. Nothing to add.');
    return;
  }

  console.log(`\n⚠️  ${newEntries.length} footnote(s) MISSING from DA sheet (${lang}):`);
  console.log(`   Add them manually at: https://da.live/sheet#/${DA_ORG}/${DA_SITE}/data/footnotes\n`);
  console.log('┌──────────────────────────┬───────────────────────┬──────────┬─────────────────────────────────────────┐');
  console.log('│ cid                      │ ctid                  │ numbered │ value (first 40 chars)                   │');
  console.log('├──────────────────────────┼───────────────────────┼──────────┼─────────────────────────────────────────┤');
  newEntries.forEach((e) => {
    const cid = (e.cid || '').padEnd(24);
    const ctid = (e.ctid || '').padEnd(21);
    const num = (e.numbered || 'false').padEnd(8);
    const val = (e.value || '').replace(/<[^>]*>/g, '').substring(0, 39).padEnd(39);
    console.log(`│ ${cid} │ ${ctid} │ ${num} │ ${val} │`);
  });
  console.log('└──────────────────────────┴───────────────────────┴──────────┴─────────────────────────────────────────┘');

  // Also output as JSON for easy copy
  console.log('\nJSON (copy to sheet):');
  newEntries.forEach((e) => {
    console.log(JSON.stringify(e));
  });
}

async function main() {
  const args = parseArgs();
  const sourceUrl = args['source-url'];
  const lang = args.lang || 'en';

  if (!sourceUrl) {
    console.error('Usage: node sync-footnotes.js --source-url <url> [--lang en]');
    process.exit(1);
  }

  console.log(`Checking footnotes from: ${sourceUrl}`);
  console.log(`Language sheet: ${lang}`);

  // 1. Extract footnotes from source page
  const sourceFootnotes = await fetchSourceFootnotes(sourceUrl);
  console.log(`Found ${sourceFootnotes.length} footnote(s) in source page`);

  if (sourceFootnotes.length === 0) {
    console.log('No footnotes found in source. Done.');
    return;
  }

  // 2. Report missing entries (manual add to DA sheet required)
  await reportMissingEntries(sourceFootnotes, lang);
}

main();
