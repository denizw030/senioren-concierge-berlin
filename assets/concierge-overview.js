(() => {
  const profiles = window.NAHWERKCarousel?.profiles || [];
  const grid = document.getElementById("conciergeOverviewGrid");
  const dialog = document.getElementById("conciergeProfileDialog");
  const continentOptions = document.getElementById("continentOptions");
  const countryStep = document.getElementById("countryStep");
  const countryOptions = document.getElementById("countryOptions");
  const showAllButton = document.getElementById("showAllConcierges");
  const resultsHead = document.getElementById("conciergeResultsHead");
  const resultsKicker = document.getElementById("conciergeResultsKicker");
  const resultsTitle = document.getElementById("conciergeResultsTitle");
  const resultsReset = document.getElementById("conciergeResultsReset");
  if (!grid || !dialog || !profiles.length || !continentOptions || !countryOptions) return;

  const image = document.getElementById("dialogConciergeImage");
  const name = document.getElementById("dialogConciergeName");
  const description = document.getElementById("dialogConciergeDescription");
  const close = dialog.querySelector(".concierge-dialog-close");
  let opener = null;
  let activeContinent = "";

  const origin = {
    nilo:["Europa","Spanien"], mira:["Europa","Spanien"], sofia:["Europa","Spanien"],
    lena:["Europa","Deutschland"], lukas:["Europa","Deutschland"], hartmut:["Europa","Deutschland"], frida:["Europa","Deutschland"],
    camille:["Europa","Frankreich"], anna:["Europa","Polen"], olena:["Europa","Ukraine"],
    leyla:["Asien","Türkei"], asha:["Asien","Indien"], arjun:["Asien","Indien"], sari:["Asien","Indonesien"],
    noor:["Asien","Levant"], mei:["Asien","China"], wei:["Asien","China"], yuki:["Asien","Japan"], ren:["Asien","Japan"],
    amara:["Afrika","Ghana"], kwame:["Afrika","Ghana"], zuri:["Afrika","Kenia"], jabari:["Afrika","Kenia"]
  };

  const continentMeta = {
    Europa:{eyebrow:"Europa",copy:"Deutsch, spanisch, französisch, polnisch und ukrainisch geprägte Persönlichkeiten."},
    Asien:{eyebrow:"Asien",copy:"Indische, türkische, indonesische, chinesische, japanische und levantinische Persönlichkeiten."},
    Afrika:{eyebrow:"Afrika",copy:"Ghanaische und kenianische Persönlichkeiten mit eigenem Stimm- und Kommunikationsprofil."}
  };

  const grouped = profiles.reduce((acc, profile) => {
    const [continent,country] = origin[profile.key] || ["Weitere","Weitere"];
    acc[continent] ||= {};
    acc[continent][country] ||= [];
    acc[continent][country].push(profile);
    return acc;
  }, {});

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

  function createCard(profile, index) {
    const card = document.createElement("article");
    card.className = "concierge-overview-card";
    card.dataset.conciergeKey = profile.key;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "concierge-overview-profile";
    button.setAttribute("aria-label", `Informationen zu ${profile.name} öffnen`);
    button.innerHTML = `<span class="concierge-overview-card-media"><span class="concierge-overview-placeholder" aria-hidden="true"><span>NAHWERK</span><small>${profile.name}</small></span><img alt="Portrait von ${profile.name}, NAHWERK Concierge" width="480" height="722" decoding="async"></span><span class="concierge-overview-card-copy"><strong>${profile.name}</strong><small>${profile.description}</small></span>`;
    card.appendChild(button);

    const actions = document.createElement("div");
    actions.className = "concierge-overview-actions";
    const voiceControl = window.NAHWERKVoicePreview?.createControl(profile,{className:"concierge-overview-voice"});
    if (voiceControl) actions.appendChild(voiceControl);
    const selectLink = document.createElement("a");
    selectLink.className = "concierge-overview-select";
    selectLink.href = `registrieren.html?produkt=prime&concierge=${encodeURIComponent(profile.key)}`;
    selectLink.textContent = "Auswählen";
    selectLink.setAttribute("aria-label", `${profile.name} auswählen und registrieren`);
    actions.appendChild(selectLink);
    card.appendChild(actions);

    const cardImage = button.querySelector("img");
    cardImage.loading = index < 4 ? "eager" : "lazy";
    if ("fetchPriority" in cardImage) cardImage.fetchPriority = index < 2 ? "high" : "auto";
    cardImage.addEventListener("load", () => {
      card.classList.add("is-image-ready");
      card.classList.remove("is-image-error");
    });
    cardImage.addEventListener("error", () => {
      if (cardImage.dataset.fallbackUsed !== "1" && profile.largeImage) {
        cardImage.dataset.fallbackUsed = "1";
        cardImage.src = profile.largeImage;
        return;
      }
      card.classList.add("is-image-error");
    });
    cardImage.src = profile.cardImage || profile.image;
    if (index < 2) cardImage.decode?.().catch(() => {});

    button.addEventListener("click", event => {
      if (event.target.closest(".concierge-overview-card-media")) {
        location.href = `registrieren.html?produkt=prime&concierge=${encodeURIComponent(profile.key)}`;
        return;
      }
      openProfile(profile, button);
    });
    return card;
  }

  function renderProfiles(list, kicker, title) {
    window.NAHWERKVoicePreview?.stopAll?.();
    grid.replaceChildren();
    list.forEach((profile,index)=>grid.appendChild(createCard(profile,index)));
    grid.hidden = false;
    resultsHead.hidden = false;
    resultsKicker.textContent = kicker;
    resultsTitle.textContent = title;
    requestAnimationFrame(()=>grid.classList.add("is-visible"));
  }

  function resetResults() {
    window.NAHWERKVoicePreview?.stopAll?.();
    grid.classList.remove("is-visible");
    grid.hidden = true;
    resultsHead.hidden = true;
    activeContinent = "";
    countryStep.hidden = true;
    countryOptions.replaceChildren();
    [...continentOptions.querySelectorAll("button")].forEach(button=>button.classList.remove("is-active"));
    showAllButton.classList.remove("is-active");
    continentOptions.querySelector("button")?.focus();
  }

  function makeContinentButton(continent) {
    const countries = grouped[continent] || {};
    const count = Object.values(countries).flat().length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "concierge-continent-card";
    button.dataset.continent = continent;
    button.innerHTML = `
      <span class="concierge-continent-icon" aria-hidden="true"></span>
      <span class="concierge-continent-copy">
        <strong>${continent}</strong>
        <small>${continentMeta[continent]?.copy || ""}</small>
      </span>
      <span class="concierge-continent-count">${count}</span>
    `;
    button.addEventListener("click",()=>selectContinent(continent,button));
    return button;
  }

  function selectContinent(continent, button) {
    activeContinent = continent;
    showAllButton.classList.remove("is-active");
    [...continentOptions.querySelectorAll("button")].forEach(item=>item.classList.toggle("is-active",item===button));
    window.NAHWERKVoicePreview?.stopAll?.();
    grid.hidden = true;
    grid.classList.remove("is-visible");
    resultsHead.hidden = true;
    countryOptions.replaceChildren();

    Object.entries(grouped[continent] || {})
      .sort(([a],[b])=>a.localeCompare(b,"de"))
      .forEach(([country,list])=>{
        const countryButton=document.createElement("button");
        countryButton.type="button";
        countryButton.className="concierge-country-chip";
        countryButton.innerHTML=`<span>${country}</span><small>${list.length} ${list.length===1?"Concierge":"Concierges"}</small>`;
        countryButton.addEventListener("click",()=>{
          [...countryOptions.querySelectorAll("button")].forEach(item=>item.classList.toggle("is-active",item===countryButton));
          renderProfiles(list,`${continent} · ${country}`,`${country}: ${list.length} ${list.length===1?"Concierge":"Concierges"}`);
          document.getElementById("conciergeResultsHead")?.scrollIntoView({behavior:"smooth",block:"start"});
        });
        countryOptions.appendChild(countryButton);
      });
    countryStep.hidden=false;
    requestAnimationFrame(()=>countryStep.classList.add("is-visible"));
  }

  Object.keys(grouped)
    .filter(continent=>["Europa","Asien","Afrika"].includes(continent))
    .forEach(continent=>continentOptions.appendChild(makeContinentButton(continent)));

  showAllButton.addEventListener("click",()=>{
    activeContinent="";
    [...continentOptions.querySelectorAll("button")].forEach(button=>button.classList.remove("is-active"));
    countryStep.hidden=true;
    showAllButton.classList.add("is-active");
    renderProfiles(profiles,"Alle Persönlichkeiten","Alle 23 Concierges");
    document.getElementById("conciergeResultsHead")?.scrollIntoView({behavior:"smooth",block:"start"});
  });

  resultsReset.addEventListener("click",resetResults);

  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener("close", () => opener?.focus());
})();