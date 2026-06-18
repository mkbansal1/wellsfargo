export default function decorate(block) {
    const row = block.querySelector(':scope > div');
    if (!row) return;
  
    const cols = [...row.children];
    const labelCol = cols[0];
    const bodyCol = cols[1];
  
    if (labelCol) labelCol.classList.add('inline-banner-label');
    if (bodyCol) bodyCol.classList.add('inline-banner-body');
  }
  