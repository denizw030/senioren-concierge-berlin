(() => {
  "use strict";
  if(window.STEWAROEntryRouting)return;
  if(typeof document.querySelector==="function"&&!document.querySelector('script[data-stewaro-domain-contract]')&&!window.STEWARO_DOMAINS){
    const domainScript=document.createElement("script");
    domainScript.src="/assets/stewaro-domain-contract.js?v=1";
    domainScript.dataset.stewaroDomainContract="1";
    document.head.appendChild(domainScript);
  }
  const host=String(location.hostname||"").toLowerCase();
  const STAGING_WEBSITE_HOST="d357yw2h09cpne.cloudfront.net";
  const STAGING_ACCOUNT_ORIGIN="https://d23le2tjpi7la.cloudfront.net";
  const STAGING_ACCOUNT_HOST="d23le2tjpi7la.cloudfront.net";
  const PROD_ACCOUNT_ORIGIN="https://account.stewaro.com";
  const isWebsitePreview=host===STAGING_WEBSITE_HOST;
  const isAccount=host==="account.stewaro.com"||host===STAGING_ACCOUNT_HOST;
  const accountEntry=isAccount?"/":(isWebsitePreview?STAGING_ACCOUNT_ORIGIN+"/":PROD_ACCOUNT_ORIGIN+"/");
  const parentEntry="/angehoerige?source=stewaro";
  const isAccountSurface=/(?:^|\/)(?:zugang|anmelden|registrieren)(?:\.html)?\/?$/.test(location.pathname);

  const installGermanHomeMenu=()=>{
    const lang=String(document.documentElement.lang||"").toLowerCase();
    const isGermanHome=lang==="de"&&/^\/de(?:\/|\/index\.html)?$/.test(location.pathname);
    if(!isGermanHome||document.documentElement.dataset.stewaroHomeMenu==="1")return;
    const header=document.querySelector(".site-header");
    const headerInner=header?.querySelector(".header-inner");
    const nav=header?.querySelector(".header-nav");
    const cta=nav?.querySelector(".header-cta");
    if(!header||!headerInner||!nav||!cta)return;
    document.documentElement.dataset.stewaroHomeMenu="1";

    const style=document.createElement("style");
    style.id="stewaro-home-mobile-menu-v1";
    style.textContent=`
      .header-login-runtime{font-weight:520;color:#24312b}
      .header-menu-toggle-runtime{display:none;width:42px;height:42px;padding:0;border:1px solid rgba(98,82,57,.16);border-radius:50%;background:rgba(255,255,255,.56);color:#1b241f;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer;box-shadow:0 7px 22px rgba(59,49,34,.045);-webkit-tap-highlight-color:transparent}
      .header-menu-toggle-runtime span{display:block;width:16px;height:1.5px;border-radius:2px;background:currentColor;transition:transform 180ms ease,opacity 150ms ease}
      .header-menu-toggle-runtime.is-open span:nth-child(1){transform:translateY(5.5px) rotate(45deg)}
      .header-menu-toggle-runtime.is-open span:nth-child(2){opacity:0}
      .header-menu-toggle-runtime.is-open span:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}
      .mobile-menu-runtime{position:absolute;top:100%;left:0;right:0;padding:10px 14px 18px;background:rgba(249,247,241,.985);border-top:1px solid rgba(157,131,88,.10);border-bottom:1px solid rgba(157,131,88,.16);box-shadow:0 28px 60px rgba(37,31,23,.11);backdrop-filter:blur(22px) saturate(1.06);-webkit-backdrop-filter:blur(22px) saturate(1.06)}
      .mobile-menu-runtime[hidden]{display:none!important}
      .mobile-menu-runtime nav{width:min(100%,900px);margin:0 auto;display:grid}
      .mobile-menu-runtime a{display:flex;align-items:center;justify-content:space-between;min-height:54px;padding:0 9px;color:#2b332f;border-bottom:1px solid rgba(76,65,48,.09);font-size:15px;letter-spacing:-.01em}
      .mobile-menu-runtime a:last-child{border-bottom:0}
      .mobile-menu-runtime a::after{content:"›";font-size:23px;font-weight:300;line-height:1;color:rgba(99,78,45,.54)}
      .mobile-menu-runtime .mobile-menu-login-runtime{min-height:68px;margin-bottom:5px;padding:0 14px;border:1px solid rgba(141,109,57,.18);border-radius:14px;background:rgba(255,255,255,.58)}
      .mobile-menu-login-runtime>span{font-weight:600;color:#17231d}
      .mobile-menu-login-runtime>small{margin-left:auto;margin-right:14px;color:#756c60;font-size:12px;font-weight:400}
      @media(max-width:980px){
        .site-header{overflow:visible}
        .header-inner{gap:12px}
        .header-nav{gap:8px;margin-left:auto}
        .header-menu-toggle-runtime{display:inline-flex;flex:0 0 42px}
      }
      @media(max-width:600px){
        .header-inner{width:calc(100% - 20px);gap:8px}
        .header-nav{gap:6px}
        .header-cta{padding:9px 11px;font-size:12.5px}
        .header-menu-toggle-runtime{width:40px;height:40px;flex-basis:40px}
        .brand-lockup{gap:9px}
        .brand-icon{width:32px;height:32px}
        .brand-word{width:112px;height:18px;flex-basis:112px}
        .mobile-menu-runtime{padding-left:10px;padding-right:10px}
        .mobile-menu-login-runtime>small{display:none}
      }
    `;
    document.head.appendChild(style);

    const login=document.createElement("a");
    login.className="header-login-runtime";
    login.href=isWebsitePreview?STAGING_ACCOUNT_ORIGIN+"/anmelden":PROD_ACCOUNT_ORIGIN+"/anmelden";
    login.dataset.directLogin="true";
    login.textContent="Anmelden";
    nav.insertBefore(login,cta);

    const toggle=document.createElement("button");
    toggle.className="header-menu-toggle-runtime";
    toggle.type="button";
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-controls","stewaro-mobile-menu-runtime");
    toggle.setAttribute("aria-label","Menü öffnen");
    toggle.innerHTML="<span></span><span></span><span></span>";
    nav.appendChild(toggle);

    const menu=document.createElement("div");
    menu.className="mobile-menu-runtime";
    menu.id="stewaro-mobile-menu-runtime";
    menu.hidden=true;
    menu.innerHTML=`<nav aria-label="Mobile Navigation">
      <a class="mobile-menu-login-runtime" href="${isWebsitePreview?STAGING_ACCOUNT_ORIGIN:PROD_ACCOUNT_ORIGIN}/anmelden" data-direct-login="true"><span>Anmelden</span><small>Für bestehende Klienten</small></a>
      <a href="/de/">Startseite</a>
      <a href="/prime-concierge">Concierge</a>
      <a href="/angehoerige">Für Angehörige</a>
      <a href="/digitaler-schutz">Digitaler Schutz</a>
      <a href="/telefonannahme">Telefon</a>
      <a href="/pakete">Preise</a>
      <a href="/kontakt">Kontakt</a>
    </nav>`;
    header.appendChild(menu);

    const setOpen=(open)=>{
      const next=Boolean(open);
      menu.hidden=!next;
      toggle.classList.toggle("is-open",next);
      toggle.setAttribute("aria-expanded",String(next));
      toggle.setAttribute("aria-label",next?"Menü schließen":"Menü öffnen");
    };
    toggle.addEventListener("click",(event)=>{
      event.stopPropagation();
      setOpen(toggle.getAttribute("aria-expanded")!=="true");
    });
    menu.addEventListener("click",(event)=>{
      if(event.target.closest("a"))setOpen(false);
    });
    document.addEventListener("click",(event)=>{
      if(!menu.hidden&&!event.target.closest(".site-header"))setOpen(false);
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="Escape"&&!menu.hidden){setOpen(false);toggle.focus();}
    });
    window.addEventListener("resize",()=>{if(window.innerWidth>980)setOpen(false);},{passive:true});
  };

  const rewrite=()=>{
    installGermanHomeMenu();
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
      document.querySelectorAll('a[href^="/anmelden"],a[href^="/registrieren"]').forEach(a=>{if(!a.hasAttribute("data-direct-login")&&!a.hasAttribute("data-direct-registration"))a.href=accountEntry;});
    }
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",rewrite,{once:true});else rewrite();
  new MutationObserver(rewrite).observe(document.documentElement,{subtree:true,childList:true});
  window.STEWAROEntryRouting={accountEntry,parentEntry};
})();

