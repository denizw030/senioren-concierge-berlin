import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(p)=>fs.readFileSync(p,"utf8");
const navigation=read("assets/stewaro-account-app-navigation.js");
const bootstrap=read("assets/stewaro-app-bootstrap.js");
const ONE_TIME_URL="https://app.stewaro.com/#handoff=hnd_"+"A".repeat(48);
const wait=()=>new Promise((resolve)=>setImmediate(resolve));

class Link {
  constructor(href,brand=false){this.href=href;this.brand=brand;this.target="";}
  getAttribute(name){return name==="href"?this.href:null;}
  setAttribute(name,value){if(name==="href")this.href=value;}
  hasAttribute(){return false;}
  matches(selector){return this.brand&&selector.includes("header.top a.brand");}
  closest(){return this;}
}

function launch({host="account.stewaro.com",pathname="/konto",search="",session=true,remembered=false,target=ONE_TIME_URL,ok=true}={}){
  const listeners={};
  const redirects=[];
  const calls=[];
  const nodes=new Map();
  const active=new Map();
  const persistent=new Map();
  const sessionRecord={session_token:"test-token-never-in-navigation-urls",remember_me:remembered,person_id:"p1"};
  if(session)active.set("scb_web_session",JSON.stringify(sessionRecord));
  if(remembered)persistent.set("scb_web_session",JSON.stringify(sessionRecord));
  const storage=(data)=>({getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,val),removeItem:key=>data.delete(key)});
  const brand=new Link("/de/",true);
  const fidel=new Link("/web-concierge");
  const document={
    readyState:"loading",
    addEventListener:(name,callback)=>{listeners[name]=callback;},
    querySelectorAll:(selector)=>selector==="a[href]"?[brand,fidel]:[brand],
    getElementById:(id)=>nodes.get(id)||null,
    createElement:()=>({id:"",style:{},setAttribute(){},textContent:""}),
    body:{appendChild(node){nodes.set(node.id,node);}}
  };
  const location={
    hostname:host,origin:"https://"+host,href:"https://"+host+pathname+search,pathname,search,
    assign:(value)=>redirects.push(value),replace:(value)=>redirects.push(value)
  };
  const fetch=async(url,options)=>{
    calls.push({url,options});
    return {ok,status:ok?200:403,json:async()=>ok?{ok:true,status:"handoff_ready",target_url:target}:{ok:false,status:"blocked"}};
  };
  vm.runInNewContext(navigation,{location,document,sessionStorage:storage(active),localStorage:storage(persistent),fetch,URL,URLSearchParams,Date,Number,AbortSignal,Promise});
  const click=(link)=>{
    let prevented=false;
    listeners.click?.({
      defaultPrevented:false,target:link,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,
      preventDefault(){prevented=true;}
    });
    return prevented;
  };
  return {brand,fidel,document,location,active,persistent,redirects,calls,nodes,listeners,click};
}

test("account logo always navigates to public STEWARO, even if older navigation resets href",()=>{
  const x=launch();
  x.listeners.DOMContentLoaded();
  assert.equal(x.brand.href,"https://stewaro.com/de/");
  x.brand.href="/de/";
  assert.equal(x.click(x.brand),true);
  assert.deepEqual(x.redirects,["https://stewaro.com/de/"]);
});

