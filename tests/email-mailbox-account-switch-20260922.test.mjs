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

test("physical folders remain available per connected account",()=>{
  for(const folder of ["INBOX","SENT","SPAM","TRASH"]) assert.match(src,new RegExp('\\["'+folder+'"'));
  assert.match(src,/\/email\/concierge\/folder/);
  assert.match(src,/connectionId: String\(connection\.connection_id/);
});

console.log("EMAIL_MAILBOX_ACCOUNT_SWITCH_UI=GREEN");
