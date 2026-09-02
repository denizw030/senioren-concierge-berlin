import { test, expect } from "@playwright/test";

const surfaces=["/index.html","/prime-concierge.html","/senioren-concierge.html","/registrieren.html"];
const viewports=[
  {name:"desktop",width:1440,height:1000},
  {name:"tablet",width:1024,height:900},
  {name:"mobile",width:390,height:844}
];

for(const viewport of viewports){
  for(const surface of surfaces){
    test(`${viewport.name} ${surface} renders voice controls without browser errors`,async({page})=>{
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      const errors=[];
      page.on("pageerror",error=>errors.push(String(error)));
      page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
      await page.goto(`http://127.0.0.1:4173${surface}`,{waitUntil:"networkidle"});
      const voiceButtons=page.locator(".nw-voice-preview-button");
      if(await voiceButtons.count()===0){const diag=await page.evaluate(()=>({root:!!document.querySelector("[data-concierge-carousel]"),carousel:!!window.NAHWERKCarousel,voice:!!window.NAHWERKVoicePreview}));console.log("VOICE_DIAG",surface,diag,errors);}
      await expect(voiceButtons.first()).toBeVisible();
      expect(await page.locator("button button").count()).toBe(0);
      const box=await page.locator(".nw-voice-preview-button").first().boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({path:`test-results/screenshots/${viewport.name}-${surface.replaceAll("/","_")}.png`,fullPage:true});
      expect(errors).toEqual([]);
    });
  }
}


test("world page renders region controls without browser errors",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error)));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
  await page.goto("http://127.0.0.1:4173/concierges.html",{waitUntil:"networkidle"});
  await expect(page.locator(".co-region-button")).toHaveCount(6);
  expect(errors).toEqual([]);
});

for(const viewport of [
  {name:"desktop",width:1440,height:1000},
  {name:"mobile",width:390,height:844}
]){
  test(`${viewport.name} overview and personal concierge keep their page-specific initial profiles`,async({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});

    await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
    const overview=page.locator("[data-concierge-carousel]");
    await expect(overview).toHaveCount(1);
    expect(await overview.evaluate(el=>el._nahwerkCarousel.selected.key)).toBe("lena");
    await overview.locator(".nw-carousel-arrow.next").click();
    expect(await overview.evaluate(el=>el._nahwerkCarousel.selected.key)).not.toBe("lena");
    await page.waitForTimeout(150);
    expect(await overview.evaluate(el=>el._nahwerkCarousel.selected.key)).not.toBe("lena");
    await page.reload({waitUntil:"networkidle"});
    expect(await page.locator("[data-concierge-carousel]").evaluate(el=>el._nahwerkCarousel.selected.key)).toBe("lena");

    await page.goto("http://127.0.0.1:4173/prime-concierge.html",{waitUntil:"networkidle"});
    const prime=page.locator("[data-concierge-carousel]");
    await expect(prime).toHaveCount(2);
    expect(await prime.evaluateAll(els=>els.map(el=>el._nahwerkCarousel.selected.key))).toEqual(["leyla","leyla"]);
    await prime.first().locator(".nw-carousel-arrow.next").click();
    expect(await prime.first().evaluate(el=>el._nahwerkCarousel.selected.key)).not.toBe("leyla");
    await page.waitForTimeout(150);
    expect(await prime.first().evaluate(el=>el._nahwerkCarousel.selected.key)).not.toBe("leyla");
    await page.reload({waitUntil:"networkidle"});
    expect(await page.locator("[data-concierge-carousel]").evaluateAll(els=>els.map(el=>el._nahwerkCarousel.selected.key))).toEqual(["leyla","leyla"]);
  });
}

