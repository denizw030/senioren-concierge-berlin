import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const SITE_ROOT=path.resolve(process.argv[2]||".");
const OUT_DIR=path.resolve(process.argv[3]||"diagnostic-output");
const PORT=4199;
const ATTEMPTS=20;
const EXPECTED_SHA="9c76636a3c863e45d0d794d11fafa60f3e988a52";
const MARKER='data-family-premium-browser-smoke="direct-green"';
fs.mkdirSync(OUT_DIR,{recursive:true});

const account=fs.readFileSync(path.join(SITE_ROOT,"konto.html"),"utf8");
const familySource=fs.readFileSync(path.join(SITE_ROOT,"assets/family-owner-sponsored-access.js"),"utf8");

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
  if(!(tab&&start>=0&&end>start))throw new Error("family fixture anchors must exist");
  return {tab,panel:account.slice(start,end)};
}
const fixtureParts=extractFixture();

function directPage(){
  const outbound={route:"DIRECT_PREMIUM",provider_execution:true,send_status:"SENT",provider_template_locale:"tr",provider_content_sid:"HX"+"1".repeat(32),activation_link:null};
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Family Premium Browser Smoke</title></head>
<body><main>${fixtureParts.tab}${fixtureParts.panel}</main>
<script>
(() => {
  const gateway="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";
  const mode="direct";
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

async function httpProbe(url){
  const started=Date.now();
  try{
    const response=await fetch(url,{cache:"no-store"});
    const body=await response.arrayBuffer();
    return {ok:true,status:response.status,bodyBytes:body.byteLength,elapsedMs:Date.now()-started};
  }catch(error){
    return {ok:false,status:null,bodyBytes:0,elapsedMs:Date.now()-started,error:String(error?.stack||error)};
  }
}

async function waitForServer(url){
  const history=[];
  for(let i=0;i<50;i++){
    const probe=await httpProbe(url);
    history.push(probe);
    if(probe.ok&&probe.status===200)return {ready:true,history};
    await new Promise(r=>setTimeout(r,100));
  }
  return {ready:false,history};
}

function shell(command){
  const r=spawnSync("bash",["-lc",command],{encoding:"utf8",timeout:5000});
  return {status:r.status,signal:r.signal,stdout:r.stdout||"",stderr:r.stderr||"",error:r.error?String(r.error.stack||r.error):null};
}

function processError(error){
  if(!error)return null;
  return {name:error.name||null,message:error.message||String(error),code:error.code||null,errno:error.errno||null,syscall:error.syscall||null,stack:error.stack||null};
}

const sourceScan=[];
for(const name of fs.readdirSync(path.join(SITE_ROOT,"tests")).filter(n=>n.endsWith(".test.mjs"))){
  const text=fs.readFileSync(path.join(SITE_ROOT,"tests",name),"utf8");
  const lines=text.split(/\r?\n/);
  const hits=[];
  lines.forEach((line,index)=>{
    if(/google-chrome|chromium|spawnSync\(|http\.server|\b4199\b|chromeBinary/.test(line))hits.push({line:index+1,text:line});
  });
  if(hits.length)sourceScan.push({file:name,hits});
}

const chrome=chromeBinary();
if(!chrome)throw new Error("Chrome unavailable");
const versionResult=spawnSync(chrome,["--version"],{encoding:"utf8",timeout:5000});
const chromeVersion=(versionResult.stdout||versionResult.stderr||"").trim();

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nw-family-premium-"));
fs.mkdirSync(path.join(dir,"assets"),{recursive:true});
fs.writeFileSync(path.join(dir,"assets","family-owner-sponsored-access.js"),familySource);
fs.writeFileSync(path.join(dir,"direct.html"),directPage());

const server=spawn("python3",["-m","http.server",String(PORT),"--bind","127.0.0.1"],{cwd:dir,stdio:"ignore"});
const url=`http://127.0.0.1:${PORT}/direct.html`;
const assetUrl=`http://127.0.0.1:${PORT}/assets/family-owner-sponsored-access.js?v=family-premium-browser-smoke`;
const chromeArgs=[
  "--headless","--no-sandbox","--disable-gpu","--hide-scrollbars",
  "--window-size=1440,1000",
  "--virtual-time-budget=7000","--dump-dom",url
];

const report={
  frozenWebsiteSha:EXPECTED_SHA,
  siteRoot:SITE_ROOT,
  generatedAt:new Date().toISOString(),
  runner:{
    platform:process.platform,arch:process.arch,node:process.version,
    runnerOS:process.env.RUNNER_OS||null,runnerArch:process.env.RUNNER_ARCH||null,
    imageOS:process.env.ImageOS||null,imageVersion:process.env.ImageVersion||null,
    hostname:os.hostname(),cpus:os.cpus().length,totalMem:os.totalmem(),freeMemAtStart:os.freemem()
  },
  originalHarness:{
    serverCommand:["python3","-m","http.server","4199","--bind","127.0.0.1"],
    serverCwd:"temporary fixture directory",serverStdio:"ignore",
    readiness:"fetch(http://127.0.0.1:4199/direct.html), up to 50 x 100ms",
    chromeApi:"spawnSync",encoding:"utf8",timeoutMs:20000,maxBuffer:"not explicitly set",cwd:"not set",env:"not set",
    originalCaseOrder:["1440/direct","1440/activation","390/direct","390/activation"]
  },
  chromeExecutable:chrome,
  chromeVersion,
  chromeArgs,
  url,
  assetUrl,
  serverPid:server.pid,
  sourceScan,
  readiness:null,
  attempts:[],
  summary:null
};

try{
  report.readiness=await waitForServer(url);
  if(!report.readiness.ready)throw new Error("fixture server unavailable");

  for(let attempt=1;attempt<=ATTEMPTS;attempt++){
    const timestamp=new Date().toISOString();
    const beforeTarget=await httpProbe(url);
    const beforeAsset=await httpProbe(assetUrl);
    const chromeProcessesBefore=shell("pgrep -a -f '(google-chrome|chrome|chromium)' || true");
    const shmBefore=shell("df -B1 /dev/shm | tail -1");
    const memBefore={free:os.freemem(),loadavg:os.loadavg()};
    const started=process.hrtime.bigint();
    const r=spawnSync(chrome,chromeArgs,{encoding:"utf8",timeout:20000});
    const elapsedMs=Number(process.hrtime.bigint()-started)/1e6;
    const stdout=r.stdout||"";
    const stderr=r.stderr||"";
    const stdoutBytes=Buffer.byteLength(stdout,"utf8");
    const stderrBytes=Buffer.byteLength(stderr,"utf8");
    const markerPresent=stdout.includes(MARKER);
    const afterTarget=await httpProbe(url);
    const afterAsset=await httpProbe(assetUrl);
    const chromeProcessesAfter=shell("pgrep -a -f '(google-chrome|chrome|chromium)' || true");
    const shmAfter=shell("df -B1 /dev/shm | tail -1");
    const memAfter={free:os.freemem(),loadavg:os.loadavg()};
    const result={
      attempt,timestamp,chromeVersion,chromeExecutable:chrome,args:chromeArgs,url,serverPid:server.pid,
      serverReadiness:true,beforeTarget,beforeAsset,
      processStatus:r.status,processSignal:r.signal,processError:processError(r.error),
      stdoutBytes,stderrBytes,stderr,elapsedMs,markerPresent,
      afterTarget,afterAsset,chromeProcessesBefore,chromeProcessesAfter,shmBefore,shmAfter,memBefore,memAfter
    };
    report.attempts.push(result);
    console.log(JSON.stringify({attempt,status:r.status,signal:r.signal,stdoutBytes,stderrBytes,elapsedMs:Number(elapsedMs.toFixed(1)),markerPresent,beforeHTTP:beforeTarget.status,afterHTTP:afterTarget.status}));
  }
} finally {
  server.kill("SIGTERM");
  fs.rmSync(dir,{recursive:true,force:true});
}

const green=report.attempts.filter(a=>a.processStatus===0&&a.stdoutBytes>0&&a.markerPresent).length;
const empty=report.attempts.filter(a=>a.processStatus===0&&a.stdoutBytes===0).length;
const markerMissingNonempty=report.attempts.filter(a=>a.processStatus===0&&a.stdoutBytes>0&&!a.markerPresent).length;
const processFailures=report.attempts.filter(a=>a.processStatus!==0||a.processError).length;
report.summary={attempts:report.attempts.length,green,emptyStdout:empty,markerMissingNonempty,processFailures};

fs.writeFileSync(path.join(OUT_DIR,"family-browser-smoke-root-cause.json"),JSON.stringify(report,null,2));
const lines=[];
lines.push(`frozenWebsiteSha=${EXPECTED_SHA}`);
lines.push(`chromeExecutable=${chrome}`);
lines.push(`chromeVersion=${chromeVersion}`);
lines.push(`serverPid=${report.serverPid}`);
lines.push(`chromeCommand=${[chrome,...chromeArgs].join(" ")}`);
lines.push(`attempts=${report.summary.attempts} green=${green} emptyStdout=${empty} markerMissingNonempty=${markerMissingNonempty} processFailures=${processFailures}`);
for(const a of report.attempts){
  lines.push(`attempt=${a.attempt} timestamp=${a.timestamp} pre=${a.beforeTarget.status}/${a.beforeTarget.bodyBytes} preAsset=${a.beforeAsset.status}/${a.beforeAsset.bodyBytes} status=${a.processStatus} signal=${a.processSignal??"null"} error=${a.processError?.code??"null"} stdoutBytes=${a.stdoutBytes} stderrBytes=${a.stderrBytes} marker=${a.markerPresent} elapsedMs=${a.elapsedMs.toFixed(1)} post=${a.afterTarget.status}/${a.afterTarget.bodyBytes} postAsset=${a.afterAsset.status}/${a.afterAsset.bodyBytes}`);
  if(a.stderr)lines.push(`stderr[${a.attempt}]=${JSON.stringify(a.stderr)}`);
}
fs.writeFileSync(path.join(OUT_DIR,"family-browser-smoke-root-cause.log"),lines.join("\n")+"\n");
console.log("SUMMARY",report.summary);
