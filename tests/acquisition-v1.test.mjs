import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const required=["index.html","registrieren.html","konto.html","angehoerige.html","pakete.html","erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html","assets/acquisition-v1.css","assets/acquisition-v1.js","assets/nahwerk-analytics.js"];
test("activation artifact is complete",()=>required.forEach(p=>assert.ok(exists(p),p)));
test("homepage centers first successful task",()=>{const c=read("index.html");assert.match(c,/ersten\s+erfolgreich\s+erledigten\s+Concierge-Aufgabe/i);assert.match(c,/id="erste-aufgabe"/);assert.match(c,/Kostenlos starten/);assert.match(c,/data-nw-cta="start_free"/)});
test("capability truth is fail-closed",()=>{const c=read("index.html");assert.match(c,/WhatsApp[\s\S]{0,220}Jetzt verfügbar/);assert.match(c,/Telefon[\s\S]{0,260}Begrenzt freigegeben/);assert.match(c,/Web[\s\S]{0,320}Web-Concierge-Chat ist noch nicht freigegeben/);assert.match(c,/App[\s\S]{0,260}Customer Release ist weiterhin deaktiviert/)});
test("real activation requires post-registration usage delta",()=>{const js=read("assets/acquisition-v1.js");assert.match(js,/seedBaselineFromProfile/);assert.match(js,/seedBaseline\(body\.usage,"profile"\)/);assert.match(js,/current\.app>baseline\.app\|\|current\.whatsapp>baseline\.whatsapp/);assert.match(js,/seedBaseline\(current,"fallback"\)/);assert.match(js,/funnel_complete/);assert.match(js,/first_task_success/);assert.match(read("konto.html"),/NahwerkActivation\?\.observeUsage/);assert.match(read("assets/onboarding.js"),/markRegistrationComplete/)});
test("first-party analytics is storage-minimal and disclosed",()=>{const analytics=read("assets/nahwerk-analytics.js");const privacy=read("datenschutz.html");assert.doesNotMatch(analytics,/sessionStorage|localStorage|VISIT_KEY/);assert.match(privacy,/First-Party-Produkt- und Funnel-Analyse/);assert.match(privacy,/keine eigenen Analyse-Cookies/);assert.doesNotMatch(privacy,/keine eigenen Analyse- oder Marketingtracker/)});
test("registration keeps secure endpoints and paid checkout closed",()=>{const c=read("assets/onboarding.js");assert.match(c,/web-registration-secure/);assert.match(c,/web-login-secure/);assert.match(c,/bookable: false/);assert.match(c,/erster-schritt\.html/);assert.doesNotMatch(c,/webhook\/senioren-concierge\/web\/login\/password/)});
test("pricing matches canonical tariff set",()=>{const c=read("pakete.html")+read("assets/onboarding.js");for(const price of ["0 €","5,99 €","10,99 €","19,99 €","34,99 €","59,66 €"])assert.ok(c.includes(price),price);assert.doesNotMatch(c,/59,99 €/)});
test("growth assets stay small",()=>{assert.ok(Buffer.byteLength(read("assets/acquisition-v1.css"))<18000);assert.ok(Buffer.byteLength(read("assets/acquisition-v1.js"))<12000);for(const p of ["erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html","angehoerige.html"])assert.ok(Buffer.byteLength(read(p))<30000,p)});
test("growth pages have basic accessibility metadata",()=>{for(const p of ["index.html","angehoerige.html","erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html"]){const c=read(p);assert.match(c,/<html lang="de">/i,p);assert.match(c,/name="viewport"/i,p);assert.match(c,/<h1[ >]/i,p)}});
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