test("telephone agent is visibly Alexander on public surfaces and account selector",async({request})=>{
  for(const surface of ["/index.html","/prime-concierge.html","/senioren-concierge.html","/konto.html"]){
    const response=await request.get(`http://127.0.0.1:4173${surface}`);
    expect(response.status()).toBe(200);
    const html=await response.text();
    expect(html,surface).toContain("Alexander");
    expect(html,surface).not.toMatch(/>\s*James\s*</);
    expect(html,surface).not.toContain('alt="James,');
  }
});

test("all current product image and audio assets return successfully",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const result=await page.evaluate(async()=>{
    const profiles=window.NAHWERKCarousel.profiles;
    const checks=[];
    for(const profile of profiles){
      for(const [kind,url] of [["card",profile.cardImage],["large",profile.largeImage],["audio",profile.sampleAudio]]){
        const response=await fetch(url,{cache:"no-store"});
        checks.push({key:profile.key,kind,status:response.status,bytes:(await response.arrayBuffer()).byteLength});
      }
    }
    return {count:profiles.length,checks};
  });
  expect(result.count).toBe(23);
  for(const check of result.checks){
    expect(check.status,`${check.key} ${check.kind}`).toBe(200);
    expect(check.bytes,`${check.key} ${check.kind}`).toBeGreaterThan(1000);
  }
});

test("Nilo, Mira, Jabari and Arjun can start and stop their mapped samples",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  for(const key of ["nilo","mira","jabari","arjun"]){
    await page.locator("[data-concierge-carousel]").evaluate((root,key)=>root._nahwerkCarousel.select(key),key);
    const button=page.locator(`.nw-voice-preview-control[data-concierge-key="${key}"] .nw-voice-preview-button`);
    await button.click();
    await expect(button).toHaveAttribute("data-state","playing",{timeout:5000});
    await button.click();
    await expect(button).toHaveAttribute("data-state","stopped");
  }
});

test("starting another sample stops the previous one",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const root=page.locator("[data-concierge-carousel]");
  await root.evaluate(el=>el._nahwerkCarousel.select("nilo"));
  const nilo=page.locator('[data-concierge-key="nilo"] .nw-voice-preview-button');
  await nilo.click();
  await expect(nilo).toHaveAttribute("data-state","playing",{timeout:5000});
  await root.evaluate(el=>el._nahwerkCarousel.select("mira"));
  await expect(page.locator('[data-concierge-key="nilo"] .nw-voice-preview-button')).toHaveCount(0);
  const mira=page.locator('[data-concierge-key="mira"] .nw-voice-preview-button');
  await mira.click();
  await expect(mira).toHaveAttribute("data-state","playing",{timeout:5000});
});

test("voice click never changes registration selection, normal selection still works",async({page})=>{
  await page.goto("http://127.0.0.1:4173/registrieren.html",{waitUntil:"networkidle"});
  const input=page.locator('input[name="conciergeChoice"]');
  const before=await input.inputValue();
  await page.locator('[data-concierge-key="nilo"] .nw-voice-preview-button').click();
  expect(await input.inputValue()).toBe(before);
  await page.locator(".nw-carousel-arrow.next").click();
  expect(await input.inputValue()).not.toBe(before);
});

test("provisional voices are explicitly labelled as test voices",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const root=page.locator("[data-concierge-carousel]");
  for(const key of ["jabari","arjun"]){
    await root.evaluate((el,key)=>el._nahwerkCarousel.select(key),key);
    const control=page.locator(`.nw-voice-preview-control[data-concierge-key="${key}"]`);
    await expect(control).toHaveAttribute("data-provisional","true");
    await expect(control.locator(".nw-voice-preview-badge")).toHaveText("Test");
  }
});


test("protected concierge settings keeps voice integration in source",async({request})=>{
  const response=await request.get("http://127.0.0.1:4173/concierge-anpassen.html");
  expect(response.status()).toBe(200);
  const html=await response.text();
  expect(html).toContain("data-concierge-carousel");
  expect(html).toContain("concierge-voice-preview.js");
  expect(html).toContain("concierge-carousel.js");
});

