# Provider Integration Technical Preparation

Status: 2026-08-26. Research/preparation only. No production credentials, no customer transfer, no EXECUTE.

## Verivox – officially confirmed

Official sources reviewed:
- https://www.verivox.de/partnerprogramm/
- https://www.verivox.de/marktdaten/energie/energiewebservice/
- https://www.verivox.de/marktdaten/anfragen/

Confirmed:
- Partner programme markets electricity, gas, DSL, mobile and mobile internet among other products.
- Partner advertising/integration formats include iFrame, banner, link-out and Webservice.
- Verivox explicitly documents a Webservice/API-style deep integration for electricity and gas; tariff data includes tariffs, tariff details, providers and customer ratings.
- The electricity/gas Webservice requires a separate contract.
- Verivox describes real-time energy tariff comparison and a white-label energy calculator; an integrated completion flow can be part of the contracted energy solution.
- Public partner material says partners seeking data/API/deep integration should contact Verivox.

Not sufficiently public for production implementation:
- concrete endpoint URLs and request/response schema for the partner Webservice
- authentication/credential model
- sandbox/test environment
- documented rate limits / Retry-After policy
- complete production field mapping
- a publicly documented structured DSL/mobile tariff API equivalent to the confirmed electricity/gas Webservice
- contractual permission for the exact NAHWERK WhatsApp concierge flow

Therefore `VerivoxAdapter` has no HTTP client. It exposes the provider-neutral contract and accepts only explicit `NAHWERK_VERIVOX_TEST_FIXTURE_V1` fixtures until partner documentation and credentials exist.

## CHECK24 – officially confirmed

Official sources reviewed:
- https://www.check24-partnerprogramm.de/
- https://www.check24-partnerprogramm.de/information/
- https://www.check24-partnerprogramm.de/register/
- https://www.check24-partnerprogramm.de/provisionen/
- https://www.check24-partnerprogramm.de/system/drucken/?print=agb

Confirmed:
- Partner programme supports comparison calculators for energy/telecommunications and white-label variants.
- Personal direct/deep links may be shared via WhatsApp and other messenger services.
- Partner account provides advertising material and tracking/reporting.
- Current public programme material advertises 20 EUR net for electricity/gas applications, DSL up to 72.50 EUR and mobile rates depending on product; these values are commercial metadata only and MUST NOT affect ranking.
- The energy participation conditions state the electricity/gas application must be submitted by the applicant themselves; third-party submission is not permitted under those public conditions.

Not publicly confirmed:
- a structured public tariff-search API with stable schema/auth/rate limits for NAHWERK
- permission to pre-submit customer application data server-to-server
- public technical format of partner-issued tracking IDs/deep links beyond the links generated in the partner account

Therefore `Check24Adapter` does not invent an API. It supports a partner-supplied HTTPS link-out value and tracking identifier, plus explicit TEST fixtures only. Structured search remains unavailable until CHECK24 supplies a written/API contract.

## Provider-neutral adapter contract

Every real adapter must expose:
- `search_offers(request)`
- `get_offer_details(provider_offer_id)`
- `validate_location(request)`
- `normalize_offer(raw)`
- `get_provider_capabilities()`

Provider-neutral request uses product type, postal code, optional annual usage/city and `NeedProfile`.

Capabilities explicitly state whether structured search, offer details, location validation, link-out, white-label, tracking and completion flow are available and whether a partner contract is required. `production_ready` remains `False` for Verivox and CHECK24 in this branch.

## Transport behaviour

Provider HTTP clients, once partner documentation exists, must translate:
- HTTP 429 -> `ProviderRateLimited` and respect partner `Retry-After`/contract policy
- HTTP 5xx -> `ProviderUnavailable`
- stale offers -> blocked by the Core safety gate

No retry count or rate-limit threshold is invented before provider documentation is received.

## Concierge comparison flow

`WhatsApp question -> Contract Intelligence -> required/verified fields -> OfferSearchRequest -> provider adapter(s) -> normalize -> safety/freshness -> cost calculation -> provisionsneutral ranking -> select_concierge_recommendations(max 3)`

Standard output classes:
1. `best_option`
2. `best_price_stable_option`
3. `sensible_alternative`

Each selected offer can expose provider, tariff, first-year cost, following-year cost, minimum term, cancellation notice, price guarantee, bonus, known risk and calculated saving when an old-contract baseline is available.

## Commercial separation

`CommercialMetadata` contains partner/commercial fields (`affiliate_program`, `tracking_id`, `commission_type`, `commission_value`, `confirmed`) separately from ranking.

Ranking weights remain:
- `commission = 0`
- `partner_status = 0`
- `sponsored = 0`

## Still blocked

- production customer-data transfer
- provider application submission
- PREPARE/APPROVE production wiring
- EXECUTE
- n8n wiring
- Supabase migration/security changes
- use of secrets

Next step after real partner approval: obtain the exact technical contract, implement authenticated transport behind the existing adapter, record provider-specific required fields and rate-limit rules, run provider sandbox/certification tests if supplied, and only then mark individual capabilities production-ready.
