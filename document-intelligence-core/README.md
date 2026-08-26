# NAHWERK Document Intelligence Core

Isolierter, provider- und kanalunabhängiger Core für strukturierte Dokumentanalyse.

## Grenzen

- Keine Production-Integration, keine n8n-/Supabase-/Prime-Änderung.
- Keine Live-OCR-/Vision-Provider. `FixtureDocumentExtractionProvider` definiert die Providergrenze.
- Keine externen Actions. Reminder, Kündigung und Provider-Switch werden ausschließlich als INFORMATION/PREPARE ausgegeben.
- Fremde Dokumente benötigen einen extern gelieferten AuthorizationContext mit `document_read` und `document.analysis` Scope; Relationship allein genügt nicht.
- Unbekannte Werte bleiben `null`; Konflikte und fehlende Seiten werden explizit markiert.
- Audit-Zusammenfassungen enthalten keine vollständigen Dokumenttexte, PIN/TAN/OTP/Passwörter oder Zahlungsdaten.

## Test

```sh
cd document-intelligence-core
npm test
```

Die Tests verwenden ausschließlich synthetische Fixtures.
