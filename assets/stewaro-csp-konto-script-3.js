
      (() => {
        const ACCOUNT_PREVIEW_KEY = "nw_account_theme_preview";
        sessionStorage.removeItem(ACCOUNT_PREVIEW_KEY);
        const accountTabs = Array.from(document.querySelectorAll("[data-account-tab]"));
        const accountPanels = Array.from(document.querySelectorAll("[data-account-panel]"));

        function applyAccountPreview() {
          const preview = sessionStorage.getItem(ACCOUNT_PREVIEW_KEY);
          if (preview !== "prime" && preview !== "senioren") return;
          const senior = preview === "senioren";
          if (document.body.dataset.product !== preview) document.body.dataset.product = preview;
          if (document.body.classList.contains("senior-product") !== senior) {
            document.body.classList.toggle("senior-product", senior);
          }
        }
        function applyAuthoritativeAccountTheme(brand) {
          const preview = sessionStorage.getItem(ACCOUNT_PREVIEW_KEY);
          if (preview === "prime" || preview === "senioren") return;

          const product = brand === "senioren_concierge"
            ? "senioren"
            : brand === "prime_concierge"
              ? "prime"
              : null;
          if (!product) return;

          const senior = product === "senioren";
          document.body.dataset.product = product;
          document.body.classList.toggle("senior-product", senior);

          try {
            const stored = JSON.parse(sessionStorage.getItem("scb_web_session") || "null");
            if (stored?.session_token) {
              stored.product_context = product;
              sessionStorage.setItem("scb_web_session", JSON.stringify(stored));
            }
            sessionStorage.setItem("nahwerk_product", product);
          } catch (_) {}
        }

        function isManagedAccountContext() {
          return activeAccountContext?.selected?.is_self === false;
        }
        function setManagedContextRestrictions(managed) {
          managedSafetyAuthorized = false;
          const lockedTabs = new Set(["concierge", "email", "safety", "personal", "access"]);
          const usageLocked = managed && activeAccountContext?.actor?.can_view_usage !== true;
          accountTabs.forEach((tab) => {
            const locked = managed && (
              lockedTabs.has(tab.dataset.accountTab) ||
              (tab.dataset.accountTab === "usage" && usageLocked)
            );
            tab.disabled = locked;
            tab.setAttribute("aria-disabled", String(locked));
          });
          document.querySelectorAll("[data-open-account-tab]").forEach((button) => {
            const target = button.dataset.openAccountTab;
            button.disabled = managed && (
              lockedTabs.has(target) ||
              (target === "usage" && usageLocked)
            );
          });
          if (managedContextNotice) managedContextNotice.hidden = !managed;
          if (!managed) {
            safetyCustomerDelay.disabled = false;
            safetyEmergencyDelay.disabled = false;
          }
        }
        function setManagedSafetyAvailable(available) {
          managedSafetyAuthorized = available === true;
          if (!isManagedAccountContext()) return;
          const tab = accountTabs.find((item) => item.dataset.accountTab === "safety");
          if (tab) {
            tab.disabled = !managedSafetyAuthorized;
            tab.setAttribute("aria-disabled", String(!managedSafetyAuthorized));
          }
          document.querySelectorAll('[data-open-account-tab="safety"]').forEach((button) => {
            button.disabled = !managedSafetyAuthorized;
          });
          safetyCustomerDelay.disabled = true;
          safetyEmergencyDelay.disabled = true;
          safetyCustomerDelay.title = "Diese Verzögerung wird im verwalteten Personen-Kontext nicht geändert.";
          safetyEmergencyDelay.title = "Diese Verzögerung wird im verwalteten Personen-Kontext nicht geändert.";
        }
        async function probeManagedSafetyAccess() {
          if (!isManagedAccountContext()) return false;
          const token = sessionToken();
          const accountId = activeAccountContext?.selected?.customer_account_id;
          if (!token || !accountId) return false;
          try {
            const response = await fetch(MANAGED_SAFETY_URL + "?customer_account_id=" + encodeURIComponent(accountId), {
              method: "GET",
              headers: { Authorization: "Bearer " + token }
            });
            const body = await response.json().catch(() => ({}));
            const allowed = response.ok && body?.ok === true && body?.can_write === true;
            setManagedSafetyAvailable(allowed);
            if (allowed) {
              lastSafetyContacts = Array.isArray(body?.safety?.contacts) ? body.safety.contacts : [];
            }
            return allowed;
          } catch (_) {
            setManagedSafetyAvailable(false);
            return false;
          }
        }
        function showSafetyHub() {
          document.querySelectorAll("[data-safety-detail]").forEach((view) => { view.hidden = true; });
          if (safetyHeadingPanel) safetyHeadingPanel.hidden = false;
          if (safetyHub) safetyHub.hidden = false;
        }
        function openSafetySubview(name) {
          if (safetyHeadingPanel) safetyHeadingPanel.hidden = true;
          if (safetyHub) safetyHub.hidden = true;
          document.querySelectorAll("[data-safety-detail]").forEach((view) => { view.hidden = true; });
          if (name === "fraud" && fraudProtectionView) fraudProtectionView.hidden = false;
          if (name === "safety" && safetyCard) {
            safetyCard.hidden = false;
            ensureSafetyLoaded();
          }
        }
        document.addEventListener("click", async (event) => {
          const safetyButton = event.target.closest?.("#openSafetyView");
          if (safetyButton) {
            openSafetySubview("safety");
            return;
          }
          const fraudButton = event.target.closest?.("#openFraudProtectionView");
          if (fraudButton) {
            openSafetySubview("fraud");
            return;
          }
          if (event.target.closest?.("[data-safety-back]")) {
            showSafetyHub();
            return;
          }
          const passwordButton = event.target.closest?.("#passwordChangeButton");
          if (!passwordButton) return;

          const email = String(document.getElementById("profileEmail")?.value || "").trim();
          if (!email) {
            if (passwordChangeFeedback) passwordChangeFeedback.textContent = "Die hinterlegte E-Mail-Adresse konnte nicht geladen werden.";
            return;
          }
          passwordButton.disabled = true;
          if (passwordChangeFeedback) passwordChangeFeedback.textContent = "Sicherer Link wird angefordert …";
          try {
            await fetch(PASSWORD_RESET_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
            if (passwordChangeFeedback) passwordChangeFeedback.textContent = "Prüfe dein E-Mail-Postfach. Dort findest du den sicheren Link zum Ändern deines Passworts.";
          } catch (_) {
            if (passwordChangeFeedback) passwordChangeFeedback.textContent = "Der Link konnte gerade nicht angefordert werden. Bitte versuche es erneut.";
          } finally {
            passwordButton.disabled = false;
          }
        });

        function setAccountTab(name, focus = false) {
          if (isManagedAccountContext() && ["concierge", "email", "personal", "access"].includes(name)) name = "overview";
          if (isManagedAccountContext() && name === "safety" && !managedSafetyAuthorized) name = "overview";
          if (isManagedAccountContext() && name === "usage" && activeAccountContext?.actor?.can_view_usage !== true) name = "overview";
          const validName = accountTabs.some((tab) => tab.dataset.accountTab === name) ? name : "overview";
          accountTabs.forEach((tab) => {
            const active = tab.dataset.accountTab === validName;
            tab.setAttribute("aria-selected", String(active));
            tab.tabIndex = active ? 0 : -1;
            if (active && focus) tab.focus({ preventScroll: true });
          });
          document.body.dataset.accountActivePanel = validName;
          accountPanels.forEach((panel) => {
            const active = panel.dataset.accountPanel === validName;
            panel.dataset.accountTabVisible = active ? "true" : "false";
            panel.hidden = !active;
          });
          if (validName !== "safety") {
            setSafetyFormOpen(false);
            document.querySelectorAll("[data-safety-detail]").forEach((view) => { view.hidden = true; });
          }
          if (validName === "safety") showSafetyHub();
          if (validName === "personal" && !isManagedAccountContext()) ensureMfaLoaded();
          if (validName === "concierge") ensureReceptionLoaded();
          if (validName === "email") window.NAHWERKEmailAccount?.activate?.();
          if (validName === "access") ensureFamilyPermissionsLoaded();
        }
        accountTabs.forEach((tab, index) => {
          tab.addEventListener("click", () => setAccountTab(tab.dataset.accountTab));
          tab.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % accountTabs.length;
            if (event.key === "ArrowLeft") next = (index - 1 + accountTabs.length) % accountTabs.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = accountTabs.length - 1;
            setAccountTab(accountTabs[next].dataset.accountTab, true);
          });
        });
        document.querySelectorAll("[data-open-account-tab]").forEach((button) => {
          button.addEventListener("click", () => setAccountTab(button.dataset.openAccountTab));
        });

        window.NAHWERKAccountPreview = Object.freeze({
          prime() {
            sessionStorage.setItem(ACCOUNT_PREVIEW_KEY, "prime");
            applyAccountPreview();
          },
          senioren() {
            sessionStorage.setItem(ACCOUNT_PREVIEW_KEY, "senioren");
            applyAccountPreview();
          },
          reset() {
            sessionStorage.removeItem(ACCOUNT_PREVIEW_KEY);
            location.reload();
          }
        });
        applyAccountPreview();
        const previewObserver = new MutationObserver(() => {
          const preview = sessionStorage.getItem(ACCOUNT_PREVIEW_KEY);
          if (preview !== "prime" && preview !== "senioren") return;
          const senior = preview === "senioren";
          if (document.body.dataset.product !== preview || document.body.classList.contains("senior-product") !== senior) {
            applyAccountPreview();
          }
        });
        previewObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-product"] });

        function pct(a, b) {
          return b ? Math.min(100, Math.round((a / b) * 100)) : 0;
        }
        function numberOrNull(value) {
          if (value === null || value === undefined || value === "") return null;
          const parsed = Number(value);
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
        }
        function formatCount(value) {
          return Number(value).toLocaleString("de-DE");
        }
        function formatPrice(cents) {
          const value = numberOrNull(cents);
          if (value === null) return "–";
          return (value / 100).toLocaleString("de-DE", {
            minimumFractionDigits: value === 0 ? 0 : 2,
            maximumFractionDigits: 2
          }) + " €";
        }
        function renderChannelUsage(prefix, usedValue, limitValue) {
          const used = numberOrNull(usedValue);
          const limit = numberOrNull(limitValue);
          const summary = document.getElementById(prefix + "UsageSummary");
          const detail = document.getElementById(prefix + "UsageDetail");
          const track = document.getElementById(prefix + "UsageBarTrack");
          const bar = document.getElementById(prefix + "UsageBar");

          if (limit === null) {
            summary.textContent = "Kontingent nicht verfügbar";
            detail.textContent = "Die Tarifdaten konnten derzeit nicht geladen werden.";
            track.hidden = true;
            return { used: null, limit: null, remaining: null };
          }
          if (used === null) {
            summary.textContent = formatCount(limit) + " Dialoge im Tarif enthalten";
            detail.textContent = "Aktueller Verbrauch konnte gerade nicht geladen werden.";
            track.hidden = true;
            return { used: null, limit, remaining: null };
          }

          const remaining = Math.max(0, limit - used);
          summary.textContent = formatCount(remaining) + " Dialoge verbleibend";
          detail.textContent = formatCount(used) + " von " + formatCount(limit) + " Dialogen genutzt";
          track.hidden = false;
          bar.style.width = pct(used, limit) + "%";
          return { used, limit, remaining };
        }
        function setUsage(plan, usage) {
          document.getElementById("usageState").hidden = true;
          document.getElementById("usageGrid").hidden = false;
          const app = renderChannelUsage("app", usage?.app_dialogues_used, plan?.app_dialogue_limit);
          const whatsapp = renderChannelUsage("whatsapp", usage?.whatsapp_dialogues_used, plan?.whatsapp_dialogue_limit);
          window.NahwerkActivation?.observeUsage?.(usage);
          const overviewUsage = document.getElementById("overviewUsage");
          if (overviewUsage) {
            if (whatsapp.remaining !== null) {
              overviewUsage.textContent = formatCount(whatsapp.remaining) + " von " + formatCount(whatsapp.limit) + " WhatsApp-Dialogen übrig";
            } else if (app.limit !== null && whatsapp.limit !== null) {
              overviewUsage.textContent = "Tarifkontingent: " + formatCount(app.limit) + " App · " + formatCount(whatsapp.limit) + " WhatsApp";
            } else {
              overviewUsage.textContent = "Nutzung derzeit nicht verfügbar";
            }
          }
        }
        function applyPlanAndUsage(plan, usage) {
          if (!plan?.code) return;
          const label = String(plan.code).replace(/_/g, " ");
          const appLimit = numberOrNull(plan.app_dialogue_limit);
          const whatsappLimit = numberOrNull(plan.whatsapp_dialogue_limit);
          document.getElementById("planName").textContent = label + " · " + formatPrice(plan.monthly_price_cents) + " / MONAT";
          document.getElementById("planMeta").textContent = appLimit !== null && whatsappLimit !== null
            ? formatCount(appLimit) + " App-Dialoge · " + formatCount(whatsappLimit) + " WhatsApp-Dialoge pro Monat."
            : "Die Tarifkontingente konnten derzeit nicht geladen werden.";
          document.getElementById("contactStatus").textContent = label + " aktiv";
          document.getElementById("planStatusMeta").textContent = "Ihr aktuell gebuchter Tarif ist diesem Konto sicher zugeordnet.";
          setUsage(plan, usage || null);
        }
        function prefSummary(p) {
          if (!p) return;
          const names = {
            normal: "Normales Tempo",
            slightly_slow: "Etwas langsamer",
            slow: "Langsam",
            very_slow: "Sehr langsam",
            balanced: "Normal verständlich",
            simple: "Sehr einfach",
            step_by_step: "Schritt für Schritt",
            brief: "Kurz & knapp",
          };
          const chips = [];
          chips.push(p.addressing === "sie" ? "Sie-Ansprache" : "Du-Ansprache");
          if (p.speechSpeed) chips.push(names[p.speechSpeed] || p.speechSpeed);
          if (p.detailLevel) chips.push(names[p.detailLevel] || p.detailLevel);
          if (p.customInstructions)
            chips.push("Individuelle Vorgaben gespeichert");
          document.getElementById("prefSummary").innerHTML = chips
            .map((x) => '<span class="prefchip">' + x + "</span>")
            .join("");
        }

        const ACCOUNT_CONTEXT_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-account-context";
        const ACCOUNT_CONTEXT_STORAGE_KEY = "nw_selected_account_context_v1";
        let activeAccountContext = null;
        const managedPersonContext = document.getElementById("managedPersonContext");
        const personContextSelect = document.getElementById("personContextSelect");
        const personContextMeta = document.getElementById("personContextMeta");
        const managedContextNotice = document.getElementById("managedContextNotice");
        const FAMILY_PERMISSIONS_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-family-permissions";
        const familyAccessList = document.getElementById("familyAccessList");
        const familyAccessStatus = document.getElementById("familyAccessStatus");
        const familyAccessMeta = document.getElementById("familyAccessMeta");
        let familyPermissionsLoaded = false;

        const PROFILE_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-profile";
        const PROFILE_CACHE_KEY = "nw_account_profile_cache_v1";
        const PASSWORD_RESET_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-password-recovery-request-secure";
        const MFA_STATUS_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-mfa-status";
        const MFA_MANAGE_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-mfa-manage";
        const SAFETY_CONTACTS_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-safety-contacts";
        const MANAGED_SAFETY_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-managed-safety-context";
        let managedSafetyAuthorized = false;
        const safetyHub = document.getElementById("safetyHub");
        const safetyHeadingPanel = document.querySelector('.account-panel-heading[data-account-panel="safety"]');
        const fraudProtectionView = document.getElementById("fraudProtectionView");
        const openSafetyViewButton = document.getElementById("openSafetyView");
        const openFraudProtectionViewButton = document.getElementById("openFraudProtectionView");
        const passwordChangeButton = document.getElementById("passwordChangeButton");
        const passwordChangeFeedback = document.getElementById("passwordChangeFeedback");
        const safetyCard = document.getElementById("safetyCard");
        const safetyForm = document.getElementById("safetyForm");
        const safetyStatus = document.getElementById("safetyStatus");
        const safetyMeta = document.getElementById("safetyMeta");
        const safetyNext = document.getElementById("safetyNext");
        const safetyEnabled = document.getElementById("safetyEnabled");
        const safetyToggleLabel = document.getElementById("safetyToggleLabel");
        const safetyTimeList = document.getElementById("safetyTimeList");
        const safetyAddTimeButton = document.getElementById("safetyAddTimeButton");
        const safetyCustomerDelay = document.getElementById("safetyCustomerDelay");
        const safetyEmergencyDelay = document.getElementById("safetyEmergencyDelay");
        const safetyContactList = document.getElementById("safetyContactList");
        const safetyAddContactButton = document.getElementById("safetyAddContactButton");
        const safetyEditButton = document.getElementById("safetyEditButton");
        const safetyCancelButton = document.getElementById("safetyCancelButton");
        const safetySaveButton = document.getElementById("safetySaveButton");
        const safetySaveStatus = document.getElementById("safetySaveStatus");
        const safetyVisibleStatus = document.getElementById("safetyVisibleStatus");
        const safetySummaryIntro = document.getElementById("safetySummaryIntro");
        const safetySummaryGrid = document.getElementById("safetySummaryGrid");
        const safetySummaryNext = document.getElementById("safetySummaryNext");
        const safetySummaryTimes = document.getElementById("safetySummaryTimes");
        const safetySummaryResponse = document.getElementById("safetySummaryResponse");
        const safetySummaryCalls = document.getElementById("safetySummaryCalls");
        const safetySummaryContacts = document.getElementById("safetySummaryContacts");
        const safetySummaryEscalation = document.getElementById("safetySummaryEscalation");
        const safetyChainEscalation = document.getElementById("safetyChainEscalation");
        let lastSafety = null;
        let lastSafetyContacts = [];

        function sessionToken() {
          try {
            return JSON.parse(sessionStorage.getItem("scb_web_session") || "null")?.session_token || "";
          } catch (_) {
            return "";
          }
        }
        function accountSession() {
          try {
            return JSON.parse(sessionStorage.getItem("scb_web_session") || "null");
          } catch (_) {
            return null;
          }
        }
        renderActorOwnerName();
        try {
          if (sessionToken()) localStorage.removeItem("scb_onboarding");
        } catch (_) {}
        function activeSelfAccountId() {
          if (activeAccountContext?.selected?.is_self === true && activeAccountContext?.selected?.customer_account_id) {
            return String(activeAccountContext.selected.customer_account_id);
          }
          const session = accountSession();
          return String(session?.customer_account_id || "");
        }
        function accessBadge(text) {
          const span = document.createElement("span");
          span.className = "access-badge";
          span.textContent = text;
          return span;
        }
        function renderFamilyPermissions(payload) {
          const actors = Array.isArray(payload?.actors) ? payload.actors : [];
          familyAccessList.innerHTML = "";
          familyAccessStatus.textContent = "Sicher verbunden";
          familyAccessMeta.textContent = actors.length
            ? "Änderungen werden sofort serverseitig gespeichert und protokolliert."
            : "Aktuell ist keine weitere Person mit diesem Konto verknüpft.";

          if (!actors.length) {
            const empty = document.createElement("div");
            empty.className = "access-empty";
            empty.textContent = "Keine weiteren verwaltenden Personen vorhanden.";
            familyAccessList.appendChild(empty);
            return;
          }

          actors.forEach((actor) => {
            const row = document.createElement("div");
            row.className = "access-person";
            row.dataset.actorPersonId = String(actor.actor_person_id || "");

            const head = document.createElement("div");
            head.className = "access-person-head";
            const nameWrap = document.createElement("div");
            nameWrap.className = "access-person-name";
            const name = document.createElement("strong");
            name.textContent = actor.display_name || "Verknüpfte Person";
            const meta = document.createElement("span");
            meta.textContent = actor.role === "account_owner" ? "Verwalter / Kontozugang" : (actor.role || "Verknüpfter Zugang");
            nameWrap.append(name, meta);

            const badges = document.createElement("div");
            badges.className = "access-badges";
            if (actor.is_payer) badges.appendChild(accessBadge("Zahler"));
            if (actor.can_manage_plan) badges.appendChild(accessBadge("Tarifverwaltung"));
            if (actor.can_view_usage) badges.appendChild(accessBadge("Nutzung sichtbar"));
            head.append(nameWrap, badges);

            const rights = document.createElement("div");
            rights.className = "access-rights";
            [
              {
                permission:"manage_preferences",
                checked:Boolean(actor.manage_preferences),
                title:"Concierge-Einstellungen verwalten",
                copy:"Ansprache, Sprechtempo, Erklärstil und persönliche Concierge-Präferenzen."
              },
              {
                permission:"manage_safety",
                checked:Boolean(actor.manage_safety),
                title:"Sicherheitseinstellungen verwalten",
                copy:"Freigabe wird serverseitig gespeichert. Der verwaltete Safety-Editor bleibt bis zur vollständigen Safety-Kontextanbindung geschützt."
              }
            ].forEach((item) => {
              const label = document.createElement("label");
              label.className = "access-right";
              const input = document.createElement("input");
              input.type = "checkbox";
              input.checked = item.checked;
              input.dataset.familyPermission = item.permission;
              input.disabled = Boolean(actor.has_wildcard_permission);
              const copy = document.createElement("span");
              const strong = document.createElement("strong");
              strong.textContent = item.title;
              const small = document.createElement("span");
              small.textContent = actor.has_wildcard_permission
                ? item.copy + " Dieses Recht ist aktuell Teil einer globalen Freigabe und kann hier nicht einzeln verändert werden."
                : item.copy;
              copy.append(strong, small);
              label.append(input, copy);
              rights.appendChild(label);
            });

            row.append(head, rights);
            familyAccessList.appendChild(row);
          });
        }
        async function loadFamilyPermissions() {
          if (isManagedAccountContext()) return false;
          const token = sessionToken();
          const accountId = activeSelfAccountId();
          if (!token || !accountId) return false;
          familyAccessStatus.textContent = "Wird geladen";
          try {
            const response = await fetch(FAMILY_PERMISSIONS_URL + "?customer_account_id=" + encodeURIComponent(accountId), {
              method: "GET",
              headers: { Authorization: "Bearer " + token }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) throw new Error(String(body?.status || "family_permissions_load_failed"));
            renderFamilyPermissions(body);
            familyPermissionsLoaded = true;
            return true;
          } catch (_) {
            familyAccessStatus.textContent = "Nicht verfügbar";
            familyAccessList.innerHTML = '<div class="access-empty">Die Zugriffsrechte konnten gerade nicht sicher geladen werden.</div>';
            familyAccessMeta.textContent = "";
            familyPermissionsLoaded = false;
            return false;
          }
        }
        function ensureFamilyPermissionsLoaded() {
          if (familyPermissionsLoaded) return;
          loadFamilyPermissions();
        }
        familyAccessList?.addEventListener("change", async (event) => {
          const input = event.target.closest("[data-family-permission]");
          if (!input) return;
          const row = input.closest(".access-person");
          const actorPersonId = String(row?.dataset.actorPersonId || "");
          const permission = String(input.dataset.familyPermission || "");
          const enabled = input.checked;
          const token = sessionToken();
          const accountId = activeSelfAccountId();
          if (!token || !accountId || !actorPersonId) {
            input.checked = !enabled;
            familyAccessMeta.textContent = "Ihre Sitzung oder der sichere Kontokontext ist nicht mehr verfügbar.";
            return;
          }

          input.disabled = true;
          familyAccessMeta.textContent = "Freigabe wird sicher gespeichert …";
          try {
            const response = await fetch(FAMILY_PERMISSIONS_URL, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
              },
              body: JSON.stringify({
                customer_account_id: accountId,
                actor_person_id: actorPersonId,
                permission,
                enabled
              })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) throw new Error(String(body?.status || "permission_update_failed"));
            renderFamilyPermissions(body);
            familyAccessMeta.textContent = enabled ? "Freigabe erteilt." : "Freigabe widerrufen.";
          } catch (error) {
            input.checked = !enabled;
            input.disabled = false;
            const status = error instanceof Error ? error.message : "";
            familyAccessMeta.textContent = status === "wildcard_permission_requires_full_revoke"
              ? "Diese Berechtigung gehört zu einer globalen Freigabe und kann nicht einzeln verändert werden."
              : "Die Freigabe konnte gerade nicht geändert werden.";
          }
        });
        function contextDisplayName(account) {
          const name = [account?.target_first_name, account?.target_last_name].filter(Boolean).join(" ").trim();
          return name || "Person";
        }
        function renderSelectedAccountContext(body, accountMeta = null) {
          activeAccountContext = body;
          renderActorOwnerName(body?.actor || null);
          renderProfilePayload(body?.snapshot || {});
          const profile = body?.snapshot?.profile || {};
          const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || contextDisplayName(accountMeta);
          const recipientName = document.getElementById("recipientName");
          const recipientMeta = document.getElementById("recipientMeta");
          if (recipientName) recipientName.textContent = displayName || "–";
          if (recipientMeta) {
            const relation = accountMeta?.relationship ? String(accountMeta.relationship) : "";
            const accessParts = [relation];
            if (body?.actor?.is_payer === true || body?.actor?.can_manage_plan === true) accessParts.push("Tarif sichtbar");
            if (body?.actor?.can_view_usage === true) accessParts.push("Nutzung sichtbar");
            recipientMeta.textContent = accessParts.filter(Boolean).join(" · ") || "Getrennter Personen-Kontext";
          }
          const managed = body?.selected?.is_self === false;
          safetyLoadStarted = false;
          familyPermissionsLoaded = false;
          if (familyAccessStatus) familyAccessStatus.textContent = "Wird geladen";
          if (familyAccessMeta) familyAccessMeta.textContent = "";
          setManagedContextRestrictions(managed);
          if (!managed && body?.snapshot) storeProfileCache(body.snapshot);
          try {
            sessionStorage.setItem(ACCOUNT_CONTEXT_STORAGE_KEY, JSON.stringify({
              actor_person_id: body?.actor?.person_id || accountSession()?.person_id || "",
              actor_display_name: body?.actor?.display_name || "",
              customer_account_id: body?.selected?.customer_account_id || "",
              target_person_id: body?.selected?.person_id || "",
              is_self: body?.selected?.is_self === true,
              display_name: displayName || "",
              relationship: accountMeta?.relationship ? String(accountMeta.relationship) : ""
            }));
          } catch (_) {}
          if (managed) {
            setAccountTab("overview");
            probeManagedSafetyAccess();
          }
        }
        async function selectAccountContext(customerAccountId, accountMeta = null) {
          const token = sessionToken();
          if (!token || !customerAccountId) return false;
          try {
            const response = await fetch(ACCOUNT_CONTEXT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
              },
              body: JSON.stringify({ customer_account_id: customerAccountId }),
              signal: AbortSignal.timeout(9000)
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true || body?.status !== "account_selected") return false;
            renderSelectedAccountContext(body, accountMeta);
            return true;
          } catch (_) {
            return false;
          }
        }
        async function loadAccountContexts() {
          const token = sessionToken();
          const session = accountSession();
          if (!token || !session?.person_id) return false;
          try {
            const response = await fetch(ACCOUNT_CONTEXT_URL, {
              method: "GET",
              headers: { Authorization: "Bearer " + token },
              signal: AbortSignal.timeout(9000)
            });
            const body = await response.json().catch(() => ({}));
            const accounts = Array.isArray(body?.accounts) ? body.accounts : [];
            if (!response.ok || body?.ok !== true || !accounts.length) return false;

            let storedAccountId = "";
            try {
              const stored = JSON.parse(sessionStorage.getItem(ACCOUNT_CONTEXT_STORAGE_KEY) || "null");
              if (stored?.actor_person_id === session.person_id) storedAccountId = String(stored.customer_account_id || "");
            } catch (_) {}

            const fallback = accounts.find((account) => account.is_self) || accounts[0];
            const selected = accounts.find((account) => String(account.customer_account_id) === storedAccountId)
              || accounts.find((account) => String(account.customer_account_id) === String(session.customer_account_id || ""))
              || fallback;

            if (managedPersonContext && personContextSelect) {
              managedPersonContext.hidden = accounts.length < 2;
              personContextSelect.innerHTML = "";
              accounts.forEach((account) => {
                const option = document.createElement("option");
                option.value = String(account.customer_account_id);
                const label = account.is_self
                  ? "Ich · " + contextDisplayName(account)
                  : contextDisplayName(account) + (account.relationship ? " · " + account.relationship : "");
                option.textContent = label;
                personContextSelect.appendChild(option);
              });
              personContextSelect.value = String(selected.customer_account_id);
              if (personContextMeta) {
                personContextMeta.textContent = accounts.length > 1
                  ? accounts.length + " getrennte Personen-/Kontokontexte sind mit diesem Login verknüpft."
                  : "Dieses Login ist aktuell mit einem Personen-/Kontokontext verknüpft.";
              }
            }

            const selectedOk = await selectAccountContext(selected.customer_account_id, selected);
            if (!selectedOk) return false;

            if (personContextSelect && !personContextSelect.dataset.bound) {
              personContextSelect.dataset.bound = "true";
              personContextSelect.addEventListener("change", async () => {
                const nextId = personContextSelect.value;
                const meta = accounts.find((account) => String(account.customer_account_id) === String(nextId)) || null;
                personContextSelect.disabled = true;
                const ok = await selectAccountContext(nextId, meta);
                personContextSelect.disabled = false;
                if (!ok && activeAccountContext?.selected?.customer_account_id) {
                  personContextSelect.value = String(activeAccountContext.selected.customer_account_id);
                }
              });
            }
            return true;
          } catch (_) {
            return false;
          }
        }
        let profileCacheApplied = false;
        function renderProfilePayload(body) {
          applyAuthoritativeAccountTheme(body?.brand);
          applyProfile(body?.profile || {});
          const authoritativeFirstName = String(body?.profile?.first_name || "").trim();
          if (authoritativeFirstName) {
            document.querySelectorAll(".nw-account-name").forEach((node) => {
              node.textContent = authoritativeFirstName;
            });
            try {
              const session = accountSession();
              if (
                session?.session_token &&
                (!body?.customer_account_id || String(session.customer_account_id || "") === String(body.customer_account_id))
              ) {
                session.first_name = authoritativeFirstName;
                sessionStorage.setItem("scb_web_session", JSON.stringify(session));
              }
            } catch (_) {}
          }
          const customerNumber = document.getElementById("customerNumber");
          if (customerNumber) customerNumber.textContent = body?.customer_number || "Nicht verfügbar";
          applyPlanAndUsage(body?.plan || null, body?.usage || null);
        }
        function storeProfileCache(body) {
          const session = accountSession();
          if (!session?.customer_account_id || !session?.person_id || !body?.customer_account_id) return;
          if (String(session.customer_account_id) !== String(body.customer_account_id)) return;
          try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
              saved_at: Date.now(),
              person_id: String(session.person_id),
              customer_account_id: String(session.customer_account_id),
              payload: {
                profile: body.profile || {},
                customer_account_id: body.customer_account_id,
                customer_number: body.customer_number || "",
                brand: body.brand || null,
                plan: body.plan || null,
                usage: body.usage || null
              }
            }));
            session.customer_number = body.customer_number || "";
            sessionStorage.setItem("scb_web_session", JSON.stringify(session));
          } catch (_) {}
        }
        function hydrateProfileCache() {
          const session = accountSession();
          if (!session?.session_token || !session?.customer_account_id || !session?.person_id) return false;
          if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) return false;
          try {
            const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
            const matches =
              cached &&
              String(cached.person_id || "") === String(session.person_id) &&
              String(cached.customer_account_id || "") === String(session.customer_account_id) &&
              cached.payload;
            if (!matches) {
              if (session.customer_number) {
                const customerNumber = document.getElementById("customerNumber");
                if (customerNumber) customerNumber.textContent = session.customer_number;
              }
              return false;
            }
            renderProfilePayload(cached.payload);
            profileStatusBadge.textContent = "Sicher verbunden";
            profileCacheApplied = true;
            return true;
          } catch (_) {
            return false;
          }
        }
        const SECURITY_PROMPT_KEY = "nw_post_registration_security_prompt";
        const mfaStatus = document.getElementById("mfaStatus");
        const mfaMeta = document.getElementById("mfaMeta");
        const mfaPrimaryActions = document.getElementById("mfaPrimaryActions");
        const mfaEnableButton = document.getElementById("mfaEnableButton");
        const mfaDisableButton = document.getElementById("mfaDisableButton");
        const mfaDisableSmsButton = document.getElementById("mfaDisableSmsButton");
        const mfaMethodChooser = document.getElementById("mfaMethodChooser");
        const mfaSmsMethod = document.getElementById("mfaSmsMethod");
        const mfaTotpMethod = document.getElementById("mfaTotpMethod");
        const mfaMethodCancelButton = document.getElementById("mfaMethodCancelButton");
        const mfaStartForm = document.getElementById("mfaStartForm");
        const mfaStartCopy = document.getElementById("mfaStartCopy");
        const mfaCurrentPassword = document.getElementById("mfaCurrentPassword");
        const mfaStartButton = document.getElementById("mfaStartButton");
        const mfaStartCancelButton = document.getElementById("mfaStartCancelButton");
        const mfaSetup = document.getElementById("mfaSetup");
        const mfaQr = document.getElementById("mfaQr");
        const mfaSecret = document.getElementById("mfaSecret");
        const mfaVerifyForm = document.getElementById("mfaVerifyForm");
        const mfaSetupCode = document.getElementById("mfaSetupCode");
        const mfaVerifyButton = document.getElementById("mfaVerifyButton");
        const mfaEnrollCancelButton = document.getElementById("mfaEnrollCancelButton");
        const mfaPhoneSetup = document.getElementById("mfaPhoneSetup");
        const mfaMaskedPhone = document.getElementById("mfaMaskedPhone");
        const mfaPhoneVerifyForm = document.getElementById("mfaPhoneVerifyForm");
        const mfaPhoneCode = document.getElementById("mfaPhoneCode");
        const mfaPhoneVerifyButton = document.getElementById("mfaPhoneVerifyButton");
        const mfaPhoneCancelButton = document.getElementById("mfaPhoneCancelButton");
        const mfaDisableForm = document.getElementById("mfaDisableForm");
        const mfaDisablePassword = document.getElementById("mfaDisablePassword");
        const mfaDisableCode = document.getElementById("mfaDisableCode");
        const mfaDisableConfirmButton = document.getElementById("mfaDisableConfirmButton");
        const mfaDisableCancelButton = document.getElementById("mfaDisableCancelButton");
        const mfaSmsDisableStartForm = document.getElementById("mfaSmsDisableStartForm");
        const mfaSmsDisablePassword = document.getElementById("mfaSmsDisablePassword");
        const mfaSmsDisableSendButton = document.getElementById("mfaSmsDisableSendButton");
        const mfaSmsDisableCancelButton = document.getElementById("mfaSmsDisableCancelButton");
        const mfaSmsDisableVerifyForm = document.getElementById("mfaSmsDisableVerifyForm");
        const mfaSmsDisableMaskedPhone = document.getElementById("mfaSmsDisableMaskedPhone");
        const mfaSmsDisableCode = document.getElementById("mfaSmsDisableCode");
        const mfaSmsDisableConfirmButton = document.getElementById("mfaSmsDisableConfirmButton");
        const mfaSmsDisableVerifyCancelButton = document.getElementById("mfaSmsDisableVerifyCancelButton");
        const mfaRecoveryButton = document.getElementById("mfaRecoveryButton");
        const mfaRecoveryChooser = document.getElementById("mfaRecoveryChooser");
        const mfaRecoverTotpButton = document.getElementById("mfaRecoverTotpButton");
        const mfaRecoverSmsButton = document.getElementById("mfaRecoverSmsButton");
        const mfaRecoveryCancelButton = document.getElementById("mfaRecoveryCancelButton");
        const mfaRecoverTotpStartForm = document.getElementById("mfaRecoverTotpStartForm");
        const mfaRecoverTotpPassword = document.getElementById("mfaRecoverTotpPassword");
        const mfaRecoverTotpSendButton = document.getElementById("mfaRecoverTotpSendButton");
        const mfaRecoverTotpCancelButton = document.getElementById("mfaRecoverTotpCancelButton");
        const mfaRecoverTotpVerifyForm = document.getElementById("mfaRecoverTotpVerifyForm");
        const mfaRecoverTotpMaskedPhone = document.getElementById("mfaRecoverTotpMaskedPhone");
        const mfaRecoverTotpCode = document.getElementById("mfaRecoverTotpCode");
        const mfaRecoverTotpConfirmButton = document.getElementById("mfaRecoverTotpConfirmButton");
        const mfaRecoverTotpVerifyCancelButton = document.getElementById("mfaRecoverTotpVerifyCancelButton");
        const mfaRecoverSmsForm = document.getElementById("mfaRecoverSmsForm");
        const mfaRecoverSmsPassword = document.getElementById("mfaRecoverSmsPassword");
        const mfaRecoverSmsCode = document.getElementById("mfaRecoverSmsCode");
        const mfaRecoverSmsConfirmButton = document.getElementById("mfaRecoverSmsConfirmButton");
        const mfaRecoverSmsCancelButton = document.getElementById("mfaRecoverSmsCancelButton");
        const mfaRecoveryCodesButton = document.getElementById("mfaRecoveryCodesButton");
        const mfaRecoveryCodesChooser = document.getElementById("mfaRecoveryCodesChooser");
        const mfaRecoveryCodesContinueButton = document.getElementById("mfaRecoveryCodesContinueButton");
        const mfaRecoveryCodesChooserCancelButton = document.getElementById("mfaRecoveryCodesChooserCancelButton");
        const mfaRecoveryCodesTotpForm = document.getElementById("mfaRecoveryCodesTotpForm");
        const mfaRecoveryCodesTotpPassword = document.getElementById("mfaRecoveryCodesTotpPassword");
        const mfaRecoveryCodesTotpCode = document.getElementById("mfaRecoveryCodesTotpCode");
        const mfaRecoveryCodesTotpSubmitButton = document.getElementById("mfaRecoveryCodesTotpSubmitButton");
        const mfaRecoveryCodesTotpCancelButton = document.getElementById("mfaRecoveryCodesTotpCancelButton");
        const mfaRecoveryCodesSmsStartForm = document.getElementById("mfaRecoveryCodesSmsStartForm");
        const mfaRecoveryCodesSmsPassword = document.getElementById("mfaRecoveryCodesSmsPassword");
        const mfaRecoveryCodesSmsSendButton = document.getElementById("mfaRecoveryCodesSmsSendButton");
        const mfaRecoveryCodesSmsCancelButton = document.getElementById("mfaRecoveryCodesSmsCancelButton");
        const mfaRecoveryCodesSmsVerifyForm = document.getElementById("mfaRecoveryCodesSmsVerifyForm");
        const mfaRecoveryCodesSmsMaskedPhone = document.getElementById("mfaRecoveryCodesSmsMaskedPhone");
        const mfaRecoveryCodesSmsCode = document.getElementById("mfaRecoveryCodesSmsCode");
        const mfaRecoveryCodesSmsVerifyButton = document.getElementById("mfaRecoveryCodesSmsVerifyButton");
        const mfaRecoveryCodesSmsVerifyCancelButton = document.getElementById("mfaRecoveryCodesSmsVerifyCancelButton");
        const mfaRecoveryCodesOutput = document.getElementById("mfaRecoveryCodesOutput");
        const mfaRecoveryCodesList = document.getElementById("mfaRecoveryCodesList");
        const mfaRecoveryCodesCopyButton = document.getElementById("mfaRecoveryCodesCopyButton");
        const mfaRecoveryCodesCloseButton = document.getElementById("mfaRecoveryCodesCloseButton");
        const mfaFeedback = document.getElementById("mfaFeedback");
        const securityNudge = document.getElementById("securityNudge");
        const securityNudgeEyebrow = document.getElementById("securityNudgeEyebrow");
        const securityNudgeTitle = document.getElementById("securityNudgeTitle");
        const securityNudgeCopy = document.getElementById("securityNudgeCopy");
        const securityNudgeSms = document.getElementById("securityNudgeSms");
        const securityNudgeTotp = document.getElementById("securityNudgeTotp");
        const securityNudgeLater = document.getElementById("securityNudgeLater");

        let mfaEnrollmentToken = "";
        let mfaSmsChallengeId = "";
        let mfaSmsDisableChallengeId = "";
        let mfaRecoveryTotpChallengeId = "";
        let mfaRecoveryCodesSmsChallengeId = "";
        let mfaSelectedMethod = "totp";
        let lastMfaPayload = null;

        function setMfaFeedback(message = "", kind = "") {
          mfaFeedback.textContent = message;
          mfaFeedback.className = "mfa-feedback" + (kind ? " is-" + kind : "");
        }

        function normalizeSixDigitInput(input) {
          input.value = input.value.replace(/\D/g, "").slice(0, 6);
        }

        function mfaFactorTypes() {
          return Array.isArray(lastMfaPayload?.mfa?.factor_types) ? lastMfaPayload.mfa.factor_types : [];
        }

        function smsMfaAvailable() {
          return lastMfaPayload?.mfa?.methods?.sms?.available === true;
        }

        function smsMfaEnrolled() {
          return lastMfaPayload?.mfa?.methods?.sms?.enrolled === true || mfaFactorTypes().includes("sms");
        }

        function totpMfaAvailable() {
          return lastMfaPayload?.mfa?.methods?.totp?.available !== false;
        }

        function totpMfaEnrolled() {
          return lastMfaPayload?.mfa?.methods?.totp?.enrolled === true || mfaFactorTypes().includes("totp");
        }

        function resetMfaForms() {
          mfaEnrollmentToken = "";
          mfaSmsChallengeId = "";
          mfaSmsDisableChallengeId = "";
          mfaRecoveryTotpChallengeId = "";
          mfaRecoveryCodesSmsChallengeId = "";
          mfaMethodChooser.hidden = true;
          mfaStartForm.hidden = true;
          mfaSetup.hidden = true;
          mfaPhoneSetup.hidden = true;
          mfaDisableForm.hidden = true;
          mfaSmsDisableStartForm.hidden = true;
          mfaSmsDisableVerifyForm.hidden = true;
          mfaRecoveryChooser.hidden = true;
          mfaRecoverTotpStartForm.hidden = true;
          mfaRecoverTotpVerifyForm.hidden = true;
          mfaRecoverSmsForm.hidden = true;
          mfaRecoveryCodesChooser.hidden = true;
          mfaRecoveryCodesTotpForm.hidden = true;
          mfaRecoveryCodesSmsStartForm.hidden = true;
          mfaRecoveryCodesSmsVerifyForm.hidden = true;
          mfaCurrentPassword.value = "";
          mfaSetupCode.value = "";
          mfaPhoneCode.value = "";
          mfaDisablePassword.value = "";
          mfaDisableCode.value = "";
          mfaSmsDisablePassword.value = "";
          mfaSmsDisableCode.value = "";
          mfaRecoverTotpPassword.value = "";
          mfaRecoverTotpCode.value = "";
          mfaRecoverSmsPassword.value = "";
          mfaRecoverSmsCode.value = "";
          mfaRecoveryCodesTotpPassword.value = "";
          mfaRecoveryCodesTotpCode.value = "";
          mfaRecoveryCodesSmsPassword.value = "";
          mfaRecoveryCodesSmsCode.value = "";
          mfaQr.removeAttribute("src");
          mfaSecret.textContent = "";
          mfaMaskedPhone.textContent = "Ihre hinterlegte Mobilnummer";
          mfaSmsDisableMaskedPhone.textContent = "Ihre hinterlegte Mobilnummer";
        }

        mfaSetupCode.addEventListener("input", () => normalizeSixDigitInput(mfaSetupCode));
        mfaPhoneCode.addEventListener("input", () => normalizeSixDigitInput(mfaPhoneCode));
        mfaDisableCode.addEventListener("input", () => normalizeSixDigitInput(mfaDisableCode));
        mfaSmsDisableCode.addEventListener("input", () => normalizeSixDigitInput(mfaSmsDisableCode));
        mfaRecoverTotpCode.addEventListener("input", () => normalizeSixDigitInput(mfaRecoverTotpCode));
        mfaRecoverSmsCode.addEventListener("input", () => normalizeSixDigitInput(mfaRecoverSmsCode));
        mfaRecoveryCodesTotpCode.addEventListener("input", () => normalizeSixDigitInput(mfaRecoveryCodesTotpCode));
        mfaRecoveryCodesSmsCode.addEventListener("input", () => normalizeSixDigitInput(mfaRecoveryCodesSmsCode));

        async function mfaManage(action, payload = {}) {
          const token = sessionToken();
          if (!token) throw new Error("invalid_session");
          const response = await fetch(MFA_MANAGE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token
            },
            body: JSON.stringify({ action, ...payload })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok || body?.ok !== true) {
            const error = new Error(String(body?.status || "mfa_request_failed"));
            error.httpStatus = response.status;
            error.responseBody = body;
            throw error;
          }
          return body;
        }

        function showMfaMethodChooser() {
          resetMfaForms();
          setMfaFeedback("");
          mfaSmsMethod.hidden = !smsMfaAvailable() || smsMfaEnrolled();
          mfaTotpMethod.hidden = !totpMfaAvailable() || totpMfaEnrolled();
          if (mfaSmsMethod.hidden && mfaTotpMethod.hidden) {
            setMfaFeedback("Alle verfügbaren Bestätigungsmethoden sind bereits eingerichtet.", "success");
            return;
          }
          mfaMethodChooser.hidden = false;
        }

        function beginMfaMethod(method) {
          if (method === "sms" && (!smsMfaAvailable() || smsMfaEnrolled())) {
            setMfaFeedback("SMS-Bestätigung ist für dieses Konto aktuell nicht verfügbar oder bereits aktiviert.", "error");
            return;
          }
          if (method === "totp" && (!totpMfaAvailable() || totpMfaEnrolled())) {
            setMfaFeedback("Die Authenticator-App ist bereits eingerichtet.", "success");
            return;
          }

          resetMfaForms();
          setMfaFeedback("");
          mfaSelectedMethod = method;
          if (method === "sms") {
            mfaStartCopy.textContent = "Bestätigen Sie zuerst Ihr aktuelles Passwort. Danach senden wir einen 6-stelligen SMS-Code an Ihre hinterlegte Mobilnummer.";
            mfaStartButton.textContent = "SMS-Code senden";
          } else {
            mfaStartCopy.textContent = "Bestätigen Sie zuerst Ihr aktuelles Passwort. Danach erhalten Sie einen QR-Code für Ihre Authenticator-App.";
            mfaStartButton.textContent = "QR-Code erstellen";
          }
          mfaStartForm.hidden = false;
          mfaCurrentPassword.focus();
        }

        function hideSecurityNudge() {
          securityNudge.hidden = true;
        }

        function openSecuritySetupFromNudge(method) {
          hideSecurityNudge();
          setAccountTab("personal");
          setTimeout(() => {
            document.getElementById("mfaCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
            beginMfaMethod(method);
          }, 0);
        }

        function applySecurityRecommendation(body) {
          const required = body?.enrollment_required === true && body?.mfa?.enabled !== true;
          const due = body?.recommendation?.due === true && body?.mfa?.enabled !== true;
          if (!required && !due) {
            hideSecurityNudge();
            return;
          }
          securityNudgeEyebrow.textContent = required ? "Kontoschutz erforderlich" : "Empfohlener Kontoschutz";
          securityNudgeTitle.textContent = required ? "Zwei-Faktor-Authentifizierung einrichten" : "Konto zusätzlich schützen";
          securityNudgeCopy.textContent = required
            ? "Für neue STEWARO-Zugänge ist die Authenticator-App der Standard für die zweite Bestätigung. SMS kann optional zusätzlich eingerichtet werden, wenn eine geeignete Mobilnummer hinterlegt ist."
            : "Ihr Zugang ist eingerichtet. Als zusätzliche Absicherung empfehlen wir die Authenticator-App. SMS bleibt optional, wenn eine geeignete Mobilnummer hinterlegt ist.";
          securityNudgeLater.hidden = required;
          securityNudgeSms.hidden = body?.mfa?.methods?.sms?.available !== true;
          securityNudgeTotp.hidden = body?.mfa?.methods?.totp?.available === false;
          if (required) setAccountTab("personal");
          securityNudge.hidden = false;
          if (!required) mfaManage("nudge_seen").catch(() => {});
        }

        function activeMethodLabel() {
          const labels = [];
          if (totpMfaEnrolled()) labels.push("Authenticator-App");
          if (smsMfaEnrolled()) labels.push("SMS-Code");
          return labels.join(" und ");
        }

        async function loadMfaStatus() {
          const token = sessionToken();
          resetMfaForms();
          setMfaFeedback("");
          if (!token) {
            lastMfaPayload = null;
            mfaPrimaryActions.hidden = true;
            hideSecurityNudge();
            mfaStatus.textContent = "Nicht verfügbar";
            mfaMeta.textContent = "Für die Statusprüfung ist eine gültige Sitzung erforderlich.";
            return;
          }

          try {
            const response = await fetch(MFA_STATUS_URL, {
              method: "GET",
              headers: { Authorization: "Bearer " + token }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) throw new Error("mfa_status_load_failed");
            lastMfaPayload = body;

            const mfa = body?.mfa || {};
            if (mfa.available !== true) {
              mfaPrimaryActions.hidden = true;
              hideSecurityNudge();
              mfaStatus.textContent = "Nicht verfügbar";
              mfaMeta.textContent = "Die Zwei-Faktor-Authentifizierung konnte diesem Konto noch nicht eindeutig zugeordnet werden.";
              return;
            }

            mfaPrimaryActions.hidden = false;
            const canAddSms = smsMfaAvailable() && !smsMfaEnrolled();
            const canAddTotp = totpMfaAvailable() && !totpMfaEnrolled();

            if (mfa.enabled === true) {
              const label = activeMethodLabel() || "einer zusätzlichen Bestätigung";
              mfaStatus.textContent = "Aktiviert";
              mfaMeta.textContent = "Ihr Konto ist mit " + label + " geschützt. Bei der nächsten Anmeldung wird eine aktive zweite Methode zwingend verlangt.";
              mfaEnableButton.hidden = !(canAddSms || canAddTotp);
              mfaEnableButton.textContent = "Weitere Methode hinzufügen";
              mfaDisableButton.hidden = !totpMfaEnrolled();
              mfaDisableSmsButton.hidden = !smsMfaEnrolled();
              mfaRecoveryCodesButton.hidden = false;
              mfaRecoveryButton.hidden = !(totpMfaEnrolled() && smsMfaEnrolled());
              hideSecurityNudge();
              return;
            }

            const enrollmentRequired = body?.enrollment_required === true;
            mfaStatus.textContent = enrollmentRequired ? "Erforderlich · Noch nicht aktiviert" : "Empfohlen · Noch nicht aktiviert";
            mfaMeta.textContent = enrollmentRequired
              ? "Für diesen neuen Zugang muss jetzt die Authenticator-App eingerichtet werden. Erst danach ist der Klientenbereich vollständig freigeschaltet. SMS kann später optional ergänzt werden."
              : "Die Authenticator-App ist der empfohlene Standard. SMS wird nur als zusätzliche Alternative angeboten, wenn eine geeignete Mobilnummer sicher hinterlegt ist.";
            mfaEnableButton.hidden = false;
            mfaEnableButton.textContent = enrollmentRequired ? "Jetzt einrichten" : "Kontoschutz einrichten";
            mfaDisableButton.hidden = true;
            mfaDisableSmsButton.hidden = true;
            mfaRecoveryCodesButton.hidden = true;
            mfaRecoveryButton.hidden = true;
            applySecurityRecommendation(body);
          } catch (_) {
            lastMfaPayload = null;
            mfaPrimaryActions.hidden = true;
            hideSecurityNudge();
            mfaStatus.textContent = "Nicht verfügbar";
            mfaMeta.textContent = "Der Status der Zwei-Faktor-Authentifizierung konnte gerade nicht geladen werden.";
          }
        }

        async function bootstrapSecurityRecommendation() {
          if (localStorage.getItem(SECURITY_PROMPT_KEY) === "1") {
            try {
              await mfaManage("nudge_init");
              localStorage.removeItem(SECURITY_PROMPT_KEY);
            } catch (_) {}
          }
          await loadMfaStatus();
        }

        mfaEnableButton.addEventListener("click", () => {
          if (totpMfaAvailable() && !totpMfaEnrolled()) {
            beginMfaMethod("totp");
            return;
          }
          showMfaMethodChooser();
        });
        mfaMethodCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });
        mfaTotpMethod.addEventListener("click", () => beginMfaMethod("totp"));
        mfaSmsMethod.addEventListener("click", () => beginMfaMethod("sms"));

        mfaStartCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaStartForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!mfaStartForm.reportValidity()) return;

          const password = mfaCurrentPassword.value;
          mfaStartButton.disabled = true;
          mfaStartButton.textContent = mfaSelectedMethod === "sms" ? "SMS wird gesendet …" : "Wird vorbereitet …";
          setMfaFeedback(mfaSelectedMethod === "sms" ? "SMS-Bestätigung wird sicher vorbereitet." : "Authenticator-Einrichtung wird sicher vorbereitet.");

          try {
            const body = await mfaManage("enroll_start", { password, method: mfaSelectedMethod });
            mfaCurrentPassword.value = "";
            mfaStartForm.hidden = true;

            if (mfaSelectedMethod === "sms") {
              if (body?.status !== "mfa_sms_code_sent" || !body.challenge_id) {
                throw new Error("invalid_sms_enrollment_response");
              }
              mfaSmsChallengeId = String(body.challenge_id);
              mfaMaskedPhone.textContent = String(body.masked_phone || "Ihre hinterlegte Mobilnummer");
              mfaPhoneSetup.hidden = false;
              setMfaFeedback("SMS-Code wurde gesendet. Geben Sie ihn zur Aktivierung ein.", "success");
              mfaPhoneCode.focus();
            } else {
              mfaEnrollmentToken = String(body.enrollment_token || "");
              if (!mfaEnrollmentToken || !body.qr_svg || !body.secret) {
                throw new Error("invalid_enrollment_response");
              }
              const qr = String(body.qr_svg);
              mfaQr.src = qr.startsWith("data:") ? qr : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr);
              mfaSecret.textContent = String(body.secret);
              mfaSetup.hidden = false;
              setMfaFeedback("QR-Code erstellt. Scannen Sie ihn und bestätigen Sie anschließend den 6-stelligen Code.", "success");
              mfaSetupCode.focus();
            }
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "already_enabled") {
              setMfaFeedback("Diese Bestätigungsmethode ist bereits aktiviert.", "success");
              await loadMfaStatus();
            } else if (status === "sms_mfa_unavailable" || status === "phone_unavailable") {
              setMfaFeedback("SMS-Bestätigung ist für dieses Konto noch nicht verfügbar. Sie können stattdessen die Authenticator-App verwenden.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die Einrichtung konnte gerade nicht gestartet werden. Bitte versuchen Sie es erneut.", "error");
            }
          } finally {
            mfaCurrentPassword.value = "";
            mfaStartButton.disabled = false;
            mfaStartButton.textContent = mfaSelectedMethod === "sms" ? "SMS-Code senden" : "QR-Code erstellen";
          }
        });

        async function verifyEnrollment(codeInput, button, idleText) {
          normalizeSixDigitInput(codeInput);
          if (!/^\d{6}$/.test(codeInput.value)) return;
          if (mfaSelectedMethod === "sms" && !mfaSmsChallengeId) return;
          if (mfaSelectedMethod === "totp" && !mfaEnrollmentToken) return;

          button.disabled = true;
          button.textContent = "Code wird geprüft …";
          setMfaFeedback("Code wird geprüft.");

          try {
            const payload = mfaSelectedMethod === "sms"
              ? { method: "sms", challenge_id: mfaSmsChallengeId, code: codeInput.value }
              : { method: "totp", enrollment_token: mfaEnrollmentToken, code: codeInput.value };
            const body = await mfaManage("enroll_verify", payload);
            if (body?.status !== "mfa_enabled" || body?.mfa?.enabled !== true) {
              throw new Error("mfa_enable_not_confirmed");
            }
            const method = String(body?.method || mfaSelectedMethod);
            const recoveryCodes = Array.isArray(body?.recovery_codes) ? body.recovery_codes : [];
            resetMfaForms();
            await loadMfaStatus();
            setMfaFeedback(
              method === "sms"
                ? "SMS-Bestätigung wurde erfolgreich aktiviert."
                : "Authenticator-App wurde erfolgreich aktiviert.",
              "success"
            );
            if (recoveryCodes.length) showRecoveryCodes(recoveryCodes);
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "invalid_mfa_code" || status === "invalid_code") {
              setMfaFeedback("Der Code ist nicht korrekt oder nicht mehr gültig.", "error");
              codeInput.select();
            } else if (status === "enrollment_expired" || status === "challenge_expired" || status === "challenge_not_found") {
              resetMfaForms();
              setMfaFeedback("Die Einrichtung ist abgelaufen. Bitte starten Sie sie erneut.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die Aktivierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.", "error");
            }
          } finally {
            button.disabled = false;
            button.textContent = idleText;
          }
        }

        mfaVerifyForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!mfaVerifyForm.reportValidity()) return;
          mfaSelectedMethod = "totp";
          await verifyEnrollment(mfaSetupCode, mfaVerifyButton, "Aktivierung bestätigen");
        });

        mfaPhoneVerifyForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!mfaPhoneVerifyForm.reportValidity()) return;
          mfaSelectedMethod = "sms";
          await verifyEnrollment(mfaPhoneCode, mfaPhoneVerifyButton, "SMS-Code bestätigen");
        });

        async function cancelEnrollment() {
          const method = mfaSelectedMethod;
          const token = mfaEnrollmentToken;
          resetMfaForms();
          setMfaFeedback("");
          try {
            await mfaManage("enroll_cancel", {
              method,
              enrollment_token: method === "totp" ? token : undefined
            });
          } catch (_) {}
        }

        mfaEnrollCancelButton.addEventListener("click", cancelEnrollment);
        mfaPhoneCancelButton.addEventListener("click", cancelEnrollment);

        securityNudgeTotp.addEventListener("click", () => openSecuritySetupFromNudge("totp"));
        securityNudgeSms.addEventListener("click", () => openSecuritySetupFromNudge("sms"));
        securityNudgeLater.addEventListener("click", async () => {
          if (lastMfaPayload?.enrollment_required === true) {
            applySecurityRecommendation(lastMfaPayload);
            return;
          }
          securityNudgeLater.disabled = true;
          securityNudgeLater.textContent = "Wird gespeichert …";
          try {
            await mfaManage("nudge_later");
            hideSecurityNudge();
          } catch (_) {
            applySecurityRecommendation(lastMfaPayload);
          } finally {
            securityNudgeLater.disabled = false;
            securityNudgeLater.textContent = "Später einrichten";
          }
        });

        mfaDisableButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
          mfaDisableForm.hidden = false;
          mfaDisablePassword.focus();
        });

        mfaDisableCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaDisableForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          normalizeSixDigitInput(mfaDisableCode);
          if (!mfaDisableForm.reportValidity()) return;
          const password = mfaDisablePassword.value;
          const code = mfaDisableCode.value;
          mfaDisableConfirmButton.disabled = true;
          mfaDisableConfirmButton.textContent = "Wird deaktiviert …";
          setMfaFeedback("Authenticator-App wird sicher geprüft.");
          try {
            const body = await mfaManage("disable", { method: "totp", password, code });
            const stillEnabled = body?.mfa?.enabled === true;
            resetMfaForms();
            await loadMfaStatus();
            setMfaFeedback(
              stillEnabled
                ? "Authenticator-App wurde entfernt. Eine weitere Bestätigungsmethode bleibt aktiv."
                : "Authenticator-App wurde deaktiviert.",
              "success"
            );
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "invalid_mfa_code") {
              setMfaFeedback("Der Authenticator-Code ist nicht korrekt oder nicht mehr gültig.", "error");
              mfaDisableCode.select();
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die Authenticator-App konnte gerade nicht deaktiviert werden.", "error");
            }
          } finally {
            mfaDisablePassword.value = "";
            mfaDisableCode.value = "";
            mfaDisableConfirmButton.disabled = false;
            mfaDisableConfirmButton.textContent = "Deaktivierung bestätigen";
          }
        });

        mfaDisableSmsButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
          mfaSmsDisableStartForm.hidden = false;
          mfaSmsDisablePassword.focus();
        });

        mfaSmsDisableCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaSmsDisableVerifyCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaSmsDisableStartForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!mfaSmsDisableStartForm.reportValidity()) return;
          const password = mfaSmsDisablePassword.value;
          mfaSmsDisableSendButton.disabled = true;
          mfaSmsDisableSendButton.textContent = "SMS wird gesendet …";
          setMfaFeedback("Deaktivierung wird sicher vorbereitet.");
          try {
            const body = await mfaManage("sms_disable_start", { password });
            if (body?.status !== "mfa_sms_disable_code_sent" || !body.challenge_id) {
              throw new Error("sms_disable_start_failed");
            }
            mfaSmsDisableChallengeId = String(body.challenge_id);
            mfaSmsDisableMaskedPhone.textContent = String(body.masked_phone || "Ihre hinterlegte Mobilnummer");
            mfaSmsDisablePassword.value = "";
            mfaSmsDisableStartForm.hidden = true;
            mfaSmsDisableVerifyForm.hidden = false;
            setMfaFeedback("SMS-Code wurde gesendet. Bestätigen Sie ihn, um SMS als zweiten Faktor zu entfernen.", "success");
            mfaSmsDisableCode.focus();
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die SMS-Deaktivierung konnte gerade nicht gestartet werden.", "error");
            }
          } finally {
            mfaSmsDisablePassword.value = "";
            mfaSmsDisableSendButton.disabled = false;
            mfaSmsDisableSendButton.textContent = "SMS-Code senden";
          }
        });

        mfaSmsDisableVerifyForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          normalizeSixDigitInput(mfaSmsDisableCode);
          if (!mfaSmsDisableVerifyForm.reportValidity() || !mfaSmsDisableChallengeId) return;
          mfaSmsDisableConfirmButton.disabled = true;
          mfaSmsDisableConfirmButton.textContent = "Wird deaktiviert …";
          setMfaFeedback("SMS-Code wird geprüft.");
          try {
            const body = await mfaManage("sms_disable_verify", {
              challenge_id: mfaSmsDisableChallengeId,
              code: mfaSmsDisableCode.value
            });
            const stillEnabled = body?.mfa?.enabled === true;
            resetMfaForms();
            await loadMfaStatus();
            setMfaFeedback(
              stillEnabled
                ? "SMS-Bestätigung wurde entfernt. Eine weitere Bestätigungsmethode bleibt aktiv."
                : "SMS-Bestätigung wurde deaktiviert.",
              "success"
            );
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "invalid_code" || status === "invalid_mfa_code") {
              setMfaFeedback("Der SMS-Code ist nicht korrekt oder nicht mehr gültig.", "error");
              mfaSmsDisableCode.select();
            } else if (status === "challenge_expired" || status === "challenge_not_found") {
              resetMfaForms();
              setMfaFeedback("Der SMS-Code ist abgelaufen. Bitte starten Sie die Deaktivierung erneut.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die SMS-Bestätigung konnte gerade nicht deaktiviert werden.", "error");
            }
          } finally {
            mfaSmsDisableConfirmButton.disabled = false;
            mfaSmsDisableConfirmButton.textContent = "SMS-Bestätigung deaktivieren";
          }
        });

        function showRecoveryCodes(codes) {
          const safeCodes = Array.isArray(codes) ? codes.filter((code) => typeof code === "string") : [];
          if (!safeCodes.length) return;
          mfaRecoveryCodesList.textContent = safeCodes.join("\n");
          mfaRecoveryCodesOutput.hidden = false;
          mfaRecoveryCodesOutput.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        mfaRecoveryCodesButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
          mfaRecoveryCodesChooser.hidden = false;
        });

        mfaRecoveryCodesChooserCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaRecoveryCodesContinueButton.addEventListener("click", () => {
          mfaRecoveryCodesChooser.hidden = true;
          if (totpMfaEnrolled()) {
            mfaRecoveryCodesTotpForm.hidden = false;
            mfaRecoveryCodesTotpPassword.focus();
          } else if (smsMfaEnrolled()) {
            mfaRecoveryCodesSmsStartForm.hidden = false;
            mfaRecoveryCodesSmsPassword.focus();
          } else {
            setMfaFeedback("Es ist keine aktive MFA-Methode verfügbar, mit der neue Wiederherstellungscodes bestätigt werden können.", "error");
          }
        });

        mfaRecoveryCodesTotpCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });
        mfaRecoveryCodesSmsCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });
        mfaRecoveryCodesSmsVerifyCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaRecoveryCodesTotpForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          normalizeSixDigitInput(mfaRecoveryCodesTotpCode);
          if (!mfaRecoveryCodesTotpForm.reportValidity()) return;
          mfaRecoveryCodesTotpSubmitButton.disabled = true;
          mfaRecoveryCodesTotpSubmitButton.textContent = "Codes werden erzeugt …";
          try {
            const body = await mfaManage("recovery_codes_totp", {
              password: mfaRecoveryCodesTotpPassword.value,
              code: mfaRecoveryCodesTotpCode.value
            });
            if (body?.status !== "recovery_codes_generated" || !Array.isArray(body?.recovery_codes)) {
              throw new Error("recovery_codes_generation_failed");
            }
            resetMfaForms();
            showRecoveryCodes(body.recovery_codes);
            setMfaFeedback("Neue Wiederherstellungscodes wurden erzeugt. Ältere unbenutzte Codes sind jetzt ungültig.", "success");
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "invalid_mfa_code") {
              setMfaFeedback("Der Authenticator-Code ist nicht korrekt oder nicht mehr gültig.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Neue Wiederherstellungscodes konnten nicht erzeugt werden.", "error");
            }
          } finally {
            mfaRecoveryCodesTotpPassword.value = "";
            mfaRecoveryCodesTotpCode.value = "";
            mfaRecoveryCodesTotpSubmitButton.disabled = false;
            mfaRecoveryCodesTotpSubmitButton.textContent = "Codes erzeugen";
          }
        });

        mfaRecoveryCodesSmsStartForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!mfaRecoveryCodesSmsStartForm.reportValidity()) return;
          mfaRecoveryCodesSmsSendButton.disabled = true;
          mfaRecoveryCodesSmsSendButton.textContent = "SMS wird gesendet …";
          try {
            const body = await mfaManage("recovery_codes_sms_start", {
              password: mfaRecoveryCodesSmsPassword.value
            });
            if (body?.status !== "recovery_code_sms_sent" || !body.challenge_id) {
              throw new Error("recovery_code_generation_start_failed");
            }
            mfaRecoveryCodesSmsChallengeId = String(body.challenge_id);
            mfaRecoveryCodesSmsMaskedPhone.textContent = String(body.masked_phone || "Ihre hinterlegte Mobilnummer");
            mfaRecoveryCodesSmsPassword.value = "";
            mfaRecoveryCodesSmsStartForm.hidden = true;
            mfaRecoveryCodesSmsVerifyForm.hidden = false;
            setMfaFeedback("SMS-Code wurde gesendet. Bestätigen Sie ihn, um neue Wiederherstellungscodes zu erzeugen.", "success");
            mfaRecoveryCodesSmsCode.focus();
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die Erzeugung neuer Wiederherstellungscodes konnte nicht gestartet werden.", "error");
            }
          } finally {
            mfaRecoveryCodesSmsPassword.value = "";
            mfaRecoveryCodesSmsSendButton.disabled = false;
            mfaRecoveryCodesSmsSendButton.textContent = "SMS-Code senden";
          }
        });

        mfaRecoveryCodesSmsVerifyForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          normalizeSixDigitInput(mfaRecoveryCodesSmsCode);
          if (!mfaRecoveryCodesSmsVerifyForm.reportValidity() || !mfaRecoveryCodesSmsChallengeId) return;
          mfaRecoveryCodesSmsVerifyButton.disabled = true;
          mfaRecoveryCodesSmsVerifyButton.textContent = "Codes werden erzeugt …";
          try {
            const body = await mfaManage("recovery_codes_sms_verify", {
              challenge_id: mfaRecoveryCodesSmsChallengeId,
              code: mfaRecoveryCodesSmsCode.value
            });
            if (body?.status !== "recovery_codes_generated" || !Array.isArray(body?.recovery_codes)) {
              throw new Error("recovery_codes_generation_failed");
            }
            resetMfaForms();
            showRecoveryCodes(body.recovery_codes);
            setMfaFeedback("Neue Wiederherstellungscodes wurden erzeugt. Ältere unbenutzte Codes sind jetzt ungültig.", "success");
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "invalid_code" || status === "invalid_mfa_code") {
              setMfaFeedback("Der SMS-Code ist nicht korrekt oder nicht mehr gültig.", "error");
            } else if (status === "challenge_expired" || status === "challenge_not_found") {
              resetMfaForms();
              setMfaFeedback("Der SMS-Code ist abgelaufen. Bitte starten Sie die Erzeugung erneut.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Neue Wiederherstellungscodes konnten nicht erzeugt werden.", "error");
            }
          } finally {
            mfaRecoveryCodesSmsVerifyButton.disabled = false;
            mfaRecoveryCodesSmsVerifyButton.textContent = "Codes erzeugen";
          }
        });

        mfaRecoveryCodesCopyButton.addEventListener("click", async () => {
          const value = mfaRecoveryCodesList.textContent || "";
          if (!value) return;
          try {
            await navigator.clipboard.writeText(value);
            setMfaFeedback("Wiederherstellungscodes wurden in die Zwischenablage kopiert.", "success");
          } catch (_) {
            setMfaFeedback("Die Codes konnten nicht automatisch kopiert werden. Bitte markieren und kopieren Sie sie manuell.", "error");
          }
        });

        mfaRecoveryCodesCloseButton.addEventListener("click", () => {
          mfaRecoveryCodesList.textContent = "";
          mfaRecoveryCodesOutput.hidden = true;
          setMfaFeedback("Wiederherstellungscodes wurden aus dieser Ansicht entfernt.", "success");
        });

        function finishMfaCrossRecovery(message) {
          try {
            sessionStorage.removeItem("scb_web_session");
            localStorage.removeItem("scb_web_session");
          } catch (_) {}
          setMfaFeedback(message + " Sie werden zur sicheren Neuanmeldung weitergeleitet.", "success");
          setTimeout(() => { location.href = "anmelden?security=mfa-recovery"; }, 450);
        }

        mfaRecoveryButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
          if (!(totpMfaEnrolled() && smsMfaEnrolled())) {
            setMfaFeedback("Ein automatischer Reset ist nur möglich, wenn eine zweite aktive Bestätigungsmethode verfügbar ist.", "error");
            return;
          }
          mfaRecoveryChooser.hidden = false;
        });

        mfaRecoveryCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaRecoverTotpButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
          mfaRecoverTotpStartForm.hidden = false;
          mfaRecoverTotpPassword.focus();
        });

        mfaRecoverSmsButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
          mfaRecoverSmsForm.hidden = false;
          mfaRecoverSmsPassword.focus();
        });

        mfaRecoverTotpCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });
        mfaRecoverTotpVerifyCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });
        mfaRecoverSmsCancelButton.addEventListener("click", () => {
          resetMfaForms();
          setMfaFeedback("");
        });

        mfaRecoverTotpStartForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!mfaRecoverTotpStartForm.reportValidity()) return;
          mfaRecoverTotpSendButton.disabled = true;
          mfaRecoverTotpSendButton.textContent = "SMS wird gesendet …";
          try {
            const body = await mfaManage("cross_reset_totp_start", {
              password: mfaRecoverTotpPassword.value
            });
            if (body?.status !== "mfa_recovery_sms_code_sent" || !body.challenge_id) {
              throw new Error("mfa_recovery_start_failed");
            }
            mfaRecoveryTotpChallengeId = String(body.challenge_id);
            mfaRecoverTotpMaskedPhone.textContent = String(body.masked_phone || "Ihre hinterlegte Mobilnummer");
            mfaRecoverTotpPassword.value = "";
            mfaRecoverTotpStartForm.hidden = true;
            mfaRecoverTotpVerifyForm.hidden = false;
            setMfaFeedback("SMS-Code wurde gesendet. Bestätigen Sie ihn, um die verlorene Authenticator-App sicher zurückzusetzen.", "success");
            mfaRecoverTotpCode.focus();
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else if (status === "cross_factor_recovery_unavailable") {
              setMfaFeedback("Für diesen automatischen Reset muss SMS weiterhin als zweite Methode aktiv sein.", "error");
            } else {
              setMfaFeedback("Der sichere Reset konnte nicht gestartet werden.", "error");
            }
          } finally {
            mfaRecoverTotpPassword.value = "";
            mfaRecoverTotpSendButton.disabled = false;
            mfaRecoverTotpSendButton.textContent = "SMS-Code senden";
          }
        });

        mfaRecoverTotpVerifyForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          normalizeSixDigitInput(mfaRecoverTotpCode);
          if (!mfaRecoverTotpVerifyForm.reportValidity() || !mfaRecoveryTotpChallengeId) return;
          mfaRecoverTotpConfirmButton.disabled = true;
          mfaRecoverTotpConfirmButton.textContent = "Wird zurückgesetzt …";
          try {
            const body = await mfaManage("cross_reset_totp_verify", {
              challenge_id: mfaRecoveryTotpChallengeId,
              code: mfaRecoverTotpCode.value
            });
            if (body?.status !== "mfa_factor_reset" || body?.reset_method !== "totp") {
              throw new Error("mfa_recovery_not_confirmed");
            }
            finishMfaCrossRecovery("Die verlorene Authenticator-App wurde entfernt.");
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "invalid_code" || status === "invalid_mfa_code") {
              setMfaFeedback("Der SMS-Code ist nicht korrekt oder nicht mehr gültig.", "error");
              mfaRecoverTotpCode.select();
            } else if (status === "challenge_expired" || status === "challenge_not_found") {
              resetMfaForms();
              setMfaFeedback("Der SMS-Code ist abgelaufen. Bitte starten Sie den Reset erneut.", "error");
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else {
              setMfaFeedback("Die Authenticator-App konnte nicht zurückgesetzt werden.", "error");
            }
          } finally {
            mfaRecoverTotpConfirmButton.disabled = false;
            mfaRecoverTotpConfirmButton.textContent = "Authenticator-App zurücksetzen";
          }
        });

        mfaRecoverSmsForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          normalizeSixDigitInput(mfaRecoverSmsCode);
          if (!mfaRecoverSmsForm.reportValidity()) return;
          mfaRecoverSmsConfirmButton.disabled = true;
          mfaRecoverSmsConfirmButton.textContent = "Wird zurückgesetzt …";
          try {
            const body = await mfaManage("cross_reset_sms", {
              password: mfaRecoverSmsPassword.value,
              code: mfaRecoverSmsCode.value
            });
            if (body?.status !== "mfa_factor_reset" || body?.reset_method !== "sms") {
              throw new Error("mfa_recovery_not_confirmed");
            }
            finishMfaCrossRecovery("Die verlorene SMS-Methode wurde entfernt.");
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "reauthentication_failed") {
              setMfaFeedback("Das aktuelle Passwort konnte nicht bestätigt werden.", "error");
            } else if (status === "invalid_mfa_code") {
              setMfaFeedback("Der Authenticator-Code ist nicht korrekt oder nicht mehr gültig.", "error");
              mfaRecoverSmsCode.select();
            } else if (status === "too_many_attempts") {
              setMfaFeedback("Zu viele Versuche. Bitte warten Sie einige Minuten.", "error");
            } else if (status === "cross_factor_recovery_unavailable") {
              setMfaFeedback("Für diesen automatischen Reset muss die Authenticator-App weiterhin aktiv sein.", "error");
            } else {
              setMfaFeedback("Die SMS-Methode konnte nicht zurückgesetzt werden.", "error");
            }
          } finally {
            mfaRecoverSmsPassword.value = "";
            mfaRecoverSmsCode.value = "";
            mfaRecoverSmsConfirmButton.disabled = false;
            mfaRecoverSmsConfirmButton.textContent = "SMS-Methode zurücksetzen";
          }
        });

        const RECEPTION_URL = "https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-customer-portal-staging/portal/telephone-reception";
        const RECEPTION_CONTACT_URL = RECEPTION_URL + "/contact-trust";
        function receptionToken() {
          return sessionToken();
        }
        const receptionForm = document.getElementById("telephoneReceptionForm");
        const receptionStatus = document.getElementById("receptionStatus");
        const receptionEnabled = document.getElementById("receptionEnabled");
        const receptionMode = document.getElementById("receptionMode");
        const receptionPersona = document.getElementById("receptionPersona");
        const receptionUnknownPolicy = document.getElementById("receptionUnknownPolicy");
        const receptionTrustedPolicy = document.getElementById("receptionTrustedPolicy");
        const receptionMessageTaking = document.getElementById("receptionMessageTaking");
        const receptionTransfer = document.getElementById("receptionTransfer");
        const receptionNotifyScreened = document.getElementById("receptionNotifyScreened");
        const receptionNotifySuspicious = document.getElementById("receptionNotifySuspicious");
        const receptionSetupNotice = document.getElementById("receptionSetupNotice");
        const receptionSetupMeta = document.getElementById("receptionSetupMeta");
        const receptionSetupActions = document.getElementById("receptionSetupActions");
        const receptionContactList = document.getElementById("receptionContactList");
        const receptionSaveButton = document.getElementById("receptionSaveButton");
        const receptionSaveStatus = document.getElementById("receptionSaveStatus");
        let receptionRoutingReady = false;
        let receptionLoaded = false;
        const personalDataForm = document.getElementById("personalDataForm");
        const profileFirstName = document.getElementById("profileFirstName");
        const profileLastName = document.getElementById("profileLastName");
        const profileEmail = document.getElementById("profileEmail");
        const profileWhatsapp = document.getElementById("profileWhatsapp");
        const profileHomeAddress = document.getElementById("profileHomeAddress");
        const profileSaveButton = document.getElementById("profileSaveButton");
        const profileSaveStatus = document.getElementById("profileSaveStatus");
        const profileStatusBadge = document.getElementById("profileStatusBadge");

        function showProfileStatus(message, kind = "") {
          profileSaveStatus.textContent = message;
          profileSaveStatus.className = "profile-save-status" + (kind ? " is-" + kind : "");
        }
        function applyProfile(profile) {
          profileFirstName.value = profile?.first_name || "";
          profileLastName.value = profile?.last_name || "";
          profileEmail.value = profile?.email || "";
          profileWhatsapp.value = String(profile?.whatsapp_number || "").replace(/^whatsapp:/i, "");
          profileHomeAddress.value = profile?.home_address || "";
          window.NWProfileAddressEditor?.setValue(profileHomeAddress.value);
        }
        function renderActorOwnerName(actor = null) {
          const owner = document.getElementById("ownerName");
          if (!owner) return;
          const actorName = String(actor?.display_name || "").trim();
          const sessionName = String(accountSession()?.first_name || "").trim();
          const name = actorName || sessionName;
          if (name) owner.textContent = name;
        }
        async function loadProfile() {
          const token = sessionToken();
          if (!token) return false;
          if (!profileCacheApplied) profileStatusBadge.textContent = "Wird geladen";
          try {
            const response = await fetch(PROFILE_URL, {
              method: "GET",
              headers: { Authorization: "Bearer " + token },
              signal: AbortSignal.timeout(9000)
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) throw new Error("profile_load_failed");
            renderProfilePayload(body);
            storeProfileCache(body);
            profileStatusBadge.textContent = "Sicher verbunden";
            showProfileStatus("");
            return true;
          } catch (_) {
            if (profileCacheApplied) {
              profileStatusBadge.textContent = "Zuletzt synchronisiert";
              return false;
            }
            profileStatusBadge.textContent = "Nicht verfügbar";
            showProfileStatus("Die persönlichen Daten konnten gerade nicht geladen werden.", "error");
            document.getElementById("planName").textContent = "Tarif derzeit nicht verfügbar";
            document.getElementById("planMeta").textContent = "Die Tarifdaten konnten gerade nicht geladen werden.";
            const customerNumber = document.getElementById("customerNumber");
            if (customerNumber) customerNumber.textContent = "Nicht verfügbar";
            document.getElementById("contactStatus").textContent = "Nicht verfügbar";
            document.getElementById("planStatusMeta").textContent = "Bitte laden Sie die Seite später erneut.";
            document.getElementById("usageState").textContent = "Aktueller Verbrauch derzeit nicht verfügbar. Es werden keine Werte geschätzt.";
            return false;
          }
        }
        personalDataForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (isManagedAccountContext()) {
            showProfileStatus("Persönliche Stammdaten einer verwalteten Person werden nur über einen dafür freigegebenen Personen-Zugang geändert.", "error");
            return;
          }
          const token = sessionToken();
          if (!token) {
            showProfileStatus("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.", "error");
            return;
          }
          profileSaveButton.disabled = true;
          profileSaveButton.textContent = "Wird gespeichert …";
          showProfileStatus("Änderungen werden sicher gespeichert …");
          try {
            const response = await fetch(PROFILE_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
              },
              body: JSON.stringify({
                first_name: profileFirstName.value.trim(),
                last_name: profileLastName.value.trim(),
                home_address: profileHomeAddress.value.trim()
              })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) throw new Error("profile_update_failed");
            renderProfilePayload(body);
            storeProfileCache(body);
            try {
              const session = JSON.parse(sessionStorage.getItem("scb_web_session") || "null");
              if (session) {
                session.first_name = body?.profile?.first_name || "";
                sessionStorage.setItem("scb_web_session", JSON.stringify(session));
              }
            } catch (_) {}
            document.querySelectorAll(".nw-account-name").forEach((node) => {
              node.textContent = body?.profile?.first_name || "Konto";
            });
            showProfileStatus("Gespeichert.", "success");
          } catch (_) {
            showProfileStatus("Die Änderung konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut.", "error");
          } finally {
            profileSaveButton.disabled = false;
            profileSaveButton.textContent = "Änderungen speichern";
          }
        });

        function validSafetyTime(value) {
          return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
        }
        function normalizeSafetyTimes(value) {
          const raw = Array.isArray(value)
            ? value
            : String(value || "").split(/[;,\s]+/);
          return [...new Set(raw.map((v) => String(v || "").trim()).filter(validSafetyTime))].slice(0, 4);
        }
        function clampSafetyDelay(value, fallback) {
          const number = Math.round(Number(value));
          return Number.isFinite(number) ? Math.min(60, Math.max(1, number)) : fallback;
        }
        function renderSafetyTimeInputs(values) {
          const times = normalizeSafetyTimes(values);
          if (!times.length) times.push("09:00");
          safetyTimeList.innerHTML = "";
          times.forEach((time, index) => {
            const row = document.createElement("div");
            row.className = "safety-time-row";
            const input = document.createElement("input");
            input.type = "time";
            input.className = "safety-time-input";
            input.value = time;
            input.step = "60";
            input.required = true;
            input.setAttribute("aria-label", "Uhrzeit " + (index + 1));
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "safety-remove-button";
            remove.setAttribute("aria-label", "Uhrzeit entfernen");
            remove.textContent = "−";
            remove.disabled = times.length <= 1;
            remove.addEventListener("click", () => {
              row.remove();
              refreshSafetyTimeControls();
            });
            row.append(input, remove);
            safetyTimeList.appendChild(row);
          });
          refreshSafetyTimeControls();
        }
        function refreshSafetyTimeControls() {
          const rows = Array.from(safetyTimeList.querySelectorAll(".safety-time-row"));
          rows.forEach((row) => {
            const button = row.querySelector(".safety-remove-button");
            if (button) button.disabled = rows.length <= 1;
          });
          safetyAddTimeButton.disabled = rows.length >= 4;
        }
        function currentSafetyTimes() {
          return Array.from(safetyTimeList.querySelectorAll(".safety-time-input"))
            .map((input) => input.value)
            .filter(validSafetyTime)
            .filter((value, index, list) => list.indexOf(value) === index)
            .slice(0, 4);
        }
        function normalizeSafetyPhone(value) {
          let phone = String(value || "").trim().replace(/^whatsapp:/i, "").replace(/[\s()\-./]/g, "");
          if (phone.startsWith("00")) phone = "+" + phone.slice(2);
          else if (/^0\d+$/.test(phone)) phone = "+49" + phone.slice(1);
          else if (/^49\d+$/.test(phone)) phone = "+" + phone;
          return /^\+[1-9]\d{6,14}$/.test(phone) ? phone : "";
        }
        function contactValues() {
          return Array.from(safetyContactList.querySelectorAll(".safety-contact-row")).map((row) => ({
            name: row.querySelector('[data-safety-contact="name"]')?.value.trim() || "",
            phone: row.querySelector('[data-safety-contact="phone"]')?.value.trim() || "",
            relationship: row.querySelector('[data-safety-contact="relationship"]')?.value.trim() || ""
          }));
        }
        function addSafetyContact(contact = {}) {
          const row = document.createElement("div");
          row.className = "safety-contact-row";
          row.innerHTML = `
            <div class="safety-contact-order"><strong></strong><button class="safety-remove-button" type="button" aria-label="Sicherheitskontakt entfernen">−</button></div>
            <label class="safety-contact-field"><span>Name</span><input class="safety-contact-input" data-safety-contact="name" type="text" autocomplete="name" maxlength="120"></label>
            <label class="safety-contact-field"><span>Telefon</span><input class="safety-contact-input" data-safety-contact="phone" type="tel" autocomplete="tel"></label>
            <label class="safety-contact-field"><span>Beziehung (optional)</span><input class="safety-contact-input" data-safety-contact="relationship" type="text" maxlength="100"></label>
          `;
          row.querySelector('[data-safety-contact="name"]').value = String(contact.name || "");
          row.querySelector('[data-safety-contact="phone"]').value = String(contact.phone || "");
          row.querySelector('[data-safety-contact="relationship"]').value = String(contact.relationship || "");
          row.querySelector(".safety-remove-button").addEventListener("click", () => {
            row.remove();
            refreshSafetyContacts();
          });
          safetyContactList.appendChild(row);
          refreshSafetyContacts();
        }
        function renderSafetyContacts(contacts, legacy = null) {
          const rows = Array.isArray(contacts) ? contacts : [];
          safetyContactList.innerHTML = "";
          rows.forEach((contact) => addSafetyContact(contact));
          if (!rows.length && legacy?.phone) {
            addSafetyContact({ name: legacy.name || "Sicherheitskontakt", phone: legacy.phone, relationship: "" });
          }
          if (!safetyContactList.children.length) addSafetyContact();
          refreshSafetyContacts();
        }
        function refreshSafetyContacts() {
          const rows = Array.from(safetyContactList.querySelectorAll(".safety-contact-row"));
          rows.forEach((row, index) => {
            const title = row.querySelector(".safety-contact-order strong");
            if (title) title.textContent = (index + 1) + ". Sicherheitskontakt";
          });
        }
        async function loadSafetyContacts(token) {
          const response = await fetch(SAFETY_CONTACTS_URL, {
            method: "GET",
            headers: { Authorization: "Bearer " + token }
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok || body?.ok !== true) throw new Error("safety_contacts_load_failed");
          return Array.isArray(body.contacts) ? body.contacts : [];
        }
        async function saveSafetyContacts(token, contacts) {
          const response = await fetch(SAFETY_CONTACTS_URL, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token
            },
            body: JSON.stringify({ contacts })
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok || body?.ok !== true) throw new Error(String(body?.status || "safety_contacts_save_failed"));
          return Array.isArray(body.contacts) ? body.contacts : [];
        }
        safetyAddTimeButton.addEventListener("click", () => {
          if (safetyTimeList.querySelectorAll(".safety-time-row").length >= 4) return;
          const row = document.createElement("div");
          row.className = "safety-time-row";
          const input = document.createElement("input");
          input.type = "time";
          input.className = "safety-time-input";
          input.value = "09:00";
          input.step = "60";
          input.required = true;
          input.setAttribute("aria-label", "Weitere Uhrzeit");
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "safety-remove-button";
          remove.setAttribute("aria-label", "Uhrzeit entfernen");
          remove.textContent = "−";
          remove.addEventListener("click", () => { row.remove(); refreshSafetyTimeControls(); });
          row.append(input, remove);
          safetyTimeList.appendChild(row);
          refreshSafetyTimeControls();
          input.focus();
        });
        safetyAddContactButton.addEventListener("click", () => {
          addSafetyContact();
          const rows = safetyContactList.querySelectorAll(".safety-contact-row");
          rows[rows.length - 1]?.querySelector('[data-safety-contact="name"]')?.focus();
        });
        function formatNext(value) {
          if (!value) return "";
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return String(value);
          return date.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
        }
        function setSafetyFormOpen(open) {
          safetyForm.hidden = !open;
          safetyCard.setAttribute("aria-expanded", String(open));
          safetyEditButton.textContent = open ? "Schließen" : "Bearbeiten";
          if (open) {
            requestAnimationFrame(() => safetyTimeList.querySelector(".safety-time-input")?.focus({ preventScroll: true }));
          }
        }
        function renderSafety(raw, contacts = lastSafetyContacts) {
          const s = raw?.data || raw?.safety || raw || {};
          lastSafety = s;
          const enabled = s.safety_enabled === true;
          const times = normalizeSafetyTimes(s.checkin_times);
          safetyStatus.textContent = enabled ? "Aktiviert" : "Deaktiviert";
          safetyMeta.textContent = enabled ? "Sicherheitsfunktion ist aktiviert." : "Sicherheitsfunktion ist ausgeschaltet.";
          const next = formatNext(s.next_checkin_at);
          safetyNext.textContent = enabled && next
            ? "Nächste Ausführung: " + next + (s.backend_active === true ? " · Backend aktiv" : "")
            : (enabled && s.backend_active === true ? "Backend aktiv" : "");
          safetyEnabled.checked = enabled;
          safetyToggleLabel.textContent = enabled ? "Deaktivieren" : "Aktivieren";
          renderSafetyTimeInputs(times);
          const customerDelay = clampSafetyDelay(s.customer_call_delay_minutes ?? s.safety_escalation_minutes, 5);
          const emergencyDelay = clampSafetyDelay(s.emergency_contact_delay_minutes, 3);
          safetyCustomerDelay.value = String(customerDelay);
          safetyEmergencyDelay.value = String(emergencyDelay);
          renderSafetyContacts(contacts, {
            name: s.trusted_contact_name || "",
            phone: s.trusted_contact_phone || ""
          });
          const savedContacts = Array.isArray(contacts) ? contacts.filter((contact) => contact && contact.phone) : [];
          const savedContactCount = savedContacts.length || (s.trusted_contact_phone ? 1 : 0);
          if (safetyVisibleStatus) safetyVisibleStatus.textContent = enabled ? "Aktiviert" : "Deaktiviert";
          if (safetySummaryIntro) safetySummaryIntro.textContent = enabled
            ? "Ihre Sicherheitsabfragen und die anschließende Kontaktkette sind eingerichtet."
            : "Die Sicherheitsfunktion ist ausgeschaltet. Es werden keine automatischen Sicherheitsabfragen oder Eskalationsanrufe gestartet.";
          if (safetySummaryGrid) safetySummaryGrid.hidden = !enabled;
          if (enabled) {
            if (safetySummaryNext) safetySummaryNext.textContent = next || "Noch nicht geplant";
            if (safetySummaryTimes) safetySummaryTimes.textContent = times.length ? times.join(" · ") : "Keine Uhrzeit gespeichert";
            if (safetySummaryResponse) safetySummaryResponse.textContent = customerDelay + " Minuten";
            if (safetySummaryCalls) safetySummaryCalls.textContent = "Bis zu 2 Anrufe bei Ihnen · je max. 20 Sekunden";
            if (safetySummaryContacts) safetySummaryContacts.textContent = savedContactCount + (savedContactCount === 1 ? " Kontakt hinterlegt" : " Kontakte hinterlegt");
            if (safetySummaryEscalation) safetySummaryEscalation.textContent = emergencyDelay + " Minuten nach dem 2. erfolglosen Anruf bei Ihnen";
          }
          if (safetyChainEscalation) safetyChainEscalation.textContent = "Bleiben beide Anrufe bei Ihnen ohne sichere persönliche Erreichbarkeit, wartet STEWARO " + emergencyDelay + " Minuten und beginnt anschließend mit Ihren Sicherheitskontakten.";
          const overviewSafety = document.getElementById("overviewSafety");
          const overviewSafetyMeta = document.getElementById("overviewSafetyMeta");
          if (overviewSafety) overviewSafety.textContent = enabled ? "Aktiviert" : "Deaktiviert";
          if (overviewSafetyMeta) overviewSafetyMeta.textContent = enabled
            ? (next ? "Nächste Ausführung: " + next : "Sicherheitsfunktion ist aktiviert.")
            : "Sicherheitsfunktion ist ausgeschaltet.";
        }
        function showSafetySaveStatus(message, error = false) {
          safetySaveStatus.textContent = message;
          safetySaveStatus.classList.add("is-visible");
          safetySaveStatus.style.color = error ? "#b85b5b" : "inherit";
        }
        async function loadSafety() {
          const token = sessionToken();
          if (!token) return;
          try {
            const managedContext = isManagedAccountContext();
            const accountId = managedContext ? activeAccountContext?.selected?.customer_account_id : "";
            if (managedContext && (!accountId || !managedSafetyAuthorized)) {
              throw new Error("managed_safety_not_authorized");
            }

            const contextUrl = accountId
              ? MANAGED_SAFETY_URL + "?customer_account_id=" + encodeURIComponent(accountId)
              : MANAGED_SAFETY_URL;
            const response = await fetch(contextUrl, {
              method: "GET",
              headers: { Authorization: "Bearer " + token },
              signal: AbortSignal.timeout(7000)
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) {
              if (managedContext && response.status === 403) setManagedSafetyAvailable(false);
              throw new Error(String(body?.status || "safety_context_load_failed"));
            }

            const safety = body.safety || {};
            const contacts = Array.isArray(safety.contacts) ? safety.contacts : [];
            const renderPayload = {
              safety_enabled: safety.enabled === true,
              checkin_times: Array.isArray(safety.checkin_times) ? safety.checkin_times : [],
              next_checkin_at: safety.next_checkin_at || null,
              backend_active: safety.enabled === true,
              customer_call_delay_minutes: Number(safety.customer_call_delay_minutes ?? 5),
              emergency_contact_delay_minutes: Number(safety.emergency_contact_delay_minutes ?? 3)
            };

            lastSafetyContacts = contacts;
            renderSafety(renderPayload, contacts);
            safetyCustomerDelay.disabled = managedContext;
            safetyEmergencyDelay.disabled = managedContext;
          } catch (_) {
            safetyStatus.textContent = "Nicht verfügbar";
            safetyMeta.textContent = "Die Sicherheitseinstellungen konnten gerade nicht geladen werden.";
            safetyNext.textContent = "";
            if (safetyVisibleStatus) safetyVisibleStatus.textContent = "Nicht verfügbar";
            if (safetySummaryIntro) safetySummaryIntro.textContent = "Die Sicherheitseinstellungen konnten gerade nicht geladen werden.";
            if (safetySummaryGrid) safetySummaryGrid.hidden = true;
          }
        }

        safetyEnabled.addEventListener("change", () => {
          safetyToggleLabel.textContent = safetyEnabled.checked ? "Deaktivieren" : "Aktivieren";
        });
        safetyEditButton.addEventListener("click", (event) => {
          event.stopPropagation();
          setSafetyFormOpen(safetyForm.hidden);
        });
        safetyCancelButton.addEventListener("click", (event) => {
          event.stopPropagation();
          if (lastSafety) renderSafety(lastSafety, lastSafetyContacts);
          safetySaveStatus.classList.remove("is-visible");
          setSafetyFormOpen(false);
        });
        safetyForm.addEventListener("click", (event) => event.stopPropagation());
        safetyForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const token = sessionToken();
          if (!token) {
            showSafetySaveStatus("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.", true);
            return;
          }

          const times = currentSafetyTimes();
          const rawContacts = contactValues();
          const enteredContacts = rawContacts.filter((contact) =>
            Boolean(contact.name || contact.phone || contact.relationship)
          );
          const contacts = enteredContacts.map((contact) => ({
            name: contact.name,
            phone: normalizeSafetyPhone(contact.phone),
            relationship: contact.relationship
          }));

          if (safetyEnabled.checked && !times.length) {
            showSafetySaveStatus("Bitte hinterlegen Sie mindestens eine Uhrzeit.", true);
            return;
          }
          if (safetyEnabled.checked && !contacts.length) {
            showSafetySaveStatus("Bitte hinterlegen Sie mindestens einen Sicherheitskontakt.", true);
            return;
          }
          if (enteredContacts.some((contact) => !contact.name || !normalizeSafetyPhone(contact.phone))) {
            showSafetySaveStatus("Bitte prüfen Sie Name und Telefonnummer aller Sicherheitskontakte.", true);
            return;
          }
          const phones = contacts.map((contact) => contact.phone);
          if (new Set(phones).size !== phones.length) {
            showSafetySaveStatus("Dieselbe Telefonnummer kann nicht mehrfach als Sicherheitskontakt verwendet werden.", true);
            return;
          }

          if (isManagedAccountContext()) {
            const accountId = activeAccountContext?.selected?.customer_account_id;
            if (!managedSafetyAuthorized || !accountId) {
              showSafetySaveStatus("Für diese Person fehlt die erforderliche Safety-Freigabe.", true);
              return;
            }
            safetySaveButton.disabled = true;
            safetySaveButton.textContent = "Wird gespeichert …";
            showSafetySaveStatus("Änderungen werden gespeichert …");
            try {
              const response = await fetch(MANAGED_SAFETY_URL, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + token
                },
                body: JSON.stringify({
                  customer_account_id: accountId,
                  enabled: safetyEnabled.checked,
                  checkin_times: times,
                  contacts,
                  timezone: "Europe/Berlin",
                  customer_call_delay_minutes: clampSafetyDelay(safetyCustomerDelay.value, 5),
                  emergency_contact_delay_minutes: clampSafetyDelay(safetyEmergencyDelay.value, 3)
                })
              });
              const body = await response.json().catch(() => ({}));
              if (!response.ok || body?.ok !== true) {
                if (response.status === 403) setManagedSafetyAvailable(false);
                throw new Error(String(body?.status || "managed_safety_save_failed"));
              }
              const managedContacts = Array.isArray(body?.safety?.contacts) ? body.safety.contacts : contacts;
              lastSafetyContacts = managedContacts;
              safetyLoadStarted = false;
              await loadSafety();
              showSafetySaveStatus("Gespeichert.");
              setTimeout(() => {
                safetySaveStatus.classList.remove("is-visible");
                setSafetyFormOpen(false);
              }, 700);
            } catch (_) {
              showSafetySaveStatus("Die Safety-Einstellungen dieser Person konnten nicht gespeichert werden.", true);
            } finally {
              safetySaveButton.disabled = false;
              safetySaveButton.textContent = "Änderungen speichern";
              safetyCustomerDelay.disabled = true;
              safetyEmergencyDelay.disabled = true;
            }
            return;
          }

          const customerDelay = clampSafetyDelay(safetyCustomerDelay.value, 5);
          const emergencyDelay = clampSafetyDelay(safetyEmergencyDelay.value, 3);
          safetyCustomerDelay.value = String(customerDelay);
          safetyEmergencyDelay.value = String(emergencyDelay);

          safetySaveButton.disabled = true;
          safetySaveButton.textContent = "Wird gespeichert …";
          showSafetySaveStatus("Änderungen werden gespeichert …");
          try {
            const response = await fetch(MANAGED_SAFETY_URL, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
              },
              body: JSON.stringify({
                enabled: safetyEnabled.checked,
                checkin_times: times,
                contacts,
                timezone: "Europe/Berlin",
                customer_call_delay_minutes: customerDelay,
                emergency_contact_delay_minutes: emergencyDelay
              })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) {
              throw new Error(String(body?.status || "safety_context_save_failed"));
            }
            const savedContacts = Array.isArray(body?.safety?.contacts) ? body.safety.contacts : contacts;
            lastSafetyContacts = savedContacts;
            safetyLoadStarted = false;
            await loadSafety();
            showSafetySaveStatus("Gespeichert.");
            setTimeout(() => {
              safetySaveStatus.classList.remove("is-visible");
              setSafetyFormOpen(false);
            }, 700);
          } catch (error) {
            const status = error instanceof Error ? error.message : "";
            if (status === "invalid_contact" || status === "duplicate_contact_phone") {
              showSafetySaveStatus("Die Sicherheitskontakte konnten nicht gespeichert werden. Bitte prüfen Sie die Angaben.", true);
            } else {
              showSafetySaveStatus("Die Änderung konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut.", true);
            }
          } finally {
            safetySaveButton.disabled = false;
            safetySaveButton.textContent = "Änderungen speichern";
          }
        });

        function receptionRow(value) {
          if (Array.isArray(value)) return value[0] || {};
          return value && typeof value === "object" ? value : {};
        }
        function setReceptionSaveStatus(message, error = false) {
          receptionSaveStatus.textContent = message || "";
          receptionSaveStatus.style.color = error ? "#b85b5b" : "inherit";
        }
        function setReceptionControlsDisabled(disabled) {
          [
            receptionEnabled,
            receptionMode,
            receptionPersona,
            receptionUnknownPolicy,
            receptionTrustedPolicy,
            receptionMessageTaking,
            receptionTransfer,
            receptionNotifyScreened,
            receptionNotifySuspicious,
            receptionSaveButton
          ].forEach((el) => { if (el) el.disabled = disabled; });
        }
        function receptionStatusLabel(profile) {
          const setup = profile?.setup || {};
          if (!setup.routing_ready) return "Nicht eingerichtet";
          if (profile?.configured_enabled && profile?.enabled) return "Aktiv";
          if (profile?.configured_enabled === false) return "Bereit zur Einrichtung";
          return "Deaktiviert";
        }
        function renderReceptionContacts(contacts) {
          const rows = Array.isArray(contacts) ? contacts : [];
          if (!rows.length) {
            receptionContactList.innerHTML = '<div class="empty">Noch keine aktiven Kontakte vorhanden.</div>';
            return;
          }
          receptionContactList.innerHTML = "";
          rows.forEach((contact) => {
            const row = document.createElement("label");
            row.className = "reception-contact";
            const copy = document.createElement("span");
            const name = document.createElement("strong");
            name.textContent = contact.contact_name || "Kontakt";
            const meta = document.createElement("span");
            meta.className = "muted";
            meta.textContent = [contact.relationship, contact.phone_e164].filter(Boolean).join(" · ");
            copy.append(name, meta);
            const check = document.createElement("input");
            check.type = "checkbox";
            check.checked = Boolean(contact.reception_trusted);
            check.setAttribute("aria-label", (contact.contact_name || "Kontakt") + " als vertrauenswürdig markieren");
            check.addEventListener("change", async () => {
              const token = receptionToken();
              if (!token) {
                check.checked = !check.checked;
                setReceptionSaveStatus("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.", true);
                return;
              }
              check.disabled = true;
              try {
                const response = await fetch(RECEPTION_CONTACT_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                  body: JSON.stringify({ contact_id: contact.id, trusted: check.checked })
                });
                if (!response.ok) throw new Error("contact_trust_failed");
                setReceptionSaveStatus("Vertrauenskontakt aktualisiert.");
              } catch (_) {
                check.checked = !check.checked;
                setReceptionSaveStatus("Der Vertrauensstatus konnte gerade nicht gespeichert werden.", true);
              } finally {
                check.disabled = false;
              }
            });
            row.append(copy, check);
            receptionContactList.appendChild(row);
          });
        }
        function renderReception(profileValue, contacts) {
          const profile = receptionRow(profileValue);
          const setup = profile.setup || {};
          receptionRoutingReady = Boolean(setup.routing_ready);
          receptionLoaded = true;
          receptionStatus.textContent = receptionStatusLabel(profile);
          receptionEnabled.checked = Boolean(profile.configured_enabled ?? profile.enabled);
          receptionMode.value = profile.mode === "senior_protection" ? "senior_protection" : "luxury_reception";
          receptionPersona.value = profile.persona_key === "james" ? "james" : "konrad";
          receptionUnknownPolicy.value = ["screen_then_transfer","screen_then_message","message_only"].includes(profile.unknown_caller_policy) ? profile.unknown_caller_policy : "screen_then_message";
          receptionTrustedPolicy.value = ["screen_then_transfer","direct_transfer","message_only"].includes(profile.trusted_contact_policy) ? profile.trusted_contact_policy : "screen_then_transfer";
          receptionMessageTaking.checked = profile.message_taking_enabled !== false;
          receptionTransfer.checked = profile.transfer_enabled !== false;
          receptionNotifyScreened.checked = profile.notify_on_every_screened_call !== false;
          receptionNotifySuspicious.checked = profile.notify_on_suspicious_call !== false;
          receptionSetupNotice.hidden = receptionRoutingReady;
          receptionSetupMeta.textContent = receptionRoutingReady
            ? "Telefonroute ist bereit."
            : "Eine Aktivierung ist erst möglich, wenn eine aktive Telefonannahme-Nummer und – falls Weiterleitung aktiviert ist – ein verifizierter Telefon-Endpunkt vorhanden sind.";
          receptionSetupActions.hidden = receptionRoutingReady;
          renderReceptionContacts(contacts);
          setReceptionControlsDisabled(false);
          receptionEnabled.disabled = !receptionRoutingReady && !receptionEnabled.checked;
        }
        async function loadTelephoneReception() {
          const token = receptionToken();
          if (!token) {
            receptionStatus.textContent = "Nicht eingerichtet";
            receptionSetupMeta.textContent = "Für die Einrichtung ist eine gültige Sitzung erforderlich.";
            receptionContactList.innerHTML = '<div class="empty">Kontakte sind ohne gültige Sitzung nicht verfügbar.</div>';
            setReceptionControlsDisabled(true);
            return;
          }
          setReceptionControlsDisabled(true);
          receptionStatus.textContent = "Wird geladen …";
          try {
            const response = await fetch(RECEPTION_URL, {
              method: "GET",
              headers: { Authorization: "Bearer " + token }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) throw new Error(body?.error || "reception_load_failed");
            renderReception(body.reception, body.contacts);
          } catch (_) {
            receptionStatus.textContent = "Nicht eingerichtet";
            receptionSetupNotice.hidden = false;
            receptionSetupActions.hidden = false;
            receptionSetupMeta.textContent = "Die Telefonannahme ist im aktuellen Web-Zugang noch nicht freigeschaltet.";
            receptionContactList.innerHTML = '<div class="empty">Vertrauenskontakte konnten noch nicht geladen werden.</div>';
            setReceptionControlsDisabled(true);
            setReceptionSaveStatus("Telefonannahme noch nicht eingerichtet.");
          }
        }
        receptionForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const token = receptionToken();
          if (!token) {
            setReceptionSaveStatus("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.", true);
            return;
          }
          if (receptionEnabled.checked && !receptionRoutingReady) {
            setReceptionSaveStatus("Die Telefonannahme kann erst aktiviert werden, wenn die Telefonroute eingerichtet ist.", true);
            receptionSetupNotice.hidden = false;
            return;
          }
          receptionSaveButton.disabled = true;
          receptionSaveButton.textContent = "Wird gespeichert …";
          setReceptionSaveStatus("Einstellungen werden gespeichert …");
          try {
            const response = await fetch(RECEPTION_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
              body: JSON.stringify({
                enabled: receptionEnabled.checked,
                mode: receptionMode.value,
                persona_key: receptionPersona.value,
                screening_level: receptionMode.value === "senior_protection" ? "strict" : "standard",
                unknown_caller_policy: receptionUnknownPolicy.value,
                suspicious_caller_policy: "block_and_notify",
                trusted_contact_policy: receptionTrustedPolicy.value,
                transfer_enabled: receptionTransfer.checked,
                message_taking_enabled: receptionMessageTaking.checked,
                notify_on_every_screened_call: receptionNotifyScreened.checked,
                notify_on_suspicious_call: receptionNotifySuspicious.checked
              })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body?.ok !== true) {
              if (String(body?.error || "").includes("telephone_reception_routing_not_ready")) {
                receptionRoutingReady = false;
                receptionEnabled.checked = false;
                receptionSetupNotice.hidden = false;
                throw new Error("routing_not_ready");
              }
              throw new Error("reception_update_failed");
            }
            renderReception(body.reception, Array.from(receptionContactList.querySelectorAll(".reception-contact")).length ? null : []);
            await loadTelephoneReception();
            setReceptionSaveStatus("Gespeichert.");
          } catch (error) {
            const routing = error instanceof Error && error.message === "routing_not_ready";
            setReceptionSaveStatus(
              routing ? "Die Telefonroute ist noch nicht vollständig eingerichtet." : "Die Änderung konnte gerade nicht gespeichert werden.",
              true
            );
          } finally {
            receptionSaveButton.disabled = false;
            receptionSaveButton.textContent = "Einstellungen speichern";
          }
        });

        let mfaLoadStarted = false;
        let safetyLoadStarted = false;
        let receptionLoadStarted = false;

        function ensureMfaLoaded() {
          if (mfaLoadStarted) return;
          mfaLoadStarted = true;
          bootstrapSecurityRecommendation().catch(() => {
            mfaLoadStarted = false;
          });
        }
        function ensureSafetyLoaded() {
          if (safetyLoadStarted) return;
          safetyLoadStarted = true;
          loadSafety().catch(() => {
            safetyLoadStarted = false;
          });
        }
        function ensureReceptionLoaded() {
          if (receptionLoadStarted || receptionLoaded) return;
          receptionLoadStarted = true;
          loadTelephoneReception().finally(() => {
            if (!receptionLoaded) receptionLoadStarted = false;
          });
        }
        function scheduleOverviewBackground() {
          // Safety is intentionally loaded only after the customer opens Safety.
          // The overview remains a stable navigation surface and must never show
          // a backend availability error for Safety.
        }

        setAccountTab("overview");
        hydrateProfileCache();
        (async () => {
          const auth = window.SCBAuth;
          if (auth?.validateSession) {
            const valid = await auth.validateSession().catch(() => false);
            if (!valid) return;
          }

          // Render the signed-in customer's own account immediately.
          // Managed-account context is an enhancement and may never block the overview.
          const profileLoaded = await loadProfile().catch(() => false);
          const contextLoaded = await loadAccountContexts().catch(() => false);

          if (!profileLoaded && !contextLoaded) {
            const prefetched = auth?.getValidatedProfile?.();
            if (prefetched?.ok === true) {
              renderProfilePayload(prefetched);
              storeProfileCache(prefetched);
              profileStatusBadge.textContent = "Sicher verbunden";
              showProfileStatus("");
            }
          } else {
            profileStatusBadge.textContent = "Sicher verbunden";
            showProfileStatus("");
          }
          scheduleOverviewBackground();
        })();

        try {
          const d = JSON.parse(
            localStorage.getItem("scb_onboarding") || "null",
          );
          if (d) {
            // Legacy onboarding data is never authoritative for an authenticated account.
            // A named Concierge may be rendered from onboarding data only before authentication.
            const selected = d.concierge_choice || d.conciergeChoice;
            if (selected && !sessionToken()) {
              const conciergeNames = { nilo: "FIDEL", mira: "FIDEL", lena: "FIDEL", lukas: "FIDEL", zuri: "FIDEL", jabari: "FIDEL", sofia: "FIDEL" };
              const key = String(selected).toLowerCase();
              const conciergeName = conciergeNames[key] || "FIDEL";
              document.querySelector(".personalize .value").textContent = `${conciergeName} ist Ihr persönlicher KI-Concierge.`;
              const overviewConcierge = document.getElementById("overviewConcierge");
              if (overviewConcierge) overviewConcierge.textContent = conciergeName;
            }
            // Legacy onboarding data is never authoritative for an authenticated account.
            // Names, selected person context and "Eingerichtet von" come only from the
            // server-validated profile/account-context payloads above.
            if (!sessionToken()) {
              document.getElementById("recipientName").textContent =
                d.recipient?.name || "–";
              document.getElementById("recipientMeta").textContent = [
                d.recipient?.relationship,
                d.recipient?.phone,
                d.recipient?.addressing === "du"
                  ? "Du-Ansprache"
                  : "Sie-Ansprache",
              ]
                .filter(Boolean)
                .join(" · ");
              document.getElementById("ownerName").textContent =
                d.owner?.name || "–";
              if (d.recipient?.note)
                document.getElementById("profileInfo").textContent =
                  d.recipient.note;
            }
          }
          prefSummary(
            JSON.parse(
              localStorage.getItem("nahwerk_concierge_preferences") || "null",
            ),
          );
        } catch (e) {}
      })();
    