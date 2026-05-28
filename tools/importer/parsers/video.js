/* eslint-disable */
/* global WebImporter */

/**
 * Parser: video
 * Base block: Video (with transcript)
 * Source: sections containing <video> elements + optional <details> transcript
 *
 * Block library structure:
 *   | Video |
 *   | [video-mp4-url] [poster-image-url] |
 *   | Transcript heading + transcript paragraphs |
 */
export default function parse(element, { document }) {
  const video = element.querySelector('video');
  if (!video) return;

  const source = video.querySelector('source');
  const videoUrl = source ? source.getAttribute('src') : '';
  const posterUrl = video.getAttribute('poster') || '';

  // Row 1: video URL + poster image URL
  const row1 = [];
  if (videoUrl) {
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.textContent = videoUrl;
    row1.push(videoLink);
  }
  if (posterUrl) {
    const posterLink = document.createElement('a');
    posterLink.href = posterUrl;
    posterLink.textContent = posterUrl;
    row1.push(posterLink);
  }

  // Row 2: transcript
  const transcript = element.querySelector('details, [class*="transcript"]');
  const row2 = [];
  if (transcript) {
    const summary = transcript.querySelector('summary');
    if (summary) {
      const heading = document.createElement('p');
      heading.textContent = summary.textContent.trim();
      row2.push(heading);
    }
    const bodyEls = Array.from(transcript.children).filter(c => c.tagName !== 'SUMMARY');
    bodyEls.forEach(el => {
      const ps = el.querySelectorAll('p');
      if (ps.length > 0) {
        ps.forEach(p => row2.push(p.cloneNode(true)));
      } else if (el.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = el.textContent.trim();
        row2.push(p);
      }
    });
  }

  const cells = [row1];
  if (row2.length > 0) cells.push(row2);

  const block = WebImporter.Blocks.createBlock(document, { name: 'Video', cells });
  element.replaceWith(block);
}
