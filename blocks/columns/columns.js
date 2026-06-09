import { decorateBlock, loadBlock } from '../../scripts/aem.js';

const NESTED_BLOCK_NAMES = ['accordion', 'fragment', 'tabs'];

export default async function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // decorate nested blocks within column cells
  const selector = NESTED_BLOCK_NAMES.map((n) => `.${n}`).join(',');
  const nestedBlocks = [...block.querySelectorAll(selector)];
  await nestedBlocks.reduce(async (promise, nested) => {
    await promise;
    decorateBlock(nested);
    await loadBlock(nested);
  }, Promise.resolve());
}
