(() => {
  'use strict';

  const SUPPORTED = new Set(['de', 'en', 'tr']);
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

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
    return storedLang() || 'de';
  };

  const lang = detectLang();
  if (lang === 'de') return;

  try { localStorage.setItem('nw_language', lang); } catch (_) {}

  const hard = {
    en: {
      'Eine Marke von': 'A brand of',
      'Eine Marke von ODYSX': 'An ODYSX brand',
      'Markenhinweis': 'Brand notice',
      'Menü öffnen': 'Open menu',
      'Menü schließen': 'Close menu',
      'Kundenkonto öffnen': 'Open customer account',
      'Konto': 'Account',
      'Abmelden': 'Sign out',
      'Direkt zum Inhalt': 'Skip to content',
      'Persönliche NAHWERK Concierges für Senioren': 'Personal NAHWERK Concierges for seniors',
      'Persönliche NAHWERK Concierges': 'Personal NAHWERK Concierges',
      'Alexander-Profil schließen': 'Close Alexander profile',
      'Alexander – Telefon-Agent-Profil und Stimme öffnen': 'Open Alexander phone-agent profile and voice',
      'NAHWERK Telefon-Agent': 'NAHWERK Phone Agent',
      'Ruhig. Präzise. Diskret.': 'Calm. Precise. Discreet.',
      'Stimme': 'Voice',
      'Stimmbeispiel von Alexander': 'Alexander voice sample',
      'Externe Telefonaufträge': 'External phone tasks',
      'Restaurants, Behörden und Dienstleister': 'Restaurants, authorities and service providers',
      'Ruhige Gesprächsführung': 'Calm conversation handling',
      'Diskrete Unterstützung': 'Discreet support',
      'Strukturierte Rückfragen': 'Structured follow-up questions',
      'Anrufassistenz': 'Call assistance',
      'Alexander bleibt auch dann ruhig, wenn die Situation es gerade nicht ist.': 'Alexander stays calm even when the situation is not.',
      'Ideal für Menschen, die Unterstützung möchten, aber gut und gerne lesen, schreiben und sich mit NAHWERK über Text, WhatsApp, E-Mails und den direkten Austausch verständigen können.': 'Ideal for people who want support but can comfortably read and write and communicate with NAHWERK via text, WhatsApp, email and direct interaction.',
      'Persönlicher Concierge\'e hoş geldiniz.': 'Welcome to Personal Concierge.',
      'Senioren Concierge\'e hoş geldiniz.': 'Welcome to Senior Concierge.'
    },
    tr: {
      'Eine Marke von': 'ODYSX markası:',
      'Eine Marke von ODYSX': 'Bir ODYSX markası',
      'Markenhinweis': 'Marka bilgisi',
      'Menü öffnen': 'Menüyü aç',
      'Menü schließen': 'Menüyü kapat',
      'Kundenkonto öffnen': 'Müşteri hesabını aç',
      'Konto': 'Hesap',
      'Abmelden': 'Çıkış yap',
      'Direkt zum Inhalt': 'Doğrudan içeriğe geç',
      'Persönliche NAHWERK Concierges für Senioren': 'İleri yaştakiler için kişisel NAHWERK Concierge seçenekleri',
      'Persönliche NAHWERK Concierges': 'Kişisel NAHWERK Concierge seçenekleri',
      'Alexander-Profil schließen': 'Alexander profilini kapat',
      'Alexander – Telefon-Agent-Profil und Stimme öffnen': 'Alexander telefon ajanı profilini ve sesini aç',
      'NAHWERK Telefon-Agent': 'NAHWERK Telefon Ajanı',
      'Ruhig. Präzise. Diskret.': 'Sakin. Net. Ölçülü.',
      'Stimme': 'Ses',
      'Stimmbeispiel von Alexander': 'Alexander ses örneği',
      'Externe Telefonaufträge': 'Dış arama görevleri',
      'Restaurants, Behörden und Dienstleister': 'Restoranlar, kurumlar ve hizmet sağlayıcıları',
      'Ruhige Gesprächsführung': 'Sakin görüşme yönetimi',
      'Diskrete Unterstützung': 'Ölçülü destek',
      'Strukturierte Rückfragen': 'Yapılandırılmış takip soruları',
      'Anrufassistenz': 'Arama desteği',
      'Alexander bleibt auch dann ruhig, wenn die Situation es gerade nicht ist.': 'Durum sakin olmasa bile Alexander sakin kalır.',
      'Ideal für Menschen, die Unterstützung möchten, aber gut und gerne lesen, schreiben und sich mit NAHWERK über Text, WhatsApp, E-Mails und den direkten Austausch verständigen können.': 'Desteğe ihtiyaç duyan ancak rahatça okuyup yazabilen ve NAHWERK ile metin, WhatsApp, e-posta ve doğrudan iletişim üzerinden anlaşabilen kişiler için idealdir.',
      'Persönlicher Concierge\'e hoş geldiniz.': "Kişisel Concierge'e hoş geldiniz.",
      'Senioren Concierge\'e hoş geldiniz.': "İleri yaş Concierge'e hoş geldiniz."
    }
  };

  const productNames = {
    'Persönlicher Concierge': { en: 'Personal Concierge', tr: 'Kişisel Concierge' },
    'Senioren Concierge': { en: 'Senior Concierge', tr: 'İleri yaş Concierge' },
    'Prime Concierge': { en: 'Personal Concierge', tr: 'Kişisel Concierge' },
    'NAHWERK Concierge': { en: 'NAHWERK Concierge', tr: 'NAHWERK Concierge' }
  };

  let catalog = {};
  let busy = false;
  let scheduled = false;

  const localizedProduct = (value) => productNames[clean(value)]?.[lang] || clean(value);

  const translateDynamic = (value) => {
    const key = clean(value);
    if (!key) return value;
    if (catalog[key]) return catalog[key];
    if (hard[lang]?.[key]) return hard[lang][key];

    let match;
    if ((match = key.match(/^Willkommen bei (.+)\.$/))) {
      const product = localizedProduct(match[1]);
      return lang === 'tr' ? `${product}'e hoş geldiniz.` : `Welcome to ${product}.`;
    }
    if ((match = key.match(/^(.+)'e hoş geldiniz\.$/)) && lang === 'tr') {
      const product = localizedProduct(match[1]);
      return `${product}'e hoş geldiniz.`;
    }
    if ((match = key.match(/^Ich bin (.+), (?:dein|Ihr) persönlicher KI-Concierge\.$/))) {
      return lang === 'tr' ? `Ben ${match[1]}, kişisel yapay zekâ Concierge'inizim.` : `I am ${match[1]}, your personal AI Concierge.`;
    }
    if ((match = key.match(/^Nur nötig, wenn Sie (.+) selbst über WhatsApp nutzen\.$/))) {
      return lang === 'tr' ? `Yalnızca ${match[1]} adlı Concierge'i WhatsApp üzerinden kendiniz kullanacaksanız gereklidir.` : `Only required if you use ${match[1]} yourself via WhatsApp.`;
    }
    if ((match = key.match(/^Wen darf (.+) unterstützen\?$/))) {
      return lang === 'tr' ? `${match[1]} kimi desteklesin?` : `Who may ${match[1]} support?`;
    }
    if ((match = key.match(/^Was sollte (.+) am Anfang wissen\?$/))) {
      return lang === 'tr' ? `${match[1]} başlangıçta ne bilmeli?` : `What should ${match[1]} know at the beginning?`;
    }
    if ((match = key.match(/^Wie soll (.+) die unterstützte Person ansprechen\?$/))) {
      return lang === 'tr' ? `${match[1]} desteklenen kişiye nasıl hitap etsin?` : `How should ${match[1]} address the supported person?`;
    }
    if ((match = key.match(/^Standardmäßig deaktiviert\. (.+) kann zu vereinbarten Zeiten nachfragen, ob alles in Ordnung ist\.$/))) {
      return lang === 'tr' ? `Varsayılan olarak kapalıdır. ${match[1]} belirlenen zamanlarda her şeyin yolunda olup olmadığını sorabilir.` : `Off by default. ${match[1]} can check at agreed times whether everything is all right.`;
    }
    if ((match = key.match(/^Hallo (.+) 👋$/))) return lang === 'tr' ? `Merhaba ${match[1]} 👋` : `Hello ${match[1]} 👋`;
    if ((match = key.match(/^(.+) auswählen und registrieren$/))) return lang === 'tr' ? `${match[1]} seç ve kayıt ol` : `Choose ${match[1]} and register`;
    if ((match = key.match(/^(.+) anzeigen$/))) return lang === 'tr' ? `${match[1]} profilini göster` : `Show ${match[1]}`;
    if ((match = key.match(/^Sprache für die Hörprobe von (.+)$/))) return lang === 'tr' ? `${match[1]} ses örneği için dil` : `Language for ${match[1]}'s voice sample`;
    if ((match = key.match(/^(?:Teststimme|Stimme) von (.+) auf (.+) (anhören|stoppen)$/))) {
      if (lang === 'tr') return `${match[1]} sesini ${match[2]} dilinde ${match[3] === 'stoppen' ? 'durdur' : 'dinle'}`;
      return `Voice of ${match[1]} in ${match[2]} ${match[3] === 'stoppen' ? 'stop' : 'listen'}`;
    }
    return value;
  };

  const translateTextNode = (node) => {
    if (!node?.nodeValue) return;
    const parent = node.parentElement;
    if (!parent || parent.closest('[data-nw-language-switcher],[data-nw-app-language-switcher]')) return;
    const translated = translateDynamic(node.nodeValue);
    if (translated === node.nodeValue) return;
    const lead = node.nodeValue.match(/^\s*/)?.[0] || '';
    const tail = node.nodeValue.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${lead}${clean(translated)}${tail}`;
  };

  const translateTree = (root = document.body) => {
    if (!root) return;
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG']);
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
      if (!el?.getAttribute || el.closest?.('[data-nw-language-switcher],[data-nw-app-language-switcher]')) return;
      ['aria-label', 'title', 'placeholder', 'alt'].forEach((attr) => {
        const raw = el.getAttribute(attr);
        if (!raw) return;
        const translated = translateDynamic(raw);
        if (translated !== raw) el.setAttribute(attr, clean(translated));
      });
    });
  };

  const repairOdysxBar = () => {
    document.querySelectorAll('.odysx-info-bar').forEach((bar) => {
      bar.setAttribute('aria-label', lang === 'tr' ? 'Marka bilgisi' : 'Brand notice');
      const span = bar.querySelector('span');
      if (!span) return;
      span.innerHTML = lang === 'tr'
        ? 'Bir <strong>ODYSX</strong> markası'
        : 'An <strong>ODYSX</strong> brand';
    });
  };

  const apply = () => {
    if (busy) return;
    busy = true;
    try {
      document.documentElement.lang = lang;
      repairOdysxBar();
      translateTree(document.body);
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
    const urls = [
      `/locales/${lang}.json?v=3`,
      `/locales/${lang}-extra1.json?v=3`,
      `/locales/${lang}-extra2.json?v=3`,
      `/locales/${lang}-extra3.json?v=3`,
      `/locales/${lang}-auth1.json?v=3`,
      `/locales/${lang}-auth2.json?v=3`,
      `/locales/${lang}-auth3.json?v=3`,
      `/locales/${lang}-auth4.json?v=3`
    ];
    const parts = await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        return response.ok ? await response.json() : {};
      } catch (_) { return {}; }
    }));
    catalog = Object.assign({}, ...parts);
    apply();
  };

  const start = () => {
    apply();
    loadCatalog();
    if (document.body) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    addEventListener('pageshow', schedule, { passive: true });
    setTimeout(schedule, 0);
    setTimeout(schedule, 250);
    setTimeout(schedule, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
