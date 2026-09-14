(() => {
  const isCustomerAccount = /(?:^|\/)konto\.html$/.test(location.pathname);
  const isProdCustomerSurface = /(?:^|\/)(?:konto|payg|web-concierge)\.html$/.test(location.pathname);

  // Customer PROD surfaces must never call a known STAGING endpoint.
  if (isProdCustomerSurface && typeof window.fetch === "function") {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const raw = input instanceof Request ? input.url : String(input || "");
      let url = raw;
      try { url = new URL(raw, location.href).href; } catch (_) {}
      if (/staging/i.test(url)) {
        return Promise.reject(new TypeError("NAHWERK PROD web guard blocked a non-PROD endpoint."));
      }
      return nativeFetch(input, init);
    };
  }

  const analytics = () => window.NahwerkAnalytics;
  const ensureAnalytics = () => new Promise((resolve) => {
    if (analytics()) return resolve(analytics());
    const existing = document.querySelector('script[data-nw-analytics-client]');
    if (existing) {
      existing.addEventListener('load', () => resolve(analytics()), { once:true });
      existing.addEventListener('error', () => resolve(null), { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = '/assets/nahwerk-analytics.js?v=1';
    script.async = true;
    script.dataset.nwAnalyticsClient = 'true';
    script.onload = () => resolve(analytics());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  const prepareCustomerAccount = () => {
    if (!isCustomerAccount) return;

    const reception = document.getElementById("telephoneReceptionCard");
    if (reception) {
      reception.hidden = true;
      reception.setAttribute("aria-hidden", "true");
      reception.querySelectorAll("button,input,select,textarea").forEach((control) => {
        control.disabled = true;
        control.tabIndex = -1;
      });
    }

    const highlights = document.querySelector(".account-overview-highlights[data-account-panel='overview']");
    if (highlights && !document.getElementById("accountPaygEntry")) {
      const payg = document.createElement("a");
      payg.id = "accountPaygEntry";
      payg.className = "account-overview-link";
      payg.href = "payg.html";
      payg.setAttribute("aria-label", "PAYG – Bezahlen pro Auftrag öffnen");
      payg.innerHTML = '<span class="eyebrow">PAYG</span><strong>Bezahlen pro Auftrag</strong><span>Status, Zahlungsmethode und Kosten transparent anzeigen.</span>';
      highlights.appendChild(payg);
    }

    if (highlights && !document.getElementById("accountWebConciergeEntry")) {
      const concierge = document.createElement("a");
      concierge.id = "accountWebConciergeEntry";
      concierge.className = "account-overview-link";
      concierge.href = "web-concierge.html";
      concierge.setAttribute("aria-label", "Web Concierge öffnen");
      concierge.innerHTML = '<span class="eyebrow">Web Concierge</span><strong>Concierge im Kundenkonto</strong><span>Aktuelle PROD-Verfügbarkeit des persönlichen Webkanals ansehen.</span>';
      highlights.appendChild(concierge);
    }
  };

  const ready = async () => {
    prepareCustomerAccount();
    const a = await ensureAnalytics();
    void a?.track("page_view");
    document.addEventListener("click", (event) => {
      const el = event.target instanceof Element ? event.target.closest("a,button,[role='button']") : null;
      if (!el) return;
      const href = el.getAttribute("href") || "";
      const isPrimaryCta =
        el.classList.contains("btn") ||
        /registrieren|anmelden|pakete|kontakt|prime-concierge|senioren-concierge|payg|web-concierge/.test(href);
      if (!isPrimaryCta) return;
      void analytics()?.track("cta_click", {
        funnel_name: /registrieren/.test(href) ? "registration" : null,
        funnel_step: /registrieren/.test(href) ? "cta" : null
      });
    }, { passive: true });
    if (!document.querySelector('link[data-nw-premium-preview]')) {
      const premium = document.createElement('link');
      premium.rel = 'stylesheet';
      premium.href = '/assets/premium-preview.css?v=1';
      premium.dataset.nwPremiumPreview = 'true';
      document.head.append(premium);
    }

    if (!document.querySelector('.skip-link')) {
      const skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main-content';
      skip.textContent = 'Direkt zum Inhalt';
      document.body.prepend(skip);
    }

    const main = document.querySelector('main');
    if (main) main.id ||= 'main-content';

    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('loading') && !img.closest('.hero,.home-hero')) img.loading = 'lazy';
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
    });

    document.querySelectorAll('main > section, .footer').forEach((el) => el.classList.add('reveal'));
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    } else document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));

    const topHeader = document.querySelector('.top');
    if (topHeader && document.body.classList.contains('overview-page')) {
      let headerScrollFrame = 0;
      const syncHeaderScrollState = () => {
        headerScrollFrame = 0;
        document.body.classList.toggle('nw-header-scrolled', window.scrollY > 8);
      };
      const requestHeaderScrollSync = () => {
        if (headerScrollFrame) return;
        headerScrollFrame = requestAnimationFrame(syncHeaderScrollState);
      };
      syncHeaderScrollState();
      window.addEventListener('scroll', requestHeaderScrollSync, { passive: true });
    }

    const nav = document.querySelector('.links');
    const toggle = document.querySelector('.nav-toggle');
    if (!nav || !toggle) return;

    toggle.setAttribute('aria-controls', nav.id || 'site-navigation');
    nav.id ||= 'site-navigation';
    const sync = () => {
      const open = nav.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.remove('menu-open');
    };
    sync();
    new MutationObserver(sync).observe(nav, { attributes:true, attributeFilter:['class'] });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.focus();
        return;
      }
      if (event.key !== 'Tab' || !nav.classList.contains('is-open')) return;
      const items = [toggle, ...nav.querySelectorAll('a,button:not([disabled])')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(ready, 0));
})();

