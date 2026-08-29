import { test, expect } from "@playwright/test";

const surfaces=["/index.html","/prime-concierge.html","/senioren-concierge.html","/concierges.html","/registrieren.html","/concierge-anpassen.html"];
const viewports=[
  {name:"desktop",width:1440,height:1000},
  {name:"tablet",width:1024,height:900},
  {name:"mobile",width:390,height:844}
];

for(const viewport of viewports){
  for(const surface of surfaces){
    test(\`${viewport.name} ${surface} renders voice controls without browser errors\`,async({page})=>{
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      const errors=[];
      page.on("pageerror",error=>errors.push(String(error)));
      page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
      await page.goto(\`http://127.0.0.1:4173${surface}\`,{waitUntil:"networkidle"});
      await expect(page.locator(".nw-voice-preview-button").first()).toBeVisible();
      expect(await page.locator("button button").count()).toBe(0);
      const box=await page.locator(".nw-voice-preview-button").first().boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({path:\`test-results/screenshots/${viewport.name}-${surface.replaceAll("/","_")}.png\`,fullPage:true});
      expect(errors).toEqual([]);
    });
  }
}

test("all 23 image and audio assets return successfully",async({page})=>{
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
    expect(check.status,\`${check.key} ${check.kind}\`).toBe(200);
    expect(check.bytes,\`${check.key} ${check.kind}\`).toBeGreaterThan(1000);
  }
});

test("Nilo, Mira, Jabari and Arjun can start and stop their mapped samples",async({page})=>{
  await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"networkidle"});
  for(const key of ["nilo","mira","jabari","arjun"]){
    await page.locator("[data-concierge-carousel]").evaluate((root,key)=>root._nahwerkCarousel.select(key),key);
    const button=page.locator(\`.nw-voice-preview-control[data-concierge-key="${key}"] .nw-voice-preview-button\`);
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
  await expect(nilo).toHaveAttribute("data-state","stopped");
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
  for(const key of ["jabari","arjun"]){
    const control=page.locator(\`.nw-voice-preview-control[data-concierge-key="${key}"]\`);
    await expect(control).toHaveAttribute("data-provisional","true");
    await expect(control.locator(".nw-voice-preview-tag")).toHaveText("Teststimme");
  }
});
