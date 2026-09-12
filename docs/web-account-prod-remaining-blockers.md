# NAHWERK Web / Kundenkonto — verbleibende PROD-Blocker

Stand: 2026-09-12

## PAYG

Der parallel laufende PAYG-Website-PR #61 besitzt die Dateien `payg.html`, `assets/payg-account.js`, `.github/workflows/web-account-prod-readiness.yml` und `tests/web-account-prod-readiness.test.mjs`. Dieser Strang überschreibt diese Dateien nicht.

Fresh verifiziert sind die aktiven PROD-Verträge:

- `web-payg`: PAYG-Status, Wallet, Zahlungsmethoden, Preise, Quotes, Nutzung, Buchungen sowie Aktivierung/Deaktivierung.
- `web-payg-checkout`: serverseitiger Stripe Checkout für Zahlungsmethode und Wallet-Aufladung; kein Stripe-Publishable-Key im Browser erforderlich.

Tatsächlich verbleibend im veröffentlichten PAYG-Vertrag:

- keine autoritative Aktion zum Entfernen/Deaktivieren einer vorhandenen Zahlungsmethode; eine neue Methode kann als Standard registriert werden,
- erster realer Stripe-Live-Kleinbetrag / Endkunden-E2E bleibt bewusst dem PAYG-Strang und der Owner-Freigabe vorbehalten.

## Web Concierge

Der zentrale `nahwerk-concierge-core` ist in PROD aktiv, aber der Browser darf die service-authentifizierte Core-Route nicht direkt verwenden. Außerdem ist der Channel `WEB` noch nicht für autoritative Kundenausgabe freigegeben.

Für echte Kundennachrichten fehlen damit noch:

- browserfähiger PROD-Web-Gateway,
- Validierung der bestehenden `scb_web_session`,
- serverseitige Auflösung der kanonischen Kundenidentität,
- Weiterleitung an den zentralen Core unter Service-Authentisierung,
- autoritative Core-Ausgabe für Channel `WEB`,
- veröffentlichter stabiler Browser Request-/Response-Vertrag.

Die alten Kundenkonto-Assets `web-core-shadow.js` und `web-concierge-chat.js` sind deshalb zu No-Network-Kompatibilitäts-Shims zurückgebaut. Sie enthalten keinen STAGING-Endpunkt und können weder Shadow-Nachrichten senden noch Shadow-Ergebnisse anzeigen.

`web-concierge.html` ist vollständig als authentifizierte Kundenoberfläche vorbereitet, bleibt aber fail-closed, bis der kanonische PROD-Web-Gateway-Vertrag verfügbar ist.

## Paid Legal

Die Legal-Dateien werden parallel in PR #25 bearbeitet und in diesem Strang nicht überschrieben.

Für einen vollständigen Paid-Consumer-Launch bleiben – soweit für das konkrete Produkt/Vertragsmodell einschlägig – insbesondere die elektronische Widerrufsfunktion samt serverseitiger Bestätigung/Bestätigungsnachweis sowie die Kündigungsoberfläche für kostenpflichtige Dauerschuldverhältnisse final zu schließen.

## Real Customer E2E

Der vollständige Gate-Test bleibt bis zu den verbleibenden Verträgen geschlossen:

Registrierung → Login → PAYG aktivieren → Zahlungsmethode → kostenpflichtiger Auftrag → Kostenfreigabe → Ausführung → Kosten/Nutzung im Konto → echter Web Concierge.

Keine echte Zahlung und kein Provider-Test wird durch diesen Website-Strang ausgelöst.
