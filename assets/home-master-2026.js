(() => {
  "use strict";

  const root = document.body;
  if (!root || !root.classList.contains("home-master")) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("master-ready");

  const revealNodes = [...document.querySelectorAll("[data-master-reveal]")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    revealNodes.forEach((node) => revealObserver.observe(node));
  }

  const nav = document.querySelector("[data-master-nav]");
  if (nav) {
    let navTick = false;
    const syncNav = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 16);
      navTick = false;
    };
    syncNav();
    window.addEventListener(
      "scroll",
      () => {
        if (navTick) return;
        navTick = true;
        window.requestAnimationFrame(syncNav);
      },
      { passive: true }
    );
  }

  const taskSteps = [...document.querySelectorAll("[data-task-step]")];
  const taskCards = [...document.querySelectorAll("[data-stack-task]")];
  const taskStatus = document.querySelector("[data-task-status]");
  const statusCopy = {
    cinema: "Die Kinokarten sind aktiv. Das Hausarzt-Thema bleibt trotzdem erhalten.",
    doctor: "Der Hausarzt ist jetzt aktiv. Die Kinokarten bleiben für später im Blick."
  };

  const activateTask = (task, step) => {
    taskSteps.forEach((node) => node.classList.toggle("is-active", node === step));
    taskCards.forEach((card) => {
      const active = card.dataset.stackTask === task;
      card.classList.toggle("is-active", active);
      const badge = card.querySelector("em");
      if (badge) badge.textContent = active ? "aktiv" : "im Blick";
    });
    if (taskStatus && statusCopy[task]) taskStatus.textContent = statusCopy[task];
  };

  if (taskSteps.length && "IntersectionObserver" in window && !reduceMotion) {
    const taskObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        activateTask(visible.target.dataset.taskStep, visible.target);
      },
      { rootMargin: "-30% 0px -40% 0px", threshold: [0.1, 0.35, 0.6] }
    );
    taskSteps.forEach((step) => taskObserver.observe(step));
  } else if (taskSteps[0]) {
    activateTask(taskSteps[0].dataset.taskStep, taskSteps[0]);
  }

  const hero = document.querySelector(".master-hero");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (hero && finePointer && !reduceMotion) {
    let frame = 0;
    hero.addEventListener("pointermove", (event) => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
        hero.style.setProperty("--hero-x", x.toFixed(2) + "px");
        hero.style.setProperty("--hero-y", y.toFixed(2) + "px");
      });
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-x", "0px");
      hero.style.setProperty("--hero-y", "0px");
    });
  }
})();
