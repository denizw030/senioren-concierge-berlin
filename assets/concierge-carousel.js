(() => {
  const profiles = [
    ["nilo","Nilo","NAHWERK-Concierge-Nilo.png","Klar, ruhig und strukturiert."],["mira","Mira","MIRA-Spanisch-NAHWERK-Concierge.png","Warm, verständlich und aufmerksam."],["lena","Lena","NAHWERK-Concierge-Lena.png","Modern, empathisch und lösungsorientiert."],["lukas","Lukas","NAHWERK-Concierge-Lukas.png","Souverän, direkt und zuverlässig."],["hartmut","Hartmut","HARTMUT-Deutsch-NAHWERK-Concierge.png","Ruhig, erfahren und geduldig."],["frida","Frida","FRIDA-Deutsch-NAHWERK-Concierge.png","Herzlich, klar und zugewandt."],["asha","Asha","ASHA-HINDI-NAHWERK-Concierge.png","Empathisch, aufmerksam und besonnen."],["sari","Sari","SARI-Indonesisch-NAHWERK-Concierge.png","Freundlich, ruhig und lösungsorientiert."],["leyla","Leyla","LEYLA-Tuerkisch-NAHWERK-Concierge.png","Warm, direkt und verlässlich."],["noor","Noor","NOOR-Levantisch-Arabisch-NAHWERK-Concierge.png","Aufmerksam, feinfühlig und strukturiert."],["sofia","Sofia","SOFIA-Spanisch-Mediterran-NAHWERK-Concierge.png","Lebendig, herzlich und klar."],["camille","Camille","CAMILLE-Franzoesisch-NAHWERK-Concierge.png","Elegant, ruhig und präzise."],["anna","Anna","ANNA-Polnisch-NAHWERK-Concierge.png","Pragmatisch, freundlich und zuverlässig."],["olena","Olena","OLENA_Ukrainisch-NAHWERK-Concierge.png","Einfühlsam, klar und ausdauernd."],["mei","Mei","MEI-Chinesisch-NAHWERK-Concierge.png","Bedacht, modern und aufmerksam."],["amara","Amara","AMARA-Ghanisch-NAHWERK-Concierge.png","Souverän, herzlich und lösungsstark."],["kwame","Kwame","KWAME-Ghanisch-NAHWERK-Concierge.png","Gelassen, verbindlich und strukturiert."],["zuri","Zuri","ZURI-Kenianisch-NAHWERK-Concierge.png","Positiv, aufmerksam und klar."],["jabari","Jabari","JABARI-Kenianisch-NAHWERK-Concierge.png","Ruhig, selbstbewusst und zuverlässig."],["arjun","Arjun","ARJUN-Indisch-NAHWERK-Concierge.png","Analytisch, freundlich und lösungsorientiert."],["wei","Wei","WEI-Chinesisch-NAHWERK-Concierge.png","Präzise, besonnen und effizient."],["yuki","Yuki","JUKI-Japanisch-NAHWERK-Concierge.png","Ruhig, modern und detailbewusst."],["ren","Ren","REN-Japanisch-NAHWERK-Concierge.png","Klar, ausgeglichen und zuverlässig."]
  ].map(([key,name,file,description]) => ({key,name,image:`assets/${file}`,description}));
  const byKey = Object.fromEntries(profiles.map(profile => [profile.key,profile]));
  const mod = value => (value % profiles.length + profiles.length) % profiles.length;
  const circularDelta = (from,to) => { let delta=mod(to-from); if(delta>Math.floor(profiles.length/2)) delta-=profiles.length; return delta; };

  function mount(root,options={}) {
    if(!root || root.dataset.carouselReady==="1") return root?._nahwerkCarousel;
    root.dataset.carouselReady="1";
    const variant=options.variant||root.dataset.variant||"presentation";
    const inputName=options.inputName||root.dataset.inputName||"";
    const registerUrl=options.registerUrl||root.dataset.registerUrl||"";
    const requested=options.selected||root.dataset.selected||"nilo";
    let active=Math.max(0,profiles.findIndex(profile=>profile.key===requested));
    let dragX=0,pointerStart=0,dragging=false,moved=false,wheelLock=false;
    root.dataset.variant=variant;
    root.classList.add("nw-carousel");
    root.setAttribute("role","region");
    root.setAttribute("aria-label",root.dataset.label||"KI-Concierge auswählen");
    root.innerHTML=`<button class="nw-carousel-arrow prev" type="button" aria-label="Vorherigen Concierge anzeigen">‹</button><div class="nw-carousel-stage" tabindex="0" aria-roledescription="Karussell"><div class="nw-carousel-track"></div></div><button class="nw-carousel-arrow next" type="button" aria-label="Nächsten Concierge anzeigen">›</button><div class="nw-carousel-info" aria-live="polite"><h3 class="nw-carousel-name"></h3><p class="nw-carousel-description"></p><p class="nw-carousel-language-note">Concierge und gewünschte Sprache können unabhängig voneinander gewählt werden.</p><button class="nw-carousel-status" type="button" hidden>Ausgewählt</button></div>${inputName?`<input type="hidden" name="${inputName}" value="${profiles[active].key}">`:""}`;
    const stage=root.querySelector(".nw-carousel-stage"),track=root.querySelector(".nw-carousel-track"),name=root.querySelector(".nw-carousel-name"),description=root.querySelector(".nw-carousel-description"),status=root.querySelector(".nw-carousel-status"),input=inputName?root.querySelector(`[name="${inputName}"]`):null;

    function goToRegistration(index=active){
      if(!registerUrl)return;
      const separator=registerUrl.includes("?")?"&":"?";
      location.href=`${registerUrl}${separator}concierge=${encodeURIComponent(profiles[index].key)}`;
    }
    const cards=profiles.map((profile,index)=>{
      const card=document.createElement("button");
      card.type="button"; card.className="nw-carousel-card"; card.dataset.index=String(index);
      card.setAttribute("aria-label",`${profile.name} anzeigen`);
      card.innerHTML=`<img src="${profile.image}" alt="Portrait von ${profile.name}, NAHWERK Concierge" width="900" height="1200" loading="lazy" decoding="async"><span>${profile.name}</span>`;
      card.addEventListener("click",()=>{
        if(moved)return;
        if(index===active&&registerUrl){goToRegistration(index);return;}
        select(index,true);
      });
      track.appendChild(card);
      return card;
    });

    function measureSpacing(){const raw=getComputedStyle(root).getPropertyValue("--nw-carousel-space").trim(),probe=document.createElement("div");probe.style.cssText=`position:absolute;visibility:hidden;width:${raw}`;root.appendChild(probe);const value=probe.getBoundingClientRect().width;probe.remove();return value||220;}
    let cardSpacing=measureSpacing();
    function positionCards(){
      const gap=cardSpacing;
      cards.forEach((card,index)=>{
        const relative=circularDelta(active,index),x=relative*gap+dragX,distance=Math.abs(x/gap),scale=Math.max(.56,1-distance*.2),opacity=distance>3.6?0:Math.max(.28,1-distance*.2);
        card.style.transform=`translate3d(calc(-50% + ${x}px),-50%,0) scale(${scale})`;
        card.style.opacity=String(opacity); card.style.zIndex=String(30-Math.round(distance*3)); card.style.filter=distance>2.3?"saturate(.72)":"none"; card.style.pointerEvents=distance>3.6?"none":"auto";
        card.classList.toggle("is-active",index===active); card.setAttribute("aria-pressed",index===active?"true":"false"); card.tabIndex=distance<=3.6?0:-1;
        if(distance<=2){const image=card.querySelector("img");image.loading="eager";image.decode?.().catch(()=>{});}
      });
    }
    function updateInfo(emit=false){
      const profile=profiles[active]; name.textContent=profile.name; description.textContent=profile.description;
      status.hidden=variant!=="selection"&&!registerUrl;
      status.textContent=registerUrl?"Registrieren":"Ausgewählt";
      status.disabled=!registerUrl;
      if(input&&input.value!==profile.key){input.value=profile.key;if(emit){input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));}}
      if(emit) root.dispatchEvent(new CustomEvent("conciergechange",{bubbles:true,detail:profile}));
    }
    function select(target,emit=false){const numeric=typeof target==="number",index=numeric?target:profiles.indexOf(byKey[target]);if(!numeric&&index<0)return;const next=mod(index);if(next===active&&dragX===0)return;active=next;dragX=0;positionCards();updateInfo(emit);}
    const move=(direction,emit=false)=>select(active+direction,emit);
    root.querySelector(".prev").addEventListener("click",()=>move(-1,true)); root.querySelector(".next").addEventListener("click",()=>move(1,true)); status.addEventListener("click",()=>goToRegistration());
    stage.addEventListener("keydown",event=>{if(event.key==="ArrowLeft"){event.preventDefault();move(-1,true);}if(event.key==="ArrowRight"){event.preventDefault();move(1,true);}if(event.key==="Home"){event.preventDefault();select(0,true);}if(event.key==="End"){event.preventDefault();select(profiles.length-1,true);}});
    stage.addEventListener("pointerdown",event=>{dragging=true;moved=false;pointerStart=event.clientX;dragX=0;stage.classList.add("is-dragging");stage.setPointerCapture?.(event.pointerId);});
    stage.addEventListener("pointermove",event=>{if(!dragging)return;dragX=event.clientX-pointerStart;moved||=Math.abs(dragX)>6;positionCards();});
    const finishDrag=()=>{if(!dragging)return;dragging=false;stage.classList.remove("is-dragging");const steps=Math.round(-dragX/Math.max(1,cardSpacing));if(steps)select(active+steps,true);else{dragX=0;positionCards();}setTimeout(()=>{moved=false;},0);};
    stage.addEventListener("pointerup",finishDrag); stage.addEventListener("pointercancel",finishDrag);
    stage.addEventListener("wheel",event=>{if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)||wheelLock)return;event.preventDefault();wheelLock=true;move(event.deltaX>0?1:-1,true);setTimeout(()=>{wheelLock=false;},280);},{passive:false});
    addEventListener("resize",()=>{cardSpacing=measureSpacing();positionCards();},{passive:true});
    const api={select:key=>{if(byKey[key])select(key,true);},get selected(){return profiles[active];}};
    root._nahwerkCarousel=api; positionCards(); updateInfo(); return api;
  }
  function autoMount(scope=document){scope.querySelectorAll("[data-concierge-carousel]").forEach(root=>mount(root));}
  window.NAHWERK_CONCIERGES=profiles; window.NAHWERKCarousel={profiles,byKey,mount,autoMount,circularDelta};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>autoMount());else autoMount();
})();
