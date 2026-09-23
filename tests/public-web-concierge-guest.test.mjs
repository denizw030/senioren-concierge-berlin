import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const auth = read("assets/auth-nav.js");
const home = read("de/index.html");
const chat = read("assets/web-customer-concierge.js");
const chatCss = read("assets/web-customer-concierge.css");
const chatPage = read("web-concierge.html");
const chatClean = read("web-concierge/index.html");

test("floating concierge is available without login on every non-chat page", () => {
  assert.match(auth, /const FLOATING_CONCIERGE_EXCLUDE = new Set\(\["web-concierge\.html"\]\)/);
  assert.doesNotMatch(auth, /if \(!isLoggedIn\(\) \|\| FLOATING_CONCIERGE_EXCLUDE\.has\(page\(\)\)\) return/);
  assert.match(auth, /if \(FLOATING_CONCIERGE_EXCLUDE\.has\(page\(\)\)\) return/);
  assert.match(auth, /normalizeShell\(\);\s*ensureFloatingConcierge\(\);\s*const current = page\(\)/s);
});

test("home Kostenlos chatten CTA opens the web concierge directly", () => {
  assert.match(home, /href="\/web-concierge"[^>]*>Kostenlos chatten<\/a>/);
  assert.doesNotMatch(home, /href="registrieren\?produkt=prime&amp;paket=free&amp;source=home_hero"[^>]*>Kostenlos chatten<\/a>/);
});

test("signed-out web concierge uses the safe guest endpoint instead of redirecting", () => {
  assert.match(chat, /guestMode=!token/);
  assert.match(chat, /gatewayRequest\("\/web\/guest-chat",\{method:"POST",auth:false/);
  assert.match(chat, /installation_id:guestInstallationId\(\)/);
  assert.match(chat, /guest_token:guestToken\(\)/);
  assert.doesNotMatch(chat, /if\(!token\)\{location\.replace\("\/anmelden"\);return;\}/);
  assert.match(chat, /Kostenlos chatten · keine Anmeldung nötig/);
});

test("guest chat survives site navigation in the same tab but resets on a true reload", () => {
  assert.match(chat, /GUEST_VIEW_STATE_KEY = "nw_web_guest_view_state_v1"/);
  assert.match(chat, /sessionStorage\.getItem\(GUEST_TOKEN_KEY\)/);
  assert.match(chat, /performance\.getEntriesByType\?\.\("navigation"\)/);
  assert.match(chat, /entry\.type==="reload"/);
  assert.match(chat, /resetGuestChatSessionForReload\(\)/);
  assert.match(chat, /restoreGuestViewState\(activeThreadId\)/);
  assert.match(chat, /if\(!guestViewRestored\)appendMessage\("assistant","Willkommen bei NAHWERK/);
});

test("guest execution UI supports existing and new customers without auto-executing", () => {
  assert.match(chat, /purpose=String\(action\?\.purpose\|\|""\)\.toUpperCase\(\)/);
  assert.match(chat, /if\(!\["ACCOUNT_REQUEST","EXECUTION"\]\.includes\(purpose\)\)return null/);
  assert.match(chat, /Auftrag sicher fortsetzen/);
  assert.match(chat, /Dein Auftrag wird nicht automatisch ausgeführt/);
  assert.match(chat, /next=%2Fpayg/);
  assert.match(chat, /sessionStorage\.removeItem\(GUEST_TOKEN_KEY\)/);
});

test("guest chat offers account actions but keeps authenticated tools out of guest mode", () => {
  assert.match(chat, /CREATE_ACCOUNT/);
  assert.match(chat, /isExplicitGuestAccountIntent/);
  assert.match(chat, /signIn\.textContent="Anmelden"/);
  assert.match(chat, /create\.textContent="Konto erstellen"/);
  assert.doesNotMatch(chat, /ui_actions:[^\n]*SIGN_IN/);
  assert.doesNotMatch(chat, /ui_actions:[^\n]*SIGN_UP/);
  assert.match(chat, /isAllowed:\(\)=>gatewayReady&&!guestMode/);
  assert.match(chatCss, /body\.web-concierge-guest #webConciergeVoice/);
  assert.match(chatCss, /body\.web-concierge-guest #webConciergeLive/);
});

test("web concierge clean route stays mirrored and loads refreshed guest assets", () => {
  assert.match(chatPage, /assets\/web-customer-concierge\.css\?v=28/);
  assert.match(chatPage, /assets\/web-customer-concierge\.js\?v=50/);
  assert.equal(chatPage, chatClean.replace("<head><base href=\"/\">","<head>"));
});


test("guest account CTA renders the backend purpose instead of claiming a hidden button", () => {
  assert.match(chat, /purpose:String\(item\.purpose\|\|""\)\.toUpperCase\(\)/);
  assert.match(chat, /Anmelden oder Konto erstellen/);
  assert.match(chat, /Auftrag sicher fortsetzen/);
  assert.match(chat, /renderGuestAccountActions\(response\.ui_actions,\{request:guestRequest\}\)/);
});
