import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const required=["index.html","prime-concierge.html","safety.html","angehoerige.html","telefonannahme.html","registrieren.html","konto.html","pakete.html","erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html","assets/acquisition-v1.css","assets/story-conversion-final.css","assets/acquisition-v1.js","assets/nahwerk-analytics.js"];
test("activation and story artifacts are complete",()=>required.forEach(p=>assert.ok(exists(p),p)));
test("homepage follows frozen story and keeps conversion reachable",()=>{
  const c=read("index.html");
  assert.deepEqual([...c.matchAll(/data-story-step="([1-6])"/g)].map(m=>m[1]),["1","2","3","4","5","6"]);
  assert.match(c,/Ein persönlicher Concierge, der erledigt\./);
  assert.match(c,/Google findet\. KI versteht\. NAHWERK erledigt\./);
  assert.match(c,/id="demo"/);
  assert.match(c,/Da sein, auch wenn du gerade verhindert bist\./);
  assert.match(c,/Unterstützung, ohne Selbstständigkeit abzunehmen\./);
  assert.match(c,/Ein Concierge\. Dasselbe Gespräch\. Egal über welchen Weg\./);
  assert.match(c,/Kostenlos starten/);
  assert.match(c,/data-nw-cta="start_free"/);
});
test("public capability truth stays fail-closed without internal release telemetry",()=>{
  const c=read("index.html")+read("prime-concierge.html")+read("telefonannahme.html");
  assert.match(c,/Welche Telefonfunktionen verfügbar sind, richtet sich nach dem eingerichteten Produkt und Zugang|Weitere Telefonfunktionen werden erst öffentlich gezeigt/);
  assert.doesNotMatch(c,/Begrenzt freigegeben|Customer Release ist weiterhin deaktiviert|Web-Concierge-Chat ist noch nicht freigegeben|Jetzt verfügbar/);
  const phone=read("telefonannahme.html");
  assert.match(phone,/id="einrichtung" hidden aria-hidden="true"/);
  assert.match(phone,/Platform-Endpunkt ist vorbereitet, aber noch nicht deployed/);
});
test("real activation requires post-registration usage delta",()=>{const js=read("assets/acquisition-v1.js");assert.match(js,/seedBaselineFromProfile/);assert.match(js,/seedBaseline\(body\.usage,"profile"\)/);assert.match(js,/current\.app>baseline\.app\|\|current\.whatsapp>baseline\.whatsapp/);assert.match(js,/seedBaseline\(current,"fallback"\)/);assert.match(js,/funnel_complete/);assert.match(js,/first_task_success/);assert.match(read("konto.html"),/NahwerkActivation\?\.observeUsage/);assert.match(read("assets/onboarding.js"),/markRegistrationComplete/)});
test("first-party analytics is storage-minimal and disclosed",()=>{const analytics=read("assets/nahwerk-analytics.js");const privacy=read("datenschutz.html");assert.doesNotMatch(analytics,/sessionStorage|localStorage|VISIT_KEY/);assert.match(privacy,/eigene, datensparsame Nutzungsanalyse/);assert.match(privacy,/keine eigenen Analyse-Cookies/);assert.doesNotMatch(privacy,/keine eigenen Analyse- oder Marketingtracker/)});
test("registration keeps secure endpoints and paid checkout closed",()=>{const c=read("assets/onboarding.js");assert.match(c,/web-registration-secure/);assert.match(c,/web-login-secure/);assert.match(c,/bookable: false/);assert.match(c,/erster-schritt\.html/);assert.doesNotMatch(c,/webhook\/senioren-concierge\/web\/login\/password/)});
test("pricing matches canonical tariff set",()=>{const c=read("pakete.html")+read("assets/onboarding.js");for(const price of ["0 €","5,99 €","10,99 €","19,99 €","34,99 €","59,66 €"])assert.ok(c.includes(price),price);assert.doesNotMatch(c,/59,99 €/)});
test("growth assets stay small",()=>{assert.ok(Buffer.byteLength(read("assets/acquisition-v1.css"))<18000);assert.ok(Buffer.byteLength(read("assets/acquisition-v1.js"))<12000);for(const p of ["erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html","angehoerige.html","safety.html"])assert.ok(Buffer.byteLength(read(p))<30000,p)});
test("public journey pages have basic accessibility metadata",()=>{for(const p of ["index.html","prime-concierge.html","safety.html","angehoerige.html","telefonannahme.html","erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html"]){const c=read(p);assert.match(c,/<html lang="de">/i,p);assert.match(c,/name="viewport"/i,p);assert.match(c,/<h1[ >]/i,p)}});
test("local href and src targets exist",()=>{const pages=fs.readdirSync(root).filter(x=>x.endsWith(".html"));const misses=[];for(const p of pages){const c=read(p);for(const m of c.matchAll(/(?:href|src)=["']([^"']+)["']/g)){let target=m[1];if(/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(target))continue;target=target.split("#")[0].split("?")[0];if(!target||target==="/")continue;if(!fs.existsSync(path.join(root,target)))misses.push(`${p} -> ${target}`)}}assert.deepEqual(misses,[])});

test("homepage header is opaque at top and glass after scroll without layout changes", () => {
  const home = fs.readFileSync("index.html", "utf8");
  const siteUi = fs.readFileSync("assets/site-ui.js", "utf8");
  assert.match(home, /body\.overview-page \.top\s*\{[\s\S]{0,700}background:\s*#000\s*!important/);
  assert.match(home, /body\.overview-page\.nw-header-scrolled \.top\s*\{[\s\S]{0,180}rgba\(7,\s*7,\s*6,\s*0\.82\)/);
  assert.match(home, /background-color\s+220ms\s+ease/);
  assert.match(siteUi, /window\.scrollY\s*>\s*8/);
  assert.match(siteUi, /classList\.toggle\('nw-header-scrolled'/);
  assert.match(siteUi, /requestAnimationFrame\(syncHeaderScrollState\)/);
});
