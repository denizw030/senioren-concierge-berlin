import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const script=html.match(/<script>([\\s\\S]*?)<\\/script>/)?.[1];

test("root app routing is exact-host-only",()=>{
 assert.ok(script);
 for(const [host,expected] of [
  ["app.stewaro.com","/web-concierge"],
  ["stewaro.com","/de/"],
  ["app.stewaro.com.attacker.invalid","/de/"],
  ["account.stewaro.com","/de/"]
 ]){
  const calls=[];
  vm.runInNewContext(script,{window:{location:{hostname:host,search:"",hash:"",replace:url=>calls.push(url)}}});
  assert.deepEqual(calls,[expected]);
 }
});
test("root redirect cannot index and no-script fallback leaves app host",()=>{
 assert.match(html,/<meta name="robots" content="noindex,follow">/);
 assert.match(html,/<a href="https:\\/\\/stewaro\\.com\\/de\\/">/);
 assert.doesNotMatch(html,/<a href="\\/de\\/">/);
});
