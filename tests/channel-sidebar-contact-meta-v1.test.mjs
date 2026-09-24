import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");
const css=fs.readFileSync("assets/web-customer-concierge.css","utf8");

test("channel sidebar renders multiple metadata lines",()=>{
  assert.match(client,/thread\.meta_lines/);
  assert.match(client,/web-concierge-thread-preview-line/);
  assert.match(css,/\.web-concierge-thread-preview-line/);
});

test("phone sidebar shows local phone plus customer number",()=>{
  assert.match(client,/function formatSidebarPhone/);
  assert.match(client,/Kundennr\. \$\{customerNumber\}/);
  assert.match(client,/phoneResult\.value\?\.phone_number/);
  assert.match(client,/phoneResult\.value\?\.customer_number/);
});

test("email sidebar renders both returned email addresses",()=>{
  assert.match(client,/emailResult\.value\?\.email_addresses/);
  assert.match(client,/slice\(0,2\)/);
});
