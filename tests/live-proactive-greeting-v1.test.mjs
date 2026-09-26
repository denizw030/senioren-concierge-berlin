import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const client=read("assets/nahwerk-live-concierge.js");
const boot=read("assets/web-live-concierge.js");
const webLegacy=read("web-concierge.html");
const webClean=read("web-concierge/index.html");
const app=read("app-live.html");

test("Live client proactively triggers exactly one first response",()=>{
  assert.match(client,/startWithGreeting=false,initialGreetingSent=false/);
  assert.match(client,/if\(startWithGreeting&&!initialGreetingSent\)/);
  assert.match(client,/initialGreetingSent=true/);
  assert.match(client,/sendEvent\(\{type:"response\.create"\}\)/);
});

test("client requires server greeting contract before proactive response",()=>{
  assert.match(client,/live\?\.start_with_greeting===true/);
  assert.match(client,/live-proactive-greeting-v1/);
  assert.match(client,/LIVE_INITIAL_GREETING_MISSING/);
});

test("Web and App bust cache to the proactive greeting client",()=>{
  assert.match(boot,/nahwerk-live-concierge\.js\?v=24/);
  assert.match(webLegacy,/web-live-concierge\.js\?v=24/);
  assert.match(webClean,/web-live-concierge\.js\?v=24/);
  assert.match(app,/nahwerk-live-concierge\.js\?v=24/);
});
