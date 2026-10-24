import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source=readFileSync(new URL("../assets/stewaro-entry-routing.js",import.meta.url),"utf8");

function render({locale="en",path="/en/",hostname="stewaro.com",hasMain=true}={}){
  const elements=new Map();
  const inserted=[];
  const createElement=(tag)=>({
    tag,attrs:{},events:{},
    setAttribute(key,value){this.attrs[key]=String(value);},
    getAttribute(key){return this.attrs[key]??null;},
    addEventListener(key,handler){this.events[key]=handler;},
    focus(){this.focused=true;},
    querySelector(){return null;}
  });
  const main=createElement("main");
  const header=createElement("header");
  const brand=createElement("a");
  const nav=createElement("nav");
  header.querySelector=(selector)=>selector===".brand-lockup"?brand:selector===".header-nav"?nav:null;
  const body={firstChild:null,insertBefore(element){elements.set(element.id,element);inserted.push(element);}};
  const document={
    readyState:"complete",
    documentElement:{lang:locale,dataset:{}},
    body,
    head:{appendChild(element){elements.set(element.id,element);inserted.push(element);}},
    createElement,
    getElementById(id){return elements.get(id)||null;},
    querySelector(selector){
      if(selector==="main#top")return hasMain?main:null;
      if(selector===".site-header")return header;
      return null;
    },
    querySelectorAll(selector){
      if(selector==='a[href^="#"]'){
        const skip=elements.get("stewaro-skip-link");
        return skip?.getAttribute("href")?.startsWith("#")?[skip]:[];
      }
      return [];
    }
  };
  let rerun=()=>{};
  class MutationObserver{constructor(callback){rerun=callback;}observe(){}}
  const window={};
  const location={hostname,pathname:path,search:""};
  runInNewContext(source,{window,document,location,MutationObserver});
  return {elements,inserted,main,header,brand,nav,window,rerun};
}

test("homepage skip navigation works for German, English and Turkish",()=>{
  const names={
    de:["Zum Inhalt springen","Hauptnavigation","STEWARO Startseite"],
    en:["Skip to main content","Main navigation","STEWARO homepage"],
    tr:["Ana içeriğe geç","Ana gezinme","STEWARO ana sayfa"]
  };
  for(const [locale,[label,navLabel,homeLabel]] of Object.entries(names)){
    const result=render({locale,path:"/"+locale+"/"});
    const skip=result.elements.get("stewaro-skip-link");
    assert.ok(skip,locale);
    assert.equal(skip.textContent,label);
    assert.equal(skip.getAttribute("href"),"/"+locale+"/#top");
    assert.equal(result.main.getAttribute("tabindex"),"-1");
    assert.equal(result.nav.getAttribute("aria-label"),navLabel);
    assert.equal(result.brand.getAttribute("aria-label"),homeLabel);
    assert.match(result.elements.get("stewaro-skip-link-style").textContent,/:focus/);
    skip.events.click();
    assert.equal(result.main.focused,true);
  }
});

test("no skip link outside the three actual homepages or without a main region",()=>{
  for(const options of [
    {locale:"en",path:"/en/kontakt"},
    {locale:"tr",path:"/tr/angehoerige"},
    {locale:"de",path:"/zugang"},
    {locale:"en",path:"/tr/"},
    {locale:"en",path:"/en/",hasMain:false}
  ]){
    assert.equal(render(options).elements.has("stewaro-skip-link"),false,JSON.stringify(options));
  }
});

test("repeated mutation rewrites do not duplicate the skip link or style",()=>{
  const result=render({locale:"tr",path:"/tr/index.html"});
  result.rerun();
  result.rerun();
  assert.equal(result.inserted.filter(x=>x.id==="stewaro-skip-link").length,1);
  assert.equal(result.inserted.filter(x=>x.id==="stewaro-skip-link-style").length,1);
  assert.equal(result.elements.get("stewaro-skip-link").getAttribute("href"),"/tr/index.html#top");
});

test("account and family route contracts are preserved",()=>{
  const en=render({locale:"en",path:"/en/"});
  const tr=render({locale:"tr",path:"/tr/"});
  assert.equal(en.window.STEWAROEntryRouting.accountEntry,"/zugang");
  assert.equal(en.window.STEWAROEntryRouting.parentEntry,"/en/angehoerige?source=stewaro");
  assert.equal(tr.window.STEWAROEntryRouting.parentEntry,"/tr/angehoerige?source=stewaro");
});
