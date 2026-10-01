
(() => {
  try {
    const hero = document.querySelector('.hero');
    const heroImage = document.querySelector('.hero-image');
    const heroVideo = document.querySelector('.hero-video');
    const leafVideo = document.querySelector('.leaf-video');
    const leafSection = document.querySelector('.leaf-scene');
    const mechanismVideo = document.querySelector('.mechanism-video');
    const precisionSection = document.querySelector('.precision');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    let heroVideoFinished = false;
    if (heroVideo) {
      heroVideo.addEventListener('ended', () => {
        heroVideoFinished = true;
        heroVideo.pause();
        try {
          const holdAt = Math.max(0, heroVideo.duration - 0.04);
          if (Number.isFinite(holdAt)) heroVideo.currentTime = holdAt;
        } catch (_) {}
      });
    }

    const syncHeroVideoMotion = () => {
      if (!heroVideo) return;
      if (heroVideoFinished) {
        heroVideo.pause();
        return;
      }
      if (!heroVideo) return;
      if (motionPreference.matches) {
        heroVideo.pause();
        try { heroVideo.currentTime = 0; } catch (_) {}
        return;
      }
      const playback = heroVideo.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    };
    syncHeroVideoMotion();
    if (typeof motionPreference.addEventListener === 'function') {
      motionPreference.addEventListener('change', syncHeroVideoMotion);
    }

    const updateHero = () => {
      if (!hero || !heroImage) return;
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      hero.style.setProperty('--scroll-y', `${progress * 8}px`);
      hero.style.setProperty('--scroll-light', `${progress * 10}%`);
      hero.style.setProperty('--scroll-scale', String(1 + progress * 0.004));
    };

    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    const updateLeafVideo = () => {
      if (!leafVideo || !leafSection || !Number.isFinite(leafVideo.duration) || leafVideo.duration <= 0) return;
      leafVideo.pause();
      if (motionPreference.matches) {
        try { leafVideo.currentTime = 0; } catch (_) {}
        return;
      }
      const rect = leafSection.getBoundingClientRect();
      const travel = Math.max(1, window.innerHeight + rect.height);
      const progress = clamp01((window.innerHeight - rect.top) / travel);
      const target = progress * Math.max(0, leafVideo.duration - 0.04);
      if (Math.abs(leafVideo.currentTime - target) > 0.025) {
        try { leafVideo.currentTime = target; } catch (_) {}
      }
    };

    const updateMechanismVideo = () => {
      if (!mechanismVideo || !precisionSection || !Number.isFinite(mechanismVideo.duration) || mechanismVideo.duration <= 0) return;
      mechanismVideo.pause();
      if (motionPreference.matches) {
        try { mechanismVideo.currentTime = 0; } catch (_) {}
        return;
      }
      const rect = precisionSection.getBoundingClientRect();
      const travel = Math.max(1, window.innerHeight + rect.height);
      const progress = clamp01((window.innerHeight - rect.top) / travel);
      const target = progress * Math.max(0, mechanismVideo.duration - 0.04);
      if (Math.abs(mechanismVideo.currentTime - target) > 0.025) {
        try { mechanismVideo.currentTime = target; } catch (_) {}
      }
    };

    if (leafVideo) {
      const warmLeafVideo = () => {
        leafVideo.preload = 'auto';
        try { leafVideo.load(); } catch (_) {}
      };
      if ('IntersectionObserver' in window) {
        const leafWarmup = new IntersectionObserver((entries, observer) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            warmLeafVideo();
            observer.disconnect();
          }
        }, { rootMargin: '900px 0px' });
        leafWarmup.observe(leafVideo);
      } else {
        warmLeafVideo();
      }
      leafVideo.addEventListener('loadedmetadata', updateLeafVideo, { once: true });
    }

    if (mechanismVideo) {
      const warmMechanismVideo = () => {
        mechanismVideo.preload = 'auto';
        try { mechanismVideo.load(); } catch (_) {}
      };
      if ('IntersectionObserver' in window) {
        const mechanismWarmup = new IntersectionObserver((entries, observer) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            warmMechanismVideo();
            observer.disconnect();
          }
        }, { rootMargin: '900px 0px' });
        mechanismWarmup.observe(mechanismVideo);
      } else {
        warmMechanismVideo();
      }
      mechanismVideo.addEventListener('loadedmetadata', updateMechanismVideo, { once: true });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateHero();
        updateLeafVideo();
        updateMechanismVideo();
        ticking = false;
      });
    }, { passive: true });
    updateHero();
    updateLeafVideo();
    updateMechanismVideo();

    document.querySelectorAll('[data-entry]').forEach((link) => {
      link.addEventListener('click', () => {
        try { sessionStorage.setItem('stewaro.entryPath', link.dataset.entry || ''); } catch (_) {}
      });
    });
  } catch (_) {
    // Fail open: all website content remains visible.
  }
})();
