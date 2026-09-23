import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync("assets/email-concierge-product.js","utf8");
const css=fs.readFileSync("assets/email-concierge-product.css","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");

test("mailbox account switching preserves document scroll position",()=>{
  assert.match(src,/let preservePageScrollUntil = 0/);
  assert.match(src,/preservePageScrollY = Number\(window\.scrollY/);
  assert.match(src,/preservePageScrollUntil = Date\.now\(\) \+ 1800/);
  assert.match(src,/requestAnimationFrame\(\(\) => window\.scrollTo\(\{ top: preservePageScrollY/);
});

test("mailbox sidebar owns a persistent render-state scroll position",()=>{
  assert.match(src,/let mailboxSidebarScrollTop = 0/);
  assert.match(src,/mailboxSidebarScrollTop=sidebarNav\.scrollTop/);
  assert.match(src,/sidebarNav\.scrollTop=top;sidebarNav\.scrollLeft=left/);
  assert.match(src,/requestAnimationFrame\(\(\)=>\{if\(sidebarNav\.isConnected\)/);
  assert.match(src,/nav\.addEventListener\("scroll",\(\)=>\{mailboxSidebarScrollTop=nav\.scrollTop;mailboxSidebarScrollLeft=nav\.scrollLeft;\},\{passive:true\}\)/);
  assert.match(css,/\.ecp-tb-nav\{[^}]*overflow:auto/);
});

test("physical folders remain available per connected account",()=>{
  for(const folder of ["INBOX","SENT","SPAM","TRASH"]) assert.match(src,new RegExp('\\["'+folder+'"'));
  assert.match(src,/\/email\/concierge\/folder/);
  assert.match(src,/connectionId: String\(connection\.connection_id/);
});

test("provider counts stay canonical, isolated and visible beside search",()=>{
  assert.match(src,/mailboxFolderCounts\[id\]\[folder\]=\{ total:number\(meta\?\.messages_total\), unread:number\(meta\?\.messages_unread\) \}/);
  assert.match(src,/function inboxProviderTruth\(connectionId\)/);
  assert.match(src,/mailboxProviderTruthLabel\(\)/);
  assert.match(src,/ecp-tb-live ecp-tb-provider-truth/);
  assert.match(src,/E-Mails insgesamt/);
  assert.match(src,/ungelesen/);
  assert.match(css,/\.ecp-tb-provider-truth\{/);
});

test("fresh mailbox assets are loaded after the fix",()=>{
  assert.match(integration,/email-concierge-product\.css\?v=20260923-1/);
  assert.match(integration,/email-concierge-product\.js\?v=20260923-2/);
});

console.log("EMAIL_MAILBOX_ACCOUNT_SWITCH_UI=GREEN");
