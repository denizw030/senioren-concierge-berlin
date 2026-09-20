(()=>{
  const ENDPOINT="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/account/response-channel";
  const card=document.getElementById("responseChannelCard");
  if(!card)return;
  const conciergeTab=document.getElementById("accountTabConcierge");
  const quickMenu=document.getElementById("conciergeQuickMenu");
  const quickResponse=document.getElementById("responseChannelQuickOpen");
  let quickHideTimer=0;
  let allowConciergeActivation=false;
  function positionQuickMenu(){
    if(!conciergeTab||!quickMenu)return;
    const shell=conciergeTab.closest(".account-tabs-shell");
    if(!shell)return;
    const tabRect=conciergeTab.getBoundingClientRect(),shellRect=shell.getBoundingClientRect(),mobile=window.matchMedia("(max-width:760px)").matches,menuWidth=quickMenu.offsetWidth||220;
    if(mobile){quickMenu.style.left="10px";quickMenu.style.right="10px"}else{const left=Math.max(0,Math.min(shellRect.width-menuWidth,tabRect.left-shellRect.left+(tabRect.width-menuWidth)/2));quickMenu.style.left=Math.round(left)+"px";quickMenu.style.right="auto"}
    quickMenu.style.top=Math.round(tabRect.bottom-shellRect.top+7)+"px";
  }
  function openQuickMenu(){
    if(!quickMenu)return;
    window.clearTimeout(quickHideTimer);positionQuickMenu();quickMenu.dataset.open="true";conciergeTab?.setAttribute("aria-expanded","true");
  }
  function closeQuickMenu(delay=120){
    window.clearTimeout(quickHideTimer);
    quickHideTimer=window.setTimeout(()=>{if(quickMenu)quickMenu.dataset.open="false";conciergeTab?.setAttribute("aria-expanded","false")},delay);
  }
  if(conciergeTab&&quickMenu){
    conciergeTab.setAttribute("aria-haspopup","menu");
    conciergeTab.setAttribute("aria-expanded","false");
    conciergeTab.addEventListener("click",(event)=>{
      if(!window.matchMedia("(max-width:760px)").matches||allowConciergeActivation)return;
      event.preventDefault();event.stopPropagation();
      if(quickMenu.dataset.open==="true")closeQuickMenu(0);else openQuickMenu();
    });
    conciergeTab.addEventListener("mouseenter",openQuickMenu);
    conciergeTab.addEventListener("mouseleave",()=>closeQuickMenu(170));
    conciergeTab.addEventListener("focus",openQuickMenu);
    quickMenu.addEventListener("mouseenter",openQuickMenu);
    quickMenu.addEventListener("mouseleave",()=>closeQuickMenu(130));
    quickMenu.addEventListener("focusin",openQuickMenu);
    quickMenu.addEventListener("focusout",(event)=>{if(!quickMenu.contains(event.relatedTarget))closeQuickMenu(0)});
    window.addEventListener("resize",()=>{if(quickMenu.dataset.open==="true")positionQuickMenu()},{passive:true});
    document.addEventListener("keydown",(event)=>{if(event.key==="Escape")closeQuickMenu(0)});
    document.addEventListener("click",(event)=>{if(quickMenu.dataset.open==="true"&&!quickMenu.contains(event.target)&&event.target!==conciergeTab&&!conciergeTab.contains(event.target))closeQuickMenu(0)});
  }
  const status=document.getElementById("responseChannelStatus");
  const save=document.getElementById("responseChannelSave");
  const feedback=document.getElementById("responseChannelSaveStatus");
  const radios=Array.from(card.querySelectorAll('input[name="responseChannel"]'));
  const emailTarget=document.getElementById("responseChannelEmailTarget");
  const whatsappTarget=document.getElementById("responseChannelWhatsAppTarget");
  const callTarget=document.getElementById("responseChannelCallTarget");
  const quickButtons=Array.from(document.querySelectorAll("[data-response-channel-quick]"));
  const quickStatus=document.getElementById("conciergeQuickChannelStatus");
  function token(){try{return JSON.parse(sessionStorage.getItem("scb_web_session")||"null")?.session_token||""}catch{return ""}}
  function setFeedback(message,kind=""){feedback.textContent=message;feedback.className="response-channel-save-status"+(kind?" is-"+kind:"")}
  function label(channel){return {SAME_CHANNEL:"WhatsApp",WHATSAPP:"WhatsApp",EMAIL:"E-Mail",CALL:"Anruf"}[channel]||channel}
  function apply(data){
    const stored=String(data?.preferred_channel||"SAME_CHANNEL").toUpperCase();
    const selected=stored==="WHATSAPP"?"SAME_CHANNEL":stored;
    const available=data?.available||{};
    radios.forEach((radio)=>{
      const enabled=radio.value==="SAME_CHANNEL"?available?.WHATSAPP===true:available?.[radio.value]===true;
      radio.disabled=!enabled;
      radio.closest(".response-channel-option")?.classList.toggle("is-disabled",!enabled);
      radio.checked=radio.value===selected&&enabled;
    });
    if(!radios.some((r)=>r.checked&&!r.disabled)){
      const same=radios.find((r)=>r.value==="SAME_CHANNEL"&&!r.disabled);
      if(same)same.checked=true;
    }
    if(emailTarget)emailTarget.textContent=available.EMAIL===true?(data?.targets?.email?"An "+data.targets.email+".":"E-Mail ist verfügbar."):"Keine E-Mail-Adresse verfügbar.";
    if(whatsappTarget)whatsappTarget.textContent=available.WHATSAPP===true?(data?.targets?.whatsapp?"Direkt zurück an "+data.targets.whatsapp+".":"Direkt zurück über diesen Kanal."):"Keine WhatsApp-Nummer verfügbar.";
    if(callTarget)callTarget.textContent=available.CALL===true?(data?.targets?.call?"Rückruf an "+data.targets.call+".":"Verifizierte Telefonnummer verfügbar."):"Keine verifizierte Telefonnummer verfügbar.";
    quickButtons.forEach((button)=>{
      const target=String(button.dataset.responseChannelQuick||"").toUpperCase();
      button.disabled=available?.[target]!==true;
      button.classList.toggle("is-selected",selected===target);
      button.setAttribute("aria-pressed",String(selected===target));
    });
    if(status)status.textContent="WhatsApp → "+label(selected);
  }
  async function load(){
    const t=token();if(!t){status.textContent="Nicht verfügbar";return}
    try{
      const r=await fetch(ENDPOINT,{headers:{Authorization:"Bearer "+t},signal:AbortSignal.timeout(9000)});
      const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok!==true)throw new Error("load_failed");
      apply(d);setFeedback("");
    }catch{status.textContent="Nicht verfügbar";setFeedback("Der Antwortkanal konnte gerade nicht geladen werden.","error")}
  }
  async function savePreference(selected,trigger=null){
    const t=token();
    if(!t||!selected){setFeedback("Bitte melde dich erneut an.","error");if(quickStatus)quickStatus.textContent="Bitte melde dich erneut an.";return false}
    const allTriggers=[save,...quickButtons].filter(Boolean);
    allTriggers.forEach((button)=>button.disabled=true);
    const original=trigger?.textContent||"";
    if(trigger===save)save.textContent="Wird gespeichert …";
    if(trigger&&trigger!==save)trigger.textContent="Wird gespeichert …";
    setFeedback("Wird gespeichert …");
    if(quickStatus)quickStatus.textContent="Wird gespeichert …";
    try{
      const r=await fetch(ENDPOINT,{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({preferred_channel:selected}),signal:AbortSignal.timeout(10000)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d?.ok!==true)throw new Error(String(d?.error||"save_failed"));
      apply(d);
      const savedLabel=label(d.preferred_channel);
      setFeedback("Gespeichert. WhatsApp-Aufträge werden künftig per "+savedLabel+" beantwortet.","success");
      if(quickStatus)quickStatus.textContent="Gespeichert: WhatsApp → "+savedLabel;
      return true;
    }catch(e){
      const code=String(e?.message||"");
      const message=code.includes("UNAVAILABLE")?"Dieser Antwortkanal ist noch nicht verfügbar.":"Die Einstellung konnte gerade nicht gespeichert werden.";
      setFeedback(message,"error");
      if(quickStatus)quickStatus.textContent=message;
      return false;
    }finally{
      if(trigger===save)save.textContent="Speichern";
      if(trigger&&trigger!==save)trigger.textContent=original;
      allTriggers.forEach((button)=>{
        if(button===save){button.disabled=false;return}
        const target=String(button.dataset.responseChannelQuick||"").toUpperCase();
        const radio=radios.find((r)=>r.value===target);
        button.disabled=radio?radio.disabled:false;
      });
    }
  }
  save?.addEventListener("click",()=>{
    const selected=radios.find((r)=>r.checked&&!r.disabled)?.value;
    void savePreference(selected,save);
  });
  quickButtons.forEach((button)=>{
    button.addEventListener("click",()=>{
      const selected=String(button.dataset.responseChannelQuick||"").toUpperCase();
      if(!["EMAIL","CALL"].includes(selected))return;
      void savePreference(selected,button);
    });
  });
  document.addEventListener("click",(event)=>{
    if(event.target?.closest?.('[data-account-tab="concierge"],[data-open-account-tab="concierge"]'))setTimeout(load,0);
  });
  quickResponse?.addEventListener("click",()=>{
    closeQuickMenu(0);
    if(conciergeTab?.getAttribute("aria-selected")!=="true"){allowConciergeActivation=true;conciergeTab?.click();allowConciergeActivation=false}
    setTimeout(()=>{
      load();
      card.scrollIntoView({behavior:"smooth",block:"start"});
      card.classList.remove("response-channel-focus");
      void card.offsetWidth;
      card.classList.add("response-channel-focus");
      setTimeout(()=>card.classList.remove("response-channel-focus"),900);
    },70);
  });
  load();
})();
