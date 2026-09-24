(() => {
  "use strict";
  const root=document.getElementById("accountCockpit");
  if(!root)return;

  const GATEWAY="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  const SAFETY="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-managed-safety-context";
  const CONTEXT_KEY="nw_selected_account_context_v1";
  const COMPLETED=new Set(["COMPLETED","DONE","SUCCESS","SUCCEEDED","RESOLVED"]);
  const CANCELLED=new Set(["CANCELLED","CANCELED"]);
  const portraits=new Set(["camille","frida","hartmut","jabari","lena","leyla","lukas","mira","nilo","olena","sofia","zuri"]);

  const $=(id)=>document.getElementById(id);
  const token=()=>{
    try{return String(JSON.parse(sessionStorage.getItem("scb_web_session")||"null")?.session_token||"");}
    catch(_){return "";}
  };
  const context=()=>{
    try{return JSON.parse(sessionStorage.getItem(CONTEXT_KEY)||"null");}
    catch(_){return null;}
  };
  const managed=()=>context()?.is_self===false;
  const esc=(s)=>String(s??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function openTab(tab){
    const button=document.querySelector('[data-account-tab="'+tab+'"]');
    if(button instanceof HTMLElement)button.click();
  }
  root.querySelectorAll("[data-cockpit-open-tab]").forEach((el)=>{
    el.addEventListener("click",()=>openTab(el.getAttribute("data-cockpit-open-tab")));
  });

  function text(id,value){
    const el=$(id);
    if(!el)return;
    const next=String(value??"");
    if(el.textContent!==next)el.textContent=next;
  }
  function copyLegacy(){
    const ctx=context();
    const profileFirst=String($("profileFirstName")?.value||"").trim();
    const sessionFirst=(()=>{
      try{return String(JSON.parse(sessionStorage.getItem("scb_web_session")||"null")?.first_name||"").trim();}
      catch(_){return "";}
    })();
    const first=profileFirst||sessionFirst;
    if(first)text("cockpitGreetingName",first);
    if(ctx?.is_self===false){
      const name=String(ctx.display_name||"").trim()||"verwaltetes Profil";
      text("cockpitProfileContext","Du verwaltest gerade: "+name);
    }else{
      text("cockpitProfileContext","Dein persönlicher NAHWERK Bereich.");
    }

    const plan=String($("planName")?.textContent||"").trim();
    if(plan&& !/wird geladen/i.test(plan)){
      text("cockpitPlanBadge",plan);
      text("cockpitPlanDetail",plan);
    }
    const planMeta=String($("planMeta")?.textContent||"").trim();
    if(planMeta)text("cockpitPlanMeta",planMeta);

    const usage=String($("overviewUsage")?.textContent||"").trim();
    if(usage&&!/keine live-daten/i.test(usage))text("cockpitUsageMetric",usage);

    const safety=String($("overviewSafety")?.textContent||"").trim();
    const safetyMeta=String($("overviewSafetyMeta")?.textContent||"").trim();
    if(safety&&!/safety & betrugsschutz/i.test(safety))text("cockpitSafetyMetric",safety);
    if(safetyMeta&&!/schutzfunktionen/i.test(safetyMeta))text("cockpitSafetyMeta",safetyMeta);

    const number=String($("customerNumber")?.textContent||"").trim();
    if(number&&!/wird geladen/i.test(number))text("cockpitCustomerNumber",number);

    const home=String($("profileHomeAddress")?.value||"").trim();
    const email=String($("profileEmail")?.value||"").trim();
    const wa=String($("profileWhatsapp")?.value||"").trim();
    text("cockpitSavedHome",home?"Hinterlegt":"Nicht hinterlegt");
    text("cockpitSavedEmail",email?"Hinterlegt":"Nicht hinterlegt");
    text("cockpitSavedWhatsapp",wa?"Verbunden":"Optional");

    const emailStatus=String($("emailConnectionStatus")?.textContent||"").trim();
    if(emailStatus){
      const normalized=/verbunden|connected|active/i.test(emailStatus)?"Verbunden":(/pre-prod|nicht|unavailable|getrennt/i.test(emailStatus)?"Nicht verbunden":emailStatus);
      text("cockpitChannelEmail",normalized);
    }
  }

  function watchLegacy(){
    const ids=["planName","planMeta","overviewUsage","overviewSafety","overviewSafetyMeta","customerNumber","profileHomeAddress","profileEmail","profileWhatsapp","emailConnectionStatus"];
    ids.forEach((id)=>{
      const el=$(id);if(!el)return;
      new MutationObserver(copyLegacy).observe(el,{subtree:true,childList:true,characterData:true,attributes:true});
      el.addEventListener?.("input",copyLegacy);
      el.addEventListener?.("change",copyLegacy);
    });
    const profileFirstName=$("profileFirstName");
    profileFirstName?.addEventListener("input",copyLegacy);
    profileFirstName?.addEventListener("change",copyLegacy);
    const select=$("personContextSelect");
    select?.addEventListener("change",()=>setTimeout(()=>{copyLegacy();load();},0));
    window.addEventListener("pageshow",copyLegacy);
  }

  function friendlyStatus(status){
    const s=String(status||"").toUpperCase();
    if(s==="ACTIVE")return "In Bearbeitung";
    if(s==="PAUSED")return "Pausiert";
    if(s==="WAITING_APPROVAL"||s==="PENDING_APPROVAL")return "Wartet auf Freigabe";
    if(COMPLETED.has(s))return "Erledigt";
    return s?s.replaceAll("_"," "):"Offen";
  }
  function taskTitle(task){
    return String(task?.title||task?.objective||task?.topic_key||"Anliegen").trim().slice(0,160);
  }
  function timeLabel(value){
    const d=new Date(value);
    if(!Number.isFinite(d.getTime()))return "";
    const now=new Date();
    const same=now.getFullYear()===d.getFullYear()&&now.getMonth()===d.getMonth()&&now.getDate()===d.getDate();
    return same
      ?"Heute, "+new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(d)
      :new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d);
  }
  function renderTasks(body){
    const openBox=$("cockpitOpenItems");
    const doneBox=$("cockpitRecentItems");
    if(!openBox||!doneBox)return;
    const tasks=Array.isArray(body?.task_stack)?body.task_stack:[];
    const approval=body?.pending_approval||null;

    const open=tasks.filter((t)=>{
      const s=String(t?.status||"").toUpperCase();
      return !COMPLETED.has(s)&&!CANCELLED.has(s);
    }).slice(0,4);
    const done=tasks.filter((t)=>COMPLETED.has(String(t?.status||"").toUpperCase()))
      .sort((a,b)=>Date.parse(String(b?.updated_at||0))-Date.parse(String(a?.updated_at||0)))
      .slice(0,5);

    if(open.length){
      openBox.innerHTML=open.map((t)=>{
        const waiting=approval&&String(approval.task_id||"")===String(t.task_id||"");
        const state=waiting?"Wartet auf dich":friendlyStatus(t.status);
        return '<div class="cockpit-list-item"><div><strong>'+esc(taskTitle(t))+'</strong><small>'+esc(timeLabel(t.updated_at))+'</small></div><span class="cockpit-state">'+esc(state)+'</span></div>';
      }).join("");
    }else{
      openBox.innerHTML='<div class="cockpit-empty">Keine offenen Anliegen.</div>';
    }

    if(done.length){
      doneBox.innerHTML=done.map((t)=>'<div class="cockpit-list-item"><div><strong>'+esc(taskTitle(t))+'</strong><small>'+esc(timeLabel(t.updated_at))+'</small></div><span class="cockpit-state">Erledigt</span></div>').join("");
    }else{
      doneBox.innerHTML='<div class="cockpit-empty">Noch keine erledigten Anliegen in der aktuellen Concierge-Historie.</div>';
    }
  }
  function renderTasksUnavailable(message){
    const copy='<div class="cockpit-empty">'+esc(message)+'</div>';
    if($("cockpitOpenItems"))$("cockpitOpenItems").innerHTML=copy;
    if($("cockpitRecentItems"))$("cockpitRecentItems").innerHTML=copy;
  }

  function setPersona(persona,conversation){
    const name=String(persona?.display_name||"").trim();
    const key=String(persona?.persona_key||name).trim().toLowerCase().replace(/[^a-z]/g,"");
    if(name){
      text("cockpitConciergeName",name+" — NAHWERK Concierge");
      const legacy=$("overviewConcierge");
      if(legacy){
        legacy.textContent=name;
        legacy.dataset.personaSource="central";
        let avatar=legacy.closest(".account-overview-link")?.querySelector("[data-overview-concierge-avatar]");
        if(!avatar&&legacy.closest(".account-overview-link")){
          avatar=document.createElement("span");
          avatar.setAttribute("data-overview-concierge-avatar","");
          avatar.hidden=true;
          legacy.closest(".account-overview-link").appendChild(avatar);
        }
        if(avatar)avatar.style.backgroundImage=portraitFor(key,name);
      }
    }
    const portrait=portraitFor(key,name);
    if($("cockpitConciergeAvatar"))$("cockpitConciergeAvatar").style.backgroundImage=portrait;
    const language=String(persona?.language||"").toLowerCase();
    if(language)text("cockpitSavedLanguage",languageLabel(language));
    const last=conversation?.updated_at?timeLabel(conversation.updated_at):"";
    text("cockpitConciergeLast",last?"Zuletzt "+last:"Noch kein Gespräch");
  }
  function portraitFor(key,name){
    let k=key;
    if(!portraits.has(k)){
      const byName=String(name||"").trim().toLowerCase().replace(/[^a-z]/g,"");
      if(portraits.has(byName))k=byName;
    }
    return portraits.has(k)
      ?'url("/assets/concierges/card/'+k+'.webp")'
      :'url("/assets/logos/NAHWERK-Goldmann-Logo.svg")';
  }
  function languageLabel(code){
    const map={de:"Deutsch",en:"Englisch",tr:"Türkisch",es:"Spanisch",fr:"Französisch",it:"Italienisch",pt:"Portugiesisch",pl:"Polnisch",ru:"Russisch",uk:"Ukrainisch",ar:"Arabisch"};
    return map[code]||code.toUpperCase();
  }

  async function fetchJson(url){
    const t=token();if(!t)throw new Error("session_missing");
    const res=await fetch(url,{headers:{Authorization:"Bearer "+t},signal:AbortSignal.timeout(7000)});
    const body=await res.json().catch(()=>({}));
    if(!res.ok||body?.ok===false)throw new Error(String(body?.error||body?.status||"request_failed"));
    return body;
  }

  async function loadRuntime(){
    if(managed()){
      renderTasksUnavailable("Anliegen der verwalteten Person werden hier erst angezeigt, sobald der zentrale Task-Stack für verwaltete Profile freigegeben ist.");
      text("cockpitConciergeLast","Verwaltetes Profil");
      return;
    }
    try{
      const body=await fetchJson(GATEWAY+"/web/me");
      renderTasks(body);
      setPersona(body?.persona||{},body?.conversation||null);
    }catch(_){
      renderTasksUnavailable("Die aktuellen Anliegen konnten gerade nicht geladen werden.");
    }
  }

  async function loadSafety(){
    try{
      const ctx=context();
      const q=ctx?.is_self===false&&ctx?.customer_account_id
        ?"?customer_account_id="+encodeURIComponent(String(ctx.customer_account_id))
        :"";
      const body=await fetchJson(SAFETY+q);
      const s=body?.safety||{};
      if(s.enabled===true){
        text("cockpitSafetyMetric","Alles in Ordnung ✓");
        text("cockpitSafetyMeta",s.next_checkin_at?"Nächster Check-in: "+timeLabel(s.next_checkin_at):"Safety ist aktiviert.");
      }else{
        text("cockpitSafetyMetric","Safety nicht aktiviert");
        text("cockpitSafetyMeta","Du kannst Safety jederzeit aktivieren.");
      }
    }catch(_){
      text("cockpitSafetyMetric","Safety-Status nicht verfügbar");
      text("cockpitSafetyMeta","Öffne Safety für Details.");
    }
  }

  async function loadChannels(){
    text("cockpitChannelApp","Verfügbar");
    if(managed()){
      text("cockpitChannelWhatsapp","Profilbezogen");
      text("cockpitChannelPhone","Profilbezogen");
      text("cockpitChannelEmail","Profilbezogen");
      return;
    }
    try{
      const wa=await fetchJson(GATEWAY+"/web/channel-history?channel=WHATSAPP&summary=1");
      text("cockpitChannelWhatsapp",wa?.whatsapp_number?"Verbunden":"Optional");
    }catch(_){text("cockpitChannelWhatsapp","Nicht verfügbar");}
    try{
      const phone=await fetchJson(GATEWAY+"/web/channel-history?channel=PHONE&summary=1");
      text("cockpitChannelPhone",phone?.has_calls?"Bereits genutzt":"Verfügbar");
    }catch(_){text("cockpitChannelPhone","Nicht verfügbar");}
    copyLegacy();
  }

  function copyNumber(){
    const value=String($("cockpitCustomerNumber")?.textContent||"").trim();
    if(!value||/nicht|wird/i.test(value))return;
    navigator.clipboard?.writeText(value).then(()=>{
      const btn=$("cockpitCopyCustomerNumber");
      if(!btn)return;
      const old=btn.textContent;
      btn.textContent="Kopiert";
      setTimeout(()=>btn.textContent=old,1200);
    }).catch(()=>{});
  }
  $("cockpitCopyCustomerNumber")?.addEventListener("click",copyNumber);

  async function load(){
    copyLegacy();
    await Promise.allSettled([loadRuntime(),loadSafety(),loadChannels()]);
    copyLegacy();
  }
  watchLegacy();
  copyLegacy();
  setTimeout(load,50);
})();