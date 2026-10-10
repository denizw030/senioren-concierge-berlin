#!/usr/bin/env node
// Immutable source-pinned Account/App REVIEW artifact. NOT a deployable site or AWS release.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";

const SOURCE=resolve(".");
const FILES=Object.freeze([
  ["account","zugang.html","account/index.html"],
  ["account","anmelden/index.html","account/anmelden/index.html"],
  ["account","konto/index.html","account/konto/index.html"],
  ["account","assets/stewaro-domain-contract.js","account/assets/stewaro-domain-contract.js"],
  ["account","assets/stewaro-account-app-navigation.js","account/assets/stewaro-account-app-navigation.js"],
  ["account","assets/auth-nav.js","account/assets/auth-nav.js"],
  ["app","web-concierge/index.html","app/index.html"],
  ["app","web-concierge/index.html","app/web-concierge/index.html"],
  ["app","assets/stewaro-app-bootstrap.js","app/assets/stewaro-app-bootstrap.js"],
  ["app","assets/stewaro-app-shell.js","app/assets/stewaro-app-shell.js"]
]);
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const isSHA=value=>/^[0-9a-f]{40}$/.test(value||"");
function envPins(){
  const candidate=process.env.STEWARO_CANDIDATE_SHA;
  const baseline=process.env.STEWARO_BASE_SHA;
  if(!isSHA(candidate)||!isSHA(baseline)||candidate===baseline){
    throw Error("explicit distinct full candidate/base SHA pins required");
  }
  const checkedOut=execFileSync("git",["rev-parse","--verify","HEAD"],{cwd:SOURCE,encoding:"utf8"}).trim();
  if(candidate!==checkedOut)throw Error("candidate SHA does not match checked-out Git HEAD");
  return {candidate,baseline};
}
async function checkedBytes(source){
  const path=resolve(SOURCE,source);
  const rel=relative(SOURCE,path);
  if(rel.startsWith("..")||rel===".."||rel.startsWith("/")||rel.startsWith("\\")||!rel)throw Error("unsafe path");
  const stat=await lstat(path);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error("source must be a regular file: "+source);
  const bytes=await readFile(path);
  const committed=execFileSync("git",["show","HEAD:"+source],{cwd:SOURCE,maxBuffer:32*1024*1024});
  if(!bytes.equals(committed))throw Error("source bytes differ from pinned Git HEAD: "+source);
  return bytes;
}
async function expectedManifest(){
  const {candidate,baseline}=envPins();
  const files=[];
  for(const [surface,source,target] of FILES){
    const bytes=await checkedBytes(source);
    files.push({surface,source,target,sha256:sha256(bytes),bytes:bytes.length});
  }
  const html={
    "zugang.html":["/assets/stewaro-domain-contract.js"],
    "anmelden/index.html":["/assets/stewaro-domain-contract.js"],
    "konto/index.html":["/assets/stewaro-domain-contract.js"],
    "web-concierge/index.html":["/assets/stewaro-app-bootstrap.js"]
  };
  for(const [source,scripts] of Object.entries(html)){
    const text=(await checkedBytes(source)).toString("utf8");
    for(const script of scripts) if(!text.includes(script))throw Error("missing protected script in "+source+": "+script);
  }
  return {
    schema:1,
    artifact_kind:"STEWARO_ACCOUNT_APP_SOURCE_PINNED_REVIEW_ONLY",
    production_deployed:false,
    aws_staging_deployed:false,
    authenticated_safari_e2e_proven:false,
    complete_website_artifact:false,
    candidate_website_sha:candidate,
    baseline_website_sha:baseline,
    public_site_untouched:true,
    domains:{account:"account.stewaro.com",app:"app.stewaro.com"},
    release_gate:"HOLD_UNTIL_5_OF_5_LIVE_BYTES_AND_AUTHENTICATED_E2E_AND_ROLLBACK",
    rollback_required:["record previous S3 object versions or verified complete bucket snapshots","record previous CloudFront provenance and distribution IDs","stage rollback with exact previous bytes","prove post-rollback service health without invalidating Klient sessions"],
    files
  };
}
function sameJson(a,b){return JSON.stringify(a)===JSON.stringify(b);}
async function build(out){
  // No AWS creds, DNS calls, HTTP requests, release actions or user data here.
  await mkdir(out,{recursive:false});
  const manifest=await expectedManifest();
  for(const item of manifest.files){
    const dest=join(out,item.target);
    await mkdir(dirname(dest),{recursive:true});
    await copyFile(resolve(SOURCE,item.source),dest);
  }
  await writeFile(join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log("STEWARO_REVIEW_ARTIFACT_FILES="+manifest.files.length);
  console.log("STEWARO_REVIEW_ARTIFACT_SOURCE_SHA="+manifest.candidate_website_sha);
  console.log("STEWARO_AWS_STAGING_DEPLOYED=false");
  console.log("STEWARO_PRODUCTION_DEPLOYED=false");
}
async function verify(out){
  const expected=await expectedManifest();
  const manifest=JSON.parse(await readFile(join(out,"manifest.json"),"utf8"));
  if(!sameJson(manifest,expected))throw Error("manifest differs from pinned source");
  for(const item of expected.files){
    const dest=resolve(out,item.target);
    if(!relative(out,dest)||relative(out,dest).startsWith(".."))throw Error("unsafe destination");
    const stat=await lstat(dest);
    if(!stat.isFile()||stat.isSymbolicLink())throw Error("invalid staged asset");
    const actual=sha256(await readFile(dest));
    if(actual!==item.sha256)throw Error("staged SHA mismatch: "+item.target);
  }
  console.log("STEWARO_REVIEW_ARTIFACT_VERIFIED="+expected.files.length+"/"+expected.files.length);
  console.log("STEWARO_PRODUCTION_RELEASE_GATE=HOLD");
}
const [mode,directory]=process.argv.slice(2);
if(!["build","verify"].includes(mode)||!directory)throw Error("usage: node script build|verify <new-or-existing-output-dir>");
const out=resolve(directory);
if(out===SOURCE||SOURCE.startsWith(out+"/"))throw Error("refuse writing into source root ancestor");
if(mode==="build")await build(out);else await verify(out);
