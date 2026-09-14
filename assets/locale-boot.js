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
    preload.href = '/assets/lifestyle/senior-woman-overview.webp?v=3';
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
      min-height:720px !important;
      padding:58px 0 64px !important;
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
      display:grid !important;
      grid-template-columns:minmax(0,1.12fr) minmax(340px,430px) !important;
      gap:clamp(42px,6vw,88px) !important;
      align-items:center !important;
      width:min(100% - 48px,1240px) !important;
      padding-right:0 !important;
    }
    .nw-senior-login-copy {
      min-width:0;
      max-width:680px;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero h1,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero h1 {
      max-width:680px !important;
      margin:12px 0 18px !important;
      color:#181713 !important;
      font-size:clamp(3rem,5vw,4.8rem) !important;
      line-height:.97 !important;
      letter-spacing:-.055em !important;
      text-shadow:none !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .hero p,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero p {
      max-width:630px !important;
      margin:0 !important;
      color:#655f55 !important;
      font-size:clamp(1rem,1.25vw,1.16rem) !important;
      line-height:1.62 !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .logincard,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .logincard {
      width:min(100%,560px) !important;
      margin:28px 0 0 !important;
      padding:28px 30px !important;
      border:1px solid rgba(112,87,39,.16) !important;
      border-left:1px solid rgba(112,87,39,.16) !important;
      border-radius:24px !important;
      background:rgba(255,255,255,.82) !important;
      box-shadow:0 22px 64px rgba(65,49,22,.10),inset 0 1px 0 rgba(255,255,255,.9) !important;
      backdrop-filter:blur(18px) saturate(115%) !important;
      -webkit-backdrop-filter:blur(18px) saturate(115%) !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .logincard h2,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .logincard h2 {
      margin:0 0 20px !important;
      color:#181713 !important;
      font-size:1.9rem !important;
      letter-spacing:-.035em !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .field label,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field label {
      color:#29251f !important;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .field input,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .field input {
      min-height:54px !important;
      border-color:rgba(90,72,40,.2) !important;
      background:#fff !important;
      color:#1f1c17 !important;
    }
    .nw-senior-login-portrait {
      position:relative;
      z-index:2;
      width:100%;
      margin:0;
      aspect-ratio:4/5;
      overflow:hidden;
      border:1px solid rgba(151,115,43,.2);
      border-radius:30px;
      background:#e8dfd2;
      box-shadow:0 30px 80px rgba(69,50,20,.16);
    }
    .nw-senior-login-portrait img {
      display:block;
      width:100%;
      height:100%;
      max-width:none;
      object-fit:cover;
      object-position:58% 50%;
      transform:scale(1.06) translateX(-2.5%);
      transform-origin:center;
    }
    body.login-image-page.senior-product.nw-senior-login-composed .nw-senior-login-source-section,
    body.login-image-page[data-product="senioren"].nw-senior-login-composed .nw-senior-login-source-section {
      display:none !important;
    }
    @media(max-width:900px) {
      body.login-image-page.senior-product.nw-senior-login-composed .hero,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero {
        min-height:0 !important;
        padding:52px 0 70px !important;
      }
      body.login-image-page.senior-product.nw-senior-login-composed .hero .wrap,
      body.login-image-page[data-product="senioren"].nw-senior-login-composed .hero .wrap {
        grid-template-columns:1fr !important;
        gap:38px !important;
        width:min(100% - 36px,720px) !important;
      }
      .nw-senior-login-copy { max-width:none; }
      .nw-senior-login-portrait {
        width:min(100%,520px);
        justify-self:center;
        aspect-ratio:4/3;
        border-radius:26px;
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
    image.src = '/assets/lifestyle/senior-woman-overview.webp?v=3';
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
