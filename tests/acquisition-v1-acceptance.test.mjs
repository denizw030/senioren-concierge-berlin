import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const r=(p)=>fs.readFileSync(p,"utf8");
const visible=(html)=>html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

test("north-star event cannot fire on signup or historical usage alone",()=>{
  const js=r("assets/acquisition-v1.js");
  const baselineGate=js.indexOf("if(!state.baseline){");
  const deltaGate=js.indexOf("if(current.app>baseline.app||current.whatsapp>baseline.whatsapp){");
  const completion=js.indexOf('funnel_complete","first_task_success"');
  assert.ok(baselineGate>=0&&deltaGate>baselineGate&&completion>deltaGate);
  assert.match(js,/seedBaselineFromProfile/);
  assert.match(js,/seedBaseline\(current,"fallback"\)/);
  assert.doesNotMatch(js,/if\(!\(app>0\|\|whatsapp>0\)\)/);
});

test("no provider activation or production deployment config added",()=>{
  const files=["assets/acquisition-v1.js","assets/acquisition-v1.css","erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html"];
  const body=files.map(r).join("\n");
  assert.doesNotMatch(body,/vercel deploy|terraform apply|supabase functions deploy|aws cloudformation|gh-pages deploy/i);
});

test("homepage presents the canonical STEWARO FIDEL launch identity",()=>{
  const home=r("de/index.html");
  const copy=visible(home);
  assert.match(home,/https:\/\/stewaro\.com\/de\//);
  assert.match(home,/\/assets\/logos\/stewaro-icon\.svg/);
  assert.match(home,/\/assets\/logos\/stewaro-wordmark\.svg/);
  assert.match(home,/\/assets\/media\/stewaro-hero-pferd\.mp4/);
  assert.match(copy,/Jemand, der sich kümmert\./);
  assert.match(copy,/FIDEL/);
  assert.match(copy,/STEWARO/);
  assert.doesNotMatch(copy,/NAHWERK|Hartmut|Frida|Nilo|Mira/);
  assert.doesNotMatch(copy,/Begrenzt freigegeben|Customer Release ist weiterhin deaktiviert|Jetzt verfügbar/);
});

test("first-value path is reachable through the Klientenbereich",()=>{
  assert.match(r("assets/onboarding.js"),/erster-schritt\.html/);
  assert.match(r("erster-schritt.html"),/Zum Klientenbereich/);
  assert.match(r("konto.html"),/observeUsage/);
});
