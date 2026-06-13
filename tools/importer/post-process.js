/* eslint-disable */
// Post-processes imported .plain.html files to fix serialization issues.
// Run after bulk import: node tools/importer/post-process.js content/path/to/page.plain.html
//
// Actions performed:
//   - Footnote refs normalized to <sup><a href="#tcm:...">N</a></sup>
//       (handles "Opens a modal dialog" text, anchors with extra attributes,
//        and bare <a href="#tcm:">N</a> not yet wrapped in <sup>)
//   - Footnote with LOST CID (anchor href="/" or "#" + "Opens a modal dialog for
//       footnote N" text) reduced to bare <sup>N</sup> and WARNED (CID unrecoverable)
//   - Trailing arrow baked into link text (">", "&gt;", "›") stripped — arrows are
//       CSS decoration, not content
//   - Metadata block missing a Keywords row is WARNED (keywords must be authored
//       verbatim from the source <meta name="keywords">)
//   - Absolute wellsfargo.com links -> relative
//   - Internal links: trailing slash removed, including before ?query and #hash
//       (never touches external links or bare "/")
//   - Hero / Learning Navigation / Tabs serialization fixes
//   - Personal-loans helpful-resources fragment replacement
//   - Orphan line joining, fragment separation, bare-text <p> wrapping
//   - Section-metadata generation for H2 sections; accordions ALWAYS get narrow-width
//   - pageid (DT1/DT2/QSR/LRC/PM) stripped from the footnotes CID list
//   - Footnote <ol> flattened to <p> items (no ordered-list numbering)
//   - Per-line <div> balance repair
//
// Format support: works on both freshly-imported single-line-per-section files
// AND DA-pulled files wrapped as <body><header></header><main>…</main><footer></footer></body>
// (auto-detects the wrapper, processes the inner sections, then re-wraps).
// It does NOT convert rendered <div class="blockname"> markup into DA <table>
// authoring format — that conversion is manual.
const fs = require('fs');
const path = require('path');
const { glob } = require('fs').promises ? { glob: null } : {};

// Split the top-level section <div>…</div> children of a container string onto
// their own lines (depth-aware), so the line-based pipeline can process them.
function splitTopLevelDivs(inner) {
  const lines = [];
  let depth = 0;
  let start = -1;
  let i = 0;
  while (i < inner.length) {
    if (inner.startsWith('<div', i) && (inner[i + 4] === '>' || inner[i + 4] === ' ')) {
      if (depth === 0) start = i;
      depth += 1;
      i += 4;
    } else if (inner.startsWith('</div>', i)) {
      depth -= 1;
      i += 6;
      if (depth === 0 && start !== -1) {
        lines.push(inner.slice(start, i));
        start = -1;
      }
    } else {
      i += 1;
    }
  }
  // Any stray non-div text (whitespace) is dropped; sections are what matter.
  return lines.length ? lines.join('\n') : inner.trim();
}

