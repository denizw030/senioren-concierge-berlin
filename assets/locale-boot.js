(() => {
  'use strict';

  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const requestedProduct = String(params.get('produkt') || params.get('product') || '').toLowerCase();
  const isLoginPage = /(?:^|\/)anmelden\.html$/.test(location.pathname);

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
  }

  const style = document.createElement('style');
  style.id = 'nw-first-paint-boot';
  style.textContent = `
    html.nw-product-senior-first-paint,
    html.nw-product-senior-first-paint body{background:#f7f3ea!important;color-scheme:light!important}
    html.nw-product-prime-first-paint,
    html.nw-product-prime-first-paint body{background:#070706!important;color-scheme:dark!important}
    html.nw-product-booting body,
    html.nw-locale-pending body{visibility:hidden!important}

    html.nw-product-senior-first-paint body.login-image-page{background:#f7f3ea!important;color:#181713!important;color-scheme:light!important}
    html.nw-product-senior-first-paint body.login-image-page .top{background:#f7f3ea!important;border-color:rgba(65,51,26,.13)!important;box-shadow:0 1px 0 rgba(65,51,26,.06)!important}

    body.login-image-page.senior-product,
    body.login-image-page[data-product="senioren"]{background:#f7f3ea!important;color:#181713!important;color-scheme:light!important}
    body.login-image-page.senior-product .top,
    body.login-image-page[data-product="senioren"] .top{background:#f7f3ea!important;border-color:rgba(65,51,26,.13)!important;box-shadow:0 1px 0 rgba(65,51,26,.06)!important}

    body.login-image-page.senior-product main,
    body.login-image-page[data-product="senioren"] main{
      position:relative!important;display:block!important;width:100%!important;max-width:none!important;
      min-height:calc(100vh - 126px)!important;margin:0!important;padding:0!important;overflow:hidden!important;
      isolation:isolate!important;background:#f7f3ea!important
    }
    body.login-image-page.senior-product main::before,
    body.login-image-page[data-product="senioren"] main::before{
      content:""!important;position:absolute!important;z-index:0!important;inset:0 50% 0 0!important;
      display:block!important;margin:0!important;padding:0!important;border:0!important;
      background:radial-gradient(700px 520px at 92% 20%,rgba(200,164,93,.15),transparent 66%),radial-gradient(540px 400px at 8% 10%,rgba(255,255,255,.86),transparent 66%),linear-gradient(145deg,#fbf8f1 0%,#f3eddf 62%,#eadfca 100%)!important
    }
    body.login-image-page.senior-product main::after,
    body.login-image-page[data-product="senioren"] main::after{
      content:""!important;position:absolute!important;z-index:0!important;inset:0 0 0 50%!important;
      display:block!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;
      background:#e8dfd2 url("/assets/lifestyle/senior-woman-overview.webp?v=6") 72% 50%/cover no-repeat!important;
      box-shadow:none!important
    }
    body.login-image-page.senior-product main>.hero::before,
    body.login-image-page.senior-product main>.hero::after,
    body.login-image-page[data-product="senioren"] main>.hero::before,
    body.login-image-page[data-product="senioren"] main>.hero::after{content:none!important;display:none!important}

    body.login-image-page.senior-product main>.hero,
    body.login-image-page.senior-product main>.section,
    body.login-image-page[data-product="senioren"] main>.hero,
    body.login-image-page[data-product="senioren"] main>.section{
      position:relative!important;z-index:2!important;display:block!important;width:50%!important;max-width:50%!important;
      min-width:0!important;min-height:0!important;margin:0!important;box-sizing:border-box!important;overflow:visible!important;
      border:0!important;background:transparent!important;content-visibility:visible!important;contain:none!important
    }
    body.login-image-page.senior-product main>.hero,
    body.login-image-page[data-product="senioren"] main>.hero{
      padding:clamp(46px,4.7vw,70px) clamp(38px,5.1vw,76px) 0!important
    }
    body.login-image-page.senior-product main>.section,
    body.login-image-page[data-product="senioren"] main>.section{
      padding:26px clamp(38px,5.1vw,76px) clamp(48px,5vw,72px)!important
    }
    body.login-image-page.senior-product main>.hero>.wrap,
    body.login-image-page.senior-product main>.section>.wrap,
    body.login-image-page.senior-product .loginwrap,
    body.login-image-page[data-product="senioren"] main>.hero>.wrap,
    body.login-image-page[data-product="senioren"] main>.section>.wrap,
    body.login-image-page[data-product="senioren"] .loginwrap{
      display:block!important;width:100%!important;max-width:560px!important;min-width:0!important;margin:0 auto!important;padding:0!important;box-sizing:border-box!important
    }
    body.login-image-page.senior-product .hero .eyebrow,
    body.login-image-page[data-product="senioren"] .hero .eyebrow{color:#a6781e!important}
    body.login-image-page.senior-product .hero h1,
    body.login-image-page[data-product="senioren"] .hero h1{
      width:100%!important;max-width:none!important;margin:10px 0 14px!important;color:#181713!important;
      font-size:clamp(2.65rem,4.1vw,4rem)!important;line-height:.98!important;letter-spacing:-.055em!important;
      text-shadow:none!important;word-break:normal!important;overflow-wrap:normal!important;text-wrap:balance!important
    }
    body.login-image-page.senior-product .hero p,
    body.login-image-page[data-product="senioren"] .hero p{
      width:100%!important;max-width:none!important;margin:0!important;color:#655f55!important;
      font-size:clamp(.98rem,1.05vw,1.08rem)!important;line-height:1.56!important;word-break:normal!important;overflow-wrap:normal!important
    }
    body.login-image-page.senior-product .logincard,
    body.login-image-page[data-product="senioren"] .logincard{
      display:block!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:26px!important;
      box-sizing:border-box!important;border:1px solid rgba(112,87,39,.14)!important;border-radius:20px!important;
      background:rgba(255,255,255,.94)!important;color:#181713!important;
      box-shadow:0 18px 48px rgba(65,49,22,.10),inset 0 1px 0 rgba(255,255,255,.96)!important;
      backdrop-filter:blur(18px) saturate(115%)!important;-webkit-backdrop-filter:blur(18px) saturate(115%)!important
    }
    body.login-image-page.senior-product .logincard h2,
    body.login-image-page[data-product="senioren"] .logincard h2{margin:0 0 20px!important;color:#181713!important;font-size:1.78rem!important;line-height:1.05!important;letter-spacing:-.04em!important}
    body.login-image-page.senior-product .field,
    body.login-image-page[data-product="senioren"] .field{margin-bottom:15px!important}
    body.login-image-page.senior-product .field label,
    body.login-image-page[data-product="senioren"] .field label{display:block!important;margin-bottom:7px!important;color:#29251f!important;font-size:13px!important;font-weight:700!important}
    body.login-image-page.senior-product .field input,
    body.login-image-page[data-product="senioren"] .field input{
      width:100%!important;min-height:52px!important;padding:0 15px!important;box-sizing:border-box!important;
      border:1px solid rgba(90,72,40,.19)!important;border-radius:14px!important;background:#fff!important;color:#1f1c17!important
    }
    body.login-image-page.senior-product #loginSubmit,
    body.login-image-page[data-product="senioren"] #loginSubmit{
      width:100%!important;min-height:52px!important;border:1px solid rgba(142,102,30,.18)!important;border-radius:14px!important;
      background:linear-gradient(135deg,#e7c675 0%,#d4a744 100%)!important;color:#1d1810!important;font-weight:800!important;
      box-shadow:0 10px 24px rgba(157,116,38,.14),inset 0 1px 0 rgba(255,255,255,.38)!important
    }
    body.login-image-page.senior-product .split,
    body.login-image-page[data-product="senioren"] .split{margin-top:16px!important;padding-top:15px!important;border-top:1px solid rgba(112,87,39,.12)!important}

    @media(max-width:820px){
      body.login-image-page.senior-product main,
      body.login-image-page[data-product="senioren"] main{overflow:visible!important;min-height:0!important}
      body.login-image-page.senior-product main::before,
      body.login-image-page[data-product="senioren"] main::before{inset:0!important}
      body.login-image-page.senior-product main::after,
      body.login-image-page[data-product="senioren"] main::after{
        position:relative!important;inset:auto!important;display:block!important;width:100%!important;height:clamp(360px,78vw,560px)!important;
        margin:0!important;background-position:68% 50%!important
      }
      body.login-image-page.senior-product main>.hero,
      body.login-image-page.senior-product main>.section,
      body.login-image-page[data-product="senioren"] main>.hero,
      body.login-image-page[data-product="senioren"] main>.section{width:100%!important;max-width:100%!important}
      body.login-image-page.senior-product main>.hero,
      body.login-image-page[data-product="senioren"] main>.hero{padding:38px 20px 0!important}
      body.login-image-page.senior-product main>.section,
      body.login-image-page[data-product="senioren"] main>.section{padding:24px 20px 32px!important}
      body.login-image-page.senior-product .hero h1,
      body.login-image-page[data-product="senioren"] .hero h1{font-size:clamp(2.4rem,10.5vw,3.35rem)!important}
      body.login-image-page.senior-product .logincard,
      body.login-image-page[data-product="senioren"] .logincard{padding:22px 20px!important}
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

  const clearSeniorLoginRuntimeMarkers = () => {
    if (!isSeniorLogin || !document.body) return;
    document.body.classList.remove('senior-product');
    if (document.body.dataset.product === 'senioren') delete document.body.dataset.product;
  };

  let seniorLoginGuardBound = false;
  const bindSeniorLoginGuard = () => {
    if (!isSeniorLogin || !document.body || seniorLoginGuardBound) return;
    seniorLoginGuardBound = true;
    clearSeniorLoginRuntimeMarkers();
    new MutationObserver(clearSeniorLoginRuntimeMarkers).observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-product']
    });
  };

  const applyProduct = () => {
    const body = document.body;
    if (!body || !product) return false;
    if (isSeniorLogin) {
      clearSeniorLoginRuntimeMarkers();
      requestAnimationFrame(() => root.classList.remove('nw-product-booting'));
      return true;
    }
    body.dataset.product = product;
    body.classList.toggle('senior-product', product === 'senioren');
    requestAnimationFrame(() => root.classList.remove('nw-product-booting'));
    return true;
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
    bindSeniorLoginGuard();
    removeStrayHeadMarker();
    [120, 500, 1500].forEach((delay) => setTimeout(() => {
      bindSeniorLoginGuard();
      clearSeniorLoginRuntimeMarkers();
      removeStrayHeadMarker();
    }, delay));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once:true });
  else onReady();
})();