export default function decorate(block) {
  const firstUl = block.querySelector('ul');
  if (firstUl) {
    const prevP = firstUl.previousElementSibling;
    if (prevP && prevP.tagName === 'P' && prevP.textContent.includes('Investment and Insurance')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'disclaimers-not-not';
      prevP.before(wrapper);
      wrapper.append(prevP, firstUl);
    }
  }

  block.querySelectorAll('p').forEach((p) => {
    const text = p.textContent.trim();
    if (text === 'Equal Housing Lender' || text.startsWith('Equal Housing')) {
      p.classList.add('disclaimers-equal-housing');
    }
    if (text.includes('©') && text.includes('Wells Fargo')) {
      p.classList.add('disclaimers-copyright');
    }
  });
}
