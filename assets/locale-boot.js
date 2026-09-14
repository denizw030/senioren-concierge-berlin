(() => {
  'use strict';

  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const requestedProduct = String(params.get('produkt') || params.get('product') || '').toLowerCase();

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
    html.nw-product-senior-first-paint body.login-image-page .hero:after,
    body.login-image-page.senior-product .hero:after,
    body.login-image-page[data-product="senioren"] .hero:after {
      content:"" !important;
      display:block !important;
      visibility:visible !important;
      opacity:1 !important;
      background:#e9e1d5 center 38%/cover no-repeat url("/assets/lifestyle/senior-man-phone.webp?v=1") !important;
      border-color:rgba(112,87,39,.22) !important;
      box-shadow:0 30px 80px rgba(73,52,18,.18) !important;
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

  if (product && !applyProduct()) {
    const observer = new MutationObserver(() => {
      if (!applyProduct()) return;
      observer.disconnect();
    });
    observer.observe(root, { childList: true });
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
