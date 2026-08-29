(() => {
  const profiles = [
    ["nilo","Nilo","Klar, ruhig und strukturiert.","cedar","hearing_test","Hallo, ich bin Nilo. Ich würde gerne Ihr persönlicher NAHWERK Concierge werden."],
    ["mira","Mira","Warm, verständlich und aufmerksam.","marin","hearing_test","Hallo, ich bin Mira. Ich begleite Sie aufmerksam, warm und zuverlässig im Alltag."],
    ["lena","Lena","Modern, empathisch und lösungsorientiert.","coral","hearing_test","Hallo, ich bin Lena. Ich helfe Ihnen freundlich, klar und lösungsorientiert weiter."],
    ["lukas","Lukas","Souverän, direkt und zuverlässig.","alloy","hearing_test","Hallo, ich bin Lukas. Ich unterstütze Sie klar, souverän und zuverlässig."],
    ["hartmut","Hartmut","Ruhig, erfahren und geduldig.","ballad","voice_rework","Guten Tag, ich bin Hartmut. Ich begleite Sie ruhig, verständlich und mit Geduld."],
    ["frida","Frida","Herzlich, klar und zugewandt.","sage","voice_rework","Guten Tag, ich bin Frida. Ich bin gern mit Ruhe, Herzlichkeit und Erfahrung für Sie da."],
    ["asha","Asha","Empathisch, aufmerksam und besonnen.","shimmer","hearing_test","Hallo, ich bin Asha. Ich unterstütze Sie aufmerksam, besonnen und freundlich."],
    ["sari","Sari","Freundlich, ruhig und lösungsorientiert.","nova","hearing_test","Hallo, ich bin Sari. Ich helfe Ihnen freundlich, ruhig und lösungsorientiert."],
    ["leyla","Leyla","Warm, direkt und verlässlich.","coral","hearing_test","Hallo, ich bin Leyla. Ich unterstütze Sie warm, direkt und verlässlich."],
    ["noor","Noor","Aufmerksam, feinfühlig und strukturiert.","sage","hearing_test","Hallo, ich bin Noor. Ich begleite Sie aufmerksam, feinfühlig und strukturiert."],
    ["sofia","Sofia","Lebendig, herzlich und klar.","verse","hearing_test","Hallo, ich bin Sofia. Ich helfe Ihnen herzlich, lebendig und klar."],
    ["camille","Camille","Elegant, ruhig und präzise.","marin","hearing_test","Bonjour, ich bin Camille. Ich begleite Sie ruhig, elegant und präzise."],
    ["anna","Anna","Pragmatisch, freundlich und zuverlässig.","nova","hearing_test","Hallo, ich bin Anna. Ich unterstütze Sie pragmatisch, freundlich und zuverlässig."],
    ["olena","Olena","Einfühlsam, klar und ausdauernd.","shimmer","hearing_test","Hallo, ich bin Olena. Ich begleite Sie einfühlsam, klar und ausdauernd."],
    ["mei","Mei","Bedacht, modern und aufmerksam.","sage","hearing_test","Hallo, ich bin Mei. Ich unterstütze Sie bedacht, aufmerksam und präzise."],
    ["amara","Amara","Souverän, herzlich und lösungsstark.","coral","hearing_test","Hallo, ich bin Amara. Ich begleite Sie souverän, herzlich und lösungsstark."],
    ["kwame","Kwame","Gelassen, verbindlich und strukturiert.","cedar","hearing_test","Hallo, ich bin Kwame. Ich unterstütze Sie gelassen, verbindlich und strukturiert."],
    ["zuri","Zuri","Positiv, aufmerksam und klar.","shimmer","hearing_test","Hallo, ich bin Zuri. Ich helfe Ihnen positiv, aufmerksam und klar."],
    ["jabari","Jabari","Ruhig, selbstbewusst und zuverlässig.","onyx","hearing_test","Hallo, ich bin Jabari. Ich begleite Sie ruhig, selbstbewusst und zuverlässig."],
    ["arjun","Arjun","Analytisch, freundlich und lösungsorientiert.","ash","hearing_test","Hallo, ich bin Arjun. Ich unterstütze Sie analytisch, freundlich und lösungsorientiert."],
    ["wei","Wei","Präzise, besonnen und effizient.","echo","hearing_test","Hallo, ich bin Wei. Ich begleite Sie präzise, besonnen und effizient."],
    ["yuki","Yuki","Ruhig, modern und detailbewusst.","marin","hearing_test","Hallo, ich bin Yuki. Ich unterstütze Sie ruhig, modern und detailbewusst."],
    ["ren","Ren","Klar, ausgeglichen und zuverlässig.","alloy","hearing_test","Hallo, ich bin Ren. Ich begleite Sie klar, ausgeglichen und zuverlässig."]
  ].map(([key,name,description,voice,voiceStatus,sampleText]) => ({
    key,name,description,voice,voiceStatus,
    image:`assets/concierges/large/${key}.webp`,
    cardImage:`assets/concierges/card/${key}.webp`,
    largeImage:`assets/concierges/large/${key}.webp`,
    sampleAudio:`assets/concierges/voice-samples/${key}.mp3?v=persona-20260829-1`,
    sampleText
  }));
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
    const loaded = new Set();
    root.dataset.variant=variant;
    root.classList.add("nw-carousel");
    root.setAttribute("role","region");
    root.setAttribute("aria-label",root.dataset.label||"KI-Concierge auswählen");
    root.innerHTML=`<button class="nw-carousel-arrow prev" type="button" aria-label="Vorherigen Concierge anzeigen">‹</button><div class="nw-carousel-stage" tabindex="0" aria-roledescription="Karussell"><div class="nw-carousel-track"></div></div><button class="nw-carousel-arrow next" type="button" aria-label="Nächsten Concierge anzeigen">›</button><div class="nw-carousel-info" aria-live="polite"><h3 class="nw-carousel-name"></h3><p class="nw-carousel-description"></p><p class="nw-carousel-language-note">Concierge und gewünschte Sprache können unabhängig voneinander gewählt werden.</p><p class="nw-carousel-voice-note" hidden></p><div class="nw-carousel-actions"><span class="nw-carousel-voice-host"></span><button class="nw-carousel-status" type="button" hidden>Ausgewählt</button></div></div>${inputName?`<input type="hidden" name="${inputName}" value="${profiles[active].key}">`:""}`;
    const stage=root.querySelector(".nw-carousel-stage"),track=root.querySelector(".nw-carousel-track"),name=root.querySelector(".nw-carousel-name"),description=root.querySelector(".nw-carousel-description"),voiceNote=root.querySelector(".nw-carousel-voice-note"),voiceHost=root.querySelector(".nw-carousel-voice-host"),status=root.querySelector(".nw-carousel-status"),input=inputName?root.querySelector(`[name="${inputName}"]`):null;

    function goToRegistration(index=active){
      if(!registerUrl)return;
      const target=new URL(registerUrl,location.href);
      target.searchParams.set("concierge",profiles[index].key);
      location.href=`${target.pathname.split("/").pop()}${target.search}${target.hash}`;
    }

    const cards=profiles.map((profile,index)=>{
      const card=document.createElement("div");
      card.className="nw-carousel-card"; card.dataset.index=String(index);
      const selectButton=document.createElement("button");
      selectButton.type="button"; selectButton.className="nw-carousel-select";
      selectButton.setAttribute("aria-label",`${profile.name} anzeigen`);
      selectButton.innerHTML=`<img alt="Portrait von ${profile.name}, NAHWERK Concierge" width="480" height="722" decoding="async"><span>${profile.name}</span>`;
      card.appendChild(selectButton);
      const image=selectButton.querySelector("img");
      image.dataset.src=profile.cardImage;
      image.dataset.srcset=`${profile.cardImage} 480w, ${profile.largeImage} 900w`;
      image.dataset.sizes="(max-width: 700px) 52vw, 420px";
      image.addEventListener("load",()=>{card.classList.add("is-image-ready");card.classList.remove("is-image-loading","is-image-error");});
      image.addEventListener("error",()=>{
        if(image.dataset.fallbackUsed!=="1"){
          image.dataset.fallbackUsed="1";
          image.removeAttribute("srcset");
          image.removeAttribute("sizes");
          image.src=profile.largeImage;
          return;
        }
        card.classList.add("is-image-error");card.classList.remove("is-image-loading");
      });
      selectButton.addEventListener("click",()=>{
        if(moved)return;
        if(index===active&&registerUrl){goToRegistration(index);return;}
        select(index,true);
      });
      track.appendChild(card);
      return card;
    });

    function ensureImage(index,priority="auto"){
      const safe=mod(index),card=cards[safe],image=card?.querySelector("img");
      if(!image || loaded.has(safe) || image.src) return;
      loaded.add(safe);
      card.classList.add("is-image-loading");
      image.loading=priority==="high"?"eager":"lazy";
      if("fetchPriority" in image) image.fetchPriority=priority;
      if(image.dataset.srcset) image.srcset=image.dataset.srcset;
      if(image.dataset.sizes) image.sizes=image.dataset.sizes;
      image.src=image.dataset.src;
      if(priority==="high") image.decode?.().catch(()=>{});
    }

    function warmWindow(center=active){
      ensureImage(center,"high");
      ensureImage(center-1,"high");
      ensureImage(center+1,"high");
      ensureImage(center-2,"auto");
      ensureImage(center+2,"auto");
    }

    function measureSpacing(){const raw=getComputedStyle(root).getPropertyValue("--nw-carousel-space").trim(),probe=document.createElement("div");probe.style.cssText=`position:absolute;visibility:hidden;width:${raw}`;root.appendChild(probe);const value=probe.getBoundingClientRect().width;probe.remove();return value||220;}
    let cardSpacing=measureSpacing();

    function positionCards(){
      const gap=cardSpacing;
      cards.forEach((card,index)=>{
        const relative=circularDelta(active,index),x=relative*gap+dragX,distance=Math.abs(x/gap),scale=Math.max(.56,1-distance*.2),opacity=distance>3.6?0:Math.max(.28,1-distance*.2);
        card.style.setProperty("--nw-card-x",`${x}px`);
        card.style.setProperty("--nw-card-scale",String(scale));
        card.style.opacity=String(opacity);
        card.style.zIndex=String(30-Math.round(distance*3));
        card.style.pointerEvents=distance>3.6?"none":"auto";
        card.classList.toggle("is-near",distance<=2.2);
        const isActive=index===active,selectButton=card.querySelector(".nw-carousel-select");
        card.classList.toggle("is-active",isActive);
        selectButton.setAttribute("aria-pressed",isActive?"true":"false");
        selectButton.tabIndex=distance<=3.6?0:-1;
        selectButton.setAttribute("aria-label",isActive&&registerUrl?`${profiles[index].name} auswählen und registrieren`:`${profiles[index].name} anzeigen`);
        selectButton.title=isActive&&registerUrl?`${profiles[index].name} auswählen und registrieren`:`${profiles[index].name} anzeigen`;
        if(distance<=2.2) ensureImage(index,isActive||distance<=1.05?"high":"auto");
      });
    }

    function renderVoice(profile){
      window.NAHWERKVoicePreview?.stopAll();
      voiceHost.replaceChildren();
      const control=window.NAHWERKVoicePreview?.createControl(profile,{className:"nw-carousel-voice"});
      if(control) voiceHost.appendChild(control);
    }

    function updateInfo(emit=false){
      const profile=profiles[active]; name.textContent=profile.name; description.textContent=profile.description;
      const provisional=profile.voiceStatus!=="approved";
      voiceNote.hidden=!provisional;
      voiceNote.textContent=profile.voiceStatus==="voice_rework"?"Diese Stimme wird neu ausgewählt und ist vorübergehend nicht abspielbar.":provisional?"Die Hörprobe ist noch nicht final freigegeben.":"";
      status.hidden=variant!=="selection"&&!registerUrl;
      status.textContent=registerUrl?"Registrieren":"Ausgewählt";
      status.disabled=!registerUrl;
      renderVoice(profile);
      if(input&&input.value!==profile.key){input.value=profile.key;if(emit){input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));}}
      if(emit) root.dispatchEvent(new CustomEvent("conciergechange",{bubbles:true,detail:profile}));
    }

    function select(target,emit=false){
      const numeric=typeof target==="number",index=numeric?target:profiles.indexOf(byKey[target]);
      if(!numeric&&index<0)return;
      const next=mod(index);
      if(next===active&&dragX===0)return;
      window.NAHWERKVoicePreview?.stopAll();
      active=next; dragX=0; warmWindow(active); positionCards(); updateInfo(emit);
    }

    const move=(direction,emit=false)=>select(active+direction,emit);
    root.querySelector(".prev").addEventListener("click",()=>move(-1,true));
    root.querySelector(".next").addEventListener("click",()=>move(1,true));
    status.addEventListener("click",()=>goToRegistration());
    stage.addEventListener("keydown",event=>{if(event.key==="ArrowLeft"){event.preventDefault();move(-1,true);}if(event.key==="ArrowRight"){event.preventDefault();move(1,true);}if(event.key==="Home"){event.preventDefault();select(0,true);}if(event.key==="End"){event.preventDefault();select(profiles.length-1,true);}});
    stage.addEventListener("pointerdown",event=>{if(event.target.closest(".nw-voice-preview-control"))return;dragging=true;moved=false;pointerStart=event.clientX;dragX=0;stage.classList.add("is-dragging");stage.setPointerCapture?.(event.pointerId);});
    stage.addEventListener("pointermove",event=>{if(!dragging)return;dragX=event.clientX-pointerStart;moved||=Math.abs(dragX)>6;positionCards();});
    const finishDrag=()=>{if(!dragging)return;dragging=false;stage.classList.remove("is-dragging");const steps=Math.round(-dragX/Math.max(1,cardSpacing));if(steps)select(active+steps,true);else{dragX=0;positionCards();}setTimeout(()=>{moved=false;},0);};
    stage.addEventListener("pointerup",finishDrag); stage.addEventListener("pointercancel",finishDrag);
    stage.addEventListener("wheel",event=>{if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)||wheelLock)return;event.preventDefault();wheelLock=true;move(event.deltaX>0?1:-1,true);setTimeout(()=>{wheelLock=false;},280);},{passive:false});

    let resizeFrame=0;
    addEventListener("resize",()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{cardSpacing=measureSpacing();positionCards();});},{passive:true});

    const api={select:key=>{if(byKey[key])select(key,true);},get selected(){return profiles[active];}};
    root._nahwerkCarousel=api;
    warmWindow(active);
    positionCards();
    updateInfo();
    return api;
  }

  function autoMount(scope=document){scope.querySelectorAll("[data-concierge-carousel]").forEach(root=>mount(root));}
  window.NAHWERK_CONCIERGES=profiles; window.NAHWERKCarousel={profiles,byKey,mount,autoMount,circularDelta};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>autoMount());else autoMount();
})();