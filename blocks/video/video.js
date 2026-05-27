function isVideoUrl(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function isImageUrl(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
}

export default function decorate(block) {
  const rows = [...block.children];
  const videoRow = rows[0];
  const transcriptRow = rows[1];

  // Extract video and poster from all links in the video row
  const links = videoRow.querySelectorAll('a[href]');
  const picture = videoRow.querySelector('picture img');
  let videoSrc = '';
  let posterSrc = '';

  links.forEach((a) => {
    const { href } = a;
    if (isVideoUrl(href)) videoSrc = href;
    else if (isImageUrl(href)) posterSrc = href;
  });

  if (picture) posterSrc = picture.src;

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
