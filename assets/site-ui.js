(() => {
  const conciergeNames = { NILO: "Nilo", MIRA: "Mira", LENA: "Lena", LUKAS: "Lukas" };

  const syncAccountConcierge = () => {
    if (!/konto\.html$/.test(location.pathname)) return;
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem("scb_onboarding") || "null"); } catch (_) {}
    const raw = draft?.concierge_choice || draft?.conciergeChoice || "";
    const selected = conciergeNames[String(raw).toUpperCase()] || "Ihr gewählter Concierge";

    const heroTitle = document.querySelector(".hero h1");
    if (heroTitle) heroTitle.textContent = "Nutzung sehen und Ihren persönlichen Concierge einstellen.";
    const heroText = document.querySelector(".hero p");
    if (heroText) heroText.textContent = "Hier wird die monatliche Nutzung sichtbar. Ihr persönlicher Concierge kann außerdem an die unterstützte Person angepasst werden: Ansprache, Sprechtempo, Erklärstil und individuelle Wünsche.";

    const personalValue = document.querySelector(".personalize .value");
    if (personalValue) personalValue.textContent = `${selected} ist Ihr persönlicher KI-Concierge.`;
    const personalText = document.querySelector(".personalize .muted");
    if (personalText) personalText.textContent = `Stellen Sie ${selected} passend zur unterstützten Person ein. Neben festen Optionen können individuelle Wünsche frei beschrieben werden.`;

    document.querySelectorAll('a[href="concierge-anpassen.html"]').forEach((link) => {
      if (/Nilo oder Mira|Concierge und Einstellungen/.test(link.textContent)) link.textContent = `${selected} anpassen`;
    });
  };

  const ready = () => {
    if (!document.querySelector('.skip-link')) {
      const skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main-content';
      skip.textContent = 'Direkt zum Inhalt';
      document.body.prepend(skip);
    }
    const main = document.querySelector('main');
    if (main) main.id ||= 'main-content';
    document.querySelectorAll('main > section, .footer').forEach((el) => el.classList.add('reveal'));
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    } else document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));

    syncAccountConcierge();

    const nav = document.querySelector('.links');
    const toggle = document.querySelector('.nav-toggle');
    if (!nav || !toggle) return;
    const sync = () => {
      const open = nav.classList.contains('is-open');
      document.body.classList.toggle('menu-open', open);
      if (open) nav.querySelector('a')?.focus();
    };
    new MutationObserver(sync).observe(nav, { attributes:true, attributeFilter:['class'] });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !nav.classList.contains('is-open')) return;
      const items = [toggle, ...nav.querySelectorAll('a,button:not([disabled])')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(ready, 0));
})();
