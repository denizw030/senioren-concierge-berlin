(() => {
  const SESSION_KEY = "scb_web_session";
  const RECEPTION_PROFILE_URL = "https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-customer-portal-staging/portal/telephone-reception";
  const NUMBER_ONBOARDING_ENDPOINT = null;
  const ACTIVE_STATES = new Set(["ROUTING_ACTIVE", "PORTING_ACTIVE"]);
  const STATE_LABELS = Object.freeze({
    NUMBER_SUBMITTED: "Nummer übermittelt",
    OWNERSHIP_PENDING: "Inhaberprüfung ausstehend",
    OWNERSHIP_VERIFIED: "Inhaber bestätigt",
    PROVIDER_SETUP_PENDING: "Provider-Einrichtung ausstehend",
    ROUTING_PENDING: "Routing wird eingerichtet",
    PORTING_PENDING: "Portierung wird vorbereitet",
    ROUTING_ACTIVE: "Routing aktiv",
    PORTING_ACTIVE: "Portierung aktiv",
    ROUTING_FAILED: "Einrichtung fehlgeschlagen"
  });
  const form = document.getElementById("telephoneReceptionSetupForm");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const productInputs = [...form.querySelectorAll('input[name="productScope"]')];
  const handlerAgent = $("handlerTelephoneAgent");
  const handlerPersonal = $("handlerPersonalConcierge");
  const agentField = $("telephoneAgentField");
  const entitlementNote = $("handlerEntitlementNote");
  const serverNote = $("serverContractNote");
  const result = $("telephoneReceptionSetupResult");
  const resultTitle = $("telephoneReceptionSetupResultTitle");
  const resultBody = $("telephoneReceptionSetupResultBody");
  const setupButton = $("telephoneReceptionSetupButton");
  let personalConciergeAllowed = false;
  function sessionToken(){try{const row=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");return row&&row.session_token?String(row.session_token):""}catch{return ""}}
  function selectedProductScope(){return form.querySelector('input[name="productScope"]:checked')?.value||"STANDALONE"}
  function setResult(title,body,kind="pending"){result.hidden=false;result.className="tr-result"+(kind==="active"?" is-active":kind==="error"?" is-error":"");resultTitle.textContent=title;resultBody.textContent=body}
  function syncHandlerAuthority(){
    const standalone=selectedProductScope()==="STANDALONE";
    const allowPersonal=!standalone&&personalConciergeAllowed;
    handlerPersonal.disabled=!allowPersonal;
    if(!allowPersonal&&handlerPersonal.checked)handlerAgent.checked=true;
    if(standalone)handlerAgent.checked=true;
    agentField.hidden=!handlerAgent.checked;
    entitlementNote.textContent=standalone
      ?"Standalone erlaubt serverseitig ausschließlich TELEPHONE_AGENT."
      :allowPersonal
        ?"Ihr serverseitiges Bundle-Entitlement erlaubt PERSONAL_CONCIERGE oder TELEPHONE_AGENT."
        :"PERSONAL_CONCIERGE bleibt gesperrt, bis der Server ein entsprechendes Bundle-Entitlement bestätigt.";
  }
  function extractPersonalConciergeAccess(body){
    const candidates=[body?.product_access,body?.entitlement,body?.reception?.product_access,body?.reception?.entitlement];
    return candidates.some((value)=>value?.personal_concierge_allowed===true&&value?.allowed!==false);
  }
  async function loadServerAuthority(){
    const token=sessionToken();
    if(!token){serverNote.textContent="Noch nicht angemeldet. Die Formularangaben bleiben im Browser und werden nicht an einen Provider oder Routing-Dienst gesendet.";syncHandlerAuthority();return}
    try{
      const response=await fetch(RECEPTION_PROFILE_URL,{method:"GET",headers:{Authorization:"Bearer "+token}});
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body?.ok!==true)throw new Error("profile_unavailable");
      personalConciergeAllowed=extractPersonalConciergeAccess(body);
      const existingReady=body?.reception?.setup?.routing_ready===true;
      serverNote.textContent=existingReady
        ?"Bestehendes Telefonannahme-Profil geladen. Eine bereits vorhandene Telefonroute ist als bereit markiert; der neue Festnetz-Onboarding-Status wird davon getrennt behandelt."
        :"Kundenzugang bestätigt. Der neue Festnetz-Onboarding-Endpunkt ist in der aktuell deploybaren Portal-Route noch nicht exponiert.";
    }catch{serverNote.textContent="Der vorhandene Telefonannahme-Profilpfad konnte nicht geladen werden. Es wird fail-closed nichts aktiviert oder an einen Provider gesendet."}
    syncHandlerAuthority();
  }
  function validPhone(value){const digits=String(value||"").replace(/\D/g,"");return digits.length>=7&&digits.length<=15}
  productInputs.forEach((input)=>input.addEventListener("change",syncHandlerAuthority));
  [handlerAgent,handlerPersonal].forEach((input)=>input.addEventListener("change",syncHandlerAuthority));
  form.addEventListener("submit",(event)=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    if(!validPhone($("existingLandline").value)||!validPhone($("callbackNumber").value)){setResult("Bitte Telefonnummern prüfen","Bestehende Festnetznummer und Rückruf-/Zuschaltungsnummer müssen als plausible Telefonnummern angegeben werden.","error");return}
    const scope=selectedProductScope();
    const billing=form.querySelector('input[name="billingMode"]:checked')?.value||"SUBSCRIPTION";
    const handler=form.querySelector('input[name="handlerMode"]:checked')?.value||"TELEPHONE_AGENT";
    void window.NahwerkAnalytics?.track("telephone_reception_setup_attempt",{funnel_name:"telephone_reception",funnel_step:"number_onboarding",product_scope:scope,billing_mode:billing,handler_mode:handler});
    if(scope==="STANDALONE"&&handler!=="TELEPHONE_AGENT"){setResult("Rollenwahl nicht zulässig","Standalone Telefonannahme darf serverseitig nur TELEPHONE_AGENT verwenden.","error");syncHandlerAuthority();return}
    if(handler==="PERSONAL_CONCIERGE"&&!personalConciergeAllowed){setResult("Berechtigung fehlt","Der persönliche Concierge kann für die Telefonannahme erst gewählt werden, wenn der Server das CONCIERGE_BUNDLE-Entitlement bestätigt.","error");syncHandlerAuthority();return}
    const token=sessionToken();
    if(!token){setResult("Noch nicht übermittelt","Die Angaben wurden nur geprüft. Für die serverseitige Festnetz-Einrichtung ist ein verifizierter Kunden-Zugang erforderlich. Die Standalone-Kontoanlage ist in diesem PRE-PROD-Slice noch nicht an den neuen Telefonannahme-Vertrag angebunden. Es wurde nichts gebucht, aktiviert, portiert oder an einen Provider gesendet.");return}
    if(!NUMBER_ONBOARDING_ENDPOINT){setResult("Übermittlung noch nicht verfügbar","Ihr Kundenzugang ist vorhanden, aber der aktuell deploybare Website→Platform-Endpunkt für submit_telephone_reception_number_v1 fehlt noch. Die Nummer wurde deshalb nicht als NUMBER_SUBMITTED gespeichert und ist nicht aktiv. Es wurde kein Provider aufgerufen.");return}
  });
  window.NAHWERKTelephoneReceptionContract=Object.freeze({platform_commit:"fc189c686e559617398ac00847d1a23d1aa198ea",active_states:[...ACTIVE_STATES],state_labels:STATE_LABELS,number_onboarding_endpoint_ready:Boolean(NUMBER_ONBOARDING_ENDPOINT)});
  setupButton.dataset.nextState="NUMBER_SUBMITTED";
  syncHandlerAuthority();
  void loadServerAuthority();
})();
