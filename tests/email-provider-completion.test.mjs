import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('assets/email-provider-logo-connect-v3.js', 'utf8');
const callback = fs.readFileSync('oauth/yahoo/callback/index.html', 'utf8');

assert.match(ui, /id: "yahoo"[\s\S]*mode: "manual"[\s\S]*secret: "Passwort"[\s\S]*credentialKind: "password_first"/);
assert.ok(ui.includes('CREATE_YAHOO_APP_PASSWORD'));

assert.ok(ui.includes('/email/connect/auto/web'));
assert.ok(ui.includes('emailAutoConnectEmail'));
assert.ok(ui.includes('Anbieter wird erkannt'));
assert.ok(ui.includes('NAHWERK erkennt den Anbieter automatisch'));
assert.ok(ui.includes('CREDENTIALS_REQUIRED'));
assert.ok(ui.includes('email_provider_selection_required'));
const slash = String.fromCharCode(92);
assert.ok(ui.includes('[^' + slash + 's@]'));
assert.equal(ui.includes('[^' + slash + slash + 's@]'), false);

const emailReturn = fs.readFileSync('email-concierge.html', 'utf8');
assert.ok(emailReturn.includes('["GOOGLE","MICROSOFT","YAHOO"].includes(provider)'));
assert.ok(ui.includes('host === "api.login.yahoo.com"'));
assert.ok(ui.includes('/email/yahoo/disconnect/web'));
assert.ok(ui.includes('row.connection_ready !== false'));
assert.ok(ui.includes('row.direct_support !== false'));
assert.ok(ui.includes('Noch nicht verfügbar'));
assert.match(ui,/id: "gmx"[\s\S]{0,320}secret: "Passwort"[\s\S]{0,320}credentialKind: "password_first"/);
assert.match(ui,/id: "webde"[\s\S]{0,420}secret: "Passwort"[\s\S]{0,420}credentialKind: "password_first"/);
assert.ok(ui.includes('Gib deine E-Mail-Adresse und dein normales Passwort ein.'));
assert.ok(ui.includes('credentialGuideNeeded'));
assert.ok(ui.includes('guidance_code'));
assert.ok(ui.includes("https://auth.web.de/login?prompt=none"));
assert.ok(ui.includes("authcode-context=VD0Cgr9WhV"));
assert.ok(ui.includes('emailProviderWebdeGuide'));
assert.ok(ui.includes('emailProviderWebdeSpeak'));
assert.ok(ui.includes('POP3- und IMAP-Zugriff erlauben'));
assert.ok(ui.includes('/email/guidance/webde/audio'));
assert.ok(ui.includes('Lena wird geladen'));
assert.ok(ui.includes('Lena stoppen'));
assert.equal(ui.includes('SpeechSynthesisUtterance'), false);
assert.equal(ui.includes('speechSynthesis'), false);
assert.ok(ui.includes('clearSecretOnly'));
assert.ok(ui.includes('webdeGuideNeeded = true'));
assert.ok(ui.includes('if (selected) renderModal();'));
assert.ok(ui.includes('email-provider-connect-inline-submit'));
assert.ok(ui.includes('autocomplete="current-password"'));
assert.equal((ui.match(/id="emailProviderConnectSubmit"/g) || []).length, 1);
const autoStart = ui.indexOf('async function autoConnectEmail');
const gridStart = ui.indexOf('function renderGrid');
const manualOpenStart = ui.indexOf('function openManual');
const manageStart = ui.indexOf('function openManage');
assert.ok(autoStart >= 0 && gridStart > autoStart);
assert.ok(manualOpenStart >= 0 && manageStart > manualOpenStart);
assert.equal(ui.slice(autoStart, gridStart).includes('maybeSpeakWebdeGuide()'), false);
assert.equal(ui.slice(manualOpenStart, manageStart).includes('maybeSpeakWebdeGuide()'), false);
assert.ok(ui.includes('if (speakWebdeAfterFailure) maybeSpeakWebdeGuide();'));
assert.ok(ui.includes('id="emailProviderWebdeLogin"'));
assert.ok(ui.includes('copyWebdeEmailForLogin'));
assert.ok(ui.includes('navigator.clipboard.writeText(email)'));
assert.ok(ui.includes('document.execCommand("copy")'));
assert.ok(ui.includes('E-Mail-Adresse kopiert. Bei WEB.DE einfach einfügen.'));
assert.ok(ui.includes('id="emailProviderWebdeVideoToggle"'));
assert.ok(ui.includes('/assets/webde-guide-video.b64?v=20260922-1'));
assert.ok(ui.includes('playsinline muted controls hidden'));
assert.ok(ui.includes('function ensureWebdeGuideVideoUrl()'));
assert.ok(ui.includes('function toggleWebdeGuideVideo()'));
assert.ok(ui.includes('webdeGuideAudioPrefetch'));
assert.ok(ui.includes('function fetchWebdeGuideAudioBlob()'));
const submitManualStart = ui.indexOf('async function submitManual()');
const disconnectStart = ui.indexOf('async function disconnect(', submitManualStart);
const submitManualBlock = ui.slice(submitManualStart, disconnectStart);
assert.ok(submitManualBlock.includes('prefetchWebdeGuideAudio()'));
assert.ok(submitManualBlock.indexOf('prefetchWebdeGuideAudio()') < submitManualBlock.indexOf('await connectManual()'));
const videoToggleStart = ui.indexOf('async function toggleWebdeGuideVideo()');
const audioStopAfterVideo = ui.indexOf('function stopWebdeGuideAudio()', videoToggleStart);
assert.ok(videoToggleStart >= 0 && audioStopAfterVideo > videoToggleStart);
assert.equal(ui.slice(videoToggleStart, audioStopAfterVideo).includes('stopWebdeGuideAudio()'), false);
assert.ok(ui.includes('renderModal();\n      renderGrid();'));
assert.match(ui,/id: "fastmail"[\s\S]{0,320}secret: "Passwort"[\s\S]{0,320}credentialKind: "password_first"/);
assert.ok(ui.includes('emailProviderZohoDc'));
assert.ok(ui.includes('value="eu"'));
assert.ok(ui.includes('zoho_organization: organization'));

