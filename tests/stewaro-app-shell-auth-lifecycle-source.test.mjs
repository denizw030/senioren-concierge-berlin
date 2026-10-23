import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/stewaro-app-shell.js', import.meta.url), 'utf8');
const start = source.indexOf('  async function logout() {');
const end = source.indexOf('\n  }\n', start) + 5;
assert.ok(start >= 0 && end > start, 'App logout function must exist');
const logout = source.slice(start, end);
const beforeNetwork = (needle) => {
  const point = logout.indexOf(needle);
  const network = logout.indexOf('await fetch(');
  assert.ok(point >= 0 && network > point, needle + ' must precede server revocation');
};

test('App shell requires the exact HTTPS app origin', () => {
  assert.match(source, /location\.origin !== "https:\/\/app\.stewaro\.com"/);
});
test('App shell never mounts without an affirmative auth promise', () => {
  assert.match(source, /!window\.STEWARO_APP_AUTH_READY \|\| await window\.STEWARO_APP_AUTH_READY !== true \|\| logoutInProgress/);
});
test('duplicate logout is suppressed before contacting the server', () => {
  assert.match(logout, /if \(logoutInProgress\) return;/);
  assert.match(logout, /logoutInProgress = true;/);
});
test('logout removes session and remembered identity before network I-O', () => {
  beforeNetwork('sessionStorage.removeItem(SESSION_KEY)');
  beforeNetwork('localStorage.removeItem(SESSION_KEY)');
});
test('logout conceals personal content before network I-O', () => {
  beforeNetwork('shell.hidden = true');
});
test('logout revokes the local authentication gate before network I-O', () => {
  beforeNetwork('STEWARO_APP_AUTH_READY = Promise.resolve(false)');
});
test('logout still requests server revocation and returns to Account', () => {
  assert.match(logout, /action: "logout"/);
  assert.match(logout, /location\.replace\(LOGIN_URL\)/);
});
