import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const PORT=4199;
const account=fs.readFileSync("konto.html","utf8");
const familySource=fs.readFileSync("assets/family-owner-sponsored-access.js","utf8");

function chromeBinary(){
  for(const bin of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){
    const r=spawnSync("bash",["-lc","command -v "+bin],{encoding:"utf8"});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  return null;
}

function extractFixture(){
  const tab=(account.match(/<button[^>]+id="accountTabAccess"[\s\S]*?<\/button>/i)||[])[0];
  const start=account.indexOf('<div id="familyOwnerPanelSlot"');
  const end=account.indexOf('<article class="card summary-card plan-summary"',start);
  assert.ok(tab&&start>=0&&end>start,"family fixture anchors must exist");
  return {tab,panel:account.slice(start,end)};
}
const fixtureParts=extractFixture();

function page(mode){
  const activation="https://wa.me/491633900770?text="+encodeURIComponent("NAHWERK Einladung bestätigen: "+"a".repeat(64));
  const outbound=mode==="direct"
    ? {route:"DIRECT_PREMIUM",provider_execution:true,send_status:"SENT",provider_template_locale:"tr",provider_content_sid:"HX"+"1".repeat(32),activation_link:null}
    : {route:"ACTIVATION_LINK",provider_execution:false,send_status:"ACTIVATION_LINK_READY",provider_template_locale:null,provider_content_sid:null,activation_link:activation,activation_expires_at:"2026-09-16T12:00:00Z"};
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Family Premium Browser Smoke</title></head>
<body><main>${fixtureParts.tab}${fixtureParts.panel}</main>
<script>
(() => {
  const gateway="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";
  const mode=${JSON.stringify(mode)};
  const outbound=${JSON.stringify(outbound)};
  const state=window.__familyPremiumSmoke={providerWrite:false,clipboard:null,created:false};
  sessionStorage.setItem("scb_web_session",JSON.stringify({session_token:"r".repeat(40)}));
  window.NAHWERK_CONCIERGES=[{key:"leyla",name:"Leyla"},{key:"nilo",name:"Nilo"}];
  Object.defineProperty(navigator,"clipboard",{value:{writeText:async(value)=>{state.clipboard=String(value)}}});

  window.fetch=async(input,init={})=>{
    const raw=typeof input==="string"?input:input.url;
    const url=new URL(raw,location.href);
    const method=String(init.method||"GET").toUpperCase();
    if(url.pathname==="/api/runtime-config"){
      return new Response(JSON.stringify({
        ok:true,
        family_contract:"family-owner-sponsored-access-v1",
        platform_contract_sha:"e63d09682c9a919a9ab347ff27d197f2a3c10a18",
        family_runtime_enabled:true,
        family_gateway_base:gateway
      }),{status:200,headers:{"Content-Type":"application/json"}});
    }
    if(url.href.startsWith(gateway)){
      if(method==="GET"&&url.pathname.endsWith("/operator/context")){
        return new Response(JSON.stringify({ok:true,operator:{role:"OWNER",can_manage_sponsored_people:true,can_manage_sponsored_entitlements:true},browser_actor_authority:false}),{status:200,headers:{"Content-Type":"application/json"}});
      }
      if(method==="GET"&&url.pathname.endsWith("/operator/managed-people")){
        return new Response(JSON.stringify({ok:true,people:[]}),{status:200,headers:{"Content-Type":"application/json"}});
      }
      if(method==="GET"&&url.pathname.endsWith("/family/invitations")){
        return new Response(JSON.stringify({ok:true,invitations:[]}),{status:200,headers:{"Content-Type":"application/json"}});
      }
      if(method==="POST"&&url.pathname.endsWith("/operator/managed-people/invitations")){
        state.created=true;
        return new Response(JSON.stringify({
          ok:true,
          invitation_id:"00000000-0000-4000-8000-000000000777",
          state:"MESSAGE_PENDING",
          duplicate:false,
          outbound
        }),{status:201,headers:{"Content-Type":"application/json"}});
      }
      return new Response(JSON.stringify({ok:false,error:"unexpected_family_request"}),{status:500,headers:{"Content-Type":"application/json"}});
    }
    if(method!=="GET")state.providerWrite=true;
    return new Response("blocked",{status:418});
  };

  async function run(){
    const panel=document.getElementById("familyOwnerPanel");
    for(let i=0;i<160&&panel?.hidden;i++)await new Promise(r=>setTimeout(r,25));
    const add=document.getElementById("familyPersonAddButton");
    add?.click();

    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value};
    set("familyFirstName","Hülya");
    set("familyLastName","Cimen");
    set("familyRelationship","MOTHER");
    set("familyWhatsappNumber","+491700000777");
    set("familyPreferredLanguage","tr");
    set("familyConciergeChoice","leyla");
    set("familyFormOfAddress","DU");
    document.querySelectorAll("[data-sponsored-feature]").forEach(el=>el.value="0");
    const consent=document.getElementById("familyContactConsent");
    if(consent)consent.checked=true;

    const form=document.getElementById("familyPersonForm");
    form?.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    const status=document.getElementById("familyPersonFormStatus");

    for(let i=0;i<200;i++){
      const directReady=/Einladung wird über WhatsApp zugestellt/.test(status?.textContent||"");
      const activationReady=!!status?.querySelector('a[href^="https://wa.me/"]');
      if((mode==="direct"&&directReady)||(mode==="activation"&&activationReady))break;
      await new Promise(r=>setTimeout(r,25));
    }

    let copyGreen=true;
    let confirmGreen=true;
    if(mode==="activation"){
      const link=status?.querySelector('a[href^="https://wa.me/"]');
      confirmGreen=!!link&&link.textContent==="In WhatsApp bestätigen";
      const copy=[...status.querySelectorAll("button")].find(b=>b.textContent==="Link kopieren");
      copy?.click();
      await new Promise(r=>setTimeout(r,25));
      copyGreen=!!copy&&state.clipboard===link?.href;
    }

    const relevant=[...document.querySelectorAll("#familyOwnerPanel button,#familyOwnerPanel input,#familyOwnerPanel select,#familyPersonFormStatus a")]
      .filter(el=>!el.closest("[hidden]"));
    const overflow=document.documentElement.scrollWidth>innerWidth+1||relevant.some(el=>{
      const r=el.getBoundingClientRect();
      return r.width>0&&(r.left<-1||r.right>innerWidth+1);
    });

    const directGreen=mode!=="direct"||/Einladung wird über WhatsApp zugestellt/.test(status?.textContent||"");
    const activationGreen=mode!=="activation"||(
      /Einladung über WhatsApp aktivieren/.test(status?.textContent||"")&&confirmGreen&&copyGreen
    );

    if(state.created&&!state.providerWrite&&!overflow&&directGreen&&activationGreen){
      document.documentElement.dataset.familyPremiumBrowserSmoke=mode+"-green";
      document.documentElement.dataset.familyPremiumClipboard=copyGreen?"green":"red";
      document.documentElement.dataset.familyPremiumOverflow="none";
    } else {
      document.documentElement.dataset.familyPremiumDebug=JSON.stringify({
        created:state.created,providerWrite:state.providerWrite,overflow,directGreen,activationGreen,
        status:status?.textContent||"",clipboard:state.clipboard
      });
    }
  }
  addEventListener("load",()=>void run());
})();
</script>
<script src="/assets/family-owner-sponsored-access.js?v=family-premium-browser-smoke"></script>
</body></html>`;
}

async function waitForServer(){
  for(let i=0;i<50;i++){
    try{
      const r=await fetch(`http://127.0.0.1:${PORT}/direct.html`);
      if(r.ok)return;
    }catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error("fixture server unavailable");
}

