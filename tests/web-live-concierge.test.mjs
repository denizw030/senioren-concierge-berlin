import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("web chat mounts Live Concierge on the right without replacing voice memo",()=>{
  for(const page of ["web-concierge.html","web-concierge/index.html"]){
    const html=read(page);
    assert.match(html,/assets\/web-voice-memo\.js\?v=4/);
    assert.match(html,/assets\/web-customer-concierge\.js\?v=24/);
    assert.match(html,/assets\/web-live-concierge\.js\?v=4/);
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
  assert.match(scope,/payload\.threads=\[\.\.\.projected,\.\.\.extras,\.\.\.channelThreads\]/);
  assert.match(scope,/readOnly:next==="WHATSAPP"\|\|next==="TELEGRAM"/);
});


test("Live preloads the active concierge portrait and reports safe client failures",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/currentPersonaFromPage/);
  assert.match(client,/setPersona\(currentPersonaFromPage\(\)\)/);
  assert.match(client,/MIC_PERMISSION_DENIED/);
  assert.match(client,/\/client-error/);
});

test("channel chats are grouped after normal chats and delete-all uses the shared reset endpoint",()=>{
  const scope=read("assets/web-customer-concierge-thread-scope.js");
  const chat=read("assets/web-customer-concierge.js");
  assert.match(scope,/payload\.threads=\[\.\.\.projected,\.\.\.extras,\.\.\.channelThreads\]/);
  assert.doesNotMatch(scope,/channels\.has\("WHATSAPP"\)/);
  assert.match(scope,/chatChannelFirst/);
  assert.match(chat,/\/web\/chats\/reset/);
  assert.match(chat,/Alle Chats aus Web und App entfernen/);
  assert.match(read("assets/web-customer-concierge.css"),/content:"CHAT KANÄLE"/);
});


// PERSISTENT_CHANNEL_SECTION_V1
test("WhatsApp channel stays visible under Chat Kanäle even without a current WhatsApp turn",()=>{
  const scope=read("assets/web-customer-concierge-thread-scope.js");
  const css=read("assets/web-customer-concierge.css");
  assert.match(scope,/channelThreads\.push\(\{[\s\S]*title:"WhatsApp"/);
  assert.doesNotMatch(scope,/if\(channels\.has\("WHATSAPP"\)\)/);
  assert.match(css,/content:"CHAT KANÄLE"/);
  assert.match(read("web-concierge/index.html"),/web-customer-concierge-thread-scope\.js\?v=5/);
});


test("composer uses one blue GPT-style action button for Live or send",()=>{
  const boot=read("assets/web-live-concierge.js");
  const css=read("assets/web-customer-concierge.css");
  assert.match(boot,/send\.hidden=true/);
  assert.match(boot,/is-send-mode/);
  assert.match(boot,/Nachricht senden/);
  assert.match(boot,/bindTrigger:false/);
  assert.match(css,/#webConciergeSend\[hidden\]\{display:none!important\}/);
});

test("voice memo remains audio in history and receives an audio reply",()=>{
  const memo=read("assets/web-voice-memo.js");
  const chat=read("assets/web-customer-concierge.js");
  assert.match(memo,/\/web\/audio-message/);
  assert.match(memo,/form\.append\("audio"/);
  assert.match(memo,/thread_id/);
  assert.doesNotMatch(memo,/e\.input\.value = transcript/);
  assert.match(chat,/appendAudioMessage/);
  assert.match(chat,/audio_message_id/);
});

test("GPT-Live transcript is persisted into the active chat",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/\/transcript/);
  assert.match(client,/session\.input_transcript\.delta/);
  assert.match(client,/session\.output_transcript\.delta/);
  assert.match(client,/flushUserTranscript/);
  assert.match(client,/flushAssistantTranscript/);
  assert.match(client,/ICE_GATHERING_TIMEOUT/);
});


test("force-refreshes the browser session before text, voice memo and Live writes",()=>{
  const auth=read("assets/auth-nav.js");
  const chat=read("assets/web-customer-concierge.js");
  const memo=read("assets/web-voice-memo.js");
  const live=read("assets/web-live-concierge.js");
  assert.match(auth,/validateSession\(force = false\)/);
  assert.match(chat,/validateSession\(true\)/);
  assert.match(memo,/validateSession\(true\)/);
  assert.match(live,/validateSession\(true\)/);
});


test("voice recording uses the send arrow directly instead of a stop square",()=>{
  const memo=read("assets/web-voice-memo.js");
  const css=read("assets/web-voice-memo.css");
  assert.match(memo,/function stopAndSend\(\)/);
  assert.match(memo,/sendWhenStopped = true/);
  assert.doesNotMatch(memo,/>■<\/button>/);
  assert.match(memo,/aria-label="Sprachmemo senden"/);
  assert.match(css,/background:#2f7df6/);
});
