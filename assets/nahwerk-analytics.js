(() => {
  const ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-profile/analytics";
  const EVENTS = new Set([
    "page_view","cta_click","funnel_start","funnel_step","funnel_complete",
    "registration_start","registration_complete","login_start","login_complete",
    "checkout_start","checkout_complete","client_error"
  ]);
  const uuid = () => crypto.randomUUID();
  const PAGE_VISIT_ID = uuid();
  const token = (value,max) => {
    const s=String(value||"").toLowerCase();
    return s && s.length<=max && /^[a-z0-9_:-]+$/.test(s) ? s : null;
  };
  const pagePath = () => {
    const p=location.pathname||"/";
    return p.length<=180 && /^\/[A-Za-z0-9/_.-]*$/.test(p) ? p : "/";
  };
  const referrerHost = () => {
    try {
      if(!document.referrer) return null;
      const h=new URL(document.referrer).hostname;
      return h.length<=180 && /^[A-Za-z0-9.-]+$/.test(h) ? h : null;
    } catch (_) { return null; }
  };
  const deviceClass = () => {
    const w=Math.max(document.documentElement.clientWidth||0,innerWidth||0);
    return w<700 ? "mobile" : w<1100 ? "tablet" : "desktop";
  };
  async function track(eventName, options={}) {
    const event=token(eventName,64);
    if(!event || !EVENTS.has(event)) return false;
    const payload={
      event_key:uuid(),
      visit_id:PAGE_VISIT_ID,
      event_name:event,
      page_path:pagePath(),
      device_class:deviceClass()
    };
    const funnelName=token(options.funnel_name,48);
    const funnelStep=token(options.funnel_step,64);
    const host=referrerHost();
    if(funnelName) payload.funnel_name=funnelName;
    if(funnelStep) payload.funnel_step=funnelStep;
    if(host) payload.referrer_host=host;
    try {
      const response=await fetch(ENDPOINT,{
        method:"POST",
        mode:"cors",
        credentials:"omit",
        cache:"no-store",
        keepalive:true,
        referrerPolicy:"no-referrer",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      return response.ok;
    } catch (_) { return false; }
  }
  window.NahwerkAnalytics=Object.freeze({track});
})();