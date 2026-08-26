# NW-LOCAL-PROVIDER-02 provider research — 2026-08-26

## Google Places API (New)

- Use Places API (New), not Legacy assumptions.
- Text Search (New): `POST /v1/places:searchText`; `textQuery` required; response field mask required.
- Nearby Search (New): `POST /v1/places:searchNearby`; circular `locationRestriction`; response field mask required.
- Place Details (New): use a Place ID when already known. `name` is the resource name (`places/PLACE_ID`); `displayName` is the human-readable name.
- Auth supports API key or OAuth. Billing must be enabled. Field selection changes SKU/billing; wildcard masks are unsuitable for production.
- Search/detail mapping may request `currentOpeningHours`, `regularOpeningHours`, `rating`, `userRatingCount`, phone fields, `websiteUri`, address and location only when required by the use case.
- Place Types (New) are mapped into NAHWERK's neutral category layer rather than leaked into product logic.
- Google Places opening-hours/reservable metadata does not constitute table availability. `supports_live_availability=false`.
- Geocoding and Routes stay separate provider capabilities. No credential or transport is wired in this branch.
- Provider data remains request-scoped in this core. Any future caching/persistence must be reviewed against the then-current Google Maps Platform terms/policies before implementation; this branch deliberately adds no cache/storage layer.

## TomTom fallback

- TomTom remains fallback only.
- Prepare Search/POI, nearby search, geocoding/reverse-geocoding and routing/travel-time boundaries behind the neutral adapter contract.
- TomTom POI categories stay provider-specific at the adapter edge and map into NAHWERK categories.
- Contact/opening-hours data may be mapped when supplied by the selected TomTom endpoint; ratings are not assumed as a reliable capability in the neutral contract.
- API-key authentication is required before a live transport can be wired.
- HTTP 429 maps to `ProviderRateLimited`; timeouts and 5xx map to explicit provider errors.
- TomTom is not a restaurant reservation provider. `supports_live_availability=false`.

## Hard boundaries

- No API keys or secrets in repository.
- No live Google/TomTom calls in tests.
- No scraping-based reservation flow.
- No live reservation provider is claimed.
- No phone call is performed; outbound call is contract/fixture only.
- No n8n, Supabase, Active Production or Prime changes.
