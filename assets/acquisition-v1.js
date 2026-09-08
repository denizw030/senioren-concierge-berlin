(() => {
  const PENDING_KEY="nw_activation_pending_v1", COMPLETE_KEY="nw_activation_complete_v1";
  const PROFILE_URL="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-profile";
  const SESSION_KEY="scb_web_session";
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
  if(path==="index.html"||path==="")experiment();
  window.NahwerkActivation=Object.freeze({markRegistrationComplete,seedBaseline,seedBaselineFromProfile,observeUsage,isPending:pending,isComplete:complete});
})();