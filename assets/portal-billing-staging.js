(()=>{
  "use strict";
  const SB='https://btqklftjmwtqqqdmwlnk.supabase.co';
  const KEY='sb_publishable_onbKIoe0eb9hgsYC2UeYzw_qttxclvj';
  const BILLING=`${SB}/functions/v1/nahwerk-billing-staging`;
  const SESSION='nahwerk_portal_staging_session_v1';
  const $=id=>document.getElementById(id);
  const money=cents=>cents==null?'—':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(cents)/100);
  const number=v=>v==null?'—':new Intl.NumberFormat('de-DE').format(Number(v));
  const bool=v=>v===true?'Aktiv':'Deaktiviert';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function session(){try{return JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch{return null}}
  async function api(path){
    const s=session();
    if(!s?.access_token) throw new Error('not_authenticated');
    const r=await fetch(`${BILLING}${path}`,{headers:{apikey:KEY,authorization:`Bearer ${s.access_token}`},cache:'no-store'});
    const body=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(body.error||`http_${r.status}`);
    return body;
  }

  function renderLoading(){if($('billingState')) $('billingState').innerHTML='<p>Tarif- und Nutzungsdaten werden geladen …</p>'}
  function renderError(){if($('billingState')) $('billingState').innerHTML='<div class="notice">Tarif- und Nutzungsdaten konnten gerade nicht geladen werden. Es wurde nichts verändert.</div>'}

  function renderState(state){
    const sub=state.subscription||null;
    const pref=state.preferences||{};
    const plan=sub?.plan||null;
    const charges=Array.isArray(state.daily_usage_charges)?state.daily_usage_charges:[];
    const todayIso=new Date().toISOString().slice(0,10);
    const today=charges.find(x=>x?.usage_date===todayIso)||charges[0]||null;
    const checkout=Array.isArray(state.checkout_intents)?state.checkout_intents[0]:null;
    const planName=plan?.code||'FREE / kein Bezahlabo';
    const price=plan?.monthly_price_cents;
    const blocked=pref.billing_blocked===true;
    const blockReason=blocked?(pref.billing_blocked_reason||'payment_blocked'):null;
    const limits={Nachrichten:plan?.message_limit,Bilder:plan?.image_generation_limit,Dokumente:plan?.document_digitization_limit,Erinnerungen:plan?.reminder_limit,'Voice-Minuten':plan?.voice_minutes_limit,'Outbound-Voice-Minuten':plan?.outbound_voice_minutes_limit};
    const limitRows=Object.entries(limits).filter(([,v])=>v!=null).map(([k,v])=>`<div class="billing-kpi"><span>${esc(k)}</span><strong>${number(v)}</strong></div>`).join('');
    $('billingState').innerHTML=`
      ${blocked?`<div class="notice"><strong>Zusätzliche kostenpflichtige Nutzung ist vorübergehend gesperrt.</strong><br>Grund: ${esc(blockReason)}. Vorhandene enthaltene Abo-Leistungen bleiben davon getrennt.</div>`:''}
      <div class="billing-grid">
        <div class="billing-card"><span>Aktiver Tarif</span><strong>${esc(planName)}</strong><small>${price==null?'Preis nicht verfügbar':money(price)+' / Monat'}</small></div>
        <div class="billing-card"><span>PAY PER USE</span><strong>${bool(pref.payg_enabled)}</strong><small>${blocked?'Derzeit durch Billing-Sperre nicht freigegeben':'Nur nach ausdrücklicher Freigabe'}</small></div>
        <div class="billing-card"><span>Zusatznutzung / Overage</span><strong>${bool(pref.overage_enabled)}</strong><small>${blocked?'Derzeit durch Billing-Sperre nicht freigegeben':pref.unlimited_overage?'Unbegrenzt ausdrücklich freigegeben':'Mit Kostenkontrolle'}</small></div>
        <div class="billing-card"><span>Zusatzkosten heute</span><strong>${today?money(today.amount_cents):money(0)}</strong><small>${today?.status?esc(today.status):'Keine Tagesbelastung erfasst'}</small></div>
      </div>
      <h3>Inklusivkontingent</h3>
      <div class="billing-kpis">${limitRows||'<p>Für den aktuellen Tarif liegen noch keine Kontingentdetails vor.</p>'}</div>
      <h3>Kostenkontrolle</h3>
      <div class="billing-kpis">
        <div class="billing-kpi"><span>Tageslimit</span><strong>${pref.daily_limit_cents==null?'Nicht gesetzt':money(pref.daily_limit_cents)}</strong></div>
        <div class="billing-kpi"><span>Monatslimit</span><strong>${pref.monthly_limit_cents==null?'Nicht gesetzt':money(pref.monthly_limit_cents)}</strong></div>
        <div class="billing-kpi"><span>Billing-Status</span><strong>${blocked?'Gesperrt':'Freigegeben'}</strong></div>
        <div class="billing-kpi"><span>Letzter Checkout-Status</span><strong>${checkout?.status?esc(checkout.status):'Kein Checkout'}</strong></div>
      </div>
      <p class="tiny">Kostenpflichtige Zusatznutzung entsteht nur, wenn PAYG bzw. Overage ausdrücklich aktiviert ist und keine Billing-Sperre besteht. Ein fehlgeschlagener Zahlungsstatus darf keine unbegrenzte weitere kostenpflichtige Nutzung erzeugen.</p>`;
  }

  let loading=false;
  async function load(){
    if(loading||!$('billingState')||$('portalView')?.classList.contains('hidden')) return;
    if(!session()?.access_token) return;
    loading=true;renderLoading();
    try{renderState(await api('/state'))}catch{renderError()}finally{loading=false}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const portal=$('portalView');
    if(portal)new MutationObserver(()=>{if(!portal.classList.contains('hidden'))load()}).observe(portal,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
    load();
  });
})();