test("audition exposes 23 runtime personas plus Lars reserve with correct approval state",async({page})=>{
  await page.goto("http://127.0.0.1:4173/voice-audition.html",{waitUntil:"networkidle"});
  const cards=page.locator(".voice-audition-card");
  const controls=page.locator(".voice-audition-card .nw-voice-preview-control");
  await expect(cards).toHaveCount(24);
  await expect(controls).toHaveCount(24);

  for(const key of ["nilo","hartmut"]){
    const card=page.locator(`.voice-audition-card[data-key="${key}"]`);
    const control=card.locator(".nw-voice-preview-control");
    await expect(card.locator(".voice-status")).toHaveText("Approved");
    await expect(control).not.toHaveAttribute("data-provisional","true");
    await expect(control.locator(".nw-voice-preview-button")).toBeEnabled();
  }

  for(const key of ["frida","lukas","mira"]){
    const card=page.locator(`.voice-audition-card[data-key="${key}"]`);
    const control=card.locator(".nw-voice-preview-control");
    await expect(card.locator(".voice-status")).toHaveText("Test");
    await expect(control).toHaveAttribute("data-provisional","true");
    await expect(control.locator(".nw-voice-preview-button")).toBeEnabled();
  }

  const larsCard=page.locator('.voice-audition-card[data-key="lars"]');
  await expect(larsCard).toHaveClass(/is-reserve/);
  await expect(larsCard.locator(".voice-status")).toContainText("Reserve");
  const lars=larsCard.locator(".nw-voice-preview-button");
  await lars.click();
  await expect(lars).toHaveAttribute("data-state","playing",{timeout:5000});
  await lars.click();
  await expect(lars).toHaveAttribute("data-state","stopped");
});

test("all 23 runtime MP3s and Lars reserve return successfully",async({page})=>{
  await page.goto("http://127.0.0.1:4173/voice-audition.html",{waitUntil:"networkidle"});
  const result=await page.evaluate(async()=>{
    const profiles=[...window.NAHWERK_CONCIERGES,{
      key:"lars",
      sampleAudio:"assets/voice/samples/lars.mp3?v=reserve-20260829-1"
    }];
    const checks=[];
    for(const profile of profiles){
      const response=await fetch(profile.sampleAudio,{cache:"no-store"});
      checks.push({key:profile.key,status:response.status,bytes:(await response.arrayBuffer()).byteLength});
    }
    return checks;
  });
  expect(result).toHaveLength(24);
  for(const check of result){
    expect(check.status,check.key).toBe(200);
    expect(check.bytes,check.key).toBeGreaterThan(20000);
  }
});

test("senior page keeps both page-specific carousel starts",async({page})=>{
  await page.setViewportSize({width:1024,height:900});
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  const intro=page.locator('[data-concierge-carousel][data-label="Persönliche NAHWERK Concierges für Senioren"]');
  const selection=page.locator(".senior-concierge-selection [data-concierge-carousel]");
  await expect(intro).toHaveCount(1);
  await expect(selection).toHaveCount(1);
  expect(await intro.evaluate(el=>el._nahwerkCarousel.selected.key)).toBe("hartmut");
  expect(await selection.evaluate(el=>el._nahwerkCarousel.selected.key)).toBe("frida");
  await expect(intro.locator(".nw-carousel-card.is-active")).toContainText("Hartmut");
  await expect(selection.locator(".nw-carousel-card.is-active")).toContainText("Frida");
  const frida=selection.locator('.nw-voice-preview-control[data-concierge-key="frida"]');
  await expect(frida).toHaveAttribute("data-provisional","true");
  await expect(frida.locator(".nw-voice-preview-button")).toBeEnabled();
  await expect(frida.locator(".nw-voice-preview-badge")).toHaveText("Test");
  await page.screenshot({path:"test-results/screenshots/tablet-senior-carousel-starts.png",fullPage:true});
});

