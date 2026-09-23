(() => {
  const isCustomerAccount = /(?:^|\/)konto(?:\.html)?\/?$/.test(location.pathname);
  const isProdCustomerSurface = /(?:^|\/)(?:konto|payg|web-concierge|concierge-anpassen)(?:\.html)?\/?$/.test(location.pathname);
  const isPublicSeniorSurface = /(?:^|\/)(?:senioren-concierge|angehoerige)(?:\.html)?\/?$/.test(location.pathname) || Boolean(document.body?.classList?.contains('senior-product'));
  const isThemeAwareSurface = isProdCustomerSurface || isPublicSeniorSurface;
  const PORTAL_THEME_KEY = 'nw_portal_theme_v1';
  const KONTO_FIX_STYLE_ID = 'nw-konto-targeted-fixes-v1';

  const readStoredPortalTheme = () => {
    try {
      const value = localStorage.getItem(PORTAL_THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (_) {
      return null;
    }
  };

  const readPortalTheme = () => {
    if (isPublicSeniorSurface && !isProdCustomerSurface) return 'light';
    return readStoredPortalTheme() || 'dark';
  };

  const applyPortalTheme = (theme) => {
    if (!isThemeAwareSurface) return;
    const normalized = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.nwPortalTheme = normalized;
    if (document.body) {
      document.body.classList.toggle('nw-portal-light', normalized === 'light');
      document.body.classList.toggle('nw-portal-dark', normalized === 'dark');
    }
  };

  const installCustomerAccountFixStyles = () => {
    if (!isCustomerAccount) return;
    let style = document.getElementById(KONTO_FIX_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = KONTO_FIX_STYLE_ID;
      style.textContent = `
        body.account-premium-ui .status-summary[data-account-panel="overview"]{display:none!important}
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"]{order:-30}
        body.account-premium-ui .dash > .plan-summary[data-account-panel="overview"]{order:-20;grid-column:span 6!important}
        body.account-premium-ui .dash > .customer-number-summary[data-account-panel="overview"]{order:-10;grid-column:span 6!important}
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"]>.account-overview-link:first-child{text-align:left!important}
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"]>.account-overview-link:first-child [data-overview-concierge-avatar]{margin:0!important}

        html[data-nw-portal-theme="light"],
        html[data-nw-portal-theme="light"] body.account-premium-ui,
        body.account-premium-ui.nw-portal-light{
          background:#f7f3ea!important;
          color:#1c1a16!important;
          color-scheme:light!important;
        }
        html[data-nw-portal-theme="light"] body.account-premium-ui main,
        html[data-nw-portal-theme="light"] body.account-premium-ui .hero,
        html[data-nw-portal-theme="light"] body.account-premium-ui main>.section,
        html[data-nw-portal-theme="light"] body.account-premium-ui .account-section,
        body.account-premium-ui.nw-portal-light main,
        body.account-premium-ui.nw-portal-light .hero,
        body.account-premium-ui.nw-portal-light main>.section,
        body.account-premium-ui.nw-portal-light .account-section{
          background:radial-gradient(900px 520px at 92% 2%,rgba(196,157,79,.12),transparent 68%),linear-gradient(180deg,#fbf8f1 0%,#f7f3ea 54%,#f2ebdf 100%)!important;
          color:#1c1a16!important;
        }
        html[data-nw-portal-theme="light"] body.account-premium-ui .footer,
        body.account-premium-ui.nw-portal-light .footer{
          background:#ece4d8!important;
          border-color:rgba(74,59,34,.15)!important;
          color:#3f392f!important;
        }
        html[data-nw-portal-theme="light"] body.account-premium-ui .footergrid h4,
        body.account-premium-ui.nw-portal-light .footergrid h4{color:#3d372e!important}
        html[data-nw-portal-theme="light"] body.account-premium-ui .footergrid p,
        html[data-nw-portal-theme="light"] body.account-premium-ui .footergrid a,
        html[data-nw-portal-theme="light"] body.account-premium-ui .footbottom,
        body.account-premium-ui.nw-portal-light .footergrid p,
        body.account-premium-ui.nw-portal-light .footergrid a,
        body.account-premium-ui.nw-portal-light .footbottom{color:#7a7267!important}
        html[data-nw-portal-theme="light"] body.account-premium-ui .footergrid a:hover,
        body.account-premium-ui.nw-portal-light .footergrid a:hover{color:#8b6828!important}

        @media(max-width:700px){
          body.account-premium-ui .dash > .customer-number-summary[data-account-panel="overview"],
          body.account-premium-ui .dash > .plan-summary[data-account-panel="overview"]{grid-column:1!important}
        }

        /* ACCOUNT_PORTAL_OPEN_DIVIDERS_V1_20260921
           Remove rounded portal containers only; keep content, controls and behavior intact.
           Divider tone deliberately reuses the account navigation line. */
        body.account-premium-ui .dash{
          gap:0!important;
          row-gap:0!important;
          column-gap:0!important;
        }

        body.account-premium-ui :is(
          .dash>.card,
          .account-overview-link,
          .usagebox,
          .safety-hub-card,
          .fraud-protection-grid>div,
          .email-provider-card,
          .email-capability,
          .email-state-card,
          .response-channel-option,
          .reception-check,
          .fraud-channel-item,
          .safety-summary-item,
          .safety-chain-step,
          .empty,
          .recommend,
          .access-empty,
          .family-owner-empty,
          .family-owner-panel
        ){
          border:0!important;
          border-radius:0!important;
          background-color:transparent!important;
          box-shadow:none!important;
        }

        body.account-premium-ui :is(
          .dash>.card,
          .account-overview-link,
          .usagebox,
          .safety-hub-card,
          .fraud-protection-grid>div,
          .email-provider-card,
          .email-capability,
          .email-state-card,
          .response-channel-option,
          .reception-check,
          .fraud-channel-item,
          .safety-summary-item,
          .safety-chain-step,
          .empty,
          .recommend,
          .access-empty,
          .family-owner-empty,
          .family-owner-panel
        ):hover{
          box-shadow:none!important;
        }

        /* Every top-level portal section receives a restrained horizontal divider,
           inset by exactly 5 mm on both sides. */
        body.account-premium-ui .dash>.card{
          position:relative!important;
          background-image:
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat!important;
          background-position:left bottom!important;
          background-size:100% 1px!important;
        }

        /* Overview: one open grid. Concierge spans the first row.
           Every following two-column row has one centered vertical divider. */
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"]{
          gap:0!important;
          row-gap:0!important;
          column-gap:0!important;
        }
        body.account-premium-ui .account-overview-link{
          position:relative!important;
          background-image:
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat!important;
          background-position:left bottom!important;
          background-size:100% 1px!important;
        }
        body.account-premium-ui .account-overview-link:nth-child(2n+1):not(:first-child){
          background-image:
            linear-gradient(to bottom,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%),
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat,no-repeat!important;
          background-position:left top,left bottom!important;
          background-size:1px 100%,100% 1px!important;
        }

        /* The known paired overview rows use the same centered divider. */
        body.account-premium-ui :is(
          .customer-number-summary[data-account-panel="overview"],
          .owner-product-gap-shortcut[data-account-panel="overview"]
        ){
          background-image:
            linear-gradient(to bottom,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%),
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat,no-repeat!important;
          background-position:left top,left bottom!important;
          background-size:1px 100%,100% 1px!important;
        }

        /* ACCOUNT_OVERVIEW_LOWER_SHARED_GRID_V2_20260921
           The lower four overview items now live in the same two-column grid model
           as Safety / Nutzung / PAYG / Web Concierge. Scoped to the overview only. */
        body.account-premium-ui .dash >
        .account-overview-lower-highlights[data-account-panel="overview"]{
          order:20!important;
          grid-column:1/-1!important;
          display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:0!important;
          row-gap:0!important;
          column-gap:0!important;
          width:100%!important;
          margin:10px 0 0!important;
          padding:0!important;
        }

        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        .account-overview-link{
          position:relative!important;
          box-sizing:border-box!important;
          grid-column:auto!important;
          order:initial!important;
          width:100%!important;
          margin:0!important;
          border:0!important;
          border-radius:0!important;
          background-color:transparent!important;
          box-shadow:none!important;
          -webkit-backdrop-filter:none!important;
          backdrop-filter:none!important;
          overflow:hidden!important;
          transform:none!important;
          background-image:
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat!important;
          background-position:left bottom!important;
          background-size:100% 1px!important;
        }

        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        .account-overview-link:nth-child(2n){
          background-image:
            linear-gradient(to bottom,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%),
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat,no-repeat!important;
          background-position:left top,left bottom!important;
          background-size:1px 100%,100% 1px!important;
        }

        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        .account-overview-link .eyebrow{
          display:block!important;
          margin:0 0 8px!important;
          font-size:10.5px!important;
          line-height:1.2!important;
          letter-spacing:.09em!important;
        }

        /* Final overview structure: the lower account information is moved into
           the very same grid as Safety, Nutzung, PAYG and Web Concierge. */
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
        :is(.plan-summary,.customer-number-summary) .value,
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
        :is(.overview-saved-info,.owner-product-gap-shortcut) h3{
          display:block!important;
          margin:0 0 5px!important;
          font-size:clamp(.98rem,1.35vw,1.16rem)!important;
          font-weight:700!important;
          line-height:1.2!important;
          letter-spacing:-.022em!important;
        }
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
        :is(.plan-summary,.customer-number-summary,.overview-saved-info,.owner-product-gap-shortcut) :is(.muted,.empty){
          display:block!important;
          max-width:92%!important;
          min-height:0!important;
          margin:0!important;
          padding:0!important;
          border:0!important;
          border-radius:0!important;
          background:none!important;
          box-shadow:none!important;
          font-size:11.25px!important;
          line-height:1.42!important;
        }
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
        .overview-saved-info::before{
          content:""!important;
          display:block!important;
          height:12.6px!important;
          margin:0 0 8px!important;
        }
        body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
        .owner-product-gap-shortcut .owner-product-gap-shortcut-head{margin:0!important}
        @media(min-width:761px){
          body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
          .owner-product-gap-shortcut .owner-product-gap-shortcut-actions{
            position:absolute!important;
            left:18px!important;
            bottom:14px!important;
            margin:0!important;
            padding:0!important;
          }
          body.account-premium-ui .account-overview-highlights[data-account-panel="overview"] >
          .owner-product-gap-shortcut .owner-product-gap-shortcut-actions .btn{
            min-height:34px!important;
            height:34px!important;
            padding:0 14px!important;
            font-size:11px!important;
          }
        }

        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        :is(.plan-summary,.customer-number-summary) .value,
        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        :is(.overview-saved-info,.owner-product-gap-shortcut) h3{
          display:block!important;
          margin:0 0 5px!important;
          font-size:clamp(.98rem,1.35vw,1.16rem)!important;
          font-weight:700!important;
          line-height:1.2!important;
          letter-spacing:-.022em!important;
        }

        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        .account-overview-link :is(.muted,.empty){
          display:block!important;
          max-width:92%!important;
          min-height:0!important;
          margin:0!important;
          padding:0!important;
          border:0!important;
          border-radius:0!important;
          background-color:transparent!important;
          background-image:none!important;
          box-shadow:none!important;
          font-size:11.25px!important;
          line-height:1.42!important;
        }

        /* Gespeicherte Informationen has no eyebrow text; reserve the same
           eyebrow rhythm so its title aligns with the other seven tiles. */
        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        .overview-saved-info::before{
          content:""!important;
          display:block!important;
          height:12.6px!important;
          margin:0 0 8px!important;
        }

        body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
        .owner-product-gap-shortcut .owner-product-gap-shortcut-head{
          margin:0!important;
        }

        @media(min-width:761px){
          body.account-premium-ui .account-overview-highlights[data-account-panel="overview"]:not(.account-overview-lower-highlights) >
          .account-overview-link:not(:first-child),
          body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
          .account-overview-link{
            box-sizing:border-box!important;
            height:140px!important;
            min-height:140px!important;
            padding:20px 46px 20px 18px!important;
            margin:0!important;
          }

          body.account-premium-ui .account-overview-highlights[data-account-panel="overview"]:not(.account-overview-lower-highlights) >
          .account-overview-link:not(:first-child),
          body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
          .account-overview-link{
            display:flex!important;
            flex-direction:column!important;
            align-items:flex-start!important;
            justify-content:flex-start!important;
          }

          body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
          .owner-product-gap-shortcut .owner-product-gap-shortcut-actions{
            position:absolute!important;
            left:18px!important;
            bottom:14px!important;
            margin:0!important;
            padding:0!important;
          }

          body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
          .owner-product-gap-shortcut .owner-product-gap-shortcut-actions .btn{
            min-height:34px!important;
            height:34px!important;
            padding:0 14px!important;
            font-size:11px!important;
          }
        }

        @media(max-width:760px){
          body.account-premium-ui .dash >
          .account-overview-lower-highlights[data-account-panel="overview"]{
            grid-template-columns:1fr!important;
          }
          body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
          .account-overview-link{
            grid-column:1/-1!important;
            height:auto!important;
            min-height:92px!important;
            padding:15px 44px 15px 16px!important;
            background-image:
              linear-gradient(to right,
                transparent 0,
                transparent 5mm,
                var(--account-nav-line) 5mm,
                var(--account-nav-line) calc(100% - 5mm),
                transparent calc(100% - 5mm),
                transparent 100%)!important;
            background-repeat:no-repeat!important;
            background-position:left bottom!important;
            background-size:100% 1px!important;
          }
          body.account-premium-ui .account-overview-lower-highlights[data-account-panel="overview"] >
          .owner-product-gap-shortcut .owner-product-gap-shortcut-actions{
            position:static!important;
            margin-top:10px!important;
            padding:0!important;
          }
        }

        /* Two-column portal groups follow the same open-divider principle. */
        body.account-premium-ui :is(.usagegrid,.safety-hub,.fraud-protection-grid){
          gap:0!important;
          row-gap:0!important;
          column-gap:0!important;
        }
        body.account-premium-ui :is(.usagebox,.safety-hub-card,.fraud-protection-grid>div){
          position:relative!important;
          background-image:
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat!important;
          background-position:left bottom!important;
          background-size:100% 1px!important;
        }
        body.account-premium-ui :is(.usagebox,.safety-hub-card,.fraud-protection-grid>div):nth-child(2n):not(.fraud-featured){
          background-image:
            linear-gradient(to bottom,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%),
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat,no-repeat!important;
          background-position:left top,left bottom!important;
          background-size:1px 100%,100% 1px!important;
        }

        /* Repeated rows on Concierge, E-Mail, Safety and Access stay functional,
           but no longer render as rounded cards. */
        body.account-premium-ui :is(
          .email-provider-card,
          .email-capability,
          .email-state-card,
          .response-channel-option,
          .reception-check,
          .fraud-channel-item,
          .safety-summary-item,
          .safety-chain-step,
          .empty,
          .recommend,
          .access-empty,
          .family-owner-empty,
          .family-owner-panel
        ){
          background-image:
            linear-gradient(to right,
              transparent 0,
              transparent 5mm,
              var(--account-nav-line) 5mm,
              var(--account-nav-line) calc(100% - 5mm),
              transparent calc(100% - 5mm),
              transparent 100%)!important;
          background-repeat:no-repeat!important;
          background-position:left bottom!important;
          background-size:100% 1px!important;
        }

        body.account-premium-ui :is(
          .account-overview-link,
          .safety-hub-card
        ):hover,
        body.account-premium-ui :is(
          .account-overview-link,
          .safety-hub-card
        ):focus-visible{
          transform:none!important;
          background-color:transparent!important;
          box-shadow:none!important;
        }

        @media(max-width:760px){
          body.account-premium-ui .account-overview-highlights[data-account-panel="overview"],
          body.account-premium-ui :is(.usagegrid,.safety-hub,.fraud-protection-grid){
            grid-template-columns:1fr!important;
            gap:0!important;
          }

          /* On one-column mobile layouts no center divider is drawn. */
          body.account-premium-ui :is(
            .account-overview-link:nth-child(2n+1):not(:first-child),
            .customer-number-summary[data-account-panel="overview"],
            .owner-product-gap-shortcut[data-account-panel="overview"],
            .usagebox:nth-child(2n),
            .safety-hub-card:nth-child(2n),
            .fraud-protection-grid>div:nth-child(2n)
          ){
            background-image:
              linear-gradient(to right,
                transparent 0,
                transparent 5mm,
                var(--account-nav-line) 5mm,
                var(--account-nav-line) calc(100% - 5mm),
                transparent calc(100% - 5mm),
                transparent 100%)!important;
            background-repeat:no-repeat!important;
            background-position:left bottom!important;
            background-size:100% 1px!important;
          }
        }
      `;
    }
    document.head.appendChild(style);
  };

  const bindSafetyLoadingGuard = () => {
    if (!isCustomerAccount || document.documentElement.dataset.nwSafetyLoadingGuard === '1') return;
    document.documentElement.dataset.nwSafetyLoadingGuard = '1';

    const overview = document.getElementById('overviewSafety');
    const overviewMeta = document.getElementById('overviewSafetyMeta');
    const visible = document.getElementById('safetyVisibleStatus');
    const summaryIntro = document.getElementById('safetySummaryIntro');
    const accessibleStatus = document.getElementById('safetyStatus');
    const accessibleMeta = document.getElementById('safetyMeta');
    const loading = (element) => /wird geladen/i.test(String(element?.textContent || ''));

    const applyOverviewFailState = () => {
      if (overview && loading(overview)) overview.textContent = 'Nicht verfügbar';
      if (overviewMeta) overviewMeta.textContent = 'Die Sicherheitseinstellungen konnten gerade nicht geladen werden.';
    };

    const syncFromSafetyPanel = () => {
      if (String(visible?.textContent || '').trim() === 'Nicht verfügbar') applyOverviewFailState();
    };

    if (visible) new MutationObserver(syncFromSafetyPanel).observe(visible, { childList:true, subtree:true, characterData:true });
    syncFromSafetyPanel();

    window.setTimeout(() => {
      if (visible && loading(visible)) visible.textContent = 'Nicht verfügbar';
      if (summaryIntro && loading(summaryIntro)) summaryIntro.textContent = 'Die Sicherheitseinstellungen konnten gerade nicht geladen werden.';
      if (accessibleStatus && loading(accessibleStatus)) accessibleStatus.textContent = 'Nicht verfügbar';
      if (accessibleMeta && loading(accessibleMeta)) accessibleMeta.textContent = 'Die Sicherheitseinstellungen konnten gerade nicht geladen werden.';
      if (overview && loading(overview)) applyOverviewFailState();
    }, 11000);
  };

  applyPortalTheme(readPortalTheme());
  if (isThemeAwareSurface) {
    addEventListener('storage', (event) => {
      if (event.key === PORTAL_THEME_KEY) applyPortalTheme(readPortalTheme());
    });
  }

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

      const method = String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
      const isSafetyRead = isCustomerAccount && method === "GET" && (
        /denizw\.app\.n8n\.cloud\/webhook\/senioren-concierge\/web\/safety(?:$|\?)/i.test(url) ||
        /\/functions\/v1\/web-safety-contacts(?:$|\?)/i.test(url) ||
        /\/functions\/v1\/web-managed-safety-context(?:$|\?)/i.test(url)
      );
      if (!isSafetyRead) return nativeFetch(input, init);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);
      const upstreamSignal = init?.signal || (input instanceof Request ? input.signal : null);
      if (upstreamSignal) {
        if (upstreamSignal.aborted) controller.abort();
        else upstreamSignal.addEventListener('abort', () => controller.abort(), { once:true });
      }
      const nextInit = { ...(init || {}), signal:controller.signal };
      return nativeFetch(input, nextInit).finally(() => window.clearTimeout(timeoutId));
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
    installCustomerAccountFixStyles();
    bindSafetyLoadingGuard();

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
        installCustomerAccountFixStyles();
        toggle.setAttribute('aria-checked', String(toggle.checked));
      });
    }

    /* NW_MOBILE_ACCOUNT_MENU_V1_20260921: presentation-only mobile account navigation and theme placement. */
    const setupBy = document.querySelector('.account-setup-by');
    const themeSetting = document.getElementById('nwPortalThemeSetting');
    const mobileAccountMedia = window.matchMedia('(max-width:760px)');

    const syncMobileThemePlacement = () => {
      if (!tabsShell || !setupBy || !themeSetting) return;
      if (mobileAccountMedia.matches) {
        if (themeSetting.parentElement !== setupBy) setupBy.appendChild(themeSetting);
      } else if (themeSetting.previousElementSibling !== tabsShell || themeSetting.parentElement !== tabsShell.parentElement) {
        tabsShell.insertAdjacentElement('afterend', themeSetting);
      }
    };

    let mobileAccountNav = document.getElementById('nwMobileAccountNav');
    if (tabsShell && !mobileAccountNav) {
      mobileAccountNav = document.createElement('div');
      mobileAccountNav.id = 'nwMobileAccountNav';
      mobileAccountNav.className = 'nw-mobile-account-nav';
      mobileAccountNav.innerHTML = `
        <button class="nw-mobile-account-home" type="button" aria-label="Übersicht öffnen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 11.2 12 5l7.5 6.2"></path><path d="M6.5 10.4V19h11v-8.6"></path></svg>
          <span>Übersicht</span>
        </button>
        <button class="nw-mobile-account-menu-button" type="button" aria-expanded="false" aria-controls="nwMobileAccountMenu">
          <span class="nw-mobile-account-menu-current">Menü</span>
          <span class="nw-mobile-account-menu-lines" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
        <div class="nw-mobile-account-menu" id="nwMobileAccountMenu" hidden role="menu" aria-label="Kundenbereich">
          <button type="button" role="menuitem" data-mobile-account-target="concierge">Concierge</button>
          <button type="button" role="menuitem" data-mobile-account-target="email">E-Mail</button>
          <button type="button" role="menuitem" data-mobile-account-target="safety">Safety</button>
          <button type="button" role="menuitem" data-mobile-account-target="usage">Nutzung</button>
          <button type="button" role="menuitem" data-mobile-account-target="personal">Account</button>
          <button type="button" role="menuitem" data-mobile-account-target="access">Zugänge</button>
        </div>
      `;
      tabsShell.insertAdjacentElement('beforebegin', mobileAccountNav);

      const home = mobileAccountNav.querySelector('.nw-mobile-account-home');
      const menuButton = mobileAccountNav.querySelector('.nw-mobile-account-menu-button');
      const menu = mobileAccountNav.querySelector('.nw-mobile-account-menu');
      const currentLabel = mobileAccountNav.querySelector('.nw-mobile-account-menu-current');

      const closeMenu = () => {
        menu.hidden = true;
        menuButton.setAttribute('aria-expanded', 'false');
        mobileAccountNav.classList.remove('is-open');
      };
      const openMenu = () => {
        menu.hidden = false;
        menuButton.setAttribute('aria-expanded', 'true');
        mobileAccountNav.classList.add('is-open');
      };
      const syncMobileAccountState = () => {
        const selected = tabsShell.querySelector('.account-tab[aria-selected="true"]');
        const key = selected?.dataset.accountTab || 'overview';
        const label = selected?.querySelector(':scope > span:last-child')?.textContent?.trim() || 'Menü';
        currentLabel.textContent = key === 'overview' ? 'Menü' : label;
        home.classList.toggle('is-active', key === 'overview');
        mobileAccountNav.querySelectorAll('[data-mobile-account-target]').forEach((button) => {
          button.classList.toggle('is-active', button.dataset.mobileAccountTarget === key);
        });
      };

      home.addEventListener('click', () => {
        closeMenu();
        document.getElementById('accountTabOverview')?.click();
      });
      menuButton.addEventListener('click', () => {
        if (menu.hidden) openMenu();
        else closeMenu();
      });
      mobileAccountNav.querySelectorAll('[data-mobile-account-target]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button.dataset.mobileAccountTarget;
          closeMenu();
          document.querySelector(`[data-account-tab="${target}"]`)?.click();
        });
      });
      document.addEventListener('click', (event) => {
        if (!mobileAccountNav.contains(event.target)) closeMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
      });
      new MutationObserver(syncMobileAccountState).observe(tabsShell, {
        subtree:true,
        attributes:true,
        attributeFilter:['aria-selected']
      });
      mobileAccountMedia.addEventListener?.('change', () => {
        syncMobileThemePlacement();
        if (!mobileAccountMedia.matches) closeMenu();
      });
      syncMobileAccountState();
    }
    syncMobileThemePlacement();

    const highlights = document.querySelector(".account-overview-highlights[data-account-panel='overview']");
    const lowerOverviewTiles = [
      document.querySelector(".plan-summary[data-account-panel='overview']"),
      document.querySelector(".customer-number-summary[data-account-panel='overview']"),
      document.querySelector(".overview-saved-info[data-account-panel='overview']"),
      document.querySelector(".owner-product-gap-shortcut[data-account-panel='overview']")
    ].filter(Boolean);
    if (highlights) {
      lowerOverviewTiles.forEach((tile) => {
        tile.classList.add("account-overview-link");
        highlights.appendChild(tile);
      });
      document.querySelectorAll(".account-overview-lower-highlights").forEach((group) => {
        if (!group.children.length) group.remove();
      });
    }
    const firstLowerOverviewTile = lowerOverviewTiles[0] || null;
    if (highlights && !document.getElementById("accountPaygEntry")) {
      const payg = document.createElement("a");
      payg.id = "accountPaygEntry";
      payg.className = "account-overview-link";
      payg.href = "/payg";
      payg.setAttribute("aria-label", "PAYG – Bezahlen pro Auftrag öffnen");
      payg.innerHTML = '<span class="eyebrow">PAYG</span><strong>Bezahlen pro Auftrag</strong><span>Status, Zahlungsmethode und Kosten transparent anzeigen.</span>';
      highlights.insertBefore(payg, firstLowerOverviewTile);
    }

    if (highlights && !document.getElementById("accountWebConciergeEntry")) {
      const concierge = document.createElement("a");
      concierge.id = "accountWebConciergeEntry";
      concierge.className = "account-overview-link";
      concierge.href = "/web-concierge";
      concierge.setAttribute("aria-label", "Web Concierge öffnen");
      concierge.innerHTML = '<span class="eyebrow">Web Concierge</span><strong>Concierge im Kundenkonto</strong><span>Aktuelle PROD-Verfügbarkeit des persönlichen Webkanals ansehen.</span>';
      highlights.insertBefore(concierge, firstLowerOverviewTile);
    }
  };

  const ready = async () => {
    applyPortalTheme(readPortalTheme());
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
    const skipPremiumPreview = /(?:^|\/)anmelden(?:\.html)?\/?$/.test(location.pathname) && new URLSearchParams(location.search).get('produkt') === 'senioren';
    if (!skipPremiumPreview && !document.querySelector('link[data-nw-premium-preview]')) {
      const premium = document.createElement('link');
      premium.rel = 'stylesheet';
      premium.href = '/assets/premium-preview.css?v=2';
      premium.dataset.nwPremiumPreview = 'true';
      if (isCustomerAccount) premium.addEventListener('load', installCustomerAccountFixStyles, { once:true });
      document.head.appendChild(premium);
    } else if (isCustomerAccount) {
      installCustomerAccountFixStyles();
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
  const normalizedPath = (location.pathname.replace(/\/+$/, '') || '/').toLowerCase();
  const localeByPath = {
    '/de': { language: 'de-DE', serviceUrl: 'https://nahwerkconcierge.com/prime-concierge', serviceName: 'Persönlicher NAHWERK Concierge' },
    '/en': { language: 'en-GB', serviceUrl: 'https://nahwerkconcierge.com/en/prime-concierge', serviceName: 'NAHWERK Personal Concierge' },
    '/tr': { language: 'tr-TR', serviceUrl: 'https://nahwerkconcierge.com/tr/prime-concierge', serviceName: 'NAHWERK Kişisel Concierge' }
  };
  const locale = localeByPath[normalizedPath];
  if (!locale) return;
  if (document.querySelector('script[data-nw-structured-data]')) return;

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
        inLanguage: locale.language,
        publisher: { '@id': 'https://nahwerkconcierge.com/#organization' }
      },
      {
        '@type': 'Service',
        '@id': 'https://nahwerkconcierge.com/#personal-concierge',
        name: locale.serviceName,
        serviceType: 'Personal Concierge',
        url: locale.serviceUrl,
        provider: { '@id': 'https://nahwerkconcierge.com/#organization' }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://nahwerkconcierge.com/#software',
        name: 'NAHWERK Concierge',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, iOS, Android',
        url: locale.serviceUrl,
        inLanguage: locale.language,
        provider: { '@id': 'https://nahwerkconcierge.com/#organization' }
      }
    ]
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.nwStructuredData = 'v2';
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
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:0!important;
        min-height:0!important;
        margin:0 0 14px!important;
        padding:0 2px!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
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
      body.account-premium-ui.nw-portal-light :is(.account-setup-by,.managed-person-context,.managed-context-notice,.account-tabs-shell,.account-session-note,.dash>.card,.family-owner-panel,.access-panel,.account-overview-link,.profile-card,.concierge-panel,.safety-panel,.usage-panel,.reception-panel,.email-account-card){
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

      /* Canonical persisted appearance for the authenticated chat and public Senioren surfaces. */
      html[data-nw-portal-theme="dark"] body.nw-portal-dark:not(.account-premium-ui),
      html[data-nw-portal-theme="dark"] body.nw-portal-dark:not(.account-premium-ui)>main{
        background:#000!important;
        color:#f3f0e8!important;
        color-scheme:dark!important;
      }
      html[data-nw-portal-theme="dark"] body.nw-portal-dark:not(.account-premium-ui) .footer{
        background:#000!important;
        border-top-color:#1d1d1d!important;
        color:#f3f0e8!important;
      }
      html[data-nw-portal-theme="dark"] body.nw-portal-dark:not(.account-premium-ui) :is(.footergrid h4,.footergrid a,.footergrid p,.footbottom,.footline,.footline a){color:#a9a59c!important}
      html[data-nw-portal-theme="dark"] body.nw-portal-dark:not(.account-premium-ui) .footergrid h4{color:#f3f0e8!important}

      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui),
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui)>main{
        background:#f7f3ea!important;
        color:#201d17!important;
        color-scheme:light!important;
      }
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .top{
        background:rgba(247,243,234,.96)!important;
        border-bottom-color:rgba(74,59,34,.14)!important;
        color:#252119!important;
      }
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .top .links,
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .top .links a{color:#393229!important}
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .nav-toggle{background:#fffdf8!important;color:#393229!important;border-color:rgba(74,59,34,.22)!important}
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .footer{
        background:#ece4d8!important;
        border-top-color:rgba(74,59,34,.15)!important;
        color:#3f392f!important;
      }
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) :is(.footergrid h4,.footergrid a,.footergrid p,.footbottom,.footline,.footline a){color:#746c61!important}
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .footergrid h4{color:#3d372e!important}
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .footer .brandtext strong:before,
      html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .footer .brandtext span:before{color:#9a7020!important}

      /* Chat surface: one palette follows the same persisted theme instead of hardcoded dark values. */
      body.nw-portal-dark .web-concierge-shell{background:#000!important;color:#f3f0e8!important}
      body.nw-portal-dark .web-concierge-workspace{background:#030405!important;border-color:#181a1d!important;box-shadow:0 24px 70px rgba(0,0,0,.42)!important}
      body.nw-portal-dark .web-concierge-sidebar,
      body.nw-portal-dark .web-concierge-form{background:#000!important;border-color:#17191c!important}
      body.nw-portal-dark .web-concierge-chat-panel{background:radial-gradient(750px 420px at 100% 0%,rgba(44,61,92,.08),transparent 70%),#030405!important}
      body.nw-portal-dark .web-concierge-chat-head{background:rgba(0,0,0,.96)!important;border-color:#17191c!important}
      body.nw-portal-dark .web-concierge-log{background:#030405!important}
      body.nw-portal-dark .web-concierge-form textarea{background:#090b0e!important;color:#f3f0e8!important;border-color:#24272c!important}
      body.nw-portal-dark .web-concierge-message-assistant,
      body.nw-portal-dark .web-concierge-typing,
      body.nw-portal-dark .web-concierge-runtime-card{background:#0b0d10!important;border-color:#202327!important;color:#f0eee8!important}

      body.nw-portal-light .web-concierge-shell{background:linear-gradient(180deg,#fbf8f1,#f7f3ea)!important;color:#201d17!important}
      body.nw-portal-light .web-concierge-pagebar h1{color:#201d17!important}
      body.nw-portal-light .web-concierge-workspace{background:#fffdf8!important;border-color:rgba(74,59,34,.15)!important;box-shadow:0 24px 70px rgba(74,57,27,.08)!important}
      body.nw-portal-light .web-concierge-sidebar{background:#f2ecdf!important;border-color:rgba(74,59,34,.13)!important}
      body.nw-portal-light .web-concierge-new-chat{background:rgba(185,141,45,.08)!important;border-color:rgba(154,112,32,.24)!important;color:#30291e!important}
      body.nw-portal-light .web-concierge-sidebar-title,
      body.nw-portal-light .web-concierge-thread-preview,
      body.nw-portal-light .web-concierge-thread-date,
      body.nw-portal-light .web-concierge-threads-empty{color:#7b7368!important}
      body.nw-portal-light .web-concierge-thread{color:#312b23!important}
      body.nw-portal-light .web-concierge-thread:hover{background:rgba(90,69,31,.055)!important}
      body.nw-portal-light .web-concierge-thread.is-active{background:#fff!important;box-shadow:inset 0 0 0 1px rgba(74,59,34,.10)!important}
      body.nw-portal-light .web-concierge-chat-panel{background:radial-gradient(750px 420px at 100% 0%,rgba(196,157,79,.10),transparent 70%),#fffdf8!important}
      body.nw-portal-light .web-concierge-chat-head{background:rgba(255,253,248,.96)!important;border-color:rgba(74,59,34,.12)!important}
      body.nw-portal-light .web-concierge-chat-identity h2{color:#201d17!important}
      body.nw-portal-light .web-concierge-chat-identity span{color:#756e63!important}
      body.nw-portal-light .web-concierge-log{background:transparent!important}
      body.nw-portal-light .web-concierge-empty{color:#756e63!important}
      body.nw-portal-light .web-concierge-empty strong{color:#2a261f!important}
      body.nw-portal-light .web-concierge-date{background:#eee7db!important;color:#756e63!important}
      body.nw-portal-light .web-concierge-message-user{background:#e8d8ad!important;color:#211c13!important;border-color:rgba(154,112,32,.22)!important}
      body.nw-portal-light .web-concierge-message-assistant,
      body.nw-portal-light .web-concierge-typing,
      body.nw-portal-light .web-concierge-runtime-card{background:#f3eee5!important;color:#28231d!important;border-color:rgba(74,59,34,.12)!important}
      body.nw-portal-light .web-concierge-runtime-card span{color:#6e675d!important}
      body.nw-portal-light .web-concierge-form{background:#f2ecdf!important;border-color:rgba(74,59,34,.12)!important}
      body.nw-portal-light .web-concierge-form textarea{background:#fff!important;color:#201d17!important;border-color:rgba(74,59,34,.18)!important}
      body.nw-portal-light .web-concierge-form textarea::placeholder{color:#948b7f!important}

      /* Senioren public surface: light remains calm/cream, dark becomes genuinely black instead of mixed brown/grey. */
      body.senior-product.nw-portal-light>main,
      body.senior-product.nw-portal-light>main>.section,
      body.senior-product.nw-portal-light>main>.hero{background:#f7f3ea!important;color:#201d17!important}
      body.senior-product.nw-portal-dark,
      body.senior-product.nw-portal-dark>main,
      body.senior-product.nw-portal-dark>main>.section,
      body.senior-product.nw-portal-dark>main>.hero,
      body.senior-product.nw-portal-dark>main>.section.alt{background:#000!important;color:#f3f0e8!important;border-color:#1d1d1d!important}
      body.senior-product.nw-portal-dark :is(h1,h2,h3){color:#f5f2eb!important;text-shadow:none!important}
      body.senior-product.nw-portal-dark :is(.senior-hero-lead,.senior-story p,.senior-family-section>p,.senior-family-card p,.senior-release p,.senior-package-note,.request-intro){color:#b9b4aa!important}
      body.senior-product.nw-portal-dark :is(.senior-story article,.senior-family-section,.senior-family-card,.senior-release article,.senior-package-note,.request-card){background:#060606!important;border-color:#28241d!important;color:#f0eee8!important;box-shadow:none!important}
      body.senior-product.nw-portal-dark .senior-family-notice{background:#0b0905!important;border-left-color:#c99b38!important;color:#c9c2b5!important}
      body.senior-product.nw-portal-dark .senior-benefit-chip{background:#090909!important;border-color:rgba(185,135,36,.28)!important;color:#e8dfcb!important}
      body.senior-product.nw-portal-dark .btn.light{background:#0b0b0b!important;color:#e8dfcb!important;border-color:#6e592e!important}

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
        html[data-nw-portal-theme="light"] body.nw-portal-light:not(.account-premium-ui) .top .links,
        html[data-nw-portal-theme="light"] body.account-premium-ui.nw-portal-light .top .links{
          background:#fffdf8!important;
          border-color:rgba(74,59,34,.15)!important;
          color:#393229!important;
          box-shadow:0 18px 42px rgba(74,57,27,.10)!important;
        }
        html[data-nw-portal-theme="light"] body.account-premium-ui.nw-portal-light .top .links :is(a,.auth-link,.nw-account-link,.nw-account-mobile,.nw-account-logout,.nw-language-button){
          color:#393229!important;
        }
        html[data-nw-portal-theme="light"] body.account-premium-ui.nw-portal-light .top .links :is(a,.auth-link):hover{
          background:rgba(110,87,43,.06)!important;
          color:#201d17!important;
        }
      }
      @media(max-width:720px){
        .nw-theme-setting{align-items:center!important;flex-direction:row!important;justify-content:flex-end!important;gap:0!important}
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
    if (!/(?:^|\/)konto(?:\.html)?\/?$/.test(location.pathname)) return;

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

// PACKAGE_CANONICAL_SYNC_V1_20260918
(() => {
  if (!document.querySelector(".package-card")) return;
  const endpoint="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-customer-service-core/public/product-facts";
  const codeByTitle={"FREE":"FREE","STANDARD":"STANDARD","PLUS":"PLUS","PREMIUM":"PREMIUM","PREMIUM PLUS":"PREMIUM_PLUS","FAMILIE":"FAMILIE"};
  const qty=(p,code)=>{const e=(Array.isArray(p?.entitlements)?p.entitlements:[]).find(x=>String(x?.feature_code||"")===code);return !e?"—":(e.included_quantity==null||e.included_quantity===""?"unbegrenzt":String(e.included_quantity));};
  const euro=(c)=>new Intl.NumberFormat(document.documentElement.lang||"de-DE",{style:"currency",currency:"EUR",minimumFractionDigits:Number(c||0)%100===0?0:2,maximumFractionDigits:2}).format(Number(c||0)/100);
  fetch(endpoint,{cache:"no-store",credentials:"omit"}).then(r=>r.ok?r.json():null).then(facts=>{
    if(facts?.ok!==true)return;
    const plans=new Map((facts.plans||[]).map(p=>[String(p.code||"").toUpperCase(),p]));
    document.querySelectorAll(".package-card").forEach(card=>{
      const code=codeByTitle[String(card.querySelector("h3")?.textContent||"").trim().toUpperCase()],p=plans.get(code);if(!p)return;
      const price=card.querySelector(".package-price");if(price)price.innerHTML=`${euro(p.monthly_price_cents)} <small>/ Monat</small>`;
      const usage=card.querySelector(".package-usage");if(usage)usage.textContent=`App ${qty(p,"app_dialog")} · Web ${qty(p,"web_standard_dialog")} · WhatsApp ${qty(p,"whatsapp_dialog")}`;
      card.dataset.planAuthority="live";
    });
    document.documentElement.dataset.nwPlanFacts="live";
  }).catch(()=>{});
})();
