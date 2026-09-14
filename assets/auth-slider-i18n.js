(() => {
  'use strict';

  const queryLang = new URLSearchParams(location.search).get('lang');
  let storedLang = null;
  try { storedLang = localStorage.getItem('nw_language'); } catch (_) {}
  const lang = queryLang === 'tr' || queryLang === 'en' ? queryLang : storedLang === 'tr' || storedLang === 'en' ? storedLang : 'de';
  if (lang === 'de') return;

  const common = {
    'Die Hörprobe startet in der Herkunftssprache. Die Sprache können Sie direkt darunter wechseln.': {
      tr: 'Ses örneği Concierge\'in ana dilinde başlar. Dili hemen aşağıdan değiştirebilirsiniz.',
      en: "The voice sample starts in the Concierge's native language. You can change the language directly below."
    },
    'Die Hörprobe ist noch nicht final freigegeben.': { tr: 'Ses örneği henüz nihai olarak onaylanmadı.', en: 'The voice sample has not yet received final approval.' },
    'Stimme anhören': { tr: 'Sesi dinle', en: 'Listen to voice' },
    'Wird geladen': { tr: 'Yükleniyor', en: 'Loading' },
    'Stoppen': { tr: 'Durdur', en: 'Stop' },
    'Nicht verfügbar': { tr: 'Kullanılamıyor', en: 'Unavailable' },
    'Sprache': { tr: 'Dil', en: 'Language' },
    'Ausgewählt': { tr: 'Seçildi', en: 'Selected' },
    'Registrieren': { tr: 'Kayıt ol', en: 'Register' },
    'KI-Concierge auswählen': { tr: 'Yapay zekâ Concierge seç', en: 'Choose AI Concierge' },
    'Vorherigen Concierge anzeigen': { tr: "Önceki Concierge'i göster", en: 'Show previous Concierge' },
    'Nächsten Concierge anzeigen': { tr: "Sonraki Concierge'i göster", en: 'Show next Concierge' },
    'Warm, ruhig, modern und strukturiert.': { tr: 'Sıcak, sakin, modern ve düzenli.', en: 'Warm, calm, modern and structured.' },
    'Jung, elegant, warm und aufmerksam.': { tr: 'Genç, zarif, sıcak ve dikkatli.', en: 'Young, elegant, warm and attentive.' },
    'Lebendig, jung, warm und herzlich.': { tr: 'Canlı, genç, sıcak ve samimi.', en: 'Lively, young, warm and welcoming.' },
    'Warm, empathisch, natürlich und zugänglich.': { tr: 'Sıcak, empatik, doğal ve ulaşılabilir.', en: 'Warm, empathetic, natural and approachable.' },
    'Souverän, ruhig, direkt und modern.': { tr: 'Kendinden emin, sakin, doğrudan ve modern.', en: 'Confident, calm, direct and modern.' },
    'Tief, voll, erfahren, würdevoll und ruhig.': { tr: 'Derin, dolgun, deneyimli, ağırbaşlı ve sakin.', en: 'Deep, full, experienced, dignified and calm.' },
    'Reif, warm, würdevoll, ruhig und nicht gebrechlich.': { tr: 'Olgun, sıcak, ağırbaşlı, sakin ve dinç.', en: 'Mature, warm, dignified, calm and strong.' },
    'Elegant, modern, kultiviert und präzise.': { tr: 'Zarif, modern, kültürlü ve net.', en: 'Elegant, modern, cultivated and precise.' },
    'Warm, praktisch, klar und zuverlässig.': { tr: 'Sıcak, pratik, net ve güvenilir.', en: 'Warm, practical, clear and reliable.' },
    'Ruhig, warm, modern und einfühlsam.': { tr: 'Sakin, sıcak, modern ve duyarlı.', en: 'Calm, warm, modern and empathetic.' },
    'Elegant, selbstbewusst, warm und modern.': { tr: 'Zarif, özgüvenli, sıcak ve modern.', en: 'Elegant, confident, warm and modern.' },
    'Jung, hell-modern, warm und selbstbewusst.': { tr: 'Genç, aydınlık ve modern, sıcak ve özgüvenli.', en: 'Young, bright and modern, warm and confident.' },
    'Geerdet, warm, souverän und analytisch.': { tr: 'Ayakları yere basan, sıcak, kendinden emin ve analitik.', en: 'Grounded, warm, confident and analytical.' },
    'Sanft-modern, freundlich und aufmerksam.': { tr: 'Yumuşak ve modern, dostça ve dikkatli.', en: 'Soft and modern, friendly and attentive.' },
    'Ruhig, elegant, diskret und aufmerksam.': { tr: 'Sakin, zarif, ölçülü ve dikkatli.', en: 'Calm, elegant, discreet and attentive.' },
    'Ruhig, präzise, modern und bedacht.': { tr: 'Sakin, net, modern ve düşünceli.', en: 'Calm, precise, modern and thoughtful.' },
    'Ruhig, kultiviert, zurückhaltend und präzise.': { tr: 'Sakin, kültürlü, ölçülü ve net.', en: 'Calm, cultivated, reserved and precise.' },
    'Jung, freundlich, klar und modern.': { tr: 'Genç, dostça, net ve modern.', en: 'Young, friendly, clear and modern.' },
    'Ruhig, modern, männlich und präzise.': { tr: 'Sakin, modern, maskülen ve net.', en: 'Calm, modern, masculine and precise.' },
    'Warm, souverän, modern und herzlich.': { tr: 'Sıcak, kendinden emin, modern ve samimi.', en: 'Warm, confident, modern and welcoming.' },
    'Geerdet, ruhig, warm und souverän.': { tr: 'Ayakları yere basan, sakin, sıcak ve kendinden emin.', en: 'Grounded, calm, warm and confident.' },
    'Modern, lebendig, warm und aufmerksam.': { tr: 'Modern, canlı, sıcak ve dikkatli.', en: 'Modern, lively, warm and attentive.' },
    'Selbstbewusst, ruhig, direkt und zuverlässig.': { tr: 'Özgüvenli, sakin, doğrudan ve güvenilir.', en: 'Confident, calm, direct and reliable.' }
  };

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const t = (value) => common[clean(value)]?.[lang] || value;

  const translateDynamicAttr = (value) => {
    const raw = clean(value);
    let m;
    if ((m = raw.match(/^(?:Teststimme|Stimme) von (.+) auf (.+) (?:anhören|stoppen)$/))) {
      return lang === 'tr' ? `${m[1]} sesini ${m[2]} dilinde ${raw.endsWith('stoppen') ? 'durdur' : 'dinle'}` : `${raw.startsWith('Teststimme') ? 'Test voice' : 'Voice'} of ${m[1]} in ${m[2]} ${raw.endsWith('stoppen') ? 'stop' : 'listen'}`;
    }
    if ((m = raw.match(/^Sprache für die Hörprobe von (.+)$/))) return lang === 'tr' ? `${m[1]} ses örneği için dil` : `Language for ${m[1]}'s voice sample`;
    if ((m = raw.match(/^(.+) anzeigen$/))) return lang === 'tr' ? `${m[1]} profilini göster` : `Show ${m[1]}`;
    if ((m = raw.match(/^(.+) auswählen und registrieren$/))) return lang === 'tr' ? `${m[1]} seç ve kayıt ol` : `Choose ${m[1]} and register`;
    return t(value);
  };

  let busy = false;
  const apply = () => {
    if (busy) return;
    busy = true;
    try {
      document.querySelectorAll('.nw-carousel, .nw-voice-preview-control').forEach((root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
          const translated = t(node.nodeValue);
          if (translated === node.nodeValue) return;
          const lead = node.nodeValue.match(/^\s*/)?.[0] || '';
          const tail = node.nodeValue.match(/\s*$/)?.[0] || '';
          node.nodeValue = `${lead}${clean(translated)}${tail}`;
        });
        root.querySelectorAll('*').forEach((el) => {
          ['aria-label','title'].forEach((attr) => {
            const raw = el.getAttribute(attr);
            if (!raw) return;
            const translated = translateDynamicAttr(raw);
            if (translated !== raw) el.setAttribute(attr, translated);
          });
        });
      });
    } finally { busy = false; }
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  };

  const start = () => {
    apply();
    if (document.body) new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, characterData:true });
    setTimeout(schedule, 0);
    setTimeout(schedule, 250);
    setTimeout(schedule, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
