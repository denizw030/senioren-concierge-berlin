import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const js=fs.readFileSync("assets/email-concierge-product.js","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");
const konto=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");

test("composer actually mounts editable recipient subject and message controls",()=>{
  assert.match(js,/wrap\.append\(caption,control\)/);
  assert.match(js,/bodyWrap\.append\(bodyField\)/);
  assert.match(js,/toField\.control\.addEventListener\("input"/);
  assert.match(js,/subjectField\.control\.addEventListener\("input"/);
  assert.match(js,/bodyField\.addEventListener\("input"/);
  assert.match(js,/bodyField\.placeholder="Nachricht schreiben …"/);
});

test("compose mode expands to a real mail-client workspace",()=>{
  assert.match(js,/ecp-thunderbird\.is-compose \.ecp-tb-shell/);
  assert.match(js,/ecp-thunderbird\.is-compose \.ecp-tb-list-pane\{display:none!important\}/);
  assert.match(js,/if\(readerMode==="COMPOSE"\)workspace\.classList\.add\("is-compose"\)/);
  assert.match(js,/if\(readerMode==="COMPOSE"\)shell\.classList\.add\("is-compose"\)/);
});

test("professional composer has one primary action strip instead of duplicated top and bottom controls",()=>{
  const block=js.slice(js.indexOf("function renderComposer"),js.indexOf("function renderMailboxSidebar"));
  assert.match(block,/headActions\.append\(cancel,save,send\)/);
  assert.equal((block.match(/button\("Senden"/g)||[]).length,1);
  assert.equal((block.match(/button\("Entwurf speichern"/g)||[]).length,1);
  assert.doesNotMatch(js,/const composeTop=button\("＋ Neue Nachricht"/);
});

test("composer keeps explicit send approval and real provider drafts",()=>{
  assert.match(js,/\/email\/concierge\/drafts\/create/);
  assert.match(js,/\/email\/concierge\/drafts\/edit/);
  assert.match(js,/\/email\/concierge\/drafts\/approve-send/);
  assert.match(js,/Diese E-Mail jetzt wirklich senden/);
  assert.match(js,/echten Entwürfe-Ordner/);
});

test("fresh composer assets are loaded on both account routes",()=>{
  assert.match(integration,/email-concierge-product\.js\?v=20260924-reader4/);
  assert.match(integration,/email-concierge-product\.css\?v=20260924-reader4/);
  assert.match(konto,/email-account-integration\.js\?v=18/);
  assert.match(clean,/email-account-integration\.js\?v=18/);
});

console.log("EMAIL_COMPOSER_PRO_UI_V2=GREEN");
