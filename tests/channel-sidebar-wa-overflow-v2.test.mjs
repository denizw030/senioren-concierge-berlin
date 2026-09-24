import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");
const css=fs.readFileSync("assets/web-customer-concierge.css","utf8");

test("WhatsApp channel renders customer and concierge numbers as two lines",()=>{
  assert.match(client,/concierge_whatsapp_number/);
  assert.match(client,/customerWhatsapp/);
  assert.match(client,/conciergeWhatsapp/);
  assert.match(client,/Concierge "\+conciergeWhatsapp/);
  assert.match(client,/next\[1\]\.meta_lines/);
});

test("phone channel stays on concierge number plus customer number",()=>{
  assert.match(client,/phoneResult\.value\?\.phone_number/);
  assert.match(client,/Kundennr\. \$\{customerNumber\}/);
});

test("channel sidebar cannot overflow horizontally",()=>{
  assert.match(css,/\.web-concierge-sidebar\{[^}]*overflow-x:hidden/);
  assert.match(css,/\.web-concierge-threads\{[^}]*overflow-x:hidden/);
  assert.match(css,/\.web-concierge-thread\{[^}]*overflow:hidden/);
  assert.match(css,/\.web-concierge-thread-preview\{[^}]*overflow:hidden/);
  assert.match(css,/\.web-concierge-thread-preview-line\{[^}]*max-width:100%/);
});
