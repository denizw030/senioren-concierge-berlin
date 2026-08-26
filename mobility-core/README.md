# NAHWERK Mobility Concierge Core

Isolierter, providerneutraler Core. Keine n8n-/Supabase-/Prime-/Production-Integration und keine Live-Buchung.

## Provider-Recherche (Stand 2026-08-26)

| Provider | Öffentliche/Partner-Schnittstelle | Availability/Preis | Booking/Cancel | Einordnung |
|---|---|---|---|---|
| Freenow | Öffentlich beworbenes Partnership Program mit „Embedded Mobility Solutions“ und Echtzeit-Buchung; konkrete API-Zugänge/Vertrag individuell zu klären | Partnerlösung bewirbt Echtzeit-Mobilität | Partner-/Web-Booker möglich | Kandidat nach Partnerschaft/Vertrag |
| Uber | Riders API v1.2 + Deep Links; Produktion für Ride Requests erfordert privilegierte Freigabe | API bietet products sowie price/time estimates | POST/PATCH/DELETE requests; Sandbox dokumentiert | Technisch stärkster API-Kandidat, Approval erforderlich |
| Bolt | Laut offiziellem Support derzeit keine öffentlichen oder privaten APIs | nein | nein | App/anderer Fallback, kein Fake-Adapter |
| taxi.eu | Keine belastbare öffentliche Concierge-API in dieser Recherche bestätigt | ungeklärt | ungeklärt | Partnerkontakt oder Outbound-Call-Fallback |
| Deutsche Bahn | DB API Marketplace Timetables: Soll-/Ist-Abfahrten, Änderungen, Stationen; Free-Plan 60 Calls/min | Fahrplan/Abweichungen, keine Taxi-Preise | keine Fahrtbuchung über Timetables | Information/Routing-Baustein |
| VBB/BVG | VBB-Datenarchitektur dokumentiert GTFS/API/HAFAS und Echtzeit-Daten; konkrete Drittanbieter-Zugangskonditionen vor Integration separat bestätigen | Fahrplan/Echtzeit soweit Feed/API verfügbar | keine Buchung im Core | ÖPNV-Provider vorbereiten, keine Daten erfinden |

## Sicherheitsgrenzen

- `INFORMATION -> PREPARE -> APPROVE -> EXECUTE`; EXECUTE bleibt standardmäßig aus.
- Family: Relationship allein reicht nicht; externe Scopes `mobility.information`, `mobility.prepare`, `mobility.book`.
- Accessibility ist bei expliziter Anforderung Hard Constraint und wird nie aus Alter abgeleitet.
- `FIXED`, `ESTIMATE`, `METERED`, `UNKNOWN` werden getrennt behandelt; Estimate ist kein Festpreis.
- Medizinischer Sondertransport bleibt Information/Prepare, keine Berechtigungsentscheidung.
- Payment/Credit-Card-Anforderungen laufen in ein Risk Gate.
- Kein Scraping, keine privaten APIs, keine Fake-Liveprovider.
- Reminder/Safety und Outbound Call sind nur Hooks/Fallbacks; keine zweite Engine wird gebaut.

## Test

`npm run test:mobility`

Die Suite enthält 60 automatisierte Tests für die im Arbeitsblock geforderten Sicherheits-, Ranking-, Family-, Accessibility-, Preis- und Providerfälle.
