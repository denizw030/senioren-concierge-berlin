(() => {
  'use strict';

  const locale = (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'en' || parts[0] === 'tr') return parts[0];
    const query = new URLSearchParams(location.search).get('lang');
    if (query === 'en' || query === 'tr') return query;
    return 'de';
  })();

  const DEFAULTS = {
    en: { concierge: 'lukas', voiceLanguage: 'en' },
    tr: { concierge: 'leyla', voiceLanguage: 'tr' }
  };
  const defaults = DEFAULTS[locale];
  if (!defaults) return;

  const prepareRoot = root => {
    if (root?.matches?.('[data-concierge-carousel]') && root.dataset.carouselReady !== '1') {
      root.dataset.selected = defaults.concierge;
    }
  };

  const prepare = (scope = document) => {
    prepareRoot(scope);
    scope.querySelectorAll?.('[data-concierge-carousel]').forEach(prepareRoot);
  };

  prepare();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => prepare(), { once: true });
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node?.nodeType === 1) prepare(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const voice = window.NAHWERKVoicePreview;
  if (!voice?.createControl || voice.__localeDefaultsWrapped) return;
  voice.__localeDefaultsWrapped = true;

  const originalCreateControl = voice.createControl.bind(voice);
  voice.createControl = (profile, options = {}) => {
    const control = originalCreateControl(profile, options);
    if (!control) return control;

    const desired = defaults.voiceLanguage;
    const select = control.querySelector('.nw-voice-preview-language-select');
    const button = control.querySelector('.nw-voice-preview-button');
    const hasAudio = Boolean(profile?.sampleAudioByLanguage?.[desired]);
    const hasOption = Boolean(select && [...select.options].some(option => option.value === desired));
    if (!select || !button || !hasAudio || !hasOption) return control;

    select.value = desired;
    if (profile.nativeLanguage === desired) return control;

    let synced = false;
    select.addEventListener('change', () => { synced = true; }, { capture: true });
    button.addEventListener('click', event => {
      if (synced) return;
      if (select.value !== desired) {
        synced = true;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      synced = true;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);

    return control;
  };
})();

// NAHWERK customer preferences + ECONOMY/SMART PROD bridge v1.
// Strictly scoped to concierge-anpassen.html. No provider/business side effects.
(() => {
  'use strict';
  if (!/(?:^|\/)concierge-anpassen\.html$/.test(location.pathname)) return;

  const PROJECT = 'https://djicahhmnnamtjuqedqd.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_Zr4L9Lk-zOnjTc5bE_ChNA_SybjXxZx';
  const LEGACY_PREFS_URL = PROJECT + '/functions/v1/web-concierge-preferences';
  const PREFS_RPC_URL = PROJECT + '/rest/v1/rpc/web_concierge_preferences_v2';
  const MODE_RPC_URL = PROJECT + '/rest/v1/rpc/web_intelligence_mode_v1';
  const CONTEXT_KEY = 'nw_selected_account_context_v1';
  const SESSION_KEY = 'scb_web_session';
  const nativeFetch = window.fetch.bind(window);

  async function sha256Hex(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function bearerFrom(input, init) {
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const auth = headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+([^\s]+)$/i);
    return match?.[1] || '';
  }

  function httpForStatus(status) {
    if (status === 'session_required' || status === 'invalid_session') return 401;
    if (status === 'preferences_permission_required') return 403;
    if (status === 'invalid_context' || status === 'invalid_preferences' || status === 'unsupported_preference_key' || status === 'preferences_too_large') return 400;
    return 200;
  }

  window.fetch = async (input, init = {}) => {
    const raw = input instanceof Request ? input.url : String(input || '');
    let url = raw;
    try { url = new URL(raw, location.href).href; } catch (_) {}
    if (!url.startsWith(LEGACY_PREFS_URL)) return nativeFetch(input, init);

    const token = bearerFrom(input, init);
    if (!token) return new Response(JSON.stringify({ ok:false, status:'session_required' }), { status:401, headers:{ 'content-type':'application/json' } });

    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    let accountId = '';
    let preferences = null;
    if (method === 'GET') {
      accountId = new URL(url).searchParams.get('customer_account_id') || '';
    } else if (method === 'PUT') {
      try {
        const body = JSON.parse(String(init?.body || '{}'));
        accountId = String(body?.customer_account_id || '');
        preferences = body?.preferences ?? null;
      } catch (_) {
        return new Response(JSON.stringify({ ok:false, status:'invalid_json' }), { status:400, headers:{ 'content-type':'application/json' } });
      }
    } else {
      return new Response(JSON.stringify({ ok:false, status:'method_not_allowed' }), { status:405, headers:{ 'content-type':'application/json' } });
    }

    const rpcResponse = await nativeFetch(PREFS_RPC_URL, {
      method:'POST',
      headers:{ apikey:PUBLISHABLE_KEY, 'content-type':'application/json' },
      body:JSON.stringify({
        p_token_hash:await sha256Hex(token),
        p_customer_account_id:accountId,
        p_operation:method,
        p_preferences:preferences
      })
    });
    const data = await rpcResponse.json().catch(() => ({ ok:false, status:'preferences_backend_unavailable' }));
    const status = rpcResponse.ok ? httpForStatus(String(data?.status || '')) : rpcResponse.status;
    return new Response(JSON.stringify(data), { status, headers:{ 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } });
  };

  function session() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function selectedContext() {
    const s = session();
    if (!s?.person_id) return null;
    try {
      const x = JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || 'null');
      return x && String(x.actor_person_id || '') === String(s.person_id) ? x : null;
    } catch (_) { return null; }
  }

  async function modeRpc(mode = null, acknowledge = false) {
    const s = session();
    const ctx = selectedContext();
    const accountId = String(ctx?.customer_account_id || s?.customer_account_id || '');
    if (!s?.session_token || !accountId) throw new Error('session_missing');
    const response = await nativeFetch(MODE_RPC_URL, {
      method:'POST',
      headers:{ apikey:PUBLISHABLE_KEY, 'content-type':'application/json' },
      body:JSON.stringify({
        p_token_hash:await sha256Hex(s.session_token),
        p_customer_account_id:accountId,
        p_mode:mode,
        p_acknowledge_higher_consumption:acknowledge,
        p_source_message_id:crypto.randomUUID()
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true) throw new Error(String(body?.status || 'mode_failed'));
    return body;
  }

  function normalizedMode(body) {
    const value = body?.intelligence_mode;
    const raw = value && typeof value === 'object' ? (value.mode ?? value.intelligence_mode) : value;
    return String(raw || 'ECONOMY').toUpperCase() === 'SMART' ? 'SMART' : 'ECONOMY';
  }

  function installModeCard() {
    const settings = document.querySelector('#prefsForm .settings');
    if (!settings || document.getElementById('nwIntelligenceMode')) return;
    const card = document.createElement('section');
    card.className = 'setting wide';
    card.id = 'nwIntelligenceMode';
    card.innerHTML = '<label>Concierge-Modus</label><div class="example"><strong id="nwModeTitle">Günstiger Modus</strong><p id="nwModeDescription">Klare Abläufe werden möglichst sparsam verarbeitet. KI wird nur genutzt, wenn die Leistung selbst sie benötigt.</p><p class="note">Der genaue Aufpreis für den intelligenten Modus wird erst nach realer Kostenkalibrierung festgelegt.</p><div class="savebar" style="margin-top:12px"><button class="btn red" type="button" id="nwModeEconomy">Günstig</button><button class="btn light" type="button" id="nwModeSmart">Intelligent</button><span class="note" id="nwModeStatus" aria-live="polite"></span></div></div>';
    settings.prepend(card);

    const economy = document.getElementById('nwModeEconomy');
    const smart = document.getElementById('nwModeSmart');
    const title = document.getElementById('nwModeTitle');
    const description = document.getElementById('nwModeDescription');
    const status = document.getElementById('nwModeStatus');

    const render = (mode) => {
      const isSmart = mode === 'SMART';
      title.textContent = isSmart ? 'Intelligenter Modus' : 'Günstiger Modus';
      description.textContent = isSmart
        ? 'Freie Formulierungen und Kontext werden intelligent verstanden. Dafür wird deutlich mehr KI verwendet und das Guthaben kann schneller verbraucht werden.'
        : 'Klare Abläufe werden möglichst sparsam verarbeitet. KI wird nur genutzt, wenn die Leistung selbst sie benötigt.';
      economy.disabled = !isSmart;
      smart.disabled = isSmart;
    };

    economy.addEventListener('click', async () => {
      status.textContent = 'Wird gespeichert …';
      try { render(normalizedMode(await modeRpc('ECONOMY', false))); status.textContent = 'Günstiger Modus aktiv.'; }
      catch (_) { status.textContent = 'Änderung konnte nicht sicher gespeichert werden.'; }
    });

    smart.addEventListener('click', async () => {
      const approved = window.confirm('Der intelligente Modus nutzt deutlich mehr KI und kann dein Guthaben schneller aufbrauchen. Der genaue Aufpreis wird erst nach realer Kostenkalibrierung festgelegt. Möchtest du ihn aktivieren?');
      if (!approved) return;
      status.textContent = 'Wird gespeichert …';
      try { render(normalizedMode(await modeRpc('SMART', true))); status.textContent = 'Intelligenter Modus aktiv.'; }
      catch (_) { status.textContent = 'Änderung konnte nicht sicher gespeichert werden.'; }
    });

    modeRpc().then((body) => render(normalizedMode(body))).catch(() => { status.textContent = 'Der Concierge-Modus konnte nicht sicher geladen werden.'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installModeCard, { once:true });
  else installModeCard();
})();
