(() => {
  'use strict';

  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const requestedProduct = String(params.get('produkt') || params.get('product') || '').toLowerCase();
  const isLoginPage = /(?:^|\/)anmelden(?:\.html)?\/?$/.test(location.pathname);

  let storedProduct = null;
  try { storedProduct = sessionStorage.getItem('nahwerk_product'); } catch (_) {}

  const product = requestedProduct === 'senioren'
    ? 'senioren'
    : requestedProduct === 'prime'
      ? 'prime'
      : storedProduct === 'senioren'
        ? 'senioren'
        : storedProduct === 'prime'
          ? 'prime'
          : null;

  const isSeniorLogin = product === 'senioren' && isLoginPage;

  const supported = new Set(['en', 'tr']);
  const languageQuery = params.get('lang');
  let storedLanguage = null;
  try { storedLanguage = localStorage.getItem('nw_language'); } catch (_) {}
  const lang = supported.has(languageQuery)
    ? languageQuery
    : supported.has(storedLanguage)
      ? storedLanguage
      : null;

  if (product) {
    root.classList.add('nw-product-booting');
    root.classList.add(product === 'senioren' ? 'nw-product-senior-first-paint' : 'nw-product-prime-first-paint');
    try { sessionStorage.setItem('nahwerk_product', product); } catch (_) {}
  }

  if (lang) {
    root.classList.add('nw-locale-pending');
    setTimeout(() => root.classList.remove('nw-locale-pending'), 3000);
  }

  if (isSeniorLogin) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = '/assets/lifestyle/senior-woman-overview.webp?v=6';
    preload.fetchPriority = 'high';
    document.head.appendChild(preload);

    const reveal = () => {
      root.classList.add('nw-senior-login-stable-ready');
      root.classList.remove('nw-product-booting');
    };

    const existingStable = document.querySelector('link[data-nw-senior-login-stable]');
    if (existingStable) {
      /* The stylesheet is linked before this blocking script in anmelden.html,
         so reaching this point means the canonical CSS is ready to paint. */
      reveal();
    } else {
      const stable = document.createElement('link');
      stable.rel = 'stylesheet';
      stable.href = '/assets/senior-login-stable-20260915.css?v=2';
      stable.dataset.nwSeniorLoginStable = 'true';
      stable.addEventListener('load', reveal, { once:true });
      stable.addEventListener('error', reveal, { once:true });
      document.head.appendChild(stable);
      setTimeout(reveal, 2500);
    }
  }

  /*
   * First-paint boot only.
   * The Senioren login is revealed only after its final isolated stylesheet is ready.
   */
  const style = document.createElement('style');
  style.id = 'nw-first-paint-boot';
  style.textContent = `
    html.nw-product-senior-first-paint,
    html.nw-product-senior-first-paint body{background:#f7f3ea!important;color-scheme:light!important}
    html.nw-product-prime-first-paint,
    html.nw-product-prime-first-paint body{background:#070706!important;color-scheme:dark!important}
    html.nw-product-booting body,
    html.nw-locale-pending body{visibility:hidden!important}
    html.nw-product-senior-first-paint body.login-image-page,
    body.login-image-page.senior-product,
    body.login-image-page[data-product="senioren"]{background:#f7f3ea!important;color:#181713!important;color-scheme:light!important}
    html.nw-product-senior-first-paint body.login-image-page .top,
    body.login-image-page.senior-product .top,
    body.login-image-page[data-product="senioren"] .top{background:#f7f3ea!important;border-color:rgba(65,51,26,.13)!important;box-shadow:0 1px 0 rgba(65,51,26,.06)!important}
    .senior-login-visual{display:none}
    html.nw-product-senior-first-paint body.login-image-page main::after,
    body.login-image-page.senior-product main::after,
    body.login-image-page[data-product="senioren"] main::after{content:none!important;display:none!important}
    html.nw-product-senior-first-paint body.login-image-page main>.senior-login-visual,
    body.login-image-page.senior-product main>.senior-login-visual,
    body.login-image-page[data-product="senioren"] main>.senior-login-visual{
      display:block!important;position:relative!important;inset:auto!important;z-index:1!important;
      grid-column:2!important;grid-row:1 / span 2!important;width:100%!important;max-width:none!important;height:100%!important;min-height:650px!important;
      margin:0!important;padding:0!important;border:0!important;border-radius:34px!important;box-shadow:none!important;pointer-events:none!important;
      background:#ddd4c8 url("/assets/lifestyle/senior-woman-overview.webp?v=6") 68% 50%/cover no-repeat!important
    }
    @media(max-width:899px){
      html.nw-product-senior-first-paint body.login-image-page main>.senior-login-visual,
      body.login-image-page.senior-product main>.senior-login-visual,
      body.login-image-page[data-product="senioren"] main>.senior-login-visual{
        grid-column:1!important;grid-row:3!important;position:relative!important;inset:auto!important;display:block!important;width:100%!important;max-width:720px!important;
        height:clamp(310px,66vw,500px)!important;min-height:310px!important;margin:4px auto 0!important;border-radius:28px!important;background-position:68% 48%!important
      }
    }
  `;
  document.head.appendChild(style);

  const removeStrayHeadMarker = () => {
    if (!document.body) return;
    const marker = /^<\s*\/\s*head\s*>$/i;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const remove = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (marker.test(String(node.nodeValue || '').trim())) remove.push(node);
    }
    remove.forEach((node) => node.remove());
    document.body.querySelectorAll('*').forEach((el) => {
      if (el.children.length) return;
      if (marker.test(String(el.textContent || '').trim())) el.remove();
    });
  };

  const applyProduct = () => {
    const body = document.body;
    if (!body || !product) return false;
    body.dataset.product = product;
    body.classList.toggle('senior-product', product === 'senioren');
    if (!isSeniorLogin) requestAnimationFrame(() => root.classList.remove('nw-product-booting'));
    return true;
  };

  const ensureSeniorVisualPanel = () => {
    if (!isSeniorLogin || !document.body) return;
    const main = document.querySelector('main');
    if (!main) return;

    const visuals = Array.from(main.querySelectorAll(':scope > .senior-login-visual'));
    let visual = visuals.shift() || null;

    // Hard guarantee: never allow the senior login portrait to exist twice.
    visuals.forEach((node) => node.remove());

    if (!visual) {
      visual = document.createElement('div');
      visual.className = 'senior-login-visual';
      visual.setAttribute('aria-hidden', 'true');
      main.appendChild(visual);
    }

    visual.id = 'nw-senior-login-visual';
  };

  if (product && !applyProduct()) {
    const observer = new MutationObserver(() => {
      if (!applyProduct()) return;
      observer.disconnect();
    });
    observer.observe(root, { childList:true, subtree:true });
  }

  const onReady = () => {
    if (product) applyProduct();
    ensureSeniorVisualPanel();
    removeStrayHeadMarker();
    [120, 500, 1500].forEach((delay) => setTimeout(removeStrayHeadMarker, delay));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once:true });
  else onReady();
})();

