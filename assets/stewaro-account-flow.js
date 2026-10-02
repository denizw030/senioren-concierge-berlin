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
      brand.href="/de/";
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

  if(!document.body.classList.contains("registration-page"))return;
  document.body.classList.add("stewaro-account-flow","stewaro-registration-wizard-active");

  const form=document.getElementById("signupForm");
  if(!form)return;

  const $=id=>document.getElementById(id);
  const selfRadio=form.querySelector('input[name="setupFor"][value="self"]');
  const otherRadio=form.querySelector('input[name="setupFor"][value="other"]');
  const familyMode=params.get("fuer")==="andere"||otherRadio?.checked===true;
  if(familyMode&&otherRadio)otherRadio.checked=true;
  if(!familyMode&&selfRadio)selfRadio.checked=true;

  const emailInput=$("ownerEmail");
  if(emailInput&&email)emailInput.value=email;

  const ensureHidden=(id,value="")=>{
    let input=$(id);
    if(!input){
      input=document.createElement("input");
      input.type="hidden";
      input.id=id;
      input.name=id;
      form.append(input);
    }
    input.value=value;
    return input;
  };
  const preferredContact=ensureHidden("preferredContactChannel","APP");
  const whatsappEnabled=ensureHidden("whatsappEnabled","false");
  const setWhatsappEnabled=(enabled)=>{
    const on=Boolean(enabled);
    whatsappEnabled.value=on?"true":"false";
    const selfPhone=document.getElementById("ownerPhone");
    const familyPhone=document.getElementById("recipientPhone");
    if(selfPhone)selfPhone.required=on&&!familyMode;
    if(familyPhone)familyPhone.required=on&&familyMode;
  };

  const fieldNode=el=>el?.closest(".field");
  const ownerFirst=$("ownerFirstName");
  const ownerLast=$("ownerLastName");
  const postal=$("ownerPostalCode");
  const password=$("webPassword");
  const ownerPhone=$("ownerPhone");
  const recipientFirst=$("recipientFirstName");
  const recipientLast=$("recipientLastName");
  const recipientPhone=$("recipientPhone");
  const relationship=$("relationship");
  const addressing=$("addressing");
  const safetyEnabled=$("safetyEnabled");
  const safetyFields=$("safetyFields");
  const privacy=$("privacy");
  const terms=$("terms");
  const consent=$("consent");
  const submit=$("registrationSubmit");
  const status=$("status");
  const privacyRow=privacy?.closest(".check");
  const termsRow=terms?.closest(".check");
  const consentRow=consent?.closest(".check");

  const makeChoice=(label,value,description="")=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="stewaro-wizard-choice";
    button.dataset.value=value;
    const strong=document.createElement("strong");
    strong.textContent=label;
    button.append(strong);
    if(description){
      const small=document.createElement("span");
      small.textContent=description;
      button.append(small);
    }
    return button;
  };

  const makeChoiceScreen=(options,onSelect)=>{
    const wrap=document.createElement("div");
    wrap.className="stewaro-wizard-choices";
    for(const option of options){
      const button=makeChoice(option.label,option.value,option.description||"");
      button.addEventListener("click",()=>onSelect(option.value,button));
      wrap.append(button);
    }
    return wrap;
  };

  const brand=document.createElement("a");
  brand.className="stewaro-registration-brand";
  brand.href="/de/";
  brand.setAttribute("aria-label","STEWARO Startseite");
  brand.innerHTML='<img src="/assets/logos/stewaro-icon.svg" alt="" aria-hidden="true"><img src="/assets/logos/stewaro-wordmark.svg" alt="STEWARO">';

  const shell=document.createElement("div");
  shell.className="stewaro-registration-progressive";
  const top=document.createElement("div");
  top.className="stewaro-registration-top";
  const progressText=document.createElement("div");
  progressText.className="stewaro-registration-progress";
  const track=document.createElement("div");
  track.className="stewaro-registration-track";
  track.innerHTML='<span></span>';
  top.append(brand,progressText,track);
  const title=document.createElement("h1");
  const intro=document.createElement("p");
  intro.className="stewaro-access-intro";
  const stage=document.createElement("div");
  stage.className="stewaro-registration-screen";
  const nav=document.createElement("div");
  nav.className="stewaro-registration-nav";
  const back=document.createElement("button");
  back.type="button";
  back.className="stewaro-wizard-back";
  back.textContent="Zurück";
  nav.append(back);
  shell.append(top,title,intro,stage,nav);
  form.append(shell);

  const screens=[];
  const add=(screen)=>screens.push(screen);
  const addInputStep=(key,titleText,introText,nodes,inputs,{optional=false,validate}={})=>{
    add({
      key,title:titleText,intro:introText,optional,
      render(){
        const box=document.createElement("div");
        box.className="stewaro-wizard-fields";
        for(const node of nodes.filter(Boolean))box.append(node);
        return box;
      },
      focus:inputs.find(Boolean),
      validate:validate||(()=>inputs.filter(Boolean).every(input=>optional||input.reportValidity()))
    });
  };

  addInputStep("email","Wie lautet deine E-Mail-Adresse?","Damit meldest du dich später sicher bei STEWARO an.",[fieldNode(emailInput)],[emailInput]);

  addInputStep(
    "owner-name",
    "Wie heißt du?",
    familyMode?"Du richtest STEWARO ein. Diese Angaben gehören zu deinem Zugang.":"Damit FIDEL deinen Zugang persönlich zuordnen kann.",
    [fieldNode(ownerFirst),fieldNode(ownerLast)],
    [ownerFirst,ownerLast]
  );

  addInputStep("postal","Wie lautet deine Postleitzahl?","So kann FIDEL regionale Hilfe und Dienste passend einordnen.",[fieldNode(postal)],[postal]);

  if(familyMode){
    addInputStep(
      "recipient",
      "Für wen dürfen wir STEWARO einrichten?",
      "Nur der Name der Person, die FIDEL unterstützen soll.",
      [fieldNode(recipientFirst),fieldNode(recipientLast)],
      [recipientFirst,recipientLast]
    );
    add({
      key:"relationship",
      title:"In welcher Beziehung steht ihr?",
      intro:"Damit FIDEL den Zusammenhang richtig einordnen kann.",
      render(){
        const node=fieldNode(relationship);
        return node||document.createElement("div");
      },
      focus:relationship,
      validate:()=>relationship?.reportValidity()!==false
    });
  }

  add({
    key:"contact",
    title:familyMode?"Wie soll der Hauptkontakt erfolgen?":"Wie möchtest du FIDEL hauptsächlich nutzen?",
    intro:"Du kannst das später jederzeit ändern.",
    render(){
      return makeChoiceScreen([
        {label:"App",value:"APP",description:"Ohne zusätzliche Nachrichtengebühr"},
        {label:"WhatsApp",value:"WHATSAPP",description:"Direkt im gewohnten Chat"}
      ],value=>{
        preferredContact.value=value;
        setWhatsappEnabled(value==="WHATSAPP");
        if(value==="WHATSAPP")goNext();
        else goNext();
      });
    },
    validate:()=>Boolean(preferredContact.value)
  });

  add({
    key:"whatsapp-extra",
    conditional:()=>preferredContact.value==="APP",
    title:"WhatsApp zusätzlich nutzen?",
    intro:"Nur wenn du FIDEL auch über WhatsApp erreichen möchtest.",
    render(){
      return makeChoiceScreen([
        {label:"Ja, zusätzlich",value:"yes"},
        {label:"Nein, nur App",value:"no"}
      ],value=>{
        setWhatsappEnabled(value==="yes");
        goNext();
      });
    },
    validate:()=>whatsappEnabled.value==="true"||whatsappEnabled.value==="false"
  });

  add({
    key:"whatsapp-phone",
    conditional:()=>whatsappEnabled.value==="true",
    title:"Welche WhatsApp-Nummer sollen wir verbinden?",
    intro:familyMode?"Die Nummer der Person, die FIDEL über WhatsApp nutzen soll.":"Deine WhatsApp-Nummer.",
    render(){
      const input=familyMode?recipientPhone:ownerPhone;
      input.disabled=false;
      input.required=true;
      const node=fieldNode(input);
      return node||document.createElement("div");
    },
    focus:familyMode?recipientPhone:ownerPhone,
    validate:()=>{
      const input=familyMode?recipientPhone:ownerPhone;
      input.required=true;
      return input.reportValidity();
    }
  });

  add({
    key:"addressing",
    title:"Wie soll FIDEL ansprechen?",
    intro:familyMode?"Wähle, wie FIDEL die unterstützte Person ansprechen soll.":"Wähle die Ansprache, die sich richtig anfühlt.",
    render(){
      return makeChoiceScreen([
        {label:"Du",value:"du",description:"Mit Vornamen"},
        {label:"Sie",value:"sie",description:"Mit Anrede und Nachnamen"}
      ],value=>{addressing.value=value;goNext();});
    },
    validate:()=>Boolean(addressing?.value)
  });

  add({
    key:"safety",
    title:"Soll ein Safety-Check-in eingerichtet werden?",
    intro:"Optional. FIDEL kann zu vereinbarten Zeiten nachfragen, ob alles in Ordnung ist.",
    render(){
      return makeChoiceScreen([
        {label:"Nein, später",value:"no"},
        {label:"Ja, einrichten",value:"yes"}
      ],value=>{
        safetyEnabled.checked=value==="yes";
        safetyEnabled.dispatchEvent(new Event("change",{bubbles:true}));
        goNext();
      });
    },
    validate:()=>true
  });

  add({
    key:"safety-details",
    conditional:()=>safetyEnabled.checked,
    title:"Wann soll FIDEL nachfragen?",
    intro:"Ein Check-in und eine Vertrauensperson reichen für den Start.",
    render(){
      safetyFields.hidden=false;
      const box=document.createElement("div");
      box.className="stewaro-wizard-fields";
      box.append(safetyFields);
      return box;
    },
    focus:$("checkinTimes"),
    validate:()=>[$("checkinTimes"),$("trustedContactPhone")].every(input=>input?.reportValidity()!==false)
  });

  addInputStep("password","Wähle ein sicheres Passwort","Mindestens 15 Zeichen. Eine längere Passphrase ist ideal.",[fieldNode(password)],[password]);

  add({
    key:"review",
    title:"Alles bereit.",
    intro:"Prüfe kurz die wichtigsten Angaben und bestätige anschließend die Bedingungen.",
    render(){
      const box=document.createElement("div");
      box.className="stewaro-registration-review";
      const summary=document.createElement("div");
      summary.className="stewaro-wizard-summary";
      const personName=familyMode?[recipientFirst?.value,recipientLast?.value].filter(Boolean).join(" "):[ownerFirst?.value,ownerLast?.value].filter(Boolean).join(" ");
      const channel=preferredContact.value==="WHATSAPP"?"WhatsApp":"App";
      const wa=whatsappEnabled.value==="true"?" · WhatsApp aktiv":"";
      const safety=safetyEnabled.checked?"Ja":"Nein";
      summary.innerHTML=`
        <div><span>Für</span><strong></strong></div>
        <div><span>Hauptkontakt</span><strong></strong></div>
        <div><span>Safety-Check-in</span><strong></strong></div>
      `;
      const strongs=summary.querySelectorAll("strong");
      strongs[0].textContent=personName||"—";
      strongs[1].textContent=channel+wa;
      strongs[2].textContent=safety;
      box.append(summary);
      const legal=document.createElement("div");
      legal.className="stewaro-registration-legal";
      if(familyMode&&whatsappEnabled.value==="true"&&consentRow){
        consentRow.hidden=false;
        consentRow.setAttribute("aria-hidden","false");
        consent.required=true;
        legal.append(consentRow);
      }
      if(privacyRow)legal.append(privacyRow);
      if(termsRow)legal.append(termsRow);
      if(submit){
        submit.textContent="STEWARO einrichten";
        legal.append(submit);
      }
      if(status)legal.append(status);
      box.append(legal);
      return box;
    },
    validate:()=>true,
    final:true
  });

  const visibleScreens=()=>screens.filter(screen=>!screen.conditional||screen.conditional());
  let currentKey=screens[0]?.key||"email";

  const currentIndex=()=>{
    const list=visibleScreens();
    let index=list.findIndex(screen=>screen.key===currentKey);
    if(index<0){index=0;currentKey=list[0]?.key||currentKey;}
    return {list,index};
  };

  const render=()=>{
    const {list,index}=currentIndex();
    const step=list[index];
    if(!step)return;
    progressText.textContent="Schritt "+(index+1)+" von "+list.length;
    track.querySelector("span").style.width=((index+1)/list.length*100)+"%";
    title.textContent=step.title;
    intro.textContent=step.intro||"";
    stage.replaceChildren(step.render());
    back.hidden=index===0;
    if(!step.final&&!stage.querySelector(".stewaro-wizard-choice")){
      const next=document.createElement("button");
      next.type="button";
      next.className="stewaro-access-submit stewaro-flow-next";
      next.textContent="Weiter";
      next.addEventListener("click",goNext);
      stage.append(next);
    }
    setTimeout(()=>step.focus?.focus(),0);
    window.scrollTo({top:0,behavior:"auto"});
  };

  function goNext(){
    const {list,index}=currentIndex();
    const step=list[index];
    if(step?.validate&&!step.validate())return;
    if(index<list.length-1){
      currentKey=list[index+1].key;
      render();
    }
  }

  back.addEventListener("click",()=>{
    const {list,index}=currentIndex();
    if(index>0){currentKey=list[index-1].key;render();}
  });

  stage.addEventListener("keydown",event=>{
    if(event.key==="Enter"&&event.target.tagName!=="TEXTAREA"&&!event.target.closest(".stewaro-wizard-choice")){
      event.preventDefault();
      goNext();
    }
  });

  setWhatsappEnabled(false);
  render();
})();
