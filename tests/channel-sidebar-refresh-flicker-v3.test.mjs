import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");

test("channel metadata is decoupled from the 3-second thread refresh",()=>{
  assert.match(client,/CHANNEL_META_REFRESH_MS = 60000/);
  assert.match(client,/CHANNEL_META_CACHE_KEY = "nw_web_channel_sidebar_meta_v1"/);
  assert.match(client,/function refreshChannelSidebarMeta/);
  const start=client.indexOf("async function loadThreads");
  const end=client.indexOf("async function refreshThread",start);
  const block=client.slice(start,end);
  assert.match(block,/sidebarMetaLines\("WHATSAPP"\)/);
  assert.match(block,/sidebarMetaLines\("PHONE"\)/);
  assert.match(block,/sidebarMetaLines\("EMAIL"\)/);
  assert.doesNotMatch(block,/Promise\.allSettled\(\[\s*channelHistoryRequest\("WHATSAPP"/s);
});

test("stable session cache keeps metadata visible through normal syncs and reloads",()=>{
  assert.match(client,/sessionStorage\.getItem\(CHANNEL_META_CACHE_KEY\)/);
  assert.match(client,/sessionStorage\.setItem\(CHANNEL_META_CACHE_KEY/);
  assert.match(client,/applyChannelMetaToThreadCache\(\)/);
});

test("transient history failures do not clear visible channel metadata",()=>{
  const start=client.indexOf("async function loadThreads");
  const end=client.indexOf("async function refreshThread",start);
  const block=client.slice(start,end);
  assert.match(block,/if\(threadCache\.length\)\{\s*renderThreads\(\);\s*return false;/s);
});
