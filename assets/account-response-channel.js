(()=>{
  const ENDPOINT="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/account/response-channel";
  const card=document.getElementById("responseChannelCard");
  if(!card)return;
  const status=document.getElementById("responseChannelStatus");
  const save=document.getElementById("responseChannelSave");
  const feedback=document.getElementById("responseChannelSaveStatus");
  const radios=Array.from(card.querySelectorAll('input[name="responseChannel"]'));
  const emailTarget=document.getElementById("responseChannelEmailTarget");
  const whatsappTarget=document.getElementById("responseChannelWhatsAppTarget");
  const callTarget=document.getElementById("responseChannelCallTarget");
  function token(){try{return JSON.parse(sessionStorage.getItem("scb_web_session")||"null")?.session_token||""}catch{return ""}}
  function setFeedback(message,kind=""){feedback.textContent=message;feedback.className="response-channel-save-status"+(kind?" is-"+kind:"")}
  function label(channel){return {SAME_CHANNEL:"Gleicher Kanal",WHATSAPP:"WhatsApp",EMAIL:"E-Mail",CALL:"Anruf"}[channel]||channel}
  function apply(data){
    const selected=String(data?.preferred_channel||"SAME_CHANNEL").toUpperCase();
    const available=data?.available||{};
    radios.forEach((radio)=>{
      if(radio.value==="APP")return;
      const enabled=radio.value==="SAME_CHANNEL"||available?.[radio.value]===true;
      radio.disabled=!enabled;
      radio.closest(".response-channel-option")?.classList.toggle("is-disabled",!enabled);
      radio.checked=radio.value===selected&&enabled;
    });
    if(!radios.some((r)=>r.checked&&!r.disabled)){const same=radios.find((r)=>r.value==="SAME_CHANNEL");if(same)same.checked=true}
    if(emailTarget)emailTarget.textContent=available.EMAIL===true?(data?.targets?.email?"Antworten gehen an "+data.targets.email+".":"E-Mail ist verfügbar."):"Keine E-Mail-Adresse verfügbar.";
    if(whatsappTarget)whatsappTarget.textContent=available.WHATSAPP===true?(data?.targets?.whatsapp?"Antworten gehen an "+data.targets.whatsapp+".":"WhatsApp ist verfügbar."):"Keine WhatsApp-Nummer verfügbar.";
    if(callTarget)callTarget.textContent=available.CALL===true?(data?.targets?.call?"Anruf an "+data.targets.call+".":"Verifizierte Telefonnummer verfügbar."):"Keine verifizierte Telefonnummer verfügbar.";
    if(status)status.textContent=label(selected);
  }
  async function load(){
    const t=token();if(!t){status.textContent="Nicht verfügbar";return}
    try{
      const r=await fetch(ENDPOINT,{headers:{Authorization:"Bearer "+t},signal:AbortSignal.timeout(9000)});
      const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok!==true)throw new Error("load_failed");
      apply(d);setFeedback("");
    }catch{status.textContent="Nicht verfügbar";setFeedback("Der Antwortkanal konnte gerade nicht geladen werden.","error")}
  }
  save?.addEventListener("click",async()=>{
    const t=token(),selected=radios.find((r)=>r.checked&&!r.disabled)?.value;
    if(!t||!selected)return setFeedback("Bitte melde dich erneut an.","error");
    save.disabled=true;save.textContent="Wird gespeichert …";setFeedback("Antwortkanal wird gespeichert …");
    try{
      const r=await fetch(ENDPOINT,{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({preferred_channel:selected}),signal:AbortSignal.timeout(10000)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d?.ok!==true)throw new Error(String(d?.error||"save_failed"));
      apply(d);setFeedback("Gespeichert. Künftige Antworten kommen über "+label(d.preferred_channel)+".","success");
    }catch(e){
      const code=String(e?.message||"");
      setFeedback(code.includes("UNAVAILABLE")?"Dieser Antwortkanal ist noch nicht verfügbar.":"Die Einstellung konnte gerade nicht gespeichert werden.","error");
    }finally{save.disabled=false;save.textContent="Antwortkanal speichern"}
  });
  document.addEventListener("click",(event)=>{
    if(event.target?.closest?.('[data-account-tab="concierge"],[data-open-account-tab="concierge"]'))setTimeout(load,0);
  });
  load();
})();
