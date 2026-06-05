/**
 * Section Metadata block.
 * Reads key-value rows from the authored table and applies them
 * to the parent .section element as CSS classes and data-attributes.
 *
 * Supported keys:
 *   style  → space/comma-separated class names added to the section
 *   align  → "left" | "right"  → adds data-align attr + align-left/right class
 *   Any other key is stored as data-{key}="{value}" on the section.
 */
export default function decorate(block) {
  const section = block.closest('.section');
  if (!section) return;

  block.querySelectorAll(':scope > div').forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2) return;

    const key = cols[0].textContent.trim().toLowerCase();
    const rawValue = cols[1].textContent.trim();
    const value = rawValue.toLowerCase();

    if (key === 'align') {
      // "left" or "right" — used for two-column split layout
      const normalized = value === 'right' ? 'right' : 'left';
      section.dataset.align = normalized;
      section.classList.add(`align-${normalized}`);
    } else {
      // generic metadata → data attribute
      const attrKey = key.replace(/[^a-z0-9-]/g, '-');
      section.dataset[attrKey] = rawValue;
    }
  });

  // Remove the section-metadata block from the rendered output
  block.closest('.section-metadata-wrapper')?.remove();
}
