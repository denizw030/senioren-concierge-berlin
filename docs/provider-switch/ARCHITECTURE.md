# NAHWERK Anbieterwechsel – Architekturgrundlage

Status: Design-only. Keine produktive Integration, keine Migration, kein EXECUTE.

## Ziel

Ein Concierge-Prozess für Strom, Gas, Internet/Festnetz und Mobilfunk:

`INFORMATION -> PREPARE -> APPROVE -> EXECUTE`

Dieser Branch implementiert ausschließlich Spezifikation und Vorbereitungsartefakte. Der bestehende n8n-Master, Prime-Workflow, Supabase-Security, Active Production und Website-main bleiben unberührt.

## Komponenten

1. Contract Intelligence
   - Eingänge: Text, WhatsApp, Audio-Transkript, Foto/Screenshot, PDF/Rechnung/Vertrag; E-Mail später.
   - Extraktion feldweise mit `value`, `confidence`, `evidence`, `verification_status`.
   - Status: `verified | probable | uncertain | missing`.
   - Unsichere Werte dürfen nie stillschweigend für Wechselaktionen verwendet werden.

2. Need Profile
   - Nur Fragen stellen, die Ranking oder Verfügbarkeit tatsächlich ändern.
   - Energie: Haushalt, Verbrauch, Wärmepumpe, EV, Preisstabilität.
   - Internet: Personen, Streaming, Homeoffice, Gaming, Upload, Anschluss, Stabilität.
   - Mobilfunk: Daten, Telefonie, EU, 5G, Netzpräferenz, Endgerät.

3. Provider Search Adapter
   - Einheitliche Adaptergrenze für Vergleichsportale, Webservices/APIs, strukturierte Anbieterquellen und Deep Links.
   - Rohdaten werden normalisiert; Quelle, Abrufzeit und Angebotsgültigkeit sind Pflichtfelder.

4. Offer Normalization
   - Einheitliches Kostenmodell für Grundpreis, Verbrauch, Einmalkosten, Boni, Hardware, Versand, Anschluss und Aktions-/Folgepreis.
   - Keine Ersparnis, wenn entscheidende Werte fehlen.

5. Ranking Engine
   - Reihenfolge: Bedarfseignung, effektive Gesamtkosten, Verfügbarkeit, Bedingungen, Preisstabilität, Leistungsqualität, Präferenzen, Wechselrisiko.
   - Provision erhält exakt 0 Ranking-Punkte.
   - Kommerzielle Beziehung wird getrennt gespeichert und kann transparent angezeigt werden.

6. Comparison Engine
   - Ergebnis: `GOOD | ACCEPTABLE | REVIEW_WORTHY | CLEARLY_TOO_EXPENSIVE | INSUFFICIENT_DATA`.
   - Keine Scheingenauigkeit: Unsicherheit und fehlende Daten werden sichtbar gemacht.

7. Switch Preparation
   - Baut eine unveränderliche, versionierte Zusammenfassung aus ausgewähltem Angebot + Kundendaten + Risiken.
   - Prüft Doppelwechsel, Kündigung, Portierung, Verfügbarkeit, Adress-/Identitätsdaten und Angebotsfrische.

8. Approval
   - Explizite Zustimmung zu genau einer versionierten Preparation.
   - Jede materielle Preis-/Tarifänderung invalidiert die Approval und verlangt erneute Bestätigung.

9. Action Orchestrator
   - In diesem Design nicht ausführbar.
   - Später nur serverseitig, idempotent, fail-closed, auditierbar und nach Security-Freigabe.

## State Machine

`draft -> data_required -> ready_for_comparison -> offers_found -> review_required -> prepared -> awaiting_customer_approval -> approved -> execution_pending -> executed`

Terminal/Abzweige: `failed`, `cancelled`, `expired`.

Transitions erfolgen ausschließlich serverseitig. Ein Client darf keinen Status frei setzen.

## Senioren-Schutz

- Keine künstliche Dringlichkeit oder Dark Patterns.
- Keine implizite Zustimmung.
- Vor Approval verständliche Darstellung von Altanbieter, Neuanbieter, Tarif, Kosten, Einmalkosten, Laufzeit, Kündigung, Bonus, Ersparnis, Risiken und nächstem Schritt.
- Kritische Felder (Adresse, Vertrags-/Kundennummer, Kündigung, Portierung, Telefonnummer) benötigen Verifikation vor späterem EXECUTE.
- Mobilfunk: Rufnummernverlust/Portierung ausdrücklich absichern.
- Festnetz: Unterbrechungsrisiko und Bereitstellungstermin sichtbar machen.
- Bei widersprüchlichen Dokumenten oder unsicherer Extraktion: `review_required`.

## Datenschutz

Datenklassen strikt trennen:

- Analyse: nur zur Vertragserkennung benötigte Daten.
- Vergleich: Standort/Bedarf/Verbrauch soweit für Tarifermittlung nötig.
- Wechsel: erst bei PREPARE zusätzliche Abschlussdaten erfassen.
- Provider-Transfer: nur nach APPROVE und nur für konkret erforderliche Felder.

Dokumente erhalten Retention-Metadaten. Wo möglich, werden strukturierte Extraktionen länger gehalten als vollständige Originaldokumente. Einwilligungen und Provider-Transfers werden auditierbar protokolliert.

## Integrationsprinzip

`WhatsApp -> Concierge Intent -> Contract Intelligence -> Provider Search -> Offer Normalization -> Ranking -> Comparison -> Prepare -> Approval -> Action Orchestrator -> Provider/Affiliate`

Der n8n-Master wird erst nach Abschluss des separaten Security-Blocks angebunden. Bis dahin sind die Schnittstellen in `openapi.yaml` die Integrationsgrenze.
