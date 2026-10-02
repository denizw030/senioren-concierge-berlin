import test from "node:test";
import assert from "node:assert/strict";
import fs from './helpers/effective-source-fs.mjs';
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const homepage="de/index.html";
const visible=(html)=>html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

test("Gate 1 public artifacts are complete",()=>{
  for(const p of [
    "index.html",homepage,"prime-concierge.html","safety.html","angehoerige.html",
    "telefonannahme.html","registrieren.html","konto.html","pakete.html","erster-schritt.html",
    "alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html",
    "assets/acquisition-v1.js","assets/nahwerk-analytics.js",
    "assets/logos/stewaro-icon.svg","assets/logos/stewaro-wordmark.svg"
  ]) assert.ok(exists(p),p);
});

test("homepage is the STEWARO FIDEL experience and conversion remains reachable",()=>{
  const c=read(homepage), copy=visible(c);
  assert.match(c,/class="site-header"/);
  assert.match(c,/class="brand-word"/);
  assert.match(c,/class="hero-image hero-video"/);
  assert.match(c,/stewaro-hero-pferd\.mp4/);
  assert.match(copy,/STEWARO/);
  assert.match(copy,/FIDEL/);
  assert.match(copy,/Jemand, der sich kümmert\./);
  assert.match(c,/href="\/registrieren"/);
  assert.match(c,/href="\/angehoerige\?source=stewaro" data-entry="loved-one"/);
  assert.doesNotMatch(copy,/NAHWERK|Nilo|Mira|Hartmut|Frida/);
});

test("public capability truth stays fail-closed",()=>{
  const c=read(homepage)+read("prime-concierge.html")+read("telefonannahme.html");
  assert.match(c,/Welche WhatsApp- oder Telefonfunktionen verfügbar sind, richtet sich nach dem eingerichteten Produkt und Zugang|Weitere Telefonfunktionen werden erst öffentlich gezeigt/);
  assert.doesNotMatch(c,/Customer Release ist weiterhin deaktiviert|Jetzt verfügbar/);
  const phone=read("telefonannahme.html");
  assert.match(phone,/id="einrichtung" hidden aria-hidden="true"/);
  assert.match(phone,/story-hidden-unreleased/);
});

test("real activation requires post-registration usage delta",()=>{
  const js=read("assets/acquisition-v1.js");
  assert.match(js,/seedBaselineFromProfile/);
  assert.match(js,/current\.app>baseline\.app\|\|current\.whatsapp>baseline\.whatsapp/);
  assert.match(js,/funnel_complete/);
  assert.match(js,/first_task_success/);
  assert.match(read("konto.html"),/NahwerkActivation\?\.observeUsage/);
});

test("first-party analytics remains storage-minimal and disclosed",()=>{
  const analytics=read("assets/nahwerk-analytics.js");
  const privacy=read("datenschutz/index.html");
  assert.doesNotMatch(analytics,/sessionStorage|localStorage|VISIT_KEY/);
  assert.match(privacy,/eigene, datensparsame Nutzungsanalyse/);
  assert.match(privacy,/keine eigenen Analyse-Cookies/);
});

test("registration keeps secure endpoints and paid checkout closed",()=>{
  const c=read("assets/onboarding.js");
  assert.match(c,/web-registration-secure/);
  assert.match(c,/web-login-secure/);
  assert.match(c,/bookable: false/);
  assert.match(c,/erster-schritt\.html/);
});

test("pricing matches canonical tariff set",()=>{
  const c=read("pakete.html")+read("assets/onboarding.js");
  for(const price of ["0 €","5,99 €","10,99 €","19,99 €","34,99 €","59,66 €"]) assert.ok(c.includes(price),price);
  assert.doesNotMatch(c,/59,99 €/);
});

test("public journey pages have basic accessibility metadata",()=>{
  for(const p of [homepage,"prime-concierge.html","safety.html","angehoerige.html","telefonannahme.html","erster-schritt.html","alltag-organisieren.html","dokumente-verstehen.html","technik-verstehen.html"]){
    const c=read(p);
    assert.match(c,/<html lang="de"/i,p);
    assert.match(c,/name="viewport"/i,p);
    assert.match(c,/<h1[ >]/i,p);
  }
});

test("retired concierge-world route stays absent and hidden from shared navigation",()=>{
  assert.equal(exists("concierges.html"),false);
  const css=read("assets/stewaro-unified.css");
  assert.match(css,/a\[href="\/concierges"\]/);
  assert.match(css,/display:none!important/);
});

test("homepage header and motion are responsive without legacy scroll-state coupling",()=>{
  const home=read(homepage);
  assert.match(home,/\.site-header/);
  assert.match(home,/@media\s*\(max-width:\s*980px\)/);
  assert.match(home,/@media\s*\(max-width:\s*600px\)/);
  assert.match(home,/prefers-reduced-motion:\s*reduce/);
});
