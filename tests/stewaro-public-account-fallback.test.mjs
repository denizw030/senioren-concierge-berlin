import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public STEWARO entry keeps its accessible /zugang fallback while the gated account candidate targets the verified account host", () => {
  const routing = readFileSync("assets/stewaro-entry-routing.js", "utf8");
  const home = readFileSync("de/index.html", "utf8");

  assert.match(home, /href="\/zugang"\s+data-entry="self">Kennenlernen<\/a>/);
  assert.match(
    routing,
    /const accountEntry=isAccount\?"\/"\:\(isWebsitePreview\?STAGING_ACCOUNT_ORIGIN\+"\/"\:PROD_ACCOUNT_ORIGIN\+"\/"\);/
  );
  assert.match(routing, /PROD_ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(routing, /STAGING_ACCOUNT_ORIGIN="https:\/\/d23le2tjpi7la\.cloudfront\.net"/);
});
