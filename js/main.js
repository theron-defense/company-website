(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  const navLinks = nav.querySelectorAll('a');
  const year = document.getElementById('year');
  const video = document.querySelector('.hero-video');
  const mediaSections = document.querySelectorAll('.hero, .product-panel, .site-foot');
  const teamSection = document.querySelector('.team-section');
  const ndaaSection = document.querySelector('.product-panel--ndaa');
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
      if (box.top <= headerHeight && box.bottom > headerHeight) {
        overMedia = true;
      }
    });
    var overTeam = false;
    if (teamSection) {
      var teamBox = teamSection.getBoundingClientRect();
      overTeam = teamBox.top <= headerHeight && teamBox.bottom > headerHeight;
    }
    var overNdaa = false;
    if (ndaaSection) {
      var ndaaBox = ndaaSection.getBoundingClientRect();
      overNdaa = ndaaBox.top <= headerHeight && ndaaBox.bottom > headerHeight;
    }
    header.classList.toggle('on-hero', overMedia);
    header.classList.toggle('on-team', overTeam);
    header.classList.toggle('on-ndaa', overNdaa);

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

  // Contact band: the Vision network grown live. The band loads with the left
  // half already grown (behind the "Work With Us" copy). Once it scrolls into
  // view the network pans slowly left and new nodes pop in at random spots
  // across the right half, each then drawing a link to the nearest existing
  // node (tree links only, so no closed polygons). Static when reduced motion
  // is on; paused offscreen.
  function initContactNetwork() {
    var field = document.querySelector('.section-band-field');
    var canvas = field && field.querySelector('.section-band-network');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    field.classList.add('is-live');

    var CELL = 110;          // grid spacing between candidate nodes (px)
    var PAN_SPEED = 18;      // pan speed (px/s)
    var ZONE_START = 0.5;    // new nodes appear across the right half
    var POP = 0.35;          // seconds for a dot to pop in
    var LINK_DELAY = 0.25;   // pause between the pop and its link starting
    var LINK = 0.7;          // seconds for a link to draw
    var W = 0, H = 0, camX = 0, nextCol = 0, clock = 0, last = 0;
    var nodes = [], pending = [], running = false, visible = false;

    function measure() {
      var dpr = window.devicePixelRatio || 1;
      W = field.clientWidth;
      H = field.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function queueColumn(col, at) {
      var rows = Math.ceil(H / CELL);
      // Without a fixed time, each node pops at a random moment while its
      // column is still inside the right half.
      var span = Math.max(0.5, (col * CELL - camX - W * ZONE_START) / PAN_SPEED);
      for (var r = 0; r <= rows; r++) {
        if (Math.random() < 0.4) continue;
        pending.push({
          x: col * CELL + (Math.random() * 2 - 1) * CELL * 0.35,
          y: r * CELL + (Math.random() * 2 - 1) * CELL * 0.35,
          at: at !== undefined ? at : clock + Math.random() * span,
          hub: Math.random() < 0.12
        });
      }
    }

    function spawn(n) {
      var best = null, bestD = CELL * 2.2;
      nodes.forEach(function (m) {
        var d = Math.hypot(m.x - n.x, m.y - n.y);
        if (d < bestD) { bestD = d; best = m; }
      });
      n.born = n.at;
      if (best) { n.px = best.x; n.py = best.y; }
      nodes.push(n);
    }

    function grow(upTo) {
      // Fully grown network from the left edge up to the given x.
      nodes = []; pending = []; clock = 0; camX = 0;
      nextCol = -1;
      while (nextCol * CELL <= upTo) queueColumn(nextCol++, -10);
      pending.sort(function (a, b) { return a.x - b.x; });
      pending.forEach(spawn);
      pending = [];
    }

    function release() {
      while (nextCol * CELL <= camX + W) queueColumn(nextCol++);
      pending.sort(function (a, b) { return a.at - b.at; });
      while (pending.length && pending[0].at <= clock) spawn(pending.shift());
      nodes = nodes.filter(function (n) { return n.x - camX > -CELL * 2; });
    }

    // Ease with a slight overshoot, for the pop.
    function popEase(p) {
      var k = 2.2;
      p -= 1;
      return 1 + (k + 1) * p * p * p + k * p * p;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(-camX, 0);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      nodes.forEach(function (n) {
        if (n.px === undefined) return;
        var p = Math.min(1, Math.max(0, (clock - n.born - POP - LINK_DELAY) / LINK));
        if (p <= 0) return;
        // The link reaches out from the new dot to the network.
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n.x + (n.px - n.x) * p, n.y + (n.py - n.y) * p);
        ctx.stroke();
      });
      nodes.forEach(function (n) {
        var p = Math.min(1, Math.max(0, (clock - n.born) / POP));
        if (p <= 0) return;
        var s = popEase(p);
        var a = Math.min(1, p * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * a) + ')';
        if (n.hub) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 * a) + ')';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6 * s, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, (n.hub ? 2.5 : 2.25) * s, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      clock += dt;
      camX += PAN_SPEED * dt;
      release();
      draw();
      requestAnimationFrame(frame);
    }

    function sync() {
      if (reduceMotion.matches) {
        running = false;
        grow(W);
        draw();
        return;
      }
      if (visible && !running) {
        running = true;
        last = 0;
        requestAnimationFrame(frame);
      } else if (!visible) {
        running = false;
      }
    }

    measure();
    grow(W * ZONE_START);
    draw();
    window.addEventListener('resize', function () {
      // Phones fire resize as the address bar shows/hides; only rebuild the
      // network when the width really changes.
      var oldW = W;
      measure();
      if (W !== oldW) grow(W * ZONE_START);
      draw();
    });
    reduceMotion.addEventListener('change', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        sync();
      }).observe(field);
    } else {
      visible = true;
      sync();
    }
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

  function initProductPanels() {
    var panels = document.querySelectorAll('.product-panel');
    if (!panels.length) return;
    var collages = document.querySelectorAll('.product-panel-media, .product-ai');

    function syncProductVideos(collage, on) {
      collage.querySelectorAll('video').forEach(function (clip) {
        if (!on || reduceMotion.matches) {
          clip.pause();
          return;
        }
        var play = clip.play();
        if (play && typeof play.catch === 'function') play.catch(function () {});
      });
    }

    function update() {
      var vh = window.innerHeight;
      panels.forEach(function (panel) {
        var box = panel.getBoundingClientRect();
        var mid = box.top + box.height * 0.42;
        panel.classList.toggle('is-active', mid > vh * 0.16 && mid < vh * 0.78);
      });
      collages.forEach(function (collage) {
        var mediaBox = collage.getBoundingClientRect();
        syncProductVideos(collage, mediaBox.bottom > 0 && mediaBox.top < vh);
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        collages.forEach(function (collage) {
          syncProductVideos(collage, false);
        });
      } else {
        update();
      }
    });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initSnapTicks() {
    var panes = document.querySelectorAll('.snap-pane');
    if (panes.length < 2) return;
    var locked = false;
    var unlockTimer = 0;

    function currentIndex() {
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < panes.length; i += 1) {
        var dist = Math.abs(panes[i].getBoundingClientRect().top);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    }

    function go(delta) {
      if (reduceMotion.matches) return;
      var next = currentIndex() + delta;
      if (next < 0 || next >= panes.length) return;
      locked = true;
      window.clearTimeout(unlockTimer);
      panes[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      unlockTimer = window.setTimeout(function () {
        locked = false;
      }, 620);
    }

    window.addEventListener('wheel', function (event) {
      if (reduceMotion.matches) return;
      if (event.ctrlKey || event.metaKey) return;
      if (document.body.style.overflow === 'hidden') return;
      if (Math.abs(event.deltaY) < 6) return;
      event.preventDefault();
      if (locked) return;
      go(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    window.addEventListener('keydown', function (event) {
      if (reduceMotion.matches) return;
      var tag = (event.target && event.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
      var down = event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey);
      var up = event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey);
      if (!down && !up) return;
      event.preventDefault();
      if (locked) return;
      go(down ? 1 : -1);
    });
  }

  onScroll();
  syncVideo();
  revealGroups();
  initSlideshows();
  initTeamLinks();
  initContactNetwork();
  drawVisionNetwork();
  updateParallax();
  initProductPanels();
  initSnapTicks();
})();
