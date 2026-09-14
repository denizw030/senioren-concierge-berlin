(() => {
  'use strict';

  const SUPPORTED = {
    de: { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
    en: { code: 'EN', label: 'English', flag: '🇬🇧' },
    tr: { code: 'TR', label: 'Türkçe', flag: '🇹🇷' }
  };
  const PAGES = new Set(['registrieren.html','anmelden.html','erster-schritt.html','passwort-zuruecksetzen.html','impressum.html','datenschutz.html','agb.html','widerruf.html','ki-transparenz.html','datenloeschung.html','vertrag-widerrufen.html']);

  const page = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  if (!PAGES.has(page)) return;

  const storedLang = () => {
    try {
      const value = localStorage.getItem('nw_language');
      return SUPPORTED[value] ? value : null;
    } catch (_) { return null; }
  };

  const detectLang = () => {
    const query = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED[query]) return query;
    const htmlLang = (document.documentElement.lang || '').toLowerCase().slice(0, 2);
    if (htmlLang === 'en' || htmlLang === 'tr') return htmlLang;
    return storedLang() || 'de';
  };

  const hrefFor = (targetLang) => {
    const url = new URL(location.href);
    if (targetLang === 'de') url.searchParams.delete('lang');
    else url.searchParams.set('lang', targetLang);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const injectStyles = () => {
    if (document.getElementById('nw-app-language-styles')) return;
    const style = document.createElement('style');
    style.id = 'nw-app-language-styles';
    style.textContent = `
      .nw-language{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;font:600 13px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;letter-spacing:.02em}
      .nw-language-button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:9px 12px;border:1px solid rgba(215,169,52,.34);border-radius:999px;background:rgba(8,8,8,.72);color:#f4f1e9;cursor:pointer;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:border-color .18s ease,background .18s ease,transform .18s ease}
      .nw-language-button:hover,.nw-language-button:focus-visible{border-color:rgba(239,188,63,.8);background:#11110f;outline:none}
      .nw-language-button:focus-visible{box-shadow:0 0 0 3px rgba(239,188,63,.22)}
      .nw-language-flag{font-size:17px;line-height:1}
      .nw-language-chevron{font-size:10px;opacity:.7;transition:transform .18s ease}
      .nw-language.is-open .nw-language-chevron{transform:rotate(180deg)}
      .nw-language-menu{position:absolute;z-index:220;top:calc(100% + 10px);right:0;display:none;min-width:190px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(11,11,10,.97);box-shadow:0 24px 60px rgba(0,0,0,.45);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
      .nw-language.is-open .nw-language-menu{display:grid;gap:3px}
      .nw-language-option{display:flex!important;align-items:center;gap:10px;width:100%;min-height:44px!important;padding:10px 12px!important;border:0!important;border-radius:9px!important;background:transparent!important;color:#eeeae0!important;text-decoration:none!important;white-space:nowrap;font:inherit;text-align:left;cursor:pointer}
      .nw-language-option:hover,.nw-language-option:focus-visible{background:rgba(255,255,255,.07)!important;color:#f2c45b!important;outline:none}
      .nw-language-option[aria-current="page"]{background:rgba(215,169,52,.1)!important;color:#f2c45b!important}
      .nw-language-option small{margin-left:auto;color:#8d8a82;font-size:11px;letter-spacing:.08em}
      @media (max-width:1280px){
        .top .nav{position:relative}
        .top .nav>.nw-language{display:inline-flex;position:absolute;z-index:130;margin:0!important;align-self:auto}
        .top .nav>.nw-language .nw-language-menu{top:calc(100% + 10px);right:0}
        .top .nav>.nw-language .nw-language-button{min-height:0;padding:0 10px;gap:6px}
        .links .nw-language{width:100%;display:block;padding:4px 8px}
        .links .nw-language-button{width:100%;justify-content:flex-start;border-radius:10px;min-height:48px;padding:12px 14px}
        .links .nw-language-chevron{margin-left:auto}
        .links .nw-language-menu{position:static;width:100%;margin-top:6px;box-shadow:none}
      }
    `;
    document.head.appendChild(style);
  };

  const createSwitcher = () => {
    const lang = detectLang();
    const current = SUPPORTED[lang] || SUPPORTED.de;
    const wrapper = document.createElement('div');
    wrapper.className = 'nw-language';
    wrapper.dataset.nwAppLanguageSwitcher = 'v2';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nw-language-button';
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', lang === 'tr' ? 'Dil seç' : lang === 'en' ? 'Choose language' : 'Sprache auswählen');
    button.innerHTML = `<span class="nw-language-flag" aria-hidden="true">${current.flag}</span><span>${current.code}</span><span class="nw-language-chevron" aria-hidden="true">⌄</span>`;

    const menu = document.createElement('div');
    menu.className = 'nw-language-menu';
    menu.setAttribute('role', 'menu');
    Object.entries(SUPPORTED).forEach(([key, item]) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'nw-language-option';
      option.dataset.nwLanguageTarget = key;
      option.lang = key;
      option.setAttribute('role', 'menuitem');
      if (key === lang) option.setAttribute('aria-current', 'page');
      option.innerHTML = `<span class="nw-language-flag" aria-hidden="true">${item.flag}</span><span>${item.label}</span><small>${item.code}</small>`;
      option.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        try { localStorage.setItem('nw_language', key); } catch (_) {}
        location.assign(hrefFor(key));
      });
      menu.appendChild(option);
    });

    const close = () => {
      wrapper.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = !wrapper.classList.contains('is-open');
      wrapper.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => { if (!wrapper.contains(event.target)) close(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && wrapper.classList.contains('is-open')) {
        close();
        button.focus();
      }
    });
    wrapper.append(button, menu);
    return wrapper;
  };

  const pinToToggle = (wrapper, headerNav, toggle) => {
    const navRect = headerNav.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    if (!toggleRect.width || !toggleRect.height) return false;
    const gap = 10;
    wrapper.style.position = 'absolute';
    wrapper.style.margin = '0';
    wrapper.style.right = `${Math.max(0, Math.round(navRect.right - toggleRect.left + gap))}px`;
    wrapper.style.top = `${Math.max(0, Math.round(toggleRect.top - navRect.top))}px`;
    wrapper.style.zIndex = '130';
    const button = wrapper.querySelector('.nw-language-button');
    if (button) {
      const height = `${Math.round(toggleRect.height)}px`;
      button.style.height = height;
      button.style.minHeight = height;
      button.style.padding = '0 10px';
    }
    return true;
  };

  const resetPinned = (wrapper) => {
    wrapper.style.position = '';
    wrapper.style.margin = '';
    wrapper.style.right = '';
    wrapper.style.top = '';
    wrapper.style.zIndex = '';
    const button = wrapper.querySelector('.nw-language-button');
    if (button) {
      button.style.height = '';
      button.style.minHeight = '';
      button.style.padding = '';
    }
  };

  const place = () => {
    injectStyles();
    const nav = document.querySelector('nav.links') || document.querySelector('.links') || document.querySelector('header nav');
    const headerNav = nav?.closest('.nav') || document.querySelector('.top .nav') || document.querySelector('header .nav');
    if (!headerNav) return;
    let wrapper = document.querySelector('[data-nw-app-language-switcher]');
    if (!wrapper) wrapper = createSwitcher();
    const toggle = headerNav.querySelector(':scope > .nav-toggle') || headerNav.querySelector('.nav-toggle');
    const compact = window.matchMedia('(max-width:1280px)').matches;
    if (compact && toggle) {
      if (wrapper.parentNode !== headerNav || wrapper.nextElementSibling !== toggle) headerNav.insertBefore(wrapper, toggle);
      pinToToggle(wrapper, headerNav, toggle);
      return;
    }
    resetPinned(wrapper);
    if (nav) {
      const auth = nav.querySelector('.auth-link');
      const anchor = auth || nav.firstElementChild;
      if (anchor) nav.insertBefore(wrapper, anchor);
      else nav.appendChild(wrapper);
      return;
    }
    headerNav.appendChild(wrapper);
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; place(); });
  };

  const start = () => {
    place();
    if (document.body) new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
    addEventListener('resize', schedule, { passive:true });
    addEventListener('pageshow', schedule, { passive:true });
    setTimeout(schedule, 0);
    setTimeout(schedule, 250);
    setTimeout(schedule, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

// Senioren login: preserve the light Senioren identity, but use the compact two-column auth layout of the normal login.
(() => {
  'use strict';
  const page = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  const product = new URLSearchParams(location.search).get('produkt');
  if (page !== 'anmelden.html' || product !== 'senioren') return;

  const STYLE_ID = 'nw-senior-inline-auth-v1';
  const installStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.login-image-page.senior-product.senior-inline-auth,
      body.login-image-page.senior-inline-auth[data-product="senioren"]{
        background:#f7f3ea!important;color:#181713!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .top,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .top{
        background:rgba(247,243,234,.96)!important;border-color:rgba(42,35,23,.14)!important;box-shadow:0 1px 0 rgba(255,255,255,.62),0 16px 42px rgba(57,45,22,.07)!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .top .brandtext span:before,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .top .brandtext span:before{color:#17130d!important}
      body.login-image-page.senior-product.senior-inline-auth .top .links,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .top .links{color:#353128!important}
      body.login-image-page.senior-product.senior-inline-auth .nav-toggle,
      body.login-image-page.senior-product.senior-inline-auth .nw-language-button,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .nav-toggle,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .nw-language-button{
        background:#eee8dc!important;border-color:rgba(42,35,23,.18)!important;color:#4d463d!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.75)!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .nw-language-button:hover,
      body.login-image-page.senior-product.senior-inline-auth .nw-language-button:focus-visible,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .nw-language-button:hover,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .nw-language-button:focus-visible{
        background:#eee8dc!important;border-color:rgba(42,35,23,.30)!important;color:#2f2a24!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .hero,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .hero{
        min-height:690px!important;padding:62px 0 68px!important;align-items:flex-start!important;overflow:hidden!important;
        background:radial-gradient(650px 500px at 82% 42%,rgba(193,151,67,.18),transparent 68%),radial-gradient(760px 560px at 8% 15%,rgba(255,255,255,.82),transparent 64%),linear-gradient(135deg,#fbf8f1 0%,#f3eddf 56%,#e9deca 100%)!important;
        border-bottom:1px solid rgba(112,87,39,.13)!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .hero .wrap,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .hero .wrap{
        width:min(100% - 48px,1240px)!important;padding-right:min(45vw,555px)!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .hero h1,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .hero h1{
        max-width:620px!important;margin:12px 0 14px!important;color:#181713!important;font-size:clamp(2.75rem,4.5vw,4.35rem)!important;line-height:.98!important;letter-spacing:-.055em!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .hero p,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .hero p{
        max-width:610px!important;margin:0!important;color:#676158!important;font-size:clamp(1rem,1.25vw,1.12rem)!important;line-height:1.56!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .hero .eyebrow,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .hero .eyebrow{color:#b98a2f!important}
      body.login-image-page.senior-product.senior-inline-auth .hero:after,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .hero:after{
        content:""!important;position:absolute!important;top:50%!important;right:max(4vw,42px)!important;bottom:auto!important;width:min(420px,35vw)!important;aspect-ratio:4/5!important;transform:translateY(-50%)!important;
        border:1px solid rgba(151,115,43,.22)!important;border-radius:30px!important;
        background:linear-gradient(180deg,transparent 70%,rgba(31,24,15,.10) 100%),url("lifestyle/senior-woman-overview.webp") 90% 28%/cover no-repeat!important;
        box-shadow:0 28px 76px rgba(69,50,20,.16),inset 0 1px 0 rgba(255,255,255,.50)!important;opacity:1!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .senior-auth-inline,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .senior-auth-inline{width:min(560px,100%);margin-top:26px}
      body.login-image-page.senior-product.senior-inline-auth .logincard,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .logincard{
        width:100%!important;padding:27px 29px!important;border:1px solid rgba(112,87,39,.15)!important;border-left:1px solid rgba(112,87,39,.15)!important;border-radius:22px!important;
        background:rgba(255,255,255,.82)!important;box-shadow:0 20px 58px rgba(65,49,22,.10),inset 0 1px 0 rgba(255,255,255,.9)!important;backdrop-filter:blur(18px) saturate(112%)!important;-webkit-backdrop-filter:blur(18px) saturate(112%)!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .logincard h2,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .logincard h2{margin:0 0 20px!important;color:#181713!important;font-size:1.8rem!important}
      body.login-image-page.senior-product.senior-inline-auth .field label,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .field label{color:#29251f!important}
      body.login-image-page.senior-product.senior-inline-auth .field input,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .field input{
        min-height:52px!important;border:1px solid rgba(90,72,40,.18)!important;border-radius:13px!important;background:#fff!important;color:#1f1c17!important;caret-color:#1f1c17!important;box-shadow:inset 0 1px 2px rgba(44,34,18,.025)!important;
      }
      body.login-image-page.senior-product.senior-inline-auth .field input:focus,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .field input:focus{border-color:rgba(181,137,52,.72)!important;background:#fff!important;box-shadow:0 0 0 4px rgba(195,151,62,.11)!important}
      body.login-image-page.senior-product.senior-inline-auth #loginSubmit,
      body.login-image-page.senior-inline-auth[data-product="senioren"] #loginSubmit{min-height:52px!important;border-radius:13px!important;background:linear-gradient(135deg,#e2c071,#c99d43)!important;color:#1d1810!important;border:1px solid rgba(132,96,30,.25)!important;box-shadow:0 12px 28px rgba(157,116,38,.16)!important}
      body.login-image-page.senior-product.senior-inline-auth .split,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .split{margin-top:17px!important;padding-top:15px!important;border-top:1px solid rgba(112,87,39,.11)!important;color:#676158!important}
      body.login-image-page.senior-product.senior-inline-auth .password-toggle,
      body.login-image-page.senior-inline-auth[data-product="senioren"] .password-toggle{color:#514a40!important}
      body.login-image-page.senior-product.senior-inline-auth main>.section[data-senior-auth-empty="true"],
      body.login-image-page.senior-inline-auth[data-product="senioren"] main>.section[data-senior-auth-empty="true"]{display:none!important}
      @media(max-width:900px){
        body.login-image-page.senior-product.senior-inline-auth .hero,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .hero{min-height:0!important;padding:54px 0 430px!important}
        body.login-image-page.senior-product.senior-inline-auth .hero .wrap,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .hero .wrap{width:min(100% - 36px,720px)!important;padding-right:0!important}
        body.login-image-page.senior-product.senior-inline-auth .hero:after,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .hero:after{top:auto!important;bottom:42px!important;right:50%!important;width:min(330px,82vw)!important;transform:translateX(50%)!important;background-position:90% 28%!important}
        body.login-image-page.senior-product.senior-inline-auth .senior-auth-inline,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .senior-auth-inline{width:100%!important}
      }
      @media(max-width:560px){
        body.login-image-page.senior-product.senior-inline-auth .hero,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .hero{padding:46px 0 390px!important}
        body.login-image-page.senior-product.senior-inline-auth .logincard,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .logincard{padding:24px 20px!important;border-radius:20px!important}
        body.login-image-page.senior-product.senior-inline-auth .split,
        body.login-image-page.senior-inline-auth[data-product="senioren"] .split{align-items:flex-start!important;flex-direction:column!important;gap:9px!important}
      }
    `;
    document.head.appendChild(style);
  };

  const apply = () => {
    if (!document.body) return;
    document.body.classList.add('senior-inline-auth');
    installStyle();
    const heroWrap = document.querySelector('main .hero .wrap');
    const section = document.querySelector('main > .section');
    const form = document.getElementById('loginForm');
    if (!heroWrap || !section || !form) return;
    let slot = heroWrap.querySelector('.senior-auth-inline');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'senior-auth-inline';
      heroWrap.appendChild(slot);
    }
    if (form.parentNode !== slot) slot.appendChild(form);
    section.dataset.seniorAuthEmpty = 'true';
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once:true });
  else apply();
  addEventListener('pageshow', apply, { passive:true });
})();