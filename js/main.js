(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const navLinks = nav.querySelectorAll('a');
  const year = document.getElementById('year');
  const video = document.querySelector('.hero-video');
  const mediaSections = document.querySelectorAll('.hero');
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

  // Mild parallax: the Vision network drifts at a fraction of scroll speed,
  // centred when the section is mid-viewport.
  var visionSection = document.getElementById('vision');
  var visionLayer = document.querySelector('.vision-network');
  var parallaxQueued = false;

  function updateParallax() {
    parallaxQueued = false;
    if (!visionSection || !visionLayer) return;
    if (reduceMotion.matches) {
      visionLayer.style.transform = '';
      return;
    }
    var rect = visionSection.getBoundingClientRect();
    var vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return;
    var offset = (rect.top + rect.height / 2 - vh / 2) / vh;
    visionLayer.style.transform = 'translate3d(0, ' + (offset * vh * 0.08).toFixed(1) + 'px, 0)';
  }

  function queueParallax() {
    if (parallaxQueued) return;
    parallaxQueued = true;
    requestAnimationFrame(updateParallax);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('scroll', queueParallax, { passive: true });
  window.addEventListener('resize', queueParallax);
  reduceMotion.addEventListener('change', function () {
    syncVideo();
    updateParallax();
    if (reduceMotion.matches) {
      document.querySelectorAll('.reveal-group').forEach(function (group) {
        group.classList.add('is-in');
      });
    }
  });
  // Draw a fresh network behind the Vision copy on every load: nodes scattered
  // over a jittered grid, linked by a minimum spanning tree (so the lines branch
  // but never close into polygons), with the six best-connected nodes drawn as
  // hubs. assets/vision-network.svg stays as the fallback when scripts don't run.
  function buildNetworkSvg(random) {
    var W = 1600, H = 900, CELL = 160;
    var dist = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };

    var nodes = [];
    for (var gy = 0; gy <= H / CELL; gy++) {
      for (var gx = 0; gx <= W / CELL; gx++) {
        if (random() < 0.35) continue;
        nodes.push([
          gx * CELL + (random() * 2 - 1) * 55,
          gy * CELL + (random() * 2 - 1) * 55
        ]);
      }
    }

    // Prim's minimum spanning tree; drop overly long links so the tree splits
    // into a few separate branches instead of reaching across the section.
    var edges = [];
    var degree = nodes.map(function () { return 0; });
    var inTree = nodes.map(function () { return false; });
    var reach = nodes.map(function () { return { d: Infinity, from: -1 }; });
    reach[0].d = 0;
    for (var step = 0; step < nodes.length; step++) {
      var next = -1;
      reach.forEach(function (r, k) {
        if (!inTree[k] && (next === -1 || r.d < reach[next].d)) next = k;
      });
      inTree[next] = true;
      if (reach[next].from !== -1 && reach[next].d < 240) {
        edges.push([reach[next].from, next]);
        degree[next]++;
        degree[reach[next].from]++;
      }
      nodes.forEach(function (n, k) {
        var d = dist(nodes[next], n);
        if (!inTree[k] && d < reach[k].d) reach[k] = { d: d, from: next };
      });
    }

    var hubs = nodes
      .map(function (_, k) { return k; })
      .sort(function (p, q) { return degree[q] - degree[p]; })
      .slice(0, 6);

    var f = function (v) { return v.toFixed(1); };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="#fff" stroke-opacity=".16" stroke-width="1" fill="none">';
    edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]];
      svg += '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"/>';
    });
    svg += '</g><g fill="#fff">';
    nodes.forEach(function (n, k) {
      if (hubs.indexOf(k) !== -1) {
        svg += '<circle cx="' + f(n[0]) + '" cy="' + f(n[1]) + '" r="7" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.25"/>' +
          '<circle cx="' + f(n[0]) + '" cy="' + f(n[1]) + '" r="2.5" fill-opacity=".6"/>';
      } else {
        svg += '<circle cx="' + f(n[0]) + '" cy="' + f(n[1]) + '" r="2.25" fill-opacity=".4"/>';
      }
    });
    return svg + '</g></svg>';
  }

  function drawVisionNetwork() {
    var layer = document.querySelector('.vision-network');
    if (!layer) return;
    layer.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(buildNetworkSvg(Math.random)) + '")';
  }

  // Team cards with a LinkedIn link open it in a new tab when clicked anywhere.
  function initTeamLinks() {
    document.querySelectorAll('.founder-pane').forEach(function (pane) {
      var link = pane.querySelector('.founder-social');
      if (!link) return;
      pane.classList.add('has-link');
      pane.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        window.open(link.href, '_blank', 'noopener,noreferrer');
      });
    });
  }

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
        // Cards with a LinkedIn link open it on click instead (initTeamLinks).
        if (event.target.closest('a') || pane.querySelector('.founder-social')) return;
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
  initTeamLinks();
  drawVisionNetwork();
  updateParallax();
})();
