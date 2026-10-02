import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public STEWARO entry stays on /zugang until account host cutover", () => {
  const routing = readFileSync("assets/stewaro-entry-routing.js", "utf8");
  const home = readFileSync("de/index.html", "utf8");

  assert.match(home, /href="\/zugang"\s+data-entry="self">Kennenlernen<\/a>/);
  assert.match(
    routing,
    /const accountEntry=isAccount\?"\/"\:\(isWebsitePreview\?STAGING_ACCOUNT_ORIGIN\+"\/"\:"\/zugang"\);/
  );
  assert.doesNotMatch(routing, /ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(routing, /STAGING_ACCOUNT_ORIGIN="https:\/\/d23le2tjpjl7la\.cloudfront\.net"/);
});
