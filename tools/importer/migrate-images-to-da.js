#!/usr/bin/env node

/**
 * Migrate external (wellsfargomedia.com) images in imported pages to DA.
 *
 * For each page, every external <img src> is:
 *   1. downloaded from the source
 *   2. uploaded to the page's DA hidden folder  (a/b/c -> a/b/.c/<name>.<ext>)
 *   3. rewritten in the .plain.html to the content.da.live URL
 *
 * Usage: DA_TOKEN=<token> node tools/importer/migrate-images-to-da.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DA_ORG = 'mkbansal1';
const DA_SITE = 'wellsfargo';
const ADMIN_BASE = 'https://admin.da.live/source';
const CONTENT_BASE = `https://content.da.live/${DA_ORG}/${DA_SITE}`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// page file (relative to repo) -> DA page path (no extension)
const PAGES = [
  ['content/checking/clear-access-banking.plain.html', 'checking/clear-access-banking'],
  ['content/checking/early-pay-day.plain.html', 'checking/early-pay-day'],
  ['content/checking/extra-day-grace-period.plain.html', 'checking/extra-day-grace-period'],
  ['content/checking/overdraft-services.plain.html', 'checking/overdraft-services'],
  ['content/checking/premier.plain.html', 'checking/premier'],
  ['content/checking/premier/account-benefits.plain.html', 'checking/premier/account-benefits'],
  ['content/checking/premier/account-fees-summary.plain.html', 'checking/premier/account-fees-summary'],
  ['content/checking/premier/identification-required-to-open.plain.html', 'checking/premier/identification-required-to-open'],
  ['content/checking/prime.plain.html', 'checking/prime'],
  ['content/checking/prime/account-benefits.plain.html', 'checking/prime/account-benefits'],
  ['content/checking/prime/account-fees-summary.plain.html', 'checking/prime/account-fees-summary'],
  ['content/checking/prime/identification-required-to-open.plain.html', 'checking/prime/identification-required-to-open'],
  ['content/checking/product-selector.plain.html', 'checking/product-selector'],
  ['content/checking/student.plain.html', 'checking/student'],
  ['content/checking/switch.plain.html', 'checking/switch'],
];

// page path "a/b/c" -> DA hidden folder "a/b/.c"
function hiddenFolder(pagePath) {
  const parts = pagePath.split('/');
  const last = parts.pop();
  return [...parts, `.${last}`].join('/');
}

// derive a clean DA filename from a source URL basename
function cleanName(srcUrl) {
  let base = decodeURIComponent(srcUrl.split('/').pop().split('?')[0]);
  const dot = base.lastIndexOf('.');
  let name = dot > 0 ? base.slice(0, dot) : base;
  let ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : 'png';
  name = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${name}.${ext}`;
}

const contentTypeByExt = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
};

async function downloadImage(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`download ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  return buf;
}

async function uploadImage(token, daPath, buf, ext) {
  const form = new FormData();
  const type = contentTypeByExt[ext] || 'application/octet-stream';
  form.append('data', new Blob([buf], { type }), daPath.split('/').pop());
  const resp = await fetch(`${ADMIN_BASE}/${DA_ORG}/${DA_SITE}/${daPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return resp.status;
}

async function main() {
  const token = process.env.DA_TOKEN;
  if (!token) { console.error('DA_TOKEN required'); process.exit(1); }

  const uploadCache = new Map(); // sourceUrl+folder -> daUrl (avoid re-uploading same file to same folder)
  let totalImgs = 0; let uploaded = 0; let failed = 0;

  for (const [file, pagePath] of PAGES) {
    const abs = resolve(file);
    let html = readFileSync(abs, 'utf-8');
    const folder = hiddenFolder(pagePath);
    const srcs = [...new Set([...html.matchAll(/https:\/\/www17\.wellsfargomedia\.com[^"')\s]+/g)].map((m) => m[0]))];
    if (srcs.length === 0) { console.log(`— ${pagePath}: no external images`); continue; }
    console.log(`\n${pagePath}  (${srcs.length} unique)`);

    for (const src of srcs) {
      totalImgs += 1;
      const fname = cleanName(src);
      const ext = fname.split('.').pop();
      const daPath = `${folder}/${fname}`;
      const daUrl = `${CONTENT_BASE}/${daPath}`;
      const cacheKey = daPath;

      if (!uploadCache.has(cacheKey)) {
        try {
          const buf = await downloadImage(src);
          const status = await uploadImage(token, daPath, buf, ext);
          if (status >= 200 && status < 300) {
            uploadCache.set(cacheKey, daUrl);
            uploaded += 1;
            console.log(`  ✅ ${status} ${fname} (${buf.length}b)`);
          } else {
            failed += 1;
            console.log(`  ❌ upload ${status} ${fname}`);
            continue;
          }
        } catch (e) {
          failed += 1;
          console.log(`  ❌ ${e.message} ${src}`);
          continue;
        }
      }
      // rewrite all occurrences of this src in the page
      html = html.split(src).join(daUrl);
    }
    writeFileSync(abs, html, 'utf-8');
  }

  console.log(`\nDone. images:${totalImgs} uploaded:${uploaded} failed:${failed}`);
}

main();
