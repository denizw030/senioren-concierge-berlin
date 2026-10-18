// Read-only public source probe. No login, tokens, cookies, requests with side effects or production changes.
import process from "node:process";
import { appendFile } from "node:fs/promises";

const targets = [
  { name:"STEWARO public homepage", url:"https://stewaro.com/de/", hostname:"stewaro.com", marker:/STEWARO/i },
  { name:"Account root handoff entry", url:"https://account.stewaro.com/", hostname:"account.stewaro.com", marker:/STEWARO/i },
  { name:"Account sign-in", url:"https://account.stewaro.com/anmelden", hostname:"account.stewaro.com", marker:/loginForm|STEWARO/i },
  { name:"Account portal", url:"https://account.stewaro.com/konto", hostname:"account.stewaro.com", marker:/auth-nav\.js|account-premium-ui|STEWARO/i },
  { name:"FIDEL App root handoff entry", url:"https://app.stewaro.com/", hostname:"app.stewaro.com", marker:/STEWARO/i },
  { name:"FIDEL App", url:"https://app.stewaro.com/web-concierge", hostname:"app.stewaro.com", marker:/stewaro-app-bootstrap\.js|stewaroAppShell|web-concierge/i },
  { name:"FIDEL bootstrap asset", url:"https://app.stewaro.com/assets/stewaro-app-bootstrap.js", hostname:"app.stewaro.com", marker:/APP_HOST|app\.stewaro\.com/i }
];

async function probe(target) {
  try {
    const response = await fetch(target.url, {
      method:"GET", redirect:"follow", cache:"no-store",
      headers:{"Accept":"text/html,application/javascript;q=0.9,*/*;q=0.8", "User-Agent":"STEWARO-Account-App-Anonymous-ReadOnly-Probe/1.0"},
      signal:AbortSignal.timeout(15000)
    });
    const final = new URL(response.url);
    const text = await response.text();
    const expectedHost = final.hostname===target.hostname;
    const expectedBody = target.marker.test(text);
    const isHtml = !target.name.includes("asset");
    const kindOk = isHtml ? /<!doctype html|<html[\\s>]/i.test(text) : !/<html[\\s>]/i.test(text);
    const safeTitle = (text.match(/<title[^>]*>([^<]{0,100})/i)?.[1] || "").trim();
    const rootDiagnostics = target.name==="Account root handoff entry"
      ? { title:safeTitle, hasAccountClaimScript:text.includes("stewaro-domain-contract.js"), hasAccountEntryMarkup:text.includes("stewaro-access-page")||text.includes("loginForm"), genericHomeRedirect:text.includes('window.location.replace("/de/"') }
      : target.name==="FIDEL App root handoff entry"
        ? { title:safeTitle, hasAppBootstrap:text.includes("stewaro-app-bootstrap.js"), hasFidelAppShell:text.includes("stewaroAppShell")||text.includes("web-concierge-page"), forwardsFragmentToChat:text.includes("window.location.hash")&&text.includes("/web-concierge") }
        : {};
    const ok = response.ok && expectedHost && expectedBody && kindOk;
    return {name:target.name, code:response.status, final:final.origin+final.pathname,
      expectedHost, expectedBody, expectedType:kindOk, passed:ok, ...rootDiagnostics};
  } catch (error) {
    return {name:target.name, passed:false, error:String(error?.cause?.code||error?.name||error)};
  }
}

const results = await Promise.all(targets.map(probe));
for (const result of results) console.log(JSON.stringify(result));
const pass = results.filter(x=>x.passed).length;
console.log("ANONYMOUS_STEWARO_PUBLIC_ROUTE_READONLY_GREEN=" + pass + "/" + results.length);
if(process.env.GITHUB_STEP_SUMMARY){
  const lines=["### STEWARO account/app public read-only route smoke", "",
    "| Endpoint | HTTP | Final origin/path | Status |","|---|---|---|---|",
    ...results.map(x=>"| "+x.name+" | "+(x.code??"—")+" | "+(x.final??x.error??"—")+" | "+(x.passed?"PASS":"FAIL")+" |"),
    "", "Only anonymous public GET checks. Authenticated account→app handoff, task/chat data, and deployed-source parity **not proven**."];
  await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join("\n")+"\n");
}
if(pass!==results.length)process.exitCode=1;
