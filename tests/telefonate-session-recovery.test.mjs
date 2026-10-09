import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const code=readFileSync("assets/stewaro-phone-session-v1.js","utf8");
const makeStore=(initial={})=>{
 const data=new Map(Object.entries(initial));
 return {getItem:key=>data.get(key)||null,setItem:(key,v)=>data.set(key,String(v)),removeItem:key=>data.delete(key),has:key=>data.has(key)};
};
const token="t".repeat(48);
const future="2099-01-01T12:00:00Z";
const past="2020-01-01T12:00:00Z";
const load=(tab={},persistent={})=>{
 const sessionStorage=makeStore(tab),localStorage=makeStore(persistent),window={};
 runInNewContext(code,{window,sessionStorage,localStorage,Date,JSON,Number,encodeURIComponent});
 return {api:window.STEWAROPhoneSession,sessionStorage,localStorage};
};
test("active tab session is used with no persistent copy",()=>{
 const t=load({scb_web_session:JSON.stringify({session_token:token,expires_at:future})});
 assert.equal(t.api.token(),token);
 assert.equal(t.localStorage.has("scb_web_session"),false);
});
test("only an explicitly remembered unexpired token is restored into the active tab",()=>{
 const saved={scb_web_session:JSON.stringify({session_token:token,remember_me:true,expires_at:future})};
 const a=load({},saved);
 assert.equal(a.api.token(),token);
 assert.equal(JSON.parse(a.sessionStorage.getItem("scb_web_session")).session_token,token);
 assert.equal(load({},{scb_web_session:JSON.stringify({session_token:token,remember_me:false,expires_at:future})}).api.token(),"");
 assert.equal(load({},{scb_web_session:JSON.stringify({session_token:token,remember_me:true,expires_at:past})}).api.token(),"");
 assert.equal(load({},{scb_web_session:"invalid-json"}).api.token(),"");
});
test("expired tab token is rejected; remembered session only if explicitly opted in",()=>{
 assert.equal(load({scb_web_session:JSON.stringify({session_token:token,expires_at:past})}).api.token(),"");
 const good=load({scb_web_session:JSON.stringify({session_token:token,expires_at:past})},{scb_web_session:JSON.stringify({session_token:token,expires_at:future,remember_me:true})});
 assert.equal(good.api.token(),token);
});
test("login return URL is fixed to known STEWARO telephone destinations",()=>{
 const {api}=load();
 assert.equal(api.loginHref("/telefonate"),"/anmelden?next=%2Ftelefonate");
 assert.equal(api.loginHref("/telefonate/ausgehend"),"/anmelden?next=%2Ftelefonate%2Fausgehend");
 assert.equal(api.loginHref("https://evil.example/"),"/anmelden?next=%2Ftelefonate%2Fausgehend");
});
test("phone and outbound pages use shared recovery and never expose stored tokens in URLs",()=>{
 const phone=readFileSync("telefonate/index.html","utf8");
 const out=readFileSync("telefonate/ausgehend/index.html","utf8");
 const js=readFileSync("assets/stewaro-outbound-ledger-v1.js","utf8");
 const signin=readFileSync("assets/stewaro-csp-anmelden-script-1.js","utf8");
 assert.match(phone,/stewaro-phone-session-v1\.js/);
 assert.match(out,/stewaro-phone-session-v1\.js/);
 assert.match(phone,/STEWAROPhoneSession\?\.token/);
 assert.match(js,/STEWAROPhoneSession\?\.token/);
 assert.match(js,/Mit bestehendem Konto anmelden/);
 assert.match(phone,/Mit bestehendem Konto anmelden/);
 assert.match(signin,/\/telefonate\/ausgehend/);
 assert.match(signin,/\/telefonate/);
 assert.doesNotMatch(signin,/ENTRY_NEXT\s*=\s*ENTRY_PARAMS\.get\(['"]next['"]\)/);
});
