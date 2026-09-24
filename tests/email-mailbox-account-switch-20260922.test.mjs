import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync("assets/email-concierge-product.js","utf8");

test("mailbox account switching preserves document scroll position",()=>{
  assert.match(src,/let preservePageScrollUntil = 0/);
  assert.match(src,/preservePageScrollY = Number\(window\.scrollY/);
  assert.match(src,/preservePageScrollUntil = Date\.now\(\) \+ 1800/);
  assert.match(src,/requestAnimationFrame\(\(\) => window\.scrollTo\(\{ top: preservePageScrollY/);
});

test("exactly five physical folders remain available per connected account",()=>{
  for(const folder of ["INBOX","SPAM","SENT","DRAFTS","TRASH"]) assert.match(src,new RegExp('\\["'+folder+'"'));
  assert.match(src,/CANONICAL_MAILBOX_FOLDERS = Object\.freeze\(\["INBOX","SPAM","SENT","DRAFTS","TRASH"\]\)/);
  assert.match(src,/const folders = \[\["INBOX","Posteingang","▣"\],\["SPAM","Spam","⚑"\],\["SENT","Gesendet","➤"\],\["DRAFTS","Entwürfe","✎"\],\["TRASH","Papierkorb","⌫"\]\]/);
  assert.doesNotMatch(src,/const folders = .*IMPORTANT/);
  assert.doesNotMatch(src,/const folders = .*UNIMPORTANT/);
  assert.doesNotMatch(src,/const folders = .*REPLY/);
  assert.match(src,/\/email\/concierge\/folder/);
  assert.match(src,/connectionId/);
});

console.log("EMAIL_MAILBOX_ACCOUNT_SWITCH_UI=GREEN");
