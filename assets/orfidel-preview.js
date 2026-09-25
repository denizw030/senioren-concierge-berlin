(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const hero = document.querySelector("[data-hero]");
  const manifesto = document.querySelector(".manifesto");
  const sequence = document.querySelector("[data-sequence]");
  const scenes = [...document.querySelectorAll("[data-scene]")];
  const counter = document.querySelector("[data-sequence-counter]");
  const progress = document.querySelector("[data-sequence-progress]");
  const channels = document.querySelector("[data-channels]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (n,min,max)=>Math.min(max,Math.max(min,n));

  const setHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 20);

  let raf = 0;
  const update = () => {
    raf = 0;

    if (hero) {
      const rect = hero.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, hero.offsetHeight * .9), 0, 1);
      root.style.setProperty("--hero-p", p.toFixed(4));
    }

    if (manifesto) {
      const rect = manifesto.getBoundingClientRect();
      const total = Math.max(1, manifesto.offsetHeight - innerHeight);
      const p = clamp(-rect.top / total, 0, 1);
      root.style.setProperty("--manifesto-p", p.toFixed(4));
    }

    if (sequence) {
      const rect = sequence.getBoundingClientRect();
      const total = Math.max(1, sequence.offsetHeight - innerHeight);
      const p = clamp(-rect.top / total, 0, 1);
      root.style.setProperty("--sequence-p", p.toFixed(4));
      if (progress) progress.style.width = (p * 100).toFixed(2) + "%";

      const active = clamp(Math.floor(p * scenes.length), 0, scenes.length - 1);
      scenes.forEach((scene,index)=>scene.classList.toggle("is-active", index === active));
      if (counter) counter.textContent = String(active + 1).padStart(2,"0");
    }

    if (channels) {
      const rect = channels.getBoundingClientRect();
      const p = clamp((innerHeight - rect.top) / Math.max(1, innerHeight + rect.height * .45), 0, 1);
      root.style.setProperty("--channels-p", p.toFixed(4));
    }
  };

  const request = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  setHeader();
  update();
  addEventListener("scroll", () => {
    setHeader();
    if (!reduceMotion) request();
  }, {passive:true});
  addEventListener("resize", request, {passive:true});
})();
