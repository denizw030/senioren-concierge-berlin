import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const handoffSrc=fs.readFileSync("assets/stewaro-stage-handoff.js","utf8");
const authSrc=fs.readFileSync("assets/stewaro-stage-auth.js","utf8");
const TOKEN="hnd_"+"a".repeat(48);
const HOST="d2h3bbcracss71.cloudfront.net";
const ENDPOINT="https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-email-runtime-staging/stage-handoff";

function jsonResponse(status,body){
  return {ok:status>=200&&status<300,status,json:async()=>body};
}
async function settle(){
  for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
}
function loadHandoff({host=HOST,hash="",fetchImpl}={}){
  const calls=[];
  const redirects=[];
  const section={attrs:{},setAttribute(key,value){this.attrs[key]=value;}};
  const outcome={textContent:""};
  const status={textContent:""};
  const form={hidden:false};
  const location={
    hostname:host,origin:"https://"+host,pathname:"/web-concierge/",search:"",hash,protocol:"https:",
    replace(url){redirects.push(String(url));}
  };
  const window={
    listeners:{},
    addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);},
    dispatchEvent(event){(this.listeners[event.type]||[]).forEach(fn=>fn(event));}
  };
  const context={
    location,window,history:{replaceState(){location.hash="";}},
    document:{
      getElementById(id){
        if(id==="stewaroStageResult")return outcome;
        if(id==="webConciergeStatus")return status;
        if(id==="stewaroStageAuthForm")return form;
        return null;
      },
      querySelector(sel){return sel===".stewaro-stage-auth"?section:null;}
    },
    sessionStorage:{
      getItem:()=>null,
      setItem(){throw new Error("one-time handoff must not be stored");},
      removeItem(){}
    },
    fetch(url,init){
      calls.push({url:String(url),init});
      return fetchImpl(url,init);
    },
    URL,URLSearchParams,JSON,Promise
  };
  vm.createContext(context);
  vm.runInContext(handoffSrc,context,{filename:"stewaro-stage-handoff.js"});
  return {calls,redirects,location,outcome,status,form,section,window};
}
function loadAuth({hash="",storedToken="",fetchImpl}={}){
  const calls=[];
  const events=[];
  const nodes={};
  const make=(id)=>({
    id,hidden:false,value:"",textContent:"",disabled:false,
    setAttribute(){},
    addEventListener(type,fn){this["_"+type]=fn;},
    querySelector(sel){return nodes[sel.slice(1)]||null;},
    reportValidity(){return true;}
  });
  for(const id of ["stewaroStageAuthForm","stewaroStageEmail","stewaroStagePassword","stewaroStageResult","stewaroStageLogin","stewaroStageSignUp","stewaroStageLogout"])nodes[id]=make(id);
  nodes.stewaroStageEmail.value="stage-user@example.test";
  nodes.stewaroStagePassword.value="correct-password";
  const storage=new Map();
  if(storedToken)storage.set("stewaro_stage_auth_session_v1",JSON.stringify({token:storedToken,created:Date.now()}));
  const context={
    location:{hostname:HOST,hash},
    document:{
      getElementById(id){return id==="webConciergeLog"?{replaceChildren(){}}:id==="webConciergeStatus"?{textContent:""}:null;},
      createElement(){return {className:"",setAttribute(){},querySelector(sel){return nodes[sel.slice(1)]||null;}};}
    },
    window:{dispatchEvent(event){events.push(event);}},
    sessionStorage:{
      getItem:key=>storage.has(key)?storage.get(key):null,
      setItem:(key,value)=>storage.set(key,value),
      removeItem:key=>storage.delete(key)
    },
    fetch(url,init){calls.push({url:String(url),init});return fetchImpl(url,init);},
    CustomEvent:class CustomEvent{constructor(type,init){this.type=type;this.detail=init?.detail;}},
    URLSearchParams,JSON,Date
  };
  vm.createContext(context);
  vm.runInContext(authSrc,context,{filename:"stewaro-stage-auth.js"});
  return {calls,events,nodes};
}

test("staging handoff source stays on the STAGING function and both concierge mirrors",()=>{
  assert.match(handoffSrc,/nahwerk-email-runtime-staging\/stage-handoff/);
  assert.match(handoffSrc,/handoff_create/);
  assert.match(handoffSrc,/handoff_claim/);
  assert.match(handoffSrc,/handoff_replay_denied/);
  assert.match(handoffSrc,/FIDEL-Sprachgespräche sind noch gesperrt/);
  assert.doesNotMatch(handoffSrc,/djicahhmnnamtjuqedqd|app\.stewaro\.com|account\.stewaro\.com|ta832v8wah|web-session-secure/);
  assert.doesNotMatch(handoffSrc,/RTCPeerConnection|getUserMedia|fidelRoom:\s*true/);
  assert.doesNotMatch(authSrc,/handoff_create|handoff_claim|web-session-secure|djicahhmnnamtjuqedqd/);
  for(const path of ["web-concierge.html","web-concierge/index.html"]){
    const html=fs.readFileSync(path,"utf8");
    assert.match(html,/stewaro-stage-handoff\.js\?v=1/);
  }
});

