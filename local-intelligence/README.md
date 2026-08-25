# NAHWERK Local Intelligence Core

Isolated, provider-neutral Phase-1 core for `NW-LOCAL-INTELLIGENCE-01`.

- No n8n, Supabase, Production or Prime changes.
- No Google/TomTom credentials or live calls.
- `GooglePlacesAdapter` and `TomTomPlacesAdapter` deliberately stop at `NotImplementedError` boundaries.
- Fixtures are synthetic; no customer/location data.
- Provider content is request-scoped only; this module defines no persistence or location history.
- External provider identity stays separate through `external_provider` + `external_id`.
- `partner` is deliberately excluded from ranking.
- `OpeningStatus.UNKNOWN` is rendered as uncertain, never open.
- Memory only contributes a bounded preference signal after eligibility; it cannot alter objective provider facts.
- Family location input is accepted only through an authorized `family_authorized_location` context.

Run from `local-intelligence/`:

`python -m unittest discover -s tests -v`
