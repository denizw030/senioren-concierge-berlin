import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");
const css=fs.readFileSync("assets/web-customer-concierge.css","utf8");

test("WhatsApp channel renders both numbers without a Concierge text prefix",()=>{
  assert.match(client,/concierge_whatsapp_number/);
  assert.match(client,/customerWhatsapp/);
  assert.match(client,/conciergeWhatsapp/);
  assert.match(client,/next\.WHATSAPP=normalizeChannelMetaLines\(\[\s*customerWhatsapp,\s*conciergeWhatsapp\s*\]\)/s);
  assert.doesNotMatch(client,/Concierge "\+conciergeWhatsapp/);
});

test("phone channel renders the authenticated customer's E.164 phone plus customer number",()=>{
  assert.match(client,/const customerPhone=String\(phoneResult\.value\?\.phone_number/);
  assert.match(client,/next\.PHONE=normalizeChannelMetaLines\(\[customerPhone,customerNumber\?/);
  assert.match(client,/Kundennr\. \$\{customerNumber\}/);
  assert.doesNotMatch(client,/function formatSidebarPhone/);
});

test("email fallback keeps customer email before core email",()=>{
  assert.match(client,/customer_email\|\|""\)\.trim\(\),String\(emailResult\.value\?\.email_address/);
});

test("channel sidebar cannot overflow horizontally",()=>{
  assert.match(css,/\.web-concierge-sidebar\{[^}]*overflow-x:hidden/);
  assert.match(css,/\.web-concierge-threads\{[^}]*overflow-x:hidden/);
  assert.match(css,/\.web-concierge-thread\{[^}]*overflow:hidden/);
  assert.match(css,/\.web-concierge-thread-preview\{[^}]*overflow:hidden/);
  assert.match(css,/\.web-concierge-thread-preview-line\{[^}]*max-width:100%/);
});
