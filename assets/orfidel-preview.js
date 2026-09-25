(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const pageProgress = document.querySelector("[data-page-progress]");
  const hero = document.querySelector("[data-hero]");
  const heroCopy = document.querySelector("[data-hero-copy]");
  const heroStage = document.querySelector("[data-hero-stage]");
  const surface = document.querySelector("[data-fidel-surface]");
  const stage = document.querySelector("[data-fidel-stage]");
  const cinematic = document.querySelector("[data-cinematic]");
  const journeyScenes = [...document.querySelectorAll("[data-journey-scene]")];
  const journeyIndex = [...document.querySelectorAll(".journey-index span")];
  const workflow = document.querySelector("[data-workflow]");
  const workflowSection = document.querySelector(".workflow");
  const channels = document.querySelector(".channels");
  const finale = document.querySelector(".finale");
  const bentoCards = [...document.querySelectorAll(".bento-card")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  document.querySelectorAll(".reveal").forEach((el) => {
    if (reduceMotion) {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    observer.observe(el);
  });

  if (!reduceMotion && stage && surface) {
    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      surface.style.setProperty("--fx", ((x - .5) * 10).toFixed(2));
      surface.style.setProperty("--fy", ((.5 - y) * 8).toFixed(2));
      surface.style.setProperty("--sx", (x * 100).toFixed(1) + "%");
      surface.style.setProperty("--sy", (y * 100).toFixed(1) + "%");
    });

    stage.addEventListener("pointerleave", () => {
      surface.style.setProperty("--fx", "0");
      surface.style.setProperty("--fy", "0");
      surface.style.setProperty("--sx", "35%");
      surface.style.setProperty("--sy", "15%");
    });
  }

  if (!reduceMotion) {
    window.addEventListener("pointermove", (event) => {
      root.style.setProperty("--mx", (event.clientX / window.innerWidth * 100).toFixed(2) + "%");
      root.style.setProperty("--my", (event.clientY / window.innerHeight * 100).toFixed(2) + "%");
    }, { passive: true });
  }

  let frame = 0;
  const updateScrollScenes = () => {
    frame = 0;
    const scrollY = window.scrollY;
    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const documentProgress = clamp(scrollY / docHeight, 0, 1);
    root.style.setProperty("--page-progress", documentProgress.toFixed(4));
    if (pageProgress) pageProgress.style.height = (documentProgress * 100).toFixed(2) + "%";

    if (hero) {
      const rect = hero.getBoundingClientRect();
      const distance = Math.max(1, Math.min(hero.offsetHeight, window.innerHeight * 1.15));
      const progress = clamp(-rect.top / distance, 0, 1);
      root.style.setProperty("--hero-progress", progress.toFixed(4));
      if (heroCopy) heroCopy.dataset.scrollState = progress > .55 ? "leaving" : "active";
      if (heroStage) heroStage.dataset.scrollState = progress > .7 ? "leaving" : "active";
    }

    if (cinematic) {
      const rect = cinematic.getBoundingClientRect();
      const total = Math.max(1, cinematic.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / total, 0, 1);
      const sceneCount = Math.max(1, journeyScenes.length);
      const active = clamp(Math.round(progress * (sceneCount - 1)), 0, sceneCount - 1);
      cinematic.style.setProperty("--journey", progress.toFixed(4));
      cinematic.style.setProperty("--journey-scene", String(active));
      cinematic.dataset.scene = String(active);

      journeyScenes.forEach((scene, index) => {
        scene.classList.toggle("is-active", index === active);
        scene.setAttribute("aria-hidden", index === active ? "false" : "true");
      });
      journeyIndex.forEach((node, index) => node.classList.toggle("is-active", index === active));
    }

    if (workflowSection && workflow) {
      const rect = workflowSection.getBoundingClientRect();
      const total = Math.max(1, workflowSection.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / total, 0, 1);
      const steps = [...workflow.querySelectorAll("[data-step]")];
      const active = clamp(Math.floor(progress * steps.length), 0, steps.length - 1);
      steps.forEach((step, index) => step.classList.toggle("is-active", index <= active));
      workflow.style.setProperty("--workflow-progress", String(active / Math.max(1, steps.length - 1)));
    }

    if (channels) {
      const rect = channels.getBoundingClientRect();
      const total = Math.max(1, rect.height + window.innerHeight);
      const progress = clamp((window.innerHeight - rect.top) / total, 0, 1);
      channels.style.setProperty("--channels-progress", progress.toFixed(4));
    }

    if (finale) {
      const rect = finale.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / Math.max(1, window.innerHeight + rect.height * .35), 0, 1);
      finale.style.setProperty("--finale-progress", progress.toFixed(4));
    }

    if (!reduceMotion) {
      bentoCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const delta = (center - window.innerHeight / 2) / Math.max(1, window.innerHeight);
        const shift = clamp(delta * -24, -18, 18);
        const tilt = clamp(delta * 1.5, -1.2, 1.2);
        card.style.setProperty("--card-shift", shift.toFixed(2) + "px");
        card.style.setProperty("--card-tilt", tilt.toFixed(2) + "deg");
        card.style.setProperty("--card-index", String(index));
      });
    }
  };

  const requestScrollScenes = () => {
    if (!frame) frame = requestAnimationFrame(updateScrollScenes);
  };

  updateHeader();
  updateScrollScenes();
  window.addEventListener("scroll", () => {
    updateHeader();
    requestScrollScenes();
  }, { passive: true });
  window.addEventListener("resize", requestScrollScenes, { passive: true });

  const canvas = document.getElementById("ambient-field");
  if (!reduceMotion && canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) {
      let width = 0;
      let height = 0;
      let dpr = 1;
      let particles = [];
      const pointer = { x: .5, y: .35 };

      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.round(clamp((width * height) / 26000, 30, 72));
        particles = Array.from({ length: count }, (_, i) => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: .35 + Math.random() * 1.2,
          vx: (-.5 + Math.random()) * .09,
          vy: (-.5 + Math.random()) * .065,
          a: .075 + Math.random() * .24,
          phase: Math.random() * Math.PI * 2 + i
        }));
      };

      window.addEventListener("pointermove", (event) => {
        pointer.x = event.clientX / Math.max(1, width);
        pointer.y = event.clientY / Math.max(1, height);
      }, { passive: true });

      const draw = (time) => {
        ctx.clearRect(0, 0, width, height);
        const t = time * .00018;
        const scrollFactor = Number.parseFloat(getComputedStyle(root).getPropertyValue("--page-progress")) || 0;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx + (pointer.x - .5) * .009 + (scrollFactor - .5) * .004;
          p.y += p.vy + (pointer.y - .5) * .006 - scrollFactor * .007;

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;

          const alpha = p.a * (.62 + .38 * Math.sin(t * 8 + p.phase));
          ctx.beginPath();
          ctx.fillStyle = "rgba(176,216,255," + alpha.toFixed(3) + ")";
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 13200) {
              const lineA = (1 - dist2 / 13200) * (.022 + scrollFactor * .012);
              ctx.strokeStyle = "rgba(132,190,245," + lineA.toFixed(3) + ")";
              ctx.lineWidth = .6;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }
        }

        requestAnimationFrame(draw);
      };

      resize();
      window.addEventListener("resize", resize, { passive: true });
      requestAnimationFrame(draw);
    }
  }
})();
