(() => {
  const PENDING_KEY="nw_activation_pending_v1", COMPLETE_KEY="nw_activation_complete_v1", EXPERIMENT_KEY="nw_growth_experiment_v1";
  const safeToken=(v,max=64)=>String(v||"").toLowerCase().replace(/[^a-z0-9_:-]+/g,"_").slice(0,max).replace(/^_+|_+$/g,"");
  const track=(name,step)=>window.NahwerkAnalytics?.track?.(name,{funnel_name:"activation",funnel_step:safeToken(step)});
  const pending=()=>{try{return localStorage.getItem(PENDING_KEY)==="1"}catch(_){return false}};
  const complete=()=>{try{return localStorage.getItem(COMPLETE_KEY)==="1"}catch(_){return false}};
  function markRegistrationComplete(){try{localStorage.setItem(PENDING_KEY,"1");localStorage.removeItem(COMPLETE_KEY)}catch(_){} void track("funnel_step","registration_complete")}
  function observeUsage(usage){if(!pending()||complete())return false;const app=Number(usage?.app_dialogues_used||0),whatsapp=Number(usage?.whatsapp_dialogues_used||0);if(!(app>0||whatsapp>0))return false;try{localStorage.setItem(COMPLETE_KEY,"1");localStorage.removeItem(PENDING_KEY)}catch(_){} void track("funnel_complete","first_task_success");return true}
  function experiment(){try{let v=sessionStorage.getItem(EXPERIMENT_KEY);if(!v){const b=new Uint8Array(1);crypto.getRandomValues(b);v=(b[0]%2===0)?"control":"clarity";sessionStorage.setItem(EXPERIMENT_KEY,v)}document.documentElement.dataset.nwGrowthVariant=v;void track("funnel_step","experiment_home_value_"+v);return v}catch(_){return"control"}}
  document.addEventListener("click",(event)=>{const cta=event.target.closest?.("[data-nw-cta]");if(cta)void window.NahwerkAnalytics?.track?.("cta_click",{funnel_name:"activation",funnel_step:safeToken(cta.dataset.nwStep||cta.dataset.nwCta)});const task=event.target.closest?.("[data-nw-task]");if(task){const value=String(task.dataset.nwTask||"");void track("funnel_step","first_task_selected");const status=document.getElementById("nwTaskCopyStatus");navigator.clipboard?.writeText?.(value).then(()=>{if(status)status.textContent="Text kopiert. Jetzt in WhatsApp einfügen und senden."}).catch(()=>{if(status)status.textContent="Tipp ausgewählt. Kopieren Sie den Text und senden Sie ihn in WhatsApp."})}});
  document.addEventListener("invalid",(event)=>{if(event.target.closest?.("[data-nw-registration]"))void track("funnel_step","registration_validation_blocked")},true);
  window.addEventListener("error",()=>{void window.NahwerkAnalytics?.track?.("client_error",{funnel_name:"activation",funnel_step:"browser_error"})});
  const path=location.pathname.split("/").pop()||"index.html";void window.NahwerkAnalytics?.track?.("page_view",{funnel_name:"activation",funnel_step:safeToken(path.replace(".html","")||"home")});
  if(document.querySelector("[data-nw-registration]"))void track("funnel_start","registration_view");
  if(document.body.classList.contains("nw-first-value-page"))void track("funnel_step","first_value_view");
  if(document.body.dataset.nwIntent)void track("funnel_step","intent_"+safeToken(document.body.dataset.nwIntent,40));
  if(path==="index.html"||path==="")experiment();
  window.NahwerkActivation=Object.freeze({markRegistrationComplete,observeUsage,isPending:pending,isComplete:complete});
})();