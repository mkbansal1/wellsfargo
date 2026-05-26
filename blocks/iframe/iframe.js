export default function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;

  const url = link.href;
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('frameborder', '0');

  block.textContent = '';
  block.appendChild(iframe);
}
