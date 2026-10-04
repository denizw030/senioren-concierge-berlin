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
  let scrubLastFrame = 0;
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
    const radius = desktop.matches ? 1 : 0;
    for (let index = scene - radius; index <= scene + radius; index += 1) loadMedia(mediaForScene(index));
    if (!desktop.matches) loadMedia(mediaForScene(scene + 1));
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

  const flushScrub = (frameTime) => {
    scrubRaf = 0;
    const now = Number.isFinite(frameTime) ? frameTime : performance.now();
    const dt = scrubLastFrame ? clamp((now - scrubLastFrame) / 1000, 1 / 120, 0.05) : 1 / 60;
    scrubLastFrame = now;
    let pending = false;

    medias.forEach((media) => {
      const target = scrubTargets.get(media);
      if (!Number.isFinite(target) || media.readyState < 2) return;

      const diff = target - media.currentTime;
      const threshold = desktop.matches ? 0.075 : 0.025;
      if (Math.abs(diff) <= threshold) return;

      if (media.seeking) {
        if (!desktop.matches) pending = true;
        return;
      }

      try {
        if (desktop.matches) {
          if (typeof media.fastSeek === 'function' && Math.abs(diff) > 0.35) media.fastSeek(target);
          else media.currentTime = target;
          return;
        }

        // iPhone/Safari: never let a normal swipe make the person move faster
        // than roughly natural playback. The video eases toward scroll position
        // instead of jumping directly to every new currentTime target.
        const maxStep = Math.max(0.018, dt * 1.05);
        const easedStep = diff * 0.18;
        const step = clamp(easedStep, -maxStep, maxStep);
        const maxTime = Math.max(0, media.duration - 0.04);
        media.currentTime = clamp(media.currentTime + step, 0, maxTime);
        if (Math.abs(diff) > 0.035) pending = true;
      } catch (_) { /* Safari can reject a seek while media is changing state */ }
    });

    if (pending && !scrubRaf) scrubRaf = requestAnimationFrame(flushScrub);
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
    if (reducedMotion.matches) return;

    const rect = story.getBoundingClientRect();
    const mobileActive = !desktop.matches && rect.top <= 0 && rect.bottom >= window.innerHeight;
    story.classList.toggle('is-mobile-story-active', mobileActive);
    story.classList.toggle('is-mobile-story-past', !desktop.matches && rect.bottom < window.innerHeight);
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
    media.addEventListener('seeked', () => {
      if (!desktop.matches && Number.isFinite(scrubTargets.get(media)) && !scrubRaf) {
        scrubRaf = requestAnimationFrame(flushScrub);
      }
    }, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) medias.forEach((media) => media.pause());
  });

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  window.addEventListener('orientationchange', requestRender, { passive: true });
  reducedMotion.addEventListener?.('change', requestRender);
  desktop.addEventListener?.('change', () => {
    story.classList.remove('is-mobile-story-active', 'is-mobile-story-past');
    requestRender();
  });

  // Desktop may warm nearby clips aggressively. Mobile keeps preparation to
  // the opening pair and then active + next so Safari stays responsive.
  if (!reducedMotion.matches) {
    primeMedia(medias[0]);
    // Desktop may warm more aggressively; mobile starts with only the opening pair.
    if (desktop.matches) {
      primeMedia(medias[1]);
      const warmRemaining = () => medias.slice(2).forEach(loadMedia);
      if ('requestIdleCallback' in window) requestIdleCallback(warmRemaining, { timeout: 1800 });
      else setTimeout(warmRemaining, 900);
    } else {
      loadMedia(medias[1]);
    }
  }
  const mobileScenes = [...document.querySelectorAll('[data-mobile-scene]')];
  let mobileObserver;

  const stopMobileVideo = (article) => {
    const video = article?.querySelector('.ds-mobile-video');
    article?.classList.remove('is-cinematic-active');
    if (!video) return;
    video.pause();
  };

  const startMobileVideo = (article) => {
    if (!article || !document.querySelector('.ds-mobile-flow')?.offsetParent) return;
    const scene = Number(article.dataset.mobileScene);
    const video = article.querySelector('.ds-mobile-video');
    if (!video) return;
    loadMedia(video);
    // Warm only the immediate next chapter; never fan out across all remote MP4s.
    const next = mobileScenes[scene + 1]?.querySelector('.ds-mobile-video');
    if (next) loadMedia(next);
    mobileScenes.forEach((item) => { if (item !== article) stopMobileVideo(item); });
    article.classList.add('is-cinematic-active');
    video.muted = true;
    video.playsInline = true;
    const play = video.play();
    if (play && typeof play.catch === 'function') play.catch(() => {
      // Poster remains visible if iOS declines playback.
      article.classList.add('is-cinematic-active');
    });
  };

  const setupMobileCinema = () => {
    mobileObserver?.disconnect();
    mobileScenes.forEach(stopMobileVideo);
    if (desktop.matches || reducedMotion.matches || !document.querySelector('.ds-mobile-flow')?.offsetParent || !('IntersectionObserver' in window)) return;
    mobileObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible && visible.intersectionRatio >= 0.34) startMobileVideo(visible.target);
    }, { rootMargin: '12% 0px 12% 0px', threshold: [0.34, 0.55, 0.72] });
    mobileScenes.forEach((article) => mobileObserver.observe(article));
  };

  desktop.addEventListener?.('change', setupMobileCinema);
  reducedMotion.addEventListener?.('change', setupMobileCinema);
  setupMobileCinema();
  setScene(0, 0);
  requestRender();
})();
