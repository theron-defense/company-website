(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const navLinks = nav.querySelectorAll('a');
  const year = document.getElementById('year');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }

  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    nav.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function () {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    nav.classList.toggle('open', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
