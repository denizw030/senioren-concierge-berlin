import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync("assets/email-concierge-product.js","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");
const css=fs.readFileSync("assets/email-concierge-product.css","utf8");

test("left mailbox navigation preserves its own scroll state across every render",()=>{
  assert.match(src,/let mailboxSidebarScrollTop = 0/);
  assert.match(src,/let mailboxSidebarScrollLeft = 0/);
  assert.match(src,/querySelector\?\.\("\.ecp-tb-nav"\)/);
  assert.match(src,/mailboxSidebarScrollTop=sidebarNav\.scrollTop/);
  assert.match(src,/sidebarNav\.scrollTop=mailboxSidebarScrollTop/);
  assert.match(src,/nav\.addEventListener\("scroll"/);
  assert.match(src,/requestAnimationFrame\(\(\)=>\{if\(sidebarNav\.isConnected\)/);
  assert.match(src,/restoreTransientUiState\(root,transient\); return;/);
});

test("selected account header and inbox badge use the same canonical provider truth",()=>{
  assert.match(src,/function folderProviderTruth/);
  assert.match(src,/function inboxProviderTruth/);
  assert.match(src,/messages_total:number\(data\?\.messages_total\?\?data\?\.folder_meta\?\.messages_total\)/);
  assert.match(src,/messages_unread:number\(data\?\.messages_unread\?\?data\?\.folder_meta\?\.messages_unread\)/);
  assert.match(src,/mailboxFolderCounts\?\.\[String\(connectionId\|\|""\)\]\?\.\[folder\]/);
  assert.match(src,/E-Mails in diesem Bereich/);
  assert.match(src,/ungelesen/);
  assert.match(src,/mailboxFolderCount\(value,id\)/);
  assert.match(src,/ecp-tb-live ecp-tb-provider-truth/);
  assert.match(css,/\.ecp-tb-provider-truth\{/);
});

test("mailbox fix is cache-busted in account integration",()=>{
  assert.match(integration,/email-concierge-product\.js\?v=20260924-reader4/);
  assert.match(integration,/email-concierge-product\.css\?v=20260924-reader4/);
});

console.log("EMAIL_MAILBOX_SCROLL_COUNTS=GREEN");
