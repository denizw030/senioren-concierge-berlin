(() => {
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
  const ready = async () => {
    const a = await ensureAnalytics();
    void a?.track("page_view");
    document.addEventListener("click", (event) => {
      const el = event.target instanceof Element ? event.target.closest("a,button,[role='button']") : null;
      if (!el) return;
      const href = el.getAttribute("href") || "";
      const isPrimaryCta =
        el.classList.contains("btn") ||
        /registrieren|anmelden|pakete|kontakt|prime-concierge|senioren-concierge/.test(href);
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
