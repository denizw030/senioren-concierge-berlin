import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('stewaro-site');
const required=[
  'index.html','assets/site.css','assets/site.js',
  'concierge/index.html','telefonannahme/index.html','sicherheit/index.html',
  'angehoerige/index.html','funktionsweise/index.html','preise/index.html',
  'faq/index.html','kontakt/index.html','impressum/index.html',
  'datenschutz/index.html','nutzungsbedingungen/index.html','datenloeschung/index.html',
  'robots.txt','sitemap.xml'
];

test('STEWARO standalone surface is complete',()=>{
  for(const f of required) assert.equal(fs.existsSync(path.join(root,f)),true,`missing ${f}`);
});

test('STEWARO pages do not reintroduce visible public NAHWERK branding',()=>{
  for(const f of required.filter(x=>x.endsWith('.html'))){
    let s=fs.readFileSync(path.join(root,f),'utf8');
    s=s.replace(/mailto:[^"'<>\s]+/gi,'').replace(/[A-Z0-9._%+-]+@nahwerkconcierge\.com/gi,'');
    assert.equal(/>\s*NAHWERK\s*</i.test(s),false,`visible legacy brand in ${f}`);
    assert.equal(/NAHWERK\s+Concierge/i.test(s),false,`visible legacy product name in ${f}`);
  }
});

test('brand hierarchy and acquisition surfaces are explicit',()=>{
  const s=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const token of ['STEWARO','MyParentGuard','GuardMyParents','ParentGuard24']) assert.match(s,new RegExp(token));
  assert.match(s,/Angehörige/);
});

test('Meta-required legal destinations exist as public routes',()=>{
  for(const f of ['datenschutz/index.html','nutzungsbedingungen/index.html','datenloeschung/index.html']){
    const s=fs.readFileSync(path.join(root,f),'utf8');
    assert.match(s,/STEWARO/);
  }
});

test('responsive and reduced-motion guards exist',()=>{
  const css=fs.readFileSync(path.join(root,'assets/site.css'),'utf8');
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('sitemap targets canonical STEWARO domain',()=>{
  const s=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.match(s,/https:\/\/stewaro\.com\/datenschutz\//);
  assert.match(s,/https:\/\/stewaro\.com\/datenloeschung\//);
});


test('STEWARO does not persist acquisition attribution in browser storage',()=>{
  const js=fs.readFileSync(path.join(root,'assets/site.js'),'utf8');
  assert.doesNotMatch(js,/sessionStorage|localStorage/);
  assert.match(js,/data-preserve-source/);
});
