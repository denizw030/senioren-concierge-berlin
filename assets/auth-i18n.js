(() => {
  'use strict';

  const PUBLIC_PAGES = new Set([
    'index.html','prime-concierge.html','safety.html','angehoerige.html',
    'telefonannahme.html','pakete.html','leistungen.html','ablauf.html','faq.html',
    'kontakt.html','concierges.html','senioren-concierge.html','alltag-organisieren.html',
    'dokumente-verstehen.html','technik-verstehen.html','ueber-mich.html'
  ]);
  const APP_PAGES = new Set([
    'registrieren.html','anmelden.html','passwort-zuruecksetzen.html','erster-schritt.html',
    'konto.html','payg.html','web-concierge.html','concierge-anpassen.html'
  ]);
  const SUPPORTED = new Set(['de','en','tr']);

  const basename = (pathname = location.pathname) => pathname.split('/').filter(Boolean).pop() || 'index.html';
  const referrerLang = () => {
    try {
      const url = new URL(document.referrer);
      const first = url.pathname.split('/').filter(Boolean)[0];
      return first === 'en' || first === 'tr' ? first : null;
    } catch (_) { return null; }
  };
  const storedLang = () => {
    try {
      const value = localStorage.getItem('nw_language');
      return SUPPORTED.has(value) ? value : null;
    } catch (_) { return null; }
  };
  const detectLang = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'en' || parts[0] === 'tr') return parts[0];
    const query = new URLSearchParams(location.search).get('lang');
    if (query === 'en' || query === 'tr') return query;
    return referrerLang() || storedLang() || 'de';
  };

  const lang = detectLang();
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  let catalog = {};
  let busy = false;
  let scheduled = false;

  const publicHref = (targetLang, page, suffix = '') => {
    if (targetLang === 'de') return page === 'index.html' ? `/${suffix}` : `/${page}${suffix}`;
    return page === 'index.html' ? `/${targetLang}/${suffix}` : `/${targetLang}/${page}${suffix}`;
  };

  const appHref = (targetLang, raw) => {
    const url = new URL(raw, location.origin + '/');
    if (targetLang === 'de') url.searchParams.delete('lang');
    else url.searchParams.set('lang', targetLang);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const hrefFor = (raw, targetLang = lang) => {
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(raw)) return raw;
    let url;
    try { url = new URL(raw, location.href); } catch (_) { return raw; }
    if (url.origin !== location.origin) return raw;
    const page = basename(url.pathname);
    if (PUBLIC_PAGES.has(page)) {
      const suffix = `${url.search}${url.hash}`;
      return publicHref(targetLang, page, suffix);
    }
    if (APP_PAGES.has(page)) return appHref(targetLang, `${url.pathname}${url.search}${url.hash}`);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const translateDynamic = (value) => {
    const key = clean(value);
    if (!key) return value;
    if (catalog[key]) return catalog[key];
    let m;
    if ((m = key.match(/^Nur nötig, wenn Sie (.+) selbst über WhatsApp nutzen\.$/))) {
      return lang === 'tr' ? `Yalnızca ${m[1]} adlı Concierge'i WhatsApp üzerinden kendiniz kullanacaksanız gereklidir.` : `Only required if you use ${m[1]} yourself via WhatsApp.`;
    }
    if ((m = key.match(/^Wen darf (.+) unterstützen\?$/))) {
      return lang === 'tr' ? `${m[1]} kimi desteklesin?` : `Who may ${m[1]} support?`;
    }
    if ((m = key.match(/^Was sollte (.+) am Anfang wissen\?$/))) {
      return lang === 'tr' ? `${m[1]} başlangıçta ne bilmeli?` : `What should ${m[1]} know at the beginning?`;
    }
    if ((m = key.match(/^Wie soll (.+) die unterstützte Person ansprechen\?$/))) {
      return lang === 'tr' ? `${m[1]} desteklenen kişiye nasıl hitap etsin?` : `How should ${m[1]} address the supported person?`;
    }
    if ((m = key.match(/^Standardmäßig deaktiviert\. (.+) kann zu vereinbarten Zeiten nachfragen, ob alles in Ordnung ist\.$/))) {
      return lang === 'tr' ? `Varsayılan olarak kapalıdır. ${m[1]} belirlenen zamanlarda her şeyin yolunda olup olmadığını sorabilir.` : `Off by default. ${m[1]} can check at agreed times whether everything is all right.`;
    }
    if ((m = key.match(/^Hallo (.+) 👋$/))) return lang === 'tr' ? `Merhaba ${m[1]} 👋` : `Hello ${m[1]} 👋`;
    if ((m = key.match(/^Willkommen bei (.+)\.$/))) return lang === 'tr' ? `${m[1]}'e hoş geldiniz.` : `Welcome to ${m[1]}.`;
    if ((m = key.match(/^Ich bin (.+), (?:dein|Ihr) persönlicher KI-Concierge\.$/))) return lang === 'tr' ? `Ben ${m[1]}, kişisel yapay zekâ Concierge'inizim.` : `I am ${m[1]}, your personal AI Concierge.`;
    if ((m = key.match(/^(.+) hat diesen Zugang für (?:dich|Sie) eingerichtet\.$/))) return lang === 'tr' ? `${m[1]} bu erişimi sizin için kurdu.` : `${m[1]} set up this access for you.`;
    if ((m = key.match(/^Persönliche Nachricht von (.+):$/))) return lang === 'tr' ? `${m[1]} tarafından kişisel mesaj:` : `Personal message from ${m[1]}:`;
    if ((m = key.match(/^(.+) ist ausgewählt\.$/))) return lang === 'tr' ? `${m[1]} seçildi.` : `${m[1]} is selected.`;
    if ((m = key.match(/^(.+) ausgewählt · Checkout folgt$/))) return lang === 'tr' ? `${m[1]} seçildi · Ödeme yakında` : `${m[1]} selected · Checkout coming soon`;
    return value;
  };

  const translateTextNode = (node) => {
    if (!node?.nodeValue) return;
    const translated = translateDynamic(node.nodeValue);
    if (translated === node.nodeValue) return;
    const lead = node.nodeValue.match(/^\s*/)?.[0] || '';
    const tail = node.nodeValue.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${lead}${clean(translated)}${tail}`;
  };

  const translateTree = (root = document.body) => {
    if (!root || lang === 'de') return;
    const skip = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG']);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && !skip.has(node.parentElement.tagName)
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);

    const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [...document.querySelectorAll('*')];
    elements.forEach((el) => {
      if (!el?.getAttribute) return;
      ['aria-label','title','placeholder','alt'].forEach((attr) => {
        const raw = el.getAttribute(attr);
        if (!raw) return;
        const translated = translateDynamic(raw);
        if (translated !== raw) el.setAttribute(attr, clean(translated));
      });
    });

    const translatedTitle = translateDynamic(document.title);
    if (translatedTitle !== document.title) document.title = clean(translatedTitle);
  };

  const rewriteLinks = () => {
    if (lang === 'de') return;
    document.querySelectorAll('a[href]').forEach((link) => {
      const raw = link.getAttribute('href') || '';
      const fixed = hrefFor(raw, lang);
      if (fixed && fixed !== raw) link.setAttribute('href', fixed);
    });
  };

  const normalizeCurrentUrl = () => {
    const page = basename();
    if (!APP_PAGES.has(page) || lang === 'de') return;
    const url = new URL(location.href);
    if (url.searchParams.get('lang') !== lang) {
      url.searchParams.set('lang', lang);
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  };

  const apply = () => {
    if (busy) return;
    busy = true;
    try {
      normalizeCurrentUrl();
      document.documentElement.lang = lang;
      translateTree(document.body);
      rewriteLinks();
    } finally { busy = false; }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  const loadCatalog = async () => {
    if (lang === 'de') return;
    try {
      const response = await fetch(`/locales/${lang}-auth.json?v=1`, { cache: 'no-cache' });
      if (response.ok) catalog = await response.json();
    } catch (_) {}
    apply();
  };

  try { localStorage.setItem('nw_language', lang); } catch (_) {}
  window.NAHWERKLocale = {
    lang,
    href: (raw) => hrefFor(raw, lang),
    t: (value) => clean(translateDynamic(value))
  };

  const start = () => {
    normalizeCurrentUrl();
    loadCatalog();
    apply();
    if (document.body) new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, characterData:true });
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('a[href]');
      if (!link || lang === 'de') return;
      const raw = link.getAttribute('href') || '';
      const fixed = hrefFor(raw, lang);
      if (fixed && fixed !== raw) link.setAttribute('href', fixed);
    }, true);
    setTimeout(schedule, 0);
    setTimeout(schedule, 250);
    setTimeout(schedule, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();