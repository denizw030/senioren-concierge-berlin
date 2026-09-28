(() => {
  "use strict";
  const params=new URLSearchParams(location.search);
  const source=params.get("source");
  const email=String(params.get("email")||"").trim().toLowerCase();

  if(document.body.classList.contains("login-image-page")&&source==="stewaro_account"){
    document.body.classList.add("stewaro-account-flow");
    const emailInput=document.getElementById("loginEmail");
    if(emailInput&&email){emailInput.value=email;emailInput.closest(".field")?.classList.add("account-flow-email-field");}
    const card=document.querySelector(".logincard");
    const h=card?.querySelector("h2");
    if(card&&!card.querySelector(".stewaro-account-flow-brand")){
      const brand=document.createElement("a");
      brand.className="stewaro-account-flow-brand";
      brand.href="/";
      brand.setAttribute("aria-label","STEWARO Zugang");
      brand.innerHTML='<img class="stewaro-account-flow-icon" src="/assets/logos/stewaro-icon.svg" alt="" aria-hidden="true"><img class="stewaro-account-flow-wordmark" src="/assets/logos/stewaro-wordmark.svg" alt="" aria-hidden="true">';
      card.prepend(brand);
    }
    if(h)h.textContent="Ihr Passwort";
    if(card&&email){
      const summary=document.createElement("div");
      summary.className="account-flow-email-summary";
      summary.innerHTML='<span></span><a href="/#email">Ändern</a>';
      summary.querySelector("span").textContent=email;
      h?.insertAdjacentElement("afterend",summary);
    }
    const register=document.createElement("p");
    register.style.cssText="margin:22px 0 0;text-align:center;color:#747a75;font-size:13px";
    const a=document.createElement("a");
    a.href="/registrieren?source=stewaro_account&email="+encodeURIComponent(email);
    a.textContent="Noch kein Konto? Konto erstellen";
    a.style.cssText="color:#173126;font-weight:700;text-decoration:underline;text-underline-offset:3px";
    register.append(a);
    document.querySelector("#loginForm")?.append(register);
    setTimeout(()=>document.getElementById("loginPassword")?.focus(),0);
    return;
  }

  if(!document.body.classList.contains("registration-page")||source!=="stewaro_account")return;
  document.body.classList.add("stewaro-account-flow");
  const form=document.getElementById("signupForm");
  if(!form)return;
  const emailInput=document.getElementById("ownerEmail");
  if(emailInput&&email)emailInput.value=email;
  const self=document.querySelector('input[name="setupFor"][value="self"]');
  if(self)self.checked=true;
  const other=document.querySelector('input[name="setupFor"][value="other"]');
  if(other)other.checked=false;
  const postal=document.getElementById("ownerPostalCode");
  const first=document.getElementById("ownerFirstName");
  const last=document.getElementById("ownerLastName");
  const password=document.getElementById("webPassword");
  const phone=document.getElementById("ownerPhone");
  const privacy=document.getElementById("privacy");
  const terms=document.getElementById("terms");
  const submit=document.getElementById("registrationSubmit");
  const privacyRow=privacy?.closest(".check");
  const termsRow=terms?.closest(".check");
  const fieldNode=el=>el?.closest(".field");
  const steps=[
    {key:"first",title:"Wie heißen Sie?",intro:"Beginnen wir mit Ihrem Vornamen.",node:fieldNode(first),input:first},
    {key:"last",title:"Und Ihr Nachname?",intro:"Damit FIDEL Sie persönlich ansprechen kann.",node:fieldNode(last),input:last},
    {key:"postal",title:"Ihre Postleitzahl",intro:"Damit STEWARO regionale Dienste und Hilfe passend einordnen kann.",node:fieldNode(postal),input:postal},
    {key:"password",title:"Ein sicheres Passwort",intro:"Mindestens 15 Zeichen. Eine längere Passphrase ist ideal.",node:fieldNode(password),input:password},
    {key:"phone",title:"WhatsApp verbinden?",intro:"Optional. Sie können das auch später erledigen.",node:fieldNode(phone),input:phone,optional:true},
    {key:"legal",title:"Fast geschafft.",intro:"Bitte bestätigen Sie nur noch Datenschutz und Bedingungen.",legal:true}
  ];
  const shell=document.createElement("div");
  shell.className="stewaro-registration-progressive";
  const progress=document.createElement("div");progress.className="stewaro-registration-progress";
  const title=document.createElement("h1");
  const intro=document.createElement("p");intro.className="stewaro-access-intro";
  const stage=document.createElement("div");
  const nav=document.createElement("div");nav.className="stewaro-registration-nav";
  const back=document.createElement("button");back.type="button";back.textContent="Zurück";
  const skip=document.createElement("button");skip.type="button";skip.textContent="Überspringen";
  nav.append(back,skip);
  shell.append(progress,title,intro,stage,nav);
  form.append(shell);
  let index=0;
  const render=()=>{
    const step=steps[index];
    progress.textContent="Schritt "+(index+1)+" von "+steps.length;
    title.textContent=step.title;intro.textContent=step.intro;
    stage.replaceChildren();
    stage.className="stewaro-registration-screen";
    if(step.legal){
      const legal=document.createElement("div");legal.className="stewaro-registration-legal";
      if(privacyRow)legal.append(privacyRow);
      if(termsRow)legal.append(termsRow);
      if(submit)legal.append(submit);
      stage.append(legal);
    }else if(step.node){stage.append(step.node);}
    back.hidden=index===0;
    skip.hidden=!step.optional;
    setTimeout(()=>step.input?.focus(),0);
  };
  const next=()=>{
    const step=steps[index];
    if(step.input&&!step.optional&&!step.input.reportValidity())return;
    if(index<steps.length-1){index++;render();}
  };
  stage.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName!=="TEXTAREA"){e.preventDefault();next();}});
  shell.addEventListener("click",e=>{
    if(e.target.closest("#registrationSubmit"))return;
  });
  back.addEventListener("click",()=>{if(index>0){index--;render();}});
  skip.addEventListener("click",()=>{if(steps[index]?.optional){index++;render();}});
  const continueBtn=()=> {
    let btn=shell.querySelector(".stewaro-flow-next");
    if(!btn){btn=document.createElement("button");btn.type="button";btn.className="stewaro-access-submit stewaro-flow-next";btn.textContent="Weiter";btn.addEventListener("click",next);}
    return btn;
  };
  const observer=new MutationObserver(()=>{
    if(index<steps.length-1){
      const btn=continueBtn();
      if(!stage.contains(btn))stage.append(btn);
    }
  });
  observer.observe(stage,{childList:true});
  render();
  const btn=continueBtn();stage.append(btn);
})();
