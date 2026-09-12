# NAHWERK Web / Kundenkonto — PROD Integration

Stand: 2026-09-12

## Bereits direkt an PROD angeschlossen

Die Website verwendet für PAYG ausschließlich den aktiven PROD-Vertrag:

`https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg`

Der Browser sendet nur den bestehenden `scb_web_session` Bearer. Identität, Kundenkonto, PAYG-Zustand, Wallet, Zahlungsmethoden, Preise, Preisfreigaben, Transaktionen und Nutzung werden serverseitig autoritativ bestimmt.

Unterstützte Aktionen des veröffentlichten Vertrags:

- PAYG aktivieren / deaktivieren
- optionale Tages- und Monatslimits
- Setup einer Zahlungsmethode vorbereiten
- bestätigte Zahlungsmethode synchronisieren
- Wallet-Aufladung 5 / 10 / 20 / 50 EUR vorbereiten
- PAYG-Preisfreigabe bestätigen oder ablehnen
- aktuelle Preise, Wallet, Nutzung und Buchungen lesen

Die Website erfindet keine zusätzlichen Aktionen.

## Tatsächlich verbleibende Blocker

### 1. Stripe Live Browser-Konfiguration

`web-payg` kann serverseitig Stripe SetupIntent/PaymentIntent Client-Secrets erzeugen. Für Stripe.js benötigt der Browser zusätzlich den echten Stripe Live Publishable Key (`pk_live_…`). Dieser ist aktuell weder über den PAYG-PROD-Vertrag noch über eine Website-PROD-Konfiguration veröffentlicht.

Bis der echte Key vorhanden ist:

- Zahlungsmethode hinzufügen bleibt gesperrt,
- Wallet-Aufladung bleibt gesperrt,
- es wird kein Test-Key und keine STAGING-Konfiguration verwendet.

Aufladungen bleiben zusätzlich gesperrt, wenn `payment_provider.webhook_configured !== true`, damit eine Browser-Zahlungsbestätigung nicht fälschlich als verbuchtes Guthaben dargestellt wird.

### 2. Zahlungsmethode entfernen

Der aktuelle `web-payg`-Vertrag besitzt keine autoritative Aktion zum Entfernen/Deaktivieren einer Zahlungsmethode. Die Website bietet deshalb keinen Fake-Entfernen-Button an. Eine neue bestätigte Methode kann über den vorhandenen Vertrag als Standard registriert werden.

### 3. Echter Web Concierge

Der zentrale `nahwerk-concierge-core` ist in PROD aktiv. Der Browser darf dessen service-authentifizierte Core-Route jedoch nicht direkt verwenden. Außerdem ist `WEB` noch nicht für autoritative Kundenausgabe freigegeben.

Für echte Kundennachrichten fehlen damit noch gemeinsam:

- ein browserfähiger PROD-Web-Gateway,
- Validierung von `scb_web_session`,
- serverseitige Auflösung von Person/Kundenkonto,
- Weiterleitung an den zentralen Core unter Service-Authentisierung,
- autoritative Core-Ausgabe für Channel `WEB`,
- ein veröffentlichter stabiler Client-Request-/Response-Vertrag.

Die ehemaligen Shadow/STAGING-Assets wurden auf der Kundenwebsite zu No-Network-Kompatibilitäts-Shims zurückgebaut. Sie können keine Test-/Shadow-Nachricht mehr senden oder anzeigen.

### 4. Paid Legal / Widerruf

Die PAYG-Oberfläche zeigt den konkreten Betrag unmittelbar am kostenpflichtigen Freigabe- bzw. Auflade-Button und verlangt bei Aufladung eine ausdrückliche Bestätigung. Sie verlinkt AGB, Datenschutz und Widerruf dauerhaft.

Die bereits separat gelockten Legal-Dateien werden in diesem Website-Strang nicht überschrieben. Für den vollständigen Paid-Consumer-Launch muss der Legal-Strang insbesondere die tatsächlich erforderliche elektronische Widerrufsfunktion samt Bestätigung/Bestätigungsnachweis und – soweit für angebotene Dauerschuldverhältnisse einschlägig – die Kündigungsoberfläche final schließen.

### 5. Real Customer E2E

Nach Veröffentlichung des Stripe Live Browser-Keys sowie des echten Web-Concierge-Gateways kann unmittelbar der vollständige echte Kundenlauf geprüft werden:

Registrierung → Login → PAYG aktivieren → Zahlungsmethode → kostenpflichtiger Auftrag → Kostenfreigabe → Ausführung → Kosten/Nutzung im Konto.

Ein echter kostenpflichtiger Provider-/Zahlungstest wird in diesem Website-Strang nicht ausgelöst.
