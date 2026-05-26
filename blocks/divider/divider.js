export default function decorate(block) {
  block.textContent = '';

  const bar = document.createElement('div');
  bar.className = 'divider-bar';

  const polygon = document.createElement('div');
  polygon.className = 'divider-polygon';
  bar.appendChild(polygon);

  block.appendChild(bar);
}
