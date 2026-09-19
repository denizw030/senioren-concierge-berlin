(()=>{
  "use strict";
  const ROOT="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  const DASHBOARD=ROOT+"/web/owner/product-gaps";
  const STATUS=ROOT+"/web/owner/product-gaps/status";
  const MARK_READ=ROOT+"/web/owner/product-gaps/mark-read";
  const SESSION_KEY="scb_web_session";
  const statusLabels={NEW:"Neu",TRIAGED:"Geprüft",PLANNED:"Geplant",BUILDING:"In Arbeit",IMPLEMENTED:"Fertig",IGNORED:"Ignoriert"};
  function token(){try{return String(JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")?.session_token||"")}catch{return ""}}
  async function request(url,init={}){
    const t=token();if(!t)throw Object.assign(new Error("SESSION_REQUIRED"),{status:401});
    const r=await fetch(url,{...init,headers:{Authorization:"Bearer "+t,...(init.body?{"Content-Type":"application/json"}:{}),...(init.headers||{})},cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(12000)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok!==true)throw Object.assign(new Error(String(d?.error||d?.reason||"REQUEST_FAILED")),{status:r.status});
    return d;
  }
  function fmtDate(value){
    const d=new Date(value);if(Number.isNaN(d.getTime()))return "–";
    return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);
  }
  function safeText(value,max=1500){return String(value||"").trim().slice(0,max)}
  function shortcut(data){
    const node=document.getElementById("ownerProductGapBadge"),summary=document.getElementById("ownerProductGapSummary");
    if(!node&&!summary)return;
    document.body.classList.add("owner-product-gap-enabled");
    const pending=Number(data.pending_count||0),week=Number(data.last_7_days_events||0),types=Number(data.total_gap_types||0);
    if(node)node.textContent=pending?pending+" neu":"Aktuell";
    if(summary)summary.textContent=week+" Kundenwunsch"+(week===1?"":"e")+" in den letzten 7 Tagen · "+types+" erfasste"+(types===1?"r Bereich":" Bereiche")+".";
  }
  function metric(id,value){const el=document.getElementById(id);if(el)el.textContent=Number(value||0).toLocaleString("de-DE")}
  function option(value,current){
    const o=document.createElement("option");o.value=value;o.textContent=statusLabels[value]||value;o.selected=value===current;return o;
  }
  function itemNode(item){
    const article=document.createElement("article");article.className="owner-gap-item";
    const head=document.createElement("div");head.className="owner-gap-item-head";
    const titleWrap=document.createElement("div");
    const kicker=document.createElement("div");kicker.className="owner-gap-kicker";kicker.textContent=safeText(item.requested_capability_hint||item.gap_class||"Produktlücke",120);
    const title=document.createElement("h2");title.className="owner-gap-item-title";title.textContent=safeText(item.requested_intent||item.customer_utterance||item.gap_key||"Kundenwunsch",500);
    titleWrap.append(kicker,title);
    const count=document.createElement("span");count.className="owner-gap-item-count";count.textContent=Number(item.request_count||0)+" Anfrage"+(Number(item.request_count||0)===1?"":"n");
    head.append(titleWrap,count);article.appendChild(head);
    const utterance=safeText(item.customer_utterance,1200);
    if(utterance){const p=document.createElement("p");p.className="owner-gap-item-copy";p.textContent="Zuletzt: „"+utterance+"“";article.appendChild(p)}
    const meta=document.createElement("div");meta.className="owner-gap-meta";
    [
      safeText(item.source_channel,40)||"–",
      Number(item.affected_people||0)+" betroffene Person"+(Number(item.affected_people||0)===1?"":"en"),
      "zuletzt "+fmtDate(item.last_seen_at),
      safeText(item.reason_code,120)
    ].forEach(v=>{const s=document.createElement("span");s.textContent=v;meta.appendChild(s)});
    article.appendChild(meta);
    const footer=document.createElement("div");footer.className="owner-gap-item-footer";
    const key=document.createElement("code");key.textContent=safeText(item.gap_key,160);key.style.cssText="font-size:11px;color:#777f8a;word-break:break-all";
    const label=document.createElement("label");label.textContent="Status";
    const select=document.createElement("select");select.className="owner-gap-select";select.setAttribute("aria-label","Produktstatus ändern");
    Object.keys(statusLabels).forEach(v=>select.appendChild(option(v,String(item.implementation_status||"NEW").toUpperCase())));
    select.addEventListener("change",async()=>{
      select.disabled=true;
      try{await request(STATUS,{method:"POST",body:JSON.stringify({gap_key:item.gap_key,status:select.value})});await loadFull()}
      catch{select.value=String(item.implementation_status||"NEW").toUpperCase();window.alert("Der Status konnte gerade nicht gespeichert werden.")}
      finally{select.disabled=false}
    });
    label.appendChild(select);footer.append(key,label);article.appendChild(footer);return article;
  }
  function render(data){
    shortcut(data);
    metric("ownerGapPending",data.pending_count);metric("ownerGapNew",data.new_gap_count);metric("ownerGapWeek",data.last_7_days_events);metric("ownerGapTypes",data.total_gap_types);
    const weekly=document.getElementById("ownerGapWeekly");
    if(weekly)weekly.textContent=Number(data.last_7_days_events||0)+" Kundenwunsch"+(Number(data.last_7_days_events||0)===1?"":"e")+" wurden in den letzten 7 Tagen als noch nicht vollständig ausführbar erfasst. Wiederkehrende Wünsche stehen oben.";
    const list=document.getElementById("ownerProductGapList");if(!list)return;
    list.replaceChildren();
    const items=Array.isArray(data.items)?data.items:[];
    if(!items.length){const empty=document.createElement("div");empty.className="owner-gap-empty";empty.textContent="Aktuell sind keine Produktlücken erfasst.";list.appendChild(empty);return}
    items.forEach(x=>list.appendChild(itemNode(x)));
    const pending=Number(data.pending_count||0);document.title=(pending?("("+pending+") "):"")+"Produktlücken | NAHWERK";
  }
  async function loadFull(){
    const status=document.getElementById("ownerGapStatus");if(status)status.textContent="Wird aktualisiert …";
    try{const data=await request(DASHBOARD+"?limit=150");render(data);if(status)status.textContent="Aktualisiert "+new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date())}
    catch(e){
      if(e?.status===401){location.replace("/anmelden");return}
      if(e?.status===403){location.replace("/konto");return}
      const list=document.getElementById("ownerProductGapList");if(list){list.replaceChildren();const box=document.createElement("div");box.className="owner-gap-error";box.textContent="Die Produktlücken konnten gerade nicht geladen werden.";list.appendChild(box)}
      if(status)status.textContent="Nicht verfügbar";
    }
  }
  async function probeShortcut(){
    try{const data=await request(DASHBOARD+"?limit=1");shortcut(data)}
    catch(e){if(e?.status===401&&document.getElementById("ownerProductGapList"))location.replace("/anmelden")}
  }
  function boot(){
    const full=document.getElementById("ownerProductGapList");
    if(full){
      document.getElementById("ownerGapRefresh")?.addEventListener("click",loadFull);
      document.getElementById("ownerGapMarkRead")?.addEventListener("click",async(event)=>{
        const b=event.currentTarget;b.disabled=true;
        try{await request(MARK_READ,{method:"POST"});await loadFull()}catch{window.alert("Die Hinweise konnten gerade nicht als gelesen markiert werden.")}finally{b.disabled=false}
      });
      void loadFull();
    }else void probeShortcut();
  }
  window.NAHWERKOwnerProductGapsTestHooks=Object.freeze({DASHBOARD,STATUS,MARK_READ,statusLabels});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
