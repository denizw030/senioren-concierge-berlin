import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const overview = await readFile(new URL("../assets/web-concierge-chat.js", import.meta.url), "utf8");
const chat = await readFile(new URL("../assets/web-customer-concierge.js", import.meta.url), "utf8");

test("overview concierge is read from the authoritative web gateway", () => {
  assert.match(overview, /nahwerk-web-gateway/);
  assert.match(overview, /\/web\/me/);
  assert.match(overview, /personaSource = persona \? "central" : "pending"/);
  assert.doesNotMatch(overview, /conciergeNames\s*=|\|\|\s*["']nilo["']/i);
});

test("legacy local persona fields are removed instead of used as authority", () => {
  assert.match(overview, /delete value\[key\]/);
  assert.match(overview, /"conciergeChoice", "concierge_choice"/);
  assert.doesNotMatch(overview, /localStorage\.getItem\(["'][^"']*(?:conciergeChoice|concierge_choice)[^"']*["']\)/i);
});

test("customer history is cursor-paginated and customer-safe", () => {
  assert.match(chat, /HISTORY_PAGE_SIZE = 60/);
  assert.match(chat, /url\.searchParams\.set\("before",before\)/);
  assert.match(chat, /data\.has_more===true/);
  assert.match(chat, /Ältere Nachrichten laden/);
  assert.doesNotMatch(chat, /Verlauf nicht verfügbar/);
});

test("shared text history keeps WhatsApp marking without cross-sending", () => {
  assert.match(chat, /normalizedChannel==="WHATSAPP"/);
  assert.match(chat, /badge\.textContent="WhatsApp"/);
  assert.doesNotMatch(chat, /whatsapp[^\n]{0,80}(send|dispatch|message)/i);
  assert.match(chat, /gatewayRequest\("\/web\/chat"/);
});
