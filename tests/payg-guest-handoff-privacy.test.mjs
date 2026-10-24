import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/payg-account-shell.js', import.meta.url), 'utf8');
const KEY = 'nw_guest_resume_request_v1';
const NOW = Date.parse('2026-10-24T07:00:00Z');

function render(handoff) {
  const created = [];
  const theme = { insertAdjacentElement(_where, element) { created.push(element); } };
  const toggle = { checked: false, setAttribute() {}, addEventListener() {} };
  const document = {
    documentElement: { dataset: { nwPortalTheme: 'light' } },
    body: { classList: { toggle() {} } },
    getElementById(id) {
      return id === 'nwPortalThemeToggle' ? toggle : id === 'nwPortalThemeSetting' ? theme : null;
    },
    createElement(tag) {
      return { tag, children: [], append(...elements) { this.children.push(...elements); } };
    }
  };
  const localStorage = {
    getItem(key) { return key === KEY ? JSON.stringify(handoff) : null; },
    setItem() {}
  };
  const FakeDate = class extends Date { static now() { return NOW; } };
  vm.runInNewContext(source, { document, localStorage, Date: FakeDate, addEventListener() {} }, { timeout: 1000 });
  return created;
}

test('fresh guest handoff keeps the continuation link but never exposes the private request in PAYG', () => {
  const secret = 'PRIVATE_PATIENT_NOTE_123';
  const cards = render({ request: secret, created_at: new Date(NOW - 60_000).toISOString() });
  assert.equal(cards.length, 1);
  const [card] = cards;
  assert.equal(card.id, 'paygGuestHandoff');
  assert.equal(card.children[4].href, '/web-concierge?resume_guest=1');
  assert.equal(card.children[2].textContent.includes('5 €'), true);
  assert.equal(card.children[3].textContent.includes(secret), false);
  assert.equal(JSON.stringify(card).includes(secret), false);
});

test('future-dated guest handoffs fail closed', () => {
  const cards = render({ request: 'sensitive', created_at: new Date(NOW + 3_600_000).toISOString() });
  assert.equal(cards.length, 0);
});

test('expired and invalid guest handoffs fail closed', () => {
  assert.equal(render({ request: 'sensitive', created_at: new Date(NOW - 86_400_001).toISOString() }).length, 0);
  assert.equal(render({ request: 'sensitive', created_at: 'not-a-date' }).length, 0);
  assert.equal(render({ request: '   ', created_at: new Date(NOW).toISOString() }).length, 0);
});

test('exact 24-hour boundary remains valid; one millisecond into the future is rejected', () => {
  assert.equal(render({ request: 'safe', created_at: new Date(NOW - 86_400_000).toISOString() }).length, 1);
  assert.equal(render({ request: 'safe', created_at: new Date(NOW + 1).toISOString() }).length, 0);
});
