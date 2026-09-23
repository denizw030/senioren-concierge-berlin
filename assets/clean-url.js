(() => {
  'use strict';

  const cleanPath = (pathname) => {
    if (!pathname) return pathname;
    if (pathname === '/index.html') return '/de/';
    const localeIndex = pathname.match(/^\/(de|en|tr)\/index\.html\/?$/i);
    if (localeIndex) return `/${localeIndex[1].toLowerCase()}/`;
    if (pathname === '/404.html') return pathname;
    return pathname.replace(/\/([^/]+)\.html\/?$/i, '/$1');
  };

  const isLegacyHtml = (pathname) =>
    /\/(?!404\.html(?:$|\/))[^/]+\.html\/?$/i.test(pathname || '');

  const targetPath = cleanPath(location.pathname);

  if (isLegacyHtml(location.pathname) && targetPath !== location.pathname) {
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.prepend(robots);
    }
    robots.content = 'noindex,follow';

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = new URL(targetPath, location.origin).href;
  }

  if (targetPath !== location.pathname) {
    location.replace(`${targetPath}${location.search}${location.hash}`);
    return;
  }

  const cleanInternalUrl = (raw) => {
    if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return raw;
    let url;
    try { url = new URL(raw, location.href); } catch (_) { return raw; }
    if (url.origin !== location.origin) return raw;
    const nextPath = cleanPath(url.pathname);
    if (nextPath === url.pathname) return raw;
    return `${nextPath}${url.search}${url.hash}`;
  };

  const repair = (root = document) => {
    root.querySelectorAll?.('a[href],link[href]').forEach((node) => {
      const raw = node.getAttribute('href');
      const clean = cleanInternalUrl(raw);
      if (clean !== raw) node.setAttribute('href', clean);
    });
    root.querySelectorAll?.('form[action]').forEach((node) => {
      const raw = node.getAttribute('action');
      const clean = cleanInternalUrl(raw);
      if (clean !== raw) node.setAttribute('action', clean);
    });
  };

  const start = () => {
    repair();
    new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) repair(node);
        });
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
