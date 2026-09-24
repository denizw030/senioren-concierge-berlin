import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("assets/email-concierge-product.js","utf8");
const css=fs.readFileSync("assets/email-concierge-product.css","utf8");
const integration=fs.readFileSync("assets/email-account-integration.js","utf8");

function hooks(){const sandbox={console};vm.createContext(sandbox);vm.runInContext(js,sandbox);return sandbox.NAHWERKEmailConciergeProductTestHooks}
const api=hooks();

test("standalone E-Mail-Concierge uses only the canonical PROD email runtime",()=>{
  assert.equal(api.BASE,"https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime");
  assert.match(js,/\/email\/concierge\/dashboard/);
  assert.match(js,/\/email\/concierge\/query/);
  assert.match(js,/\/email\/concierge\/messages\/open/);
  assert.match(js,/\/email\/concierge\/activity\?limit=50/);
  assert.match(js,/\/email\/concierge\/settings/);
  assert.match(js,/\/email\/concierge\/rules\/suggestion/);
  assert.match(js,/\/email\/concierge\/rules\/update/);
  assert.match(js,/\/email\/concierge\/rules\/delete/);
});


test("customer UI contains the complete Thunderbird-style mail workspace",()=>{
  for(const phrase of ["NAHWERK Mail","Alle Posteingänge","Posteingang","Spam","Gesendet","Entwürfe","Papierkorb","Concierge","Automatik & Schutz","Aktivität"]) assert.ok(js.includes(phrase),phrase);
  assert.deepEqual(Array.from(api.CANONICAL_FOLDERS),["INBOX","SPAM","SENT","DRAFTS","TRASH"]);
  assert.match(js,/const folders = \[\["INBOX","Posteingang","▣"\],\["SPAM","Spam","⚑"\],\["SENT","Gesendet","➤"\],\["DRAFTS","Entwürfe","✎"\],\["TRASH","Papierkorb","⌫"\]\]/);
  assert.doesNotMatch(js,/const folders = .*IMPORTANT/);
  assert.doesNotMatch(js,/const folders = .*UNIMPORTANT/);
  assert.doesNotMatch(js,/const folders = .*REPLY/);
  assert.match(js,/ecp-thunderbird/);
  assert.match(js,/ecp-tb-list-pane/);
  assert.match(js,/ecp-tb-reader/);
});

test("spam fraud sorting and activity controls are customer configurable",()=>{
  const names=Object.keys(api.SETTINGS);
  for(const key of ["FRAUD_PROTECTION","SPAM_PROTECTION","IMPORTANT","INVOICES","APPOINTMENTS","TRAVEL","ORDERS","PERSONAL","SUPPORT_CONTRACTS","REPLY_ASSISTANT","PROACTIVE_HINTS","ACTIVITY_DIGEST","UNIMPORTANT_AUTO_TRASH"]) assert.ok(names.includes(key),key);
});

test("dashboard normalization fails closed and keeps bounded arrays",()=>{
  assert.equal(api.normalizeDashboard({ok:false}),null);
  const data=api.normalizeDashboard({ok:true,summary:{important:2,unread:3},highlights:[{id:"m1"}],drafts:[{id:"d1"}],activities:[],rules:[{id:"r1"}],suggestions:[{candidate_id:"c1"}],channels:{web:{state:"ACTIVE"}}});
  assert.equal(data.summary.important,2);assert.equal(data.summary.unread,3);assert.equal(data.highlights.length,1);assert.equal(data.drafts.length,1);assert.equal(data.rules.length,1);assert.equal(data.suggestions.length,1);assert.equal(data.channels.web.state,"ACTIVE");
});

test("message content is rendered through textContent helpers, not injected HTML",()=>{
  assert.match(js,/node\.textContent = value/);
  assert.doesNotMatch(js,/innerHTML\s*=/);
  assert.doesNotMatch(js,/insertAdjacentHTML/);
});

