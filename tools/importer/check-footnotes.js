/* eslint-disable */
// Check imported page footnotes against the live DA footnotes sheet.
// Usage: node tools/importer/check-footnotes.js content/path.plain.html
const fs = require('fs');

const SHEET_URL = 'https://main--wellsfargo--mkbansal1.aem.live/data/footnotes.json';

async function checkFootnotes(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');

  // Extract footnotes CIDs from metadata
  const match = html.match(/footnotes<\/(?:p|div)>.*?<\/div><div>(?:<(?:p|div)>)?(tcm:[^<]+)/)
    || html.match(/footnotes<\/div><div>(tcm:[^<]+)/);
  if (!match) {
    console.log('No footnotes in page metadata for', filePath);
    return;
  }

  const pageCids = match[1].split(',').map(s => s.trim()).filter(Boolean);

  // Fetch live sheet
  const resp = await fetch(SHEET_URL);
  const data = await resp.json();
  const enCids = (data.en && data.en.data) ? data.en.data.map(r => r.cid) : [];
  const esCids = (data.es && data.es.data) ? data.es.data.map(r => r.cid) : [];
  const allCids = [...enCids, ...esCids];

  const missing = pageCids.filter(cid => !allCids.includes(cid));

  if (missing.length === 0) {
    console.log('✅ All footnotes exist in sheet.');
  } else {
    console.log('⚠️  ' + missing.length + ' footnote(s) MISSING from DA sheet:');
    console.log('   Add at: https://da.live/sheet#/mkbansal1/wellsfargo/data/footnotes');
    console.log('');
    missing.forEach(cid => console.log('  ' + cid));
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node tools/importer/check-footnotes.js <file.plain.html>');
  process.exit(1);
}

checkFootnotes(args[0]).catch(e => console.error(e.message));
