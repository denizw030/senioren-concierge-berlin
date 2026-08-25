(() => {
  const updateProductCopy = () => {
    const page = location.pathname.split('/').pop() || 'index.html';

    if (page === 'registrieren.html') {
      const planName = document.getElementById('selectedPlanName');
      const benefits = document.getElementById('selectedPlanBenefits');
      if (planName && /FREE/i.test(planName.textContent || '')) planName.textContent = 'FREE · 0 € / MONAT';
      if (benefits && /30 Dialoge|15 Dialoge|FREE/i.test(benefits.textContent || '')) {
        benefits.innerHTML = [
          '<li><strong>10 Dialoge pro Monat</strong></li>',
          '<li>1 Bildgenerierung pro Monat</li>',
          '<li>1 Foto-/Dokument-Digitalisierung pro Monat</li>',
          '<li>Direkt über WhatsApp</li>',
          '<li>Text- und Sprachnachrichten</li>',
          '<li>Persönliche Ansprache und hilfreiche Präferenzen</li>',
          '<li>Dauerhaft kostenlos und keine automatische kostenpflichtige Umwandlung</li>'
        ].join('');
      }

      const preview = document.getElementById('messagePreview');
      if (preview) {
        preview.innerHTML = '<strong>Hallo 👋</strong><br><br>Willkommen bei NAHWERK Concierge.<br><br>Ich bin dein digitaler KI-Concierge und unterstütze dich direkt über WhatsApp bei Alltag, Organisation, Technik, Fotos, Dokumenten und Erinnerungen.<br><br>Du kannst schreiben oder eine Sprachnachricht senden. Die tatsächliche Ansprache richtet sich nach deiner Einstellung.';
      }

      const trust = document.querySelector('.trustline span');
      if (trust) trust.textContent = 'Wie Daten verarbeitet und geschützt werden, erklären wir transparent in der Datenschutzerklärung.';

      const safetyRow = document.getElementById('safetyToggleRow');
      const safetyLabel = safetyRow?.querySelector('span');
      if (safetyLabel) safetyLabel.innerHTML = '<strong>Freiwillige Check-ins einrichten</strong><br>Standardmäßig deaktiviert. Nur aktivieren, wenn die unterstützte Person diese zusätzliche Funktion ausdrücklich wünscht.';
    }

    if (page === 'konto.html') {
      const planName = document.getElementById('planName');
      const planMeta = document.getElementById('planMeta');
      if (planName) planName.textContent = 'FREE · 0 € / MONAT';
      if (planMeta) planMeta.textContent = '10 Dialoge pro Monat · 1 Bildgenerierung pro Monat · 1 Foto-/Dokument-Digitalisierung pro Monat.';
    }
  };

  const ready = () => {
    updateProductCopy();
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

    const nav = document.querySelector('.links');
    const toggle = document.querySelector('.nav-toggle');
    if (!nav || !toggle) return;
    const sync = () => {
      const open = nav.classList.contains('is-open');
      document.body.classList.toggle('menu-open', open);
      if (open && !nav.contains(document.activeElement)) nav.querySelector('a')?.focus();
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
