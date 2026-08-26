# NAHWERK Service / Appointment Concierge Core

Isolated, provider-neutral Python core for service-provider discovery, eligibility, ranking, appointment availability, preparation, approval boundaries and delegation hooks.

Safety properties: no live booking/call/provider credentials, EXECUTE off by default, family authorization via external scopes, hard accessibility/location constraints, no invented availability, payment/card/cancellation-fee risk gates, idempotency and privacy-minimal audit events.

Reuse boundary: LocationContext follows Local Intelligence semantics; outbound calls, Action/Approval, Memory, Family Authorization, Reminder, Mobility and Fraud are represented only by delegation hooks and are not reimplemented.

Run tests:

```bash
python -m pytest -q service-appointment/tests
```
