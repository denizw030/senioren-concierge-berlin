# Provider-/Vergleichs-Integrationsmatrix

Recherchezeitpunkt: 2026-08-25. Vor produktiver Nutzung erneut verifizieren und jeweilige Vertragsbedingungen prüfen.

## CHECK24 Partnerprogramm

Öffentlich dokumentiert:
- Vergleichsrechner für Energie, Telekommunikation und Reisen, auch als Whitelabel.
- Partnerprogramm nennt Website, Social Media und Messenger wie WhatsApp als mögliche Kanäle.
- Strom/Gas: öffentlich 20 EUR stornofrei je Lead/Antrag beworben.
- DSL: öffentlich bis 72,50 EUR je Abschluss beworben.
- Mobilfunk: 2026 öffentlich bis 30 EUR pro erfolgreichem Abschluss beworben.
- Tracking erfolgt über Partner-Werbemittel/Direktlinks; Anträge/Sales sind im Partnerkonto einsehbar.

Technische Einstufung für NAHWERK:
- Sofort realistisch: Link-out/vergleichsrechnerbasierte Vermittlung nach Partnerfreischaltung.
- Whitelabel: öffentlich angeboten, Integrationsdetails im Partnerbereich prüfen.
- Nicht öffentlich ausreichend belegt: eine freie API, mit der NAHWERK eigenständig vollständige Tarife abrufen und im Namen des Kunden serverseitig abschließen darf.
- Deshalb kein autonomes Provider-EXECUTE modellieren, bevor CHECK24 dies schriftlich/vertraglich freigibt.

## Verivox Partnerprogramm

Öffentlich dokumentiert:
- Produkte: Strom, Gas, DSL, Mobilfunk, mobiles Internet sowie weitere Kategorien.
- Werbemittel: iFrame, Banner, Link-out, Webservice.
- Strom/Gas-Webservice/API: Tarif-, Tarifdetail-, Anbieter- und Bewertungsdaten; separater Vertrag erforderlich.
- Tiefenintegration/Webservice kann individuell vereinbart werden.
- Öffentlich genannte Netto-Provisionen: Strom 20 EUR, Gas 20 EUR, DSL 50 EUR, Mobilfunk/Handy 15 EUR, mobiles Internet 10 EUR je bestätigtem Abschluss (Stand Recherchezeitpunkt).

Technische Einstufung für NAHWERK:
- Sehr guter Kandidat für Provider/Offer Intelligence, weil ein Energie-Webservice ausdrücklich dokumentiert ist.
- Link-out/iFrame kann als frühere Integrationsstufe dienen.
- Für automatisiertes Vorbefüllen, Übertragen von Kundendaten und serverseitigen Abschluss muss der konkrete Partnervertrag die zulässigen Felder/Aktionen festlegen.

## Direkte Anbieterprogramme

Nicht pauschal implementieren. Für jeden Strom-/Gas-/Telekom-Anbieter separat erfassen:
- Produktbereich und Vertriebsgebiet
- öffentliche/vertragliche API
- Verfügbarkeitsprüfung
- Tarifdatenzugriff
- Deep-Link/Tracking
- Vorbefüllung erlaubt?
- Kundendatenübertragung erlaubt?
- wer ist Antragsteller/Vertragspartner?
- Approval-/Signaturanforderung
- Storno-/Provisionslogik
- Datenschutzrollen und Auftrags-/Gemeinsame-Verantwortung

## Empfohlene Integrationsreihenfolge

1. Vergleich und Contract Intelligence vollständig provider-neutral bauen.
2. Verivox Energie-Webservice vertraglich anfragen und als ersten strukturierten Adapter evaluieren.
3. CHECK24 Link-out/Whitelabel als zweiten Kanal evaluieren.
4. Telekom-Angebote zunächst über offiziell erlaubte Vergleichs-/Partnerstrecken, bis strukturierte API-Rechte vorliegen.
5. Direkte Provider-APIs nur bei belastbarem Vertrag integrieren.

## Regulatorische/verbraucherschützende Leitplanken

Energie:
- Fernabsatz-Wechsel benötigt klare Vertragsinformationen; Widerrufsrechte und Textformanforderungen berücksichtigen.
- Seit 2025 ist der technische Strom-Lieferantenwechsel stark beschleunigt; daraus folgt nicht, dass Vertragskündigungsfristen entfallen. Wechseltermin und Vertragsbindung getrennt modellieren.

Telekommunikation:
- Vor Vertragserklärung ist eine Vertragszusammenfassung mit wesentlichen Leistungs-, Preis-, Laufzeit- und Kündigungsinformationen zentral.
- Bei bestimmten telefonischen Abschlüssen wird der Vertrag erst nach Erhalt der Vertragszusammenfassung und Genehmigung in Textform wirksam.
- Anbieterwechsel/Rufnummernmitnahme benötigen besonderen Schutz gegen Versorgungsausfall und Nummernverlust.

## Offene rechtliche Prüfung vor EXECUTE

- Rolle NAHWERK: reine Information, Affiliate/Vermittler, Abschlussvertreter oder technische Assistenz?
- Vollmacht: wann erforderlich und in welcher Form?
- Zulässigkeit des Vorbefüllens und Absenden von Anträgen je Partner.
- Einwilligungs-/Datenschutzgrundlage für Provider-Transfer.
- Fernabsatz-/Button-/Informationspflichten der konkreten Abschlussstrecke.
- Nachweis der Kundenerklärung und Widerruf.
- Versicherungen/Finanzprodukte bleiben außerhalb dieses generischen Automationsmodells.
