(() => {
  'use strict';
  const supported = new Set(['en','tr']);
  const query = new URLSearchParams(location.search).get('lang');
  let stored = null;
  try { stored = localStorage.getItem('nw_language'); } catch (_) {}
  const lang = supported.has(query) ? query : supported.has(stored) ? stored : null;
  if (!lang) return;
  document.documentElement.classList.add('nw-locale-pending');
  const style = document.createElement('style');
  style.id = 'nw-locale-first-paint';
  style.textContent = 'html.nw-locale-pending{background:#070706}html.nw-locale-pending body{visibility:hidden}';
  document.head.appendChild(style);
  setTimeout(() => document.documentElement.classList.remove('nw-locale-pending'), 3000);
})();
