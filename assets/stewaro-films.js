(() => {
  'use strict';

  const scenes = Array.from(document.querySelectorAll('[data-scene]'), root => ({
    root,
    video: root.querySelector('[data-scroll-video]'),
    src: null,
    ready: false,
    pendingTime: null
  }));
  if (!scenes.length) return;

  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.min(1, Math.max(0, x));
  let scheduled = false;

  function load(scene) {
    const nextSrc = mobile.matches ? scene.video.dataset.tall : scene.video.dataset.wide;
    if (scene.src === nextSrc) return;
    scene.src = nextSrc;
    scene.ready = false;
    scene.pendingTime = null;
    scene.video.pause();
    scene.video.classList.remove('is-ready');
    scene.video.muted = true;
    scene.video.preload = 'auto';
    scene.video.src = nextSrc;
    scene.video.load();
  }

  function seek(scene, seconds) {
    if (!scene.ready || reduced.matches || !Number.isFinite(seconds)) return;
    if (scene.video.seeking) {
      scene.pendingTime = seconds;
      return;
    }
    if (Math.abs(scene.video.currentTime - seconds) > 0.065) {
      try { scene.video.currentTime = seconds; } catch (_) {}
    }
  }

  function update() {
    // Hidden tabs should not scrub video frames or schedule decode work.
    if (document.visibilityState === 'hidden') {
      for (const scene of scenes) scene.pendingTime = null;
      return;
    }
    for (const scene of scenes) {
      if (!scene.ready) continue;
      const rect = scene.root.getBoundingClientRect();
      // Offscreen films must not consume seek/decode work during scrolling.
      if (rect.top >= window.innerHeight || rect.bottom <= 0) {
        scene.pendingTime = null;
        continue;
      }
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / travel);
      scene.video.pause();
      // Keep the final real film frame instead of seeking into an empty outro.
      seek(scene, progress * Math.max(0, scene.video.duration - 0.55));
    }
  }

  function tick() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  for (const scene of scenes) {
    scene.video.addEventListener('loadedmetadata', () => {
      scene.ready = true;
      scene.video.classList.add('is-ready');
      tick();
    });
    scene.video.addEventListener('seeked', () => {
      if (document.visibilityState === 'hidden') {
        scene.pendingTime = null;
        return;
      }
      if (scene.pendingTime === null) return;
      const time = scene.pendingTime;
      scene.pendingTime = null;
      // A seek already in flight may complete after the film leaves the viewport.
      const rect = scene.root.getBoundingClientRect();
      if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
      seek(scene, time);
    });
  }

  if ('IntersectionObserver' in window) {
    const loader = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const scene = scenes.find(item => item.root === entry.target);
        if (scene) load(scene);
      }
    }, { rootMargin: '1100px 0px' });
    for (const scene of scenes) loader.observe(scene.root);
  } else {
    for (const scene of scenes) load(scene);
  }

  function onLayout() {
    for (const scene of scenes) {
      if (scene.src) load(scene);
    }
    tick();
  }
  document.addEventListener?.('visibilitychange', tick);
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', onLayout, { passive: true });
  mobile.addEventListener?.('change', onLayout);
  reduced.addEventListener?.('change', onLayout);
  tick();
})();
