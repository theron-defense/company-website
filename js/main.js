(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const year = document.getElementById('year');
  const video = document.querySelector('.hero-video');
  const mediaSections = document.querySelectorAll('.hero, .product-panel, .site-foot');
  const teamSection = document.querySelector('.team-section');
  const ndaaSection = document.querySelector('.product-panel--ndaa');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function syncPaneHeight() {
    var vv = window.visualViewport;
    var next = Math.round((vv && vv.height) || window.innerHeight || 0);
    if (!next) return;
    document.documentElement.style.setProperty('--pane-h', next + 'px');
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

  function goToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;
    var pane = target.classList.contains('snap-pane')
      ? target
      : (target.closest('.snap-pane') || target);
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

      if ('IntersectionObserver' in window && teamSection) {
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) play();
          else stop();
        }, { rootMargin: '20% 0px' }).observe(pane);
      } else {
        play();
      }
    });
  }

  function initProductVideos() {
    var clips = document.querySelectorAll('.product-panel-video');
    if (!clips.length) return;

    function warm(clip) {
      if (clip.dataset.warmed) return;
      clip.dataset.warmed = '1';
      clip.preload = 'auto';
      try { clip.load(); } catch (err) {}
    }

    function playClip(clip) {
      if (reduceMotion.matches) {
        clip.pause();
        return;
      }
      var play = clip.play();
      if (play && typeof play.catch === 'function') play.catch(function () {});
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
        if (entry.isIntersecting) playClip(clip);
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

  function paintKnockoutTags() {
    document.querySelectorAll('.product-index, .founder-mark').forEach(function (el) {
      var span = el.querySelector('span');
      if (!span) return;
      var width = el.clientWidth;
      var height = el.clientHeight;
      if (width < 2 || height < 2) return;
      var dpr = window.devicePixelRatio || 1;
      var key = width + 'x' + height + '@' + dpr + ':' + span.textContent;
      if (el._koKey === key) return;
      el._koKey = key;
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#D96826';
      ctx.fillRect(0, 0, width, height);
      var cs = getComputedStyle(el);
      ctx.font = cs.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      var spacing = parseFloat(cs.letterSpacing) || 0;
      var label = span.textContent.replace(/\s+/g, ' ').trim().toUpperCase();
      var metrics = ctx.measureText(label);
      var ascent = metrics.actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.72;
      var descent = metrics.actualBoundingBoxDescent || 0;
      var y = (height + ascent - descent) / 2;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      fillSpacedText(ctx, label, width / 2, y, spacing);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(1, 17, 33, 0.34)';
      fillSpacedText(ctx, label, width / 2, y, spacing);
      el.style.backgroundColor = 'transparent';
      el.style.backgroundImage = 'url(' + canvas.toDataURL('image/png') + ')';
      el.style.backgroundSize = '100% 100%';
      el.style.backgroundRepeat = 'no-repeat';
      span.style.color = 'transparent';
    });
  }

  function initKnockoutTags() {
    var paintTimer = 0;
    var paint = function () { paintKnockoutTags(); };
    var paintSoon = function () {
      window.clearTimeout(paintTimer);
      paintTimer = window.setTimeout(paint, 80);
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(paint).catch(paint);
    } else {
      paint();
    }
    window.addEventListener('resize', paintSoon);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', paintSoon);
    }
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
  initSlideshows();
  initTeamLinks();
  initContactNetwork();
  initProductVideos();
  initSnapTicks();
  initKnockoutTags();
})();
