import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const code=readFileSync("assets/account-header-concierge.js","utf8");

test("both canonical account routes load the same existing account header concierge asset",()=>{
 for(const p of ["konto.html","konto/index.html"]){
  const page=readFileSync(p,"utf8");
  assert.match(page,/account-header-concierge\.js\?v=4/);
  assert.match(page,/id="overviewConcierge"/);
  assert.match(page,/id="conciergeQuickMenu"/);
 }
});

function mount(){
 const created=[];
 const element=(tag)=>({
  tagName:tag.toUpperCase(),
  style:{},
  dataset:{},
  attrs:{},
  children:[],
  setAttribute(k,v){this.attrs[k]=v;},
  append(...c){this.children.push(...c)},
  querySelector(){return null}
 });
 const root=element("div"),quickMenu=element("div"),card=element("button"),source=element("strong");
 const nav={querySelector:()=>element("nav"),insertBefore:()=>{}};
 card.closest=(selector)=>selector===".account-overview-highlights"?root:null;
 source.closest=(selector)=>selector===".account-overview-link"?card:null;
 source.textContent="Concierge wird geladen …";
 const doc={
  getElementById:id=>({
   overviewConcierge:source,
   conciergeQuickMenu:quickMenu
  })[id]||null,
  querySelector:s=>s===".top .nav"?nav:null,
  createElement:tag=>{const e=element(tag);created.push(e);return e},
  addEventListener:()=>{}
 };
 root.insertBefore=(child,before)=>{assert.equal(before,card);root.children.unshift(child)};
 class MutationObserver{observe(){}}
 runInNewContext(code,{document:doc,window:{addEventListener(){}},MutationObserver});
 return {root,quickMenu,created};
}

test("account overview exposes real outbound ledger in the same signed-in browser tab",()=>{
 const {root}=mount();
 assert.equal(root.children.length,1);
 const entry=root.children[0];
 assert.equal(entry.tagName,"A");
 assert.equal(entry.id,"accountOutboundHistoryLink");
 assert.equal(entry.href,"/telefonate/ausgehend/");
 assert.equal(entry.target,undefined,"must not open a new Safari tab");
 assert.equal(entry.children[1].textContent,"Ausgehende Anrufe");
 assert.equal(entry.attrs["aria-label"],"Ausgehende Anrufe von FIDEL – Gesprächsprotokoll öffnen");
});
test("account Concierge quick menu repeats the same-tab outbound entry",()=>{
 const {quickMenu}=mount();
 assert.equal(quickMenu.children.length,1);
 const entry=quickMenu.children[0];
 assert.equal(entry.href,"/telefonate/ausgehend/");
 assert.equal(entry.target,undefined);
 assert.equal(entry.attrs.role,"menuitem");
 assert.match(entry.innerHTML,/Ausgehende Anrufe/);
});
test("no unrelated login, registration or session authorizations are changed",()=>{
 // Navigation source comments may explain sessionStorage; assert on executable code.
 const executable=code.replace(/\/\/[^\n]*/g,"");
 assert.doesNotMatch(executable,/localStorage|sessionStorage|session_token|document\.cookie|window\.open/);
 assert.match(code,/href = "\/telefonate\/ausgehend\/"/);
 const phone=readFileSync("assets/stewaro-phone-session-v1.js","utf8");
 assert.match(phone,/remember_me!==true/);
 assert.match(phone,/expires_at/);
});
