(() => {
  const profiles = window.NAHWERKCarousel?.profiles || [];
  const grid = document.getElementById("conciergeOverviewGrid");
  const dialog = document.getElementById("conciergeProfileDialog");
  if (!grid || !dialog || !profiles.length) return;
  const image = document.getElementById("dialogConciergeImage");
  const name = document.getElementById("dialogConciergeName");
  const description = document.getElementById("dialogConciergeDescription");
  const close = dialog.querySelector(".concierge-dialog-close");
  let opener = null;

  const loadImage = (img, priority = "auto") => {
    if (!img || img.src || !img.dataset.src) return;
    img.loading = priority === "high" ? "eager" : "lazy";
    if ("fetchPriority" in img) img.fetchPriority = priority;
    img.src = img.dataset.src;
    if (priority === "high") img.decode?.().catch(() => {});
  };

  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      loadImage(img, "auto");
      observer.unobserve(img);
    });
  }, { rootMargin: "700px 0px" }) : null;

  function openProfile(profile, button) {
    opener = button;
    image.width = 900;
    image.height = 1200;
    image.src = profile.image;
    image.alt = `Portrait von ${profile.name}, NAHWERK Concierge`;
    name.textContent = profile.name;
    description.textContent = profile.description;
    dialog.showModal();
    close.focus();
  }

  profiles.forEach((profile, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "concierge-overview-card";
    button.setAttribute("aria-label", `Informationen zu ${profile.name} öffnen`);
    button.innerHTML = `<span class="concierge-overview-card-media"><img alt="Portrait von ${profile.name}, NAHWERK Concierge" width="900" height="1200" decoding="async"></span><span class="concierge-overview-card-copy"><strong>${profile.name}</strong><small>${profile.description}</small></span>`;
    const cardImage = button.querySelector("img");
    cardImage.dataset.src = profile.image;
    if (index < 4) loadImage(cardImage, index < 2 ? "high" : "auto");
    else if (observer) observer.observe(cardImage);
    else loadImage(cardImage, "auto");
    button.addEventListener("click", () => openProfile(profile, button));
    grid.appendChild(button);
  });

  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener("close", () => opener?.focus());
})();