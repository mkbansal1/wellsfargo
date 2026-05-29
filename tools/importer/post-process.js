/* eslint-disable */
// Post-processes imported .plain.html files to fix serialization issues.
// Run after bulk import: node tools/importer/post-process.js content/path/to/page.plain.html
const fs = require('fs');
const path = require('path');
const { glob } = require('fs').promises ? { glob: null } : {};

function postProcess(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Fix footnote references (both patterns)
  // Pattern 1: <a href="...tcm:..."><sup>Opens a modal dialog for footnote N</sup></a>
  html = html.replace(/<a href="([^"]*tcm:[^"]*)"[^>]*><sup>Opens a modal dialog for footnote (\d+)<\/sup>\s*<\/a>/g, '<sup><a href="$1">$2</a></sup>');
  // Pattern 2: <a href="...tcm:...">Opens a modal dialog for footnote N</a> (inside <sup>)
  html = html.replace(/<a href="([^"]*tcm:[^"]*)"[^>]*>Opens a modal dialog for footnote (\d+)<\/a>/g, '<a href="$1">$2</a>');

  // 2. Convert absolute wellsfargo.com links to relative and strip trailing slash
  html = html.replace(/https:\/\/www\.wellsfargo\.com\//g, '/');
  html = html.replace(/href="(\/[^"]+)\/"/g, 'href="$1"');

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

  // 4. Join orphaned lines back to their parent, and merge bare heading lines with next line
  const lines = html.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBlockStart = !line
      || line.startsWith('<div')
      || line.startsWith('<h1') || line.startsWith('<h2') || line.startsWith('<h3')
      || line.startsWith('<h4') || line.startsWith('<h5') || line.startsWith('<h6')
      || line.startsWith('<table') || line.startsWith('<p>');
    if (i > 0 && line && !isBlockStart) {
      result[result.length - 1] += line;
    } else {
      result.push(line);
    }
  }
  // Merge bare heading lines (e.g. <h2>...</h2>) with the following line to form one section
  const merged = [];
  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    const isBareHeading = /^<h[1-6][^>]*>.*<\/h[1-6]>$/.test(line.trim());
    if (isBareHeading && i + 1 < result.length) {
      // Wrap heading + next line in a section div
      merged.push('<div>' + line + result[i + 1] + '</div>');
      i++;
    } else {
      merged.push(line);
    }
  }
  html = merged.join('\n');

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
    if (text.length < 200) return '<div><p>' + text + '</p></div>';
    return match;
  });

  // 7b. Ensure every line is a proper section: wrap block-class lines in <div> if needed
  // Lines starting with <div class="blockname"> need an outer <div> wrapper for DA sections
  const wrapLines = html.split('\n');
  for (let wi = 0; wi < wrapLines.length; wi++) {
    const line = wrapLines[wi];
    // Skip lines that already start with plain <div> (section wrapper) or <div><
    if (line.startsWith('<div><') || line.startsWith('<div>\n')) continue;
    // Wrap lines starting with <div class="..."> (block-level elements without section wrapper)
    if (line.startsWith('<div class="') && !line.startsWith('<div class="metadata"')) {
      wrapLines[wi] = '<div>' + line + '</div>';
    }
  }
  html = wrapLines.join('\n');

  // 7c. Add section-metadata (heading-bar) to sections with H2 headings
  const smLines = html.split('\n');
  for (let si = 0; si < smLines.length; si++) {
    const line = smLines[si];
    // Skip metadata line
    if (line.includes('class="metadata"')) continue;
    // If line has an H2 and doesn't already have section-metadata, add one
    if (line.includes('<h2') && !line.includes('section-metadata')) {
      const sectionMeta = '<div class="section-metadata"><div><div><p>style</p></div><div><p>heading-bar</p></div></div></div>';
      // Insert before the final </div> of the section
      smLines[si] = line.replace(/<\/div>$/, sectionMeta + '</div>');
    }
  }
  html = smLines.join('\n');

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

  fs.writeFileSync(filePath, html);
  return filePath;
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
  postProcess(filePath);
  console.log('✅', filePath);
});
