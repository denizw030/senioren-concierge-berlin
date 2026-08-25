# Ranking, Sparlogik, Tests und Roadmap

## 1. Ranking-Spezifikation

Provision ist kein Rankingmerkmal und hat Gewicht 0.

### Hard gates
Ein Angebot wird nicht empfohlen, wenn eine zwingende Voraussetzung nicht erfüllt oder nicht verifizierbar ist, z. B. Standortverfügbarkeit, benötigte Anschlussart, erforderliche Mobilfunkleistung oder wesentliche Angebotsdaten.

### Score (0–100)
Nach Hard Gates:

- Bedarfseignung: 30
- Effektive Gesamtkosten: 25
- Vertragsbedingungen/Flexibilität: 12
- Preisstabilität: 10
- Leistungsqualität: 10
- Kundenpräferenzen: 8
- Wechselrisiko: 5
- Provision: 0

Gewichte sind versioniert und produktspezifisch kalibrierbar. Jede Rangliste speichert `ranking_version` und Teil-Scores.

### Unsicherheit
- Fehlende kritische Daten -> keine finale Empfehlung.
- Unsichere Kosten -> Bandbreite statt Punktwert vortäuschen.
- Nicht verifizierte Verfügbarkeit -> `review_required`.

## 2. Sparlogik

Für einen Betrachtungszeitraum werden alle bekannten Zahlungsströme normalisiert.

`effective_cost(period) = recurring_base + variable_usage + one_time_costs + hardware + connection + shipping - eligible_bonuses`

Bonusse werden nur eingerechnet, wenn ihre Bedingungen im bekannten Kundenfall erfüllbar und transparent sind.

Ausgabe:
- Ersparnis erstes Jahr = Altvertrag Jahr 1 - Neutarif Jahr 1
- Ersparnis Folgejahr = Altvertrag Folgejahr - Neutarif Folgejahr
- durchschnittliche Monatsdifferenz = Differenz des gewählten Vergleichszeitraums / Monate

Wenn eine entscheidende Preisvariable fehlt: `savings = null`, plus `missing_data`.

## 3. Approval-Modell

Die Bestätigung zeigt mindestens:
- alter Anbieter
- neuer Anbieter
- Tarif
- erwartete Kosten im ersten Jahr und Folgejahr
- einmalige Kosten
- Mindestlaufzeit
- Kündigungsfrist
- Bonusbedingungen
- erwartete Ersparnis bzw. Hinweis, wenn nicht belastbar berechenbar
- bekannte Risiken
- welche konkrete Aktion als Nächstes erfolgen würde

Approval bindet an `preparation_hash`. Preis-, Tarif-, Verfügbarkeits- oder Laufzeitänderungen erzeugen eine neue Version und machen die alte Approval ungültig.

## 4. Automatisierungsgrenzen

### KI autonom
- Dokument klassifizieren/extrahieren mit Confidence
- fehlende Informationen identifizieren
- Bedarf mit minimalen Rückfragen erheben
- Angebote normalisieren
- Kosten berechnen
- objektiv ranken
- Risiken und Unterschiede erklären

### Nur vorbereiten
- Kündigungs-/Wechseldaten zusammenstellen
- Portierungswunsch vorbereiten
- Providerformular-Daten mappen
- Approval-Zusammenfassung erzeugen

### Explizite Kundenbestätigung
- Auswahl des Zieltarifs
- Bestätigung der finalen Vertrags-/Wechseldaten
- Freigabe eines späteren Abschlusses/Provider-Transfers

### Menschliche Prüfung sinnvoll/erforderlich
- widersprüchliche Dokumente
- unklare Vertragsinhaberschaft
- Sonderkündigung/strittige Kündigungsrechte
- problematische Rufnummernportierung
- ungewöhnliche oder hochriskante Wechselkonstellation
- Nutzer versteht Abschlusswirkung erkennbar nicht

### Vorläufig nicht automatisieren
- Versicherungen, Kredite, Investments, Zahlungsdienste
- echte Provider-EXECUTE-Aktion bis Rechts-, Security- und Partnerprüfung abgeschlossen sind

## 5. Testkatalog