test("clicking existing Account Web Concierge link creates a scoped one-time App transfer",async()=>{
  const x=launch();
  x.listeners.DOMContentLoaded();
  assert.equal(x.fidel.href,"https://app.stewaro.com/web-concierge");
  assert.equal(x.click(x.fidel),true);
  await wait();
  assert.equal(x.calls.length,1);
  assert.equal(x.calls[0].url,"https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure");
  assert.equal(x.calls[0].options.method,"POST");
  assert.equal(x.calls[0].options.credentials,"omit");
  assert.equal(x.calls[0].options.headers.Authorization,"Bearer test-token-never-in-navigation-urls");
  assert.deepEqual(JSON.parse(x.calls[0].options.body),{action:"handoff_create",target:"app"});
  assert.deepEqual(x.redirects,[ONE_TIME_URL]);
  assert.doesNotMatch(x.redirects[0],/session_token|test-token-never-in-navigation-urls/);
  assert.match(x.redirects[0],/#handoff=hnd_/);
});

test("Account can restore a remembered session while direct App entry requests safe handoff",async()=>{
  const x=launch({session:false,remembered:true,pathname:"/konto",search:"?stewaro_app=1"});
  await wait();
  assert.equal(x.calls.length,1);
  assert.deepEqual(x.redirects,[ONE_TIME_URL]);
});

test("missing Account session goes to app-aware sign-in without token query strings",()=>{
  const x=launch({session:false,pathname:"/konto",search:"?stewaro_app=1"});
  assert.deepEqual(x.redirects,["/anmelden?produkt=senioren&next=app"]);
  assert.equal(x.calls.length,0);
});

test("Account legacy links, malicious origins and unsafe handoff URLs fail closed",async()=>{
  for(const bad of [
    "https://evil.example/#handoff=hnd_"+"A".repeat(48),
    "https://app.stewaro.com/?session_token=secret#handoff=hnd_"+"A".repeat(48),
    "https://app.stewaro.com/#handoff=wrong",
    "https://app.stewaro.com/web-concierge#handoff=hnd_"+"A".repeat(48)
  ]){
    const x=launch({target:bad});
    assert.equal(x.click(x.fidel),true);
    await wait();
    assert.equal(x.redirects.length,0);
    assert.match(x.nodes.get("stewaroAppNavigationStatus")?.textContent||"",/nicht sicher geöffnet/);
  }
  const x=launch({ok:false});
  x.click(x.fidel);await wait();
  assert.deepEqual(x.redirects,[]);
  assert.equal(x.calls.length,1);
});

test("parallel taps do not duplicate one-time handoff requests",async()=>{
  const x=launch();
  x.click(x.fidel);x.click(x.fidel);
  await wait();
  assert.equal(x.calls.length,1);
  assert.deepEqual(x.redirects,[ONE_TIME_URL]);
});

test("handoff logic cannot run on public website or App host",()=>{
  for(const host of ["stewaro.com","app.stewaro.com","hq.stewaro.com"]){
    const x=launch({host});
    assert.deepEqual(Object.keys(x.listeners),[]);
    assert.equal(x.calls.length,0);
    assert.equal(x.redirects.length,0);
  }
});

test("App bootstrap recovers logged-in Account session; account-hosted old chat uses same transfer path",()=>{
  assert.match(bootstrap,/ACCOUNT_SESSION_TRANSFER=ACCOUNT_ORIGIN\+"\/konto\?stewaro_app=1"/);
  assert.match(bootstrap,/if\(!readSession\(\)\)\{[\s\S]*?location\.replace\(ACCOUNT_SESSION_TRANSFER\)/);
  assert.match(bootstrap,/location\.hostname==="account\.stewaro\.com"/);
  assert.match(bootstrap,/path==="\/web-concierge"/);
  assert.match(bootstrap,/action:"handoff_claim"/);
  assert.match(bootstrap,/history\.replaceState\(null,"",location\.pathname\+location\.search\)/);
});

test("all mirrored Account and FIDEL pages load the same cache-busted safe navigation",()=>{
  for(const page of ["konto.html","konto/index.html","anmelden.html","anmelden/index.html"]){
    const html=read(page);
    assert.match(html,/href="https:\/\/stewaro\.com\/de\/" aria-label="STEWARO – Startseite"/);
    assert.match(html,/\/assets\/stewaro-account-app-navigation\.js\?v=1/);
  }
  for(const page of ["web-concierge.html","web-concierge/index.html"]){
    assert.match(read(page),/\/assets\/stewaro-app-bootstrap\.js\?v=4/);
  }
  assert.equal(read("konto/index.html").replace('<head><base href="/">','<head>'),read("konto.html"));
  assert.equal(read("anmelden/index.html").replace('<head><base href="/">','<head>'),read("anmelden.html"));
});
