import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");

test("direct login always enters the canonical STEWARO shell",()=>{
  const flow=read("assets/stewaro-account-flow.js");
  assert.match(flow,/const canonicalLogin=document\.body\.classList\.contains\("login-image-page"\)/);
  assert.match(flow,/if\(canonicalLogin\)/);
});

test("legacy public and legal pages share one calm professional surface contract",()=>{
  const css=read("assets/brand-2026.css");
  assert.match(css,/STEWARO PROFESSIONAL SURFACE UNIFICATION V1/);
  assert.match(css,/--sp-bg:#f7f4ec/);
  assert.match(css,/--sp-green:#10271f/);
  assert.match(css,/background:#08150f!important/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test("standalone product handoffs use STEWARO light surfaces",()=>{
  const mail=read("email-concierge/index.html");
  const phone=read("telefonate/index.html");
  assert.match(mail,/--mail-bg:#f7f4ec/);
  assert.match(phone,/<title>Telefonate \| STEWARO<\/title>/);
  assert.doesNotMatch(phone,/NAHWERK/);
});

test("owner product-gap surface no longer exposes the retired brand",()=>{
  for(const page of ["produktluecken.html","produktluecken/index.html"]){
    assert.doesNotMatch(read(page),/NAHWERK/);
    assert.match(read(page),/STEWARO/);
  }
});
