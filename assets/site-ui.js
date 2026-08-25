(() => {
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