async function httpStatus(url){
  try{
    return (await fetch(url,{cache:"no-store"})).status;
  }catch{
    return 0;
  }
}

test("Family Premium UI browser smoke: desktop/mobile, direct/activation/copy",async(t)=>{
  const chrome=chromeBinary();
  if(!chrome){t.skip("Chrome unavailable");return}

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nw-family-premium-"));
  fs.mkdirSync(path.join(dir,"assets"),{recursive:true});
  fs.writeFileSync(path.join(dir,"assets","family-owner-sponsored-access.js"),familySource);
  fs.writeFileSync(path.join(dir,"direct.html"),page("direct"));
  fs.writeFileSync(path.join(dir,"activation.html"),page("activation"));

  const server=spawn("python3",["-m","http.server",String(PORT),"--bind","127.0.0.1"],{
    cwd:dir,stdio:"ignore"
  });

  try{
    await waitForServer();
    for(const width of [1440,390]){
      const height=width===390?844:1000;
      for(const mode of ["direct","activation"]){
        const url=`http://127.0.0.1:${PORT}/${mode}.html`;
        const assetUrl=`http://127.0.0.1:${PORT}/assets/family-owner-sponsored-access.js?v=family-premium-browser-smoke`;
        const args=[
          "--headless","--no-sandbox","--disable-gpu","--hide-scrollbars",
          `--window-size=${width},${height}`,
          "--virtual-time-budget=7000","--dump-dom",url
        ];
        const runChrome=()=>spawnSync(chrome,args,{encoding:"utf8",timeout:20000});

        let r=runChrome();
        assert.equal(r.status,0,`Chrome ${mode} ${width} failed: ${r.stderr}`);

        if(Buffer.byteLength(r.stdout||"","utf8")===0){
          const first={
            status:r.status,
            stdoutBytes:Buffer.byteLength(r.stdout||"","utf8"),
            stderr:r.stderr||""
          };
          const urlHttpStatus=await httpStatus(url);
          const assetHttpStatus=await httpStatus(assetUrl);
          const diagnostic={
            mode,width,
            firstStatus:first.status,
            firstStdoutBytes:first.stdoutBytes,
            firstStderr:first.stderr,
            urlHttpStatus,
            assetHttpStatus,
            retryStatus:null,
            retryStdoutBytes:null,
            retryStderr:null,
            markerFound:false
          };

          if(urlHttpStatus!==200||assetHttpStatus!==200){
            console.error("FAMILY_PREMIUM_EMPTY_DOM",JSON.stringify(diagnostic));
            assert.equal(urlHttpStatus,200,`Family Premium EMPTY-DOM target HTTP failed: ${JSON.stringify(diagnostic)}`);
            assert.equal(assetHttpStatus,200,`Family Premium EMPTY-DOM asset HTTP failed: ${JSON.stringify(diagnostic)}`);
          }

          const retry=runChrome();
          diagnostic.retryStatus=retry.status;
          diagnostic.retryStdoutBytes=Buffer.byteLength(retry.stdout||"","utf8");
          diagnostic.retryStderr=retry.stderr||"";
          diagnostic.markerFound=(retry.stdout||"").includes(`data-family-premium-browser-smoke="${mode}-green"`);
          console.error("FAMILY_PREMIUM_EMPTY_DOM",JSON.stringify(diagnostic));

          assert.equal(retry.status,0,`Chrome ${mode} ${width} retry failed: ${JSON.stringify(diagnostic)}`);
          assert.notEqual(diagnostic.retryStdoutBytes,0,`Chrome ${mode} ${width} retry returned empty DOM: ${JSON.stringify(diagnostic)}`);
          r=retry;
        }

        assert.match(r.stdout,new RegExp(`data-family-premium-browser-smoke="${mode}-green"`),r.stdout);
        assert.match(r.stdout,/data-family-premium-overflow="none"/,r.stdout);
        if(mode==="activation")assert.match(r.stdout,/data-family-premium-clipboard="green"/,r.stdout);
      }
    }
  } finally {
    server.kill("SIGTERM");
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
