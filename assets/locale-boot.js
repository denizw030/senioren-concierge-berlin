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
    preload.href = '/assets/lifestyle/senior-woman-overview.webp?v=4';
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
    html.nw-product-booting body {
      visibility:hidden !important;
    }
    html.nw-locale-pending.nw-product-senior-first-paint {
      background:#f7f3ea !important;
    }
    html.nw-locale-pending:not(.nw-product-senior-first-paint) {
      background:#070706 !important;
    }
    html.nw-locale-pending body {
      visibility:hidden !important;
    }

    body.login-image-page.senior-product.nw-senior-login-composed,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed {
      background:#f7f3ea !important;
      color:#181713 !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero {
      position:relative !important;
      min-height:760px !important;
      padding:52px 0 58px !important;
      background:
        radial-gradient(760px 520px at 85% 28%,rgba(200,164,93,.18),transparent 66%),
        radial-gradient(640px 440px at 7% 18%,rgba(255,255,255,.72),transparent 64%),
        linear-gradient(145deg,#fbf8f1 0%,#f3eddf 58%,#e9deca 100%) !important;
      border-bottom:1px solid rgba(112,87,39,.14) !important;
      overflow:hidden !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero:after,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero:after {
      display:none !important;
      content:none !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero .wrap,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero .wrap {
      position:relative !important;
      display:block !important;
      width:min(calc(100% - 48px),1240px) !important;
      max-width:1240px !important;
      margin:0 auto !important;
      padding:0 clamp(355px,34vw,445px) 0 0 !important;
      box-sizing:border-box !important;
    }
    .nw-senior-login-copy {
      position:relative !important;
      z-index:3 !important;
      display:block !important;
      width:100% !important;
      max-width:650px !important;
      min-width:0 !important;
      box-sizing:border-box !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero h1,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero h1 {
      width:auto !important;
      max-width:620px !important;
      margin:10px 0 14px !important;
      color:#181713 !important;
      font-size:clamp(2.7rem,4.4vw,4.45rem) !important;
      line-height:.98 !important;
      letter-spacing:-.055em !important;
      text-shadow:none !important;
      word-break:normal !important;
      overflow-wrap:normal !important;
      text-wrap:balance !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero p,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero p {
      width:auto !important;
      max-width:600px !important;
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
      width:min(100%,560px) !important;
      max-width:560px !important;
      margin:22px 0 0 !important;
      padding:24px 26px !important;
      box-sizing:border-box !important;
      border:1px solid rgba(112,87,39,.16) !important;
      border-left:1px solid rgba(112,87,39,.16) !important;
      border-radius:22px !important;
      background:rgba(255,255,255,.84) !important;
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
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field {
      margin-bottom:14px !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .field label,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field label {
      color:#29251f !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .field input,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field input {
      width:100% !important;
      min-height:50px !important;
      border-color:rgba(90,72,40,.2) !important;
      background:#fff !important;
      color:#1f1c17 !important;
      box-sizing:border-box !important;
    }
    .nw-senior-login-portrait {
      position:absolute !important;
      z-index:2 !important;
      top:50% !important;
      right:0 !important;
      width:clamp(315px,31vw,410px) !important;
      max-width:410px !important;
      margin:0 !important;
      aspect-ratio:4/5 !important;
      transform:translateY(-50%) !important;
      overflow:hidden !important;
      box-sizing:border-box !important;
      border:1px solid rgba(151,115,43,.2) !important;
      border-radius:30px !important;
      background:#e8dfd2 !important;
      box-shadow:0 30px 80px rgba(69,50,20,.16) !important;
    }
    .nw-senior-login-portrait img {
      display:block !important;
      width:100% !important;
      height:100% !important;
      max-width:none !important;
      object-fit:cover !important;
      object-position:58% 50% !important;
      transform:scale(1.06) translateX(-2.5%) !important;
      transform-origin:center !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .nw-senior-login-source-section,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .nw-senior-login-source-section {
      display:none !important;
    }

    @media(max-width:1050px) and (min-width:721px) {
      body.login-image-page.senior-product.nw-senior-login-composed .hero,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero {
        min-height:720px !important;
        padding:44px 0 50px !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .hero .wrap,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero .wrap {
        width:min(calc(100% - 36px),980px) !important;
        padding-right:310px !important;
      }
      .nw-senior-login-copy {
        max-width:560px !important;
      }
      .nw-senior-login-portrait {
        width:280px !important;
        max-width:280px !important;
        border-radius:26px !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .hero h1,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero h1 {
        font-size:clamp(2.55rem,5.2vw,3.6rem) !important;
      }
    }

    @media(max-width:720px) {
      body.login-image-page.senior-product.nw-senior-login-composed .hero,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero {
        min-height:0 !important;
        padding:42px 0 54px !important;
        overflow:visible !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .hero .wrap,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero .wrap {
        display:flex !important;
        flex-direction:column !important;
        gap:30px !important;
        width:min(calc(100% - 32px),620px) !important;
        padding:0 !important;
      }
      .nw-senior-login-copy {
        width:100% !important;
        max-width:none !important;
      }
      .nw-senior-login-portrait {
        position:relative !important;
        top:auto !important;
        right:auto !important;
        width:min(100%,460px) !important;
        max-width:460px !important;
        aspect-ratio:4/3 !important;
        margin:0 auto !important;
        transform:none !important;
        border-radius:24px !important;
        order:2 !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .hero h1,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero h1 {
        max-width:none !important;
        font-size:clamp(2.5rem,11vw,3.5rem) !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .hero p,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero p {
        max-width:none !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .logincard,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .logincard {
        width:100% !important;
        max-width:none !important;
        margin-top:20px !important;
        padding:22px 20px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const applyProduct = () => {
    const body = document.body;
    if (!body || !product) return false;

    body.dataset.product = product;
    if (product === 'senioren') body.classList.add('senior-product');
    else body.classList.remove('senior-product');

    root.classList.remove('nw-product-booting');
    return true;
  };

  const composeSeniorLogin = () => {
    if (product !== 'senioren' || !isLoginPage) return;
    const body = document.body;
    if (!body || body.dataset.nwSeniorLoginComposed === '1') return;

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
    image.src = '/assets/lifestyle/senior-woman-overview.webp?v=4';
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
  };

  if (product && !applyProduct()) {
    const observer = new MutationObserver(() => {
      if (!applyProduct()) return;
      observer.disconnect();
    });
    observer.observe(root, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', composeSeniorLogin, { once:true });
  } else {
    composeSeniorLogin();
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
