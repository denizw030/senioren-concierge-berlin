(() => {
  'use strict';

  const SUPPORTED = {
    de: { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
    en: { code: 'EN', label: 'English', flag: '🇬🇧' },
    tr: { code: 'TR', label: 'Türkçe', flag: '🇹🇷' }
  };

  const LOCALIZED_PAGES = new Set([
    'index.html','prime-concierge.html','safety.html','angehoerige.html',
    'telefonannahme.html','pakete.html','leistungen.html','ablauf.html','faq.html',
    'kontakt.html','concierges.html','senioren-concierge.html','alltag-organisieren.html',
    'dokumente-verstehen.html','technik-verstehen.html','ueber-mich.html'
  ]);

  const normalizePath = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    let lang = 'de';
    if (parts[0] === 'en' || parts[0] === 'tr') lang = parts.shift();
    const page = parts.length ? parts[parts.length - 1] : 'index.html';
    return { lang, page: page.endsWith('.html') ? page : 'index.html' };
  };

  const localeHref = (lang, page) => {
    if (lang === 'de') return page === 'index.html' ? '/' : `/${page}`;
    return page === 'index.html' ? `/${lang}/` : `/${lang}/${page}`;
  };

  const injectStyles = () => {
    if (document.getElementById('nw-language-switcher-styles')) return;
    const style = document.createElement('style');
    style.id = 'nw-language-switcher-styles';
    style.textContent = `
      .nw-language{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;font:600 13px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;letter-spacing:.02em}
      .nw-language-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:9px 12px;border:1px solid rgba(215,169,52,.34);border-radius:999px;background:rgba(8,8,8,.72);color:#f4f1e9;cursor:pointer;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:border-color .18s ease,background .18s ease,transform .18s ease}
      .nw-language-button:hover,.nw-language-button:focus-visible{border-color:rgba(239,188,63,.8);background:#11110f;outline:none}
      .nw-language-button:focus-visible{box-shadow:0 0 0 3px rgba(239,188,63,.22)}
      .nw-language-flag{font-size:17px;line-height:1}
      .nw-language-chevron{font-size:10px;opacity:.7;transition:transform .18s ease}
      .nw-language.is-open .nw-language-chevron{transform:rotate(180deg)}
      .nw-language-menu{position:absolute;z-index:220;top:calc(100% + 10px);right:0;display:none;min-width:190px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(11,11,10,.97);box-shadow:0 24px 60px rgba(0,0,0,.45);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
      .nw-language.is-open .nw-language-menu{display:grid;gap:3px}
      .nw-language-option{display:flex!important;align-items:center;gap:10px;min-height:44px!important;padding:10px 12px!important;border:0!important;border-radius:9px!important;color:#eeeae0!important;text-decoration:none!important;white-space:nowrap}
      .nw-language-option:hover,.nw-language-option:focus-visible{background:rgba(255,255,255,.07)!important;color:#f2c45b!important;outline:none}
      .nw-language-option[aria-current="page"]{background:rgba(215,169,52,.1)!important;color:#f2c45b!important}
      .nw-language-option small{margin-left:auto;color:#8d8a82;font-size:11px;letter-spacing:.08em}

      @media (max-width:1280px){
        .top .nav>.nw-language,.home-reference .top .nav>.nw-language{display:inline-flex;margin-left:auto;margin-right:58px;z-index:130;align-self:center}
        .top .nav>.nw-language .nw-language-menu,.home-reference .top .nav>.nw-language .nw-language-menu{top:calc(100% + 12px);right:0}
        .links .nw-language{width:100%;display:block;padding:4px 8px}
        .links .nw-language-button{width:100%;justify-content:flex-start;border-radius:10px;min-height:48px;padding:12px 14px}
        .links .nw-language-chevron{margin-left:auto}
        .links .nw-language-menu{position:static;width:100%;margin-top:6px;box-shadow:none}
      }
      @media (max-width:620px){
        .top .nav>.nw-language,.home-reference .top .nav>.nw-language{margin-right:54px}
        .top .nav>.nw-language .nw-language-button,.home-reference .top .nav>.nw-language .nw-language-button{min-height:42px;padding:8px 10px;gap:6px}
      }
    `;
    document.head.appendChild(style);
  };

  const createSwitcher = (lang, page) => {
    const current = SUPPORTED[lang] || SUPPORTED.de;
    const wrapper = document.createElement('div');
    wrapper.className = 'nw-language';
    wrapper.dataset.nwLanguageSwitcher = 'v11';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nw-language-button';
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', lang === 'de' ? 'Sprache auswählen' : lang === 'tr' ? 'Dil seç' : 'Choose language');
    button.innerHTML = `<span class="nw-language-flag" aria-hidden="true">${current.flag}</span><span>${current.code}</span><span class="nw-language-chevron" aria-hidden="true">⌄</span>`;

    const menu = document.createElement('div');
    menu.className = 'nw-language-menu';
    menu.setAttribute('role', 'menu');

    Object.entries(SUPPORTED).forEach(([key, item]) => {
      const link = document.createElement('a');
      link.className = 'nw-language-option';
      link.href = localeHref(key, page);
      link.hreflang = key;
      link.lang = key;
      link.setAttribute('role', 'menuitem');
      if (key === lang) link.setAttribute('aria-current', 'page');
      link.innerHTML = `<span class="nw-language-flag" aria-hidden="true">${item.flag}</span><span>${item.label}</span><small>${item.code}</small>`;
      link.addEventListener('click', () => {
        try { localStorage.setItem('nw_language', key); } catch (_) {}
      });
      menu.appendChild(link);
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

  const placeSwitcher = () => {
    const { lang, page } = normalizePath(location.pathname);
    if (!LOCALIZED_PAGES.has(page)) return;
    const nav = document.querySelector('nav.links') || document.querySelector('.links') || document.querySelector('nav[aria-label]') || document.querySelector('header nav');
    if (!nav) return;
    injectStyles();
    let wrapper = document.querySelector('[data-nw-language-switcher]');
    if (!wrapper) wrapper = createSwitcher(lang, page);
    const headerNav = nav.closest('.nav') || document.querySelector('.top .nav') || document.querySelector('header .nav');
    const toggle = headerNav?.querySelector(':scope > .nav-toggle') || headerNav?.querySelector('.nav-toggle');
    const compact = window.matchMedia('(max-width: 1280px)').matches;
    if (compact && headerNav && toggle) {
      if (wrapper.parentNode !== headerNav || wrapper.nextElementSibling !== toggle) headerNav.insertBefore(wrapper, toggle);
      return;
    }
    const auth = nav.querySelector('.auth-link');
    const account = nav.querySelector('.nw-account-cluster-desktop');
    const anchor = auth || account;
    if (wrapper.parentNode !== nav || (anchor && wrapper.nextElementSibling !== anchor)) {
      if (anchor) nav.insertBefore(wrapper, anchor);
      else nav.appendChild(wrapper);
    }
  };

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  let catalog = null;
  let localizationBusy = false;

  const translateTextNode = (node) => {
    if (!catalog || !node?.nodeValue) return;
    const key = clean(node.nodeValue);
    const translated = catalog[key];
    if (!translated || translated === key) return;
    const lead = node.nodeValue.match(/^\s*/)?.[0] || '';
    const tail = node.nodeValue.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${lead}${translated}${tail}`;
  };

  const translateElement = (root) => {
    if (!catalog || !root) return;
    const skip = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG']);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && !skip.has(node.parentElement.tagName) && !node.parentElement.closest('[data-nw-language-switcher]')
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);

    const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [...document.querySelectorAll('*')];
    elements.forEach((el) => {
      if (!el?.getAttribute || el.closest?.('[data-nw-language-switcher]')) return;
      ['aria-label','title','placeholder','alt'].forEach((attr) => {
        const raw = el.getAttribute(attr);
        const key = clean(raw);
        if (key && catalog[key]) el.setAttribute(attr, catalog[key]);
      });
    });
  };

  const rewriteLocaleLinks = () => {
    const { lang } = normalizePath(location.pathname);
    if (lang === 'de') return;
    document.querySelectorAll('a[href]').forEach((link) => {
      if (link.closest('[data-nw-language-switcher]')) return;
      const raw = link.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || /^(https?:|mailto:|tel:|javascript:)/i.test(raw)) return;
      let path = raw;
      if (path.startsWith('/en/') || path.startsWith('/tr/')) return;
      path = path.replace(/^\//, '');
      const base = path.split(/[?#]/)[0];
      const suffix = path.slice(base.length);
      if (base === '' || base === 'index.html') {
        link.setAttribute('href', localeHref(lang, 'index.html') + suffix);
      } else if (LOCALIZED_PAGES.has(base)) {
        link.setAttribute('href', localeHref(lang, base) + suffix);
      } else if (base.endsWith('.html')) {
        link.setAttribute('href', `/${path}`);
      }
    });
  };

  const normalizeAssetRef = (value) => {
    if (!value) return value;
    return String(value)
      .replace(new RegExp(`^${location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?:en|tr)/assets/`, 'i'), '/assets/')
      .replace(/^\/(?:en|tr)\/assets\//i, '/assets/')
      .replace(/^assets\//i, '/assets/')
      .replace(/(^|,\s*)assets\//gi, '$1/assets/')
      .replace(/(^|,\s*)\/(?:en|tr)\/assets\//gi, '$1/assets/');
  };

  const repairLocalizedRuntime = () => {
    const { lang } = normalizePath(location.pathname);
    if (lang === 'de') return;

    document.querySelectorAll('[data-concierge-carousel] img, .nw-carousel img').forEach((img) => {
      ['src','data-src','srcset','data-srcset'].forEach((attr) => {
        const raw = img.getAttribute(attr);
        if (!raw) return;
        const fixed = normalizeAssetRef(raw);
        if (fixed !== raw) img.setAttribute(attr, fixed);
      });
    });

    document.querySelectorAll('audio[src], source[src]').forEach((media) => {
      const raw = media.getAttribute('src');
      const fixed = normalizeAssetRef(raw);
      if (fixed && fixed !== raw) media.setAttribute('src', fixed);
    });

    document.querySelectorAll('[data-concierge-carousel]').forEach((root) => {
      const raw = root.getAttribute('data-register-url');
      if (raw && !raw.startsWith('/') && !/^(https?:)/i.test(raw)) root.setAttribute('data-register-url', `/${raw.replace(/^\.\//, '')}`);
    });

    rewriteLocaleLinks();
  };

  const applyLocalization = () => {
    if (localizationBusy || !catalog) return;
    localizationBusy = true;
    try {
      translateElement(document.body);
      rewriteLocaleLinks();
      repairLocalizedRuntime();
      document.documentElement.lang = normalizePath(location.pathname).lang;
    } finally {
      localizationBusy = false;
    }
  };

  const loadCatalog = async () => {
    const { lang } = normalizePath(location.pathname);
    if (lang === 'de') return;
    try {
      const urls = [
        `/locales/${lang}.json?v=2`,
        `/locales/${lang}-extra1.json?v=2`,
        `/locales/${lang}-extra2.json?v=2`,
        `/locales/${lang}-extra3.json?v=2`
      ];
      const parts = await Promise.all(urls.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          return response.ok ? await response.json() : {};
        } catch (_) {
          return {};
        }
      }));
      catalog = Object.assign({}, ...parts);
      applyLocalization();
    } catch (_) {}
  };

  let scheduled = false;
  const schedulePlacement = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      placeSwitcher();
      repairLocalizedRuntime();
      applyLocalization();
    });
  };

  const interceptLocalizedRegistration = (event) => {
    const { lang } = normalizePath(location.pathname);
    if (lang === 'de') return;
    const status = event.target.closest?.('.nw-carousel-status');
    if (status) {
      const root = status.closest('[data-concierge-carousel]');
      const active = root?.querySelector('.nw-carousel-card.is-active .nw-carousel-select[href]');
      if (active) {
        const target = new URL(active.getAttribute('href'), location.href);
        if (/^\/(?:en|tr)\/registrieren\.html$/i.test(target.pathname)) target.pathname = '/registrieren.html';
        if (target.pathname === '/registrieren.html') {
          event.preventDefault();
          event.stopImmediatePropagation();
          location.href = `${target.pathname}${target.search}${target.hash}`;
        }
      }
    }
  };

  const start = () => {
    placeSwitcher();
    repairLocalizedRuntime();
    loadCatalog();
    const root = document.querySelector('header.top') || document.body;
    if (root) new MutationObserver(schedulePlacement).observe(root, { childList: true, subtree: true });
    if (document.body) new MutationObserver(schedulePlacement).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', interceptLocalizedRegistration, true);
    window.addEventListener('resize', schedulePlacement, { passive: true });
    window.addEventListener('pageshow', schedulePlacement, { passive: true });
    setTimeout(schedulePlacement, 0);
    setTimeout(schedulePlacement, 250);
    setTimeout(schedulePlacement, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();