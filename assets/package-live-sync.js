(() => {
  "use strict";
  const ENDPOINT="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-customer-service-core/public/product-facts";
  const CODE_BY_TITLE={"FREE":"FREE","STANDARD":"STANDARD","PLUS":"PLUS","PREMIUM":"PREMIUM","PREMIUM PLUS":"PREMIUM_PLUS","FAMILIE":"FAMILIE"};
  const byCode=(facts)=>new Map((Array.isArray(facts?.plans)?facts.plans:[]).map((p)=>[String(p.code||"").toUpperCase(),p]));
  const entitlement=(plan,code)=>(Array.isArray(plan?.entitlements)?plan.entitlements:[]).find((e)=>String(e?.feature_code||"")===code)||null;
  const qty=(plan,code)=>{
    const e=entitlement(plan,code);
    if(!e)return "—";
    return e.included_quantity===null||e.included_quantity===undefined||e.included_quantity===""?"unbegrenzt":String(e.included_quantity);
  };
  const euro=(cents)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",minimumFractionDigits:Number(cents||0)%100===0?0:2,maximumFractionDigits:2}).format(Number(cents||0)/100);
  function apply(facts){
    const plans=byCode(facts);
    for(const card of document.querySelectorAll(".package-card")){
      const h3=card.querySelector("h3");
      const code=CODE_BY_TITLE[String(h3?.textContent||"").trim().toUpperCase()];
      const plan=plans.get(code);
      if(!plan)continue;
      const price=card.querySelector(".package-price");
      if(price)price.innerHTML=`${euro(plan.monthly_price_cents)} <small>/ Monat</small>`;
      const usage=card.querySelector(".package-usage");
      if(usage){
        const web=qty(plan,"web_standard_dialog");
        const app=qty(plan,"app_dialog");
        const wa=qty(plan,"whatsapp_dialog");
        usage.textContent=`App ${app} · Web ${web} · WhatsApp ${wa}`;
      }
      card.dataset.planAuthority="live";
      card.dataset.planUpdatedAt=String(facts.generated_at||"");
    }
    document.documentElement.dataset.nwPlanFacts="live";
  }
  async function sync(){
    try{
      const response=await fetch(ENDPOINT,{method:"GET",cache:"no-store",credentials:"omit"});
      const facts=await response.json().catch(()=>null);
      if(!response.ok||facts?.ok!==true)return false;
      apply(facts);return true;
    }catch{return false;}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{void sync();},{once:true});else void sync();
  window.NAHWERKPackageLiveSync=Object.freeze({sync,ENDPOINT});
})();