(() => {
  'use strict';
  // NAHWERK CLEAN ROUTES + FLOATING CONCIERGE 2026-09-16
  const SECURITY_PATH = /^\/oauth\//i;
  const COSMETIC_PARAMS = ['produkt','product','lang'];
  const cleanPath = (pathname) => {
    if (SECURITY_PATH.test(pathname)) return pathname;
    if (/\/index\.html$/i.test(pathname)) return pathname.replace(/\/index\.html$/i,'/');
    if (/\.html$/i.test(pathname)) return pathname.replace(/\.html$/i,'');
    if (/^\/(?:de|en|tr)\/$/i.test(pathname)) return pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0,-1);
    return pathname;
  };
  const cleanInternal = (raw) => {
    if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return raw;
    let url;
    try { url = new URL(raw, location.href); } catch (_) { return raw; }
    if (url.origin !== location.origin || SECURITY_PATH.test(url.pathname)) return raw;
    const next = cleanPath(url.pathname);
    if (next === url.pathname) return raw;
    url.pathname = next;
    return url.pathname + url.search + url.hash;
  };
  const rewriteLinks = (root=document) => {
    root.querySelectorAll?.('a[href],form[action],[data-plan-url]').forEach((el) => {
      ['href','action','data-plan-url'].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const raw = el.getAttribute(attr);
        const next = cleanInternal(raw);
        if (next !== raw) el.setAttribute(attr,next);
      });
    });
  };
  const cleanAddress = () => {
    if (SECURITY_PATH.test(location.pathname)) return;
    const url = new URL(location.href);
    url.pathname = cleanPath(url.pathname);
    COSMETIC_PARAMS.forEach((key) => url.searchParams.delete(key));
    const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
    const current = location.pathname + location.search + location.hash;
    if (next !== current) history.replaceState(history.state,'',next);
  };
  const install = () => {
    rewriteLinks();
    cleanAddress();
    if (document.documentElement.dataset.nwCleanRouteObserver === '1') return;
    document.documentElement.dataset.nwCleanRouteObserver = '1';
    new MutationObserver((mutations) => mutations.forEach((m) => m.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) rewriteLinks(node);
    }))).observe(document.body,{childList:true,subtree:true});
  };
  const afterAuth = () => {
    const auth = window.SCBAuth;
    if (auth?.validateSession) Promise.resolve(auth.validateSession()).finally(() => setTimeout(install,0));
    else setTimeout(install,0);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',afterAuth,{once:true});
  else afterAuth();
})();
