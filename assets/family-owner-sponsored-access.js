(() => {
  const SESSION_KEY="scb_web_session";
  const PLATFORM_CONTRACT="family-owner-sponsored-access-v1";
  const PLATFORM_CONTRACT_SHA="e63d09682c9a919a9ab347ff27d197f2a3c10a18";
  const PREPARED_FAMILY_GATEWAY_BASE="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";
  const RUNTIME_CONFIG_ENDPOINT="/api/runtime-config";
  const PAGES_RUNTIME_CONFIG_ENDPOINT="/api/runtime-config.json";
  // Runtime safety boundary: deployment config is authoritative and defaults fail-closed.
  // GitHub Pages may fall back only when the serverless path is positively absent (404/405).
  let FAMILY_GATEWAY_BASE=null;
  let runtimeConfigPromise=null;
  function normalizeRuntimeGateway(value){
    if(typeof value!=="string")return null;
    const normalized=value.trim().replace(/\/+$/,"");
    return normalized===PREPARED_FAMILY_GATEWAY_BASE?normalized:null;
  }
  function runtimeConfigGateway(body){
    if(body?.ok!==true||body?.family_contract!==PLATFORM_CONTRACT||body?.platform_contract_sha!==PLATFORM_CONTRACT_SHA||body?.family_runtime_enabled!==true)return null;
    return normalizeRuntimeGateway(body.family_gateway_base);
  }
  function runtimeConfigFetchInit(){
    return {method:"GET",headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"};
  }
  async function readRuntimeConfig(fetchImpl,url){
    let response;
    try{
      response=await fetchImpl(url,runtimeConfigFetchInit());
    }catch{return {kind:"network_error",gateway:null}}
    if(response?.redirected===true)return {kind:"unsafe_response",gateway:null};
    if(response?.ok===true){
      const body=await response.json().catch(()=>null);
      return {kind:"response",gateway:runtimeConfigGateway(body)};
    }
    return {kind:"http_error",status:Number(response?.status)||0,gateway:null};
  }
  async function loadRuntimeGateway({fetchImpl=globalThis.fetch,configUrl=RUNTIME_CONFIG_ENDPOINT}={}){
    if(typeof fetchImpl!=="function")return null;
    const primary=await readRuntimeConfig(fetchImpl,configUrl);
    if(primary.kind==="response")return primary.gateway;
    if(configUrl!==RUNTIME_CONFIG_ENDPOINT||primary.kind!=="http_error"||![404,405].includes(primary.status))return null;
    const pages=await readRuntimeConfig(fetchImpl,PAGES_RUNTIME_CONFIG_ENDPOINT);
    return pages.kind==="response"?pages.gateway:null;
  }
  async function ensureRuntimeGateway(){
    if(FAMILY_GATEWAY_BASE)return FAMILY_GATEWAY_BASE;
    if(!runtimeConfigPromise)runtimeConfigPromise=loadRuntimeGateway();
    FAMILY_GATEWAY_BASE=await runtimeConfigPromise;
    return FAMILY_GATEWAY_BASE;
  }
  const PENDING_INVITE_KEY="nw_family_owner_invite_pending_v1";
  const INERT_MESSAGE="Diese Funktion wird derzeit vorbereitet.";
  const RELATIONSHIPS=Object.freeze({
    MOTHER:"Mutter",FATHER:"Vater",GRANDMOTHER:"Großmutter",GRANDFATHER:"Großvater",
    PARTNER:"Partner/in",RELATIVE:"Angehörige/r",OTHER:"Andere"
  });
  const LANGUAGE_LABELS=Object.freeze({de:"Deutsch",tr:"Türkisch",en:"Englisch",pl:"Polnisch",ar:"Arabisch",fr:"Französisch",es:"Spanisch"});
  const FEATURE_DEFS=Object.freeze([
    {code:"whatsapp_dialog",label:"WhatsApp-Dialoge",max:1000},
    {code:"app_dialog",label:"App-Dialoge",max:1000},
    {code:"web_research",label:"Recherchen",max:200},
    {code:"document_analysis",label:"Dokumente",max:100},
    {code:"image_analysis",label:"Bildanalysen",max:100},
    {code:"image_generation",label:"Bildgenerierungen",max:50},
    {code:"reminders",label:"Erinnerungen",max:200},
    {code:"concierge_execution",label:"Concierge-Ausführungen",max:100},
    {code:"phone_concierge",label:"Telefon-Minuten",max:600},
    {code:"voice_input",label:"Sprachmemo-Minuten",max:600}
  ]);
  const FEATURE_CODES=Object.freeze(FEATURE_DEFS.map((item)=>item.code));
  const INVITE_STATES=Object.freeze([
    "INVITE_CREATED","MESSAGE_PENDING","MESSAGE_SENT","AWAITING_ACCEPTANCE","ACCEPTED",
    "DECLINED","EXPIRED","REVOKED","SEND_UNCERTAIN","SEND_FAILED"
  ]);
  const ACCESS_STATES=Object.freeze(["ACTIVE","SUSPENDED","REVOKED"]);
  const STATE_LABELS=Object.freeze({
    INVITE_CREATED:"Einladung vorbereitet",
    MESSAGE_PENDING:"Versand wird vorbereitet",
    MESSAGE_SENT:"Einladung gesendet",
    AWAITING_ACCEPTANCE:"Wartet auf Bestätigung",
    ACCEPTED:"Aktiv",
    ACTIVE:"Aktiv",
    DECLINED:"Abgelehnt",
    EXPIRED:"Abgelaufen",
    REVOKED:"Widerrufen",
    SEND_UNCERTAIN:"Versand wird geprüft",
    SEND_FAILED:"Versand fehlgeschlagen",
    SUSPENDED:"Pausiert"
  });
  const FORBIDDEN_AUTHORITY_FIELDS=Object.freeze([
    "is_operator","role","operator_member_id","actor_person_id","customer_account_id",
    "customer_member_id","beneficiary_person_id","beneficiary_customer_account_id",
    "beneficiary_customer_member_id","accepted","state","source","customer_charge"
  ]);
  const INVITE_FIELDS=Object.freeze([
    "first_name","last_name","relationship","whatsapp_number","preferred_language",
    "concierge_choice","form_of_address","personal_message","contact_consent_attested","entitlements"
  ]);
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const IDEM_RE=/^[A-Za-z0-9._:-]{16,200}$/;

  function sessionToken(storage=globalThis.sessionStorage){
    try{const row=JSON.parse(storage?.getItem(SESSION_KEY)||"null");return row?.session_token?String(row.session_token):""}catch{return ""}
  }
  function operatorContextAllowed(body){
    return body?.ok===true&&body?.operator?.role==="OWNER"&&body?.operator?.can_manage_sponsored_people===true&&body?.browser_actor_authority===false;
  }
  function canManageEntitlements(body){return operatorContextAllowed(body)&&body?.operator?.can_manage_sponsored_entitlements===true}
  function normalizeLanguage(value){
    const raw=String(value??"").trim().replace(/_/g,"-");
    if(!raw||raw.length>35||!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(raw))return null;
    const parts=raw.split("-");
    return [parts[0].toLowerCase(),...parts.slice(1).map((part)=>part.length===2?part.toUpperCase():part)].join("-");
  }
  function plausiblePhone(value){
    const raw=String(value??"").trim();
    if(!raw||!/^[+0-9().\s/-]+$/.test(raw))return false;
    const digits=raw.replace(/\D/g,"");
    return digits.length>=8&&digits.length<=15;
  }
  function conciergeCatalogFrom(profiles){
    return Array.isArray(profiles)?profiles.flatMap((profile)=>{
      const key=String(profile?.key||"").trim(),name=String(profile?.name||"").trim();
      return key&&name?[{key,name}]:[];
    }):[];
  }
  function buildEntitlements(values){
    const source=values&&typeof values==="object"?values:{};
    const out=[];
    for(const code of FEATURE_CODES){
      const raw=source[code];
      const qty=typeof raw==="string"&&raw.trim()===""?NaN:Number(raw);
      if(!Number.isFinite(qty)||qty<0||!Number.isInteger(qty))return null;
      out.push({feature_code:code,included_quantity:qty});
    }
    return out;
  }
  function invitationPayload(input){
    const first=String(input?.first_name||"").trim(),last=String(input?.last_name||"").trim();
    const relationship=String(input?.relationship||"").toUpperCase();
    const language=normalizeLanguage(input?.preferred_language);
    const concierge=String(input?.concierge_choice||"").trim();
    const address=String(input?.form_of_address||"").toUpperCase();
    const message=String(input?.personal_message||"").trim().slice(0,1200);
    if(!first||!last||!Object.hasOwn(RELATIONSHIPS,relationship)||!plausiblePhone(input?.whatsapp_number))return null;
    if(!language||!concierge||!["DU","SIE"].includes(address)||input?.contact_consent_attested!==true)return null;
    if(!Array.isArray(input?.entitlements)||input.entitlements.some((item)=>!FEATURE_CODES.includes(String(item?.feature_code||""))||!Number.isFinite(Number(item?.included_quantity))||Number(item.included_quantity)<0))return null;
    return {
      first_name:first.slice(0,120),
      last_name:last.slice(0,120),
      relationship,
      whatsapp_number:String(input.whatsapp_number).trim(),
      preferred_language:language,
      concierge_choice:concierge.slice(0,120),
      form_of_address:address,
      personal_message:message,
      contact_consent_attested:true,
      entitlements:input.entitlements.map((item)=>({feature_code:String(item.feature_code),included_quantity:Number(item.included_quantity)}))
    };
  }
  function containsAuthorityFields(body){
    if(!body||typeof body!=="object")return false;
    return FORBIDDEN_AUTHORITY_FIELDS.some((key)=>Object.prototype.hasOwnProperty.call(body,key));
  }
  function stableJson(value){
    if(Array.isArray(value))return "["+value.map(stableJson).join(",")+"]";
    if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map((key)=>JSON.stringify(key)+":"+stableJson(value[key])).join(",")+"}";
    return JSON.stringify(value);
  }
  async function sha256(value,cryptoImpl=globalThis.crypto){
    if(!cryptoImpl?.subtle)throw new Error("crypto_unavailable");
    const digest=await cryptoImpl.subtle.digest("SHA-256",new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((b)=>b.toString(16).padStart(2,"0")).join("");
  }
  function newIdempotencyKey(cryptoImpl=globalThis.crypto){
    if(!cryptoImpl?.randomUUID)throw new Error("crypto_unavailable");
    return "nwfamily:"+cryptoImpl.randomUUID();
  }
  function readPending(storage){
    try{const row=JSON.parse(storage?.getItem(PENDING_INVITE_KEY)||"null");return row?.version===1&&IDEM_RE.test(String(row.key||""))&&typeof row.fingerprint==="string"?row:null}catch{return null}
  }
  async function pendingIdempotency(payload,storage,cryptoImpl=globalThis.crypto){
    if(!storage?.getItem||!storage?.setItem)throw new Error("idempotency_storage_unavailable");
    const fingerprint=await sha256(stableJson(payload),cryptoImpl),existing=readPending(storage);
    if(existing?.fingerprint===fingerprint)return {key:existing.key,fingerprint,reused:true};
    const key=newIdempotencyKey(cryptoImpl);
    storage.setItem(PENDING_INVITE_KEY,JSON.stringify({version:1,key,fingerprint}));
    return {key,fingerprint,reused:false};
  }
  function clearPending(storage,fingerprint,key){
    const row=readPending(storage);
    if(row?.fingerprint===fingerprint&&row?.key===key)storage?.removeItem(PENDING_INVITE_KEY);
  }
  function urlFor(base,path){
    if(!base)return null;
    return String(base).replace(/\/$/,"")+path;
  }
  async function request({base,token,path,method="GET",body=null,headers={},fetchImpl=globalThis.fetch}){
    if(!base)return {ok:false,kind:"runtime_inert",networkRequestMade:false,message:INERT_MESSAGE};
    if(!token)return {ok:false,kind:"session_required",networkRequestMade:false,message:"Bitte melde dich erneut an."};
    const requestHeaders={Authorization:"Bearer "+token,...headers};
    const init={method,headers:requestHeaders};
    if(method==="POST"||method==="PUT"){requestHeaders["Content-Type"]="application/json";init.body=JSON.stringify(body??{})}
    let response;
    try{response=await fetchImpl(urlFor(base,path),init)}catch{return {ok:false,kind:"endpoint_unavailable",networkRequestMade:true,message:INERT_MESSAGE}};
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.ok!==true)return {ok:false,kind:"server_error",networkRequestMade:true,httpStatus:response.status,message:"Die Anfrage konnte nicht sicher bestätigt werden."};
    return {ok:true,kind:"success",networkRequestMade:true,httpStatus:response.status,data};
  }
  async function getOperatorContext(args){return request({...args,path:"/operator/context"})}
  async function getManagedPeople(args){return request({...args,path:"/operator/managed-people"})}
  async function getInvitations(args){return request({...args,path:"/family/invitations"})}
  async function createInvitation({base,token,input,fetchImpl=globalThis.fetch,storage=globalThis.sessionStorage,cryptoImpl=globalThis.crypto}){
    if(!base)return {ok:false,kind:"runtime_inert",networkRequestMade:false,message:INERT_MESSAGE};
    const payload=invitationPayload(input);
    if(!payload||containsAuthorityFields(payload))return {ok:false,kind:"client_invalid",networkRequestMade:false,message:"Bitte prüfe die Angaben."};
    let pending;
    try{pending=await pendingIdempotency(payload,storage,cryptoImpl)}catch{return {ok:false,kind:"idempotency_unavailable",networkRequestMade:false,message:"Die sichere Wiederholungskennung konnte nicht erstellt werden."}}
    const result=await request({base,token,path:"/operator/managed-people/invitations",method:"POST",body:payload,headers:{"Idempotency-Key":pending.key},fetchImpl});
    if(!result.ok)return {...result,idempotencyKey:pending.key,retryUsesSameKey:true};
    const data=result.data;
    const canonical=(result.httpStatus===200||result.httpStatus===201)&&INVITE_STATES.includes(String(data?.state||""))&&data?.outbound?.provider_execution===false;
    if(!canonical)return {ok:false,kind:"invalid_server_confirmation",networkRequestMade:true,idempotencyKey:pending.key,retryUsesSameKey:true,message:"Die Einladung wurde nicht sicher bestätigt."};
    clearPending(storage,pending.fingerprint,pending.key);
    return {...result,kind:"invitation_confirmed",idempotencyKey:pending.key,state:data.state,duplicate:data.duplicate===true,outbound:data.outbound??null};
  }
  function safeManagedId(id){const value=String(id||"");return UUID_RE.test(value)?value:null}
  function managedPath(id,suffix){const safe=safeManagedId(id);return safe?"/operator/managed-people/"+encodeURIComponent(safe)+suffix:null}
  async function getEntitlements({base,token,id,fetchImpl=globalThis.fetch}){const path=managedPath(id,"/entitlements");return path?request({base,token,path,fetchImpl}):{ok:false,kind:"client_invalid",networkRequestMade:false}}
  async function getUsage({base,token,id,fetchImpl=globalThis.fetch}){const path=managedPath(id,"/usage");return path?request({base,token,path,fetchImpl}):{ok:false,kind:"client_invalid",networkRequestMade:false}}
  async function updateEntitlements({base,token,id,entitlements,fetchImpl=globalThis.fetch}){
    const path=managedPath(id,"/entitlements");
    if(!path||!Array.isArray(entitlements)||entitlements.some((item)=>!FEATURE_CODES.includes(String(item?.feature_code||""))||!Number.isInteger(Number(item?.included_quantity))||Number(item.included_quantity)<0))return {ok:false,kind:"client_invalid",networkRequestMade:false};
    return request({base,token,path,method:"PUT",body:{entitlements:entitlements.map((item)=>({feature_code:String(item.feature_code),included_quantity:Number(item.included_quantity)}))},fetchImpl});
  }
  async function transition({base,token,id,operation,fetchImpl=globalThis.fetch}){
    const op=String(operation||"").toLowerCase();
    if(!["suspend","resume","revoke"].includes(op))return {ok:false,kind:"client_invalid",networkRequestMade:false};
    const path=managedPath(id,"/"+op);
    return path?request({base,token,path,method:"POST",body:{},fetchImpl}):{ok:false,kind:"client_invalid",networkRequestMade:false};
  }
  async function revokeInvitation({base,token,id,fetchImpl=globalThis.fetch}){
    const safe=safeManagedId(id);
    const path=safe?"/family/invitations/"+encodeURIComponent(safe)+"/revoke":null;
    return path?request({base,token,path,method:"POST",body:{},fetchImpl}):{ok:false,kind:"client_invalid",networkRequestMade:false};
  }
  async function getActivationLink({base,token,id,fetchImpl=globalThis.fetch}){
    const safe=safeManagedId(id);
    const path=safe?"/family/invitations/"+encodeURIComponent(safe)+"/activation-link":null;
    return path?request({base,token,path,method:"POST",body:{},fetchImpl}):{ok:false,kind:"client_invalid",networkRequestMade:false};
  }
  function stateLabel(state){return STATE_LABELS[String(state||"").toUpperCase()]||"Status wird geprüft"}
  function relationLabel(value){return RELATIONSHIPS[String(value||"").toUpperCase()]||"Andere"}
  function languageLabel(value){const normalized=normalizeLanguage(value);return normalized?(LANGUAGE_LABELS[normalized]||normalized):"–"}
  function mergeServerPeople(managedBody,inviteBody){
    const managed=managedBody?.ok===true&&Array.isArray(managedBody.people)?managedBody.people:[];
    const invites=inviteBody?.ok===true&&Array.isArray(inviteBody.invitations)?inviteBody.invitations:[];
    const seen=new Set();
    const rows=managed.map((item)=>{
      const recipient=item?.recipient||{};
      if(recipient?.id)seen.add(String(recipient.id));
      return {kind:"managed",id:safeManagedId(item?.id),name:[recipient.first_name,recipient.last_name].filter(Boolean).join(" ").trim()||"Person",relationship:String(item?.relationship||recipient.relationship||"OTHER"),language:String(recipient.preferred_language||""),concierge:String(recipient.concierge_choice||""),status:String(item?.status||"").toUpperCase()};
    });
    for(const invite of invites){
      if(invite?.id&&seen.has(String(invite.id)))continue;
      rows.push({kind:"invitation",id:null,invitationId:safeManagedId(invite?.id),name:[invite?.first_name,invite?.last_name].filter(Boolean).join(" ").trim()||"Person",relationship:String(invite?.relationship||"OTHER"),language:String(invite?.preferred_language||""),concierge:String(invite?.concierge_choice||""),status:String(invite?.state||"").toUpperCase()});
    }
    return rows;
  }
  function usageRows(body){
    const rows=body?.ok===true&&Array.isArray(body.usage)?body.usage:[];
    const byCode=new Map(rows.map((row)=>[String(row.feature_code),row]));
    return FEATURE_DEFS.map((feature)=>{
      const row=byCode.get(feature.code);
      return {feature_code:feature.code,label:feature.label,granted:row?Math.max(0,Number(row.granted)||0):0,used:row?Math.max(0,Number(row.used)||0):0,remaining:row?Math.max(0,Number(row.remaining)||0):0};
    });
  }

  globalThis.NAHWERKFamilyOwnerTestHooks=Object.freeze({
    PLATFORM_CONTRACT,PLATFORM_CONTRACT_SHA,PREPARED_FAMILY_GATEWAY_BASE,RUNTIME_CONFIG_ENDPOINT,PAGES_RUNTIME_CONFIG_ENDPOINT,runtimeGatewayBase:FAMILY_GATEWAY_BASE,
    RELATIONSHIPS,LANGUAGE_LABELS,FEATURE_DEFS,FEATURE_CODES,INVITE_STATES,ACCESS_STATES,STATE_LABELS,
    FORBIDDEN_AUTHORITY_FIELDS,INVITE_FIELDS,INERT_MESSAGE,sessionToken,operatorContextAllowed,canManageEntitlements,
    normalizeLanguage,plausiblePhone,conciergeCatalogFrom,buildEntitlements,invitationPayload,containsAuthorityFields,
    runtimeConfigGateway,loadRuntimeGateway,getOperatorContext,getManagedPeople,getInvitations,createInvitation,getEntitlements,getUsage,updateEntitlements,
    transition,revokeInvitation,stateLabel,relationLabel,languageLabel,mergeServerPeople,usageRows,pendingIdempotency
  });

  if(typeof document==="undefined")return;
  const panel=document.getElementById("familyOwnerPanel");
  const accessTab=document.getElementById("accountTabAccess");
  if(!panel||!accessTab)return;
  const addButton=document.getElementById("familyPersonAddButton"),form=document.getElementById("familyPersonForm"),
    cancelButton=document.getElementById("familyPersonCancelButton"),formStatus=document.getElementById("familyPersonFormStatus"),
    ownerStatus=document.getElementById("familyOwnerStatus"),peopleList=document.getElementById("familyManagedPeopleList"),
    languageSelect=document.getElementById("familyPreferredLanguage"),customLanguageWrap=document.getElementById("familyCustomLanguageWrap"),
    customLanguage=document.getElementById("familyCustomLanguage"),conciergeSelect=document.getElementById("familyConciergeChoice"),
    consent=document.getElementById("familyContactConsent"),detail=document.getElementById("familyManagedDetail"),
    detailTitle=document.getElementById("familyManagedDetailTitle"),detailUsage=document.getElementById("familyManagedUsage"),
    detailQuota=document.getElementById("familyManagedQuotaGrid"),quotaSave=document.getElementById("familyManagedQuotaSave"),
    detailClose=document.getElementById("familyManagedDetailClose");
  let operatorBody=null,operatorResolved=false,currentManagedId=null,currentPeople=[];

  function setFormOpen(open){form.hidden=!open;addButton.setAttribute("aria-expanded",String(open));if(open)document.getElementById("familyFirstName")?.focus();else form.reset()}
  function setStatus(message,isError=false){formStatus.textContent=message||"";formStatus.classList.toggle("is-error",isError)}
  function renderInviteDelivery(outbound,container=formStatus){
    const route=String(outbound?.route||"");
    const activationLink=String(outbound?.activation_link||"");
    container.textContent="";
    container.classList.remove("is-error");
    const text=document.createElement("span");
    if(route==="DIRECT_PREMIUM"){
      text.textContent="Einladung wird über WhatsApp zugestellt.";
      container.append(text);return;
    }
    if(route!=="ACTIVATION_LINK"||!/^https:\/\/wa\.me\//i.test(activationLink)){
      text.textContent="Die Einladung wurde vorbereitet.";
      container.append(text);return;
    }
    text.textContent="Einladung über WhatsApp aktivieren. ";
    const open=document.createElement("a");
    open.href=activationLink;open.target="_blank";open.rel="noopener noreferrer";
    open.textContent="In WhatsApp bestätigen";
    const copy=document.createElement("button");
    copy.type="button";copy.className="btn light";copy.textContent="Link kopieren";
    copy.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(activationLink);copy.textContent="Kopiert"}catch{copy.textContent="Kopieren nicht möglich"}
    });
    container.append(text,open,document.createTextNode(" "),copy);
  }
  function populateConcierges(){
    const catalog=conciergeCatalogFrom(globalThis.NAHWERK_CONCIERGES);
    conciergeSelect.innerHTML='<option value="">Concierge auswählen</option>'+catalog.map((item)=>'<option value="'+item.key+'">'+item.name+'</option>').join("");
  }
  function quotaValuesFrom(container){
    const values={};
    container.querySelectorAll("[data-sponsored-feature]").forEach((input)=>{values[input.dataset.sponsoredFeature]=input.value});
    return values;
  }
  function selectedLanguage(){return languageSelect.value==="__custom__"?normalizeLanguage(customLanguage.value):normalizeLanguage(languageSelect.value)}
  function inputPayload(){
    const entitlements=buildEntitlements(quotaValuesFrom(form));
    return invitationPayload({
      first_name:document.getElementById("familyFirstName").value,
      last_name:document.getElementById("familyLastName").value,
      relationship:document.getElementById("familyRelationship").value,
      whatsapp_number:document.getElementById("familyWhatsappNumber").value,
      preferred_language:selectedLanguage(),
      concierge_choice:conciergeSelect.value,
      form_of_address:document.getElementById("familyFormOfAddress").value,
      personal_message:document.getElementById("familyPersonalMessage").value,
      contact_consent_attested:consent.checked,
      entitlements
    });
  }
  function visualStateDescription(state){
    const value=String(state||"").toUpperCase();
    const copy={
      INVITE_CREATED:"Die Einladung ist vorbereitet.",
      MESSAGE_PENDING:"Einladung wird für WhatsApp vorbereitet.",
      MESSAGE_SENT:"Die Nachricht wurde versendet.",
      AWAITING_ACCEPTANCE:"Die Einladung wartet auf Annahme.",
      ACCEPTED:"Die Einladung wurde angenommen.",
      ACTIVE:"Sponsored Access ist aktiv.",
      SUSPENDED:"Sponsored Access ist pausiert.",
      REVOKED:"Der Zugriff wurde widerrufen.",
      DECLINED:"Die Einladung wurde abgelehnt.",
      EXPIRED:"Die Einladung ist abgelaufen.",
      SEND_UNCERTAIN:"Der Versandstatus wird serverseitig geprüft.",
      SEND_FAILED:"Die Nachricht konnte nicht versendet werden."
    };
    return copy[value]||"Der Status wird serverseitig geprüft.";
  }
  function displayConcierge(value){
    const raw=String(value||"").trim();
    return raw?raw.charAt(0).toUpperCase()+raw.slice(1):"Concierge nicht gesetzt";
  }
  function renderPeople(rows){
    currentPeople=rows;
    if(!rows.length){peopleList.innerHTML='<div class="family-owner-empty">Noch keine serverseitig bestätigten unterstützten Personen oder Einladungen.</div>';return}
    peopleList.innerHTML="";
    rows.forEach((item,index)=>{
      const row=document.createElement("div");row.className="family-owner-person";row.dataset.familyState=item.status||"UNKNOWN";
      const main=document.createElement("div");main.className="family-owner-person-main";
      const headline=document.createElement("div");headline.className="family-owner-person-headline";
      const copy=document.createElement("div");copy.className="family-owner-person-copy";
      const title=document.createElement("strong");title.textContent=item.name;
      const meta=document.createElement("div");meta.className="family-owner-person-meta";
      [relationLabel(item.relationship),languageLabel(item.language),displayConcierge(item.concierge)].forEach((value)=>{
        const part=document.createElement("span");part.textContent=value;meta.append(part);
      });
      copy.append(title,meta);
      const status=document.createElement("span");status.className="family-owner-person-status";status.textContent=stateLabel(item.status);
      headline.append(copy,status);
      const stateCopy=document.createElement("p");stateCopy.className="family-owner-person-state-copy";stateCopy.textContent=visualStateDescription(item.status);
      main.append(headline,stateCopy);row.append(main);
      if(item.kind==="managed"&&item.id){
        const actions=document.createElement("div");actions.className="family-owner-row-actions";
        const manage=document.createElement("button");manage.type="button";manage.className="btn light";manage.textContent="Kontingente ansehen";manage.dataset.familyAction="manage";manage.dataset.familyIndex=String(index);actions.append(manage);
        if(item.status==="ACTIVE"){const suspend=document.createElement("button");suspend.type="button";suspend.className="btn light";suspend.textContent="Pausieren";suspend.dataset.familyAction="suspend";suspend.dataset.familyIndex=String(index);actions.append(suspend)}
        if(item.status==="SUSPENDED"){const resume=document.createElement("button");resume.type="button";resume.className="btn light";resume.textContent="Fortsetzen";resume.dataset.familyAction="resume";resume.dataset.familyIndex=String(index);actions.append(resume)}
        if(item.status!=="REVOKED"){const revoke=document.createElement("button");revoke.type="button";revoke.className="btn light";revoke.textContent="Sponsored Access beenden";revoke.dataset.familyAction="revoke";revoke.dataset.familyIndex=String(index);actions.append(revoke)}
        row.append(actions);
      }else if(item.kind==="invitation"&&item.invitationId&&!["ACCEPTED","DECLINED","EXPIRED","REVOKED"].includes(item.status)){
        const actions=document.createElement("div");actions.className="family-owner-row-actions";
        const activate=document.createElement("button");activate.type="button";activate.className="btn light";activate.textContent="Einladung über WhatsApp aktivieren";activate.dataset.familyAction="invite-activation";activate.dataset.familyIndex=String(index);actions.append(activate);
        const revokeInvite=document.createElement("button");revokeInvite.type="button";revokeInvite.className="btn light";revokeInvite.textContent="Einladung widerrufen";revokeInvite.dataset.familyAction="invite-revoke";revokeInvite.dataset.familyIndex=String(index);actions.append(revokeInvite);row.append(actions);
      }
      peopleList.append(row);
    });
  }
  async function loadPeople(){
    const token=sessionToken();
    const [managed,invites]=await Promise.all([
      getManagedPeople({base:FAMILY_GATEWAY_BASE,token,fetchImpl:globalThis.fetch}),
      getInvitations({base:FAMILY_GATEWAY_BASE,token,fetchImpl:globalThis.fetch})
    ]);
    if(!managed.ok||!invites.ok){peopleList.innerHTML='<div class="family-owner-empty">Die Personenliste konnte nicht sicher geladen werden.</div>';return false}
    renderPeople(mergeServerPeople(managed.data,invites.data));return true;
  }
  function renderDetailEntitlements(entitlements){
    const map=new Map((Array.isArray(entitlements)?entitlements:[]).map((row)=>[String(row.feature_code),Number(row.included_quantity)||0]));
    detailQuota.innerHTML=FEATURE_DEFS.map((feature)=>'<label class="family-quota-field"><span>'+feature.label+'</span><input type="number" min="0" max="'+feature.max+'" step="1" value="'+(map.get(feature.code)??0)+'" data-sponsored-feature="'+feature.code+'"></label>').join("");
    quotaSave.hidden=operatorBody?.operator?.can_manage_sponsored_entitlements!==true;
  }
  function renderUsage(body){
    detailUsage.innerHTML=usageRows(body).map((row)=>'<div class="family-usage-row"><strong>'+row.label+'</strong><span>Festgelegt '+row.granted+' · Verbraucht '+row.used+' · Verbleibend '+row.remaining+'</span></div>').join("");
  }
  async function openManaged(item){
    if(!item?.id)return;
    currentManagedId=item.id;detail.hidden=false;detailTitle.textContent=item.name+" · Kontingente & Nutzung";
    detailUsage.innerHTML='<div class="family-owner-empty">Nutzung wird geladen …</div>';
    detailQuota.innerHTML='<div class="family-owner-empty">Kontingente werden geladen …</div>';
    const token=sessionToken();
    const [ent,usage]=await Promise.all([
      getEntitlements({base:FAMILY_GATEWAY_BASE,token,id:item.id,fetchImpl:globalThis.fetch}),
      getUsage({base:FAMILY_GATEWAY_BASE,token,id:item.id,fetchImpl:globalThis.fetch})
    ]);
    if(!ent.ok||!usage.ok){detailUsage.innerHTML='<div class="family-owner-empty">Kontingente und Nutzung konnten nicht sicher geladen werden.</div>';detailQuota.innerHTML="";quotaSave.hidden=true;return}
    renderDetailEntitlements(ent.data.entitlements);renderUsage(usage.data);
  }
  async function doTransition(item,operation){
    if(!item?.id)return;
    if(operation==="revoke"&&!globalThis.confirm("Sponsored Access wirklich beenden? Die Person und ihre Inhalte werden dadurch nicht gelöscht."))return;
    ownerStatus.textContent="Änderung wird serverseitig geprüft …";
    const outcome=await transition({base:FAMILY_GATEWAY_BASE,token:sessionToken(),id:item.id,operation,fetchImpl:globalThis.fetch});
    if(!outcome.ok){ownerStatus.textContent=outcome.kind==="runtime_inert"?INERT_MESSAGE:"Die Änderung konnte nicht sicher bestätigt werden.";return}
    ownerStatus.textContent=operation==="revoke"?"Sponsored Access wurde serverseitig beendet. Person und Inhalte bleiben bestehen.":"Status serverseitig aktualisiert.";
    detail.hidden=true;currentManagedId=null;await loadPeople();
  }
  async function doInvitationRevoke(item){
    if(!item?.invitationId)return;
    if(!globalThis.confirm("Einladung wirklich widerrufen? Ein bereits bestehender eigener Zugang der Person wird dadurch nicht gelöscht."))return;
    ownerStatus.textContent="Widerruf wird serverseitig geprüft …";
    const outcome=await revokeInvitation({base:FAMILY_GATEWAY_BASE,token:sessionToken(),id:item.invitationId,fetchImpl:globalThis.fetch});
    if(!outcome.ok){ownerStatus.textContent=outcome.kind==="runtime_inert"?INERT_MESSAGE:"Die Einladung konnte nicht sicher widerrufen werden.";return}
    ownerStatus.textContent="Einladung serverseitig widerrufen.";await loadPeople();
  }
  async function doInvitationActivation(item){
    if(!item?.invitationId)return;
    ownerStatus.textContent="Einladungsweg wird vorbereitet …";
    const outcome=await getActivationLink({base:FAMILY_GATEWAY_BASE,token:sessionToken(),id:item.invitationId,fetchImpl:globalThis.fetch});
    if(!outcome.ok){ownerStatus.textContent=outcome.kind==="runtime_inert"?INERT_MESSAGE:"Der WhatsApp-Aktivierungslink konnte nicht sicher erstellt werden.";return}
    renderInviteDelivery(outcome.data?.outbound,ownerStatus);
  }
  async function probeOperator(){
    if(operatorResolved)return operatorBody;
    const runtimeBase=await ensureRuntimeGateway();
    panel.dataset.familyRuntime=runtimeBase?"configured":"inert";
    if(!runtimeBase){operatorResolved=true;panel.hidden=true;return null}
    const result=await getOperatorContext({base:runtimeBase,token:sessionToken(),fetchImpl:globalThis.fetch});
    operatorResolved=true;
    if(!result.ok||!operatorContextAllowed(result.data)){panel.hidden=true;return null}
    operatorBody=result.data;panel.hidden=false;
    document.getElementById("familyQuotaSection").hidden=!canManageEntitlements(operatorBody);
    ownerStatus.textContent=canManageEntitlements(operatorBody)?"OWNER bestätigt · Personen und Kontingente autorisiert":"OWNER bestätigt · Kontingentverwaltung nicht freigegeben";
    await loadPeople();return operatorBody;
  }

  languageSelect.addEventListener("change",()=>{customLanguageWrap.hidden=languageSelect.value!=="__custom__"});
  addButton.addEventListener("click",()=>setFormOpen(form.hidden));
  cancelButton.addEventListener("click",()=>{setFormOpen(false);setStatus("")});
  form.addEventListener("submit",async(event)=>{
    event.preventDefault();setStatus("");
    if(!form.reportValidity())return;
    const payload=inputPayload();
    if(!payload){setStatus("Bitte prüfe Pflichtfelder, WhatsApp-Nummer, Sprache, Concierge, Anrede und Kontingente.",true);return}
    const submit=document.getElementById("familyPersonSubmit");submit.disabled=true;
    const outcome=await createInvitation({base:FAMILY_GATEWAY_BASE,token:sessionToken(),input:payload,fetchImpl:globalThis.fetch,storage:globalThis.sessionStorage,cryptoImpl:globalThis.crypto});
    submit.disabled=false;
    if(!outcome.ok){setStatus(outcome.kind==="runtime_inert"?INERT_MESSAGE:"Die Einladung konnte nicht sicher bestätigt werden. Es wurde kein lokaler Erfolgsstatus erzeugt.",true);return}
    renderInviteDelivery(outcome.outbound);
    setFormOpen(false);await loadPeople();
  });
  peopleList.addEventListener("click",async(event)=>{
    const button=event.target.closest("[data-family-action]");if(!button)return;
    const item=currentPeople[Number(button.dataset.familyIndex)];if(!item)return;
    const action=button.dataset.familyAction;if(action==="manage")await openManaged(item);else if(action==="invite-revoke")await doInvitationRevoke(item);else if(action==="invite-activation")await doInvitationActivation(item);else await doTransition(item,action);
  });
  quotaSave.addEventListener("click",async()=>{
    if(!currentManagedId||!canManageEntitlements(operatorBody))return;
    const entitlements=buildEntitlements(quotaValuesFrom(detailQuota));
    if(!entitlements){ownerStatus.textContent="Bitte nur ganze Kontingentwerte ab 0 verwenden.";return}
    quotaSave.disabled=true;
    const outcome=await updateEntitlements({base:FAMILY_GATEWAY_BASE,token:sessionToken(),id:currentManagedId,entitlements,fetchImpl:globalThis.fetch});
    quotaSave.disabled=false;
    if(!outcome.ok){ownerStatus.textContent=outcome.kind==="runtime_inert"?INERT_MESSAGE:"Kontingente konnten nicht sicher gespeichert werden.";return}
    ownerStatus.textContent="Kontingente serverseitig aktualisiert.";const item=currentPeople.find((row)=>row.id===currentManagedId);if(item)await openManaged(item);
  });
  detailClose.addEventListener("click",()=>{detail.hidden=true;currentManagedId=null});
  accessTab.addEventListener("click",()=>{if(!operatorResolved)void probeOperator()});
  populateConcierges();
  void probeOperator();
})();