for(const surface of ["/index.html","/prime-concierge.html","/senioren-concierge.html","/concierges.html","/registrieren.html"]){
  test(`tablet menu keeps scroll position on ${surface}`,async({page})=>{
    await page.setViewportSize({width:1024,height:900});
    await page.goto(`http://127.0.0.1:4173${surface}`,{waitUntil:"networkidle"});
    await page.evaluate(()=>{
      document.documentElement.style.scrollBehavior="auto";
      window.scrollTo(0,Math.min(700,document.documentElement.scrollHeight-window.innerHeight-50));
    });
    await page.waitForTimeout(50);
    const before=await page.evaluate(()=>window.scrollY);
    const header=page.locator("header.top");
    const toggle=page.locator(".nav-toggle");
    await expect(header).toBeVisible();
    await expect(toggle).toBeVisible();
    const headerBox=await header.boundingBox();
    expect(headerBox.y).toBeGreaterThanOrEqual(-2);
    expect(headerBox.y).toBeLessThanOrEqual(2);
    const toggleBox=await toggle.boundingBox();
    await page.mouse.click(toggleBox.x+toggleBox.width/2,toggleBox.y+toggleBox.height/2);
    await expect(toggle).toHaveAttribute("aria-expanded","true");
    await expect(page.locator(".links")).toHaveClass(/is-open/);
    const opened=await page.evaluate(()=>window.scrollY);
    expect(Math.abs(opened-before)).toBeLessThanOrEqual(2);
    const toggleBoxOpen=await toggle.boundingBox();
    await page.mouse.click(toggleBoxOpen.x+toggleBoxOpen.width/2,toggleBoxOpen.y+toggleBoxOpen.height/2);
    await expect(toggle).toHaveAttribute("aria-expanded","false");
    const closed=await page.evaluate(()=>window.scrollY);
    expect(Math.abs(closed-before)).toBeLessThanOrEqual(2);
  });
}

test("carousel shell clips images uniformly and registration is optically centered",async({page})=>{
  await page.setViewportSize({width:1024,height:900});
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  const style=await page.locator(".senior-concierge-selection .nw-carousel-card.is-active").evaluate(card=>{
    const image=card.querySelector("img");
    const button=document.querySelector(".nw-carousel-status");
    const cs=getComputedStyle(card),is=getComputedStyle(image),bs=getComputedStyle(button);
    return {
      radius:cs.borderRadius,
      overflow:cs.overflow,
      imageRadius:is.borderRadius,
      imageFit:is.objectFit,
      display:bs.display,
      align:bs.alignItems,
      justify:bs.justifyContent,
      height:button.getBoundingClientRect().height
    };
  });
  expect(style.radius).toBe("28px");
  expect(style.overflow).toBe("hidden");
  expect(style.imageRadius).toBe("0px");
  expect(style.imageFit).toBe("cover");
  expect(style.display).toBe("flex");
  expect(style.align).toBe("center");
  expect(style.justify).toBe("center");
  expect(style.height).toBeGreaterThanOrEqual(44);
});

test("NAHWERK wordmark renders NAH gold and WERK silver",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const brand=await page.locator(".top .brandtext strong").evaluate(el=>({
    beforeContent:getComputedStyle(el,"::before").content,
    beforeColor:getComputedStyle(el,"::before").color,
    afterContent:getComputedStyle(el,"::after").content,
    afterColor:getComputedStyle(el,"::after").color
  }));
  expect(brand.beforeContent).toContain("NAH");
  expect(brand.afterContent).toContain("WERK");
  expect(brand.beforeColor).not.toBe(brand.afterColor);
});

