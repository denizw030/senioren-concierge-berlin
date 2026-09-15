(() => {
  const isCustomerAccount = /(?:^|\/)konto\.html$/.test(location.pathname);
  const isProdCustomerSurface = /(?:^|\/)(?:konto|payg|web-concierge)\.html$/.test(location.pathname);
  const PORTAL_THEME_KEY = 'nw_portal_theme_v1';

  const readPortalTheme = () => {
    try {
      const value = localStorage.getItem(PORTAL_THEME_KEY);
      return value === 'light' || value === 'dark' ? value : 'dark';
    } catch (_) {
      return 'dark';
    }
  };

  const applyPortalTheme = (theme) => {
    if (!isProdCustomerSurface) return;
    const normalized = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.nwPortalTheme = normalized;
    if (document.body) {
      document.body.classList.toggle('nw-portal-light', normalized === 'light');
      document.body.classList.toggle('nw-portal-dark', normalized === 'dark');
    }
  };

  applyPortalTheme(readPortalTheme());

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

    applyPortalTheme(readPortalTheme());

    const reception = document.getElementById("telephoneReceptionCard");
    if (reception) {
      reception.hidden = true;
      reception.setAttribute("aria-hidden", "true");
      reception.querySelectorAll("button,input,select,textarea").forEach((control) => {
        control.disabled = true;
        control.tabIndex = -1;
      });
    }

    const tabsShell = document.querySelector('.account-tabs-shell');
    if (tabsShell && !document.getElementById('nwPortalThemeSetting')) {
      const setting = document.createElement('section');
      setting.id = 'nwPortalThemeSetting';
      setting.className = 'nw-theme-setting';
      setting.setAttribute('aria-label', 'Darstellung der Weboberfläche');
      setting.innerHTML = `
        <div class="nw-theme-copy">
          <span class="eyebrow">Darstellung</span>
          <strong>Weboberfläche</strong>
          <span>Zwischen heller und dunkler Ansicht wechseln.</span>
        </div>
        <label class="nw-theme-toggle" for="nwPortalThemeToggle">
          <span class="nw-theme-option">Hell</span>
          <input id="nwPortalThemeToggle" type="checkbox" role="switch" aria-label="Dunkle Weboberfläche verwenden" />
          <span class="nw-theme-switch-track" aria-hidden="true"><span class="nw-theme-switch-thumb"></span></span>
          <span class="nw-theme-option">Dunkel</span>
        </label>
      `;
      tabsShell.insertAdjacentElement('afterend', setting);

      const toggle = setting.querySelector('#nwPortalThemeToggle');
      const syncToggle = () => {
        const theme = readPortalTheme();
        toggle.checked = theme === 'dark';
        toggle.setAttribute('aria-checked', String(toggle.checked));
      };
      syncToggle();
      toggle.addEventListener('change', () => {
        const next = toggle.checked ? 'dark' : 'light';
        try { localStorage.setItem(PORTAL_THEME_KEY, next); } catch (_) {}
        applyPortalTheme(next);
        toggle.setAttribute('aria-checked', String(toggle.checked));
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
    const skipPremiumPreview = /(?:^|\/)anmelden\.html$/.test(location.pathname) && new URLSearchParams(location.search).get('produkt') === 'senioren';
    if (!skipPremiumPreview && !document.querySelector('link[data-nw-premium-preview]')) {
      const premium = document.createElement('link');
      premium.rel = 'stylesheet';
      premium.href = '/assets/premium-preview.css?v=2';
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

// Shared header stability + account overview cleanup + portal appearance.
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

      .nw-theme-setting{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:24px;
        min-height:76px;
        margin:0 0 18px;
        padding:14px 17px;
        border:1px solid var(--account-line,rgba(173,190,214,.14));
        border-radius:16px;
        background:linear-gradient(145deg,rgba(14,19,27,.92),rgba(8,11,16,.94));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 18px 48px rgba(0,0,0,.12);
      }
      .nw-theme-copy{display:grid;gap:2px;min-width:0}
      .nw-theme-copy>.eyebrow{font-size:10px!important;margin:0!important}
      .nw-theme-copy>strong{font-size:15px;line-height:1.3}
      .nw-theme-copy>span:last-child{font-size:11.5px;line-height:1.45;color:var(--account-muted,#a4a9b2)}
      .nw-theme-toggle{display:inline-flex;align-items:center;gap:9px;flex:0 0 auto;cursor:pointer;user-select:none}
      .nw-theme-toggle input{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
      .nw-theme-option{font-size:11.5px;font-weight:700;color:var(--account-muted,#a4a9b2)}
      .nw-theme-switch-track{position:relative;width:50px;height:28px;flex:0 0 50px;border:1px solid rgba(214,182,107,.34);border-radius:999px;background:rgba(255,255,255,.11);transition:background .18s ease,border-color .18s ease}
      .nw-theme-switch-thumb{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#f5f1e8;box-shadow:0 2px 7px rgba(0,0,0,.28);transition:transform .18s cubic-bezier(.2,.8,.2,1)}
      .nw-theme-toggle input:checked+.nw-theme-switch-track{background:#d6b66b;border-color:#d6b66b}
      .nw-theme-toggle input:checked+.nw-theme-switch-track .nw-theme-switch-thumb{transform:translateX(22px);background:#16130d}
      .nw-theme-toggle input:focus-visible+.nw-theme-switch-track{outline:3px solid #ead49d;outline-offset:3px}

      body.account-premium-ui.nw-portal-light{
        --account-bg:#f7f3ea;
        --account-surface:#fffdf8;
        --account-surface-2:#f4eee3;
        --account-surface-3:#eee5d7;
        --account-line:rgba(74,59,34,.16);
        --account-line-strong:rgba(74,59,34,.24);
        --account-text:#1c1a16;
        --account-muted:#70695f;
        --account-gold:#a77d2d;
        --account-gold-soft:#8b6828;
        --line:rgba(74,59,34,.16);
        --muted:#70695f;
        color:#1c1a16!important;
        background:#f7f3ea!important;
        color-scheme:light!important;
      }
      body.account-premium-ui.nw-portal-light main,
      body.account-premium-ui.nw-portal-light .hero,
      body.account-premium-ui.nw-portal-light main>.section{
        background:radial-gradient(900px 520px at 92% 2%,rgba(196,157,79,.12),transparent 68%),linear-gradient(180deg,#fbf8f1 0%,#f7f3ea 54%,#f2ebdf 100%)!important;
        color:#1c1a16!important;
      }
      body.account-premium-ui.nw-portal-light .top{
        background:rgba(247,243,234,.94)!important;
        border-color:rgba(74,59,34,.14)!important;
        color:#252119!important;
      }
      body.account-premium-ui.nw-portal-light .top .links,
      body.account-premium-ui.nw-portal-light .top .links a,
      body.account-premium-ui.nw-portal-light .top .nw-account-link,
      body.account-premium-ui.nw-portal-light .top .nw-language-button,
      body.account-premium-ui.nw-portal-light .top .nw-account-logout{color:#393229!important}
      body.account-premium-ui.nw-portal-light .account-hero p,
      body.account-premium-ui.nw-portal-light .muted,
      body.account-premium-ui.nw-portal-light .privacy-note{color:#70695f!important}
      body.account-premium-ui.nw-portal-light .eyebrow{color:#8b6828!important}
      body.account-premium-ui.nw-portal-light :is(h1,h2,h3,strong,label,.value,.summary-card .value,.account-overview-link strong){color:#1c1a16!important}
      body.account-premium-ui.nw-portal-light :is(.account-setup-by,.managed-person-context,.managed-context-notice,.account-tabs-shell,.account-session-note,.dash>.card,.family-owner-panel,.access-panel,.account-overview-link,.profile-card,.concierge-panel,.safety-panel,.usage-panel,.reception-panel,.email-account-card,.nw-theme-setting){
        background:linear-gradient(145deg,rgba(255,255,255,.88),rgba(249,245,237,.94))!important;
        border-color:rgba(74,59,34,.16)!important;
        color:#1c1a16!important;
        box-shadow:0 16px 44px rgba(83,62,26,.07)!important;
      }
      body.account-premium-ui.nw-portal-light .account-tab{color:#71685c!important}
      body.account-premium-ui.nw-portal-light .account-tab:hover:not(:disabled){color:#2f2a22!important;background:rgba(110,87,43,.06)!important}
      body.account-premium-ui.nw-portal-light .account-tab[aria-selected="true"]{color:#201d18!important;background:#fff!important;box-shadow:inset 0 0 0 1px rgba(95,74,37,.12),0 5px 15px rgba(83,62,26,.07)!important}
      body.account-premium-ui.nw-portal-light .account-overview-link>span:last-child,
      body.account-premium-ui.nw-portal-light .account-panel-heading p,
      body.account-premium-ui.nw-portal-light .nw-theme-option,
      body.account-premium-ui.nw-portal-light .nw-theme-copy>span:last-child{color:#70695f!important}
      body.account-premium-ui.nw-portal-light input,
      body.account-premium-ui.nw-portal-light select,
      body.account-premium-ui.nw-portal-light textarea{
        border-color:rgba(74,59,34,.20)!important;
        background:#fff!important;
        color:#1c1a16!important;
      }
      body.account-premium-ui.nw-portal-light input::placeholder,
      body.account-premium-ui.nw-portal-light textarea::placeholder{color:#948b7f!important}
      body.account-premium-ui.nw-portal-light .prefchip{background:rgba(167,125,45,.08)!important;border-color:rgba(167,125,45,.16)!important;color:#7c5b20!important}
      body.account-premium-ui.nw-portal-light .profile-status,
      body.account-premium-ui.nw-portal-light .reception-status{background:rgba(167,125,45,.08)!important;border-color:rgba(167,125,45,.18)!important;color:#75571f!important}
      body.account-premium-ui.nw-portal-light .btn.light{color:#27231c!important;border-color:rgba(74,59,34,.28)!important}
      body.account-premium-ui.nw-portal-light .footer{background:#ece4d8!important;border-color:rgba(74,59,34,.15)!important;color:#3a342b!important}
      body.account-premium-ui.nw-portal-light .nw-theme-switch-track{background:#e8dfd0;border-color:rgba(120,91,38,.28)}

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
      @media(max-width:720px){
        .nw-theme-setting{align-items:flex-start;flex-direction:column;gap:12px}
        .nw-theme-toggle{width:100%;justify-content:flex-end}
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
