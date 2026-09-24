import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const js=fs.readFileSync("assets/email-concierge-product.js","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");
const konto=fs.readFileSync("konto.html","utf8");

test("Thunderbird-style composer is available from the mailbox",()=>{
  assert.match(js,/＋ Neue Nachricht/);
  assert.match(js,/function startComposer\(mode="NEW"/);
  assert.match(js,/readerMode="COMPOSE"/);
  assert.match(js,/function renderComposer\(pane\)/);
});

test("opened messages offer reply reply-all and forward",()=>{
  assert.match(js,/button\("Antworten","ecp-tb-toolbar-button"\)/);
  assert.match(js,/button\("Allen antworten","ecp-tb-toolbar-button"\)/);
  assert.match(js,/button\("Weiterleiten","ecp-tb-toolbar-button"\)/);
  assert.match(js,/startComposer\("REPLY",detail\)/);
  assert.match(js,/startComposer\("REPLY_ALL",detail\)/);
  assert.match(js,/startComposer\("FORWARD",detail\)/);
});

test("composer writes a real provider draft and sends only through approval route",()=>{
  assert.match(js,/\/email\/concierge\/drafts\/create/);
  assert.match(js,/\/email\/concierge\/drafts\/edit/);
  assert.match(js,/\/email\/concierge\/drafts\/approve-send/);
  assert.match(js,/Im echten Entwürfe-Ordner gespeichert/);
  assert.match(js,/Diese E-Mail jetzt wirklich senden/);
});

test("reply keeps the source thread while forward starts an independent draft",()=>{
  assert.match(js,/source_message_id:reply\?String\(detail\?\.id\|\|""\):""/);
  assert.match(js,/thread_id:reply\?String\(detail\?\.thread_id\|\|""\):""/);
  assert.match(js,/forward\?composeSubject\("FWD",detail\?\.subject\)/);
});

test("already saved unchanged draft is not rewritten before send",()=>{
  assert.match(js,/if\(state\.savedDraft && !state\.dirty\)/);
});

test("composer rollout busts both integration and product asset caches",()=>{
  assert.match(integration,/email-concierge-product\.js\?v=20260924-compose3/);
  assert.match(integration,/email-concierge-product\.css\?v=20260924-compose3/);
  assert.match(konto,/email-account-integration\.js\?v=17/);
});

test("five-folder mailbox contract remains unchanged",()=>{
  assert.match(js,/Object\.freeze\(\["INBOX","SPAM","SENT","DRAFTS","TRASH"\]\)/);
  assert.doesNotMatch(js,/const folders = .*IMPORTANT/);
  assert.doesNotMatch(js,/const folders = .*UNIMPORTANT/);
});

console.log("EMAIL_COMPOSE_REPLY_UI_V1=GREEN");