for (const provider of ['mailcom','freenet','mailboxorg','vodafone','arcor','kabeldeutschland','unitymedia','migadu']) {
  assert.match(ui, new RegExp(`id: "${provider}"[\\s\\S]*?mode: "manual"`), provider);
}
for (const provider of ['yahoo','icloud','gmx','webde','telekom','fastmail','zoho','ionos','strato','mailcom','freenet','mailboxorg','vodafone','arcor','kabeldeutschland','unitymedia','migadu']) {
  assert.match(ui, new RegExp(`id: "${provider}"[\\s\\S]{0,360}secret: "Passwort"[\\s\\S]{0,360}credentialKind: "password_first"`), provider);
}
assert.ok(ui.includes('ENABLE_POP_IMAP_THEN_RETRY'));
assert.ok(ui.includes('ENABLE_POP_IMAP_SMTP_THEN_RETRY'));
assert.ok(ui.includes('CREATE_MAIL_PROGRAM_PASSWORD'));
assert.ok(ui.includes('CREATE_YAHOO_APP_PASSWORD'));
assert.ok(ui.includes('CREATE_ICLOUD_APP_SPECIFIC_PASSWORD'));
assert.ok(ui.includes('CREATE_FASTMAIL_APP_PASSWORD'));
assert.ok(ui.includes('provider_authentication_failed'));
assert.ok(ui.includes('provider_tls_connection_failed'));
assert.ok(ui.includes('provider_connection_failed'));

assert.match(ui, /id: "proton"[\s\S]*mode: "unsupported"[\s\S]*Proton Bridge/);
assert.match(ui, /id: "tuta"[\s\S]*mode: "unsupported"[\s\S]*kein(?:en)? normalen IMAP-Zugriff/);
assert.match(ui,/id: "tuta"[\s\S]*?Eine direkte Verbindung zu NAHWERK wird derzeit nicht unterstützt/);
assert.ok(ui.includes('provider.mode === "unsupported"'));
assert.equal(ui.includes('imap_host'), false);
assert.equal(ui.includes('smtp_host'), false);
assert.equal(ui.includes('imap.vodafonemail.de'), false);
assert.equal(ui.includes('smtp.vodafonemail.de'), false);
assert.equal(ui.includes('imap.mail.com'), false);
assert.equal(ui.includes('smtp.mail.com'), false);

assert.match(callback, /const allowed = \['code','state','error','error_description','error_uri'\]/);
assert.match(callback, /nahwerk-email-runtime\/email\/oauth\/yahoo\/callback/);
assert.equal(callback.includes('localStorage'), false);
assert.equal(callback.includes('sessionStorage'), false);

console.log('EMAIL_PROVIDER_COMPLETION=GREEN');
