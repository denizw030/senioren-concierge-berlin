(() => {
  "use strict";

  const ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg-consumer-rights";
  const CONTRACT_VERSION = "payg-consumer-rights-v1";
  const form = document.getElementById("withdrawForm");
  const submit = document.getElementById("withdrawConfirm");
  const status = document.getElementById("withdrawStatus");
  let ready = false;

  function setStatus(message,error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error",error);
  }

  function normalizeReadiness(body) {
    const ok = body?.ok === true && body?.contract_version === CONTRACT_VERSION && body?.authoritative === true && body?.electronic_withdrawal_function === true && body?.durable_confirmation === true;
    return Object.freeze({ ready:ok, contract_version:String(body?.contract_version || "") });
  }

  async function api(action,payload = {}) {
    const response = await fetch(ENDPOINT,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ action,...payload }),
      cache:"no-store",
      credentials:"omit"
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) throw new Error(String(body?.status || `http_${response.status}`));
    return body;
  }

  function clean(value,max) {
    const text = String(value || "").trim().replace(/\s+/g," ");
    return text && text.length <= max ? text : null;
  }

  async function checkReadiness() {
    try {
      ready = normalizeReadiness(await api("readiness")).ready;
    } catch { ready = false; }
    if (submit) submit.disabled = !ready;
    setStatus(ready
      ? "PROD-Widerruf ist verfügbar. Nach „Widerruf bestätigen“ muss NAHWERK den Eingang unverzüglich auf dem angegebenen elektronischen Weg bestätigen."
      : "Die elektronische PROD-Widerrufsfunktion ist serverseitig noch nicht autoritativ freigegeben. Es wird kein Widerrufserfolg vorgetäuscht.",!ready);
  }

  async function sendWithdrawal(event) {
    event.preventDefault();
    if (!ready || !(submit instanceof HTMLButtonElement)) return;
    const consumerName = clean(document.getElementById("withdrawName")?.value,160);
    const contractReference = clean(document.getElementById("withdrawReference")?.value,160);
    const confirmationEmail = clean(document.getElementById("withdrawEmail")?.value,254);
    if (!consumerName || !contractReference || !confirmationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(confirmationEmail)) {
      setStatus("Bitte Name, Vertrags- oder Auftragsnummer und eine gültige E-Mail-Adresse angeben.",true);
      return;
    }
    submit.disabled = true;
    try {
      const body = await api("withdraw",{
        consumer_name:consumerName,
        contract_reference:contractReference,
        confirmation_email:confirmationEmail,
        statement:"WITHDRAW"
      });
      const confirmed = body?.status === "withdrawal_received" && body?.contract_version === CONTRACT_VERSION && body?.authoritative === true && body?.confirmation_delivery_state === "SENT" && typeof body?.received_at === "string";
      if (!confirmed) throw new Error("confirmation_not_sent");
      form?.querySelectorAll("input,button").forEach((node) => { node.disabled = true; });
      setStatus(`Widerruf eingegangen. Die elektronische Eingangsbestätigung wurde versendet. Eingang: ${new Date(body.received_at).toLocaleString("de-DE")}.`);
    } catch {
      setStatus("Der Widerruf wurde nicht als autoritativ eingegangen und bestätigt gemeldet. Bitte nutze zusätzlich die in der Widerrufsbelehrung genannten Kontaktwege.",true);
      submit.disabled = !ready;
    }
  }

  form?.addEventListener("submit",sendWithdrawal);
  window.NAHWERKElectronicWithdrawalTestHooks = Object.freeze({ CONTRACT_VERSION,ENDPOINT,normalizeReadiness });
  checkReadiness();
})();
