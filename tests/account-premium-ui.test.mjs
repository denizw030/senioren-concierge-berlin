import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const konto=fs.readFileSync("konto.html","utf8");
const theme=fs.readFileSync("assets/account-premium-ui.css","utf8");
const base=fs.readFileSync("assets/account-premium-ui-base-v2.css","utf8");
const css=base+"\n"+theme;
const family=fs.readFileSync("assets/family-owner-sponsored-access.js","utf8");

test("premium account stylesheet is page-scoped and uses only the pinned local layout base",()=>{
  assert.match(konto,/assets\/account-premium-ui\.css\?v=2/);
  assert.match(konto,/<body class="account-premium-ui">/);
  assert.match(theme,/^@import url\("\/assets\/account-premium-ui-base-v2\.css\?v=1"\);/);
  assert.match(css,/body\.account-premium-ui/);
  assert.doesNotMatch(base,/@import|fonts\.googleapis|font-face/i);
  const imports=[...theme.matchAll(/@import\s+url\(([^)]+)\)/gi)].map((m)=>m[1].replace(/["']/g,""));
  assert.deepEqual(imports,["/assets/account-premium-ui-base-v2.css?v=1"]);
  assert.doesNotMatch(theme,/fonts\.googleapis|font-face|https?:\/\//i);
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
  assert.match(konto,/Verwalte unterstützte Personen und Zugriffsrechte\./);
  assert.match(konto,/Personen, die du über NAHWERK unterstützt\./);
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
  assert.ok(family.includes('managedPath(id,"/"+op)'));
  assert.match(family,/browser_actor_authority===false/);
  assert.match(family,/route==="ACTIVATION_LINK"/);
  assert.match(family,/route==="DIRECT_PREMIUM"/);
  assert.match(family,/outbound\?\.provider_execution===false/);
  assert.match(family,/outbound\?\.provider_execution===true/);
});

test("responsive premium UI explicitly covers required viewport classes",()=>{
  for(const width of ["1280px","1024px","768px","390px","360px"])
    assert.ok(css.includes("@media(max-width:"+width+")"),width);
  assert.match(css,/overflow-x:auto!important/);
  assert.match(css,/grid-column:1\/-1!important/);
  assert.match(css,/top:auto!important/);
  assert.match(css,/:focus-visible/);
});

test("family owner slot can never collapse into a narrow grid column",()=>{
  assert.match(css,/#familyOwnerPanelSlot\{[\s\S]*grid-column:1\/-1!important/);
  assert.match(css,/\.family-owner-panel\{[\s\S]*width:100%/);
});