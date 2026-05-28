/* eslint-disable */
/* global WebImporter */

// Parser: video
// Block library structure (1 column, up to 2 rows):
//   | Video |
//   | <p><a>video-mp4-url</a></p><p><a>poster-image-url</a></p> |
//   | <p>Transcript heading</p><p>transcript text...</p> |
export default function parse(element, { document }) {
  const video = element.querySelector('video');
  if (!video) return;

  const source = video.querySelector('source');
  const videoUrl = source ? source.getAttribute('src') : '';
  const posterUrl = video.getAttribute('poster') || '';

  // Row 1: single cell with video URL + poster URL (both as <p><a> links)
  const row1Content = [];
  if (videoUrl) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = videoUrl;
    a.textContent = videoUrl;
    p.appendChild(a);
    row1Content.push(p);
  }
  if (posterUrl) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = posterUrl;
    a.textContent = posterUrl;
    p.appendChild(a);
    row1Content.push(p);
  }

  const cells = [[row1Content]];

  // Row 2: single cell with transcript heading + paragraphs
  const transcript = element.querySelector('details, [class*="transcript"]');
  if (transcript) {
    const row2Content = [];
    const summary = transcript.querySelector('summary');
    if (summary) {
      const p = document.createElement('p');
      p.textContent = summary.textContent.trim();
      row2Content.push(p);
    }
    const bodyEls = Array.from(transcript.children).filter(c => c.tagName !== 'SUMMARY');
    bodyEls.forEach(el => {
      const ps = el.querySelectorAll('p');
      if (ps.length > 0) {
        ps.forEach(p => row2Content.push(p.cloneNode(true)));
      } else if (el.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = el.textContent.trim();
        row2Content.push(p);
      }
    });
    if (row2Content.length > 0) cells.push([row2Content]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Video', cells });
  element.replaceWith(block);
}
