# NAHWERK Web / Kundenkonto — PROD Readiness Blockers

Stand: 2026-09-12

## Scope

Website-only. Keine Shared-Backend-, DB-, Billing-, Wallet-, Core-, CAO-, WhatsApp-, Voice- oder Telefon-Runtime-Mutation.

## PAYG — externer Blocker

Im aktuell veröffentlichten Website-/Repository-Stand ist kein kanonischer PAYG-PROD-Webvertrag verfügbar, den die Website sicher konsumieren kann. Deshalb bleibt `payg.html` fail-closed und zeigt keine erfundenen Zustände.

Für die vollständige Kundenstrecke muss der PAYG-Arbeitsstrang den kanonischen PROD-Webvertrag veröffentlichen, mindestens mit:

- serverseitig autoritativem PAYG-Aktivierungsstatus für das eingeloggte Kundenkonto,
- sicherem, kontogebundenem Aktivierungsvorgang inklusive Idempotenz-/Exactly-once-Vertrag,
- serverseitig autoritativem Status der Zahlungsmethode ohne Offenlegung sensibler Kartendaten,
- serverseitig autoritativer Kosten-/Nutzungsansicht für PAYG-Aufträge,
- klaren, stabilen Kundenfehlerzuständen für Auth, Billing Gate, fehlende Zahlungsmethode und nicht verfügbare Aktivierung.

Die Website erfindet dafür keine parallelen Endpunkte oder Response-Schemas.

## Web Concierge — externer Blocker

Der aktuell eingebundene Web-Chat ist ausdrücklich nur eine Shadow-/Testoberfläche. `assets/web-core-shadow.js` verweist auf `nahwerk-customer-portal-staging/portal/web-core-shadow`; erfolgreiche Shadow-Verarbeitung setzt `shadow_only: true` und `customer_delivery: false`. `assets/web-concierge-chat.js` bezeichnet die Oberfläche ebenfalls als Shadow/Test und ist standardmäßig deaktiviert.

Damit existiert aktuell kein veröffentlichter echter PROD-Web-Concierge-Transport für einen normalen eingeloggten Kunden. Der Website-PROD-Guard blockiert den STAGING-Transport zusätzlich. Für die vollständige Kundenstrecke muss ein kanonischer PROD-Web-Transport des zentralen Concierge Core bereitgestellt und danach gegen einen realen Kundenkontext E2E verifiziert werden. Die Website erfindet keinen Ersatztransport.

## Telefonannahme — PROD-Schutz

`konto.html` enthält im Legacy-Markup noch einen ausdrücklich als STAGING bezeichneten Endpoint für Telefonannahme. Die Website blockiert deshalb auf der Kundenkonto-Seite jeden STAGING-Fetch und blendet die Telefonannahme-Oberfläche aus. Eine Wiederfreigabe darf erst erfolgen, wenn ein kanonischer PROD-Vertrag existiert.

## Paid Contracting / Legal

Die bestehende Website-Launch-Readiness-Arbeit bleibt für kostenpflichtige Vertragsabschlüsse fail-closed. Vor einem echten Paid Checkout müssen die noch offenen, verifizierten Legal-/Kontakt- und gesetzlichen Online-Kündigungs-/Widerrufsanforderungen vollständig geschlossen sein. Bis dahin darf kein UI einen kostenpflichtigen Vertragsabschluss als erfolgreich darstellen.

## Gate

`READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E` bleibt `NO`, solange PAYG-Aktivierung, Zahlungsmethode und PAYG-Kosten nicht über einen kanonischen PROD-Webvertrag real verfügbar sind, der Web Concierge keinen echten PROD-Kundentransport besitzt und die vollständige Kundenstrecke nicht gegen PROD end-to-end verifiziert wurde.
