import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const page=readFileSync("telefonate/index.html","utf8");
const sessionCode=readFileSync("assets/stewaro-phone-session-v1.js","utf8");
const ACCOUNT_LOGIN="https://account.stewaro.com/anmelden?produkt=senioren&next=app";

function loginHref(hostname){
  const window={location:{hostname}};
  const storage={getItem:()=>null,setItem(){}};
  runInNewContext(sessionCode,{window,sessionStorage:storage,localStorage:storage,Date,JSON,Number});
  return window.STEWAROPhoneSession.loginHref;
}

test("existing phone-session helper routes only the exact App host through Account",()=>{
  assert.equal(loginHref("app.stewaro.com")("/telefonate"),ACCOUNT_LOGIN);
  assert.equal(loginHref("app.stewaro.com")("https://evil.example/"),ACCOUNT_LOGIN);
  for(const host of ["app.stewaro.com.evil.example","evilapp.stewaro.com","nahwerkconcierge.com"]){
    assert.equal(loginHref(host)("/telefonate"),"/anmelden");
  }
});

test("history shows the shared secure login destination without HTML interpolation",()=>{
  const match=page.match(/const showLogin=\(\)=>\{[^}]*\};/);
  assert.ok(match,"history must have one shared login renderer");
  assert.equal((page.match(/showLogin\(\);return/g)||[]).length,2,"both missing and expired sessions use the renderer");
  assert.doesNotMatch(page,/<a href="\/anmelden">Mit bestehendem Konto anmelden/);
  const link={href:"",textContent:""};
  const state={className:"",hidden:true,children:[],replaceChildren(...nodes){this.children=nodes;}};
  const list={hidden:false,children:[{textContent:"private history"}],replaceChildren(...nodes){this.children=nodes;}};
  const document={createElement:()=>link,createTextNode:(value)=>({textContent:value})};
  const window={STEWAROPhoneSession:{loginHref:loginHref("app.stewaro.com")}};
  runInNewContext("(()=>{"+match[0]+"showLogin();})()",{state,list,document,window});
  assert.equal(state.className,"error");
  assert.equal(state.hidden,false);
  assert.equal(list.hidden,true);
  assert.equal(list.children.length,0,"private history must be cleared on expiry");
  assert.equal(state.children[1],link);
  assert.equal(link.href,ACCOUNT_LOGIN);
  assert.equal(link.textContent,"Mit bestehendem Konto anmelden.");
  assert.doesNotMatch(link.href,/session_token|handoff=|bearer/i);
});
