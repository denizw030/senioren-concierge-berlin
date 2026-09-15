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

  if (product) {
    root.classList.add('nw-product-booting');
    root.classList.add(product === 'senioren' ? 'nw-product-senior-first-paint' : 'nw-product-prime-first-paint');
    try { sessionStorage.setItem('nahwerk_product', product); } catch (_) {}
  }

  if (product === 'senioren' && isLoginPage) {
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
    html.nw-product-senior-first-paint body {
      background:#f7f3ea !important;
      color-scheme:light !important;
    }
    html.nw-product-prime-first-paint,
    html.nw-product-prime-first-paint body {
      background:#070706 !important;
      color-scheme:dark !important;
    }
    html.nw-product-booting body,
    html.nw-locale-pending body {
      visibility:hidden !important;
    }
    html.nw-locale-pending.nw-product-senior-first-paint { background:#f7f3ea !important; }
    html.nw-locale-pending:not(.nw-product-senior-first-paint) { background:#070706 !important; }

    body.login-image-page.senior-product.nw-senior-login-composed,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed {
      background:#f7f3ea !important;
      color:#181713 !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed main,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed main {
      padding:0 !important;
      margin:0 !important;
      background:#f7f3ea !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero {
      position:relative !important;
      display:flex !important;
      align-items:stretch !important;
      width:100% !important;
      min-height:700px !important;
      margin:0 !important;
      padding:0 !important;
      overflow:hidden !important;
      background:#f7f3ea !important;
      border:0 !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero:before,
    body.login-image-page.senior-product.nw-senior-login-composed .hero:after,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero:before,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero:after {
      display:none !important;
      content:none !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero .wrap,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero .wrap {
      width:100% !important;
      max-width:none !important;
      min-height:inherit !important;
      margin:0 !important;
      padding:0 !important;
      box-sizing:border-box !important;
    }

    .nw-senior-login-copy {
      position:relative !important;
      z-index:3 !important;
      display:flex !important;
      flex-direction:column !important;
      align-items:stretch !important;
      justify-content:flex-start !important;
      gap:0 !important;
      min-width:0 !important;
      width:100% !important;
      max-width:none !important;
      box-sizing:border-box !important;
      padding:clamp(42px,5vw,72px) clamp(34px,5.4vw,82px) 48px !important;
      background:
        radial-gradient(700px 520px at 88% 24%,rgba(200,164,93,.17),transparent 66%),
        radial-gradient(560px 420px at 8% 12%,rgba(255,255,255,.8),transparent 66%),
        linear-gradient(145deg,#fbf8f1 0%,#f3eddf 62%,#eadfca 100%) !important;
    }
    .nw-senior-login-copy > .eyebrow,
    .nw-senior-login-copy > h1,
    .nw-senior-login-copy > p,
    .nw-senior-login-copy > .logincard {
      flex:0 0 auto !important;
      width:100% !important;
      max-width:560px !important;
      min-width:0 !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero h1,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero h1 {
      margin:10px 0 14px !important;
      color:#181713 !important;
      font-size:clamp(2.55rem,4.4vw,4.15rem) !important;
      line-height:.98 !important;
      letter-spacing:-.055em !important;
      text-shadow:none !important;
      word-break:normal !important;
      overflow-wrap:normal !important;
      text-wrap:balance !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero p,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero p {
      margin:0 !important;
      color:#655f55 !important;
      font-size:clamp(.98rem,1.15vw,1.1rem) !important;
      line-height:1.55 !important;
      word-break:normal !important;
      overflow-wrap:normal !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .logincard,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .logincard {
      display:block !important;
      margin:24px 0 0 !important;
      padding:24px 26px !important;
      box-sizing:border-box !important;
      border:1px solid rgba(112,87,39,.16) !important;
      border-radius:22px !important;
      background:rgba(255,255,255,.86) !important;
      box-shadow:0 22px 64px rgba(65,49,22,.10),inset 0 1px 0 rgba(255,255,255,.9) !important;
      backdrop-filter:blur(18px) saturate(115%) !important;
      -webkit-backdrop-filter:blur(18px) saturate(115%) !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .logincard h2,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .logincard h2 {
      margin:0 0 18px !important;
      color:#181713 !important;
      font-size:1.75rem !important;
      letter-spacing:-.035em !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .field,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field { margin-bottom:14px !important; }
    body.login-image-page.senior-product.nw-senior-login-composed .field label,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field label { color:#29251f !important; }
    body.login-image-page.senior-product.nw-senior-login-composed .field input,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field input {
      width:100% !important;
      min-height:50px !important;
      box-sizing:border-box !important;
      border-color:rgba(90,72,40,.2) !important;
      background:#fff !important;
      color:#1f1c17 !important;
    }

    body.login-image-page.senior-product.nw-senior-login-composed .status,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .status {
      border:1px solid rgba(137,103,42,.20) !important;
      border-left:4px solid #c99d43 !important;
      border-radius:12px !important;
      background:linear-gradient(145deg,#fffdf8,#f4ecdc) !important;
      color:#29251f !important;
      box-shadow:0 10px 26px rgba(92,68,28,.08) !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .status strong,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .status strong { color:#29251f !important; }
    body.login-image-page.senior-product.nw-senior-login-composed .mfa-step,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .mfa-step {
      border-top:1px solid rgba(112,87,39,.16) !important;
      color:#2b2720 !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .mfa-step .tiny,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .mfa-step .tiny,
    body.login-image-page.senior-product.nw-senior-login-composed #mfaHint,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed #mfaHint { color:#6b645a !important; }
    body.login-image-page.senior-product.nw-senior-login-composed .mfa-step .btn.light,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .mfa-step .btn.light {
      background:#f5efe4 !important;
      color:#29251f !important;
      border:1px solid rgba(120,91,39,.22) !important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.78),0 8px 20px rgba(74,55,23,.06) !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .mfa-step .btn.red,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .mfa-step .btn.red {
      background:linear-gradient(135deg,#e2c071,#c99d43) !important;
      color:#1d1810 !important;
      border:1px solid rgba(132,96,30,.25) !important;
      box-shadow:0 10px 24px rgba(157,116,38,.14) !important;
    }

    figure.nw-senior-login-portrait {
      position:relative !important;
      z-index:2 !important;
      min-width:0 !important;
      margin:0 !important;
      overflow:hidden !important;
      box-sizing:border-box !important;
      border:0 !important;
      border-radius:0 !important;
      background:#e8dfd2 !important;
      box-shadow:none !important;
      aspect-ratio:auto !important;
    }
    figure.nw-senior-login-portrait img {
      position:absolute !important;
      inset:0 !important;
      display:block !important;
      width:100% !important;
      height:100% !important;
      max-width:none !important;
      border:0 !important;
      border-radius:0 !important;
      object-fit:cover !important;
      object-position:68% 50% !important;
      transform:none !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .nw-senior-login-source-section,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .nw-senior-login-source-section { display:none !important; }

    @media(max-width:820px) {
      .nw-senior-login-copy { padding:38px 20px 32px !important; }
      body.login-image-page.senior-product.nw-senior-login-composed .hero h1,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero h1 {
        max-width:none !important;
        font-size:clamp(2.4rem,10.5vw,3.35rem) !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .logincard,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .logincard {
        padding:22px 20px !important;
        margin-top:24px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const important = (el, name, value) => el?.style?.setProperty(name, value, 'important');

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
    root.classList.remove('nw-product-booting');
    return true;
  };

  const syncSeniorLoginLayout = () => {
    if (product !== 'senioren' || !isLoginPage) return;
    const body = document.body;
    const hero = body?.querySelector('main .hero');
    const wrap = hero?.querySelector('.wrap');
    const copy = wrap?.querySelector('.nw-senior-login-copy');
    const portrait = wrap?.querySelector('.nw-senior-login-portrait');
    const image = portrait?.querySelector('img');
    if (!hero || !wrap || !copy || !portrait || !image) return;

    const width = Math.max(320, Math.round(window.innerWidth || document.documentElement.clientWidth || 320));
    const stacked = width < 820;

    important(wrap, 'padding', '0');
    important(wrap, 'box-sizing', 'border-box');
    important(copy, 'display', 'flex');
    important(copy, 'flex-direction', 'column');
    important(copy, 'align-items', 'stretch');
    important(copy, 'justify-content', 'flex-start');
    important(copy, 'gap', '0');
    important(copy, 'min-width', '0');
    important(copy, 'width', '100%');

    important(portrait, 'border', '0');
    important(portrait, 'border-radius', '0');
    important(portrait, 'box-shadow', 'none');
    important(portrait, 'overflow', 'hidden');
    important(image, 'position', 'absolute');
    important(image, 'inset', '0');
    important(image, 'width', '100%');
    important(image, 'height', '100%');
    important(image, 'border-radius', '0');
    important(image, 'object-fit', 'cover');
    important(image, 'object-position', '68% 50%');
    important(image, 'transform', 'none');

    if (stacked) {
      important(hero, 'display', 'flex');
      important(hero, 'align-items', 'stretch');
      important(hero, 'min-height', '0');
      important(hero, 'padding', '0');
      important(wrap, 'display', 'flex');
      important(wrap, 'flex-direction', 'column');
      important(wrap, 'width', '100%');
      important(wrap, 'max-width', 'none');
      important(wrap, 'gap', '0');
      important(copy, 'max-width', 'none');
      important(portrait, 'position', 'relative');
      important(portrait, 'width', '100%');
      important(portrait, 'max-width', 'none');
      important(portrait, 'height', 'clamp(360px,72vw,560px)');
      important(portrait, 'min-height', '0');
      important(portrait, 'margin', '0');
      important(portrait, 'aspect-ratio', 'auto');
      return;
    }

    const heroTop = Math.max(0, Math.round(hero.getBoundingClientRect().top + window.scrollY));
    const fillHeight = Math.max(700, Math.round(window.innerHeight - heroTop));

    important(hero, 'display', 'flex');
    important(hero, 'align-items', 'stretch');
    important(hero, 'min-height', `${fillHeight}px`);
    important(hero, 'padding', '0');
    important(wrap, 'display', 'grid');
    important(wrap, 'grid-template-columns', 'minmax(0, 1fr) minmax(0, 1fr)');
    important(wrap, 'width', '100%');
    important(wrap, 'max-width', 'none');
    important(wrap, 'gap', '0');
    important(wrap, 'align-items', 'stretch');
    important(copy, 'max-width', 'none');
    important(copy, 'align-self', 'stretch');

    important(portrait, 'position', 'relative');
    important(portrait, 'width', '100%');
    important(portrait, 'max-width', 'none');
    important(portrait, 'height', 'auto');
    important(portrait, 'min-height', `${fillHeight}px`);
    important(portrait, 'margin', '0');
    important(portrait, 'justify-self', 'stretch');
    important(portrait, 'align-self', 'stretch');
    important(portrait, 'aspect-ratio', 'auto');
  };

  const composeSeniorLogin = () => {
    if (product !== 'senioren' || !isLoginPage) return;
    const body = document.body;
    if (!body) return;

    if (body.dataset.nwSeniorLoginComposed !== '1') {
      const hero = body.querySelector('main .hero');
      const wrap = hero?.querySelector('.wrap');
      const form = body.querySelector('#loginForm');
      if (!hero || !wrap || !form) return;

      const sourceSection = form.closest('.section');
      const copy = document.createElement('div');
      copy.className = 'nw-senior-login-copy';
      Array.from(wrap.children).forEach((child) => copy.appendChild(child));
      copy.appendChild(form);

      const figure = document.createElement('figure');
      figure.className = 'nw-senior-login-portrait';
      const image = document.createElement('img');
      image.src = '/assets/lifestyle/senior-woman-overview.webp?v=6';
      image.alt = 'Ältere Frau nutzt zu Hause zufrieden ihr Smartphone';
      image.width = 960;
      image.height = 1200;
      image.loading = 'eager';
      image.decoding = 'async';
      image.fetchPriority = 'high';
      figure.appendChild(image);

      wrap.append(copy, figure);
      if (sourceSection) sourceSection.classList.add('nw-senior-login-source-section');
      body.classList.add('nw-senior-login-composed');
      body.dataset.nwSeniorLoginComposed = '1';
    }

    syncSeniorLoginLayout();
    requestAnimationFrame(syncSeniorLoginLayout);
    [60, 180, 500, 1200].forEach((delay) => setTimeout(syncSeniorLoginLayout, delay));
  };

  if (product && !applyProduct()) {
    const observer = new MutationObserver(() => {
      if (!applyProduct()) return;
      observer.disconnect();
    });
    observer.observe(root, { childList: true });
  }

  const onReady = () => {
    removeStrayHeadMarker();
    composeSeniorLogin();
    [0, 120, 500, 1500].forEach((delay) => setTimeout(removeStrayHeadMarker, delay));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once:true });
  } else {
    onReady();
  }

  if (product === 'senioren' && isLoginPage) {
    window.addEventListener('load', syncSeniorLoginLayout);
    window.addEventListener('resize', () => requestAnimationFrame(syncSeniorLoginLayout), { passive:true });
  }

  const supported = new Set(['en', 'tr']);
  const languageQuery = params.get('lang');
  let storedLanguage = null;
  try { storedLanguage = localStorage.getItem('nw_language'); } catch (_) {}
  const lang = supported.has(languageQuery)
    ? languageQuery
    : supported.has(storedLanguage)
      ? storedLanguage
      : null;

  if (lang) {
    root.classList.add('nw-locale-pending');
    setTimeout(() => root.classList.remove('nw-locale-pending'), 3000);
  }
})();