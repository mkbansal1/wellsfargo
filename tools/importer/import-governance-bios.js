/* eslint-disable */
/**
 * Batch importer for Wells Fargo governance/bio pages.
 * Extracts portrait + bio content → text-image block (default variant).
 *
 * Usage: node tools/importer/import-governance-bios.js
 * Requires: playwright (npx playwright install chromium)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URLS = [
  'https://www.wellsfargo.com/es/about/corporate/governance/black/',
  'https://www.wellsfargo.com/es/about/corporate/governance/chancy/',
  'https://www.wellsfargo.com/es/about/corporate/governance/craver/',
  'https://www.wellsfargo.com/es/about/corporate/governance/davis/',
  'https://www.wellsfargo.com/es/about/corporate/governance/engle/',
  'https://www.wellsfargo.com/es/about/corporate/governance/fercho/',
  'https://www.wellsfargo.com/es/about/corporate/governance/flowers/',
  'https://www.wellsfargo.com/es/about/corporate/governance/garcia/',
  'https://www.wellsfargo.com/es/about/corporate/governance/hewett/',
  'https://www.wellsfargo.com/es/about/corporate/governance/hranicky/',
  'https://www.wellsfargo.com/es/about/corporate/governance/ling/',
  'https://www.wellsfargo.com/es/about/corporate/governance/morken/',
  'https://www.wellsfargo.com/es/about/corporate/governance/morris/',
  'https://www.wellsfargo.com/es/about/corporate/governance/norwood/',
  'https://www.wellsfargo.com/es/about/corporate/governance/patterson/',
  'https://www.wellsfargo.com/es/about/corporate/governance/powell/',
  'https://www.wellsfargo.com/es/about/corporate/governance/ricci/',
  'https://www.wellsfargo.com/es/about/corporate/governance/rivas/',
  'https://www.wellsfargo.com/es/about/corporate/governance/rosenberg/',
  'https://www.wellsfargo.com/es/about/corporate/governance/santomassimo/',
  'https://www.wellsfargo.com/es/about/corporate/governance/santos/',
  'https://www.wellsfargo.com/es/about/corporate/governance/sargent/',
  'https://www.wellsfargo.com/es/about/corporate/governance/scharf/',
  'https://www.wellsfargo.com/es/about/corporate/governance/sommers/',
  'https://www.wellsfargo.com/es/about/corporate/governance/vanbeurden/',
  'https://www.wellsfargo.com/es/about/corporate/norwest/',
];

const OUTPUT_DIR = path.resolve(__dirname, '../../content/es/about/corporate/governance');

async function extractBioPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const title = document.title || '';
    const h1 = document.querySelector('h1');
    const name = h1 ? h1.textContent.trim() : '';

    // Find portrait image
    const img = document.querySelector('img[src*="portrait"], img[src*="155x198"]');
    const imgSrc = img ? img.src : '';

    // Find pageid
    let pageid = '';
    const allText = document.body.innerText;
    const dtMatch = allText.match(/DT1-[\d]+-[\d]+-[\d]+-[\d.]+/);
    if (dtMatch) pageid = dtMatch[0];

    // Find main bio content container
    // The content is in the first generic div after the share buttons area
    const mainContent = document.querySelector('[id="skip"]')
      || document.querySelector('main')
      || document.body;

    // Get the bio content — capture all h3, p, ul, ol from the main content area only
    let bioHTML = '';
    // The bio content is inside the main content column (not sidebar/complementary)
    const mainCol = document.querySelector('[id="skip"]')
      ? document.querySelector('[id="skip"]').parentElement
      : null;
    // Find the content div that contains the portrait and bio text
    const contentDivs = document.querySelectorAll('body > div > div > div > div, body > div > div > div');
    let bioContainer = null;
    for (const div of contentDivs) {
      if (div.querySelector('img[src*="portrait"], img[src*="155x198"]') && div.querySelectorAll('p').length > 1) {
        bioContainer = div;
        break;
      }
    }

    const bioElements = [];
    if (bioContainer) {
      const els = bioContainer.querySelectorAll('h3, p, ul, ol');
      let capturing = false;
      for (const el of els) {
        // Skip elements inside complementary/aside regions
        if (el.closest('[role="complementary"], aside, .onetrust-pc-dark-filter, [id*="onetrust"], [class*="onetrust"], [class*="ot-"]')) continue;

        const text = el.textContent.trim();

        // Start capturing at first h3 or first p with strong or sufficient content
        if (!capturing) {
          if (el.tagName === 'H3' || el.querySelector('strong') || (el.tagName === 'P' && text.length > 30 && !text.includes('Choose a link'))) {
            capturing = true;
          }
        }
        if (!capturing) continue;

        // Stop conditions
        if (text.match(/^DT1-/)) break;
        if (text === 'More Resources' || text === 'Contact Us') break;
        if (text.includes('Board of Directors') && el.closest('ul.c14, [class*="c14"]')) break;
        if (text.includes('Code of Conduct') && el.closest('ul')) break;
        if (text.includes('would like to get in touch with a board member')) break;
        if (text.includes('Selecione Cancele') || text.includes('Navegó a una página')) break;
        if (text.includes('Manage preferences') || text.includes('Cookie List')) break;
        if (el.classList.contains('Disclosure') || el.closest('[class*="Disclosure"]')) continue;

        // Skip duplicate image inside content
        const html = el.outerHTML;
        if (html.includes('class="left"') && html.includes('<img')) continue;

        bioElements.push(html);
      }
    }

    bioHTML = bioElements.join('');

    return { title, name, imgSrc, pageid, bioHTML };
  });

  return data;
}

function buildPlainHTML(data) {
  const { name, imgSrc, pageid, bioHTML, title } = data;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

  const imgTag = imgSrc
    ? `<picture><img src="${imgSrc}" alt="${name}"></picture>`
    : '';

  const lines = [];
  lines.push(`<div><h1 id="${slug}">${name}</h1></div>`);
  lines.push(`<div><div class="text-image"><div><div>${imgTag}</div><div>${bioHTML}</div></div></div></div>`);
  lines.push(`<div><div class="fragment"><div><div><p>/fragments/about/corporate/governance/contact-us</p></div></div></div></div>`);

  // Metadata
  let metaRows = '';
  metaRows += `<div><div><p>Title</p></div><div><p>${title}</p></div></div>`;
  if (pageid) {
    metaRows += `<div><div><p>pageid</p></div><div><p>${pageid}</p></div></div>`;
  }
  lines.push(`<div><div class="metadata">${metaRows}</div></div>`);

  return lines.join('\n');
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    locale: 'es-US',
    extraHTTPHeaders: { 'Accept-Language': 'es-US,es;q=0.9' },
  });
  const page = await context.newPage();

  for (const url of URLS) {
    const slug = url.split('/').filter(Boolean).pop();
    // norwest is under /about/corporate/ not /about/corporate/governance/
    let outFile;
    if (slug === 'norwest') {
      const norwestDir = path.resolve(OUTPUT_DIR, '..');
      if (!fs.existsSync(norwestDir)) fs.mkdirSync(norwestDir, { recursive: true });
      outFile = path.join(norwestDir, `${slug}.plain.html`);
    } else {
      outFile = path.join(OUTPUT_DIR, `${slug}.plain.html`);
    }

    try {
      console.log(`Importing: ${url}`);
      const data = await extractBioPage(page, url);

      if (!data.name) {
        console.error(`  ⚠️  No H1 found, skipping`);
        continue;
      }

      const html = buildPlainHTML(data);
      fs.writeFileSync(outFile, html);
      console.log(`  ✅ ${outFile} (${data.name})`);
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

main();
