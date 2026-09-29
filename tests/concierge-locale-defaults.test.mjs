import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const visible=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

test('STEWARO launch uses one FIDEL identity instead of locale-specific concierge personas',()=>{
  for(const lang of ['en','tr']){
    for(const page of ['prime-concierge.html','senioren-concierge.html']){
      const html=read(`${lang}/${page}`);
      assert.match(visible(html),/FIDEL/,`${lang}/${page}`);
      assert.doesNotMatch(html,/<script[^>]+concierge-carousel\.js|<link[^>]+concierge-carousel\.css/,`${lang}/${page}`);
      assert.doesNotMatch(visible(html),/Lukas|Leyla|Hartmut|Frida|Nilo|Mira/,`${lang}/${page}`);
    }
  }
});

test('fixed FIDEL product pages no longer load locale persona-default hydration',()=>{
  for(const file of [
    'prime-concierge.html','senioren-concierge.html',
    'en/prime-concierge.html','en/senioren-concierge.html',
    'tr/prime-concierge.html','tr/senioren-concierge.html'
  ]){
    const html=read(file);
    assert.doesNotMatch(html,/concierge-locale-defaults\.js|concierge-carousel\.js/);
  }
});

test('legacy locale-default asset remains non-authoritative compatibility code only',()=>{
  const js=read('assets/concierge-locale-defaults.js');
  assert.match(js,/en:/);
  assert.match(js,/tr:/);
  for(const file of ['de/index.html','en/index.html','tr/index.html']) assert.doesNotMatch(read(file),/concierge-locale-defaults\.js/);
});
