(() => {
  const API = "https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-email-bridge-staging";
  const RETURN_TO = "https://nahwerkconcierge.com/email-concierge.html";
  let currentConnection = null;
  let currentSettings = null;
  let rules = [];

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

  function renderStatus(data) {
    currentConnection = data?.connection || null;
    const connected = !!data?.connected;
    $("emailStatusDot")?.classList.toggle("on", connected);
    if ($("emailStatusText")) $("emailStatusText").textContent = connected ? "Gmail verbunden" : "Noch kein Gmail verbunden";
    if ($("emailStatusMeta")) {
      if (connected) {
        const email = currentConnection?.provider_email || "Google-Konto";
        $("emailStatusMeta").textContent = email + " · sicher über Google OAuth verbunden";
      } else if (currentConnection?.status === "REAUTH_REQUIRED") {
        $("emailStatusMeta").textContent = "Die Verbindung muss erneut bestätigt werden.";
      } else {
        $("emailStatusMeta").textContent = "Verbinde dein Gmail-Konto, damit dein NAHWERK Concierge E-Mails auf deinen Wunsch durchsuchen kann.";
      }
    }
    if ($("connectGoogle")) $("connectGoogle").hidden = connected;
    if ($("disconnectGoogle")) $("disconnectGoogle").hidden = !connected;
    if ($("emailSettingsCard")) $("emailSettingsCard").hidden = !connected;
    if ($("emailRulesCard")) $("emailRulesCard").hidden = !connected;
    const providerStatus = $("gmailProviderStatus");
    if (providerStatus) providerStatus.textContent = connected ? "Verbunden" : "Bereit zum Verbinden";
    document.querySelector('[data-provider="gmail"]')?.classList.toggle("is-connected", connected);
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
      if (status.connected) {
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
      if (!card) return;
      const provider = card.dataset.provider;
      if (provider === "gmail") {
        if (currentConnection) {
          $("emailSettingsCard")?.scrollIntoView({ behavior:"smooth", block:"start" });
        } else {
          $("connectGoogle")?.click();
        }
        return;
      }
      const labels = {outlook:"Outlook / Microsoft 365",yahoo:"Yahoo Mail",icloud:"iCloud Mail",gmx:"GMX",webde:"WEB.DE",strato:"STRATO",ionos:"IONOS",telekom:"Telekom / Magenta Mail",zoho:"Zoho Mail",fastmail:"Fastmail",other:"dieser Anbieter"};
      toast((labels[provider] || "Dieser Anbieter") + " wird erst freigeschaltet, wenn die Verbindung vollständig geprüft ist.");
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
      if (!currentConnection?.id) return;
      if (!confirm("Gmail wirklich vom NAHWERK E-Mail Concierge trennen?")) return;
      setBusy(true);
      try {
        await api("/disconnect", { method:"POST", body:JSON.stringify({ connection_id:currentConnection.id }) });
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
