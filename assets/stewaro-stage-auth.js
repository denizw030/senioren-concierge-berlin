(() => {
  "use strict";
  // STAGING ONLY: Supabase Auth against the pre-existing isolated TEST project.
  // This grants no access to PROD, Concierge Core, live calls or paid actions.
  if(location.hostname!=="d2h3bbcracss71.cloudfront.net")return;
  const STAGE="https://btqklftjmwtqqqdmwlnk.supabase.co";
  const PUBLISHABLE="sb_publishable_onbKIoe0eb9hgsYC2UeYzw_qttxclvj";
  const STORE="stewaro_stage_auth_session_v1";
  const MAX_AGE=3600;
  const headers={"apikey":PUBLISHABLE,"content-type":"application/json"};
  const status=document.getElementById("webConciergeStatus");
  const log=document.getElementById("webConciergeLog");
  if(!log)return;
  const box=document.createElement("section");
  box.className="stewaro-stage-auth";
  box.setAttribute("aria-label","STAGING-Testanmeldung");
  box.innerHTML=\`
    <div class="stewaro-stage-auth__eyebrow">GESCHÜTZTE TESTUMGEBUNG</div>
    <h3>STEWARO Test-Anmeldung</h3>
    <p>Nur mit einem separaten STAGING-Konto anmelden. Verwende hier nicht dein echtes STEWARO-Passwort.</p>
    <form id="stewaroStageAuthForm" autocomplete="on">
      <label for="stewaroStageEmail">E-Mail</label>
      <input type="email" id="stewaroStageEmail" autocomplete="username" required maxlength="254">
      <label for="stewaroStagePassword">STAGING-Passwort</label>
      <input type="password" id="stewaroStagePassword" autocomplete="current-password" required minlength="8" maxlength="256">
      <button id="stewaroStageLogin" type="submit">Test-Anmeldung prüfen</button>
      <button id="stewaroStageSignUp" type="button">Neues STAGING-Testkonto erstellen</button>
    </form>
    <p id="stewaroStageResult" role="status" aria-live="polite">Keine echte Nachricht oder Anruf möglich.</p>
    <button id="stewaroStageLogout" type="button" hidden>Test-Anmeldung beenden</button>
    <small>Testsystem getrennt von PROD · Sprachgespräche noch gesperrt.</small>
  \`;
  log.replaceChildren(box);
  const form=box.querySelector("#stewaroStageAuthForm");
  const email=box.querySelector("#stewaroStageEmail");
  const password=box.querySelector("#stewaroStagePassword");
  const outcome=box.querySelector("#stewaroStageResult");
  const login=box.querySelector("#stewaroStageLogin");
  const signup=box.querySelector("#stewaroStageSignUp");
  const logout=box.querySelector("#stewaroStageLogout");
  const report=t=>{outcome.textContent=t;};
  const allowUI=enabled=>{login.disabled=!enabled;signup.disabled=!enabled;};
  const save=token=>{
    // Tab-local session only; never cache email or password.
    sessionStorage.setItem(STORE,JSON.stringify({token,created:Date.now()}));
  };
  const clear=()=>{sessionStorage.removeItem(STORE);};
  const getToken=()=>{
    try{
      const j=JSON.parse(sessionStorage.getItem(STORE)||"null");
      if(j?.token&&Date.now()-j.created<MAX_AGE*1000)return j.token;
    }catch{}
    clear();return "";
  };
  const auth=async(path,init={})=>{
    const response=await fetch(STAGE+"/auth/v1/"+path,{
      cache:"no-store",credentials:"omit",...init,
      headers:{...headers,...(init.headers||{})}
    });
    const body=await response.json().catch(()=>({}));
    return {response,body};
  };
  async function sessionCheck(token){
    if(!token)return false;
    const {response,body}=await auth("user",{headers:{Authorization:"Bearer "+token}});
    return response.ok&&typeof body?.id==="string"&&body.id.length>0;
  }
  const success=()=>{report("STAGING-Anmeldung bestätigt. FIDEL-Sprachgespräche sind noch gesperrt.");
    if(status)status.textContent="STAGING · Anmeldung geprüft · Gespräche gesperrt";
    form.hidden=true;logout.hidden=false;};
  async function useToken(token){
    if(await sessionCheck(token)){save(token);success();return true;}
    clear();return false;
  }
  form.addEventListener("submit",async e=>{
    e.preventDefault();allowUI(false);report("STAGING-Anmeldung wird geprüft …");
    try{
      const {response,body}=await auth("token?grant_type=password",{
        method:"POST",body:JSON.stringify({email:email.value.trim(),password:password.value})
      });
      password.value="";
      if(!response.ok||!body?.access_token||!(await useToken(body.access_token)))
        report("STAGING-Anmeldung fehlgeschlagen. Bitte nur dein Testkonto verwenden.");
    }catch{password.value="";report("Test-Anmeldung derzeit nicht erreichbar.");}
    finally{allowUI(true);}
  });
  signup.addEventListener("click",async()=>{
    if(!form.reportValidity())return;
    allowUI(false);report("STAGING-Konto wird angelegt …");
    try{
      const {response,body}=await auth("signup",{
        method:"POST",body:JSON.stringify({email:email.value.trim(),password:password.value})
      });
      password.value="";
      if(response.ok&&body?.access_token&&await useToken(body.access_token))return;
      report(response.ok
        ?"Falls das Testkonto erstellt wurde, bestätige bitte die E-Mail und melde dich anschließend an."
        :"STAGING-Registrierung nicht möglich. Ein vorhandenes Testkonto verwenden.");
    }catch{password.value="";report("STAGING-Registrierung nicht erreichbar.");}
    finally{allowUI(true);}
  });
  logout.addEventListener("click",()=>{clear();form.hidden=false;logout.hidden=true;
    report("Test-Anmeldung beendet.");if(status)status.textContent="STAGING · Test-Anmeldung möglich";});
  // On page refresh, an existing STAGING token is validated against STAGING Auth.
  // Never use canonical session storage, handoff tokens, PROD API or the Live gateway.
  const old=getToken();
  if(old){void useToken(old).catch(()=>{clear();report("Bitte erneut anmelden.");});}
  else if(status)status.textContent="STAGING · Test-Anmeldung möglich";
})();