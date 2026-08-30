(() => {
  const API = "https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-email-bridge-staging";
  const RETURN_TO = "https://nahwerkconcierge.com/email-concierge.html";
  let currentConnection = null;
  let currentSettings = null;
  let rules = [];
  let connections = [];
  let selectedProvider = null;

  const IMAP_PROVIDERS = new Set(["yahoo","icloud","gmx","webde","strato","ionos","telekom","zoho","fastmail"]);
  const PROVIDERS = {
    gmail:{label:"Gmail",badge:"M"},
    yahoo:{label:"Yahoo Mail",badge:"Y!",secretLabel:"Yahoo App-Passwort",hint:"Erstelle bei Yahoo ein App-Passwort für den Drittanbieter-Zugriff.",steps:["App-Passwort im Yahoo-Konto erstellen.","Yahoo-E-Mail-Adresse und App-Passwort hier eingeben.","NAHWERK prüft IMAP und SMTP direkt."]},
    icloud:{label:"iCloud Mail",badge:"☁",secretLabel:"App-spezifisches Passwort",hint:"Für iCloud ist ein app-spezifisches Passwort erforderlich. Die Zwei-Faktor-Authentifizierung muss aktiviert sein.",steps:["Apple Zwei-Faktor-Authentifizierung aktivieren.","Ein app-spezifisches Passwort für NAHWERK erzeugen.","iCloud-Adresse und dieses App-Passwort hier eingeben."]},
    gmx:{label:"GMX",badge:"GMX",secretLabel:"App-/E-Mail-Passwort",hint:"Aktiviere zuerst den Zugriff über POP3/IMAP. Wenn dein Konto App-Passwörter unterstützt, verwende ein separates App-Passwort.",steps:["IMAP-Zugriff in GMX aktivieren.","Wenn verfügbar, ein separates App-Passwort erzeugen.","GMX-Adresse und dieses Passwort hier eingeben."]},
    webde:{label:"WEB.DE",badge:"WEB",secretLabel:"App-/E-Mail-Passwort",hint:"Aktiviere zuerst den Zugriff über POP3/IMAP. Wenn dein Konto App-Passwörter unterstützt, verwende ein separates App-Passwort.",steps:["IMAP-Zugriff in WEB.DE aktivieren.","Wenn verfügbar, ein separates App-Passwort erzeugen.","WEB.DE-Adresse und dieses Passwort hier eingeben."]},
    telekom:{label:"Telekom / Magenta Mail",badge:"T",secretLabel:"Passwort für E-Mail-Programme",hint:"Verwende ausdrücklich das separate „Passwort für E-Mail-Programme“, nicht dein normales Telekom-Kennwort.",steps:["Im Telekom-Konto ein „Passwort für E-Mail-Programme“ festlegen.","E-Mail-Adresse und dieses separate Passwort eingeben.","NAHWERK prüft die sichere Verbindung."]},
    fastmail:{label:"Fastmail",badge:"F",secretLabel:"Fastmail App-Passwort",hint:"Fastmail verlangt für IMAP/SMTP ein App-Passwort. Ein Tarif mit IMAP/SMTP-Unterstützung ist erforderlich.",steps:["In Fastmail ein App-Passwort erzeugen.","Fastmail-Adresse und App-Passwort hier eingeben.","NAHWERK prüft IMAP und SMTP."]},
    zoho:{label:"Zoho Mail",badge:"Z",secretLabel:"Zoho App-/Mail-Passwort",hint:"Bei 2FA, SAML oder föderierter Anmeldung brauchst du ein app-spezifisches Passwort. Wähle außerdem Kontotyp und Rechenzentrum.",steps:["IMAP in Zoho aktivieren.","Bei 2FA/SAML ein app-spezifisches Passwort erzeugen.","Kontotyp, Rechenzentrum, Adresse und Passwort angeben."]},
    ionos:{label:"IONOS",badge:"I",secretLabel:"Mailbox-Passwort",hint:"Für IONOS wird das Kennwort des jeweiligen E-Mail-Postfachs verwendet.",steps:["Ein separates Test-Postfach ist empfohlen.","Postfach-Adresse und Mailbox-Passwort eingeben.","NAHWERK prüft IMAP und SMTP verschlüsselt."]},
    strato:{label:"STRATO",badge:"S",secretLabel:"Mailbox-Passwort",hint:"Für STRATO wird das Kennwort des jeweiligen E-Mail-Postfachs verwendet.",steps:["Ein separates Test-Postfach ist empfohlen.","Postfach-Adresse und Mailbox-Passwort eingeben.","NAHWERK prüft IMAP und SMTP verschlüsselt."]}
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

  function toast(message) {
    const el = $("emailToast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function sessionToken() {
    const session = window.SCBAuth?.getSession?.();
    return session?.session_token || "";
  }

  async function api(path, options = {}) {
    const token = sessionToken();
    if (!token) throw new Error("web_session_required");
    const headers = new Headers(options.headers || {});
    headers.set("content-type", "application/json");
    headers.set("x-nahwerk-web-session", token);
    const response = await fetch(API + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data?.error || "request_failed");
      err.status = response.status;
      throw err;
    }
    return data;
  }

  function setBusy(on) {
    document.querySelector(".email-shell")?.classList.toggle("email-loading", !!on);
  }

  function providerLabel(key) {
    if (key === "google") return "Gmail";
    if (key === "microsoft") return "Outlook / Microsoft 365";
    return PROVIDERS[key]?.label || key;
  }

  function renderConnections() {
    const root = $("emailConnectionList");
    if (!root) return;
    const active = connections.filter((x) => x && x.status === "CONNECTED");
    if (!active.length) {
      root.innerHTML = '<div class="email-muted">Noch kein E-Mail-Konto verbunden.</div>';
      return;
    }
    root.innerHTML = active.map((item) => `
      <div class="email-connection-row" data-connection-id="${esc(item.id)}">
        <div><strong>${esc(providerLabel(item.provider))}</strong><small>${esc(item.provider_email || "")} · Verbunden</small></div>
        <button class="email-btn danger" type="button" data-disconnect-id="${esc(item.id)}" data-disconnect-provider="${esc(item.provider)}">Trennen</button>
      </div>`).join("");
  }

  function renderStatus(data) {
    connections = Array.isArray(data?.connections) ? data.connections : [];
    const active = connections.filter((x) => x?.status === "CONNECTED");
    const gmailConnection = active.find((x) => x.provider === "google") || null;
    currentConnection = gmailConnection || active[0] || null;
    const connected = active.length > 0;

    $("emailStatusDot")?.classList.toggle("on", connected);
    if ($("emailStatusText")) {
      $("emailStatusText").textContent = connected
        ? (active.length === 1 ? "1 E-Mail-Konto verbunden" : active.length + " E-Mail-Konten verbunden")
        : "Noch kein E-Mail-Konto verbunden";
    }
    if ($("emailStatusMeta")) {
      $("emailStatusMeta").textContent = connected
        ? "Deine aktiven Verbindungen wurden serverseitig geprüft."
        : "Wähle oben einen testbereiten Anbieter und verbinde ein separates Testkonto.";
    }

    if ($("connectGoogle")) $("connectGoogle").hidden = !!gmailConnection;
    if ($("disconnectGoogle")) $("disconnectGoogle").hidden = true;
    if ($("emailSettingsCard")) $("emailSettingsCard").hidden = !connected;
    if ($("emailRulesCard")) $("emailRulesCard").hidden = !connected;

    document.querySelectorAll("[data-provider]").forEach((card) => {
      const key = card.dataset.provider;
      const backendKey = key === "gmail" ? "google" : key;
      const item = active.find((x) => x.provider === backendKey);
      card.classList.toggle("is-connected", !!item);
      const state = card.querySelector(".provider-state");
      if (item && state) state.textContent = "Verbunden";
    });
    const gmailStatus = $("gmailProviderStatus");
    if (gmailStatus) gmailStatus.textContent = gmailConnection ? "Verbunden" : "Technisch in STAGING angebunden";
    renderConnections();
  }

  function openProviderDialog(provider) {
    const cfg = PROVIDERS[provider];
    const dialog = $("emailConnectDialog");
    if (!cfg || !dialog || !IMAP_PROVIDERS.has(provider)) return;
    selectedProvider = provider;
    $("emailConnectBadge").textContent = cfg.badge;
    $("emailConnectTitle").textContent = cfg.label + " verbinden";
    $("emailConnectIntro").textContent = "Der Assistent prüft die Verbindung direkt gegen " + cfg.label + ". Erst eine erfolgreiche IMAP- und SMTP-Prüfung wird als verbunden gespeichert.";
    $("emailConnectSecretLabel").textContent = cfg.secretLabel || "App-/E-Mail-Programm-Passwort";
    $("emailConnectSecretHint").textContent = cfg.hint || "";
    $("emailConnectSteps").innerHTML = (cfg.steps || []).map((step, i) => `<div class="email-connect-step"><b>${i + 1}</b><span>${esc(step)}</span></div>`).join("");
    $("emailConnectZoho").hidden = provider !== "zoho";
    $("emailConnectAddress").value = "";
    $("emailConnectSecret").value = "";
    $("emailConnectResult").textContent = "";
    $("emailConnectResult").classList.remove("is-error");
    dialog.showModal();
    setTimeout(() => $("emailConnectAddress")?.focus(), 50);
  }

  function closeProviderDialog() {
    const dialog = $("emailConnectDialog");
    if (!dialog) return;
    if ($("emailConnectSecret")) $("emailConnectSecret").value = "";
    if ($("emailConnectResult")) $("emailConnectResult").textContent = "";
    selectedProvider = null;
    if (dialog.open) dialog.close();
  }

  async function connectImapProvider(event) {
    event.preventDefault();
    if (!selectedProvider || !IMAP_PROVIDERS.has(selectedProvider)) return;
    const address = $("emailConnectAddress")?.value.trim() || "";
    const secretInput = $("emailConnectSecret");
    const secret = secretInput?.value || "";
    const result = $("emailConnectResult");
    if (!address.includes("@") || !secret) {
      if (result) {
        result.textContent = "Bitte E-Mail-Adresse und das passende Anbieter-/App-Passwort eingeben.";
        result.classList.add("is-error");
      }
      return;
    }
    const payload = { provider:selectedProvider, email:address, secret };
    if (selectedProvider === "zoho") {
      payload.zoho_datacenter = $("zohoDatacenter")?.value || "eu";
      payload.zoho_organization = ($("zohoAccountType")?.value || "personal") === "organization";
    }

    const submit = $("emailConnectSubmit");
    if (submit) submit.disabled = true;
    if (result) {
      result.classList.remove("is-error");
      result.textContent = "Sichere IMAP- und SMTP-Verbindung wird geprüft …";
    }
    try {
      const data = await api("/connect/imap", { method:"POST", body:JSON.stringify(payload) });
      if (!data?.connected) throw new Error("provider_verification_failed");
      if (result) result.textContent = "Verbindung erfolgreich geprüft.";
      toast(providerLabel(selectedProvider) + " wurde sicher verbunden.");
      if (secretInput) secretInput.value = "";
      await loadAll();
      setTimeout(closeProviderDialog, 450);
    } catch (_) {
      if (secretInput) secretInput.value = "";
      if (result) {
        result.textContent = "Die Verbindung konnte nicht bestätigt werden. Prüfe App-/E-Mail-Programm-Passwort, IMAP-Freigabe und Anbieter-Einstellungen.";
        result.classList.add("is-error");
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function renderSettings(settings) {
    currentSettings = settings || {};
    if ($("readingEnabled")) $("readingEnabled").checked = currentSettings.reading_enabled !== false;
    if ($("whatsappEnabled")) $("whatsappEnabled").checked = currentSettings.whatsapp_query_enabled === true;
    if ($("proactiveEnabled")) $("proactiveEnabled").checked = currentSettings.proactive_whatsapp_enabled === true;
    if ($("importanceThreshold")) $("importanceThreshold").value = currentSettings.importance_threshold || "high";
    if ($("emailTimezone")) $("emailTimezone").value = currentSettings.timezone || "Europe/Berlin";
    if ($("emptyDigestPolicy")) $("emptyDigestPolicy").value = currentSettings.empty_digest_policy || "silent";
  }

  function scheduleLabel(rule) {
    const s = rule.schedule_json || {};
    if (rule.schedule_type === "DAILY") return `Täglich · ${String(s.hour ?? 8).padStart(2,"0")}:${String(s.minute ?? 0).padStart(2,"0")} Uhr`;
    if (rule.schedule_type === "WEEKLY") {
      const names = ["So","Mo","Di","Mi","Do","Fr","Sa"];
      return `Wöchentlich · ${names[Number(s.day_of_week ?? 1)] || "Mo"} · ${String(s.hour ?? 8).padStart(2,"0")}:${String(s.minute ?? 0).padStart(2,"0")} Uhr`;
    }
    if (rule.schedule_type === "INTERVAL") return `Alle ${Number(s.minutes || 60)} Minuten`;
    if (rule.schedule_type === "EVENT") return `Ereignisprüfung · ca. alle ${Number(s.poll_minutes || 15)} Minuten`;
    return rule.schedule_type || "Regel";
  }

  function renderRules(data) {
    rules = Array.isArray(data?.rules) ? data.rules : [];
    const root = $("emailRuleList");
    if (!root) return;
    if (!rules.length) {
      root.innerHTML = '<div class="empty">Noch keine automatischen E-Mail-Regeln angelegt.</div>';
      return;
    }
    root.innerHTML = rules.map((rule) => {
      const title = rule.natural_language_request || (rule.rule_kind === "ALERT" ? "E-Mail-Hinweis" : "E-Mail-Zusammenfassung");
      const state = rule.enabled ? "Aktiv" : "Pausiert";
      const next = rule.next_run_at ? new Date(rule.next_run_at).toLocaleString("de-DE", { dateStyle:"short", timeStyle:"short" }) : "–";
      return `
        <div class="email-rule" data-rule-id="${esc(rule.id)}">
          <div>
            <div><span class="email-pill">${esc(rule.rule_kind)}</span><span class="email-pill">${esc(state)}</span></div>
            <div class="email-rule-title">${esc(title)}</div>
            <div class="email-rule-meta">${esc(scheduleLabel(rule))} · Nächste Prüfung: ${esc(next)}</div>
          </div>
          <div class="email-rule-actions">
            <button class="email-btn secondary" type="button" data-action="toggle">${rule.enabled ? "Pausieren" : "Aktivieren"}</button>
            <button class="email-btn danger" type="button" data-action="delete">Löschen</button>
          </div>
        </div>`;
    }).join("");
  }

  function showScheduleFields() {
    const type = $("ruleSchedule")?.value || "DAILY";
    document.querySelectorAll("[data-schedule-field]").forEach((el) => {
      const accepts = String(el.dataset.scheduleField || "").split(",");
      el.hidden = !accepts.includes(type);
    });
    if (type === "EVENT" && $("ruleKind")) $("ruleKind").value = "ALERT";
  }

  function scheduleJson() {
    const type = $("ruleSchedule").value;
    if (type === "DAILY") {
      const [h,m] = ($("ruleTime").value || "08:00").split(":").map(Number);
      return { hour:h, minute:m };
    }
    if (type === "WEEKLY") {
      const [h,m] = ($("ruleTime").value || "08:00").split(":").map(Number);
      return { day_of_week:Number($("ruleDay").value || 1), hour:h, minute:m };
    }
    if (type === "INTERVAL") return { minutes:Math.max(15, Number($("ruleInterval").value || 60)) };
    return { poll_minutes:Math.max(5, Number($("rulePoll").value || 15)) };
  }

  async function loadAll() {
    const valid = await window.SCBAuth?.validateSession?.();
    if (!valid) {
      location.replace("anmelden.html");
      return;
    }
    setBusy(true);
    try {
      const status = await api("/status");
      renderStatus(status);
      if (connections.some((x) => x?.status === "CONNECTED")) {
        const [settings, ruleData] = await Promise.all([api("/settings"), api("/rules")]);
        renderSettings(settings.settings);
        renderRules(ruleData);
      }
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        toast("Deine Sitzung konnte nicht bestätigt werden.");
      } else {
        toast("E-Mail Concierge konnte gerade nicht geladen werden.");
      }
    } finally {
      setBusy(false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".provider-grid")?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-provider]");
      if (!card || card.disabled) return;
      const provider = card.dataset.provider;
      if (provider === "gmail") {
        const gmail = connections.find((x) => x?.provider === "google" && x.status === "CONNECTED");
        if (gmail) {
          $("emailConnectionList")?.scrollIntoView({ behavior:"smooth", block:"center" });
        } else {
          $("connectGoogle")?.click();
        }
        return;
      }
      if (IMAP_PROVIDERS.has(provider)) {
        const existing = connections.find((x) => x?.provider === provider && x.status === "CONNECTED");
        if (existing) {
          $("emailConnectionList")?.scrollIntoView({ behavior:"smooth", block:"center" });
        } else {
          openProviderDialog(provider);
        }
      }
    });

    $("emailConnectForm")?.addEventListener("submit", connectImapProvider);
    $("emailConnectClose")?.addEventListener("click", closeProviderDialog);
    $("emailConnectCancel")?.addEventListener("click", closeProviderDialog);
    $("emailConnectDialog")?.addEventListener("cancel", (event) => { event.preventDefault(); closeProviderDialog(); });
    $("emailConnectDialog")?.addEventListener("close", () => {
      if ($("emailConnectSecret")) $("emailConnectSecret").value = "";
      selectedProvider = null;
    });

    $("emailConnectionList")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-disconnect-id]");
      if (!button) return;
      const id = button.dataset.disconnectId;
      const provider = button.dataset.disconnectProvider;
      if (!id || !confirm(providerLabel(provider) + " wirklich vom NAHWERK E-Mail Concierge trennen?")) return;
      button.disabled = true;
      try {
        await api("/disconnect", { method:"POST", body:JSON.stringify({ connection_id:id }) });
        toast(providerLabel(provider) + " wurde getrennt.");
        await loadAll();
      } catch (_) {
        toast("Die Verbindung konnte gerade nicht getrennt werden.");
      } finally {
        button.disabled = false;
      }
    });

    $("connectGoogle")?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const data = await api("/connect/google", { method:"POST", body:JSON.stringify({ return_to:RETURN_TO }) });
        if (!data.authorization_url) throw new Error("authorization_url_missing");
        location.href = data.authorization_url;
      } catch (_) {
        setBusy(false);
        toast("Google-Verbindung konnte nicht gestartet werden.");
      }
    });

    $("disconnectGoogle")?.addEventListener("click", async () => {
      const gmail = connections.find((x) => x?.provider === "google" && x.status === "CONNECTED");
      if (!gmail?.id) return;
      if (!confirm("Gmail wirklich vom NAHWERK E-Mail Concierge trennen?")) return;
      setBusy(true);
      try {
        await api("/disconnect", { method:"POST", body:JSON.stringify({ connection_id:gmail.id }) });
        toast("Gmail wurde getrennt.");
        await loadAll();
      } catch (_) {
        toast("Gmail konnte nicht getrennt werden.");
      } finally {
        setBusy(false);
      }
    });

    $("saveEmailSettings")?.addEventListener("click", async () => {
      setBusy(true);
      try {
        const data = await api("/settings", {
          method:"PUT",
          body:JSON.stringify({
            reading_enabled:$("readingEnabled").checked,
            whatsapp_query_enabled:$("whatsappEnabled").checked,
            proactive_whatsapp_enabled:$("proactiveEnabled").checked,
            importance_threshold:$("importanceThreshold").value,
            timezone:$("emailTimezone").value || "Europe/Berlin",
            empty_digest_policy:$("emptyDigestPolicy").value
          })
        });
        renderSettings(data.settings);
        toast("E-Mail-Einstellungen gespeichert.");
      } catch (_) {
        toast("Einstellungen konnten nicht gespeichert werden.");
      } finally {
        setBusy(false);
      }
    });

    $("ruleSchedule")?.addEventListener("change", showScheduleFields);
    showScheduleFields();

    $("createEmailRule")?.addEventListener("click", async () => {
      const natural = $("ruleNatural").value.trim();
      if (!natural) {
        toast("Beschreibe kurz, was dein Concierge beobachten soll.");
        $("ruleNatural").focus();
        return;
      }
      setBusy(true);
      try {
        const scheduleType = $("ruleSchedule").value;
        await api("/rules", {
          method:"POST",
          body:JSON.stringify({
            rule_kind:$("ruleKind").value,
            delivery_channel:"WHATSAPP",
            created_by_channel:"WEB",
            natural_language_request:natural,
            schedule_type:scheduleType,
            schedule_json:scheduleJson(),
            filter_json:{
              gmail_query:$("ruleGmailQuery").value.trim() || undefined,
              unread_only:$("ruleUnreadOnly").checked,
              max_results:20
            },
            output_json:{ mode:"summary", language:"de" }
          })
        });
        $("ruleNatural").value = "";
        $("ruleGmailQuery").value = "";
        toast("Regel angelegt.");
        renderRules(await api("/rules"));
      } catch (_) {
        toast("Regel konnte nicht angelegt werden.");
      } finally {
        setBusy(false);
      }
    });

    $("emailRuleList")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      const row = event.target.closest("[data-rule-id]");
      if (!button || !row) return;
      const rule = rules.find((x) => x.id === row.dataset.ruleId);
      if (!rule) return;
      setBusy(true);
      try {
        if (button.dataset.action === "toggle") {
          await api("/rules/" + encodeURIComponent(rule.id), {
            method:"PATCH",
            body:JSON.stringify({ enabled:!rule.enabled })
          });
          toast(rule.enabled ? "Regel pausiert." : "Regel aktiviert.");
        } else if (button.dataset.action === "delete") {
          if (!confirm("Diese E-Mail-Regel wirklich löschen?")) return;
          await api("/rules/" + encodeURIComponent(rule.id), { method:"DELETE", body:"{}" });
          toast("Regel gelöscht.");
        }
        renderRules(await api("/rules"));
      } catch (_) {
        toast("Regel konnte nicht geändert werden.");
      } finally {
        setBusy(false);
      }
    });

    const q = new URLSearchParams(location.search);
    if (q.get("email") === "connected") {
      history.replaceState({}, "", location.pathname);
      toast("Gmail wurde erfolgreich verbunden.");
    }
    loadAll();
  });
})();
