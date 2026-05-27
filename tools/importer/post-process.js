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

  // 2. Convert absolute wellsfargo.com links to relative
  html = html.replace(/https:\/\/www\.wellsfargo\.com\//g, '/');

  // 3. Fix first hero serialization issue (<p>Hero</p> → proper block div)
  html = html.replace(
    /<div><p>Hero<\/p>(.*?)(<div class="section-metadata">.*?<\/div><\/div>)<\/div>/,
    (match, content, sectionMeta) => '<div><div class="hero"><div><div>' + content + '</div></div></div>' + sectionMeta + '</div>',
  );

  // 4. Fix split lists: join orphaned <li> lines back into their <ul>/<ol>
  const lines = html.split('\n');
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (/<(?:ul|ol)><\/div>$/.test(lines[i])) {
      let combined = lines[i].replace(/<(ul|ol)><\/div>$/, '<$1>');
      i++;
      while (i < lines.length && !lines[i].startsWith('<div>') && !lines[i].startsWith('<div><div')) {
        combined += lines[i];
        i++;
      }
      result.push(combined);
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  html = result.join('\n');

  // 5. Separate fragment blocks into their own sections
  html = html.replace(/(<\/div>)<div class="fragment">/g, '$1</div>\n<div><div class="fragment">');

  // 7. Wrap bare text in block cells with <p> tags
  html = html.replace(/<div>([^<]+)<\/div>/g, (match, text) => {
    if (text.length < 200) return '<div><p>' + text + '</p></div>';
    return match;
  });

  // 8. Fix div balance per line
  const finalLines = html.split('\n');
  finalLines.forEach((line, idx) => {
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    if (opens > closes) finalLines[idx] = line + '</div>'.repeat(opens - closes);
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
