// STEWARO deployment forensics: anonymous read-only live asset hashes versus the exact checked-out candidate.
// This job intentionally does not fail for not-yet-deployed candidate bytes; differences are release blockers,
// NOT build failures. Never fetch cookies, session state or paid/client endpoints.
import { readFile, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import process from "node:process";

const assets = [
  {name:"Account domain contract", host:"account.stewaro.com", path:"assets/stewaro-domain-contract.js"},
  {name:"Account navigation", host:"account.stewaro.com", path:"assets/stewaro-account-app-navigation.js"},
  {name:"Account shared auth", host:"account.stewaro.com", path:"assets/auth-nav.js"},
  {name:"FIDEL App bootstrap", host:"app.stewaro.com", path:"assets/stewaro-app-bootstrap.js"},
  {name:"FIDEL App shell", host:"app.stewaro.com", path:"assets/stewaro-app-shell.js"}
];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const candidate = process.env.GITHUB_SHA?.slice(0,12) || "local-checkout";
async function inspect(asset){
  const local = await readFile(asset.path);
  const url = "https://" + asset.host + "/" + asset.path;
  try {
    const response = await fetch(url,{
      method:"GET", redirect:"follow", cache:"no-store",
      headers:{"Accept":"text/javascript,application/javascript,*/*;q=0.8","User-Agent":"STEWARO-Asset-Parity-ReadOnly/1.0"},
      signal:AbortSignal.timeout(15000)
    });
    const final = new URL(response.url);
    const live = Buffer.from(await response.arrayBuffer());
    const textStart = live.subarray(0,512).toString("utf8");
    const javascript = !/^\s*<!doctype html|^\s*<html[\s>]/i.test(textStart);
    const hostnameOk = final.hostname===asset.host;
    const deployedMatch = response.ok && javascript && hostnameOk && digest(live)===digest(local);
    return {name:asset.name,sourcePath:asset.path,code:response.status,final:final.origin+final.pathname,
      javascript,hostnameOk,deployedMatch,sourceSha256:digest(local),liveSha256:digest(live)};
  } catch(error){
    return {name:asset.name,sourcePath:asset.path,deployedMatch:false,
      error:String(error?.cause?.code||error?.name||error)};
  }
}
const results=await Promise.all(assets.map(inspect));
for(const item of results)console.log("STEWARO_ASSET_PARITY "+JSON.stringify(item));
const matches=results.filter(x=>x.deployedMatch).length;
const all=matches===results.length;
console.log("STEWARO_EXACT_SOURCE_ARTIFACT_PARITY="+matches+"/"+results.length);
console.log("STEWARO_PRODUCTION_CANDIDATE_DEPLOYED="+all);
console.log("STEWARO_AUTHENTICATED_CLIENT_E2E_PROVEN=false");
const body=[
  "### STEWARO candidate → Production asset parity (read-only, information only)",
  "", "Checked-out PR candidate: `"+candidate+"` (not proof of a deployment).", "",
  "| Asset | HTTP | Exact bytes in Production? |","|---|---|---|",
  ...results.map(x=>"| "+x.name+" | "+(x.code??x.error??"—")+" | "+(x.deployedMatch?"YES":"NO")+" |"),
  "", "**Exact candidate matches "+matches+"/"+results.length+".**",
  "**Release gate:** "+(all?"Asset comparison matches; authenticated Safari session E2E and deployment provenance still mandatory.":"NOT READY — Production differs from candidate, or asset missing/unavailable."),
  "", "No credentials, authenticated API calls, upload, DNS, or deployment writes."
];
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,body.join("\n")+"\n");
// In a pre-deploy PR, mismatches are expected and deliberately non-fatal.
// Actual release must separately check 100% matches AND authenticated session E2E.
if(results.length!==5)process.exitCode=1;
