(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const surface = document.querySelector("[data-fidel-surface]");
  const stage = document.querySelector("[data-fidel-stage]");
  const workflow = document.querySelector("[data-workflow]");
  const workflowSection = document.querySelector(".workflow");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

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

  const setPointerGlow = (event) => {
    root.style.setProperty("--mx", (event.clientX / window.innerWidth * 100).toFixed(2) + "%");
    root.style.setProperty("--my", (event.clientY / window.innerHeight * 100).toFixed(2) + "%");
  };
  if (!reduceMotion) window.addEventListener("pointermove", setPointerGlow, { passive: true });

  let raf = 0;
  const updateWorkflow = () => {
    raf = 0;
    if (!workflowSection || !workflow) return;
    const rect = workflowSection.getBoundingClientRect();
    const total = Math.max(1, workflowSection.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / total, 0, 1);
    const steps = [...workflow.querySelectorAll("[data-step]")];
    const active = clamp(Math.floor(progress * steps.length), 0, steps.length - 1);
    steps.forEach((step, index) => step.classList.toggle("is-active", index <= active));
    workflow.style.setProperty("--workflow-progress", String(active / Math.max(1, steps.length - 1)));
  };
  const requestWorkflow = () => {
    if (!raf) raf = requestAnimationFrame(updateWorkflow);
  };
  updateWorkflow();
  window.addEventListener("scroll", requestWorkflow, { passive: true });
  window.addEventListener("resize", requestWorkflow, { passive: true });

  const canvas = document.getElementById("ambient-field");
  if (!reduceMotion && canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) {
      let width = 0, height = 0, dpr = 1;
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
        const count = Math.round(clamp((width * height) / 28000, 26, 64));
        particles = Array.from({ length: count }, (_, i) => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: .35 + Math.random() * 1.15,
          vx: (-.5 + Math.random()) * .08,
          vy: (-.5 + Math.random()) * .06,
          a: .08 + Math.random() * .24,
          phase: Math.random() * Math.PI * 2 + i
        }));
      };

      window.addEventListener("pointermove", (e) => {
        pointer.x = e.clientX / Math.max(1, width);
        pointer.y = e.clientY / Math.max(1, height);
      }, { passive: true });

      const draw = (time) => {
        ctx.clearRect(0, 0, width, height);
        const t = time * .00018;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx + (pointer.x - .5) * .008;
          p.y += p.vy + (pointer.y - .5) * .005;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
          const alpha = p.a * (.65 + .35 * Math.sin(t * 8 + p.phase));
          ctx.beginPath();
          ctx.fillStyle = "rgba(176,216,255," + alpha.toFixed(3) + ")";
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x, dy = p.y - q.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 12500) {
              const lineA = (1 - dist2 / 12500) * .028;
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
