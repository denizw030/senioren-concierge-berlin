(() => {
  const shell = document.getElementById("profileAddressShell");
  if (!shell) return;

  const endpoint = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-profile";
  const hidden = document.getElementById("profileHomeAddress");
  const street = document.getElementById("profileStreet");
  const house = document.getElementById("profileHouseNumber");
  const postal = document.getElementById("profilePostalCode");
  const city = document.getElementById("profileCity");
  const suggestions = document.getElementById("profileAddressSuggestions");
  const suggestionsList = document.getElementById("profileAddressSuggestionList");
  const status = document.getElementById("profileAddressSearchState");
  if (!hidden || !street || !house || !postal || !city || !suggestions || !suggestionsList || !status) return;

  let timer = 0;
  let controller = null;
  let placesSessionToken = newPlacesSessionToken();

  function portalToken() {
    try {
      return JSON.parse(sessionStorage.getItem("scb_web_session") || "null")?.session_token || "";
    } catch (_) {
      return "";
    }
  }

  function newPlacesSessionToken() {
    try {
      if (crypto?.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return "nw-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 13);
  }

  function compact(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function composeAddress() {
    const line1 = [compact(street.value), compact(house.value)].filter(Boolean).join(" ");
    const line2 = [compact(postal.value), compact(city.value)].filter(Boolean).join(" ");
    return [line1, line2].filter(Boolean).join(", ");
  }

  function syncHidden() {
    hidden.value = composeAddress();
  }

  function parseStoredAddress(value) {
    const raw = compact(value);
    if (!raw) return { street: "", house_number: "", postal_code: "", city: "" };

    const comma = raw.split(",").map(compact).filter(Boolean);
    const first = comma[0] || raw;
    const rest = comma.slice(1).join(" ");
    const streetMatch = first.match(/^(.*?)(?:\s+)(\d+[\w\/-]*)$/u);
    const locationSource = rest || (streetMatch ? raw.slice(first.length) : "");
    const locationMatch = compact(locationSource).match(/\b(\d{5})\b\s*(.*)$/u);

    return {
      street: compact(streetMatch?.[1] || first),
      house_number: compact(streetMatch?.[2] || ""),
      postal_code: compact(locationMatch?.[1] || ""),
      city: compact(locationMatch?.[2] || "").replace(/^,\s*/, "")
    };
  }

  function setSearchState(message = "", kind = "") {
    status.textContent = message;
    status.className = "profile-address-search-state" + (kind ? " is-" + kind : "");
  }

  function closeSuggestions() {
    suggestions.hidden = true;
    suggestionsList.replaceChildren();
    street.setAttribute("aria-expanded", "false");
  }

  function applyParts(parts = {}) {
    street.value = compact(parts.street);
    house.value = compact(parts.house_number);
    postal.value = compact(parts.postal_code);
    city.value = compact(parts.city);
    syncHidden();
  }

  function setStoredValue(value) {
    hidden.value = compact(value);
    applyParts(parseStoredAddress(value));
    setSearchState("");
    closeSuggestions();
  }

  async function request(payload, signal) {
    const token = portalToken();
    if (!token) throw new Error("session_missing");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload),
      signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true) throw new Error(String(body?.status || "address_lookup_failed"));
    return body;
  }

  function queryText() {
    const first = [compact(street.value), compact(house.value)].filter(Boolean).join(" ");
    if (first.length < 3) return "";
    return [first, compact(postal.value), compact(city.value), "Deutschland"].filter(Boolean).join(", ");
  }

  function renderSuggestions(items) {
    suggestionsList.replaceChildren();
    const rows = Array.isArray(items) ? items.slice(0, 5) : [];
    if (!rows.length) {
      closeSuggestions();
      return;
    }

    rows.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "profile-address-suggestion";
      button.setAttribute("role", "option");
      button.dataset.placeId = String(item?.place_id || "");

      const pin = document.createElement("span");
      pin.className = "profile-address-pin";
      pin.setAttribute("aria-hidden", "true");
      pin.textContent = "⌖";

      const copy = document.createElement("span");
      copy.className = "profile-address-suggestion-copy";
      copy.textContent = String(item?.text || "");

      button.append(pin, copy);
      button.addEventListener("click", () => selectSuggestion(button.dataset.placeId || ""));
      suggestionsList.appendChild(button);
    });

    suggestions.hidden = false;
    street.setAttribute("aria-expanded", "true");
  }

  async function loadSuggestions() {
    const input = queryText();
    if (!input) {
      closeSuggestions();
      setSearchState("");
      return;
    }

    controller?.abort();
    controller = new AbortController();
    setSearchState("Adresse wird gesucht …");

    try {
      const body = await request({
        action: "address_suggest",
        input,
        session_token: placesSessionToken
      }, controller.signal);
      renderSuggestions(body?.suggestions || []);
      setSearchState(body?.suggestions?.length ? "Adresse auswählen, damit PLZ und Stadt automatisch übernommen werden." : "");
    } catch (error) {
      if (error?.name === "AbortError") return;
      closeSuggestions();
      setSearchState("Google Maps Vorschläge sind gerade nicht verfügbar. Du kannst die Adresse trotzdem manuell eintragen.", "error");
    }
  }

  function scheduleSuggestions() {
    window.clearTimeout(timer);
    syncHidden();
    timer = window.setTimeout(loadSuggestions, 260);
  }

  async function selectSuggestion(placeId) {
    if (!placeId) return;
    controller?.abort();
    controller = new AbortController();
    setSearchState("Adresse wird übernommen …");
    suggestions.querySelectorAll("button").forEach((button) => button.disabled = true);

    try {
      const body = await request({
        action: "address_details",
        place_id: placeId,
        session_token: placesSessionToken
      }, controller.signal);
      const selected = body?.address || {};
      applyParts({
        street: selected.street || street.value,
        house_number: selected.house_number || house.value,
        postal_code: selected.postal_code || postal.value,
        city: selected.city || city.value
      });
      closeSuggestions();
      setSearchState("Adresse übernommen.", "success");
      placesSessionToken = newPlacesSessionToken();
    } catch (error) {
      if (error?.name === "AbortError") return;
      suggestions.querySelectorAll("button").forEach((button) => button.disabled = false);
      setSearchState("Die Adresse konnte gerade nicht automatisch übernommen werden.", "error");
    }
  }

  [street, house].forEach((input) => {
    input.addEventListener("input", scheduleSuggestions);
  });
  [postal, city].forEach((input) => {
    input.addEventListener("input", () => {
      syncHidden();
      if (compact(street.value).length >= 3) scheduleSuggestions();
    });
  });

  street.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !suggestions.hidden) {
      const first = suggestionsList.querySelector("button");
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === "Escape") closeSuggestions();
  });

  document.addEventListener("click", (event) => {
    if (!shell.contains(event.target)) closeSuggestions();
  });

  window.NWProfileAddressEditor = {
    setValue(value) {
      setStoredValue(value);
    }
  };

  setStoredValue(hidden.value);
})();