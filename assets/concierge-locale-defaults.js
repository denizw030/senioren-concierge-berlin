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
