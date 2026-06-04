#!/usr/bin/env node
/**
 * EDS Sitemap URL Checker
 * Usage: node check-urls.js <sitemap-json-file> <eds-base-url> <output-csv-file>
 *
 * Reads URLs from a JSON file, maps them to the EDS domain, checks HTTP status,
 * writes results to CSV, and prints a summary.
 */

import { readFileSync, writeFileSync } from 'fs';
import { URL } from 'url';

const [,, sitemapJsonFile, edsBaseUrl, outputCsvFile, ...flags] = process.argv;

if (!sitemapJsonFile || !edsBaseUrl || !outputCsvFile) {
  console.error('Usage: node check-urls.js <sitemap-json-file> <eds-base-url> <output-csv-file> [--auth=user:pass]');
  process.exit(1);
}

const urls = JSON.parse(readFileSync(sitemapJsonFile, 'utf8'));
const edsBase = edsBaseUrl.replace(/\/$/, '');

// HTTP Basic Auth (for htaccess-protected environments)
const authFlag = flags.find(f => f.startsWith('--auth='))?.slice(7) || '';
const authHeaders = authFlag
  ? { Authorization: 'Basic ' + Buffer.from(authFlag).toString('base64') }
  : {};

const CONCURRENCY = 10;
const TIMEOUT_MS = 15000;

async function checkUrl(originalUrl) {
  let path;
  try {
    const parsed = new URL(originalUrl);
    path = parsed.pathname + (parsed.search || '');
  } catch {
    return { original_url: originalUrl, eds_url: '', status: 'INVALID_URL', redirect_location: '' };
  }

  const edsUrl = `${edsBase}${path}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(edsUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: authHeaders,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const status = response.status;
    let category;
    if (status === 200) category = '200';
    else if (status === 301 || status === 302 || status === 307 || status === 308) category = `REDIRECT_${status}`;
    else if (status === 404) category = '404';
    else category = `OTHER_${status}`;

    const redirectLocation = (status >= 300 && status < 400) ? (response.headers.get('location') || '') : '';

    return { original_url: originalUrl, eds_url: edsUrl, status: category, redirect_location: redirectLocation };
  } catch (err) {
    const errType = err.name === 'AbortError' ? 'TIMEOUT' : `ERROR: ${err.message.slice(0, 60)}`;
    return { original_url: originalUrl, eds_url: edsUrl, status: errType, redirect_location: '' };
  }
}

async function runWithConcurrency(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
      const pct = Math.round(((idx + 1) / items.length) * 100);
      process.stderr.write(`\r  Checking URLs: ${idx + 1}/${items.length} (${pct}%)`);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  process.stderr.write('\n');
  return results;
}

console.error(`\nChecking ${urls.length} URLs against EDS domain: ${edsBase}`);
const results = await runWithConcurrency(urls, checkUrl, CONCURRENCY);

// Write CSV
const header = 'original_url,eds_url,status,redirect_location';
const rows = results.map(r =>
  [r.original_url, r.eds_url, r.status, r.redirect_location]
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(',')
);
writeFileSync(outputCsvFile, [header, ...rows].join('\n') + '\n');

// Summary
const total = results.length;
const ok = results.filter(r => r.status === '200').length;
const notFound = results.filter(r => r.status === '404').length;
const redirects = results.filter(r => r.status.startsWith('REDIRECT_')).length;
const errors = total - ok - notFound - redirects;

console.log('\n=== URL Check Summary ===');
console.log(`Total pages:  ${total}`);
console.log(`200 OK:       ${ok}`);
console.log(`404 Not Found:${notFound}`);
console.log(`Redirects:    ${redirects}`);
console.log(`Other errors: ${errors}`);
console.log(`\nCSV written to: ${outputCsvFile}`);

if (notFound > 0) {
  console.log('\n--- 404 URLs ---');
  results.filter(r => r.status === '404').forEach(r => console.log(`  ${r.eds_url}`));
}
if (redirects > 0) {
  console.log('\n--- Redirects ---');
  results.filter(r => r.status.startsWith('REDIRECT_')).forEach(r =>
    console.log(`  ${r.eds_url} → ${r.redirect_location} (${r.status})`)
  );
}
if (errors > 0) {
  console.log('\n--- Other Errors ---');
  results.filter(r => r.status !== '200' && r.status !== '404' && !r.status.startsWith('REDIRECT_')).forEach(r =>
    console.log(`  ${r.eds_url} [${r.status}]`)
  );
}
