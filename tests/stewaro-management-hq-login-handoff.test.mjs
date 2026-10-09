import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const navigation = fs.readFileSync("assets/auth-nav.js", "utf8");
const domains = fs.readFileSync("assets/stewaro-domain-contract.js", "utf8");

const login = fs.readFileSync("assets/stewaro-csp-anmelden-script-1.js", "utf8");
const clean = fs.readFileSync("anmelden/index.html", "utf8");
const flat = fs.readFileSync("anmelden.html", "utf8");

test("HQ login intent is explicit and cannot be triggered by next=hq alone", () => {
  assert.match(login, /ENTRY_PARAMS\.get\('produkt'\)==='internal-hq'&&ENTRY_PARAMS\.get\('next'\)==='hq'/);
});

test("HQ handoff asks the canonical session authority for target hq", () => {
  assert.match(login, /JSON\.stringify\(\{action:'handoff_create',target:hq\?'hq':'app'\}\)/);
  assert.match(login, /hq[^A-Za-z0-9]+stewaro[^A-Za-z0-9]+com/);
  assert.match(login, /handoff_hq_aal2_required/);
});

test("HQ route does not offer self-registration", () => {
  assert.match(login, /if\(ENTRY_HQ_HANDOFF\)[\s\S]*a\.hidden=true/);
});

test("both login route mirrors load the shared login script", () => {
  for (const html of [clean, flat]) {
    assert.match(html, /stewaro-csp-anmelden-script-1\.js/);
  }
});

test("signed-in HQ intent stays on login instead of redirecting to /konto", () => {
  const code = navigation.match(/  function signedInDestination\(currentPage, search\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(code);
  const destination = vm.runInNewContext("(" + code.trim() + ")", {URLSearchParams});
  assert.equal(destination("anmelden.html", "?produkt=internal-hq&next=hq"), null);
  assert.equal(destination("anmelden.html", "?next=hq"), "/konto");
  assert.equal(destination("anmelden.html", "?produkt=senioren&next=hq"), "/konto");
  assert.equal(destination("anmelden.html", "?produkt=internal-hq&next=https://evil.invalid"), "/konto");
  assert.equal(destination("registrieren.html", "?produkt=internal-hq&next=hq"), "/konto");
  assert.equal((navigation.match(/if \(destination\) location\.replace\(accountUrl\(destination\)\);/g)||[]).length, 2);
});

test("stale public HQ login link goes to Account with intent intact, never /konto", () => {
  const replaced = [];
  const location = {
    hostname:"stewaro.com", origin:"https://stewaro.com", pathname:"/anmelden",
    search:"?produkt=internal-hq&next=hq", hash:"",
    replace: (value) => replaced.push(value)
  };
  const storage = {getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const document = {addEventListener:()=>{}};
  const window = {};
  vm.runInNewContext(domains, {location,document,window,sessionStorage:storage,localStorage:storage,URL,URLSearchParams});
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0], "https://account.stewaro.com/anmelden?produkt=internal-hq&next=hq");
});

test("already authenticated Owner starts HQ handoff after initial validation or delayed recovery", () => {
  assert.equal((navigation.match(/else resumeHQSignIn\(\);/g)||[]).length, 2);
  const source = navigation.match(/  function resumeHQSignIn\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(source, "guarded existing-session HQ continuation is installed");
  const handoffs = [];
  const status = {textContent: "", style: {}};
  const ctx = {
    validatedSession: {session_token: "validated-Owner-token"},
    window: {STEWARO_HQ_LOGIN_RESUME: (token) => { handoffs.push(token); return true; }},
    document: {getElementById: (id) => id === "loginStatus" ? status : null}
  };
  const resume = vm.runInNewContext("(" + source.trim() + ")", ctx);
  resume();
  assert.deepEqual(handoffs, ["validated-Owner-token"]);
  assert.equal(status.textContent, "", "successful HQ entry does not show an error");

  ctx.window.STEWARO_HQ_LOGIN_RESUME = undefined;
  resume();
  assert.equal(handoffs.length, 1, "missing handler must not start any other request");
  assert.match(status.textContent, /Management HQ konnte nicht sicher geöffnet/);
  assert.doesNotMatch(source, /location\.replace|\/konto/, "no silent customer-portal fallback");
});

test("both fresh and remembered Owner sessions use one single-use, HQ-scoped handoff", () => {
  assert.match(login, /if\(ENTRY_HQ_HANDOFF\)window\.STEWARO_HQ_LOGIN_RESUME=resumeHqHandoff/);
  assert.match(login, /setTimeout\(\(\)=>resumeHqHandoff\(body\.session_token\),120\)/);
  const source = login.match(/function resumeHqHandoff\(sessionToken\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source, "shared HQ handoff function exists");
  const calls = [];
  const notices = [];
  const ctx = {
    ENTRY_HQ_HANDOFF: true,
    hqHandoffInFlight: false,
    show: (message) => notices.push(message),
    handoffToTarget: (token, target) => { calls.push([token,target]); return Promise.resolve(); }
  };
  const resume = vm.runInNewContext("(" + source + ")", ctx);
  assert.equal(resume("validated-Owner-token"), true);
  assert.equal(resume("validated-Owner-token"), true);
  assert.equal(resume(""), false);
  assert.deepEqual(calls, [["validated-Owner-token", "hq"]]);
  assert.equal(notices.length, 1, "repeat resume must not create another handoff");

  const notHQ = vm.runInNewContext("(" + source + ")", {
    ...ctx, ENTRY_HQ_HANDOFF: false, hqHandoffInFlight: false
  });
  assert.equal(notHQ("validated-Owner-token"), false);
  assert.equal(calls.length, 1, "non-HQ login cannot initiate an HQ handoff");
});


test("exact HQ login links keep MFA intent on a remembered public-site session click", () => {
  class Element {}
  class HTMLAnchorElement extends Element {
    constructor(href){super();this.href=href;this.target="";}
    closest(){return this;}
  }
  for(const href of [
    "https://stewaro.com/anmelden?produkt=internal-hq&next=hq",
    "https://account.stewaro.com/anmelden?produkt=internal-hq&next=hq"
  ]){
    let onClick,prevented=false;
    const requests=[],redirects=[];
    const record=JSON.stringify({session_token:"remembered-public-session",remember_me:true});
    const storage={getItem:(key)=>key==="scb_web_session"?record:null,setItem:()=>{},removeItem:()=>{}};
    const location={hostname:"stewaro.com",origin:"https://stewaro.com",pathname:"/de/",search:"",hash:"",
      href:"https://stewaro.com/de/",replace:(url)=>redirects.push(url)};
    const document={addEventListener:(type,handler)=>{if(type==="click")onClick=handler;},querySelectorAll:()=>[]};
    vm.runInNewContext(domains,{location,document,window:{},sessionStorage:storage,localStorage:storage,
      URL,URLSearchParams,Element,HTMLAnchorElement,
      fetch:async(...args)=>{requests.push(args);throw Error("unexpected customer handoff");}});
    assert.equal(typeof onClick,"function");
    onClick({defaultPrevented:false,target:new HTMLAnchorElement(href),
      metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,
      preventDefault:()=>{prevented=true;}});
    assert.equal(prevented,false,"HQ intent must reach sign-in: "+href);
    assert.deepEqual(requests,[],"never turn HQ login into a customer Account migration");
    assert.deepEqual(redirects,[]);
  }
});
