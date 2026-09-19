import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("web chat mounts Live Concierge on the right without replacing voice memo",()=>{
  for(const page of ["web-concierge.html","web-concierge/index.html"]){
    const html=read(page);
    assert.match(html,/assets\/web-voice-memo\.js\?v=2/);
    assert.match(html,/assets\/web-customer-concierge\.js\?v=22/);
    assert.match(html,/assets\/web-live-concierge\.js\?v=2/);
    assert.match(html,/assets\/nahwerk-live-concierge\.css\?v=2/);
  }
  const boot=read("assets/web-live-concierge.js");
  assert.match(boot,/send\.after\(button\)/);
  assert.match(boot,/channel:"WEB"/);
  assert.match(boot,/getThreadId/);
  assert.match(boot,/isAllowed/);
});

test("Live client uses WebRTC, central delegation and active concierge portrait",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/navigator\.mediaDevices\.getUserMedia/);
  assert.match(client,/new RTCPeerConnection/);
  assert.match(client,/createDataChannel\("oai-events"\)/);
  assert.match(client,/\/session/);
  assert.match(client,/session\.delegation\.created/);
  assert.match(client,/session\.commentary\.append/);
  assert.match(client,/assets\/concierges\/large/);
  assert.match(client,/--nw-live-level/);
  assert.doesNotMatch(client,/OPENAI_API_KEY|sk-[A-Za-z0-9]/);
});

test("native app Live page accepts token only in memory and uses APP channel",()=>{
  const page=read("app-live.html");
  assert.match(page,/channel:"APP"/);
  assert.match(page,/startNahwerkAppLive/);
  assert.match(page,/getAuthToken:\(\)=>token/);
  assert.doesNotMatch(page,/[?&](?:session_)?token=/i);
  assert.doesNotMatch(page,/location\\.(?:search|href).*token/i);
});

test("Live visual surface has reactive blue portrait orb",()=>{
  const css=read("assets/nahwerk-live-concierge.css");
  assert.match(css,/\.nw-live-orb/);
  assert.match(css,/--nw-live-level/);
  assert.match(css,/#246bff/i);
  assert.match(css,/\.nw-live-image/);
});

test("web chat exposes only current authenticated thread bridge to Live",()=>{
  const chat=read("assets/web-customer-concierge.js");
  assert.doesNotThrow(()=>new Function(chat),"customer chat client must remain valid JavaScript");
  assert.ok(chat.includes('const timeoutMs=path==="/health"?8000'),"gateway health timeout block must stay parse-safe");
  assert.match(chat,/NAHWERKWebCustomerConciergeLiveBridge/);
  assert.match(chat,/sessionToken/);
  assert.match(chat,/threadId/);
  assert.match(chat,/channelView==="CHAT"/);
});


test("web chat keeps session validation nonblocking while gateway validates every authenticated request",()=>{
  const chat=read("assets/web-customer-concierge.js");
  assert.match(chat,/SCBAuth\?\.validateSession/);
  assert.match(chat,/const token=sessionToken\(\)/);
  assert.match(chat,/ready=await checkReadiness\(\)/);
  assert.match(chat,/headers\.Authorization=\`Bearer \$\{token\}\`/);
});

test("web and WhatsApp stay separate with normal chat first",()=>{
  const scope=read("assets/web-customer-concierge-thread-scope.js");
  assert.match(scope,/title:"WhatsApp"/);
  assert.match(scope,/channels:\["WEB","APP"\]/);
  assert.match(scope,/channels:\["WHATSAPP"\]/);
  assert.match(scope,/payload\.threads=\[\.\.\.projected,\.\.\.extras\]/);
  assert.match(scope,/readOnly:next==="WHATSAPP"\|\|next==="TELEGRAM"/);
});
