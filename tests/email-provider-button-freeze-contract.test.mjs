import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = fs.readFileSync('assets/email-provider-logo-connect-v3.js','utf8');
const konto = fs.readFileSync('konto.html','utf8');

assert.equal(p.includes('MutationObserver'), false);
assert.equal(p.includes('email-logo-provider-arrow'), false);
assert.ok(p.includes('data-provider-primary'));
assert.ok(p.includes('connected ? "Trennen" : "Verbinden"'));
assert.ok(p.includes('data-provider-add'));
assert.ok(p.includes('stateCard.hidden = true'));
assert.ok(p.includes('actions.hidden = true'));
assert.ok(p.includes('runtimeNote.hidden = true'));
assert.ok(p.includes('badge.hidden = true'));
assert.ok(p.includes('AbortController'));
assert.ok(p.includes('const connectErrors = Object.create(null)'));
assert.ok(p.includes('function oauthConnectErrorMessage(provider, error)'));
assert.ok(p.includes('catch (error)'));
assert.ok(p.includes('nahwerk:email-provider-connect-error'));
assert.ok(p.includes('connectErrors[provider.id] = oauthConnectErrorMessage(provider, error)'));
assert.equal(/catch\s*\{\s*busy\s*=\s*false;\s*renderGrid\(\);\s*\}/s.test(p), false);
assert.match(konto,/assets\/email-provider-logo-connect-v3\.js\?v=[0-9-]+/);
assert.equal(p.includes('email.send'), false);
for (const provider of ['google','microsoft','yahoo','icloud','gmx','webde','telekom','fastmail','zoho','ionos','strato','mailcom','freenet','mailboxorg','vodafone','arcor','kabeldeutschland','unitymedia','migadu','proton','tuta']) {
  assert.ok(p.includes(`id: "${provider}"`), provider);
}
for (const provider of ['mailcom','freenet','mailboxorg','vodafone','arcor','kabeldeutschland','unitymedia','migadu']) {
  assert.match(p, new RegExp(`id: "${provider}"[\\s\\S]*?mode: "manual"`), provider);
}
assert.match(p, /id: "proton"[\s\S]*?mode: "unsupported"/);
assert.match(p, /id: "tuta"[\s\S]*?mode: "unsupported"/);
assert.ok(p.includes('Keine direkte Verbindung'));
console.log('EMAIL_PROVIDER_BUTTON_FREEZE_CONTRACT=GREEN');
