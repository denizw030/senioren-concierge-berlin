(() => {
  const languageCatalog = {
    de:"Deutsch", en:"English", es:"Español", hi:"हिन्दी", id:"Bahasa Indonesia",
    tr:"Türkçe", ar:"العربية", fr:"Français", pl:"Polski", uk:"Українська",
    zh:"中文", tw:"Twi", sw:"Kiswahili", pa:"ਪੰਜਾਬੀ", ja:"日本語"
  };
  const profiles = [
    ["nilo","Nilo","Warm, ruhig, modern und strukturiert.","cedar","approved","Hola, ich bin Nilo.","es"],
    ["mira","Mira","Jung, elegant, warm und aufmerksam.","marin","hearing_test","Hola, ich bin Mira.","es"],
    ["lena","Lena","Warm, empathisch, natürlich und zugänglich.","coral","hearing_test","Hallo, ich bin Lena.","de"],
    ["lukas","Lukas","Souverän, ruhig, direkt und modern.","alloy","hearing_test","Hallo, ich bin Lukas.","de"],
    ["hartmut","Hartmut","Tief, voll, erfahren, würdevoll und ruhig.","onyx","approved","Guten Tag, ich bin Hartmut.","de"],
    ["frida","Frida","Reif, warm, würdevoll, ruhig und nicht gebrechlich.","sage","hearing_test","Guten Tag, ich bin Frida.","de"],
    ["asha","Asha","Jung, hell-modern, warm und selbstbewusst.","shimmer","hearing_test","Namaste, ich bin Asha.","hi"],
    ["sari","Sari","Sanft-modern, freundlich und aufmerksam.","coral","hearing_test","Halo, ich bin Sari.","id"],
    ["leyla","Leyla","Elegant, selbstbewusst, warm und modern.","marin","hearing_test","Merhaba, ich bin Leyla.","tr"],
    ["noor","Noor","Ruhig, elegant, diskret und aufmerksam.","sage","hearing_test","Marhaba, ich bin Noor.","ar"],
    ["sofia","Sofia","Lebendig, jung, warm und herzlich.","shimmer","hearing_test","Hola, ich bin Sofia.","es"],
    ["camille","Camille","Elegant, modern, kultiviert und präzise.","marin","hearing_test","Bonjour, ich bin Camille.","fr"],
    ["anna","Anna","Warm, praktisch, klar und zuverlässig.","coral","hearing_test","Dzień dobry, ich bin Anna.","pl"],
    ["olena","Olena","Ruhig, warm, modern und einfühlsam.","shimmer","hearing_test","Pryvit, ich bin Olena.","uk"],
    ["mei","Mei","Ruhig, präzise, modern und bedacht.","sage","hearing_test","Nǐ hǎo, ich bin Mei.","zh"],
    ["amara","Amara","Warm, souverän, modern und herzlich.","coral","hearing_test","Akwaaba, ich bin Amara.","tw"],
    ["kwame","Kwame","Geerdet, ruhig, warm und souverän.","cedar","hearing_test","Akwaaba, ich bin Kwame.","tw"],
    ["zuri","Zuri","Modern, lebendig, warm und aufmerksam.","shimmer","hearing_test","Jambo, ich bin Zuri.","sw"],
    ["jabari","Jabari","Selbstbewusst, ruhig, direkt und zuverlässig.","alloy","hearing_test","Jambo, ich bin Jabari.","sw"],
    ["arjun","Arjun","Geerdet, warm, souverän und analytisch.","cedar","hearing_test","Sat Sri Akal, ich bin Arjun.","pa"],
    ["wei","Wei","Ruhig, kultiviert, zurückhaltend und präzise.","ballad","hearing_test","Nǐ hǎo, ich bin Wei.","zh"],
    ["yuki","Yuki","Jung, freundlich, klar und modern.","marin","hearing_test","Konnichiwa, ich bin Yuki.","ja"],
    ["ren","Ren","Ruhig, modern, männlich und präzise.","alloy","hearing_test","Konnichiwa, ich bin Ren.","ja"]
  ].map(([key,name,description,voice,voiceStatus,sampleText,nativeLanguage]) => {
    const previewLanguageCodes=[...new Set([nativeLanguage,"de","en"])];
    const sampleAudioByLanguage=Object.fromEntries(previewLanguageCodes.map(code=>[
      code,`assets/concierges/voice-samples/${key}-${code}.mp3?v=multilingual-20260829-1`
    ]));
    return {
      key,name,description,voice,voiceStatus,sampleText,nativeLanguage,
      nativeLanguageLabel:languageCatalog[nativeLanguage]||nativeLanguage,
      image:`assets/concierges/large/${key}.webp`,
      cardImage:`assets/concierges/card/${key}.webp`,
      largeImage:`assets/concierges/large/${key}.webp`,
      sampleAudio:sampleAudioByLanguage[nativeLanguage],
      sampleAudioByLanguage,
      previewLanguages:previewLanguageCodes.map(code=>({code,label:languageCatalog[code]||code}))
    };
  });
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
    root.innerHTML=`<button class="nw-carousel-arrow prev" type="button" aria-label="Vorherigen Concierge anzeigen">‹</button><div class="nw-carousel-stage" tabindex="0" aria-roledescription="Karussell"><div class="nw-carousel-track"></div></div><button class="nw-carousel-arrow next" type="button" aria-label="Nächsten Concierge anzeigen">›</button><div class="nw-carousel-info" aria-live="polite"><h3 class="nw-carousel-name"></h3><p class="nw-carousel-description"></p><p class="nw-carousel-language-note">Die Hörprobe startet in der Herkunftssprache. Die Sprache können Sie direkt darunter wechseln.</p><p class="nw-carousel-voice-note" hidden></p><div class="nw-carousel-actions"><span class="nw-carousel-voice-host"></span><button class="nw-carousel-status" type="button" hidden>Ausgewählt</button></div></div>${inputName?`<input type="hidden" name="${inputName}" value="${profiles[active].key}">`:""}`;
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
      const selectButton=document.createElement(registerUrl?"a":"button");
      if(registerUrl){
        const target=new URL(registerUrl,location.href);
        target.searchParams.set("concierge",profile.key);
        selectButton.href=`${target.pathname.split("/").pop()}${target.search}${target.hash}`;
      }else{
        selectButton.type="button";
      }
      selectButton.className="nw-carousel-select";
      selectButton.setAttribute("aria-label",registerUrl?`${profile.name} auswählen und registrieren`:`${profile.name} anzeigen`);
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
      selectButton.addEventListener("click",event=>{
        if(moved){event.preventDefault();return;}
        if(registerUrl)return;
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
        selectButton.setAttribute("aria-label",registerUrl?`${profiles[index].name} auswählen und registrieren`:`${profiles[index].name} anzeigen`);
        selectButton.title=registerUrl?`${profiles[index].name} auswählen und registrieren`:`${profiles[index].name} anzeigen`;
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
      voiceNote.textContent=provisional?"Die Hörprobe ist noch nicht final freigegeben.":"";
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
    stage.addEventListener("pointerdown",event=>{if(event.target.closest(".nw-voice-preview-control"))return;dragging=true;moved=false;pointerStart=event.clientX;dragX=0;stage.classList.add("is-dragging");if(!event.target.closest("a.nw-carousel-select"))stage.setPointerCapture?.(event.pointerId);});
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