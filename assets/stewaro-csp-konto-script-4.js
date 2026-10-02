
    (() => {
      const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
      const CAPS = ["EMAIL_READ","EMAIL_SEARCH","EMAIL_ATTACHMENTS","EMAIL_DRAFT","EMAIL_MAILBOX","EMAIL_SEND"];
      function emailFallbackToken() {
        try { return String(JSON.parse(sessionStorage.getItem("scb_web_session") || "null")?.session_token || ""); }
        catch (_) { return ""; }
      }
      function emailFallbackMessage(message, detail) {
        const title = document.getElementById("emailStateTitle");
        const meta = document.getElementById("emailStateMeta");
        if (title) title.textContent = message;
        if (meta) meta.textContent = detail || "";
      }
      document.addEventListener("click", async (event) => {
        const button = event.target?.closest?.("#emailConnectButton");
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const sessionToken = emailFallbackToken();
        if (!sessionToken) {
          emailFallbackMessage("Deine Sitzung ist nicht mehr gültig.", "Bitte melde dich erneut bei STEWARO an.");
          return;
        }
        button.disabled = true;
        button.textContent = "Verbindung wird gestartet …";
        try {
          const response = await fetch(BASE + "/email/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionToken },
            body: JSON.stringify({ provider: "GOOGLE", requested_capabilities: CAPS })
          });
          const data = await response.json().catch(() => ({}));
          const redirect = String(data?.authorization_redirect_url || "");
          let url = null;
          try { url = new URL(redirect); } catch (_) {}
          if (!response.ok || data?.ok !== true || !url || url.protocol !== "https:" || url.hostname !== "accounts.google.com") {
            throw new Error(String(data?.error?.code || "EMAIL_OAUTH_FAILED"));
          }
          location.assign(url.toString());
        } catch (_) {
          emailFallbackMessage("Die Google-Verbindung konnte nicht gestartet werden.", "Bitte versuche es erneut.");
          button.disabled = false;
          button.textContent = "Verbinden";
        }
      }, true);
    })();
  