test("fresh STAGING login asks for one handoff and ignores a foreign app URL",async()=>{
  const page=loadHandoff({
    fetchImpl:()=>jsonResponse(200,{
      ok:true,status:"handoff_ready",handoff:TOKEN,
      target_url:"https://app.stewaro.com/#handoff="+TOKEN
    })
  });
  page.window.dispatchEvent({type:"stewaro:stage-session",detail:{token:"stage-access-token"}});
  await page.window.STEWARO_STAGE_HANDOFF;
  assert.equal(page.calls.length,1);
  assert.equal(page.calls[0].url,ENDPOINT);
  assert.equal(page.calls[0].init.method,"POST");
  assert.equal(page.calls[0].init.credentials,"omit");
  assert.equal(page.calls[0].init.headers.Authorization,"Bearer stage-access-token");
  assert.deepEqual(JSON.parse(page.calls[0].init.body),{action:"handoff_create"});
  assert.deepEqual(page.redirects,["https://"+HOST+"/web-concierge/#handoff="+TOKEN]);
});

test("same-host target_url is opened once with the one-time handoff",async()=>{
  const target="https://"+HOST+"/web-concierge/#handoff="+TOKEN;
  const page=loadHandoff({
    fetchImpl:()=>jsonResponse(200,{ok:true,status:"handoff_ready",handoff:TOKEN,target_url:target})
  });
  page.window.dispatchEvent({type:"stewaro:stage-session",detail:{token:"stage-access-token"}});
  await page.window.STEWARO_STAGE_HANDOFF;
  assert.deepEqual(page.redirects,[target]);
});

test("first claim succeeds and the second claim shows denied",async()=>{
  let n=0;
  const fetchImpl=()=>{
    n+=1;
    return n===1
      ?jsonResponse(200,{ok:true,status:"handoff_claimed"})
      :jsonResponse(409,{ok:false,status:"handoff_replay_denied"});
  };
  const first=loadHandoff({hash:"#handoff="+TOKEN,fetchImpl});
  await first.window.STEWARO_STAGE_HANDOFF;
  assert.equal(first.calls.length,1);
  assert.equal(first.calls[0].url,ENDPOINT);
  assert.equal(first.calls[0].init.headers.Authorization,"Bearer "+TOKEN);
  assert.deepEqual(JSON.parse(first.calls[0].init.body),{action:"handoff_claim",handoff:TOKEN});
  assert.equal(first.location.hash,"");
  assert.equal(first.form.hidden,true);
  assert.equal(first.section.attrs["data-stage-handoff"],"claimed");
  assert.match(first.outcome.textContent,/STAGING-Übergabe bestätigt/);
  assert.match(first.outcome.textContent,/gesperrt/);
  assert.match(first.status.textContent,/Gespräche gesperrt/);

  const second=loadHandoff({hash:"#handoff="+TOKEN,fetchImpl});
  await second.window.STEWARO_STAGE_HANDOFF;
  assert.equal(n,2);
  assert.equal(second.section.attrs["data-stage-handoff"],"denied");
  assert.match(second.outcome.textContent,/STAGING-Übergabe abgelehnt/);
  assert.match(second.outcome.textContent,/bereits verwendet/);
  assert.match(second.outcome.textContent,/gesperrt/);
  assert.equal(second.form.hidden,false);
});

test("PROD hosts do not create or claim a handoff",async()=>{
  for(const host of ["app.stewaro.com","account.stewaro.com","stewaro.com"]){
    let called=0;
    const page=loadHandoff({
      host,hash:"#handoff="+TOKEN,
      fetchImpl(){called+=1;return jsonResponse(200,{ok:true,status:"handoff_claimed"});}
    });
    page.window.dispatchEvent({type:"stewaro:stage-session",detail:{token:"stage-access-token"}});
    await settle();
    assert.equal(called,0);
    assert.equal(page.redirects.length,0);
    assert.equal(page.window.STEWARO_STAGE_HANDOFF,undefined);
    assert.equal(page.outcome.textContent,"");
  }
});

test("fresh login emits one staging session and a restored or fragment load does not",async()=>{
  const fresh=loadAuth({
    fetchImpl(url){
      const value=String(url);
      if(value.includes("grant_type=password"))return jsonResponse(200,{access_token:"stage-access-token"});
      if(value.endsWith("/auth/v1/user"))return jsonResponse(200,{id:"user-1"});
      throw new Error("unexpected "+value);
    }
  });
  await fresh.nodes.stewaroStageAuthForm._submit({preventDefault(){}});
  assert.equal(fresh.events.length,1);
  assert.equal(fresh.events[0].detail.token,"stage-access-token");
  assert.match(fresh.nodes.stewaroStageResult.textContent,/gesperrt/);
  assert.ok(fresh.calls.every(call=>call.url.startsWith("https://btqklftjmwtqqqdmwlnk.supabase.co/auth/v1/")));

  const restored=loadAuth({
    storedToken:"stage-access-token",
    fetchImpl(url){
      assert.match(String(url),/\/auth\/v1\/user$/);
      return jsonResponse(200,{id:"user-1"});
    }
  });
  await settle();
  assert.equal(restored.events.length,0);
  assert.equal(restored.calls.length,1);

  const fragment=loadAuth({
    hash:"#handoff="+TOKEN,
    storedToken:"stage-access-token",
    fetchImpl(){throw new Error("fragment load must not call Auth");}
  });
  await settle();
  assert.equal(fragment.calls.length,0);
  assert.equal(fragment.events.length,0);
});
