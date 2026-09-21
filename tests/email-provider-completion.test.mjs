import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('assets/email-provider-logo-connect-v3.js', 'utf8');
const callback = fs.readFileSync('oauth/yahoo/callback/index.html', 'utf8');

assert.match(ui, /id: "yahoo"[\s\S]*mode: "yahoo"/);
assert.ok(ui.includes('/email/connect/yahoo/web'));
assert.ok(ui.includes('host === "api.login.yahoo.com"'));
assert.ok(ui.includes('/email/yahoo/disconnect/web'));
assert.ok(ui.includes('row.connection_ready !== false'));
assert.ok(ui.includes('row.direct_support !== false'));
assert.ok(ui.includes('Noch nicht verfügbar'));
assert.match(ui,/id: "gmx"[\s\S]{0,320}secret: "App-Passwort"[\s\S]{0,320}credentialKind: "app"/);
assert.match(ui,/id: "webde"[\s\S]{0,360}credentialKind: "mail_first"[\s\S]{0,420}WEB\.DE Freigabe öffnen/);
assert.match(ui,/id: "fastmail"[\s\S]{0,320}secret: "App-Passwort"[\s\S]{0,320}credentialKind: "app"/);
assert.ok(ui.includes('emailProviderZohoDc'));
assert.ok(ui.includes('value="eu"'));
assert.ok(ui.includes('zoho_organization: organization'));

for (const provider of ['mailcom','freenet','mailboxorg','vodafone','arcor','kabeldeutschland','unitymedia','migadu']) {
  assert.match(ui, new RegExp(`id: "${provider}"[\\s\\S]*?mode: "manual"`), provider);
}
assert.match(ui,/id: "mailcom"[\s\S]{0,500}Direkter IMAP-Zugriff/);
assert.ok(ui.includes('IMAP/SMTP muss im Postfach aktiviert sein'));
assert.ok(ui.includes('mailbox.org'));
assert.ok(ui.includes('Vodafone-Mail-Infrastruktur'));
assert.ok(ui.includes('Migadu-Passwort'));
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
