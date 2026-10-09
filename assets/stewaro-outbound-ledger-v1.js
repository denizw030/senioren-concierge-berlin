(()=>{
"use strict";
const ROOT="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/account-security-auth-cleanup-temp";
const state=document.getElementById("state"),root=document.getElementById("calls");
const token=()=>window.STEWAROPhoneSession?.token()||"";
const d=v=>{const x=new Date(v??"");return Number.isNaN(x.getTime())?"Zeit nicht verfügbar":x.toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"})};
const elapsed=v=>{const n=Number(v);return v!=null&&Number.isFinite(n)&&n>=0?`${Math.floor(n/60)} Min. ${Math.floor(n%60)} Sek.`:"Nicht dokumentiert"};
const node=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=String(text);return x};
const err=text=>{state.hidden=false;state.className="error";state.textContent=text;root.hidden=true};
const authRequired=()=>Object.assign(new Error("Deine sichere Sitzung ist nicht mehr aktiv."),{code:"AUTH_REQUIRED"});
const relogin=text=>{
 err(text);
 const link=node("a","login-link","Mit bestehendem Konto anmelden");
 link.href=window.STEWAROPhoneSession.loginHref("/telefonate/ausgehend");
 state.append(" ",link);
};
const get=async path=>{const t=token();if(!t)throw authRequired();const res=await fetch(ROOT+path,{headers:{Authorization:"Bearer "+t,Accept:"application/json"},cache:"no-store"});if(res.status===401)throw authRequired();const body=await res.json().catch(()=>null);if(!res.ok||body?.ok!==true||body.authoritative!==true||body.environment!=="PROD"||body.phone_contract!=="customer-outbound-ledger-v1")throw Error("Das Outbound-Protokoll konnte gerade nicht sicher geladen werden.");return body};
const resultLabel=call=>call?.mission_outcome==="Auftrag nicht erledigt"?"Auftrag nicht erledigt":call?.mission_verified===true?"Auftrag erledigt":"Noch nicht überprüft";
const resultClass=call=>resultLabel(call)==="Auftrag nicht erledigt"?"failed":resultLabel(call)==="Auftrag erledigt"?"complete":"unverified";
const field=(dl,label,value)=>{const dt=node("dt",null,label),dd=node("dd",null,value??"Nicht dokumentiert");dl.append(dt,dd)};
const show=async(call,container,button)=>{
 button.disabled=true;button.textContent="Gespräch wird geladen …";
 try{
  const b=await get("/phone/outbound/transcript?call_id="+encodeURIComponent(call.call_id));
  const detail=b.call;if(!detail||detail.call_id!==call.call_id)throw Error("Das Gespräch konnte nicht sicher zugeordnet werden.");
  container.replaceChildren();
  container.append(node("p","small",detail.transcript_coverage||"Keine Transkriptangaben verfügbar."));
  if(detail.mission_issue){
    container.append(node("p","error",detail.mission_issue));
  }
  if(detail.mission_verified===true&&detail.mission_evidence){
    container.append(node("p","small",detail.mission_evidence));
  }
  if(detail.appointment_progress){
    container.append(node("p","small",detail.appointment_progress));
    if(detail.appointment_evidence)container.append(node("p","small",detail.appointment_evidence));
  }
  const entries=Array.isArray(detail.transcript)?detail.transcript:[],list=node("ol","messages");
  entries.forEach(item=>{const li=node("li"),who=node("span","speaker",item.speaker||"Gespräch"),message=node("span",null,item.text||"");li.append(who,message);list.append(li)});
  if(entries.length)container.append(list);else container.append(node("p",null,"Für diesen Anruf sind keine eindeutig zugeordneten Gesprächsbeiträge gespeichert."));
  button.textContent="Gespräch ausgeblendet";button.dataset.open="true";
 }catch(e){container.replaceChildren(node("p","error",e.message||"Die Gesprächsdaten sind derzeit nicht verfügbar."));if(e?.code==="AUTH_REQUIRED"){const link=node("a",null,"Mit bestehendem Konto anmelden");link.href=window.STEWAROPhoneSession.loginHref("/telefonate/ausgehend");container.append(link)}button.textContent="Erneut versuchen"}
 finally{button.disabled=false}
};
const render=items=>{
 root.replaceChildren();
 if(!items.length){state.hidden=false;state.textContent="Noch keine ausgehenden Anrufaufträge vorhanden.";root.hidden=true;return}
 state.hidden=true;root.hidden=false;
 items.forEach(call=>{
  const article=node("article","call"),top=node("div"),title=node("h2",null,call.contact_name||"Kontakt");
  const status=node("span","status",call.call_status||"Unbekannt");
  const outcome=node("strong","mission-outcome mission-outcome-"+resultClass(call),resultLabel(call));
  const meta=node("p","meta",d(call.requested_at));
  const dl=node("dl");field(dl,"Dein Auftrag",call.requested_objective);
  field(dl,"Telefonstatus",call.call_status);
  field(dl,"Telefonassistenz",call.assistant_name||"Nicht dokumentiert");
  field(dl,"Beginn des Telefonats",call.call_started_at?d(call.call_started_at):"Nicht dokumentiert");
  field(dl,"Ende des Telefonats",call.call_ended_at?d(call.call_ended_at):"Nicht dokumentiert");
  field(dl,"Gesprächsdauer",elapsed(call.duration_seconds));
  field(dl,"Antwort der Zielperson", "Nur anhand vorhandener Gesprächsbeiträge prüfbar; ein beendeter Anruf bestätigt keine persönliche Antwort.");
  field(dl,"Auftrag tatsächlich erfüllt",resultLabel(call));
  if(call.mission_outcome==="Auftrag nicht erledigt"&&call.mission_issue){
    field(dl,"Abweichung festgestellt",call.mission_issue);
  }
  if(call.mission_verified===true&&call.mission_evidence){
    field(dl,"Erfolgsnachweis",call.mission_evidence);
  }
  if(call.appointment_progress){
    field(dl,"Terminvereinbarung – Gesprächsstand",call.appointment_progress);
    if(call.appointment_evidence)field(dl,"Warum noch nicht bestätigt",call.appointment_evidence);
  }
  field(dl,"Bisherige Statusmeldung (nicht verifiziert)",call.result_note||"Keine");
  const btn=node("button",null,"Gesprächsverlauf anzeigen"),details=node("div","details");details.hidden=true;
  btn.type="button";
  btn.addEventListener("click",()=>{if(btn.dataset.open==="true"){details.hidden=true;btn.dataset.open="false";btn.textContent="Gesprächsverlauf anzeigen";return}details.hidden=false;show(call,details,btn)});
  top.append(title,meta,status,outcome);article.append(top,dl,btn,details);root.append(article)
 })
};
get("/phone/outbound").then(x=>render(Array.isArray(x.calls)?x.calls:[])).catch(x=>x?.code==="AUTH_REQUIRED"?relogin(x.message):err(x.message||"Der Telefonverlauf ist momentan nicht abrufbar."));
})();