function postProcess(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const warnings = [];

  // DA-format adapter: pages pulled from DA are wrapped as
  //   <body><header></header><main>…sections…</main><footer></footer></body>
  // The line-based pipeline expects one section <div> per line with no wrappers.
  // Detect the wrapper, operate on the <main> inner content, then re-wrap.
  const daMatch = html.match(/^\s*<body>\s*<header>\s*<\/header>\s*<main>([\s\S]*)<\/main>\s*<footer>\s*<\/footer>\s*<\/body>\s*$/);
  const isDaFormat = !!daMatch;
  if (isDaFormat) {
    html = splitTopLevelDivs(daMatch[1].trim());
  }

  // 1. Fix footnote references
  // Pattern 1: <a href="...tcm:..."><sup>Opens a modal dialog for footnote N</sup></a>
  html = html.replace(/<a href="([^"]*tcm:[^"]*)"[^>]*><sup>Opens a modal dialog for footnote (\d+)<\/sup>\s*<\/a>/g, '<sup><a href="$1">$2</a></sup>');
  // Pattern 2: <a href="...tcm:...">Opens a modal dialog for footnote N</a> (inside <sup>)
  html = html.replace(/<a href="([^"]*tcm:[^"]*)"[^>]*>Opens a modal dialog for footnote (\d+)<\/a>/g, '<a href="$1">$2</a>');
  // Pattern 3: <a [..attrs..] href="#tcm:..." [..attrs..]><sup>N</sup></a> → <sup><a href="#tcm:...">N</a></sup>
  // Generalized to allow extra attributes on the anchor (class, data-footnote, etc.).
  html = html.replace(/<a\b[^>]*?href="(#tcm:[^"]+)"[^>]*><sup>(\d+)<\/sup><\/a>/g, '<sup><a href="$1">$2</a></sup>');
  // Pattern 4: any footnote anchor whose only child is a number but is NOT wrapped in <sup>
  //   <a href="#tcm:...">N</a>  →  <sup><a href="#tcm:...">N</a></sup>  (skip if already in <sup>)
  html = html.replace(/(<sup>)?<a\b[^>]*?href="(#tcm:[^"]+)"[^>]*>(\d+)<\/a>(<\/sup>)?/g, (m, openSup, href, num, closeSup) => {
    if (openSup && closeSup) return m; // already correctly wrapped
    return `<sup><a href="${href}">${num}</a></sup>`;
  });
  // Pattern 5: footnote whose CID was LOST during import — the anchor points at
  //   "/" (or "#") and still shows the "Opens a modal dialog for footnote N" text.
  //   The CID is gone, so it cannot be auto-recovered. Strip the broken anchor to a
  //   bare "<sup>N</sup>" marker and WARN so an author can wire the correct CID.
  html = html.replace(/<a href="[/#]"[^>]*><sup>Opens a modal dialog for footnote (\d+)<\/sup>\s*<\/a>/g, (m, num) => {
    warnings.push(`footnote ${num}: CID lost on import (href was "/" or "#") — superscript left bare, author must add the #tcm: CID`);
    return `<sup>${num}</sup>`;
  });

  // 1b. Strip a trailing arrow that was baked into LINK TEXT (e.g. "Learn more >",
  //   "Learn more &gt;", "Learn more ›"). The arrow is decoration added by CSS, not
  //   content — it must not live in the authored text. Only trims the trailing glyph,
  //   never inner markup.
  html = html.replace(/(>[^<]*?)\s*(?:&gt;|›|>)\s*(<\/a>)/g, '$1$2');

  // 2. Convert absolute wellsfargo.com links to relative and strip trailing slash.
  html = html.replace(/https:\/\/www\.wellsfargo\.com\//g, '/');
  // 2a. Internal links: remove trailing slash (we don't support it).
  //   - href="/path/"            -> href="/path"
  //   - href="/path/?query"      -> href="/path?query"  (slash before query)
  //   - href="/path/#hash"       -> href="/path#hash"   (slash before hash)
  //   Never touches external (http...) links or the bare root href="/".
  html = html.replace(/href="(\/[^"?#]+)\/([?#][^"]*)?"/g, 'href="$1$2"');

  // 3. Fix hero serialization issue (<p>Hero...</p> → proper block div)
  // The serializer outputs "Hero" as text prefix before image content instead of a block table.
  // Fragment blocks inside hero content become sibling blocks in the same section.
  html = html.replace(
    /<div><p>Hero(<picture>.*?<\/picture>)<\/p>(.*?)(<div class="section-metadata">.*?<\/div><\/div>)<\/div>/g,
    (match, picture, content, sectionMeta) => {
      // Extract fragment blocks from content — they stay in the section, just outside the hero
      let heroContent = content;
      let fragmentBlocks = '';
      heroContent = heroContent.replace(/<div class="fragment">(<div><div>.*?<\/div><\/div>)<\/div>/g, (frag) => {
        fragmentBlocks += frag;
        return '';
      });
      return '<div><div class="hero"><div><div><p>' + picture + '</p>' + heroContent + '</div></div></div>'
        + fragmentBlocks + sectionMeta + '</div>';
    },
  );

  // 3a. Fix hero where "Hero" is in its own <p> tag, picture in next <p> tag
  // Pattern: <p>Hero</p><p><picture>...</picture></p> → <div class="hero overlay-bottom">
  html = html.replace(
    /<p>Hero<\/p><p>(<picture>.*?<\/picture>)<\/p>(.*?)(<div class="section-metadata">.*?<\/div><\/div>)<\/div>/g,
    (match, picture, content, sectionMeta) => {
      return '<div class="hero overlay-bottom"><div><div><p>' + picture + '</p>' + content + '</div></div></div>'
        + sectionMeta + '</div>';
    },
  );

  // 3b. Fix Learning Navigation block serialization issues:
  //   - Image before block → move inside as row 1
  //   - UL in 2-column row → single column
  //   - footnotes/pageid rows inside block → move to Metadata
  let extractedFootnotes = '';
  let extractedPageid = '';

  const lnLines = html.split('\n');
  for (let li = 0; li < lnLines.length; li++) {
    const line = lnLines[li];
    if (!line.includes('learning-navigation')) continue;

    // Extract the image (picture tag before the block)
    const imgMatch = line.match(/<picture><img src="[^"]*"[^>]*><\/picture>/);
    // Extract the UL with nav links
    const ulMatch = line.match(/<ul>.*?<\/ul>/);
    // Extract footnotes CIDs
    const fnMatch = line.match(/<div><div>(?:<p>)?footnotes(?:<\/p>)?<\/div><div>(?:<p>)?(tcm:[^<]+)(?:<\/p>)?<\/div><\/div>/);
    if (fnMatch) extractedFootnotes = fnMatch[1];
    // Extract pageid
    const pidMatch = line.match(/<div><div>(?:<p>)?pageid(?:<\/p>)?<\/div><div>(?:<p>)?([^<]+?)(?:<\/p>)?<\/div><\/div>/);
    if (pidMatch) extractedPageid = pidMatch[1].trim();

    if (imgMatch && ulMatch) {
      // Extract heading (h1) if present at the start
      const h1Match = line.match(/^<div>(<h1[^>]*>.*?<\/h1>)/);
      const h1 = h1Match ? h1Match[1] : '';

      // Rebuild the section line with clean learning-navigation block
      lnLines[li] = '<div>' + h1
        + '<div class="learning-navigation">'
        + '<div><div>' + imgMatch[0] + '</div></div>'
        + '<div><div>' + ulMatch[0] + '</div></div>'
        + '</div></div>';
    }
    break;
  }
  html = lnLines.join('\n');

  // 3c. Fix Tabs block: remove footnotes/pageid rows absorbed by serializer
  const tabLines = html.split('\n');
  for (let ti = 0; ti < tabLines.length; ti++) {
    const line = tabLines[ti];
    if (!line.includes('class="tabs')) continue;
    // Extract footnotes/pageid from inside the tabs block
    const fnMatch = line.match(/<div><div>(?:<p>)?footnotes(?:<\/p>)?<\/div><div>(?:<p>)?(tcm:[^<]+)(?:<\/p>)?<\/div><\/div>/);
    if (fnMatch && !extractedFootnotes) extractedFootnotes = fnMatch[1];
    const pidMatch = line.match(/<div><div>(?:<p>)?pageid(?:<\/p>)?<\/div><div>(?:<p>)?([^<]+?)(?:<\/p>)?<\/div><\/div>/);
    if (pidMatch && !extractedPageid) extractedPageid = pidMatch[1].trim();
    // Remove the footnotes/pageid rows from the tabs block
    tabLines[ti] = line
      .replace(/<div><div>(?:<p>)?footnotes(?:<\/p>)?<\/div><div>(?:<p>)?tcm:[^<]+(?:<\/p>)?<\/div><\/div>/g, '')
      .replace(/<div><div>(?:<p>)?pageid(?:<\/p>)?<\/div><div>(?:<p>)?[^<]+(?:<\/p>)?<\/div><\/div>/g, '');
    break;
  }
  html = tabLines.join('\n');

  // Append extracted footnotes/pageid to Metadata block at end of file
  if (extractedFootnotes || extractedPageid) {
    const metaInsertions = [];
    if (extractedFootnotes) {
      metaInsertions.push('<div><div><p>footnotes</p></div><div><p>' + extractedFootnotes + '</p></div></div>');
    }
    if (extractedPageid) {
      metaInsertions.push('<div><div><p>pageid</p></div><div><p>' + extractedPageid + '</p></div></div>');
    }
    // Insert new rows before the metadata block's closing </div> (before section close)
    // Structure: <div class="metadata"><div>row1</div><div>row2</div>[INSERT HERE]</div></div>
    html = html.replace(
      /(<div class="metadata">(?:<div>(?:<div>.*?<\/div>)+<\/div>)*?)(<\/div><\/div>\s*$)/,
      '$1' + metaInsertions.join('') + '$2',
    );
  }

  // 3d. Replace "Helpful resources" sections and help-cta-default fragment with
  // the combined personal-loans helpful-resources fragment (for personal-loans pages)
  if (filePath.includes('personal-loans')) {
    const fragLines = html.split('\n');
    const filtered = [];
    for (let fi = 0; fi < fragLines.length; fi++) {
      const line = fragLines[fi];
      // Remove "Helpful resources" section (cards block with that heading)
      if (line.includes('id="helpful-resources"') || (line.includes('<h2') && line.includes('Helpful resources'))) {
        continue;
      }
      // Replace help-cta-default fragment with personal-loans/helpful-resources
      if (line.includes('/fragments/help-cta-default')) {
        filtered.push('<div><div class="fragment"><div><div><p>/fragments/personal-loans/helpful-resources</p></div></div></div></div>');
        continue;
      }
      filtered.push(line);
    }
    html = filtered.join('\n');
  }

  // 4. Join orphaned lines into sections
  // Lines starting with <div> or <h1>/<h2> are section boundaries.
  // Lines starting with <p>, <ul>, <li>, <br>, etc. merge into the preceding section.
  const lines = html.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const isSectionStart = line.startsWith('<div') || line.startsWith('<h1') || line.startsWith('<h2');
    if (isSectionStart) {
      result.push(line);
    } else if (result.length > 0) {
      // Merge into previous section
      result[result.length - 1] += line;
    } else {
      result.push(line);
    }
  }
  // Wrap any non-<div> lines in a section <div>
  for (let i = 0; i < result.length; i++) {
    if (!result[i].startsWith('<div')) {
      result[i] = '<div>' + result[i] + '</div>';
    }
  }
  html = result.join('\n');

  // 4b. Remove duplicate tab content (mobile view joined onto tabs line after orphan joining)
  const tabsLines2 = html.split('\n');
  for (let ti = 0; ti < tabsLines2.length; ti++) {
    const line = tabsLines2[ti];
    if (!line.includes('class="tabs')) continue;

    const tabsStart = line.indexOf('class="tabs');
    const blockStart = line.lastIndexOf('<div', tabsStart);
    let depth = 0;
    let tabsEndPos = -1;
    for (let ci = blockStart; ci < line.length; ci++) {
      if (line.substring(ci, ci + 4) === '<div') { depth++; ci += 3; }
      else if (line.substring(ci, ci + 6) === '</div>') {
        depth--;
        if (depth === 0) { tabsEndPos = ci + 6; break; }
        ci += 5;
      }
    }
    if (tabsEndPos === -1) break;

    const afterTabs = line.substring(tabsEndPos);
    if (afterTabs.length < 50) break;
    const nextBlock = afterTabs.match(/<div class="(?:fragment|section-metadata|metadata)">/);
    if (nextBlock) {
      tabsLines2[ti] = line.substring(0, tabsEndPos) + afterTabs.substring(nextBlock.index);
    } else {
      const lastClose = afterTabs.lastIndexOf('</div>');
      if (lastClose >= 0) {
        tabsLines2[ti] = line.substring(0, tabsEndPos) + afterTabs.substring(lastClose);
      }
    }
    break;
  }
  html = tabsLines2.join('\n');

  // 5. Separate fragment blocks into their own sections (but not when following a hero block)
  const sepLines = html.split('\n');
  for (let si = 0; si < sepLines.length; si++) {
    const line = sepLines[si];
    if (!line.includes('<div class="fragment">')) continue;
    // If this line also has a hero block, don't separate the fragment
    if (line.includes('class="hero"')) continue;
    // Otherwise, separate fragment into its own section
    sepLines[si] = line.replace(/(<\/div>)<div class="fragment">/g, '$1</div>\n<div><div class="fragment">');
  }
  html = sepLines.join('\n');

  // 7. Wrap bare text in block cells with <p> tags
  html = html.replace(/<div>([^<]+)<\/div>/g, (match, text) => {
    if (text.length < 500) return '<div><p>' + text + '</p></div>';
    return match;
  });

  // 7b. Ensure every line is a proper section: wrap block-class lines in <div> if needed
  // Lines starting with <div class="blockname"> need an outer <div> wrapper for DA sections
  const wrapLines = html.split('\n');
  for (let wi = 0; wi < wrapLines.length; wi++) {
    const line = wrapLines[wi];
    // Skip lines that already start with plain <div> (section wrapper) or <div><
    if (line.startsWith('<div><') || line.startsWith('<div>\n')) continue;
    // Wrap lines starting with <div class="..."> (including metadata)
    if (line.startsWith('<div class="')) {
      wrapLines[wi] = '<div>' + line + '</div>';
    }
  }
  html = wrapLines.join('\n');

  // 7c. Add section-metadata to sections with H2 headings
  const smLines = html.split('\n');
  for (let si = 0; si < smLines.length; si++) {
    const line = smLines[si];
    if (line.includes('class="metadata"')) continue;
    const hasAccordionBlock = /class="accordion/.test(line);

    // If line already has section-metadata AND has accordion, ensure narrow-width
    // (skill rule: accordion sections ALWAYS include narrow-width).
    if (line.includes('section-metadata') && hasAccordionBlock) {
      if (!line.includes('narrow-width')) {
        // Append narrow-width to whatever style value is present (with or without heading-bar)
        smLines[si] = line.replace(/(<div class="section-metadata">.*?<p>)([^<]*?)(<\/p>)/, (m, pre, val, post) => `${pre}${val}, narrow-width${post}`);
      }
      continue;
    }

    // Accordion section WITHOUT existing section-metadata → add narrow-width even if no H2.
    if (hasAccordionBlock && !line.includes('section-metadata')) {
      const hasH2acc = line.includes('<h2');
      const styleAcc = hasH2acc ? 'heading-bar, center-align, narrow-width' : 'narrow-width';
      const sectionMetaAcc = '<div class="section-metadata"><div><div><p>style</p></div><div><p>' + styleAcc + '</p></div></div></div>';
      smLines[si] = line.replace(/<\/div>$/, sectionMetaAcc + '</div>');
      continue;
    }

    if (!line.includes('<h2') || line.includes('section-metadata')) continue;
    // Skip lines where H2 is inside a tabs block — not a standalone section heading
    if (line.includes('class="tabs')) continue;

    // Determine style: if H2 is followed by a major block, use center-align + heading-bar
    const hasMajorBlock = /class="(cards|accordion|tabs|columns|carousel)/.test(line);
    let style = hasMajorBlock ? 'heading-bar, center-align' : 'heading-bar';

    const sectionMeta = '<div class="section-metadata"><div><div><p>style</p></div><div><p>' + style + '</p></div></div></div>';
    smLines[si] = line.replace(/<\/div>$/, sectionMeta + '</div>');
  }
  html = smLines.join('\n');

  // 7d. Guard: pageid (DT1/QSR/LRC/PM) must never appear in the footnotes metadata field.
  // Strip any such IDs that leaked into the footnotes CID list.
  html = html.replace(
    /(<div><p>footnotes<\/p><\/div><div><p>)([^<]*)(<\/p><\/div>)/g,
    (m, pre, list, post) => {
      const cleaned = list.split(',')
        .map((s) => s.trim())
        .filter((id) => id && !/^(DT1|DT2|QSR|LRC|PM)-/.test(id))
        .join(', ');
      return pre + cleaned + post;
    },
  );

  // 7e. Footnote numbering must not use <ol> (skill rule). If a footnote/disclaimer
  // list was serialized as an ordered list, flatten it to paragraphs so numbering
  // is driven by the footnote markup, not an <ol>.
  html = html.replace(/<ol>([\s\S]*?)<\/ol>/g, (m, inner) => {
    // Only touch lists whose items reference footnote CIDs.
    if (!/#tcm:/.test(inner)) return m;
    const items = inner.match(/<li>([\s\S]*?)<\/li>/g) || [];
    return items.map((li) => '<p>' + li.replace(/^<li>/, '').replace(/<\/li>$/, '') + '</p>').join('');
  });

  // 8. Fix div balance per line
  const finalLines = html.split('\n');
  finalLines.forEach((line, idx) => {
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    if (opens > closes) finalLines[idx] = line + '</div>'.repeat(opens - closes);
    else if (closes > opens) {
      // Remove excess trailing </div> tags
      let fixed = line;
      for (let d = 0; d < closes - opens; d++) {
        fixed = fixed.replace(/<\/div>$/, '');
      }
      finalLines[idx] = fixed;
    }
  });
  html = finalLines.join('\n');

  // Re-wrap in the DA <body>/<main> structure if the input used that format.
  if (isDaFormat) {
    const sections = html.split('\n').filter((l) => l.trim()).join('');
    html = `<body>\n  <header></header>\n  <main>${sections}</main>\n  <footer></footer>\n</body>`;
  }

  // Guard: a metadata block without a Keywords row almost always means keywords were
  //   not carried over from the source. Cannot be auto-filled (source not available
  //   here) — WARN so an author copies <meta name="keywords"> verbatim into Metadata.
  if (/<div class="metadata">/.test(html) && !/<p>Keywords<\/p>/.test(html)) {
    warnings.push('Metadata block has no Keywords row — copy the source <meta name="keywords"> content verbatim into a Keywords row (after Description)');
  }

  fs.writeFileSync(filePath, html);
  return { filePath, warnings };
}

// CLI: accept file paths as arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node tools/importer/post-process.js <file1.plain.html> [file2.plain.html ...]');
  process.exit(1);
}

args.forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const { warnings } = postProcess(filePath);
  console.log('✅', filePath);
  warnings.forEach((w) => console.log('   ⚠ ', w));
});
