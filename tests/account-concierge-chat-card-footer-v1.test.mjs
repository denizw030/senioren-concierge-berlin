import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const account=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");
const helper=fs.readFileSync("assets/web-concierge-chat.js","utf8");

test("concierge tab uses a balanced two-card desktop layout",()=>{
  assert.match(account,/class="card personalize concierge-panel"/);
  assert.doesNotMatch(account,/class="card wide personalize concierge-panel"/);
  assert.match(account,/class="card concierge-chat-card"/);
  assert.match(account,/id="conciergeChatCard"/);
  assert.match(account,/id="conciergeChatAvatar"/);
  assert.match(account,/id="conciergeChatName"/);
  assert.match(account,/Direkt chatten/);
  assert.match(account,/Chat öffnen/);
  assert.match(account,/href="\/web-concierge"/);
  assert.match(account,/\.concierge-panel,\s*\.concierge-chat-card\{\s*grid-column:span 6!important;/s);
  assert.match(account,/\.concierge-chat-portrait\{[^}]*width:104px;[^}]*height:104px;[^}]*border-radius:50%/s);
});

test("concierge keeps WhatsApp response routing in the dedicated response-channel card",()=>{
  assert.match(account,/id="responseChannelCard"/);
  assert.match(account,/name="responseChannel" value="SAME_CHANNEL"/);
  assert.match(account,/name="responseChannel" value="EMAIL"/);
  assert.match(account,/name="responseChannel" value="CALL"/);
  assert.match(account,/id="responseChannelSave">Speichern<\/button>/);
  assert.doesNotMatch(account,/data-response-channel-quick=/);
});

test("chat card gets authoritative persona name and image",()=>{
  assert.match(helper,/document\.getElementById\("conciergeChatName"\)/);
  assert.match(helper,/document\.getElementById\("conciergeChatAvatar"\)/);
  assert.match(helper,/document\.getElementById\("conciergeChatCard"\)/);
  assert.match(helper,/chatName\.textContent = persona\?\.name/);
  assert.match(helper,/chatAvatar\.style\.backgroundImage = persona/);
  assert.match(helper,/chatCard\.dataset\.personaSource = persona \? "central" : "pending"/);
  assert.match(helper,/Mit \$\{persona\.name\} chatten/);
});

test("account footer has a final page-level pure-black override",()=>{
  assert.match(account,/id="konto-concierge-chat-footer-v1"/);
  assert.match(account,/footer\.footer[\s\S]*background:#000000!important/);
  assert.match(account,/footer\.footer>\.wrap[\s\S]*background:#000000!important/);
  assert.match(account,/footer\.footer \.footergrid[\s\S]*background:#000000!important/);
  assert.match(account,/footer\.footer \.footbottom[\s\S]*background:#000000!important/);
  assert.match(account,/footer\.footer::before[\s\S]*content:none!important/);
  assert.match(account,/footer\.footer::after[\s\S]*display:none!important/);
});

test("clean /konto route remains identical except for its base element",()=>{
  assert.equal(clean.replace('<head><base href="/">','<head>'),account);
  assert.match(clean,/assets\/web-concierge-chat\.js\?v=3/);
});
