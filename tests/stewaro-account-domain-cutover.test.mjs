import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=(p)=>fs.readFileSync(p,"utf8");
const domains=read("assets/stewaro-domain-contract.js");
const auth=read("assets/auth-nav.js");
const entry=read("assets/stewaro-entry-routing.js");

test("canonical STEWARO surfaces are split website account and app",()=>{
  assert.match(domains,/PUBLIC_ORIGIN="https:\/\/stewaro\.com"/);
  assert.match(domains,/ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(domains,/APP_ORIGIN="https:\/\/app\.stewaro\.com"/);
  assert.match(auth,/const ACCOUNT_ORIGIN = "https:\/\/account\.stewaro\.com"/);
  assert.match(auth,/accountUrl\("\/konto"\)/);
});

test("remembered public session migrates to account with a one-time secure handoff",()=>{
  assert.match(domains,/action:"handoff_create",target:"account"/);
  assert.match(domains,/action:"handoff_claim"/);
  assert.match(domains,/target\.hash\.startsWith\("#handoff="\)/);
  assert.match(domains,/remember_me:body\.remember_me===true/);
  assert.match(domains,/localStorage\.setItem\(SESSION_KEY,JSON\.stringify\(payload\)\)/);
  assert.match(domains,/sessionMigrationPaths/);
  assert.match(domains,/document\.addEventListener\("click"/);
  assert.doesNotMatch(domains,/session_token[^\n]{0,160}(?:searchParams|\?)/);
});

test("public home routes new account entry to account.stewaro.com while preview stays isolated",()=>{
  assert.match(entry,/PROD_ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(entry,/STAGING_ACCOUNT_ORIGIN="https:\/\/d23le2tjpi7la\.cloudfront\.net"/);
  assert.match(entry,/accountEntry=isAccount\?"\/":\(isWebsitePreview\?STAGING_ACCOUNT_ORIGIN\+"\/":PROD_ACCOUNT_ORIGIN\+"\/"\)/);
  assert.match(entry,/PROD_ACCOUNT_ORIGIN\+"\/anmelden"/);
});

test("account surfaces load the canonical domain contract before their local application scripts",()=>{
  for(const page of [
    "zugang.html","zugang/index.html","anmelden.html","anmelden/index.html",
    "registrieren.html","registrieren/index.html","konto.html","konto/index.html",
    "concierge-anpassen.html","concierge-anpassen/index.html","payg.html","payg/index.html",
    "telefonate/index.html","zugang-uebertragen.html","zugang-uebertragen/index.html",
    "passwort-zuruecksetzen.html","passwort-zuruecksetzen/index.html",
    "email-concierge.html","email-concierge/index.html"
  ]){
    assert.match(read(page),/assets\/stewaro-domain-contract\.js\?v=1/,page);
  }
});

test("public account-aware navigation loads the same canonical domain contract",()=>{
  assert.match(auth,/domainScript\.src="\/assets\/stewaro-domain-contract\.js\?v=1"/);
  assert.match(entry,/domainScript\.src="\/assets\/stewaro-domain-contract\.js\?v=1"/);
});

test("legacy account URLs are routed canonically without changing app ownership",()=>{
  assert.match(domains,/movePublicAccountRoute/);
  assert.match(domains,/moveAccountPublicRoute/);
  assert.match(domains,/APP_ORIGIN\+parsed\.pathname/);
  assert.match(domains,/PUBLIC_ORIGIN\+parsed\.pathname/);
});


test("public STEWARO transfers an existing session to a script-backed Account login route",async()=>{
  const capability="hnd_"+"a".repeat(43);
  const parentBearer="parent-bearer-"+"p".repeat(48);
  const location={
    hostname:"stewaro.com", origin:"https://stewaro.com", pathname:"/konto",
    search:"",hash:"",href:"https://stewaro.com/konto",replace:(url)=>redirects.push(url)
  };
  const redirects=[],requests=[];
  const storage={getItem:(key)=>key==="scb_web_session"?JSON.stringify({session_token:parentBearer,remember_me:true}):null,setItem:()=>{},removeItem:()=>{}};
  const window={};
  const document={addEventListener:()=>{}};
  vm.runInNewContext(domains,{location,document,window,sessionStorage:storage,localStorage:storage,URL,URLSearchParams,
    fetch:async(url,options)=>{
      requests.push({url,options});
      return {ok:true,json:async()=>({ok:true,status:"handoff_ready",target_url:"https://account.stewaro.com/#handoff="+capability})};
    }
  });
  await new Promise((resolve)=>setImmediate(resolve));
  assert.equal(requests.length,1);
  assert.deepEqual(JSON.parse(requests[0].options.body),{action:"handoff_create",target:"account"});
  assert.equal(requests[0].options.headers.Authorization,"Bearer "+parentBearer);
  assert.equal(redirects.length,1);
  const destination=new URL(redirects[0]);
  assert.equal(destination.origin,"https://account.stewaro.com");
  assert.equal(destination.pathname,"/anmelden","do not enter Account root lacking claim script");
  assert.equal(destination.searchParams.get("next"),"/konto");
  assert.equal(destination.hash,"#handoff="+capability);
  assert.ok(!redirects[0].includes(parentBearer),"parent session bearer is never navigated");
  assert.match(read("anmelden/index.html"),/<script src="\/assets\/stewaro-domain-contract\.js\?v=1"><\/script>/);
});

test("Account handoff refuses arbitrary server target routes, origins, queries or extra fragments",async()=>{
  const token="hnd_"+"b".repeat(43);
  const targets=[
    "https://evil.example/#handoff="+token,
    "https://account.stewaro.com/de/#handoff="+token,
    "https://account.stewaro.com/?foo=bar#handoff="+token,
    "https://account.stewaro.com/#handoff="+token+"&redirect=https://evil.example",
    "https://account.stewaro.com/#handoff=malformed"
  ];
  for(const target of targets){
    const redirects=[];
    const location={hostname:"stewaro.com",origin:"https://stewaro.com",pathname:"/konto",search:"",hash:"",
      replace:(url)=>redirects.push(url)};
    const storage={getItem:()=>JSON.stringify({session_token:"p".repeat(64)}),setItem:()=>{},removeItem:()=>{}};
    vm.runInNewContext(domains,{location,document:{addEventListener:()=>{}},window:{},sessionStorage:storage,
      localStorage:storage,URL,URLSearchParams,
      fetch:async()=>({ok:true,json:async()=>({ok:true,status:"handoff_ready",target_url:target})})
    });
    await new Promise((resolve)=>setImmediate(resolve));
    assert.deepEqual(redirects,["https://account.stewaro.com/konto"],"unsafe handoff cannot be followed: "+target);
    assert.doesNotMatch(redirects[0],/handoff=/);
  }
});

test("script-backed Account login claims token before customer portal navigation",async()=>{
  const capability="hnd_"+"c".repeat(43),sessionToken="account-session-"+ "s".repeat(44);
  const replaced=[],historyPaths=[],saved=new Map(),calls=[];
  const location={hostname:"account.stewaro.com",origin:"https://account.stewaro.com",pathname:"/anmelden",
    search:"?next=%2Fkonto",hash:"#handoff="+capability,
    replace:(url)=>replaced.push(url)};
  const storage={getItem:(key)=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:(key)=>saved.delete(key)};
  const window={};
  vm.runInNewContext(domains,{location,document:{addEventListener:()=>{}},window,sessionStorage:storage,
    localStorage:storage,URL,URLSearchParams,
    history:{replaceState:(_state,_title,path)=>historyPaths.push(path)},
    fetch:async(url,options)=>{
      calls.push({url,options});
      return {ok:true,json:async()=>({
        ok:true,status:"handoff_claimed",session_token:sessionToken,
        person_id:"person",customer_account_id:"account",auth_level:"aal2",remember_me:true,
        product_context:"senioren",expires_at:"2026-10-10T01:00:00Z",idle_expires_at:"2026-10-10T01:00:00Z"
      })};
    }
  });
  await window.STEWARO_ACCOUNT_AUTH_READY;
  assert.equal(calls.length,1);
  assert.deepEqual(JSON.parse(calls[0].options.body),{action:"handoff_claim"});
  assert.equal(calls[0].options.headers.Authorization,"Bearer "+capability);
  assert.equal(JSON.parse(saved.get("scb_web_session")).session_token,sessionToken);
  assert.deepEqual(historyPaths,["/anmelden?next=%2Fkonto","/konto"]);
  assert.deepEqual(replaced,["/konto"]);
  assert.ok(!replaced.some(url=>url.includes(capability)||url.includes(sessionToken)));
});

test("Account claim isolates stale signed-in identity and removes capability before network response",async()=>{
  const capability="hnd_"+"d".repeat(43);
  const stored=new Map([["scb_web_session",JSON.stringify({session_token:"STALE_ACCOUNT_IDENTITY",remember_me:true})]]);
  const persistent=new Map(stored);
  const storage=(map)=>({getItem:(key)=>map.get(key)||null,setItem:(key,val)=>map.set(key,val),removeItem:(key)=>map.delete(key)});
  const historyPaths=[],redirects=[],calls=[];
  const location={hostname:"account.stewaro.com",pathname:"/anmelden",search:"?next=%2Fkonto",
    hash:"#handoff="+capability,replace:(url)=>redirects.push(url)};
  let resolveClaim;
  const claimResponse=new Promise((resolve)=>{resolveClaim=resolve;});
  const window={};
  vm.runInNewContext(domains,{location,document:{addEventListener:()=>{}},window,
    sessionStorage:storage(stored),localStorage:storage(persistent),URL,URLSearchParams,
    history:{replaceState:(_state,_title,path)=>historyPaths.push(path)},
    fetch:async(_url,options)=>{calls.push(options);return claimResponse;}
  });
  assert.equal(stored.has("scb_web_session"),false,"previous tab-scoped identity must be cleared before async claim");
  assert.equal(persistent.has("scb_web_session"),false,"old remembered identity must not be restored");
  assert.deepEqual(historyPaths,["/anmelden?next=%2Fkonto"],"fragment must disappear before fetch completion");
  assert.equal(calls.length,1);
  assert.equal(calls[0].headers.Authorization,"Bearer "+capability);
  resolveClaim({ok:false,status:409,json:async()=>({ok:false,status:"handoff_already_claimed"})});
  await window.STEWARO_ACCOUNT_AUTH_READY;
  assert.equal(stored.has("scb_web_session"),false);
  assert.equal(persistent.has("scb_web_session"),false);
  assert.deepEqual(redirects,["/anmelden?source=account_handoff_failed"]);
  assert.ok(!historyPaths.some((path)=>path.includes(capability)));
});

test("malformed or multi-key Account capabilities cannot restore an earlier identity",async()=>{
  for(const hash of ["#handoff=invalid","#handoff=hnd_"+"e".repeat(43)+"&next=https%3A%2F%2Fevil.example"]){
    const stored=new Map([["scb_web_session",JSON.stringify({session_token:"STALE"})]]);
    const storage={getItem:(key)=>stored.get(key)||null,setItem:(key,val)=>stored.set(key,val),removeItem:(key)=>stored.delete(key)};
    let calls=0;const redirects=[],historyPaths=[];
    const location={hostname:"account.stewaro.com",pathname:"/anmelden",search:"",
      hash,replace:(url)=>redirects.push(url)};
    const window={};
    vm.runInNewContext(domains,{location,window,document:{addEventListener:()=>{}},
      sessionStorage:storage,localStorage:storage,URL,URLSearchParams,
      history:{replaceState:(_state,_title,path)=>historyPaths.push(path)},
      fetch:async()=>{calls++;throw Error("no network claim for malformed capability");}
    });
    assert.equal(calls,0);
    assert.equal(stored.has("scb_web_session"),false);
    assert.deepEqual(historyPaths,["/anmelden"]);
    assert.deepEqual(redirects,["/anmelden?source=account_handoff_failed"]);
    assert.ok(!redirects[0].includes("#handoff="));
  }
});
