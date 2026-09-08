(() => {
  const SESSION_KEY = "scb_web_session";
  const PLATFORM_CONTRACT = "WEBSITE_EMAIL_INTEGRATION_CONTRACT_V1";
  const PLATFORM_CONTRACT_SHA = "d9f91bb488f5895b27a0618e1a94188f1e9ee19b";
  const PREPARED_GATEWAY_PATH = "/functions/v1/nahwerk-email-website-gateway";
  // Runtime safety boundary. Keep null until gateway + migration are separately approved and deployed.
  const EMAIL_GATEWAY_BASE = null;

  const PROVIDERS = Object.freeze(["GOOGLE", "MICROSOFT", "GENERIC"]);
  const PROVIDER_LABELS = Object.freeze({
    GOOGLE: "Google Gmail / Google Workspace",
    MICROSOFT: "Microsoft Outlook / Microsoft 365",
    GENERIC: "Anderer Anbieter"
  });
  const CAPABILITIES = Object.freeze(["EMAIL_READ","EMAIL_SEARCH","EMAIL_ATTACHMENTS","EMAIL_DRAFT","EMAIL_SEND"]);
  const STATES = Object.freeze(["DISCONNECTED","CONNECTING","CONNECTED","REAUTH_REQUIRED","SCOPE_REQUIRED","ERROR","REVOKED"]);
  const AVAILABILITY = Object.freeze(["AVAILABLE","CONFIGURATION_REQUIRED","UNAVAILABLE"]);
  const GENERIC_PROVIDER_KEYS = Object.freeze(["GMX","WEBDE","YAHOO","TELEKOM","IONOS","STRATO","FASTMAIL","ICLOUD","ZOHO","CUSTOM"]);

  const ERROR_MAP = Object.freeze({
    UNAUTHENTICATED:{retryable:false,nextState:"DISCONNECTED",message:"Ihre Sitzung ist nicht mehr gültig. Bitte melden Sie sich erneut an."},
    EMAIL_IDENTITY_BINDING_FAILED:{retryable:false,nextState:"DISCONNECTED",message:"Die E-Mail-Verbindung konnte Ihrem Konto nicht sicher zugeordnet werden."},
    EMAIL_PROVIDER_UNAVAILABLE:{retryable:true,nextState:"DISCONNECTED",message:"Der E-Mail-Anbieter ist derzeit nicht erreichbar."},
    EMAIL_PROVIDER_NOT_SUPPORTED:{retryable:false,nextState:"DISCONNECTED",message:"Dieser E-Mail-Anbieter wird über diesen Verbindungsweg nicht unterstützt."},
    EMAIL_CONNECTION_NOT_FOUND:{retryable:false,nextState:"DISCONNECTED",message:"Es wurde keine E-Mail-Verbindung gefunden."},
    EMAIL_CONNECTION_REAUTH_REQUIRED:{retryable:false,nextState:"REAUTH_REQUIRED",message:"Das E-Mail-Konto muss erneut verbunden werden."},
    EMAIL_SCOPE_REQUIRED:{retryable:false,nextState:"SCOPE_REQUIRED",message:"Für die gewünschte E-Mail-Funktion ist eine zusätzliche Berechtigung erforderlich."},
    EMAIL_CONNECTION_REVOKED:{retryable:false,nextState:"REVOKED",message:"Die E-Mail-Verbindung wurde getrennt."},
    EMAIL_OAUTH_STATE_INVALID:{retryable:false,nextState:"DISCONNECTED",message:"Die Rückkehr der E-Mail-Anmeldung konnte nicht sicher bestätigt werden."},
    EMAIL_OAUTH_FAILED:{retryable:true,nextState:"ERROR",message:"Die E-Mail-Anmeldung konnte nicht abgeschlossen werden."},
    EMAIL_GENERIC_CONFIGURATION_INVALID:{retryable:false,nextState:"DISCONNECTED",message:"Die technischen E-Mail-Einstellungen sind unvollständig oder ungültig."},
    EMAIL_PROVIDER_CONFIGURATION_MISSING:{retryable:true,nextState:"DISCONNECTED",message:"Die serverseitige Provider-Konfiguration ist noch nicht vollständig verfügbar."},
    EMAIL_CONNECTION_CONFLICT:{retryable:false,nextState:"ERROR",message:"Die E-Mail-Verbindung konnte wegen eines bestehenden Verbindungszustands nicht geändert werden."},
    EMAIL_REQUEST_INVALID:{retryable:false,nextState:"DISCONNECTED",message:"Die E-Mail-Anfrage konnte nicht sicher verarbeitet werden."}
  });

  function sessionToken(storage=globalThis.sessionStorage){
    try{const row=JSON.parse(storage?.getItem(SESSION_KEY)||"null");return row?.session_token?String(row.session_token):""}catch{return ""}
  }
  function buildGatewayUrl(base,path,query=null){
    if(!base)return null;
    const url=new URL(String(base).replace(/\/$/,"")+path);
    if(query)for(const [key,value] of Object.entries(query))if(value!==null&&value!==undefined&&value!=="")url.searchParams.set(key,String(value));
    return url.toString();
  }
  function normalizeError(body){
    const code=String(body?.error?.code||"");
    const contract=ERROR_MAP[code]||ERROR_MAP.EMAIL_REQUEST_INVALID;
    return {code:ERROR_MAP[code]?code:"EMAIL_REQUEST_INVALID",retryable:contract.retryable===true&&body?.error?.retryable===true,nextState:contract.nextState,message:contract.message};
  }
  async function gatewayRequest({base,token,method="GET",path,query=null,body=null,fetchImpl=globalThis.fetch}){
    if(!base)return {ok:false,kind:"runtime_inert",networkRequestMade:false};
    if(!token)return {ok:false,kind:"gateway_error",networkRequestMade:false,error:{code:"UNAUTHENTICATED",...ERROR_MAP.UNAUTHENTICATED}};
    const url=buildGatewayUrl(base,path,query),headers={Authorization:"Bearer "+token},init={method,headers};
    if(method==="POST"){headers["Content-Type"]="application/json";init.body=JSON.stringify(body??{})}
    let response;
    try{response=await fetchImpl(url,init)}catch{return {ok:false,kind:"gateway_error",networkRequestMade:true,error:{code:"EMAIL_PROVIDER_UNAVAILABLE",...ERROR_MAP.EMAIL_PROVIDER_UNAVAILABLE,retryable:true}}}
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.ok!==true)return {ok:false,kind:"gateway_error",networkRequestMade:true,httpStatus:response.status,error:normalizeError(data)};
    return {ok:true,kind:"success",networkRequestMade:true,httpStatus:response.status,data};
  }
  function normalizeProviderList(body){
    if(body?.ok!==true||!Array.isArray(body.providers))return [];
    return body.providers.flatMap(row=>{
      const provider=String(row?.provider||"").toUpperCase(),availability=String(row?.availability||"").toUpperCase();
      if(!PROVIDERS.includes(provider)||!AVAILABILITY.includes(availability))return [];
      const capabilities=Array.isArray(row?.capabilities)?row.capabilities.map(String).filter(v=>CAPABILITIES.includes(v)):[];
      return [{provider,label:String(row?.label||PROVIDER_LABELS[provider]).slice(0,100),availability,auth_mode:provider==="GENERIC"?"APP_PASSWORD":String(row?.auth_mode||"OAUTH2"),capabilities,reason:row?.reason?String(row.reason).slice(0,100):null}];
    });
  }
  function safeAccountHint(value){const hint=String(value??"").trim();return !hint||!/[•*]/.test(hint)?null:hint.slice(0,180)}
  function normalizeConnection(body){
    if(body?.ok!==true)return null;
    const state=String(body.state||"").toUpperCase();if(!STATES.includes(state))return null;
    const provider=body.provider===null||body.provider===undefined?null:String(body.provider).toUpperCase();if(provider!==null&&!PROVIDERS.includes(provider))return null;
    return {provider,state,capabilities:Array.isArray(body.capabilities)?body.capabilities.map(String).filter(v=>CAPABILITIES.includes(v)):[],account_display_hint:safeAccountHint(body.account_display_hint),reauth_required:body.reauth_required===true,scope_required:body.scope_required===true};
  }
  function exactCapabilities(values){if(!Array.isArray(values))return null;const unique=[...new Set(values.map(String))];return !unique.length||unique.some(v=>!CAPABILITIES.includes(v))?null:unique}
  function buildConnectBody(provider,requestedCapabilities,generic=undefined){
    const p=String(provider||"").toUpperCase(),capabilities=exactCapabilities(requestedCapabilities);if(!PROVIDERS.includes(p)||!capabilities)return null;
    const body={provider:p,requested_capabilities:capabilities};if(p==="GENERIC"){if(!generic)return null;body.generic=generic}return body;
  }
  function buildGenericConfig(values){
    const providerKey=String(values?.provider_key||"").toUpperCase();if(!GENERIC_PROVIDER_KEYS.includes(providerKey)||String(values?.auth_mode||"").toUpperCase()!=="APP_PASSWORD"||values?.imap_tls!==true||values?.smtp_tls!==true)return null;
    const imapPort=Number(values?.imap_port),smtpPort=Number(values?.smtp_port);if(!Number.isInteger(imapPort)||imapPort<1||imapPort>65535||!Number.isInteger(smtpPort)||smtpPort<1||smtpPort>65535)return null;
    const imapHost=String(values?.imap_host||"").trim(),smtpHost=String(values?.smtp_host||"").trim(),username=String(values?.username||"").trim(),appPassword=String(values?.app_password||""),customLabel=String(values?.custom_provider_label||"").trim();
    if(!imapHost||!smtpHost||!username||appPassword.length<8||providerKey==="CUSTOM"&&!customLabel)return null;
    return {provider_key:providerKey,custom_provider_label:customLabel,auth_mode:"APP_PASSWORD",imap_host:imapHost,imap_port:imapPort,imap_tls:true,smtp_host:smtpHost,smtp_port:smtpPort,smtp_tls:true,username,app_password:appPassword};
  }
  function collectGenericCredentialInput(elements){
    const appPasswordInput=elements?.app_password,rawPassword=String(appPasswordInput?.value||"");if(appPasswordInput)appPasswordInput.value="";
    return buildGenericConfig({provider_key:elements?.provider_key?.value,custom_provider_label:elements?.custom_provider_label?.value,auth_mode:"APP_PASSWORD",imap_host:elements?.imap_host?.value,imap_port:elements?.imap_port?.value,imap_tls:elements?.imap_tls?.checked===true,smtp_host:elements?.smtp_host?.value,smtp_port:elements?.smtp_port?.value,smtp_tls:elements?.smtp_tls?.checked===true,username:elements?.username?.value,app_password:rawPassword});
  }
  function safeAuthorizationRedirect(provider,value){
    try{const url=new URL(String(value||""));if(url.protocol!=="https:"||provider==="GOOGLE"&&url.hostname!=="accounts.google.com"||provider==="MICROSOFT"&&url.hostname!=="login.microsoftonline.com")return null;return url.toString()}catch{return null}
  }
  async function listProviders(args){return gatewayRequest({...args,method:"GET",path:"/email/providers"})}
  async function getConnection(args){return gatewayRequest({...args,method:"GET",path:"/email/connection"})}
  async function connectEmail({base,token,provider,requestedCapabilities,generic,fetchImpl}){
    const body=buildConnectBody(provider,requestedCapabilities,generic);if(!body)return {ok:false,kind:"client_invalid",networkRequestMade:false,error:{code:"EMAIL_REQUEST_INVALID",...ERROR_MAP.EMAIL_REQUEST_INVALID}};
    const result=await gatewayRequest({base,token,method:"POST",path:"/email/connect",body,fetchImpl});if(!result.ok)return result;
    const redirect=result.data.authorization_redirect_url?safeAuthorizationRedirect(body.provider,result.data.authorization_redirect_url):null;
    if(result.data.authorization_redirect_url&&!redirect)return {ok:false,kind:"gateway_error",networkRequestMade:result.networkRequestMade,error:{code:"EMAIL_OAUTH_FAILED",...ERROR_MAP.EMAIL_OAUTH_FAILED,retryable:false}};
    return {...result,redirect};
  }
  async function reauthEmail({base,token,provider,requestedCapabilities,generic,fetchImpl}){
    const body=buildConnectBody(provider,requestedCapabilities,generic);if(!body)return {ok:false,kind:"client_invalid",networkRequestMade:false,error:{code:"EMAIL_REQUEST_INVALID",...ERROR_MAP.EMAIL_REQUEST_INVALID}};
    const result=await gatewayRequest({base,token,method:"POST",path:"/email/reauth",body,fetchImpl});if(!result.ok)return result;
    const redirect=result.data.authorization_redirect_url?safeAuthorizationRedirect(body.provider,result.data.authorization_redirect_url):null;
    if(result.data.authorization_redirect_url&&!redirect)return {ok:false,kind:"gateway_error",networkRequestMade:result.networkRequestMade,error:{code:"EMAIL_OAUTH_FAILED",...ERROR_MAP.EMAIL_OAUTH_FAILED,retryable:false}};
    return {...result,redirect};
  }
  async function disconnectLocal(args){return gatewayRequest({...args,method:"POST",path:"/email/disconnect",body:{mode:"LOCAL"}})}
  async function getOAuthStatus({base,token,provider,fetchImpl}){const p=String(provider||"").toUpperCase();return !["GOOGLE","MICROSOFT"].includes(p)?{ok:false,kind:"client_invalid",networkRequestMade:false,error:{code:"EMAIL_PROVIDER_NOT_SUPPORTED",...ERROR_MAP.EMAIL_PROVIDER_NOT_SUPPORTED}}:gatewayRequest({base,token,method:"GET",path:"/email/oauth/status",query:{provider:p},fetchImpl})}
  function parseOAuthReturn(urlLike){
    try{const url=new URL(String(urlLike),"https://nahwerkconcierge.com/konto.html"),result=String(url.searchParams.get("email_oauth")||"").toLowerCase(),provider=String(url.searchParams.get("provider")||"").toUpperCase(),flowRaw=String(url.searchParams.get("flow")||"").toUpperCase(),codeRaw=String(url.searchParams.get("code")||"");
      if(!["complete","failed"].includes(result)||!["GOOGLE","MICROSOFT"].includes(provider)||flowRaw&&!["CONNECT","REAUTH"].includes(flowRaw))return null;
      return {result,provider,flow:flowRaw||null,code:codeRaw&&/^[A-Z0-9_:-]{1,80}$/.test(codeRaw)?codeRaw:null,authoritative:false};
    }catch{return null}
  }
  function cleanOAuthQuery(urlLike,historyImpl){
    try{const url=new URL(String(urlLike),"https://nahwerkconcierge.com/konto.html"),keys=["email_oauth","provider","flow","code"],had=keys.some(key=>url.searchParams.has(key));if(!had)return false;keys.forEach(key=>url.searchParams.delete(key));historyImpl?.replaceState?.(null,"",url.pathname+(url.search||"")+(url.hash||""));return true}catch{return false}
  }
  async function processOAuthReturn({base,token,url,historyImpl,fetchImpl}){
    const parsed=parseOAuthReturn(url),queryRemoved=cleanOAuthQuery(url,historyImpl);if(!parsed)return {kind:"no_authoritative_oauth_return",queryRemoved,networkRequests:0};if(!base)return {kind:"runtime_inert",queryRemoved,parsed,networkRequests:0};if(!token)return {kind:"session_required",queryRemoved,parsed,networkRequests:0};
    const oauthStatus=await getOAuthStatus({base,token,provider:parsed.provider,fetchImpl}),connection=await getConnection({base,token,fetchImpl});return {kind:"server_synced",queryRemoved,parsed,oauthStatus,connection,networkRequests:2};
  }

  globalThis.NAHWERKEmailIntegrationTestHooks=Object.freeze({PLATFORM_CONTRACT,PLATFORM_CONTRACT_SHA,PREPARED_GATEWAY_PATH,runtimeGatewayBase:EMAIL_GATEWAY_BASE,PROVIDERS,CAPABILITIES,STATES,AVAILABILITY,GENERIC_PROVIDER_KEYS,ERROR_MAP,sessionToken,buildGatewayUrl,gatewayRequest,normalizeProviderList,normalizeConnection,buildConnectBody,buildGenericConfig,collectGenericCredentialInput,safeAuthorizationRedirect,listProviders,getConnection,connectEmail,reauthEmail,disconnectLocal,getOAuthStatus,parseOAuthReturn,cleanOAuthQuery,processOAuthReturn,normalizeError});

  if(typeof document==="undefined")return;
  const root=document.getElementById("accountEmailCard");if(!root)return;
  const providerButtons=[...root.querySelectorAll("[data-email-provider]")],capabilityInputs=[...root.querySelectorAll("[data-email-capability]")],providerStatus=Object.fromEntries(providerButtons.map(button=>[button.dataset.emailProvider,button.querySelector("[data-email-provider-status]")]));
  const statusBadge=document.getElementById("emailConnectionStatus"),stateTitle=document.getElementById("emailStateTitle"),stateMeta=document.getElementById("emailStateMeta"),accountHint=document.getElementById("emailAccountHint"),runtimeNote=document.getElementById("emailRuntimeNote"),connectButton=document.getElementById("emailConnectButton"),reauthButton=document.getElementById("emailReauthButton"),disconnectButton=document.getElementById("emailDisconnectButton"),retryButton=document.getElementById("emailRetryButton");
  const genericForm=document.getElementById("emailGenericForm"),genericProviderKey=document.getElementById("emailGenericProviderKey"),genericCustomLabel=document.getElementById("emailGenericCustomLabel"),genericCustomWrap=document.getElementById("emailGenericCustomWrap"),genericImapHost=document.getElementById("emailGenericImapHost"),genericImapPort=document.getElementById("emailGenericImapPort"),genericImapTls=document.getElementById("emailGenericImapTls"),genericSmtpHost=document.getElementById("emailGenericSmtpHost"),genericSmtpPort=document.getElementById("emailGenericSmtpPort"),genericSmtpTls=document.getElementById("emailGenericSmtpTls"),genericUsername=document.getElementById("emailGenericUsername"),genericAppPassword=document.getElementById("emailGenericAppPassword");

  let catalog=[],selectedProvider=null,currentConnection=null,lastError=null,loaded=false,loading=false,pendingOAuthReturn=parseOAuthReturn(globalThis.location?.href||"");
  try{const u=new URL(globalThis.location?.href||"","https://nahwerkconcierge.com/konto.html");if(["email_oauth","provider","flow","code"].some(key=>u.searchParams.has(key)))cleanOAuthQuery(globalThis.location?.href||"",globalThis.history)}catch{}
  const providerRow=key=>catalog.find(row=>row.provider===key)||null,providerIsAvailable=key=>providerRow(key)?.availability==="AVAILABLE",providerDisplay=key=>providerRow(key)?.label||PROVIDER_LABELS[key]||"E-Mail-Anbieter";
  function availabilityLabel(row){return !row?"Nicht serverseitig bestätigt":row.availability==="AVAILABLE"?"Verfügbar":row.availability==="CONFIGURATION_REQUIRED"?"Server-Konfiguration erforderlich":"Nicht verfügbar"}
  function setActionBusy(busy){[connectButton,reauthButton,disconnectButton,retryButton].forEach(button=>{if(button&&!button.hidden)button.disabled=busy})}
  function setProviderSelection(key){
    const row=providerRow(key);selectedProvider=row?.availability==="AVAILABLE"?row.provider:null;
    providerButtons.forEach(button=>{const selected=button.dataset.emailProvider===selectedProvider;button.setAttribute("aria-pressed",String(selected));button.classList.toggle("is-selected",selected)});
    capabilityInputs.forEach(input=>{const supported=selectedProvider?providerRow(selectedProvider)?.capabilities.includes(input.value)===true:false;input.disabled=!supported;if(!supported)input.checked=false;else if(!input.dataset.emailTouched)input.checked=true});
    genericForm.hidden=selectedProvider!=="GENERIC";connectButton.disabled=!selectedProvider||!EMAIL_GATEWAY_BASE;
  }
  function renderProviders(rows){catalog=rows;providerButtons.forEach(button=>{const key=button.dataset.emailProvider,row=providerRow(key),available=row?.availability==="AVAILABLE";button.disabled=!available;button.setAttribute("aria-disabled",String(!available));if(providerStatus[key])providerStatus[key].textContent=availabilityLabel(row)});if(selectedProvider&&!providerIsAvailable(selectedProvider))setProviderSelection(null)}
  function renderError(error){lastError=error||{code:"EMAIL_REQUEST_INVALID",...ERROR_MAP.EMAIL_REQUEST_INVALID};statusBadge.textContent="Fehler";stateTitle.textContent=lastError.message;stateMeta.textContent="Es werden keine internen Provider-Details angezeigt.";accountHint.textContent="";retryButton.hidden=lastError.retryable!==true;retryButton.disabled=!EMAIL_GATEWAY_BASE;connectButton.hidden=true;reauthButton.hidden=true;disconnectButton.hidden=true}
  function renderConnection(connection){
    currentConnection=connection;lastError=null;const state=connection.state;statusBadge.textContent={DISCONNECTED:"Nicht verbunden",CONNECTING:"Verbindung läuft",CONNECTED:"Verbunden",REAUTH_REQUIRED:"Erneute Verbindung nötig",SCOPE_REQUIRED:"Berechtigung erforderlich",ERROR:"Fehler",REVOKED:"Getrennt"}[state];accountHint.textContent=connection.account_display_hint||"";retryButton.hidden=true;connectButton.hidden=!["DISCONNECTED","REVOKED"].includes(state);reauthButton.hidden=!["REAUTH_REQUIRED","SCOPE_REQUIRED"].includes(state);disconnectButton.hidden=!["CONNECTED","REAUTH_REQUIRED","SCOPE_REQUIRED","ERROR"].includes(state);
    if(state==="DISCONNECTED"){stateTitle.textContent="E-Mail-Konto verbinden";stateMeta.textContent="Wählen Sie einen serverseitig verfügbaren Anbieter.";connectButton.textContent="E-Mail-Konto verbinden"}else if(state==="CONNECTING"){stateTitle.textContent="Verbindung läuft";stateMeta.textContent="Der Server bestätigt den endgültigen Verbindungsstatus."}else if(state==="CONNECTED"){stateTitle.textContent="Verbunden · "+providerDisplay(connection.provider);stateMeta.textContent="Diese Verbindung gehört zu Ihrer Person und steht demselben NAHWERK Core über Web, WhatsApp, Voice und App zur Verfügung."}else if(state==="REAUTH_REQUIRED"){stateTitle.textContent="Erneut verbinden";stateMeta.textContent="Der Server verlangt eine erneute Anmeldung beim E-Mail-Anbieter."}else if(state==="SCOPE_REQUIRED"){stateTitle.textContent="Zusätzliche Berechtigung erforderlich";stateMeta.textContent="Für die gewünschte Funktion benötigt der Server eine zusätzliche E-Mail-Berechtigung."}else if(state==="ERROR"){stateTitle.textContent="Verbindung konnte nicht abgeschlossen werden";stateMeta.textContent="Ein Retry wird nur nach einem explizit retrybaren Serverfehler angeboten."}else if(state==="REVOKED"){stateTitle.textContent="Getrennt";stateMeta.textContent="Das Konto kann über einen serverseitig verfügbaren Anbieter neu verbunden werden.";connectButton.textContent="Neu verbinden"}
  }
  function renderInert(){renderProviders([]);selectedProvider=null;currentConnection=null;statusBadge.textContent="PRE-PROD";stateTitle.textContent="Verbindung technisch vorbereitet, derzeit noch nicht verfügbar.";stateMeta.textContent="Der Platform-Gateway ist code-seitig vorbereitet, aber noch nicht als Website-Runtime deployed.";accountHint.textContent="";runtimeNote.textContent="Runtime inert · keine OAuth-Anmeldung, kein Provider-Login, kein Senden und kein Token-Revoke.";connectButton.hidden=false;connectButton.disabled=true;reauthButton.hidden=true;disconnectButton.hidden=true;retryButton.hidden=true;genericForm.hidden=true}
  function requestedCapabilities(){if(!selectedProvider)return [];const supported=new Set(providerRow(selectedProvider)?.capabilities||[]);return capabilityInputs.filter(input=>input.checked&&supported.has(input.value)).map(input=>input.value)}
  async function loadProviders(){const outcome=await listProviders({base:EMAIL_GATEWAY_BASE,token:sessionToken(),fetchImpl:globalThis.fetch});if(outcome.ok)renderProviders(normalizeProviderList(outcome.data));return outcome}
  async function loadConnection(){const outcome=await getConnection({base:EMAIL_GATEWAY_BASE,token:sessionToken(),fetchImpl:globalThis.fetch});if(!outcome.ok)return outcome;const normalized=normalizeConnection(outcome.data);if(!normalized)return {ok:false,kind:"gateway_error",error:{code:"EMAIL_REQUEST_INVALID",...ERROR_MAP.EMAIL_REQUEST_INVALID}};renderConnection(normalized);return {...outcome,connection:normalized}}
  async function activate(){
    if(loading)return;if(!EMAIL_GATEWAY_BASE){renderInert();loaded=true;pendingOAuthReturn=null;return}if(loaded&&!pendingOAuthReturn)return;loading=true;setActionBusy(true);
    try{const providers=await loadProviders();if(!providers.ok){renderError(providers.error);return}if(pendingOAuthReturn){const parsed=pendingOAuthReturn;pendingOAuthReturn=null;const oauthStatus=await getOAuthStatus({base:EMAIL_GATEWAY_BASE,token:sessionToken(),provider:parsed.provider,fetchImpl:globalThis.fetch}),connection=await loadConnection();if(!connection.ok)renderError(connection.error||oauthStatus.error);else if(!oauthStatus.ok&&oauthStatus.error)renderError(oauthStatus.error)}else{const connection=await loadConnection();if(!connection.ok)renderError(connection.error)}loaded=true}finally{loading=false;setActionBusy(false)}
  }
  providerButtons.forEach(button=>button.addEventListener("click",()=>setProviderSelection(button.dataset.emailProvider)));capabilityInputs.forEach(input=>input.addEventListener("change",()=>{input.dataset.emailTouched="true"}));genericProviderKey.addEventListener("change",()=>{genericCustomWrap.hidden=genericProviderKey.value!=="CUSTOM"});
  connectButton.addEventListener("click",async()=>{if(!selectedProvider||!providerIsAvailable(selectedProvider))return;let generic;if(selectedProvider==="GENERIC"){generic=collectGenericCredentialInput({provider_key:genericProviderKey,custom_provider_label:genericCustomLabel,imap_host:genericImapHost,imap_port:genericImapPort,imap_tls:genericImapTls,smtp_host:genericSmtpHost,smtp_port:genericSmtpPort,smtp_tls:genericSmtpTls,username:genericUsername,app_password:genericAppPassword});if(!generic){renderError({code:"EMAIL_GENERIC_CONFIGURATION_INVALID",...ERROR_MAP.EMAIL_GENERIC_CONFIGURATION_INVALID});return}}setActionBusy(true);const outcome=await connectEmail({base:EMAIL_GATEWAY_BASE,token:sessionToken(),provider:selectedProvider,requestedCapabilities:requestedCapabilities(),generic,fetchImpl:globalThis.fetch});setActionBusy(false);if(!outcome.ok){outcome.kind==="runtime_inert"?renderInert():renderError(outcome.error);return}if(outcome.redirect){globalThis.location.assign(outcome.redirect);return}const normalized=normalizeConnection({ok:true,provider:outcome.data.provider,state:outcome.data.state,capabilities:requestedCapabilities(),account_display_hint:null,reauth_required:false,scope_required:false});if(normalized)renderConnection(normalized)});
  reauthButton.addEventListener("click",async()=>{const provider=currentConnection?.provider;if(!provider)return;if(provider==="GENERIC"){setProviderSelection("GENERIC");genericForm.hidden=false;stateMeta.textContent="Für einen Generic-Reauth müssen die APP_PASSWORD-Daten erneut eingegeben werden. Es werden keine alten Zugangsdaten angezeigt.";return}setActionBusy(true);const outcome=await reauthEmail({base:EMAIL_GATEWAY_BASE,token:sessionToken(),provider,requestedCapabilities:currentConnection.capabilities.length?currentConnection.capabilities:CAPABILITIES,fetchImpl:globalThis.fetch});setActionBusy(false);if(!outcome.ok){outcome.kind==="runtime_inert"?renderInert():renderError(outcome.error);return}if(outcome.redirect)globalThis.location.assign(outcome.redirect)});
  disconnectButton.addEventListener("click",async()=>{setActionBusy(true);const outcome=await disconnectLocal({base:EMAIL_GATEWAY_BASE,token:sessionToken(),fetchImpl:globalThis.fetch});if(!outcome.ok){setActionBusy(false);outcome.kind==="runtime_inert"?renderInert():renderError(outcome.error);return}const refreshed=await loadConnection();if(!refreshed.ok)renderError(refreshed.error);setActionBusy(false)});
  retryButton.addEventListener("click",async()=>{if(lastError?.retryable!==true)return;loaded=false;await activate()});
  globalThis.NAHWERKEmailAccount=Object.freeze({activate});renderInert();const oauthTab=document.getElementById("accountTabEmail");if(pendingOAuthReturn&&oauthTab&&!oauthTab.disabled)oauthTab.click();
})();