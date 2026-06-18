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

export default function decorate(block) {
  const rows = [...block.children];
  const videoRow = rows[0];
  const transcriptRow = rows[1];

  // Extract video/audio and poster from all links in the first row
  const links = videoRow.querySelectorAll('a[href]');
  const picture = videoRow.querySelector('picture img');
  let videoSrc = '';
  let audioSrc = '';
  let posterSrc = '';

  links.forEach((a) => {
    const { href } = a;
    if (isVideoUrl(href)) videoSrc = href;
    else if (isAudioUrl(href)) audioSrc = href;
    else if (isImageUrl(href)) posterSrc = href;
  });

  if (picture) posterSrc = picture.src;

  // Build the player
  block.textContent = '';

  if (audioSrc && !videoSrc) {
    // Render audio inside a <video> element so it gets the same player-box look
    // as an mp4 (full-width 16:9 box with native controls), matching the source.
    block.classList.add('audio');
    const audioWrapper = document.createElement('div');
    audioWrapper.className = 'video-player-wrapper';

    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    // An authored poster image (if any) overrides the default microphone chrome
    // applied via CSS background on the wrapper.
    if (posterSrc) video.poster = posterSrc;

    const source = document.createElement('source');
    source.src = audioSrc;
    const ext = (audioSrc.split('?')[0].split('.').pop() || '').toLowerCase();
    source.type = AUDIO_MIME[ext] || 'audio/mpeg';
    video.append(source);
    audioWrapper.append(video);
    block.append(audioWrapper);
  } else if (videoSrc) {
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-player-wrapper';

    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (posterSrc) video.poster = posterSrc;

    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.append(source);
    videoWrapper.append(video);
    block.append(videoWrapper);
  }

  // Build transcript (optional — only if second row exists)
  if (transcriptRow) {
    const paragraphs = [...transcriptRow.querySelectorAll('p')];
    const heading = transcriptRow.querySelector('h1, h2, h3, h4, h5, h6, strong');

    if (paragraphs.length > 0 || heading) {
      const details = document.createElement('details');
      details.className = 'video-transcript';

      const summary = document.createElement('summary');
      let titleText = '';
      let contentParagraphs = paragraphs;

      if (heading) {
        titleText = heading.textContent.trim();
      } else if (paragraphs.length > 0) {
        titleText = paragraphs[0].textContent.trim();
        contentParagraphs = paragraphs.slice(1);
      }

      summary.textContent = titleText || 'Transcript';
      details.append(summary);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'video-transcript-content';
      contentParagraphs.forEach((p) => {
        if (p.textContent.trim()) contentDiv.append(p.cloneNode(true));
      });
      details.append(contentDiv);
      block.append(details);
    }
  }
}
