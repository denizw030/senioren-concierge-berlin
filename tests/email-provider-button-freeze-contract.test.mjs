import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = fs.readFileSync('assets/email-provider-logo-connect-v3.js','utf8');

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
assert.equal(p.includes('email.send'), false);
for (const provider of ['google','microsoft','yahoo','icloud','gmx','webde','telekom','fastmail','zoho','ionos','strato']) {
  assert.ok(p.includes(`id: "${provider}"`));
}
console.log('EMAIL_PROVIDER_BUTTON_FREEZE_CONTRACT=GREEN');
