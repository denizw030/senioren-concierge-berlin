(() => {
  "use strict";
  if(window.STEWAROEntryRouting)return;
  const ACCOUNT_ORIGIN="https://account.stewaro.com";
  const PARENT_ORIGIN="https://myparentguard.com";
  const host=String(location.hostname||"").toLowerCase();
  const isStewaroPublic=host==="stewaro.com"||host==="www.stewaro.com"||host==="stewaro.de"||host==="www.stewaro.de";
  const isAccount=host==="account.stewaro.com";
  const accountEntry=isAccount?"/":(isStewaroPublic?ACCOUNT_ORIGIN+"/":"/zugang");
  const parentEntry=PARENT_ORIGIN+"/?source=stewaro";
  const isAccountSurface=/(?:^|\/)(?:zugang|anmelden|registrieren)(?:\.html)?\/?$/.test(location.pathname);

  const rewrite=()=>{
    document.querySelectorAll('a[data-entry="self"]').forEach(a=>a.href=accountEntry);
    document.querySelectorAll('a[data-entry="loved-one"]').forEach(a=>a.href=parentEntry);
    document.querySelectorAll('a.auth-link.login-link,a.auth-link.register-link').forEach(a=>a.href=accountEntry);
    if(!isAccountSurface){
      document.querySelectorAll('a[href^="/anmelden"],a[href^="/registrieren"]').forEach(a=>a.href=accountEntry);
    }
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",rewrite,{once:true});else rewrite();
  new MutationObserver(rewrite).observe(document.documentElement,{subtree:true,childList:true});
  window.STEWAROEntryRouting={accountEntry,parentEntry};
})();