test("sending remains an explicit customer action with a second confirmation",()=>{
  assert.match(js,/Freigeben & senden/);
  assert.match(js,/Diese E-Mail jetzt wirklich senden\?/);
  assert.match(js,/Erst mit „OK“ gibst du den Versand ausdrücklich frei/);
  assert.match(js,/\/email\/concierge\/drafts\/approve-send/);
  assert.doesNotMatch(js,/\/email\/drafts\/send/);
  assert.match(js,/E-Mails werden nur nach deiner ausdrücklichen Freigabe gesendet/);
});

test("draft edit and discard never imply a send",()=>{
  assert.match(js,/\/email\/concierge\/drafts\/edit/);
  assert.match(js,/\/email\/concierge\/drafts\/discard/);
  assert.match(js,/Es wird nichts gesendet/);
});

test("mail workspace stays standalone and does not require WhatsApp",()=>{
  assert.match(js,/ecp-thunderbird/);
  assert.match(js,/channels\.whatsapp\?\.state/);
  assert.doesNotMatch(js,/if\s*\(\s*!dashboard\.channels\?\.whatsapp/);
});

test("account integration loads product assets only from first-party paths and syncs connection state",()=>{
  assert.match(integration,/\/assets\/email-concierge-product\.css/);
  assert.match(integration,/\/assets\/email-concierge-product\.js/);
  assert.match(integration,/syncProduct\(state === "CONNECTED"\)/);
  assert.match(integration,/syncProduct\(false\)/);
});

test("product layout is responsive across desktop and mobile",()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1\.45fr\) minmax\(280px,\.8fr\)/);
  assert.match(css,/@media\(max-width:1180px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/body\.account-premium-ui:has\(#accountEmailCard:not\(\[hidden\]\)\) \.nw-floating-concierge/);
  assert.match(js,/ecp-rule ecp-rule-personal/);
  assert.match(js,/ecp-rule-title-row/);
  assert.match(js,/\.ecp-rule-controls\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(integration,/email-concierge-product\.css\?v=[0-9-]+/);
  assert.match(integration,/email-concierge-product\.js\?v=[0-9-]+/);
});


test("connected account overview is topmost and follows canonical provider status",()=>{
  const multi=fs.readFileSync("assets/email-multi-account-concierge-v1.js","utf8");
  assert.match(js,/accountRoot\.querySelector\("\.email-account-head"\)/);
  assert.match(js,/accountHead\.insertAdjacentElement\("afterend", host\)/);
  assert.match(js,/__nahwerkEmailConnections/);
  assert.match(js,/nahwerk:email-connections-updated/);
  assert.ok(js.includes("async function loadConnections()"));
  assert.ok(js.includes("emailConnections = list(data?.connections).filter"));
  assert.ok(js.includes('activeConnectionId = String(emailConnections[0]?.connection_id || "")'));
  assert.match(multi,/emailConciergeProduct/);
  assert.match(multi,/accountRoot\.querySelector\("\.email-account-head"\)/);
  assert.doesNotMatch(multi,/emailLogoConnectShell/);
});


test("personal rule UI requires explicit customer confirmation and stays reversible",()=>{
  assert.match(js,/Vorschläge deines Concierges/);
  assert.match(js,/Nur intern als unwichtig einstufen/);
  assert.doesNotMatch(js,/Künftig automatisch archivieren/);
  assert.doesNotMatch(js,/\["ARCHIVE", "Archivieren"\]/);
  assert.match(js,/Künftig automatisch in den Papierkorb/);
  assert.match(js,/decision: "CONFIRM"/);
  assert.match(js,/decision: "REJECT"/);
  assert.match(js,/rule_id: rule\.id, active: input\.checked/);
  assert.match(js,/rule_id: rule\.id, action: select\.value/);
  assert.match(js,/persönliche E-Mail-Regel wirklich löschen/i);
  assert.match(js,/endgültiges Löschen bleibt deaktiviert/);
  assert.match(js,/\/email\/concierge\/rules\/backfill\/preview/);
  assert.match(js,/\/email\/concierge\/rules\/backfill\/apply/);
  assert.match(js,/confirmed: true/);
  assert.match(js,/Sie werden nicht endgültig gelöscht/);
  assert.match(js,/Zukünftig: passende E-Mails automatisch in den Gmail-Papierkorb/);
});

test("important and unimportant controls remain directly visible on every classifiable mail",()=>{
  assert.match(js,/\["IMPORTANT", "Wichtig"\]/);
  assert.match(js,/\["UNIMPORTANT", "Unwichtig"\]/);
  assert.match(js,/classification\/override/);
  assert.match(js,/@media\(max-width:640px\).*ecp-class-actions/s);
});

test("global unimportant auto-trash is explicit, reversible and never permanent delete",()=>{
  assert.match(js,/UNIMPORTANT_AUTO_TRASH/);
  assert.match(js,/Unwichtige automatisch in Papierkorb/);
  assert.match(js,/confirm\("Unwichtige E-Mails künftig automatisch in den Gmail-Papierkorb verschieben\?/);
  assert.match(js,/Endgültig gelöscht wird nichts/);
});

test("Thunderbird-style workspace keeps folders, message list and reader in one mail client",()=>{
  assert.match(js,/ecp-thunderbird/);
  assert.match(js,/ecp-tb-sidebar/);
  assert.match(js,/ecp-tb-list-pane/);
  assert.match(js,/ecp-tb-reader/);
  assert.match(js,/Posteingang/);
  assert.match(js,/Automatik & Schutz/);
  assert.match(css,/grid-template-columns:260px minmax\(320px,390px\) minmax\(0,1fr\)/);
  assert.match(css,/\.ecp-tb-class-actions/);
});
test("every visible mail can be marked Wichtig or Unwichtig",()=>{
  assert.match(js,/function messageCard\(message, allowOpen = true, allowClassify = true\)/);
  assert.match(js,/\[\["IMPORTANT", "Wichtig"\], \["UNIMPORTANT", "Unwichtig"\]\]/);
  assert.match(js,/messageCard\(mail, true, true\)/);
  assert.match(js,/messageCard\(row, true, true\)/);
  assert.match(js,/const classifiable = sorted \|\| \(data\.message\?\.id/);
  assert.match(js,/syncVisibleClassification\(messageId, value\)/);
});

test("concierge chat renders classification views locally without another Gmail search",()=>{
  assert.match(js,/data\.type === "CLASSIFICATION_VIEW"/);
  assert.match(js,/classification\.buckets\?\.\[String\(data\.classification/);
  assert.match(js,/Zeig mir alle unwichtigen/);
  assert.match(js,/EMAIL_PROVIDER_BUSY/);
  assert.match(js,/E-Mail-Anbieter ist gerade kurz ausgelastet/);
});


test("concierge chat explains internal classification without inventing physical folders",()=>{
  assert.match(js,/Wichtig \/ Unwichtig wird intern gelernt/);
  assert.doesNotMatch(js,/archivieren/);
  assert.match(js,/in den Papierkorb verschieben/);
  assert.match(js,/Antworten vorbereiten/);
  assert.match(js,/GitHub-Mails sind unwichtig/);
});

test("mailbox loading failure is visible and automatically retried once",()=>{
  assert.match(js,/classificationError/);
  assert.match(js,/classificationRetryCount/);
  assert.match(js,/E-Mails konnten gerade nicht geladen werden/);
  assert.match(js,/Erneut laden/);
  assert.match(js,/setTimeout\(\(\)=>\{ if \(connected && !classificationLoading\) void loadClassification\(\); \},1600\)/);
});

test("mailbox keeps a visible loading state for both physical and virtual folder views",()=>{
  assert.match(js,/\.\.\.list\(dashboard\?\.highlights\), \.\.\.list\(dashboard\?\.warnings\)/);
  assert.match(js,/const loading = folderBackedMode\(\) \? mailboxFolderLoading : classificationLoading/);
  assert.match(js,/!rows\.length && loading/);
});


test("quick prompts disappear permanently after the first user message",()=>{
  assert.match(js,/let chatStarted = false/);
  assert.match(js,/chatStarted = true/);
  assert.match(js,/dashboard\.chat\?\.has_user_message === true/);
  assert.match(js,/if \(!hasUserMessage\)/);
  assert.doesNotMatch(js,/card\.append\(log, quick, form\)/);
});

test("mail actions update the Thunderbird workspace immediately and then reconcile with PROD",()=>{
  assert.match(js,/function removeMailboxMessages\(messageIds\)/);
  assert.match(js,/applyQueryResultToMailbox\(data\)/);
  assert.match(js,/await loadDashboard\(false, true\)/);
  assert.match(js,/selectedMessageDetail = null/);
});



test("multi-account mailbox navigation exposes exactly five provider-backed folders",()=>{
  assert.match(js,/\/email\/connections/);
  assert.match(js,/account_email/);
  assert.match(js,/Alle Posteingänge/);
  for(const entry of [
    '["INBOX","Posteingang","▣"]',
    '["SPAM","Spam","⚑"]',
    '["SENT","Gesendet","➤"]',
    '["DRAFTS","Entwürfe","✎"]',
    '["TRASH","Papierkorb","⌫"]'
  ]) assert.ok(js.includes(entry),entry);
  assert.doesNotMatch(js,/const folders = .*IMPORTANT/);
  assert.doesNotMatch(js,/const folders = .*UNIMPORTANT/);
  assert.doesNotMatch(js,/const folders = .*REPLY/);
  assert.match(js,/\/email\/concierge\/folder/);
  assert.doesNotMatch(js,/\/email\/messages\/search/);
  assert.match(js,/accountTitle\.addEventListener\("click",\(\)=>void selectMailboxFolder\(id,"INBOX"\)\)/);
  assert.match(css,/\.ecp-tb-account/);
  assert.match(css,/\.ecp-tb-nav-subitem/);
});

test("draft notifications are customer-controlled per mailbox and channel",()=>{
  assert.match(js,/notification_preference/);
  assert.match(js,/Bei vorbereitetem Antwortentwurf benachrichtigen/);
  assert.match(js,/Nur wenn du das aktivierst/);
  for(const channel of ["PORTAL","WHATSAPP","CALL","EMAIL"]) assert.ok(js.includes(channel),channel);
  assert.match(js,/\/email\/concierge\/notification-preference/);
});


test("Drafts is a real per-account physical folder instead of a synthetic global view",()=>{
  assert.match(js,/CANONICAL_MAILBOX_FOLDERS = Object\.freeze\(\["INBOX","SPAM","SENT","DRAFTS","TRASH"\]\)/);
  assert.match(js,/\["DRAFTS","Entwürfe","✎"\]/);
  assert.doesNotMatch(js,/appendNav\("Entwürfe"/);
  assert.doesNotMatch(js,/readerMode==="DRAFTS"/);
  assert.doesNotMatch(js,/loadAllDrafts/);
  assert.match(js,/searchRemoteFolder\(connection, folder/);
});

test("mailbox switch keeps visible counts for the same account while refreshing",()=>{
  assert.match(js,/const switchingConnection = Boolean\(activeConnectionId && nextConnectionId && activeConnectionId !== nextConnectionId\)/);
  assert.match(js,/if \(switchingConnection\) \{ classification = null; classificationError = ""; \}/);
});

test("remote folder loading uses the authenticated concierge API",()=>{
  assert.match(js,/request\("\/email\/concierge\/folder"/);
  assert.doesNotMatch(js,/allowBare: true/);
  assert.doesNotMatch(js,/\/email\/messages\/search/);
});


test("mailbox refresh failure preserves the last successful message list",()=>{
  assert.match(js,/const previousRows = mailboxFolderRows\.slice\(\)/);
  assert.match(js,/if \(previousRows\.length\) mailboxFolderRows = previousRows/);
  assert.match(js,/streamRemoteFolder\(connection,mailboxFolder,serial/);
});

test("classification updates immediately without reloading the full classification snapshot",()=>{
  assert.match(js,/function applyLocalClassification\(messageId, value\)/);
  assert.match(js,/message\.classification = value/);
  assert.match(js,/applyLocalClassification\(messageId, value\)/);
  const block=js.slice(js.indexOf("async function setMessageClassification"),js.indexOf("function messageCard"));
  assert.doesNotMatch(block,/classification\/summary/);
});

test("mailbox error retry button is centered in a dedicated state",()=>{
  assert.match(js,/ecp-tb-empty ecp-tb-error-state/);
  assert.match(css,/\.ecp-tb-error-state\{min-height:220px;display:grid;align-content:center;justify-items:center/);
  assert.match(css,/\.ecp-tb-error-state \.ecp-tb-toolbar-button/);
});



test("Wichtig and Unwichtig stay internal classifications rather than mailbox folders",()=>{
  assert.match(js,/classification\/override/);
  assert.match(js,/classificationLabel/);
  assert.match(js,/const allowClassify=mailboxScope==="ACCOUNT"&&mailboxFolder==="INBOX"/);
  assert.doesNotMatch(js,/classificationFolderMode/);
  assert.doesNotMatch(js,/const folders = .*IMPORTANT/);
  assert.match(js,/mailbox_location==="TRASH"/);
});

test("physical mailbox counts use live Gmail folder metadata rather than classification totals",()=>{
  assert.match(js,/mailboxFolderCounts/);
  assert.match(js,/folder_meta/);
  assert.match(js,/messages_unread/);
  assert.doesNotMatch(js,/if \(folder === "INBOX"\) return classification\?\.total/);
});


test("UI polling is quota-aware while backend monitoring remains independent",()=>{
  assert.match(js,/setInterval\(\(\)=>\{ void refreshLiveMailbox\(\); \},120000\)/);
  assert.match(js,/visibilitychange/);
  assert.match(js,/await loadConnections\(\); await loadMailboxFolder\(\)/);
  assert.match(js,/REMOTE_FOLDER_CACHE_MS = 15000/);
});


test("bulk Trash removes moved messages from the physical mailbox view",()=>{
  assert.match(js,/function applyQueryResultToMailbox\(data\)/);
  assert.match(js,/if \(ids\.length\) removeMailboxMessages\(ids\)/);
  assert.doesNotMatch(js,/classificationFolderMode/);
  assert.match(js,/await loadMailboxFolder\(\)/);
});

test("classification location badge is styled",()=>{
  assert.match(css,/\.ecp-tb-location-flag/);
});



test("mailbox loads one provider page and dedupes requests instead of quota-heavy pagination",()=>{
  assert.match(js,/REMOTE_FOLDER_CACHE_MS = 15000/);
  assert.match(js,/remoteFolderInflight/);
  assert.match(js,/remoteFolderCache/);
  assert.match(js,/searchRemoteFolder\(connection,folder,30,"",force\)/);
  assert.doesNotMatch(js,/page===0\?30:100/);
  assert.doesNotMatch(js,/while\(pageToken && serial===mailboxLoadSerial && page<100\)/);
  assert.match(js,/mergeMailboxRows/);
});


test("Wichtig Unwichtig is never a physical sidebar folder",()=>{
  assert.match(js,/classificationSavingIds/);
  assert.match(js,/classification\/override/);
  assert.doesNotMatch(js,/const folders = .*IMPORTANT/);
  assert.doesNotMatch(js,/const folders = .*UNIMPORTANT/);
  const selectBlock=js.slice(js.indexOf("async function selectMailboxFolder"),js.indexOf("async function selectAllInboxes"));
  assert.doesNotMatch(selectBlock,/loadDashboard\(false, true\)/);
  assert.match(selectBlock,/void loadMailboxFolder\(\)/);
});

test("manual classification sends visible message metadata to avoid a Gmail reread",()=>{
  assert.match(js,/message_snapshot/);
  assert.match(js,/snippet: message\.snippet \|\| ""/);
});

test("NAHWERK Mail uses a high-contrast white SVG envelope",()=>{
  assert.match(js,/document\.createElementNS\(svgNs,"svg"\)/);
  assert.match(css,/\.ecp-tb-brandmark svg/);
  assert.match(css,/stroke:#fff/);
});


test("chat rerenders preserve the current scroll position instead of jumping to top",()=>{
  assert.match(js,/chatScrollTop/);
  assert.match(js,/chatLog\.scrollTop=chatAutoScrollNext\?chatLog\.scrollHeight:chatScrollTop/);
  assert.match(js,/captureTransientUiState/);
  assert.match(js,/restoreTransientUiState/);
});

test("typed concierge text survives background mailbox refreshes",()=>{
  assert.match(js,/let chatDraft = ""/);
  assert.match(js,/input\.value=chatDraft/);
  assert.match(js,/input\.addEventListener\("input"/);
  assert.match(js,/if\(!force && transient\.chatFocused\)/);
  assert.match(js,/pendingBackgroundRender=true/);
  assert.match(js,/input\.focus\(\{preventScroll:true\}\)/);
});

test("spacebar typing cannot become page scrolling because focus is restored",()=>{
  assert.match(js,/chatSelectionStart/);
  assert.match(js,/input\.setSelectionRange/);
  assert.match(js,/flushPendingBackgroundRender/);
  assert.match(js,/:focus-within/);
});

test("Wichtig Unwichtig persistence does not globally disable the concierge composer",()=>{
  const block=js.slice(js.indexOf("async function setMessageClassification"),js.indexOf("function messageCard"));
  assert.match(block,/classificationSavingIds/);
  assert.doesNotMatch(block,/setBusy\(true\)/);
  assert.doesNotMatch(block,/setBusy\(false\)/);
  assert.match(block,/render\(true\)/);
});



test("mailbox index warms without triggering an extra provider folder fetch",()=>{
  assert.match(js,/mailboxIndexWarmStarted/);
  assert.match(js,/\/email\/concierge\/index\/status/);
  assert.match(js,/\/email\/concierge\/index\/warm/);
  assert.match(js,/setTimeout\(\(\)=>void warmMailboxIndex\(connection\),800\)/);
  const warmBlock=js.slice(js.indexOf("async function warmMailboxIndex"),js.indexOf("async function loadConnections"));
  assert.doesNotMatch(warmBlock,/loadMailboxFolder/);
});

test("chat typing and scroll remain stable during mailbox background activity",()=>{
  assert.match(js,/captureTransientUiState/);
  assert.match(js,/restoreTransientUiState/);
  assert.match(js,/if\(!force && transient\.chatFocused\)/);
  assert.match(js,/chatDraft=input\.value/);
  assert.match(js,/chatLog\.scrollTop=chatAutoScrollNext\?chatLog\.scrollHeight:chatScrollTop/);
});


test("classification controls preserve the page viewport across DOM replacement",()=>{
  assert.match(js,/pageScrollX/);
  assert.match(js,/pageScrollY/);
  assert.match(js,/scrollTo\(\{left:x,top:y,behavior:"auto"\}\)/);
});

test("nonempty concierge drafts block even forced background rerenders",()=>{
  assert.match(js,/transient\.chatFocused && chatDraft\.length>0/);
  assert.match(js,/pendingBackgroundRender=true/);
  assert.match(js,/compositionend/);
});


test("first concierge view explains classification as intelligence, not folders",()=>{
  assert.match(js,/classification_review/);
  assert.match(js,/Beispiel: So lernt dein E-Mail-Concierge/);
  assert.match(js,/Die sichtbaren Mailbereiche bleiben Posteingang, Spam, Gesendet, Entwürfe und Papierkorb/);
  assert.match(js,/onboardingExampleSelections/);
  assert.match(js,/\["IMPORTANT","Wichtig"\],\["UNIMPORTANT","Unwichtig"\]/);
});

