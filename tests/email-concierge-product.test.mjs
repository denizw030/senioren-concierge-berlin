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
  assert.match(js,/\/email\/concierge\/rules\/suggestion/);
  assert.match(js,/\/email\/concierge\/rules\/update/);
  assert.match(js,/\/email\/concierge\/rules\/delete/);
});

test("customer UI contains the complete standalone product areas",()=>{
  for(const phrase of ["Mein E-Mail-Concierge","Wichtige E-Mails","Von NAHWERK vorbereitet","Spam- & Betrugsschutz","Was dein E-Mail-Concierge erledigt hat","Deine Kanäle","Automatik & Schutz"]) assert.match(js,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  for(const phrase of ["Wichtig","Ungelesen","Heute","Antwort empfohlen","Rechnungen"]) assert.match(js,new RegExp(phrase));
});

test("spam fraud sorting and activity controls are customer configurable",()=>{
  const names=Object.keys(api.SETTINGS);
  for(const key of ["FRAUD_PROTECTION","SPAM_PROTECTION","IMPORTANT","INVOICES","APPOINTMENTS","TRAVEL","ORDERS","PERSONAL","SUPPORT_CONTRACTS","REPLY_ASSISTANT","PROACTIVE_HINTS","ACTIVITY_DIGEST","UNIMPORTANT_AUTO_TRASH"]) assert.ok(names.includes(key),key);
});

test("dashboard normalization fails closed and keeps bounded arrays",()=>{
  assert.equal(api.normalizeDashboard({ok:false}),null);
  const data=api.normalizeDashboard({ok:true,summary:{important:2,unread:3},highlights:[{id:"m1"}],drafts:[{id:"d1"}],activities:[],rules:[{id:"r1"}],suggestions:[{candidate_id:"c1"}],channels:{web:{state:"ACTIVE"}}});
  assert.equal(data.summary.important,2);assert.equal(data.summary.unread,3);assert.equal(data.highlights.length,1);assert.equal(data.drafts.length,1);assert.equal(data.rules.length,1);assert.equal(data.suggestions.length,1);assert.equal(data.channels.web.state,"ACTIVE");
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
  assert.match(css,/@media\(max-width:1180px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/body\.account-premium-ui:has\(#accountEmailCard:not\(\[hidden\]\)\) \.nw-floating-concierge/);
  assert.match(js,/ecp-rule ecp-rule-personal/);
  assert.match(js,/ecp-rule-title-row/);
  assert.match(js,/\.ecp-rule-controls\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(integration,/email-concierge-product\.css\?v=20260920-5/);
  assert.match(integration,/email-concierge-product\.js\?v=20260920-6/);
});


test("connected account overview is topmost and follows canonical provider status",()=>{
  const multi=fs.readFileSync("assets/email-multi-account-concierge-v1.js","utf8");
  assert.match(js,/accountRoot\.querySelector\("\.email-account-head"\)/);
  assert.match(js,/accountHead\.insertAdjacentElement\("afterend", host\)/);
  assert.match(js,/__nahwerkEmailConnections/);
  assert.match(js,/nahwerk:email-connections-updated/);
  assert.match(js,/canonicalGoogleConnection/);
  assert.match(multi,/emailConciergeProduct/);
  assert.match(multi,/accountRoot\.querySelector\("\.email-account-head"\)/);
  assert.doesNotMatch(multi,/emailLogoConnectShell/);
});

test("personal rule UI requires explicit customer confirmation and stays reversible",()=>{
  assert.match(js,/Vorschläge deines Concierges/);
  assert.match(js,/Nur als unwichtig einstufen/);
  assert.match(js,/Künftig automatisch archivieren/);
  assert.match(js,/Künftig automatisch in den Papierkorb/);
  assert.match(js,/decision: "CONFIRM"/);
  assert.match(js,/decision: "REJECT"/);
  assert.match(js,/rule_id: rule\.id, active: input\.checked/);
  assert.match(js,/rule_id: rule\.id, action: select\.value/);
  assert.match(js,/persönliche E-Mail-Regel wirklich löschen/i);
  assert.match(js,/Bereits vorhandene Nachrichten werden nie automatisch nachträglich verändert/);
  assert.match(js,/endgültiges Löschen bleibt deaktiviert/);
  assert.match(js,/\/email\/concierge\/rules\/backfill\/preview/);
  assert.match(js,/\/email\/concierge\/rules\/backfill\/apply/);
  assert.match(js,/confirmed: true/);
  assert.match(js,/Sie werden nicht endgültig gelöscht/);
  assert.match(js,/Zukünftig: passende E-Mails automatisch in den Gmail-Papierkorb/);
});

test("important and unimportant controls remain directly visible on every classifiable mail",()=>{
  assert.match(js,/\["IMPORTANT", "Wichtig"\]/);
  assert.match(js,/\["UNIMPORTANT", "Unwichtig"\]/);
  assert.match(js,/classification\/override/);
  assert.match(js,/@media\(max-width:640px\).*ecp-class-actions/s);
});

test("global unimportant auto-trash is explicit, reversible and never permanent delete",()=>{
  assert.match(js,/UNIMPORTANT_AUTO_TRASH/);
  assert.match(js,/Unwichtige automatisch in Papierkorb/);
  assert.match(js,/confirm\("Unwichtige E-Mails künftig automatisch in den Gmail-Papierkorb verschieben\?/);
  assert.match(js,/Endgültig gelöscht wird nichts/);
});

test("Thunderbird-style workspace keeps folders, message list and reader in one mail client",()=>{
  assert.match(js,/ecp-thunderbird/);
  assert.match(js,/ecp-tb-sidebar/);
  assert.match(js,/ecp-tb-list-pane/);
  assert.match(js,/ecp-tb-reader/);
  assert.match(js,/Posteingang/);
  assert.match(js,/Automatik & Schutz/);
  assert.match(css,/grid-template-columns:220px minmax\(320px,390px\) minmax\(0,1fr\)/);
  assert.match(css,/\.ecp-tb-class-actions/);
});
test("every visible mail can be marked Wichtig or Unwichtig",()=>{
  assert.match(js,/function messageCard\(message, allowOpen = true, allowClassify = true\)/);
  assert.match(js,/\[\["IMPORTANT", "Wichtig"\], \["UNIMPORTANT", "Unwichtig"\]\]/);
  assert.match(js,/messageCard\(mail, true, true\)/);
  assert.match(js,/messageCard\(row, true, true\)/);
  assert.match(js,/const classifiable = sorted \|\| \(data\.message\?\.id/);
  assert.match(js,/syncVisibleClassification\(message\.id, value\)/);
});

test("concierge chat renders classification views locally without another Gmail search",()=>{
  assert.match(js,/data\.type === "CLASSIFICATION_VIEW"/);
  assert.match(js,/classification\.buckets\?\.\[String\(data\.classification/);
  assert.match(js,/Zeig mir alle unwichtigen/);
  assert.match(js,/EMAIL_PROVIDER_BUSY/);
  assert.match(js,/Gmail ist gerade kurz ausgelastet/);
});

test("concierge chat explains that commands can control mail and automation",()=>{
  assert.match(js,/wichtig\/unwichtig festlegen/);
  assert.match(js,/archivieren/);
  assert.match(js,/in den Papierkorb verschieben/);
  assert.match(js,/Regeln für ähnliche E-Mails anlegen/);
  assert.match(js,/GitHub-Mails sind unwichtig/);
});
