import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync("assets/stewaro-entry-routing.js","utf8");
function linksAfterRouting(lang,hrefs){
  const anchors=hrefs.map(href=>({
    href,
    getAttribute(key){return key==="href"?this.href:null},
    setAttribute(key,value){if(key==="href")this.href=value}
  }));
  const document={
    readyState:"complete",
    documentElement:{lang,dataset:{}},
    querySelectorAll(selector){return selector==='a[data-entry="loved-one"]'?anchors:[]},
    querySelector(){return null},
    addEventListener(){}
  };
  vm.runInNewContext(source,{
    window:{STEWARO_DOMAINS:{}},
    document,
    location:{hostname:"stewaro.com",origin:"https://stewaro.com",pathname:"/"+lang+"/",search:""},
    URL,
    MutationObserver:class{observe(){}}
  });
  return anchors.map(anchor=>anchor.href);
}
test("English family routes retain language and attribution",()=>{
  assert.deepEqual(linksAfterRouting("en",[
    "/en/angehoerige?source=stewaro","/en/angehoerige"
  ]),["/en/angehoerige?source=stewaro","/en/angehoerige"]);
});
test("Turkish family routes retain language",()=>{
  assert.deepEqual(linksAfterRouting("tr",[
    "/angehoerige?source=stewaro","/angehoerige"
  ]),["/tr/angehoerige?source=stewaro","/tr/angehoerige"]);
});
test("German family route retains existing behavior",()=>{
  assert.deepEqual(linksAfterRouting("de",["/angehoerige"]),["/angehoerige?source=stewaro"]);
});
test("lookalike origins cannot supply trusted attribution",()=>{
  assert.deepEqual(linksAfterRouting("en",[
    "https://evil.stewaro.com/angehoerige?source=stewaro"
  ]),["/en/angehoerige"]);
});
