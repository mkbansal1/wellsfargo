/*
 * Video Cards (Two/Three/Four Up)
 *
 * A grid of cards, each containing a video/audio player with optional title,
 * transcript, and subtitle. Authored as one table row per card; each card cell
 * holds up to four sub-rows, classified by content so partial configs work:
 *   row 1: title text                 (optional)
 *   row 2: video/audio URL + poster    (required — the media row)
 *   row 3: transcript (heading + text) (optional)
 *   row 4: subtitle text               (optional)
 *
 * A separator line is rendered above the subtitle only when a subtitle (row 4)
 * is configured. Column count comes from the two-up / three-up / four-up class
 * (same as the Cards block).
 */

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function isAudioUrl(url) {
  return /\.(mp3|m4a|wav|aac|oga)(\?.*)?$/i.test(url);
}

function isImageUrl(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
}

const AUDIO_MIME = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  oga: 'audio/ogg',
};

/** True if the sub-row contains a media (video/audio) or poster reference. */
function isMediaRow(row) {
  if (row.querySelector('video, audio, source, picture')) return true;
  return [...row.querySelectorAll('a[href]')]
    .some((a) => isVideoUrl(a.href) || isAudioUrl(a.href) || isImageUrl(a.href));
}

/** True if the sub-row is a transcript (a <details>, or a heading/text labelled "Transcript"). */
function isTranscriptRow(row) {
  if (row.querySelector('details')) return true;
  const heading = row.querySelector('h1, h2, h3, h4, h5, h6, summary, strong');
  if (heading && /transcript/i.test(heading.textContent)) return true;
  // Multiple paragraphs with no media is treated as transcript body.
  return row.querySelectorAll('p').length > 1 && !isMediaRow(row);
}

/** Build the player element from a media row (mirrors the Video block). */
function buildPlayer(row) {
  const links = row.querySelectorAll('a[href]');
  const picture = row.querySelector('picture img');
  let videoSrc = '';
  let audioSrc = '';
  let posterSrc = '';

  // Pre-existing <video>/<source> (DOM authored) or link-based URLs.
  const srcEl = row.querySelector('video source, audio source, source');
  if (srcEl) {
    const s = srcEl.getAttribute('src') || '';
    if (isAudioUrl(s)) audioSrc = s; else videoSrc = s;
  }
  const existingVideo = row.querySelector('video');
  if (existingVideo && existingVideo.getAttribute('poster')) {
    posterSrc = existingVideo.getAttribute('poster');
  }
  links.forEach((a) => {
    const { href } = a;
    if (isVideoUrl(href)) videoSrc = href;
    else if (isAudioUrl(href)) audioSrc = href;
    else if (isImageUrl(href)) posterSrc = href;
  });
  if (picture) posterSrc = picture.src;

  const wrapper = document.createElement('div');
  wrapper.className = 'video-cards-player';

  if (audioSrc && !videoSrc) {
    wrapper.classList.add('audio');
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (posterSrc) video.poster = posterSrc;
    const source = document.createElement('source');
    source.src = audioSrc;
    const ext = (audioSrc.split('?')[0].split('.').pop() || '').toLowerCase();
    source.type = AUDIO_MIME[ext] || 'audio/mpeg';
    video.append(source);
    wrapper.append(video);
    return wrapper;
  }

  if (videoSrc) {
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (posterSrc) video.poster = posterSrc;
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.append(source);
    wrapper.append(video);
    return wrapper;
  }

  return null;
}

/** Build a collapsible transcript from a transcript row. */
function buildTranscript(row) {
  const existing = row.querySelector('details');
  let titleText = '';
  let paragraphs = [];

  if (existing) {
    const summary = existing.querySelector('summary, .show-hide-title-text');
    titleText = summary ? summary.textContent.replace(/\s+/g, ' ').trim() : '';
    const bodyWrap = existing.querySelector('.show-hide-content-text-wrapper-collapsible') || existing;
    paragraphs = [...bodyWrap.querySelectorAll('p')];
  } else {
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6, strong');
    paragraphs = [...row.querySelectorAll('p')];
    if (heading) {
      titleText = heading.textContent.trim();
    } else if (paragraphs.length) {
      titleText = paragraphs[0].textContent.trim();
      paragraphs = paragraphs.slice(1);
    }
  }

  const details = document.createElement('details');
  details.className = 'video-cards-transcript';
  const summary = document.createElement('summary');
  summary.textContent = titleText || 'Transcript';
  details.append(summary);
  const content = document.createElement('div');
  content.className = 'video-cards-transcript-content';
  paragraphs.forEach((p) => {
    if (p.textContent.trim()) content.append(p.cloneNode(true));
  });
  details.append(content);
  return details;
}

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    // Each direct child div of the row is a sub-row (title/media/transcript/subtitle).
    const subRows = [...row.children].filter((d) => d.textContent.trim() || d.querySelector('video, audio, source, picture, a, img'));

    let mediaRow = null;
    let transcriptRow = null;
    const textRows = [];
    subRows.forEach((sr) => {
      if (!mediaRow && isMediaRow(sr)) mediaRow = sr;
      else if (!transcriptRow && isTranscriptRow(sr)) transcriptRow = sr;
      else textRows.push(sr);
    });

    // textRows in document order: first is title, any later one is subtitle.
    const titleRow = textRows[0] || null;
    const subtitleRow = textRows.length > 1 ? textRows[textRows.length - 1] : null;

    // Title.
    if (titleRow) {
      const title = document.createElement('div');
      title.className = 'video-cards-title';
      title.append(...titleRow.childNodes);
      li.append(title);
    }

    // Player.
    if (mediaRow) {
      const player = buildPlayer(mediaRow);
      if (player) li.append(player);
    }

    // Transcript.
    if (transcriptRow) {
      li.append(buildTranscript(transcriptRow));
    }

    // Subtitle — with a separator line above it (rendered only when subtitle set).
    if (subtitleRow) {
      const separator = document.createElement('hr');
      separator.className = 'video-cards-separator';
      li.append(separator);
      const subtitle = document.createElement('div');
      subtitle.className = 'video-cards-subtitle';
      subtitle.append(...subtitleRow.childNodes);
      li.append(subtitle);
    }

    ul.append(li);
  });

  block.replaceChildren(ul);
}
