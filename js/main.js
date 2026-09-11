(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const navLinks = nav.querySelectorAll('a');
  const year = document.getElementById('year');
  const video = document.querySelector('.hero-video');
  const mediaSections = document.querySelectorAll('.hero, .photo-chapter, .founder-split');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function syncVideo() {
    if (!video) return;
    if (reduceMotion.matches) {
      video.pause();
      return;
    }
    var play = video.play();
    if (play && typeof play.catch === 'function') {
      play.catch(function () {});
    }
  }

  var revealNodes = document.querySelectorAll('.reveal-group');
  var revealsReady = false;

  function updateReveals() {
    if (reduceMotion.matches) return;
    var vh = window.innerHeight;
    revealNodes.forEach(function (group) {
      var box = group.getBoundingClientRect();
      var inView = box.bottom > vh * 0.05 && box.top < vh * 0.95;
      group.classList.toggle('is-in', inView);
    });
  }

  function onScroll() {
    var headerHeight = header.offsetHeight;
    header.classList.toggle('is-scrolled', window.scrollY > 12);

    var overMedia = false;
    mediaSections.forEach(function (section) {
      var box = section.getBoundingClientRect();
      if (box.top < headerHeight && box.bottom > headerHeight) {
        overMedia = true;
      }
    });
    header.classList.toggle('on-hero', overMedia);

    if (revealsReady) updateReveals();
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

  function revealGroups() {
    if (reduceMotion.matches) {
      revealNodes.forEach(function (group) {
        group.classList.add('is-in');
      });
      return;
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        revealsReady = true;
        updateReveals();
      });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  reduceMotion.addEventListener('change', function () {
    syncVideo();
    if (reduceMotion.matches) {
      document.querySelectorAll('.reveal-group').forEach(function (group) {
        group.classList.add('is-in');
      });
    }
  });
  function initSlideshows() {
    var panes = document.querySelectorAll('[data-slideshow]');
    panes.forEach(function (pane) {
      var slides = pane.querySelectorAll('.founder-pane-media img');
      if (slides.length < 2) return;

      var index = 0;
      var timer = null;
      var hovering = false;
      var resting = 0;

      function show(next) {
        slides[index].classList.remove('is-active');
        index = (next + slides.length) % slides.length;
        slides[index].classList.add('is-active');
      }

      function play() {
        if (reduceMotion.matches || hovering) return;
        stop();
        timer = window.setInterval(function () {
          show(index + 1);
        }, 5200);
      }

      function stop() {
        if (timer) window.clearInterval(timer);
        timer = null;
      }

      pane.addEventListener('mouseenter', function () {
        hovering = true;
        resting = index;
        stop();
        show(index + 1);
      });

      pane.addEventListener('mouseleave', function () {
        hovering = false;
        show(resting);
        play();
      });

      pane.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        show(index + 1);
        if (hovering) resting = index;
        play();
      });

      play();
    });
  }

  onScroll();
  syncVideo();
  revealGroups();
  initSlideshows();
})();
