# Provider research — 2026-08-26

Scope: public/official documentation only; no private APIs, login scraping, credentials or live calls.

| Provider | Finding | Core recommendation |
|---|---|---|
| Google Places API (New) | Public paid API: Text Search, Nearby Search, Place Details; opening hours and place data, but no generic appointment-slot API | Primary discovery/details provider; never infer appointment availability from opening hours |
| Planity | German consumer beauty booking platform with selectable slots and salon booking links; no public general-purpose third-party booking API confirmed in reviewed official docs | Deep-link / external-booking only until documented partner API access is contracted |
| Treatwell | Beauty marketplace and partner ecosystem; no public general-purpose concierge booking API confirmed in reviewed official public material | External booking/deep-link or call fallback; no private API |
| Doctolib | Healthcare appointment marketplace; reviewed public partner program concerns acquisition of healthcare-professional customers, not patient-booking API access | Organizational search/deep-link only unless documented API access is granted; no medical quality “best” claims |
| Jameda | Healthcare directory/appointment service; no documented public concierge booking API confirmed | Discovery/deep-link only; contract/API clarification required |
| Shore | Official material states online booking plus public/open API; API availability depends on setup/tariff | Strong candidate after obtaining API docs/test access and verifying appointment endpoints/scopes |
| TIMIFY | Official Developer Platform with REST API, webhooks, apps and 120+ endpoints; booking workflow extensibility | Highest-priority generic scheduling candidate after test access; verify exact endpoints/scopes before adapter |
| Calendly | Official REST API v2; available-time endpoint and Scheduling API for AI agents; POST /invitees books, cancel endpoint exists; direct reschedule endpoint not currently available, reschedule URL is returned | Implementable adapter for known Calendly-backed providers; OAuth/scopes and provider authorization required |
| Provider-owned booking page | Booking URL can be surfaced | REQUIRES_EXTERNAL_BOOKING unless a documented permitted API exists |
| Telephone | Existing Outbound Call Core can query availability later | Universal fallback; Service Core emits bounded call task only |

## Evidence reviewed
- https://developers.google.com/maps/documentation/places/web-service/op-overview
- https://developers.google.com/maps/documentation/places/web-service/data-fields
- https://www.planity.com/de-DE
- https://info.planity.com/de-de
- https://www.shore.com/
- https://www.timify.com/en/features/developer-platform/
- https://www.timify.de/de/partners/
- https://developer.calendly.com/schedule-events-with-ai-agents
- https://developer.calendly.com/scopes
- https://developer.calendly.com/frequently-asked-questions

Capabilities are explicit. A provider that only supports search/details can never produce AVAILABLE or CONFIRM. Opening hours are not appointment availability. Any provider-specific integration requires documented public/partner API permission and test credentials before live implementation.
