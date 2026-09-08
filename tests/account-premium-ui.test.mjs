import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const konto=fs.readFileSync("konto.html","utf8");
const css=fs.readFileSync("assets/account-premium-ui.css","utf8");
const family=fs.readFileSync("assets/family-owner-sponsored-access.js","utf8");

test("premium account stylesheet is page-scoped and loaded last in account head",()=>{
  assert.match(konto,/assets\/account-premium-ui\.css\?v=1/);
  assert.match(konto,/<body class="account-premium-ui">/);
  assert.match(css,/body\.account-premium-ui/);
  assert.doesNotMatch(css,/@import|fonts\.googleapis|font-face/i);
});

test("all seven account tabs and functional ids remain intact",()=>{
  for(const id of ["accountTabOverview","accountTabConcierge","accountTabEmail","accountTabSafety","accountTabUsage","accountTabPersonal","accountTabAccess"])
    assert.ok(konto.includes('id="'+id+'"'),id);
  for(const id of ["familyOwnerPanel","familyPersonAddButton","familyPersonForm","familyManagedPeopleList","familyManagedDetail","familyManagedQuotaSave"])
    assert.ok(konto.includes('id="'+id+'"'),id);
});

test("context bar and access hierarchy use compact premium copy",()=>{
  assert.match(konto,/account-setup-context-label">Verwaltetes Profil</);
  assert.match(konto,/>Zugänge<\/div>/);
  assert.match(konto,/Verwalten Sie unterstützte Personen und Zugriffsrechte\./);
  assert.match(konto,/Personen, die Sie über NAHWERK unterstützen\./);
});

test("family list renderer is presentation-only enhanced with status pills and metadata",()=>{
  assert.match(family,/row\.dataset\.familyState=item\.status/);
  assert.match(family,/family-owner-person-status/);
  assert.match(family,/family-owner-person-meta/);
  assert.match(family,/Einladung wird für WhatsApp vorbereitet\./);
  assert.match(family,/manage\.textContent="Kontingente ansehen"/);
  assert.match(family,/revokeInvite\.textContent="Einladung widerrufen"/);
  assert.match(family,/tr:"Türkisch"/);
  assert.match(family,/OWNER bestätigt · Personen und Kontingente autorisiert/);
});

test("runtime, authorization and provider contracts remain wired to the same endpoints",()=>{
  for(const route of [
    '"/operator/context"',
    '"/operator/managed-people"',
    '"/family/invitations"',
    '"/operator/managed-people/invitations"',
    '"/entitlements"',
    '"/usage"',
    '"/family/invitations/"'
  ]) assert.ok(family.includes(route),route);
  assert.match(family,/\["suspend","resume","revoke"\]\.includes\(op\)/);
  assert.match(family,/managedPath\(id,"\/"+op\)/);
  assert.match(family,/browser_actor_authority===false/);
  assert.match(family,/data\?\.outbound\?\.provider_execution===false/);
});

test("responsive premium UI explicitly covers required viewport classes",()=>{
  for(const width of ["1280px","1024px","768px","390px","360px"])
    assert.ok(css.includes("@media(max-width:"+width+")"),width);
  assert.match(css,/overflow-x:auto!important/);
  assert.match(css,/grid-column:1\/-1!important/);
  assert.match(css,/:focus-visible/);
});

test("family owner slot can never collapse into a narrow grid column",()=>{
  assert.match(css,/#familyOwnerPanelSlot\{[\s\S]*grid-column:1\/-1!important/);
  assert.match(css,/\.family-owner-panel\{[\s\S]*width:100%/);
});
