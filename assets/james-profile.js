(() => {
  const profile = Object.freeze({
    key: "james",
    name: "James",
    role: "Prime Telephone Agent",
    origin: "United Kingdom",
    tagline: "Ruhig. Präzise. Diskret.",
    description: "James ist der spezialisierte NAHWERK Telefon-Agent für Anrufe im Auftrag des Kunden und für vorgesehene Anrufassistenz. Er ersetzt nicht den persönlich ausgewählten Concierge, sondern übernimmt Telefonaufgaben nach außen mit ruhiger, präziser Gesprächsführung.",
    seniorDescription: "James ist der spezialisierte Telefon-Agent für Telefonaufträge und vorgesehene Anrufassistenz. Wenn Sie selbst NAHWERK anrufen, sprechen Sie weiterhin mit Ihrem ausgewählten persönlichen Concierge.",
    background: "Sein fiktiver beruflicher Hintergrund verbindet britischen Executive Service, diskrete Sicherheitskommunikation und persönliche Betreuung auf höchstem Niveau.",
    quote: "James bleibt auch dann ruhig, wenn die Situation es gerade nicht ist.",
    strengths: ["Externe Telefonaufträge","Restaurants, Behörden und Dienstleister","Ruhige Gesprächsführung","Diskrete Unterstützung","Strukturierte Rückfragen","Anrufassistenz"],
    voice: "cedar",
    voiceId: "cedar",
    voiceStatus: "hearing_test",
    voiceProvider: "openai",
    previewModel: "gpt-4o-mini-tts",
    runtimeModel: "gpt-realtime",
    defaultLanguage: "de",
    voiceOrigin: "British RP",
    voiceStyle: "prime_telephone_agent",
    voiceInstructions: "Männlich, britisch geprägt, mitteltief bis tief, extrem kontrolliert, strategisch ruhig, präzise, kultiviert und autoritativ ohne Aggression. Keine James-Bond-Imitation, kein Butler-Klischee, keine Werbestimme. Deutsch sauber aussprechen, mit nur leichter britischer Herkunft.",
    nativeLanguage: "de",
    nativeLanguageLabel: "Deutsch",
    sampleText: "Guten Tag. James. Ihr NAHWERK Telefon-Concierge. Sagen Sie mir einfach, worum es geht. Ich höre zu, ordne die Situation und wir entscheiden anschließend in Ruhe über den nächsten Schritt.",
    sampleAudio: "assets/concierges/voice-samples/james-de.mp3?v=james-20260831-1",
    sampleAudioByLanguage: { de: "assets/concierges/voice-samples/james-de.mp3?v=james-20260831-1" },
    previewLanguages: [{ code: "de", label: "Deutsch" }],
    image: "assets/NAHWERK-Telefon-Concierge-Agent.jpg"
  });
  window.NAHWERK_JAMES_PROFILE = profile;
  let dialog = null, lastTrigger = null;
  function createDialog() {
    const senior = document.body.classList.contains("senior-product");
    const el = document.createElement("dialog");
    el.className = "nw-james-dialog";
    el.setAttribute("aria-labelledby", "nwJamesDialogName");
    el.innerHTML = `
      <button class="nw-james-dialog-close" type="button" aria-label="James-Profil schließen">×</button>
      <div class="nw-james-dialog-layout">
        <figure class="nw-james-dialog-media"><img src="${profile.image}" width="1229" height="1536" alt="James, spezialisierter NAHWERK Telefon-Agent in professionellem Anzug mit Headset"></figure>
        <div class="nw-james-dialog-copy">
          <span class="nw-james-dialog-kicker">NAHWERK Telefon-Agent</span>
          <h2 id="nwJamesDialogName">${profile.name}</h2>
          <p class="nw-james-dialog-role">${profile.role}</p>
          <p class="nw-james-dialog-tagline">„${profile.tagline}“</p>
          <p class="nw-james-dialog-description">${senior ? profile.seniorDescription : profile.description}</p>
          ${senior ? "" : `<p class="nw-james-dialog-background">${profile.background}</p>`}
          <ul class="nw-james-dialog-strengths">${profile.strengths.slice(0, senior ? 3 : 6).map(item => `<li>${item}</li>`).join("")}</ul>
          <blockquote class="nw-james-dialog-quote">„${profile.quote}“</blockquote>
          <div class="nw-james-dialog-voice"><span>Stimme</span><div class="nw-james-dialog-voice-host"></div><small>Teststimme · feste James-Zuordnung · noch nicht final freigegeben</small></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    const host = el.querySelector(".nw-james-dialog-voice-host");
    const control = window.NAHWERKVoicePreview?.createControl(profile, { className: "nw-james-voice" });
    if (control) host.appendChild(control);
    el.querySelector(".nw-james-dialog-close")?.addEventListener("click", () => el.close());
    el.addEventListener("close", () => { window.NAHWERKVoicePreview?.stopAll(); lastTrigger?.focus?.(); });
    return el;
  }
  function openJames(trigger) { lastTrigger = trigger; if (!dialog) dialog = createDialog(); if (!dialog.open) dialog.showModal(); }
  function bind() {
    const images = [...document.querySelectorAll('img[src*="NAHWERK-Telefon-Concierge-Agent"]')];
    images.forEach(image => {
      const trigger = image.closest(".nw-phone-media") || image;
      if (trigger.dataset.jamesProfileReady === "1") return;
      trigger.dataset.jamesProfileReady = "1";
      trigger.classList.add("nw-james-profile-trigger");
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-label", "James – Telefon-Agent-Profil und Stimme öffnen");
      trigger.addEventListener("click", () => openJames(trigger));
      trigger.addEventListener("keydown", event => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); openJames(trigger); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();