(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.site-nav');
  var links = document.querySelectorAll('.site-nav a');
  var pulse = document.getElementById('pulse-status');
  var pulseLabels = ['onchain & present', 'watching the flow', 'building the room'];
  var pulseIndex = 0;

  function closeMenu() {
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.forEach(function (link) { link.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
  document.getElementById('year').textContent = new Date().getFullYear();

  if (!reduced && pulse) {
    window.setInterval(function () {
      pulseIndex = (pulseIndex + 1) % pulseLabels.length;
      pulse.classList.add('is-changing');
      window.setTimeout(function () {
        pulse.textContent = pulseLabels[pulseIndex];
        pulse.classList.remove('is-changing');
      }, 180);
    }, 3200);
  }

  var sections = document.querySelectorAll('main section');
  if (reduced || !('IntersectionObserver' in window)) {
    sections.forEach(function (section) { section.classList.add('is-visible'); });
  } else {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    sections.forEach(function (section) { reveal.observe(section); });
  }

  if (reduced) return;

  var canvas = document.getElementById('starfield');
  var context = canvas.getContext('2d');
  var points = [];
  var pointer = { x: -1000, y: -1000 };
  var density = Math.min(70, Math.max(34, Math.floor(window.innerWidth / 21)));

  function resize() {
    var scale = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * scale;
    canvas.height = window.innerHeight * scale;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    context.setTransform(scale, 0, 0, scale, 0, 0);
    points = Array.from({ length: density }, function () {
      return { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, size: Math.random() * 1.5 + .35 };
    });
  }

  function draw() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    points.forEach(function (point, index) {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < 0 || point.x > window.innerWidth) point.vx *= -1;
      if (point.y < 0 || point.y > window.innerHeight) point.vy *= -1;
      for (var next = index + 1; next < points.length; next += 1) {
        var other = points[next];
        var dx = point.x - other.x;
        var dy = point.y - other.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 115) {
          context.strokeStyle = 'rgba(132, 148, 255, ' + (1 - distance / 115) * .15 + ')';
          context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(other.x, other.y); context.stroke();
        }
      }
      var pointerDistance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
      if (pointerDistance < 160) {
        point.vx += (point.x - pointer.x) / 16000;
        point.vy += (point.y - pointer.y) / 16000;
      }
      context.fillStyle = 'rgba(181, 190, 255, .45)';
      context.beginPath(); context.arc(point.x, point.y, point.size, 0, Math.PI * 2); context.fill();
    });
    window.requestAnimationFrame(draw);
  }

  window.addEventListener('pointermove', function (event) { pointer.x = event.clientX; pointer.y = event.clientY; }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
})();