test("services and senior lifestyle imagery is visible and responsive",async({page})=>{
  await page.setViewportSize({width:1024,height:900});
  await page.goto("http://127.0.0.1:4173/leistungen.html",{waitUntil:"networkidle"});
  const servicePhoto=page.locator(".services-hero-photo img");
  await expect(servicePhoto).toBeVisible();
  await expect(servicePhoto).toHaveAttribute("src",/assets\/lifestyle\/young-woman-kitchen\.webp/);
  const serviceBox=await servicePhoto.boundingBox();
  expect(serviceBox.width).toBeGreaterThan(300);
  const wrapBox=await page.locator(".services-hero .wrap").boundingBox();
  expect(wrapBox.x).toBeGreaterThanOrEqual(30);
  expect(1024-(wrapBox.x+wrapBox.width)).toBeGreaterThanOrEqual(30);
  await page.screenshot({path:"test-results/screenshots/tablet-services-lifestyle-hero.png",fullPage:true});

  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  await expect(page.locator(".senior-hero-photo img")).toHaveAttribute("src",/assets\/lifestyle\/senior-man-phone\.webp/);
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  await expect(page.locator(".product-band.senior .product-band-image")).toHaveAttribute("src",/assets\/lifestyle\/senior-woman-overview\.webp/);
});

test("dark overview hero contains multi-colour ambient background",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const background=await page.locator(".home-hero").evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(background).toContain("radial-gradient");
  expect(background.split("radial-gradient").length-1).toBeGreaterThanOrEqual(3);
});

test("mobile menu panel is viewport anchored beneath the sticky header",async({page})=>{
  await page.setViewportSize({width:1024,height:900});
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior="auto";window.scrollTo(0,420);});
  await page.waitForTimeout(50);
  const before=await page.evaluate(()=>window.scrollY);
  const header=page.locator("header.top");
  const toggle=page.locator(".nav-toggle");
  const headerBox=await header.boundingBox();
  expect(headerBox.y).toBeGreaterThanOrEqual(-2);
  expect(headerBox.y).toBeLessThanOrEqual(2);
  const toggleBox=await toggle.boundingBox();
  await page.mouse.click(toggleBox.x+toggleBox.width/2,toggleBox.y+toggleBox.height/2);
  const menu=page.locator(".top .links.is-open");
  await expect(menu).toBeVisible();
  const position=await menu.evaluate(el=>getComputedStyle(el).position);
  expect(position).toBe("fixed");
  const menuBox=await menu.boundingBox();
  const liveHeaderBox=await header.boundingBox();
  expect(Math.abs(menuBox.y-(liveHeaderBox.y+liveHeaderBox.height))).toBeLessThanOrEqual(3);
  expect(Math.abs((await page.evaluate(()=>window.scrollY))-before)).toBeLessThanOrEqual(2);
});

test("language selector starts native and replays immediately after switching",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const root=page.locator("[data-concierge-carousel]");
  await root.evaluate(el=>el._nahwerkCarousel.select("mira"));
  const control=page.locator('.nw-voice-preview-control[data-concierge-key="mira"]');
  const select=control.locator(".nw-voice-preview-language-select");
  const button=control.locator(".nw-voice-preview-button");
  await expect(select).toHaveValue("es");
  await expect(select.locator("option")).toHaveCount(3);
  await button.click();
  await expect(button).toHaveAttribute("data-state","playing",{timeout:5000});
  await select.selectOption("de");
  await expect(select).toHaveValue("de");
  await expect(button).toHaveAttribute("data-state","playing",{timeout:5000});
});

test("all multilingual preview files are reachable",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const result=await page.evaluate(async()=>{
    const checks=[];
    for(const profile of window.NAHWERKCarousel.profiles){
      for(const [lang,url] of Object.entries(profile.sampleAudioByLanguage||{})){
        const response=await fetch(url,{cache:"no-store"});
        checks.push({key:profile.key,lang,status:response.status,bytes:(await response.arrayBuffer()).byteLength});
      }
    }
    return checks;
  });
  expect(result).toHaveLength(65);
  for(const check of result){
    expect(check.status,`${check.key}/${check.lang}`).toBe(200);
    expect(check.bytes,`${check.key}/${check.lang}`).toBeGreaterThan(20000);
  }
});

