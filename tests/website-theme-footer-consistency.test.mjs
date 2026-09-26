import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const siteUi = read("assets/site-ui.js");
const account = read("konto.html");
const legacyChat = read("web-concierge.html");
const cleanChat = read("web-concierge/index.html");
const senior = read("senioren-concierge.html");

const chatSurfaces = [legacyChat, cleanChat];

test("one persisted canonical theme key drives portal and public senior surfaces", () => {
  assert.match(siteUi, /const PORTAL_THEME_KEY = 'nw_portal_theme_v1'/);
  assert.match(siteUi, /isThemeAwareSurface = isProdCustomerSurface \|\| isPublicSeniorSurface/);
  assert.match(siteUi, /senioren-concierge\|angehoerige/);
  assert.match(siteUi, /localStorage\.getItem\(PORTAL_THEME_KEY\)/);
  assert.match(siteUi, /localStorage\.setItem\(PORTAL_THEME_KEY, next\)/);
  assert.match(siteUi, /addEventListener\('storage'/);
  assert.match(siteUi, /document\.documentElement\.dataset\.nwPortalTheme = normalized/);
  assert.match(siteUi, /nw-portal-light/);
  assert.match(siteUi, /nw-portal-dark/);
  assert.match(account, /assets\/site-ui\.js/);
  assert.match(senior, /assets\/site-ui\.js/);
});

test("customer account theme still covers overview and all account tabs without a second theme authority", () => {
  for (const tab of ["overview", "concierge", "email", "safety", "usage", "personal"]) {
    assert.ok(account.includes(`data-account-tab="${tab}"`) || account.includes(`data-account-panel="${tab}"`), `missing account surface ${tab}`);
  }
  assert.match(account, /id="nwPortalThemeToggle"|site-ui\.js/);
  assert.doesNotMatch(siteUi, /nw_chat_theme|nw_email_theme|nw_safety_theme|nw_senior_theme/);
});

test("light mode keeps chat shell and footer in the same cream world", () => {
  assert.match(siteUi, /body\.nw-portal-light \.web-concierge-shell/);
  assert.match(siteUi, /body\.nw-portal-light \.web-concierge-workspace/);
  assert.match(siteUi, /body\.nw-portal-light \.web-concierge-sidebar/);
  assert.match(siteUi, /body\.nw-portal-light \.web-concierge-chat-panel/);
  assert.match(siteUi, /body\.nw-portal-light \.web-concierge-form/);
  assert.match(siteUi, /body\.nw-portal-light:not\(\.account-premium-ui\) \.footer/);
  assert.match(siteUi, /background:#ece4d8!important/);
});

test("dark mode uses deep black for lower areas, chat shell and public senior canvas", () => {
  assert.match(siteUi, /body\.nw-portal-dark:not\(\.account-premium-ui\) \.footer/);
  assert.match(siteUi, /background:#000!important/);
  assert.match(siteUi, /body\.nw-portal-dark \.web-concierge-shell/);
  assert.match(siteUi, /body\.nw-portal-dark \.web-concierge-sidebar/);
  assert.match(siteUi, /body\.senior-product\.nw-portal-dark>main/);
  assert.match(siteUi, /body\.senior-product\.nw-portal-dark>main>\.section\.alt/);
});

test("public senior surface keeps its canonical light presentation while account surfaces honor saved theme", () => {
  assert.match(siteUi, /if \(isPublicSeniorSurface && !isProdCustomerSurface\) return 'light';/);
  assert.match(siteUi, /return readStoredPortalTheme\(\) \|\| 'dark';/);
  assert.match(siteUi, /body\.senior-product\.nw-portal-light>main/);
  assert.match(siteUi, /body\.senior-product\.nw-portal-dark/);
});

test("both chat routes use the full consistent footer and complete legal links", () => {
  for (const page of chatSurfaces) {
    assert.match(page, /class="footergrid"/);
    assert.match(page, /class="brand"/);
    for (const label of ["Impressum", "Datenschutz", "AGB", "Widerruf", "KI-Transparenz", "Datenlöschung"]) {
      assert.ok(page.includes(label), `missing footer link ${label}`);
    }
    assert.match(page, /assets\/site-ui\.js\?v=8/);
    assert.match(page, /assets\/web-customer-concierge\.js\?v=57/);
  }
  assert.doesNotMatch(cleanChat, /web-customer-concierge-thread-scope\.js/);
});

test("theme work does not introduce a second chat transport or WhatsApp delivery path", () => {
  for (const page of chatSurfaces) {
    const scripts = [...page.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(scripts.some((src) => src.includes("web-customer-concierge.js?v=57")));
    assert.ok(!scripts.some((src) => /whatsapp|delivery|email/i.test(src)), `unexpected delivery script: ${scripts.join(", ")}`);
  }
  assert.doesNotMatch(siteUi, /\/web\/chat|\/web\/history|customer_delivery|sendWhatsApp|sendWhatsapp/);
});


test("web chat exposes the canonical portal theme control in its header area",()=>{
  for(const page of chatSurfaces){
    assert.match(page,/id="webConciergeThemeToggle"/);
    assert.match(page,/class="web-concierge-page-actions"/);
  }
});
