(() => {
  const ready = () => {
    if (!document.querySelector('link[data-nw-premium-preview]')) {
      const premium = document.createElement('link');
      premium.rel = 'stylesheet';
      premium.href = 'assets/premium-preview.css?v=2';
      premium.dataset.nwPremiumPreview = 'true';
      document.head.append(premium);
      const master=document.createElement('link'); master.rel='stylesheet'; master.href='assets/master-reference-2026.css?v=1'; master.dataset.nwMaster='true'; document.head.append(master);
    }

    if (!document.querySelector('.skip-link')) {
      const skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main-content';
      skip.textContent = 'Direkt zum Inhalt';
      document.body.prepend(skip);
    }

    document.querySelectorAll('.brand .mark').forEach((mark)=>mark.classList.add('nahwerk-mark'));
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); const bad=[]; while(walker.nextNode()){if(walker.currentNode.nodeValue?.includes('\\n')) bad.push(walker.currentNode)} bad.forEach((n)=>{n.nodeValue=n.nodeValue.replace(/\\n/g,' ')});
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
