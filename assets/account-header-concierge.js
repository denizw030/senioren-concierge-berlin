(() => {
  "use strict";

  const source = document.getElementById("overviewConcierge");
  const nav = document.querySelector(".top .nav");
  if (!source || !nav) return;

  const sourceCard = source.closest(".account-overview-link");
  const link = document.createElement("a");
  link.id = "accountHeaderConcierge";
  link.className = "nw-header-concierge";
  link.href = "/web-concierge";
  link.hidden = true;
  link.innerHTML = '<span class="nw-header-concierge-avatar" aria-hidden="true"></span><span class="nw-header-concierge-copy"><small>Dein Concierge</small><strong></strong></span><span class="nw-header-concierge-chat" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v5.9a2.8 2.8 0 0 1-2.8 2.8h-4.7L7 19v-3.5A2.8 2.8 0 0 1 5 12.8Z"></path><path d="M9 9h6M9 12h4"></path></svg></span>';
  const links = nav.querySelector(".links");
  nav.insertBefore(link, links || null);

  const nameNode = link.querySelector(".nw-header-concierge-copy strong");
  const avatarNode = link.querySelector(".nw-header-concierge-avatar");
  function sync() {
    const central = source.dataset.personaSource === "central";
    const name = String(source.textContent || "").trim();
    const sourceAvatar = sourceCard?.querySelector("[data-overview-concierge-avatar]");
    const backgroundImage = String(sourceAvatar?.style?.backgroundImage || "").trim();

    if (!central || !name || name === "Concierge wird geladen …") {
      link.hidden = true;
      return false;
    }

    nameNode.textContent = name;
    avatarNode.style.backgroundImage = backgroundImage && backgroundImage !== "none"
      ? backgroundImage
      : 'url("/assets/logos/NAHWERK-Goldmann-Logo.svg")';
    link.setAttribute("aria-label", name + " öffnen und chatten");
    link.title = "Mit " + name + " chatten";
    link.hidden = false;
    return true;
  }

  const observerTarget = sourceCard || source.parentElement || source;
  new MutationObserver(sync).observe(observerTarget, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-persona-source", "style"]
  });

  sync();
  window.addEventListener("pageshow", sync);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
})();