1. Günstiger Altvertrag -> kein Wechsel nur wegen Affiliate-Angebot empfehlen.
2. Teurer Altvertrag -> bessere Optionen korrekt ranken.
3. Lockangebot -> Aktionsende und Folgejahr berücksichtigen.
4. Bonus -> nur bei erfüllbaren Bedingungen einrechnen.
5. OCR-Zahl unsicher -> keine stille Übernahme.
6. Kündigungsfrist fehlt -> Preparation blockieren oder Review.
7. DSL/Glasfaser nicht verfügbar -> Angebot Hard Gate fail.
8. Mobilfunk mit Portierung -> Nummernerhalt explizit prüfen.
9. Kunde lehnt ab -> cancelled, keine Provider-Aktion.
10. Approval läuft ab -> expired.
11. Angebot ändert sich nach Approval -> Approval invalidieren.
12. Höhere Provision, schlechteres Angebot -> Ranking unverändert objektiv.
13. Senior missversteht Abschluss -> keine Approval/Execution, verständliche Wiederholung oder Human Review.
14. Falsche Adresse -> Vergleich/Prepare stoppt vor Provider-Transfer.
15. Doppelte Anfrage -> idempotent deduplizieren.
16. Vergleichsdaten zu alt -> Refresh erforderlich.
17. Affiliate-System down -> Vergleich darf informativ weiterlaufen, Execute fail-closed.
18. Vertragsdokument unlesbar -> data_required.
19. Anbieter/Tarif unbekannt -> kein erfundener Match.
20. Strom/Gas Preis mit Verbrauchskomponente -> Jahreskosten korrekt mengenabhängig.
21. Routermiete/Hardware -> in effektiven Kosten enthalten.
22. Cashback/Bonus erst später -> Zeitpunkt und Bedingungen sichtbar.
23. Telekom-Vertragszusammenfassung ändert Daten -> erneute Bestätigung.
24. Provider antwortet doppelt -> idempotency_key verhindert Doppelaktion.
25. Consent widerrufen -> keine neue Datenübertragung.

## 6. Implementierungsphasen

### Phase 1 – Contract Intelligence [JETZT UMSETZBAR]
- Extraktionsschema, Confidence, Dokumentklassifikation, Verifikationsworkflow.
- Noch keine produktive Migration in diesem Branch.

### Phase 2 – Provider/Offer Intelligence [JETZT UMSETZBAR + EXTERNER PROVIDER ABHÄNGIG]
- Adapterinterface, Normalisierung, Quellen-/Freshness-Modell.
- Partnerzugänge/API-Verträge separat beantragen.

### Phase 3 – Comparison Engine [JETZT UMSETZBAR]
- Kostenmodell, Ranking, Unsicherheit, Erklärbarkeit, Tests.

### Phase 4 – Prepare + Approval [SECURITY-ABHÄNGIG]
- AuthZ, serverseitige State Transitions, Consent, immutable snapshots.

### Phase 5 – Action Orchestrator [SECURITY-ABHÄNGIG + RECHTLICH ZU PRÜFEN]
- Idempotenz, Audit, Retry/Fail-closed, Human Review.

### Phase 6 – Provider-Integrationen [EXTERNER PROVIDER ABHÄNGIG + RECHTLICH ZU PRÜFEN]
- Je Partner exakt erlaubte Aktionen, Datentransfer, Tracking und Abschlussstrecke vertraglich abbilden.

### Phase 7 – Pilot [ALLE ABHÄNGIGKEITEN]
- Zunächst begrenzte Produkte/Provider, Shadow-Comparison, dann kontrollierte Prepare/Approve-Flows; Execute erst nach Freigaben.

## 7. Nicht verhandelbare Produktions-Gates

- Security-Arbeitsblock abgeschlossen.
- Produkt-/Partnerbedingungen schriftlich geprüft.
- Datenschutz/Retention freigegeben.
- State-Machine serverseitig erzwungen.
- Approval manipulationssicher und versioniert.
- Idempotenz- und Doppelwechseltests bestanden.
- Keine Provision im Ranking.
- Keine echten Kundendaten in Test-/Designartefakten.
