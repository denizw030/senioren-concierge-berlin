import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");

test("channel metadata survives each 3-second thread refresh",()=>{
  assert.match(client,/const existingWhatsApp=threadCache\.find/);
  assert.match(client,/const existingPhone=threadCache\.find/);
  assert.match(client,/const existingEmail=threadCache\.find/);
  assert.match(client,/meta_lines:preservedMeta\(existingWhatsApp\)/);
  assert.match(client,/meta_lines:preservedMeta\(existingPhone\)/);
  assert.match(client,/meta_lines:preservedMeta\(existingEmail\)/);
});

test("transient history failures do not clear visible channel metadata",()=>{
  const start=client.indexOf("async function loadThreads");
  const end=client.indexOf("async function refreshThread",start);
  const block=client.slice(start,end);
  assert.match(block,/if\(threadCache\.length\)\{\s*renderThreads\(\);\s*return false;/s);
});

test("channel summary replacements remain generation-safe",()=>{
  assert.match(client,/if\(generation!==threadsLoadGeneration\)return;/);
  assert.match(client,/const next=\[chatThread,\{\.\.\.whatsappThread\},\{\.\.\.phoneThread\},\{\.\.\.emailThread\}\]/);
});
