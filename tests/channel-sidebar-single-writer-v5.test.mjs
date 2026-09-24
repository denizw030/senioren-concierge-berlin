import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");

test("channel sidebar is idempotent and does not rebuild unchanged DOM",()=>{
  assert.match(client,/let sidebarRenderSignature = ""/);
  assert.match(client,/function sidebarSignatureFor\(list\)/);
  assert.match(client,/if\(!force&&signature===sidebarRenderSignature&&box\.childElementCount>0\)return false/);
  assert.match(client,/box\.dataset\.nwSidebarRenderer="single-writer-v5"/);
  assert.match(client,/box\.dataset\.nwSidebarClient="56"/);
});

test("virtual channel rows can never fall back to combined preview text",()=>{
  assert.doesNotMatch(client,/preview:lines\.join\(" · "\)/);
  assert.doesNotMatch(client,/preview:whatsappMeta\.join\(" · "\)/);
  assert.doesNotMatch(client,/preview:phoneMeta\.join\(" · "\)/);
  assert.doesNotMatch(client,/preview:emailMeta\.join\(" · "\)/);
  assert.match(client,/if\(b\.dataset\.chatScope==="CHANNEL"\)/);
  assert.match(client,/const metaLines=normalizeChannelMetaLines\(thread\.meta_lines\)/);
});

test("unchanged channel metadata does not trigger a sidebar repaint",()=>{
  assert.match(client,/const changed=\["WHATSAPP","PHONE","EMAIL"\]\.some/);
  assert.match(client,/if\(changed\)\{\s*applyChannelMetaToThreadCache\(\);\s*renderThreads\(\);/s);
});

test("only one concierge runtime can start timers in a page",()=>{
  assert.match(client,/WEB_CONCIERGE_CLIENT_VERSION = 56/);
  assert.match(client,/WEB_CONCIERGE_RUNTIME_KEY/);
  assert.match(client,/if\(window\[WEB_CONCIERGE_RUNTIME_KEY\]\?\.active===true\)return/);
});
