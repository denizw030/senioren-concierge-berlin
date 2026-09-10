import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("Safety customer-area entry is explicitly Prime", () => {
  const safety = read("safety.html");
  const customerAreaLinks = [...safety.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>Zum Kundenbereich<\/a>/g)].map((m) => m[1]);
  assert.deepEqual(customerAreaLinks, ["anmelden.html?produkt=prime", "anmelden.html?produkt=prime"]);
});

test("auth-nav keeps explicit URL context authoritative over stale session context", () => {
  const authNav = read("assets/auth-nav.js");
  const requestedAt = authNav.indexOf('new URLSearchParams(location.search).get("produkt")');
  const storedContextAt = authNav.indexOf('if (CONTEXT_PAGES.has(current)) return sessionStorage.getItem(PRODUCT_KEY)');
  assert.ok(requestedAt >= 0, "explicit product query parsing missing");
  assert.ok(storedContextAt > requestedAt, "stale session context can precede explicit URL context");
  assert.match(authNav, /sessionStorage\.setItem\(PRODUCT_KEY, requested\)/);
});

test("Senior and Prime product entry semantics remain explicit", () => {
  const senior = read("senioren-concierge.html");
  const prime = read("prime-concierge.html");
  assert.match(senior, /anmelden\.html\?produkt=senioren/);
  assert.match(senior, /registrieren\.html\?produkt=senioren/);
  assert.match(prime, /registrieren\.html\?produkt=prime/);
});
