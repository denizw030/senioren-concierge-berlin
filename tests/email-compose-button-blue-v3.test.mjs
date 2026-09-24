import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const js=fs.readFileSync("assets/email-concierge-product.js","utf8");

test("New Message button is compact blue and evenly spaced",()=>{
  assert.match(js,/\.ecp-tb-compose-button\{[^}]*margin:12px/);
  assert.match(js,/\.ecp-tb-compose-button\{[^}]*min-height:36px/);
  assert.match(js,/\.ecp-tb-compose-button\{[^}]*padding:8px 12px/);
  assert.match(js,/\.ecp-tb-compose-button\{[^}]*background:linear-gradient\(180deg,#2f7dff,#1765e8\)/);
  assert.match(js,/\.ecp-tb-compose-button\{[^}]*color:#fff/);
  assert.match(js,/\.ecp-tb-compose-button\{[^}]*font-size:\.78rem/);
});

console.log("EMAIL_COMPOSE_BUTTON_BLUE_V3=GREEN");
