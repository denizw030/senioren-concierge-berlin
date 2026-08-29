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

  function openProfile(profile, button) {
    opener = button;
    image.width = 900;
    image.height = 1353;
    image.onerror = () => {
      if (image.dataset.fallbackUsed === "1") return;
      image.dataset.fallbackUsed = "1";
      image.src = profile.cardImage || profile.image;
    };
    delete image.dataset.fallbackUsed;
    image.src = profile.largeImage || profile.image;
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
    button.innerHTML = `<span class="concierge-overview-card-media"><span class="concierge-overview-placeholder" aria-hidden="true"><span>NAHWERK</span><small>${profile.name}</small></span><img alt="Portrait von ${profile.name}, NAHWERK Concierge" width="480" height="722" decoding="async"></span><span class="concierge-overview-card-copy"><strong>${profile.name}</strong><small>${profile.description}</small></span>`;
    const cardImage = button.querySelector("img");
    cardImage.loading = index < 4 ? "eager" : "lazy";
    if ("fetchPriority" in cardImage) cardImage.fetchPriority = index < 2 ? "high" : "auto";
    cardImage.addEventListener("load", () => {
      button.classList.add("is-image-ready");
      button.classList.remove("is-image-error");
    });
    cardImage.addEventListener("error", () => {
      if (cardImage.dataset.fallbackUsed !== "1" && profile.largeImage) {
        cardImage.dataset.fallbackUsed = "1";
        cardImage.src = profile.largeImage;
        return;
      }
      button.classList.add("is-image-error");
    });
    cardImage.src = profile.cardImage || profile.image;
    if (index < 2) cardImage.decode?.().catch(() => {});
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
