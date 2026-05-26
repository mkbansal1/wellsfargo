export default function decorate(block) {
  const rows = [...block.children];
  const videoRow = rows[0];
  const transcriptRow = rows[1];

  // Extract video source — either a link to mp4 or a video element
  const link = videoRow.querySelector('a[href]');
  const existingVideo = videoRow.querySelector('video');
  let videoSrc = '';
  let posterSrc = '';

  if (existingVideo) {
    videoSrc = existingVideo.src || existingVideo.querySelector('source')?.src || '';
    posterSrc = existingVideo.poster || '';
  } else if (link) {
    videoSrc = link.href;
    const picture = videoRow.querySelector('picture img');
    if (picture) posterSrc = picture.src;
  }

  // Build video player
  block.textContent = '';

  if (videoSrc) {
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
    const transcriptTitle = transcriptRow.querySelector('h1, h2, h3, h4, h5, h6, strong');
    const transcriptContent = transcriptRow.querySelectorAll('p');

    if (transcriptContent.length > 0) {
      const details = document.createElement('details');
      details.className = 'video-transcript';

      const summary = document.createElement('summary');
      summary.textContent = transcriptTitle
        ? transcriptTitle.textContent.trim()
        : 'Transcript';
      details.append(summary);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'video-transcript-content';
      transcriptContent.forEach((p) => {
        if (p.textContent.trim()) contentDiv.append(p.cloneNode(true));
      });
      details.append(contentDiv);
      block.append(details);
    }
  }
}
