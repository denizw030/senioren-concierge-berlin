import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const auth=read('assets/auth-nav.js');
const boot=read('assets/locale-boot.js');
const site=read('assets/site.css');
const base=read('assets/site-base.css');
const css=base+'\n'+site;
const sitemap=read('sitemap.xml');

test('auth recognizes clean and legacy customer routes',()=>{
  assert.match(auth,/last\.endsWith\(\"\.html\"\) \? last : last \+ \"\.html\"/);
  assert.match(auth,/const PROTECTED = new Set\(\[\"konto\.html\", \"concierge-anpassen\.html\"\]\)/);
});

test('floating concierge is fail-closed behind server validation',()=>{
  assert.match(auth,/const valid = await validateSession\(\)/);
  assert.match(auth,/if \(valid\) \{[\s\S]*ensureFloatingConcierge\(\)/);
  assert.match(auth,/if \(!isLoggedIn\(\) \|\| FLOATING_CONCIERGE_EXCLUDE/);
  assert.match(auth,/href = \"\/web-concierge\"/);
  assert.doesNotMatch(auth,/web-concierge-chat\.js/);
});

test('clean URL runtime preserves security callbacks and removes only cosmetic params',()=>{
  assert.match(boot,/SECURITY_PATH[\s\S]{0,40}oauth/);
  assert.match(boot,/COSMETIC_PARAMS = \['produkt','product','lang'\]/);
  assert.match(boot,/auth\?\.validateSession/);
});

test('clean GitHub Pages routes are real index files',()=>{
  for (const p of ['anmelden/index.html','impressum/index.html','agb/index.html','widerruf/index.html','konto/index.html','kontakt/index.html','leistungen/index.html','web-concierge/index.html','datenschutz/index.html','nutzungsbedingungen/index.html']) assert.equal(fs.existsSync(p),true,p);
});

test('public sitemap and key canonicals contain no html suffixes',()=>{
  assert.doesNotMatch(sitemap,/\.html<\/loc>/);
  for (const p of ['anmelden/index.html','impressum/index.html','agb/index.html','widerruf/index.html','kontakt/index.html','leistungen/index.html']) {
    const html=read(p);
    const canonical=html.match(/<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"']([^\"']+)/i)?.[1] || '';
    assert.ok(canonical && !canonical.includes('.html'),p);
  }
});

test('dark footer is deep black and floating button has mobile safe-area',()=>{
  assert.match(site,/@import\s+url\(["']site-base\.css/);
  assert.match(css,/body:not\(\.nw-portal-light\)[^\n{]*\.footer[\s\S]{0,180}background\s*:\s*#000\s*!important/);
  assert.match(css,/env\(safe-area-inset-right\)/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
});

test('legacy privacy url forwards to Google-ready privacy route',()=>{
  assert.match(read('datenschutz.html'),/location\.replace\(\"\/datenschutz\/\"/);
  assert.match(read('datenschutz/index.html'),/Google-\/Gmail-Daten \(OAuth\)/);
});
