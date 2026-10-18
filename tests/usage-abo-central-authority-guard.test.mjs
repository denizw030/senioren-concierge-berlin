import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const account = readFileSync(new URL("../konto.html", import.meta.url), "utf8");
const siteUi = readFileSync(new URL("../assets/site-ui.js", import.meta.url), "utf8");
const accountTheme = readFileSync(new URL("../assets/account-premium-ui.css", import.meta.url), "utf8");

test("Nutzung reads the central authenticated profile and has no browser usage authority", () => {
  assert.match(account, /web-profile/);
  assert.match(account, /usage\?\.app_dialogues_used/);
  assert.match(account, /usage\?\.whatsapp_dialogues_used/);
  assert.match(account, /plan\?\.app_dialogue_limit/);
  assert.match(account, /plan\?\.whatsapp_dialogue_limit/);
  assert.doesNotMatch(account, /localStorage\.getItem\(["']scb_usage["']\)/);
  assert.doesNotMatch(account, /localStorage\.setItem\(["']scb_usage["']/);
});

test("Nutzung does not invent a second reset calendar in the browser", () => {
  assert.doesNotMatch(account, /usageReset|resetUsage|nextUsageReset|usagePeriodStart|usagePeriodEnd/);
  assert.doesNotMatch(account, /30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
});

test("portal theme is persistent and light mode includes the footer", () => {
  assert.match(siteUi, /PORTAL_THEME_KEY\s*=\s*['"]nw_portal_theme_v1['"]/);
  assert.match(siteUi, /localStorage\.getItem\(PORTAL_THEME_KEY\)/);
  assert.match(siteUi, /localStorage\.setItem\(PORTAL_THEME_KEY,\s*next\)/);
  assert.match(siteUi, /document\.documentElement\.dataset\.nwPortalTheme/);
  assert.match(accountTheme, /data-nw-portal-theme=["']light["']/);
  assert.match(accountTheme, /\.footer/);
  assert.match(accountTheme, /background:#ece4d8!important/);
});

test("current visible usage surface stays explicit about unavailable central data", () => {
  assert.match(account, /Aktueller Verbrauch derzeit nicht verfügbar/);
  assert.match(account, /id=["']appUsageSummary["']/);
  assert.match(account, /id=["']whatsappUsageSummary["']/);
});
