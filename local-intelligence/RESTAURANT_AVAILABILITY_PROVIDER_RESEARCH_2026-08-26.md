# NW-RESTAURANT-AVAILABILITY-PROVIDERS-01 — Provider research

Research date: 2026-08-26. Only public/official provider material was used. No undocumented endpoint, scraping or browser-booking automation is part of the design.

## OpenTable
- Germany: available; OpenTable lists bookable German restaurants.
- Official developer program: yes, partner application required.
- Booking API: documented by OpenTable as allowing booking on websites/apps/third-party platforms using current availability.
- Directory API: restaurant data and reservation links.
- Availability Search API and Booking API are explicitly named by OpenTable's API status service.
- Sandbox: officially offered to approved/requesting API partners.
- Auth/limits/exact modify/cancel semantics: partner documentation/access required; not assumed here.
- NAHWERK status: prepared adapter boundary only; no live transport until approval and credentials.

Official sources:
- https://dev.opentable.com/
- https://www.opentable.com/restaurant-solutions/api-partners/faqs/
- https://www.opentable.com/restaurant-solutions/api-partners/become-a-partner/
- https://status-api.opentable.com/

## TheFork
- Germany: TheFork Manager markets restaurant booking/integration services in Germany.
- Public consumer booking API for an independent concierge: not confirmed in public technical documentation reviewed.
- TheFork Manager advertises custom API integrations for restaurant ecosystems and official distribution channels (Tripadvisor, Michelin, Google).
- Booking widget / TheFork booking pages provide a safe link-out path.
- Commercial model publicly states fees for reservations coming from TheFork/Tripadvisor/partners and commission-free bookings from a restaurant's own website/social channels.
- NAHWERK status: deep-link/partner boundary only; no fabricated availability API.

Official sources:
- https://www.theforkmanager.com/de/softwareintegrationen-fur-restaurants
- https://www.theforkmanager.com/en/restaurant-software-price
- https://www.theforkmanager.com/de/restaurant-partners

## Quandoo
- Germany: currently available, but official consumer site states service closes in a planned process and remains available only through 2026-09-30. This makes it unsuitable as a durable new production dependency.
- Public Partner API: yes, scope depends on partner agreement.
- Availability: GET merchant availabilities and date/times; merchant search can include place/date/fromTime/capacity.
- Reservation create: PUT /v1/reservations.
- Modify: PATCH /v1/reservations, including status, party size, date/time. Cancellation can be represented by customer-cancel status update.
- Auth: X-Quandoo-AuthToken plus Agent ID attribution.
- Sandbox/test environment: yes; reservations are not actually sent to restaurants there.
- Webhooks: reservation and enquiry status notifications; manual registration per agent/type.
- Direct integration requires handling reservation/customer data and joint data-processing agreements.
- Rate limits: no fixed public numeric limit confirmed in reviewed docs; caching is recommended.
- NAHWERK status: technically strongest documented API, but strategic blocker is shutdown on 2026-09-30.

Official sources:
- https://docs.quandoo.com/
- https://docs.quandoo.com/check-availability/
- https://docs.quandoo.com/authentication-and-attribution/
- https://docs.quandoo.com/development-environments/
- https://docs.quandoo.com/webhooks-notifications/
- https://docs.quandoo.com/direct-integration/
- https://www.quandoo.de/important-update

## SevenRooms
- Official site advertises a flexible API, 100+ integrations and restaurant booking/channel-management integrations.
- Google, TheFork, Facebook and Instagram are named booking channels.
- Public technical diner-facing API specification suitable for an unaffiliated concierge was not confirmed in reviewed public material.
- NAHWERK status: partner/deep-link boundary only until SevenRooms grants and documents the relevant API scope.

Official source:
- https://sevenrooms.com/platform/integrations-apis/

## resmio
- Germany-focused restaurant reservation SaaS with booking widget.
- Official widget guidance documents a direct booking-widget link and participation in Google Reserve.
- Public general-purpose availability/booking API for an independent concierge was not confirmed.
- Data-processing material shows reservation/contact data handling and optional deposits/no-show fees via payment-provider interfaces.
- NAHWERK status: deep-link/restaurant-system integration boundary only; no live API assumed.

Official sources:
- https://www.resmio.com/wp-content/uploads/widget-integration-en.pdf
- https://www.resmio.com/wp-content/uploads/resmio-DPA-EN.pdf

## Google Reserve / Google Actions Center
- Google Actions Center is primarily an integration/distribution framework for approved booking platforms, not an upstream API NAHWERK can call to book arbitrary restaurants.
- Reservations Business Link supports merchant-specific deep links from Google Search/Maps.
- Reservations End-to-End requires partner approval, Sandbox/Production reviews, feeds, booking server and real-time updates.
- Google calls the partner's Booking Server for create/update flows; this does not expose other partners' inventory to NAHWERK.
- Direct contractual relationships with included merchants are required for End-to-End partner inventory.
- GDPR and applicable privacy law compliance is explicitly required.
- NAHWERK status: potential future distribution channel if NAHWERK becomes a reservation platform with merchant contracts; not a current availability provider.

Official sources:
- https://developers.google.com/actions-center/verticals/reservations/bl/overview
- https://developers.google.com/actions-center/verticals/reservations/e2e/integration-steps/overview
- https://developers.google.com/actions-center/verticals/reservations/e2e/policies/compliance-requirements
- https://developers.google.com/actions-center/verticals/reservations/e2e/reference/booking-server-code-samples/dining-payload-sample

## aleno (additional relevant provider)
- Official API: GraphQL.
- Can read/update restaurants, shifts, availability, reservations and guests.
- Official example flow: retrieve/create guest, check availability, create reservation.
- Webhooks: yes.
- Test environment: available on request.
- API token required; access is linked to the restaurant/customer setup and therefore cannot be treated as universal inventory.
- NAHWERK status: strong restaurant-owned-system adapter candidate, particularly for restaurants already using aleno.

Official source:
- https://knowledge.aleno.me/de/kb/introduction-to-the-aleno-api

## Privacy / customer data
Search-phase provider requests must contain no guest identity data. For reservation prepare/create, send only fields actually required by the provider/restaurant contract (typically reservation name plus a required contact channel, date/time and party size). Free-text special requests can contain sensitive data and must not be transmitted by default. Payment/guarantee requirements always block automatic confirmation pending explicit user approval.

## Commercial neutrality
Partner status, affiliate status, commission and referral economics are metadata only and are prohibited ranking signals. Restaurant ranking remains based on objective quality, fit, distance/travel/opening information and authorized user preferences.

## Fallback order
1. Structured availability API when capability and partner configuration are confirmed.
2. Official booking/deep link.
3. Integrated restaurant-owned reservation system.
4. Existing outbound-call core as fallback only.
5. NEEDS_USER_INPUT if no safe method is available.