// Public homepage structured data. Isolated from customer/product runtime.
(() => {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/' && !/\/index\.html$/.test(path)) return;
  if (document.querySelector('script[data-nw-structured-data="v1"]')) return;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://nahwerkconcierge.com/#organization',
        name: 'NAHWERK Concierge',
        url: 'https://nahwerkconcierge.com/',
        logo: {
          '@type': 'ImageObject',
          url: 'https://nahwerkconcierge.com/assets/logos/nahwerk-concierge.png'
        }
      },
      {
        '@type': 'WebSite',
        '@id': 'https://nahwerkconcierge.com/#website',
        url: 'https://nahwerkconcierge.com/',
        name: 'NAHWERK Concierge',
        inLanguage: 'de-DE',
        publisher: { '@id': 'https://nahwerkconcierge.com/#organization' }
      },
      {
        '@type': 'Service',
        '@id': 'https://nahwerkconcierge.com/#personal-concierge',
        name: 'Persönlicher NAHWERK Concierge',
        serviceType: 'Persönlicher Concierge',
        url: 'https://nahwerkconcierge.com/prime-concierge.html',
        provider: { '@id': 'https://nahwerkconcierge.com/#organization' }
      }
    ]
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.nwStructuredData = 'v1';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
})();

// Shared header stability + account overview cleanup.
(() => {
  const STYLE_ID = 'nw-shell-stability-v1';
  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .top .nav,.home-reference .top .nav{position:relative!important}
      .top .nav-toggle{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;border-radius:10px!important}
      .nw-language-button{height:48px!important;min-height:48px!important;min-width:76px!important;padding:0 12px!important;border-radius:10px!important}
      .nw-account-link,.top .links .nw-account-link{height:48px!important;min-height:48px!important;padding:0 12px 0 7px!important;border-radius:10px!important}
      .nw-account-logout{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;border-radius:10px!important}
      .nw-account-cluster,.top .links .nw-account-cluster-desktop{gap:8px!important}
      body.account-premium-ui .person-summary[data-account-panel="overview"]{display:none!important}
      body.account-premium-ui #managedPersonContext.nw-managed-stabilizing:not(.nw-managed-ready){display:none!important}
      @media(min-width:1281px){
        .top .links,.home-reference .top .links{flex:1 1 auto!important}
        .top .links>.nw-language,.home-reference .top .links>.nw-language{margin-left:auto!important;margin-right:0!important}
        .top .links .nw-account-cluster-desktop{margin-left:8px!important}
      }
      @media(max-width:1280px){
        .top .nav-toggle{top:16px!important;right:clamp(10px,3vw,28px)!important}
        .top .nav>.nw-language,.home-reference .top .nav>.nw-language{top:16px!important;right:calc(clamp(10px,3vw,28px) + 58px)!important;margin:0!important}
        .top .nav>.nw-language .nw-language-button,.home-reference .top .nav>.nw-language .nw-language-button{height:48px!important;min-height:48px!important;padding:0 12px!important}
        .nw-account-cluster-mobile{top:16px!important;right:calc(clamp(10px,3vw,28px) + 144px)!important;transform:none!important;height:48px!important}
        .nw-account-mobile{height:48px!important;min-height:48px!important}
        .nw-account-cluster-mobile .nw-account-logout{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important}
      }
      @media(max-width:620px){
        .nw-account-cluster-mobile{right:calc(clamp(10px,3vw,28px) + 144px)!important}
        .nw-account-mobile{width:48px!important;min-width:48px!important;max-width:48px!important;padding:0!important;justify-content:center!important}
        .nw-account-mobile .nw-account-name{display:none!important}
        .nw-account-cluster-mobile .nw-account-logout{display:none!important}
      }
    `;
    document.head.appendChild(style);
  };

  const stabilizeAccount = () => {
    if (!/(?:^|\/)konto\.html$/.test(location.pathname)) return;

    document.querySelectorAll('.person-summary[data-account-panel="overview"]').forEach((element) => element.remove());

    const context = document.getElementById('managedPersonContext');
    if (!context || context.dataset.nwStabilityBound === '1') return;
    context.dataset.nwStabilityBound = '1';
    context.classList.add('nw-managed-stabilizing');

    const sync = () => {
      const select = context.querySelector('#personContextSelect');
      const values = new Set(
        select
          ? Array.from(select.options)
              .map((option) => String(option.value || '').trim())
              .filter(Boolean)
          : []
      );
      const ready = context.hidden === false && values.size > 1;
      context.classList.toggle('nw-managed-ready', ready);
    };

    sync();
    new MutationObserver(sync).observe(context, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden']
    });
    [0,100,300,800].forEach((delay) => setTimeout(sync, delay));
  };

  installStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stabilizeAccount, { once:true });
  } else {
    stabilizeAccount();
  }
  addEventListener('pageshow', stabilizeAccount, { once:true });
})();
