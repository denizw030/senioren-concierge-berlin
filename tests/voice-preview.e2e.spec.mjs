import { test, expect } from "@playwright/test";

const surfaces=["/index.html","/prime-concierge.html","/senioren-concierge.html","/concierges.html","/registrieren.html"];
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
      sampleAudio:"assets/concierges/voice-samples/lars.mp3?v=reserve-20260829-1"
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

test("senior page starts on Frida with Hartmut visible beside her",async({page})=>{
  await page.setViewportSize({width:1024,height:900});
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  const root=page.locator("[data-concierge-carousel]");
  await expect(root).toHaveAttribute("data-variant","senior");
  expect(await root.evaluate(el=>el._nahwerkCarousel.selected.key)).toBe("frida");
  const active=page.locator(".nw-carousel-card.is-active");
  await expect(active).toContainText("Frida");
  const hartmut=page.locator(".nw-carousel-card").filter({hasText:"Hartmut"});
  await expect(hartmut).toBeVisible();
  const frida=page.locator('[data-concierge-key="frida"] .nw-voice-preview-control');
  await expect(frida).toHaveAttribute("data-provisional","true");
  await expect(frida.locator(".nw-voice-preview-button")).toBeEnabled();
  await expect(frida.locator(".nw-voice-preview-badge")).toHaveText("Test");
  await page.screenshot({path:"test-results/screenshots/tablet-senior-initial-frida-hartmut.png",fullPage:true});
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
    const toggle=page.locator(".nav-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded","true");
    await expect(page.locator(".links")).toHaveClass(/is-open/);
    const opened=await page.evaluate(()=>window.scrollY);
    expect(Math.abs(opened-before)).toBeLessThanOrEqual(2);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded","false");
    const closed=await page.evaluate(()=>window.scrollY);
    expect(Math.abs(closed-before)).toBeLessThanOrEqual(2);
  });
}

test("carousel shell clips images uniformly and registration is optically centered",async({page})=>{
  await page.setViewportSize({width:1024,height:900});
  await page.goto("http://127.0.0.1:4173/senioren-concierge.html",{waitUntil:"networkidle"});
  const style=await page.locator(".nw-carousel-card.is-active").evaluate(card=>{
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
  await expect(page.locator(".product-band.senior .product-band-image")).toHaveAttribute("src",/assets\/lifestyle\/senior-woman-sofa\.webp/);
});

test("dark overview hero contains multi-colour ambient background",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  const background=await page.locator(".home-hero").evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(background).toContain("radial-gradient");
  expect(background.split("radial-gradient").length-1).toBeGreaterThanOrEqual(3);
});