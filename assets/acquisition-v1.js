(() => {
  const PENDING_KEY="nw_activation_pending_v1", COMPLETE_KEY="nw_activation_complete_v1";
  const PROFILE_URL="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-profile";
  const SESSION_KEY="scb_web_session";
  const locale=(()=>{
    const first=location.pathname.split("/").filter(Boolean)[0];
    if(first==="en"||first==="tr")return first;
    const query=new URLSearchParams(location.search).get("lang");
    if(query==="en"||query==="tr")return query;
    try{const stored=localStorage.getItem("nw_language");if(stored==="en"||stored==="tr")return stored}catch(_){}
    return "de";
  })();
  const JOURNEY_COPY={
    de:{
      aria:"In drei Schritten zum kostenlosen Einstieg",
      oneTitle:"Kostenlos registrieren",
      oneBody:"Lernen Sie NAHWERK kostenlos kennen: chatten, Fragen stellen, Aufgaben vorbereiten und eine echte Concierge-Ausführung ausprobieren. Keine Zahlungsdaten erforderlich. Kein automatisches Upgrade. Danach können Sie Guthaben schon ab 5 € online aufladen.",
      limits:"FREE: bis zu 50 App-Dialoge / Monat · bis zu 20 WhatsApp-Dialoge / Monat · 1 echte Concierge-Ausführung.",
      twoTitle:"Aufgabe übergeben",
      twoBody:"Zum Beispiel einen Hautarzt finden, passende Optionen vergleichen oder den nächsten Schritt organisieren lassen.",
      threeTitle:"NAHWERK bleibt dran",
      threeBody:"NAHWERK recherchiert, organisiert, fragt bei nötigen Entscheidungen nach und meldet Ergebnis oder nächsten Schritt zurück."
    },
    en:{
      aria:"Three steps to get started for free",
      oneTitle:"Register for free",
      oneBody:"Get to know NAHWERK for free: chat, ask questions, prepare tasks and try one real Concierge execution. No payment details required. No automatic upgrade. Afterwards, you can top up credit online from €5.",
      limits:"FREE: up to 50 app conversations / month · up to 20 WhatsApp conversations / month · 1 real Concierge execution.",
      twoTitle:"Hand over a task",
      twoBody:"For example, find a dermatologist, compare suitable options or have the next step organised.",
      threeTitle:"NAHWERK stays on it",
      threeBody:"NAHWERK researches, organises, asks for approval when a decision is needed and reports back with the result or next step."
    },
    tr:{
      aria:"Ücretsiz başlangıç için üç adım",
      oneTitle:"Ücretsiz kayıt ol",
      oneBody:"NAHWERK'i ücretsiz deneyin: sohbet edin, sorular sorun, görevleri hazırlayın ve gerçek bir Concierge işlemini deneyin. Ödeme bilgisi gerekmez. Otomatik yükseltme yoktur. Sonrasında çevrim içi olarak 5 €'dan başlayan bakiye yükleyebilirsiniz.",
      limits:"FREE: ayda en fazla 50 uygulama görüşmesi · ayda en fazla 20 WhatsApp görüşmesi · 1 gerçek Concierge işlemi.",
      twoTitle:"Bir görev verin",
      twoBody:"Örneğin bir dermatolog bulun, uygun seçenekleri karşılaştırın veya sonraki adımı organize ettirin.",
      threeTitle:"NAHWERK takipte kalır",
      threeBody:"NAHWERK araştırır, organize eder, gerekli kararlarda onay ister ve sonucu ya da sonraki adımı size bildirir."
    }
  };
  const journeyCopy=JOURNEY_COPY[locale]||JOURNEY_COPY.de;
  // FUTURE COPY — erst nach produktiver Verfügbarkeit im UI aktivieren: „Guthabenkarten ab 10 € im Handel erhältlich.“
  const safeToken=(v,max=64)=>String(v||"").toLowerCase().replace(/[^a-z0-9_:-]+/g,"_").slice(0,max).replace(/^_+|_+$/g,"");
  const track=(name,step)=>window.NahwerkAnalytics?.track?.(name,{funnel_name:"activation",funnel_step:safeToken(step)});
  const usageOf=(usage)=>({app:Math.max(0,Number(usage?.app_dialogues_used||0)||0),whatsapp:Math.max(0,Number(usage?.whatsapp_dialogues_used||0)||0)});
  const readPending=()=>{try{const raw=localStorage.getItem(PENDING_KEY);if(!raw)return null;if(raw==="1")return{registered_at:0,baseline:null};const value=JSON.parse(raw);return value&&typeof value==="object"?value:null}catch(_){return null}};
  const writePending=(state)=>{try{localStorage.setItem(PENDING_KEY,JSON.stringify(state));return true}catch(_){return false}};
  const pending=()=>Boolean(readPending());
  const complete=()=>{try{return localStorage.getItem(COMPLETE_KEY)==="1"}catch(_){return false}};
  function markRegistrationComplete(){
    writePending({registered_at:Date.now(),baseline:null,baseline_at:null});
    try{localStorage.removeItem(COMPLETE_KEY)}catch(_){}
    void track("funnel_step","registration_complete");
  }
  function seedBaseline(usage,source="profile"){
    if(complete())return false;
    const state=readPending();
    if(!state||state.baseline)return false;
    state.baseline=usageOf(usage);
    state.baseline_at=Date.now();
    if(!writePending(state))return false;
    void track("funnel_step","activation_baseline_"+safeToken(source,24));
    return true;
  }
  function observeUsage(usage){
    if(complete())return false;
    const state=readPending();
    if(!state)return false;
    const current=usageOf(usage);
    if(!state.baseline){
      seedBaseline(current,"fallback");
      return false;
    }
    const baseline=usageOf({app_dialogues_used:state.baseline.app,whatsapp_dialogues_used:state.baseline.whatsapp});
    if(current.app>baseline.app||current.whatsapp>baseline.whatsapp){
      try{localStorage.setItem(COMPLETE_KEY,"1");localStorage.removeItem(PENDING_KEY)}catch(_){}
      void track("funnel_complete","first_task_success");
      return true;
    }
    if(current.app<baseline.app||current.whatsapp<baseline.whatsapp){
      state.baseline={
        app:current.app<baseline.app?current.app:baseline.app,
        whatsapp:current.whatsapp<baseline.whatsapp?current.whatsapp:baseline.whatsapp
      };
      state.baseline_at=Date.now();
      writePending(state);
      void track("funnel_step","activation_counter_reset");
    }
    return false;
  }
  async function seedBaselineFromProfile(){
    if(!pending()||complete()||readPending()?.baseline)return false;
    let session=null;
    try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")}catch(_){}
    const token=String(session?.session_token||"");
    if(!token)return false;
    try{
      const response=await fetch(PROFILE_URL,{method:"GET",headers:{Authorization:"Bearer "+token}});
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body?.ok!==true||!body?.usage)return false;
      return seedBaseline(body.usage,"profile");
    }catch(_){return false}
  }
  function experiment(){
    try{
      const b=new Uint8Array(1);
      crypto.getRandomValues(b);
      const v=(b[0]%2===0)?"control":"clarity";
      document.documentElement.dataset.nwGrowthVariant=v;
      void track("funnel_step","experiment_home_value_"+v);
      return v;
    }catch(_){return"control"}
  }
  function syncFreeEntryJourney(){
    let grid=document.querySelector(".nw-journey-grid");
    if(!grid){
      const conversion=document.querySelector('.story-final[data-story-step="6"] .story-shell');
      if(!conversion)return false;
      grid=document.createElement("div");
      grid.className="nw-journey-grid";
      const actions=conversion.querySelector(".story-actions");
      conversion.insertBefore(grid,actions||null);
    }
    grid.setAttribute("aria-label",journeyCopy.aria);
    grid.innerHTML=`<article class="nw-journey-card"><span>01</span><h3>${journeyCopy.oneTitle}</h3><p>${journeyCopy.oneBody}</p><p class="nw-free-limits">${journeyCopy.limits}</p></article><article class="nw-journey-card"><span>02</span><h3>${journeyCopy.twoTitle}</h3><p>${journeyCopy.twoBody}</p></article><article class="nw-journey-card"><span>03</span><h3>${journeyCopy.threeTitle}</h3><p>${journeyCopy.threeBody}</p></article>`;
    return true;
  }
  document.addEventListener("click",(event)=>{
    const cta=event.target.closest?.("[data-nw-cta]");
    if(cta)void window.NahwerkAnalytics?.track?.("cta_click",{funnel_name:"activation",funnel_step:safeToken(cta.dataset.nwStep||cta.dataset.nwCta)});
    const task=event.target.closest?.("[data-nw-task]");
    if(task){
      const value=String(task.dataset.nwTask||"");
      void track("funnel_step","first_task_selected");
      const status=document.getElementById("nwTaskCopyStatus");
      navigator.clipboard?.writeText?.(value).then(()=>{if(status)status.textContent="Text kopiert. Jetzt in WhatsApp einfügen und senden."}).catch(()=>{if(status)status.textContent="Tipp ausgewählt. Kopieren Sie den Text und senden Sie ihn in WhatsApp."});
    }
  });
  document.addEventListener("invalid",(event)=>{if(event.target.closest?.("[data-nw-registration]"))void track("funnel_step","registration_validation_blocked")},true);
  window.addEventListener("error",()=>{void window.NahwerkAnalytics?.track?.("client_error",{funnel_name:"activation",funnel_step:"browser_error"})});
  const path=location.pathname.split("/").pop()||"index.html";
  void window.NahwerkAnalytics?.track?.("page_view",{funnel_name:"activation",funnel_step:safeToken(path.replace(".html","")||"home")});
  if(document.querySelector("[data-nw-registration]"))void track("funnel_start","registration_view");
  if(document.body.classList.contains("nw-first-value-page")){
    void track("funnel_step","first_value_view");
    void seedBaselineFromProfile();
  }
  if(document.body.dataset.nwIntent)void track("funnel_step","intent_"+safeToken(document.body.dataset.nwIntent,40));
  if(path==="index.html"||path===""){syncFreeEntryJourney();experiment()}
  window.NahwerkActivation=Object.freeze({markRegistrationComplete,seedBaseline,seedBaselineFromProfile,observeUsage,isPending:pending,isComplete:complete});
})();