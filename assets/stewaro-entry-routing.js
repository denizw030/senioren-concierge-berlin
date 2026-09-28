(() => {
  "use strict";
  if(window.STEWAROEntryRouting)return;
  const ACCOUNT_ORIGIN="https://account.stewaro.com";
  const PARENT_ORIGIN="https://myparentguard.com";
  const host=String(location.hostname||"").toLowerCase();
  const STAGING_WEBSITE_HOST="d357yw2h09cpne.cloudfront.net";
  const STAGING_ACCOUNT_ORIGIN="https://d23le2tjpjl7la.cloudfront.net";
  const STAGING_ACCOUNT_HOST="d23le2tjpjl7la.cloudfront.net";
  const isStewaroPublic=host==="stewaro.com"||host==="www.stewaro.com"||host==="stewaro.de"||host==="www.stewaro.de";
  const isWebsitePreview=host===STAGING_WEBSITE_HOST;
  const isAccount=host==="account.stewaro.com"||host===STAGING_ACCOUNT_HOST;
  const accountEntry=isAccount?"/":(isWebsitePreview?STAGING_ACCOUNT_ORIGIN+"/":(isStewaroPublic?ACCOUNT_ORIGIN+"/":"/zugang"));
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
