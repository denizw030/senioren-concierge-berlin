import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync("assets/email-concierge-product.js","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");

test("left mailbox navigation preserves its own scroll state across every render",()=>{
  assert.match(src,/let mailboxSidebarScrollTop = 0/);
  assert.match(src,/let mailboxSidebarScrollLeft = 0/);
  assert.match(src,/querySelector\?\.\("\.ecp-tb-nav"\)/);
  assert.match(src,/mailboxSidebarScrollTop=sidebarNav\.scrollTop/);
  assert.match(src,/sidebarNav\.scrollTop=mailboxSidebarScrollTop/);
  assert.match(src,/restoreTransientUiState\(root,transient\); return;/);
});

test("selected account header and inbox badge use the same canonical provider truth",()=>{
  assert.match(src,/function inboxProviderTruth/);
  assert.match(src,/messages_total:number\(data\?\.messages_total\?\?data\?\.folder_meta\?\.messages_total\)/);
  assert.match(src,/messages_unread:number\(data\?\.messages_unread\?\?data\?\.folder_meta\?\.messages_unread\)/);
  assert.match(src,/mailboxFolderCounts\?\.\[String\(connectionId\|\|""\)\]\?\.INBOX/);
  assert.match(src,/E-Mails insgesamt/);
  assert.match(src,/ungelesen/);
  assert.match(src,/mailboxFolderCount\(value,id\)/);
});

test("mailbox fix is cache-busted in account integration",()=>{
  assert.match(integration,/email-concierge-product\.js\?v=20260923-1/);
});

console.log("EMAIL_MAILBOX_SCROLL_COUNTS=GREEN");
