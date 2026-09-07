# NAHWERK Customer Acquisition & Activation System V1

Baseline: `b335bbd60647cfe5e99f8f407c82d9708134562e`
Branch: `growth/activation-system-v1-20260907`

## North Star
**Cost per successfully activated customer**

Registration alone is not activation. Browser-side activation completes only when a successful registration marked the session pending and the existing authenticated account usage later reports `app_dialogues_used > 0` or `whatsapp_dialogues_used > 0`.

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
- Account usage is the activation truth source.

## Experiments
Session-only `control` / `clarity` assignment is recorded through the existing first-party analytics endpoint. No third-party marketing tracker or cookie is added.

## Safety boundaries
No production deployment, provider activation, platform repository write, paid checkout enablement or external business execution is introduced.
