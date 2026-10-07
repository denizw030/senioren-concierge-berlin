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
  const EXECUTION_RESULT_DRAFT_KEY="nw_execution_result_onboarding_v1";
  const preferredContact=ensureHidden("preferredContactChannel","APP");
  const whatsappEnabled=ensureHidden("whatsappEnabled","false");
  const executionResultChannel=ensureHidden("executionResultChannel","EMAIL");
  const whatsappExecutionOptIn=ensureHidden("whatsappExecutionOptIn","false");
  const whatsappExecutionFeeCents=ensureHidden("whatsappExecutionFeeCents","");
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
  const ownerPostal=$("ownerPostalCode");
  const ownerStreet=$("ownerStreetAddress");
  const recipientPostal=$("recipientPostalCode");
  const recipientStreet=$("recipientStreetAddress");
  const password=$("webPassword");
  const ownerPhone=$("ownerPhone");
  const recipientFirst=$("recipientFirstName");
  const recipientLast=$("recipientLastName");
  const recipientPhone=$("recipientPhone");
  let recipientEmail=$("recipientEmail");
  if(familyMode&&!recipientEmail){
    const field=document.createElement("div");
    field.className="field";
    const label=document.createElement("label");
    label.htmlFor="recipientEmail";
    label.textContent="E-Mail-Adresse des Klienten (optional)";
    recipientEmail=document.createElement("input");
    recipientEmail.id="recipientEmail";recipientEmail.type="email";recipientEmail.autocomplete="email";
    const help=document.createElement("span");
    help.className="tiny";
    help.textContent="Empfohlen für Ausführungsrückmeldungen per E-Mail ohne WhatsApp-Nachrichtengebühr.";
    field.append(label,recipientEmail,help);
    form.append(field);
  }
  const saveExecutionResultDraft=()=>{
    try{
      sessionStorage.setItem(EXECUTION_RESULT_DRAFT_KEY,JSON.stringify({
        version:1,
        scope:familyMode?"family":"self",
        channel:executionResultChannel.value||"EMAIL",
        whatsapp_paid_opt_in:whatsappExecutionOptIn.value==="true",
        whatsapp_unit_price_cents:whatsappExecutionOptIn.value==="true"?6:null,
        recipient_email:familyMode?String(recipientEmail?.value||"").trim().toLowerCase():"",
        created_at:new Date().toISOString()
      }));
    }catch{}
  };
  recipientEmail?.addEventListener("input",saveExecutionResultDraft);
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
  const parking=document.createElement("div");
  parking.className="stewaro-wizard-parking";
  parking.hidden=true;
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
  shell.append(top,title,intro,stage,nav,parking);
  form.append(shell);

  const movableNodes=[
    fieldNode(emailInput),fieldNode(ownerFirst),fieldNode(ownerLast),fieldNode(ownerPostal),fieldNode(ownerStreet),
    fieldNode(password),fieldNode(ownerPhone),fieldNode(recipientFirst),fieldNode(recipientLast),fieldNode(recipientPostal),fieldNode(recipientStreet),
    fieldNode(recipientPhone),fieldNode(recipientEmail),fieldNode(relationship),safetyFields,privacyRow,termsRow,consentRow,
    submit,status
  ].filter(Boolean);
  const parkCurrentFields=()=>{
    for(const node of movableNodes){
      if(stage.contains(node))parking.append(node);
    }
  };

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

  const addPostalStep=(key,titleText,introText,postalInput,addressInput,{family=false}={})=>{
    add({
      key,title:titleText,intro:introText,
      render(){
        const box=document.createElement("div");
        box.className="stewaro-wizard-fields";
        const postalNode=fieldNode(postalInput);
        const addressNode=fieldNode(addressInput);
        if(postalNode)box.append(postalNode);
        const option=document.createElement("div");
        option.className="stewaro-address-option";
        const toggle=document.createElement("button");
        toggle.type="button";
        toggle.className="stewaro-address-toggle";
        toggle.textContent="Adresse optional hinzufügen";
        const reason=document.createElement("p");
        reason.className="stewaro-address-reason";
        reason.textContent=family
          ?"Damit FIDEL z. B. den tatsächlich nächsten Hausarzt und die Entfernung von der Adresse des Klienten genauer bestimmen kann."
          :"Damit FIDEL z. B. den tatsächlich nächsten Hausarzt und die Entfernung von deiner Adresse genauer bestimmen kann.";
        const hasAddress=Boolean(String(addressInput?.value||"").trim());
        if(addressNode){
          addressNode.hidden=!hasAddress;
          if(hasAddress)toggle.hidden=true;
        }
        toggle.setAttribute("aria-expanded",String(hasAddress));
        toggle.addEventListener("click",()=>{
          if(!addressNode)return;
          addressNode.hidden=false;
          toggle.hidden=true;
          toggle.setAttribute("aria-expanded","true");
          setTimeout(()=>addressInput?.focus(),0);
        });
        option.append(toggle,reason);
        if(addressNode)option.append(addressNode);
        box.append(option);
        return box;
      },
      focus:postalInput,
      validate:()=>postalInput?.reportValidity()!==false
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

  if(familyMode){
    addInputStep(
      "recipient",
      "Für wen dürfen wir STEWARO einrichten?",
      "Nur der Name der Person, die FIDEL unterstützen soll.",
      [fieldNode(recipientFirst),fieldNode(recipientLast)],
      [recipientFirst,recipientLast]
    );
    addInputStep(
      "recipient-email",
      "Wie lautet die E-Mail-Adresse des Klienten?",
      "Optional, aber empfohlen: Ausführungsrückmeldungen können so per E-Mail statt kostenpflichtig über WhatsApp kommen.",
      [fieldNode(recipientEmail)],
      [recipientEmail],
      {optional:true,validate:()=>recipientEmail?.value?recipientEmail.reportValidity():true}
    );
    addPostalStep(
      "recipient-postal",
      "Wie lautet die Postleitzahl des Klienten?",
      "Die PLZ reicht für die Region. Die genaue Adresse kannst du im selben Schritt freiwillig ergänzen.",
      recipientPostal,
      recipientStreet,
      {family:true}
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
  }else{
    addPostalStep(
      "postal",
      "Wie lautet deine Postleitzahl?",
      "Die PLZ reicht für die Region. Deine genaue Adresse kannst du im selben Schritt freiwillig ergänzen.",
      ownerPostal,
      ownerStreet
    );
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
    key:"execution-results",
    conditional:()=>whatsappEnabled.value==="true",
    title:"Wie sollen Ausführungsrückmeldungen kommen?",
    intro:"E-Mail ist der Standard. WhatsApp kostet 0,06 € pro gesendeter Nachricht; Zwischenstände werden gebündelt.",
    render(){
      return makeChoiceScreen([
        {label:"E-Mail · empfohlen",value:"EMAIL",description:"Keine WhatsApp-Nachrichtengebühr"},
        {label:"WhatsApp · 0,06 €",value:"WHATSAPP",description:"0,06 € pro gesendeter Nachricht"}
      ],value=>{
        executionResultChannel.value=value;
        whatsappExecutionOptIn.value=value==="WHATSAPP"?"true":"false";
        whatsappExecutionFeeCents.value=value==="WHATSAPP"?"6":"";
        saveExecutionResultDraft();
        goNext();
      });
    },
    validate:()=>["EMAIL","WHATSAPP"].includes(executionResultChannel.value)
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
      const postalCode=String((familyMode?recipientPostal:ownerPostal)?.value||"").trim();
      const streetAddress=String((familyMode?recipientStreet:ownerStreet)?.value||"").trim();
      const channel=preferredContact.value==="WHATSAPP"?"WhatsApp":(whatsappEnabled.value==="true"?"App · WhatsApp zusätzlich":"App");
      const checkinValue=String($("checkinTimes")?.value||"").trim();
      const safety=safetyEnabled.checked?(checkinValue?/^\d{2}:\d{2}$/.test(checkinValue)?"Täglich um "+checkinValue+" Uhr":checkinValue:"Ja"):"Nein";
      const summaryRows=[
        ["Für",personName||"—"],
        [familyMode?"PLZ Klient":"PLZ",postalCode||"—"]
      ];
      if(streetAddress)summaryRows.push(["Adresse",streetAddress]);
      const resultChannel=executionResultChannel.value==="WHATSAPP"?"WhatsApp · 0,06 € pro Nachricht":"E-Mail · ohne WhatsApp-Gebühr";
      summaryRows.push(["Hauptkontakt",channel],["Ausführungsrückmeldungen",resultChannel],["Safety-Check-in",safety]);
      for(const [label,value] of summaryRows){
        const row=document.createElement("div");
        const labelNode=document.createElement("span");
        const valueNode=document.createElement("strong");
        labelNode.textContent=label;
        valueNode.textContent=value;
        row.append(labelNode,valueNode);
        summary.append(row);
      }
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
    parkCurrentFields();
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

  if(ownerPostal)ownerPostal.required=!familyMode;
  if(recipientPostal)recipientPostal.required=familyMode;
  setWhatsappEnabled(false);
  saveExecutionResultDraft();
  render();
})();
