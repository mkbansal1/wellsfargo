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
const DA_SHEET_SOURCE_URL = `https://admin.da.live/source/${DA_ORG}/${DA_SITE}/data/footnotes.json`;

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

  // Extract individual footnote entries with data-cid
  const cidPattern = /data-cid="([^"]+)"[^>]*data-ctid="([^"]*)"[^>]*>([\s\S]*?)(?=<\/(?:p|div)>\s*(?:<(?:p|div)[^>]*data-cid|$))/gi;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = cidPattern.exec(footnoteHTML)) !== null) {
    footnotes.push({
      cid: match[1],
      ctid: match[2],
      numbered: 'true',
      value: cleanValue(match[3]),
    });
  }

  // Fallback: parse numbered footnotes without data-cid attributes
  if (footnotes.length === 0) {
    // Pattern: number span followed by content
    const numPattern = /<(?:span|div)[^>]*>\s*(\d+)\.\s*<\/(?:span|div)>\s*([\s\S]*?)(?=<(?:span|div)[^>]*>\s*\d+\.|<div[^>]*class="[^"]*(?:equal-housing|footer)|$)/gi;
    // eslint-disable-next-line no-cond-assign
    while ((match = numPattern.exec(footnoteHTML)) !== null) {
      footnotes.push({
        cid: '',
        ctid: '',
        numbered: 'true',
        value: cleanValue(match[2]),
      });
    }

    // Try to extract cids from tcm links in the page
    const tcmLinks = footnoteHTML.match(/href="#(tcm:[^"]+)"/g) || [];
    const pageHTML = footnoteHTML;
    const allTcms = [...new Set(tcmLinks.map((l) => l.match(/tcm:[^"]+/)[0]))];

    // Map tcm cids to footnotes in order
    allTcms.forEach((tcm, idx) => {
      if (footnotes[idx]) {
        footnotes[idx].cid = tcm;
      }
    });
  }

  // Extract non-numbered items (Equal Housing Lender, division text, pageid)
  const equalHousing = footnoteHTML.match(/Equal Housing Lender/i);
  if (equalHousing) {
    footnotes.push({
      cid: 'equal-housing-lender',
      ctid: '',
      numbered: 'false',
      value: ':home: **Equal Housing Lender**',
    });
  }

  const divisionMatch = footnoteHTML.match(/Wells Fargo Home Mortgage is a division of Wells Fargo Bank, N\.A\./);
  if (divisionMatch) {
    footnotes.push({
      cid: 'wf-home-mortgage-division',
      ctid: '',
      numbered: 'false',
      value: 'Wells Fargo Home Mortgage is a division of Wells Fargo Bank, N.A.',
    });
  }

  return footnotes;
}

function cleanValue(html) {
  // Strip outer tags, clean whitespace
  return html
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function pushToDASheet(entries, lang, token) {
  // Fetch current sheet to get existing data
  const existing = await fetchExistingSheet(lang);
  const existingCids = new Set(existing.map((e) => e.cid));

  const newEntries = entries.filter((e) => e.cid && !existingCids.has(e.cid));

  if (newEntries.length === 0) {
    console.log('All footnotes already exist in sheet. Nothing to add.');
    return;
  }

  console.log(`Adding ${newEntries.length} new footnote(s) to ${lang} sheet...`);

  // Merge existing + new
  const merged = [...existing, ...newEntries];
  const sheetData = {
    total: merged.length,
    limit: merged.length,
    offset: 0,
    data: merged,
    ':colWidths': [200, 200, 80, 600],
    ':sheetname': lang,
    ':type': 'sheet',
  };

  const resp = await fetch(DA_SHEET_SOURCE_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sheetData),
  });

  if (resp.ok) {
    console.log(`✅ Sheet updated. Added: ${newEntries.map((e) => e.cid).join(', ')}`);
  } else {
    console.error(`❌ Failed to update sheet: ${resp.status} ${resp.statusText}`);
  }
}

async function main() {
  const args = parseArgs();
  const sourceUrl = args['source-url'];
  const lang = args.lang || 'en';
  const token = process.env.DA_TOKEN;

  if (!sourceUrl) {
    console.error('Usage: DA_TOKEN=<token> node sync-footnotes.js --source-url <url> [--lang en]');
    process.exit(1);
  }

  if (!token) {
    console.error('Error: DA_TOKEN environment variable required');
    process.exit(1);
  }

  console.log(`Syncing footnotes from: ${sourceUrl}`);
  console.log(`Language sheet: ${lang}`);

  // 1. Extract footnotes from source page
  const sourceFootnotes = await fetchSourceFootnotes(sourceUrl);
  console.log(`Found ${sourceFootnotes.length} footnote(s) in source page`);

  if (sourceFootnotes.length === 0) {
    console.log('No footnotes found in source. Done.');
    return;
  }

  // 2. Check existing sheet and push missing entries
  await pushToDASheet(sourceFootnotes, lang, token);

  console.log('Done.');
}

main();
