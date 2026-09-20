import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const konto = read("konto.html");
const clean = read("konto/index.html");
const css = read("assets/account-address-editor.css");
const js = read("assets/account-address-editor.js");

test("account address form is structured and symmetric", () => {
  for (const id of ["profileStreet","profileHouseNumber","profilePostalCode","profileCity","profileHomeAddress","profileAddressSuggestions"]) {
    assert.match(konto, new RegExp(`id="${id}"`));
  }
  assert.match(konto, /Adressvorschläge über Google Maps/);
  assert.match(konto, /<div class="profile-address-attribution">Google Maps<\/div>/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.profile-address-street\{grid-column:span 3\}/);
  assert.match(css, /\.profile-address-postal\{grid-column:span 1\}/);
  assert.match(css, /\.profile-address-city\{grid-column:span 3\}/);
});

test("address editor uses authenticated Google-assisted profile actions", () => {
  assert.match(js, /action: "address_suggest"/);
  assert.match(js, /action: "address_details"/);
  assert.match(js, /Authorization": "Bearer " \+ token/);
  assert.match(js, /session_token: placesSessionToken/);
  assert.match(js, /PLZ und Stadt automatisch übernommen/);
});

test("existing profile save contract remains home_address compatible", () => {
  assert.match(konto, /home_address: profileHomeAddress\.value\.trim\(\)/);
  assert.match(konto, /window\.NWProfileAddressEditor\?\.setValue\(profileHomeAddress\.value\)/);
});

test("clean account route stays mirrored", () => {
  assert.equal(konto, clean.replace('<head><base href="/">','<head>'));
});
