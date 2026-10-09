import assert from "node:assert/strict";
const ORIGIN="https://stewaro.com";
for(const path of ["/anmelden","/anmelden/","/anmelden.html","/registrieren","/telefonate/ausgehend/"]){
 const res=await fetch(ORIGIN+path,{redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(12000)});
 const html=await res.text();
 const found={
   login_form:html.includes('id="loginForm"'),
   signup_form:html.includes('id="signupForm"'),
   login_script:html.includes("stewaro-csp-anmelden-script-1.js"),
   onboarding_text:html.includes("Für wen ist STEWARO gedacht?"),
   outgoing_page:html.includes("Ausgehende Anrufe")
 };
 console.log("LIVE_ENTRY_ROUTE "+JSON.stringify({path,status:res.status,final:new URL(res.url).pathname,found}));
 assert.equal(res.status,200,"HTTP route must work");
 if(path.startsWith("/anmelden"))assert.ok(found.login_form&&!found.signup_form,"Existing user login must not be replaced by registration");
}
console.log("LIVE_EXISTING_CLIENT_LOGIN_ROUTE=GREEN");
