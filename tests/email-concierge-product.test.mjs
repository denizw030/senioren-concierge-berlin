import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("assets/email-concierge-product.js","utf8");
const css=fs.readFileSync("assets/email-concierge-product.css","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");

function hooks(){const sandbox={console};vm.createContext(sandbox);vm.runInContext(js,sandbox);return sandbox.NAHWERKEmailConciergeProductTestHooks}
const api=hooks();

test("standalone E-Mail-Concierge uses only the canonical PROD email runtime",()=>{
  assert.equal(api.BASE,"https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime");
  assert.match(js,/\/email\/concierge\/dashboard/);
  assert.match(js,/\/email\/concierge\/query/);
  assert.match(js,/\/email\/concierge\/messages\/open/);
  assert.match(js,/\/email\/concierge\/activity\?limit=50/);
  assert.match(js,/\/email\/concierge\/settings/);
});

test("customer UI contains the complete standalone product areas",()=>{
  for(const phrase of ["Mein E-Mail-Concierge","Wichtige E-Mails","Von NAHWERK vorbereitet","Spam- & Betrugsschutz","Was dein E-Mail-Concierge erledigt hat","Deine Kanäle","Automatik & Schutz"]) assert.match(js,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  for(const phrase of ["Wichtig","Ungelesen","Heute","Antwort empfohlen","Rechnungen"]) assert.match(js,new RegExp(phrase));
});

test("spam fraud sorting and activity controls are customer configurable",()=>{
  const names=Object.keys(api.SETTINGS);
  for(const key of ["FRAUD_PROTECTION","SPAM_PROTECTION","IMPORTANT","INVOICES","APPOINTMENTS","TRAVEL","ORDERS","PERSONAL","SUPPORT_CONTRACTS","REPLY_ASSISTANT","PROACTIVE_HINTS","ACTIVITY_DIGEST"]) assert.ok(names.includes(key),key);
});

test("dashboard normalization fails closed and keeps bounded arrays",()=>{
  assert.equal(api.normalizeDashboard({ok:false}),null);
  const data=api.normalizeDashboard({ok:true,summary:{important:2,unread:3},highlights:[{id:"m1"}],drafts:[{id:"d1"}],activities:[],channels:{web:{state:"ACTIVE"}}});
  assert.equal(data.summary.important,2);assert.equal(data.summary.unread,3);assert.equal(data.highlights.length,1);assert.equal(data.drafts.length,1);assert.equal(data.channels.web.state,"ACTIVE");
});

test("message content is rendered through textContent helpers, not injected HTML",()=>{
  assert.match(js,/node\.textContent = value/);
  assert.doesNotMatch(js,/innerHTML\s*=/);
  assert.doesNotMatch(js,/insertAdjacentHTML/);
});

test("sending remains an explicit customer action with a second confirmation",()=>{
  assert.match(js,/Freigeben & senden/);
  assert.match(js,/Diese E-Mail jetzt wirklich senden\?/);
  assert.match(js,/Erst mit „OK“ gibst du den Versand ausdrücklich frei/);
  assert.match(js,/\/email\/concierge\/drafts\/approve-send/);
  assert.doesNotMatch(js,/\/email\/drafts\/send/);
  assert.match(js,/E-Mails werden nur nach deiner ausdrücklichen Freigabe gesendet/);
});

test("draft edit and discard never imply a send",()=>{
  assert.match(js,/\/email\/concierge\/drafts\/edit/);
  assert.match(js,/\/email\/concierge\/drafts\/discard/);
  assert.match(js,/Es wird nichts gesendet/);
});

test("WhatsApp is optional and remains visibly discoverable",()=>{
  assert.match(js,/Web-Kundenkonto/);
  assert.match(js,/WhatsApp verbinden/);
  assert.match(js,/Der E-Mail-Concierge funktioniert eigenständig im Web/);
});

test("account integration loads product assets only from first-party paths and syncs connection state",()=>{
  assert.match(integration,/\/assets\/email-concierge-product\.css/);
  assert.match(integration,/\/assets\/email-concierge-product\.js/);
  assert.match(integration,/syncProduct\(state === "CONNECTED"\)/);
  assert.match(integration,/syncProduct\(false\)/);
});

test("product layout is responsive across desktop and mobile",()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1\.45fr\) minmax\(280px,\.8fr\)/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
});