test("carousel portrait click opens registration for that concierge",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const active=page.locator(".nw-carousel-card.is-active .nw-carousel-select");
  const profile=await page.locator("[data-concierge-carousel]").evaluate(el=>el._nahwerkCarousel.selected.key);
  await Promise.all([
    page.waitForURL(url=>url.pathname.endsWith("/registrieren.html")&&url.searchParams.get("concierge")===profile),
    active.click()
  ]);
});

test("world page region controls work without legacy concierge grid",async({page})=>{
  await page.goto("http://127.0.0.1:4173/concierges.html",{waitUntil:"networkidle"});
  await expect(page.locator(".co-region-button")).toHaveCount(6);
  await expect(page.locator("#conciergeOverviewGrid")).toHaveCount(0);
  await page.locator('.co-region-button[data-region="Asien"]').click();
  await expect(page.locator("#interactiveRegionName")).toHaveText("Asien");
});

test("senior header uses the centralized production logo",async({page})=>{
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  const result=await page.locator(".top .brand").evaluate(el=>({
    background:getComputedStyle(el).backgroundImage,
    markDisplay:getComputedStyle(el.querySelector(".mark")).display,
    textDisplay:getComputedStyle(el.querySelector(".brandtext")).display
  }));
  expect(result.background).toContain("NAHWERK-CONCIERGE-Website-Logo.webp");
  expect(result.markDisplay).toBe("none");
  expect(result.textDisplay).toBe("none");
});

test("registration base first paint stays dark before senior body theming",async({page})=>{
  await page.goto("http://127.0.0.1:4173/registrieren.html?produkt=senioren",{waitUntil:"domcontentloaded"});
  const initial=await page.evaluate(()=>({
    html:getComputedStyle(document.documentElement).backgroundColor,
    firstPaint:document.getElementById("registration-first-paint")?.textContent||""
  }));
  const rgb=(initial.html.match(/\d+/g)||[]).slice(0,3).map(Number);
  expect(rgb.length===3&&rgb.every(channel=>channel<24)).toBe(true);
  expect(initial.firstPaint).toContain("background:#070706");
});

test("app-free copy explicitly mentions no extra app and future free NAHWERK app",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  await expect(page.locator("body")).toContainText("Keine zusätzliche App notwendig");
  await expect(page.locator("body")).toContainText("NAHWERK App ist in Entwicklung");
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  await expect(page.locator("body")).toContainText("Keine zusätzliche App notwendig");
  await expect(page.locator(".senior-app-note")).toContainText("kostenlos");
});

test("concierge world page exposes six responsive region choices",async({page})=>{
  await page.goto("http://127.0.0.1:4173/concierges.html",{waitUntil:"networkidle"});
  const regions=page.locator(".co-region-button");
  await expect(regions).toHaveCount(6);
  await expect(page.locator("#conciergeOverviewGrid")).toHaveCount(0);
  await expect(page.locator("#showAllConcierges")).toHaveCount(0);
  await expect(page.locator("#interactiveRegionName")).toHaveText("Europa");
  await regions.filter({hasText:"Afrika"}).click();
  await expect(page.locator("#interactiveRegionName")).toHaveText("Afrika");
});

test("family setup exposes optional personal message and previews it",async({page})=>{
  await page.goto("http://127.0.0.1:4173/registrieren.html?produkt=senioren&fuer=andere",{waitUntil:"networkidle"});
  const other=page.locator('input[name="setupFor"][value="other"]');
  await expect(other).toBeChecked();
  await expect(page.locator("#recipientBlock")).toBeVisible();
  const message=page.locator("#familyMessage");
  await expect(message).toBeVisible();
  await message.fill("Liebe Oma, ich habe dir NAHWERK eingerichtet, damit du jederzeit Unterstützung hast.");
  await expect(page.locator("#messagePreview")).toContainText("Liebe Oma");
  await expect(page.locator("#messagePreview")).toContainText("Persönliche Nachricht");
});