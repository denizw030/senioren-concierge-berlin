import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const payg = read("payg.html");
const clean = read("payg/index.html");
const css = read("assets/payg-account-shell.css");
const shell = read("assets/payg-account-shell.js");
const runtime = read("assets/payg-account.js");

test("PAYG uses the customer account shell and persisted appearance", () => {
  assert.match(payg, /<body class="account-premium-ui payg-account">/);
  assert.match(payg, /assets\/account-premium-ui\.css\?v=6/);
  assert.match(payg, /assets\/account-header-concierge\.css\?v=2/);
  assert.match(payg, /id="nwPortalThemeToggle"/);
  assert.match(payg, /assets\/payg-account-shell\.js\?v=2/);
  assert.match(shell, /nw_portal_theme_v1/);
  assert.match(shell, /nw-portal-light/);
  assert.match(shell, /nw-portal-dark/);
});

test("PAYG light cards follow the account cream surface", () => {
  assert.match(css, /html\[data-nw-portal-theme="light"\] body\.payg-account \.payg-card/);
  assert.match(css, /background:linear-gradient\(145deg,rgba\(255,255,255,.90\),rgba\(249,245,237,.96\)\)!important/);
  assert.match(css, /color:#1c1a16!important/);
});

test("PAYG exposes the same header concierge source and canonical footer structure", () => {
  assert.match(payg, /id="paygConciergeSource"/);
  assert.match(payg, /id="overviewConcierge"/);
  assert.match(payg, /assets\/web-concierge-chat\.js\?v=3/);
  assert.match(payg, /assets\/account-header-concierge\.js\?v=1/);
  assert.match(payg, /<div class="footergrid">/);
  assert.match(payg, /<span class="brandtext"><strong>NAHWERK<\/strong><span>CONCIERGE<\/span><\/span>/);
  assert.match(payg, /<div class="footbottom">/);
});

test("obsolete PAYG contract notice boxes are no longer rendered", () => {
  assert.doesNotMatch(payg, /id="paygContractNotice"/);
  assert.doesNotMatch(payg, /id="paygConsumerRightsGate"/);
  assert.match(runtime, /const contractNotice = \$\("paygContractNotice"\)/);
  assert.match(runtime, /if \(contractNotice\)/);
});

test("clean PAYG route remains mirrored", () => {
  assert.equal(payg, clean.replace('<head><base href="/">','<head>'));
});

test("guest execution handoff lands on PAYG without losing the pending request", () => {
  assert.match(shell, /nw_guest_resume_request_v1/);
  assert.match(shell, /PAYG-Guthaben aufladen/);
  assert.match(shell, /\/web-concierge\?resume_guest=1/);
  assert.match(css, /\.payg-guest-handoff/);
});
