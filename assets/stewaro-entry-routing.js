(() => {
  "use strict";
  if(window.STEWAROEntryRouting)return;
  const PARENT_ORIGIN="https://myparentguard.com";
  const host=String(location.hostname||"").toLowerCase();
  const STAGING_WEBSITE_HOST="d357yw2h09cpne.cloudfront.net";
  const STAGING_ACCOUNT_ORIGIN="https://d23le2tjpjl7la.cloudfront.net";
  const STAGING_ACCOUNT_HOST="d23le2tjpjl7la.cloudfront.net";
  const isWebsitePreview=host===STAGING_WEBSITE_HOST;
  const isAccount=host==="account.stewaro.com"||host===STAGING_ACCOUNT_HOST;
  // Keep the public website on its working same-origin access route until
  // account.stewaro.com has a verified public DNS/CloudFront cutover.
  const accountEntry=isAccount?"/":(isWebsitePreview?STAGING_ACCOUNT_ORIGIN+"/":"/zugang");
  const parentEntry=PARENT_ORIGIN+"/?source=stewaro";
  const isAccountSurface=/(?:^|\/)(?:zugang|anmelden|registrieren)(?:\.html)?\/?$/.test(location.pathname);

  const rewrite=()=>{
    // A root <base> is needed for shared assets, but it also sends fragment links
    // to the homepage. Pin same-document anchors to the current document.
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      const fragment=a.getAttribute("href");
      if(fragment)a.setAttribute("href",location.pathname+location.search+fragment);
    });
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

