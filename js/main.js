(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const year = document.getElementById('year');
  const video = document.querySelector('.hero-video');
  const mediaSections = document.querySelectorAll('.hero, .product-panel, .site-foot');
  const teamSections = document.querySelectorAll('.team-section');
  const teamSection = teamSections[0] || null;
  const ndaaSection = document.querySelector('.product-panel--ndaa');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Only needed where 100dvh is unsupported. On iOS Safari, re-setting pane
  // heights on every visualViewport resize (URL bar collapse) causes relayout
  // mid-scroll and fights scroll-snap, so let dvh handle it where it exists.
  var needsPaneSync = !(window.CSS && CSS.supports && CSS.supports('height', '100dvh'));
  function syncPaneHeight() {
    if (!needsPaneSync) return;
    var vv = window.visualViewport;
    var next = Math.round((vv && vv.height) || window.innerHeight || 0);
    if (!next) return;
    document.documentElement.style.setProperty('--pane-h', next + 'px');
  }

  // Opera for Android (and some data-saver modes) reject muted autoplay with
  // NotAllowedError when the page is opened from the address bar or reloaded.
  // When any play() is refused, retry every on-screen video on the first touch.
  var gestureRetryArmed = false;
  function retryOnGesture() {
    if (gestureRetryArmed) return;
    gestureRetryArmed = true;
    function retry() {
      ['touchend', 'pointerup', 'keydown', 'click'].forEach(function (ev) {
        window.removeEventListener(ev, retry, true);
      });
      gestureRetryArmed = false;
      syncVideo();
      document.querySelectorAll('.product-panel-video').forEach(function (clip) {
        if (clip._onScreen && clip.paused && !reduceMotion.matches) {
          var p = clip.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        }
      });
    }
    ['touchend', 'pointerup', 'keydown', 'click'].forEach(function (ev) {
      window.addEventListener(ev, retry, true);
    });
  }

  function syncVideo() {
    if (!video) return;
    if (reduceMotion.matches) {
      video.pause();
      return;
    }
    var box = video.getBoundingClientRect();
    if (box.bottom < 1 || box.top > window.innerHeight) {
      video.pause();
      return;
    }
    var play = video.play();
    if (play && typeof play.catch === 'function') {
      play.catch(retryOnGesture);
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

    var overMedia = false;
    mediaSections.forEach(function (section) {
      var box = section.getBoundingClientRect();
      if (box.top <= headerHeight && box.bottom > headerHeight) {
        overMedia = true;
      }
    });
    var overTeam = false;
    teamSections.forEach(function (sec) {
      var teamBox = sec.getBoundingClientRect();
      if (teamBox.top <= headerHeight && teamBox.bottom > headerHeight) overTeam = true;
    });
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
    header.classList.remove('menu-open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function () {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    header.classList.toggle('menu-open', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // Touch devices: native scrolling + scroll-snap lets you stop between panes
  // and snaps late (iOS Safari especially). Do what fullPage.js does instead:
  // lock the document and translate a track one pane per swipe.
  var pager = null;
  function initTouchPager() {
    var coarse = window.matchMedia('(pointer: coarse)').matches && ('ontouchstart' in window);
    if (!coarse || reduceMotion.matches) return;
    var panes = Array.prototype.slice.call(document.querySelectorAll('.snap-pane'));
    if (panes.length < 2) return;

    var track = document.createElement('div');
    track.className = 'snap-track';
    var main = document.querySelector('main');
    var foot = document.querySelector('.site-foot');
    if (!main) return;
    main.parentNode.insertBefore(track, main);
    track.appendChild(main);
    if (foot) track.appendChild(foot);
    document.documentElement.classList.add('touch-pager');

    var index = 0;
    var locked = false;
    var unlock = 0;
    var startY = 0, startX = 0, startT = 0, lastY = 0, lastT = 0, velocity = 0;
    var tracking = false, dragging = false, axisKnown = false, inCarousel = false;
    var baseY = 0;
    var COMMIT = 0.18;      // drag this fraction of the viewport to commit a page
    var FLICK = 0.5;        // px/ms: faster than this commits regardless of distance

    function offsetOf(el) {
      var y = 0;
      while (el && el !== track) { y += el.offsetTop; el = el.offsetParent; }
      return y;
    }

    function setY(y, animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translate3d(0,' + (-y) + 'px,0)';
    }

    function apply(animate) {
      baseY = offsetOf(panes[index]);
      setY(baseY, animate);
      if (!animate) { void track.offsetHeight; track.style.transition = ''; }
    }

    function settle() {
      locked = false;
      onScroll();
    }

    function sampleDuring(ms) {
      var t0 = performance.now();
      (function frame(now) {
        onScroll();
        if (now - t0 < ms) requestAnimationFrame(frame);
      })(t0);
    }

    function goTo(next, animate) {
      next = Math.max(0, Math.min(panes.length - 1, next));
      index = next;
      locked = true;
      window.clearTimeout(unlock);
      apply(animate !== false);
      sampleDuring(700);
      unlock = window.setTimeout(settle, animate === false ? 0 : 720);
    }

    function paneIndexFor(el) {
      var pane = el.classList.contains('snap-pane') ? el : el.closest('.snap-pane');
      return pane ? panes.indexOf(pane) : -1;
    }

    function shouldIgnore(target) {
      if (header.classList.contains('menu-open')) return true;
      if (target.closest && target.closest('.product-hw-canvas, .site-nav')) return true;
      return false;
    }

    track.addEventListener('transitionend', function (e) {
      if (e.target === track) { window.clearTimeout(unlock); settle(); }
    });

    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || shouldIgnore(e.target)) { tracking = false; return; }
      tracking = true; dragging = false; axisKnown = false; velocity = 0;
      inCarousel = !!(e.target.closest && e.target.closest('.team-viewport'));
      startY = lastY = e.touches[0].clientY; startX = e.touches[0].clientX;
      startT = lastT = performance.now();
      if (locked) {
        // grab mid-animation: freeze where it is and continue from there
        var m = /translate3d\(0(?:px)?,\s*(-?[\d.]+)px/.exec(getComputedStyle(track).transform === 'none' ? '' : track.style.transform);
        window.clearTimeout(unlock);
        locked = false;
      }
      baseY = offsetOf(panes[index]);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (header.classList.contains('menu-open')) return;
      if (e.target.closest && e.target.closest('.product-hw-canvas')) return;
      if (!tracking || e.touches.length !== 1) { if (e.cancelable && !inCarousel) e.preventDefault(); return; }
      var y = e.touches[0].clientY, x = e.touches[0].clientX;
      var dy = startY - y, dx = startX - x;
      if (!axisKnown) {
        // Inside the team carousel let the browser decide the axis first, so a
        // horizontal pan stays native (touch-action: pan-x). Elsewhere, block
        // the page from scrolling immediately.
        if (!inCarousel && e.cancelable) e.preventDefault();
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        axisKnown = true;
        if (Math.abs(dx) > Math.abs(dy)) { tracking = false; return; }
        dragging = true;
      }
      if (!e.cancelable) return; // native pan already in progress
      e.preventDefault(); // vertical: the track moves, never the page
      var now = performance.now();
      if (now - lastT > 0) velocity = (lastY - y) / (now - lastT);
      lastY = y; lastT = now;
      // Resist past the ends
      var atStart = index === 0 && dy < 0, atEnd = index === panes.length - 1 && dy > 0;
      if (atStart || atEnd) dy = dy * 0.25;
      setY(baseY + dy, false);
      onScroll();
    }, { passive: false });

    function finish(e) {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      var t = e.changedTouches[0];
      var dy = startY - t.clientY;
      var h = window.innerHeight;
      var next = index;
      if (dy > h * COMMIT || (velocity > FLICK && dy > 10)) next = index + 1;
      else if (dy < -h * COMMIT || (velocity < -FLICK && dy < -10)) next = index - 1;
      goTo(next, true);
    }
    document.addEventListener('touchend', finish, { passive: true });
    document.addEventListener('touchcancel', finish, { passive: true });

    window.addEventListener('resize', function () { apply(false); });
    window.addEventListener('orientationchange', function () { window.setTimeout(function () { apply(false); }, 50); });

    // Deep link on load
    if (location.hash) {
      var el = document.getElementById(location.hash.slice(1));
      var i = el ? paneIndexFor(el) : -1;
      if (i >= 0) index = i;
    }
    apply(false);
    onScroll();
    // The document never scrolls under the pager, so nothing fires 'scroll'.
    // Re-evaluate header tint and reveals on a slow tick as a safety net
    // (covers deep links, resizes and anything that moves the track outside goTo).
    window.setInterval(onScroll, 400);

    return {
      goToElement: function (el) {
        var i = paneIndexFor(el);
        if (i < 0) return false;
        goTo(i, true);
        return true;
      }
    };
  }

  function goToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;
    var pane = target.classList.contains('snap-pane')
      ? target
      : (target.closest('.snap-pane') || target);
    if (pager && pager.goToElement(pane)) return true;
    var root = document.documentElement;
    var y = pane.getBoundingClientRect().top + window.pageYOffset;
    root.style.setProperty('scroll-snap-type', 'none', 'important');
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    requestAnimationFrame(function () {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      window.setTimeout(function () {
        root.style.removeProperty('scroll-snap-type');
      }, 80);
    });
    return true;
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link || event.defaultPrevented) return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('mailto:') === 0) {
      event.preventDefault();
      window.location.href = href;
      return;
    }
    if (href.charAt(0) !== '#' || href.length < 2) return;
    if (!goToId(href.slice(1))) return;
    event.preventDefault();
    closeNav();
    if (history.replaceState) history.replaceState(null, '', href);
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

  var scrollQueued = false;
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () {
      scrollQueued = false;
      onScroll();
    });
  }

  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  window.addEventListener('resize', syncPaneHeight);
  window.addEventListener('orientationchange', syncPaneHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncPaneHeight);
  }
  document.addEventListener('visibilitychange', syncVideo);
  reduceMotion.addEventListener('change', function () {
    syncVideo();
    if (reduceMotion.matches) {
      document.querySelectorAll('.reveal-group').forEach(function (group) {
        group.classList.add('is-in');
      });
    }
  });

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

  // Founder slideshows: each card flips on the same period but with a
  // staggered start, so they don't all turn over at once. Hovering a card
  // flips it immediately; nothing pauses.
  function initSlideshows() {
    var panes = Array.prototype.slice.call(document.querySelectorAll('[data-slideshow]'));
    panes = panes.filter(function (pane) { return pane.querySelectorAll('.founder-pane-media img').length > 1; });
    if (!panes.length) return;

    var PERIOD = 5200;
    var timers = [];
    var states = panes.map(function (pane, i) {
      var slides = pane.querySelectorAll('.founder-pane-media img');
      var st = { slides: slides, index: 0, offset: (PERIOD / panes.length) * i };
      pane.addEventListener('mouseenter', function () { show(st, st.index + 1); });
      return st;
    });

    function show(st, next) {
      st.slides[st.index].classList.remove('is-active');
      st.index = (next + st.slides.length) % st.slides.length;
      st.slides[st.index].classList.add('is-active');
    }

    function play() {
      if (reduceMotion.matches || timers.length) return;
      states.forEach(function (st) {
        timers.push(window.setTimeout(function () {
          show(st, st.index + 1);
          timers.push(window.setInterval(function () { show(st, st.index + 1); }, PERIOD));
        }, st.offset));
      });
    }

    function stop() {
      timers.forEach(function (t) { window.clearTimeout(t); window.clearInterval(t); });
      timers = [];
    }

    if ('IntersectionObserver' in window && teamSection) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) play();
        else stop();
      }, { rootMargin: '20% 0px' }).observe(teamSection);
    } else {
      play();
    }
  }

  // Team grid: duplicate the cards once so the strip can loop, then translate
  // it at a constant speed from the first frame. Never pauses. Dragging
  // (mouse or touch) and horizontal wheel just offset the position.
  function initTeamCarousel() {
    var track = document.getElementById('team');
    var viewport = track && track.closest('.team-viewport');
    if (!track || !viewport) return;

    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[id]').forEach(function (el) { el.id = el.id + '-dup'; });
      clone.querySelectorAll('[mask]').forEach(function (el) {
        el.setAttribute('mask', el.getAttribute('mask').replace(')', '-dup)'));
      });
      track.appendChild(clone);
    });

    // Single-row (landscape) strip has far more width per loop; move it faster.
    var oneRow = window.matchMedia('(orientation: landscape) and (min-width: 768px)');
    function speed() { return oneRow.matches ? 64 : 44; } // px per second
    var pos = 0, last = 0;

    function half() { return track.scrollWidth / 2; }

    function wrap() {
      var h = half();
      if (h <= 0) return;
      pos = ((pos % h) + h) % h;
    }

    function paint() {
      track.style.transform = 'translate3d(' + (-pos).toFixed(2) + 'px,0,0)';
    }

    function frame(now) {
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (!reduceMotion.matches) pos += speed() * dt;
      wrap();
      paint();
      window.requestAnimationFrame(frame);
    }

    // Drag: mouse
    var dragX = null;
    viewport.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragX = e.clientX;
      viewport.classList.add('is-dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (dragX === null) return;
      pos += dragX - e.clientX;
      dragX = e.clientX;
    });
    window.addEventListener('mouseup', function () {
      dragX = null;
      viewport.classList.remove('is-dragging');
    });
    // Drag: touch (the page pager ignores horizontal gestures that start here)
    var touchX = null;
    viewport.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) touchX = e.touches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchmove', function (e) {
      if (touchX === null || e.touches.length !== 1) return;
      pos += touchX - e.touches[0].clientX;
      touchX = e.touches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchend', function () { touchX = null; }, { passive: true });
    viewport.addEventListener('touchcancel', function () { touchX = null; }, { passive: true });
    // Horizontal wheel / trackpad
    viewport.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { pos += e.deltaX; e.stopPropagation(); }
    }, { passive: true });

    window.requestAnimationFrame(frame);
  }

  function initProductVideos() {
    var clips = document.querySelectorAll('.product-panel-video');
    if (!clips.length) return;

    // Warm one clip at a time so a 14 MB demo doesn't starve the small ones
    // (and the GLB) on a phone connection. Next clip starts when the current
    // one can play through, or after a timeout.
    var warmQueue = [];
    var warming = null;
    function pumpWarm() {
      if (warming || !warmQueue.length) return;
      var clip = warmQueue.shift();
      warming = clip;
      var done = false;
      function next() {
        if (done) return;
        done = true;
        clip.removeEventListener('canplaythrough', next);
        warming = null;
        pumpWarm();
      }
      clip.addEventListener('canplaythrough', next);
      window.setTimeout(next, 8000);
      clip.preload = 'auto';
      try { clip.load(); } catch (err) {}
    }
    function warm(clip, front) {
      if (clip.dataset.warmed) return;
      clip.dataset.warmed = '1';
      if (front) warmQueue.unshift(clip); else warmQueue.push(clip);
      pumpWarm();
    }
    // A clip that is actually on screen jumps the queue.
    function warmNow(clip) {
      if (clip.dataset.warmed === '1' && warming !== clip) {
        var i = warmQueue.indexOf(clip);
        if (i >= 0) warmQueue.splice(i, 1);
      }
      clip.dataset.warmed = '1';
      if (clip.preload !== 'auto') { clip.preload = 'auto'; try { clip.load(); } catch (err) {} }
    }

    // "Loading…" hint on the pane until the clip is actually rendering frames.
    clips.forEach(function (clip) {
      var box = clip.closest('.product-panel-media');
      if (!box) return;
      function loading(on) { box.classList.toggle('is-loading', on); }
      loading(clip.readyState < 3);
      clip.addEventListener('playing', function () { loading(false); });
      clip.addEventListener('canplay', function () { if (!clip.paused) loading(false); });
      clip.addEventListener('waiting', function () { loading(true); });
      clip.addEventListener('stalled', function () { if (clip.readyState < 3) loading(true); });
    });

    function playClip(clip) {
      if (reduceMotion.matches) {
        clip.pause();
        return;
      }
      var play = clip.play();
      if (play && typeof play.catch === 'function') play.catch(retryOnGesture);
    }

    if (!('IntersectionObserver' in window)) {
      clips.forEach(function (clip) {
        warm(clip);
        playClip(clip);
      });
      return;
    }

    var near = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) warm(entry.target);
      });
    }, { rootMargin: '45% 0px' });

    var onScreen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var clip = entry.target;
        clip._onScreen = entry.isIntersecting;
        if (entry.isIntersecting) { warmNow(clip); playClip(clip); }
        else clip.pause();
      });
    }, { threshold: 0.01 });

    clips.forEach(function (clip) {
      near.observe(clip);
      onScreen.observe(clip);
    });

    document.addEventListener('visibilitychange', function () {
      clips.forEach(function (clip) {
        if (document.hidden) clip.pause();
        else if (clip._onScreen) playClip(clip);
      });
    });
  }

  // Once the page has settled, quietly fetch the small assets the later panes
  // need (AI loop video, 3D model, Three bundle) so they're in cache before
  // the first swipe. These are ~2 MB total; the big demo clips are not touched.
  function prefetchLaterAssets() {
    if (reduceMotion.matches) return;
    function go() {
      var small = document.querySelector('.product-panel--ai-viz .product-panel-video');
      if (small && !small.dataset.warmed) {
        small.dataset.warmed = '1';
        small.preload = 'auto';
        try { small.load(); } catch (err) {}
      }
      var hw = document.querySelector('.product-hw-canvas');
      var urls = [];
      // Team portraits currently shown in each founder card (the rest load lazily).
      document.querySelectorAll('.founder-pane-media img.is-active').forEach(function (img) {
        urls.push(img.getAttribute('src'));
      });
      if (hw && hw.dataset.model) urls.push(hw.dataset.model);
      urls.forEach(function (u) {
        var l = document.createElement('link');
        l.rel = 'prefetch'; l.href = u;
        if (/\.(webp|jpe?g|png)(\?|$)/.test(u)) { l.as = 'image'; } else { l.as = 'fetch'; l.crossOrigin = 'anonymous'; }
        document.head.appendChild(l);
      });
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 4000 });
    else window.setTimeout(go, 2500);
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
      }, 700);
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

  function fillSpacedText(ctx, text, x, y, spacing) {
    var chars = text.split('');
    var widths = chars.map(function (ch) {
      return ctx.measureText(ch).width;
    });
    var total = widths.reduce(function (sum, w) { return sum + w; }, 0);
    total += Math.max(0, chars.length - 1) * spacing;
    var cursor = x - total / 2;
    chars.forEach(function (ch, i) {
      ctx.fillText(ch, cursor + widths[i] / 2, y);
      cursor += widths[i] + spacing;
    });
  }

  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(function () {
      syncVideo();
    }, { threshold: [0, 0.01] }).observe(video);
  }

  syncPaneHeight();
  onScroll();
  syncVideo();
  revealGroups();
  initTeamCarousel();
  initSlideshows();
  initTeamLinks();
  initContactNetwork();
  initProductVideos();
  prefetchLaterAssets();
  pager = initTouchPager() || null;
  initSnapTicks();
})();
