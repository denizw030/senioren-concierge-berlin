import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
// FINAL_THEME_LIVE_SDP_V31_GREEN
// LIVE_TRANSCRIPT_HISTORY_V2_FINAL
// NONBLOCKING_AUTH_FINAL_V25

test("web chat mounts Live Concierge on the right without replacing voice memo",()=>{
  for(const page of ["web-concierge.html","web-concierge/index.html"]){
    const html=read(page);
    assert.match(html,/assets\/web-voice-memo\.js\?v=10/);
    assert.match(html,/assets\/web-customer-concierge\.js\?v=39/);
    assert.match(html,/assets\/web-live-concierge\.js\?v=18/);
    assert.match(html,/assets\/nahwerk-live-concierge\.css\?v=4/);
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

test("web, WhatsApp, phone and E-Mail stay separate with normal chat first",()=>{
  const chat=read("assets/web-customer-concierge.js");
  assert.match(chat,/const next=\[chatThread,\{/);
  assert.match(chat,/title:"WhatsApp"/);
  assert.match(chat,/channels:\["WEB","APP"\]/);
  assert.match(chat,/channels:\["WHATSAPP"\]/);
  assert.match(chat,/title:"Telefonprotokoll"/);
  assert.match(chat,/title:"E-Mail-Protokoll"/);
  assert.match(chat,/channelViewReadOnly=view!=="CHAT"/);
});


test("Live preloads the active concierge portrait and reports safe client failures",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/currentPersonaFromPage/);
  assert.match(client,/setPersona\(currentPersonaFromPage\(\)\)/);
  assert.match(client,/MIC_PERMISSION_DENIED/);
  assert.match(client,/\/client-error/);
});

test("channel chats are grouped after normal chat and delete-all uses the shared reset endpoint",()=>{
  const chat=read("assets/web-customer-concierge.js");
  assert.match(chat,/const next=\[chatThread,\{/);
  assert.match(chat,/next\.push\(\{[\s\S]*VIRTUAL_PHONE_THREAD_ID/);
  assert.match(chat,/next\.push\(\{[\s\S]*VIRTUAL_EMAIL_THREAD_ID/);
  assert.match(chat,/\/web\/chats\/reset/);
  assert.match(chat,/Alle Chats aus Web und App entfernen/);
});


// PERSISTENT_CHANNEL_SECTION_V1
test("WhatsApp channel stays visible without a current WhatsApp turn",()=>{
  const chat=read("assets/web-customer-concierge.js");
  assert.match(chat,/thread_id:VIRTUAL_WHATSAPP_THREAD_ID,title:"WhatsApp"/);
  assert.doesNotMatch(chat,/if\([^\n]*WHATSAPP[^\n]*\)\{\s*next\.push/);
  assert.doesNotMatch(read("web-concierge/index.html"),/web-customer-concierge-thread-scope\.js/);
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


test("chat voice and Live do not block on duplicate browser session preflight",()=>{
  const chat=read("assets/web-customer-concierge.js");
  const memo=read("assets/web-voice-memo.js");
  const live=read("assets/web-live-concierge.js");
  assert.doesNotMatch(chat,/validateSession\(true\)/);
  assert.doesNotMatch(memo,/validateSession\(true\)/);
  assert.doesNotMatch(live,/validateSession\(true\)/);
  assert.match(chat,/sessionToken\(\)/);
  assert.match(memo,/const session = token\(\)/);
  assert.match(live,/bridge\(\)\?\.sessionToken/);
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


test("theme switch is bound to the canonical portal theme and Live honors light mode",()=>{
  const html=read("web-concierge/index.html");
  const chat=read("assets/web-customer-concierge.js");
  const css=read("assets/web-customer-concierge.css");
  const liveCss=read("assets/nahwerk-live-concierge.css");
  assert.match(html,/id="webConciergeThemeToggle"/);
  assert.match(chat,/PORTAL_THEME_KEY = "nw_portal_theme_v1"/);
  assert.match(chat,/initThemeToggle\(\)/);
  assert.match(chat,/dataset\.nwPortalTheme=normalized/);
  assert.match(css,/WEB_CHAT_PORTAL_THEME_HEADER_V1/);
  assert.match(liveCss,/LIVE_PORTAL_THEME_SYNC_V1/);
});

test("Live offer is audio-only, ICE-complete and keeps an initial SDP fallback",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/getUserMedia\(\{audio:true,video:false\}\)/);
  assert.match(client,/getAudioTracks\(\)/);
  assert.match(client,/await waitForIce\(pc\)/);
  assert.match(client,/initial_sdp:initialSdp/);
  assert.match(client,/LOCAL_SDP_INCOMPLETE/);
});


test("remote SDP answer is preserved and retried with CRLF framing only after parse failure",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/function normalizedRemoteSdp/);
  assert.match(client,/setRemoteDescription\(\{type:"answer",sdp:remoteSdp\}\)/);
  assert.match(client,/setRemoteDescription\(\{type:"answer",sdp:repaired\}\)/);
  assert.match(client,/REMOTE_SDP_INVALID/);
});

test("Live pricing is quoted through the authenticated gateway before microphone/provider start",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  assert.match(client,/LIVE_AUTHENTICATED_PRICE_QUOTE_V2_20260920/);
  assert.ok(client.includes('post("/quote",{channel:ch})'));
  assert.match(client,/price_acknowledged/);
  assert.match(client,/price_version/);
  assert.match(client,/sekundengenau/);
  assert.match(client,/max_seconds/);
  assert.doesNotMatch(client,/live_voice_public_price_v1/);
  assert.doesNotMatch(client,/LIVE_PRICE_KEY/);
  assert.match(client,/session\.closed[\s\S]*notifyBackend:true/);
});


test("GPT-Live transcript deltas persist immediately and chat refreshes after Live ends",()=>{
  const client=read("assets/nahwerk-live-concierge.js");
  const boot=read("assets/web-live-concierge.js");
  const chat=read("assets/web-customer-concierge.js");
  assert.match(client,/session\.input_transcript\.delta/);
  assert.match(client,/session\.output_transcript\.delta/);
  assert.match(client,/persistTranscript\("USER",delta,start,end/);
  assert.match(client,/persistTranscript\("ASSISTANT",delta,start,end/);
  assert.match(client,/delta:user:/);
  assert.match(client,/delta:assistant:/);
  assert.match(client,/response\.event/);
  assert.match(client,/TRANSCRIPT_WRITE_/);
  assert.match(boot,/nahwerk:live-ended/);
  assert.match(chat,/nahwerk:live-ended/);
  assert.match(chat,/refreshThread\(activeThreadId,\{force:true,reset:true\}\)/);
});
