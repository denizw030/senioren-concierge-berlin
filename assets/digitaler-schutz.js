(() => {
  'use strict';

  const story = document.querySelector('[data-ds-story]');
  const stage = document.querySelector('[data-ds-stage]');
  if (!story || !stage) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 901px)');
  const overlays = [...stage.querySelectorAll('[data-ds-overlay]')];
  const medias = [...stage.querySelectorAll('[data-ds-media]')];
  const jumps = [...stage.querySelectorAll('[data-ds-jump]')];
  const number = stage.querySelector('[data-scene-number]');
  const checkPanel = stage.querySelector('[data-check-panel]');
  const consentStack = stage.querySelector('[data-consent-stack]');

  const ranges = [
    [0.00, 0.12],
    [0.12, 0.25],
    [0.25, 0.36],
    [0.36, 0.48],
    [0.48, 0.60],
    [0.60, 0.73],
    [0.73, 0.86],
    [0.86, 1.00]
  ];

  let activeScene = 0;
  let ticking = false;
  let scrubRaf = 0;
  const scrubTargets = new WeakMap();

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const loadMedia = (media) => {
    if (!media || media.src || !media.dataset.src) return;
    media.src = media.dataset.src;
    media.load();
  };

  const scenesFor = (media) => (media.dataset.scenes || '').split(',').map(Number);
  const mediaForScene = (scene) => medias.find((media) => scenesFor(media).includes(scene));

  const preloadAround = (scene) => {
    [scene - 1, scene, scene + 1].forEach((index) => loadMedia(mediaForScene(index)));
  };

  const primeMedia = (media) => {
    loadMedia(media);
    if (!media) return;
    media.muted = true;
    media.playsInline = true;
    // Safari/iOS decodes a seek more reliably after a short muted play/pause prime.
    if (media.readyState >= 2 && media.paused && !media.dataset.scrubPrimed) {
      media.dataset.scrubPrimed = '1';
      const promise = media.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(() => media.pause()).catch(() => {});
      } else {
        media.pause();
      }
    }
  };

  const flushScrub = () => {
    scrubRaf = 0;
    medias.forEach((media) => {
      const target = scrubTargets.get(media);
      if (!Number.isFinite(target) || media.readyState < 2 || media.seeking) return;
      if (Math.abs(media.currentTime - target) <= 0.075) return;
      try {
        if (typeof media.fastSeek === 'function' && Math.abs(media.currentTime - target) > 0.35) media.fastSeek(target);
        else media.currentTime = target;
      } catch (_) { /* Safari can reject a seek while media is changing state */ }
    });
  };

  const scheduleScrub = (media, target) => {
    scrubTargets.set(media, target);
    if (!scrubRaf) scrubRaf = requestAnimationFrame(flushScrub);
  };

  const localProgress = (progress, scene) => {
    const [start, end] = ranges[scene];
    return clamp((progress - start) / Math.max(end - start, 0.001));
  };

  const setScene = (scene, progress) => {
    if (scene !== activeScene) activeScene = scene;
    overlays.forEach((overlay, index) => overlay.classList.toggle('is-active', index === scene));
    jumps.forEach((jump, index) => {
      jump.classList.toggle('is-active', index === scene);
      jump.setAttribute('aria-current', index === scene ? 'step' : 'false');
    });
    if (number) number.textContent = String(scene + 1).padStart(2, '0');

    preloadAround(scene);
    const activeMedia = mediaForScene(scene);
    primeMedia(activeMedia);
    medias.forEach((media) => media.classList.toggle('is-active', media === activeMedia));

    if (activeMedia && Number.isFinite(activeMedia.duration) && activeMedia.duration > 0) {
      const local = localProgress(progress, scene);
      const reusedHold = scene >= 4 && scene <= 6 && activeMedia.dataset.dsMedia === '3';
      const target = reusedHold ? Math.max(0, activeMedia.duration - 0.05) : Math.min(activeMedia.duration - 0.04, local * activeMedia.duration);
      scheduleScrub(activeMedia, target);
      activeMedia.pause();
    }

    if (checkPanel) {
      const step = scene === 5 ? Math.max(1, Math.min(4, Math.ceil(localProgress(progress, 5) * 4))) : 0;
      checkPanel.dataset.step = String(step);
    }

    if (consentStack) {
      const local = scene === 6 ? localProgress(progress, 6) : 0;
      const phase = scene === 6 ? (local > 0.56 ? 2 : 1) : 0;
      consentStack.dataset.phase = String(phase);
    }
  };

  const render = () => {
    ticking = false;
    if (reducedMotion.matches || !desktop.matches) return;

    const rect = story.getBoundingClientRect();
    const scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / scrollable);
    story.style.setProperty('--story-progress', progress.toFixed(4));

    let scene = ranges.findIndex(([start, end], index) => progress >= start && (progress < end || index === ranges.length - 1));
    if (scene < 0) scene = 0;
    setScene(scene, progress);
  };

  const requestRender = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  jumps.forEach((button) => {
    button.addEventListener('click', () => {
      const scene = Number(button.dataset.dsJump);
      const [start, end] = ranges[scene];
      const targetProgress = start + (end - start) * 0.22;
      const storyTop = window.scrollY + story.getBoundingClientRect().top;
      const scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
      window.scrollTo({ top: storyTop + targetProgress * scrollable, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  });

  medias.forEach((media) => {
    media.addEventListener('loadedmetadata', requestRender, { passive: true });
    media.addEventListener('loadeddata', () => {
      primeMedia(media);
      requestRender();
    }, { passive: true });
    media.addEventListener('seeked', flushScrub, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) medias.forEach((media) => media.pause());
  });

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  reducedMotion.addEventListener?.('change', requestRender);
  desktop.addEventListener?.('change', requestRender);

  // Prime the opening pair immediately and opportunistically warm the remaining
  // approved clips after first paint, avoiding a cold decode exactly at scene changes.
  primeMedia(medias[0]);
  primeMedia(medias[1]);
  const warmRemaining = () => medias.slice(2).forEach(loadMedia);
  if ('requestIdleCallback' in window) requestIdleCallback(warmRemaining, { timeout: 1800 });
  else setTimeout(warmRemaining, 900);
  setScene(0, 0);
  requestRender();
})();
