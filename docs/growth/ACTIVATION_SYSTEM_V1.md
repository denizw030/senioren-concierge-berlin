# NAHWERK Customer Acquisition & Activation System V1

Baseline: `b335bbd60647cfe5e99f8f407c82d9708134562e`
Branch: `growth/activation-system-v1-20260907`

## North Star
**Cost per successfully activated customer**

Registration alone is not activation. After a successful registration, the first-value page captures the authenticated App/WhatsApp usage counters as a baseline. Browser-side activation completes only when a later authenticated usage response is strictly higher than that post-registration baseline. Existing historical usage therefore cannot produce a false activation. If the baseline cannot be loaded, the detector fails closed and the first later usage observation becomes the baseline instead of success.

Completion event:
- `event_name=funnel_complete`
- `funnel_name=activation`
- `funnel_step=first_task_success`

## Funnel
page_view → CTA/intent → registration_view → registration_complete → first_value_view → first_task_selected → first_task_success

## Capability truth
- WhatsApp: productive primary customer concierge channel.
- Telephone: real runtime exists; the new Voice customer experience is not claimed as fully generally released.
- Web: account/login/settings are available; no claim of a fully released web concierge chat.
- App: technically prepared; customer release remains disabled.

## Conversion architecture
- Homepage focused on first successful task.
- Dedicated senior and family journeys.
- Intent pages for organization, documents and technology.
- Pricing separates tariff model from channel availability.
- Registration shows three activation steps without weakening secure auth or enabling paid checkout.
- First-value page provides concrete task prompts.
- Authenticated account usage is the activation truth source, evaluated as a post-registration counter delta rather than a cumulative `> 0` check.

## Experiments
`control` / `clarity` assignment is generated in memory on the homepage and recorded through the existing first-party analytics endpoint. The analytics visit identifier is also memory-only for the current page load. No analytics cookie, analytics Local/Session Storage identifier, third-party marketing tracker, advertising profile or cross-site tracker is added.

## Safety boundaries
No production deployment, provider activation, platform repository write, paid checkout enablement or external business execution is introduced.


## Privacy / measurement truth
- First-party product/funnel analytics is disclosed in `datenschutz.html`.
- Funnel payload is limited to event name, page path, coarse device class, optional referrer host and pseudonymous per-page identifiers.
- Activation-local browser state is functional state used to compare the post-registration baseline with later authenticated usage; it is not an advertising identifier.

## Final-Green acceptance additions
- Historical cumulative usage must not complete activation.
- A post-registration usage increase must complete activation.
- Analytics must not persist its visit identifier in browser storage.
- Accessibility contrast gates cover the homepage concierge selector and family footer.
