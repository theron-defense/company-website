(function () {
  const STORAGE_KEY = 'theme';
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const navLinks = nav.querySelectorAll('a');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const year = document.getElementById('year');
  const scrolledShadow = 'shadow-[0_1px_24px_rgba(7,42,74,0.06)] dark:shadow-[0_1px_24px_rgba(0,0,0,0.45)]';
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function isDark(theme) {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return colorScheme.matches;
  }

  function updateThemeButtons(theme) {
    themeButtons.forEach(function (button) {
      var active = button.dataset.theme === theme;
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyTheme(theme) {
    root.classList.toggle('dark', isDark(theme));
    root.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    updateThemeButtons(theme);
  }

  var initialTheme = localStorage.getItem(STORAGE_KEY) || 'system';
  updateThemeButtons(initialTheme);

  themeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      applyTheme(button.dataset.theme);
    });
  });

  colorScheme.addEventListener('change', function () {
    if ((localStorage.getItem(STORAGE_KEY) || 'system') === 'system') {
      root.classList.toggle('dark', colorScheme.matches);
    }
  });

  function onScroll() {
    header.classList.toggle(scrolledShadow, window.scrollY > 10);
  }

  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function () {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
