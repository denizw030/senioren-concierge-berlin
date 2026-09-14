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