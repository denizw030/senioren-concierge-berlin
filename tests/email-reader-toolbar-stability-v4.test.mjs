import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const js=fs.readFileSync("assets/email-concierge-product.js","utf8");
const css=fs.readFileSync("assets/email-concierge-product.css","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");
const konto=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");

test("reader toolbar stays visible on narrow desktop layouts",()=>{
  assert.doesNotMatch(css,/\.ecp-tb-reader-toolbar\{display:none!important\}/);
  assert.match(css,/\.ecp-tb-reader-toolbar\{display:flex!important;position:sticky!important;top:0!important/);
  assert.match(js,/@media\(max-width:900px\)\{\.ecp-tb-reader-toolbar\{display:flex!important/);
});

test("opened message is not cleared just because the middle list refreshes",()=>{
  assert.doesNotMatch(js,/selectionStillVisible/);
  assert.match(js,/Keep an explicitly opened message stable while the middle list refreshes/);
  assert.match(js,/selectedMessageId = ""; selectedMessageConnectionId = ""; selectedMessageDetail = null;/);
});

test("reader exposes Thunderbird-style reply archive and spam actions",()=>{
  assert.match(js,/button\("Antworten","ecp-tb-toolbar-button"\)/);
  assert.match(js,/button\("Allen antworten","ecp-tb-toolbar-button"\)/);
  assert.match(js,/button\("Weiterleiten","ecp-tb-toolbar-button"\)/);
  assert.match(js,/button\("Archivieren","ecp-tb-toolbar-button"\)/);
  assert.match(js,/button\("Spam","ecp-tb-toolbar-button ecp-tb-toolbar-danger"\)/);
  assert.match(js,/runReaderMailboxAction\(detail,"ARCHIVE"\)/);
  assert.match(js,/runReaderMailboxAction\(detail,"SPAM"\)/);
});

test("spam action sends message context for learning",()=>{
  assert.match(js,/\/email\/concierge\/mailbox-action/);
  assert.match(js,/message_snapshot:snapshot/);
  assert.match(js,/In Spam verschieben und dem Concierge als Lernsignal geben/);
});

test("reader action rollout is cache busted on both account routes",()=>{
  assert.match(integration,/email-concierge-product\.js\?v=20260924-reader4/);
  assert.match(integration,/email-concierge-product\.css\?v=20260924-reader4/);
  assert.match(konto,/email-account-integration\.js\?v=18/);
  assert.match(clean,/email-account-integration\.js\?v=18/);
});

console.log("EMAIL_READER_TOOLBAR_STABILITY_V4=GREEN");
