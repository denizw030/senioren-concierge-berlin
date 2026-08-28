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
    image.src = profile.image;
    image.alt = `Portrait von ${profile.name}, NAHWERK Concierge`;
    name.textContent = profile.name;
    description.textContent = profile.description;
    dialog.showModal();
    close.focus();
  }

  profiles.forEach(profile => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "concierge-overview-card";
    button.setAttribute("aria-label", `Informationen zu ${profile.name} öffnen`);
    button.innerHTML = `<span class="concierge-overview-card-media"><img src="${profile.image}" alt="Portrait von ${profile.name}, NAHWERK Concierge" width="900" height="1200" loading="lazy" decoding="async"></span><span class="concierge-overview-card-copy"><strong>${profile.name}</strong><small>${profile.description}</small></span>`;
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
