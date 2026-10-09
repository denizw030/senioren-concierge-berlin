import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT=resolve("scripts/stewaro-account-app-stage-review.mjs");
const candidate="a".repeat(40),baseline="b".repeat(40);
function run(mode,path,{sha=candidate,base=baseline}={}){
  return spawnSync(process.execPath,[SCRIPT,mode,path],{
    cwd:resolve("."),encoding:"utf8",
    env:{...process.env,STEWARO_CANDIDATE_SHA:sha,STEWARO_BASE_SHA:base}
  });
}
test("review artifact is pinned, isolated, and verifiable; never claims AWS or PROD deployment",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"stewaro-account-review-")),out=join(dir,"review");
  try{
    const result=run("build",out);
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/STEWARO_AWS_STAGING_DEPLOYED=false/);
    const manifest=JSON.parse(await readFile(join(out,"manifest.json"),"utf8"));
    assert.equal(manifest.candidate_website_sha,candidate);
    assert.equal(manifest.baseline_website_sha,baseline);
    assert.equal(manifest.production_deployed,false);
    assert.equal(manifest.aws_staging_deployed,false);
    assert.equal(manifest.authenticated_safari_e2e_proven,false);
    assert.equal(manifest.complete_website_artifact,false);
    assert.match(manifest.release_gate,/HOLD/);
    assert.equal(manifest.files.length,10);
    assert.deepEqual(manifest.files.filter(x=>x.source.startsWith("assets/")).map(x=>x.source).sort(),
      ["assets/auth-nav.js","assets/stewaro-account-app-navigation.js","assets/stewaro-app-bootstrap.js",
        "assets/stewaro-app-shell.js","assets/stewaro-domain-contract.js"].sort());
    const verify=run("verify",out);
    assert.equal(verify.status,0,verify.stderr);
    assert.match(verify.stdout,/STEWARO_REVIEW_ARTIFACT_VERIFIED=10\/10/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test("tampered artifact cannot pass source parity",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"stewaro-account-review-")),out=join(dir,"review");
  try{
    assert.equal(run("build",out).status,0);
    await writeFile(join(out,"app/assets/stewaro-app-shell.js"),"changed", "utf8");
    const result=run("verify",out);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/staged SHA mismatch/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test("wrong or identical source pins and unsafe artifact root fail closed",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"stewaro-account-review-"));
  try{
    for(const cfg of [{sha:"invalid"},{sha:candidate,base:candidate}]){
      const result=run("build",join(dir,"review-"+(cfg.sha==="invalid"?"bad":"equal")),cfg);
      assert.notEqual(result.status,0);
      assert.match(result.stderr,/SHA pins required/);
    }
    const result=run("build",resolve("."));
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/refuse writing into source root ancestor/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
