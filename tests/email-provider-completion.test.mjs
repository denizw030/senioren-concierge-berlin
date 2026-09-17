import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('assets/email-provider-logo-connect-v3.js', 'utf8');
const callback = fs.readFileSync('oauth/yahoo/callback/index.html', 'utf8');

assert.match(ui, /id: "yahoo"[\s\S]*mode: "yahoo"/);
assert.ok(ui.includes('/email/connect/yahoo/web'));
assert.ok(ui.includes('host === "api.login.yahoo.com"'));
assert.ok(ui.includes('/email/yahoo/disconnect/web'));
assert.ok(ui.includes('row.connection_ready !== false'));
assert.ok(ui.includes('Noch nicht verfügbar'));
assert.ok(ui.includes('GMX App-Passwort'));
assert.ok(ui.includes('WEB.DE App-Passwort'));
assert.ok(ui.includes('Fastmail App-Passwort'));
assert.ok(ui.includes('emailProviderZohoDc'));
assert.ok(ui.includes('value="eu"'));
assert.ok(ui.includes('zoho_organization: organization'));
assert.equal(ui.includes('imap_host'), false);
assert.equal(ui.includes('smtp_host'), false);
assert.match(callback, /const allowed = \['code','state','error','error_description','error_uri'\]/);
assert.match(callback, /nahwerk-email-runtime\/email\/oauth\/yahoo\/callback/);
assert.equal(callback.includes('localStorage'), false);
assert.equal(callback.includes('sessionStorage'), false);

console.log('EMAIL_PROVIDER_COMPLETION=GREEN');
