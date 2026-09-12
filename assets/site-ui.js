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
    script.src = 'assets/nahwerk-analytics.js?v=1';
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
      premium.href = 'assets/premium-preview.css?v=1';
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
