import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('same-page navigation and skip links retain the current locale/page despite a root base',()=>{
  for(const pathname of ['/de/','/en/','/tr/','/datenschutz','/web-concierge']){
    const links=['#services','#main-content'].map(href=>({href,getAttribute(){return this.href},setAttribute(k,v){assert.equal(k,'href');this.href=v}}));
    const document={readyState:'complete',documentElement:{},querySelectorAll:s=>s==='a[href^="#"]'?links:[]};
    vm.runInNewContext(fs.readFileSync('assets/stewaro-entry-routing.js','utf8'),{window:{},document,location:{hostname:'stewaro.com',pathname,search:'?source=fixture'},MutationObserver:class{observe(){}}});
    assert.deepEqual(links.map(a=>a.href),[pathname+'?source=fixture#services',pathname+'?source=fixture#main-content']);
    for(const link of links)assert.equal(new URL(link.href,'https://stewaro.com/').pathname,pathname);
  }
});

test('root routing preserves acquisition query and navigation fragment for public and App hosts',()=>{
  const script=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  for(const [hostname,target]of [['stewaro.com','/de/'],['nahwerkconcierge.com','/de/'],['app.stewaro.com','/web-concierge']]){
    const redirects=[];
    vm.runInNewContext(script,{window:{location:{hostname,search:'?source=fixture',hash:'#services',replace:v=>redirects.push(v)}}});
    assert.deepEqual(redirects,[target+'?source=fixture#services']);
  }
});
