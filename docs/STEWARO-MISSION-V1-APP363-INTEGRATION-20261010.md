# Mission v1 — kollisionsfreie Account/App-Integration (2026-10-10)

**Status: neuer SOURCE-ONLY DRAFT, nicht zusammengeführt mit main oder dem bestehenden Account/App Parent #363. Keine AWS-/DNS-/CloudFront-/Supabase-/Telefonaktion.**

## Architektur und Quellgrundlage
- Maßgebliche Quelle: `denizw030/nahwerk-platform/docs/PLATFORM-SOURCE-OF-TRUTH.md`, `config/brands.yaml`.
- App-Host: `https://app.stewaro.com` für authentifizierte FIDEL-Ausführungen/Live-Telefonate.
- Account-Host: `https://account.stewaro.com` für Anmeldung und Verwaltung.
- Die öffentliche Website `https://stewaro.com` bleibt Marketing/Information.
- Branch aus dem zum Start aktuellen **Account/App DRAFT PR #363** Commit `aba5283691693a4e27fccc0d2adfc6dc6a7fbd73`, nicht aus einem alten App-Shell-Snapshot.
- Live-Telefonquellen stammen exakt aus **DRAFT #371** Commit `810b7f98153c0a928c62a2e53420e586b24a681e`, dessen AWS-CodeBuild #2 47/47 Node-Tests bestanden hat. Der kombinierte Branch ist ein **neuer** Quellstand und muss getrennt geprüft werden.

## Ausführung
1. Nur Mission-v1-Bestandteile/Tests aus #371 werden übernommen; keine Global-Account-Navigation / Website-Brand-Anpassung kopiert.
2. `assets/stewaro-app-shell.js` ist kontrolliert zusammengeführt: behält die neueren `mountTodayShortcuts()`/App-/Login-/Session-Logiken aus #363. Fügt den App-CTA nach bestehendem Auth-Boot hinzu, ohne `assets/stewaro-app-bootstrap.js` anzufassen.
3. Bestehender Account-Link zur Telefonannahme bleibt. Zusätzlich App-Telefonbereich → `/telefonate/ausgehend/`, die gleiche Origin wie die App. `assets/stewaro-phone-session-v1.js` leitet ausgeloggte App-Sitzungen zurück zur kanonischen Account-Anmeldung. Bestehende Route und Auth-Bearer-API-Fetch-Vertrag bleiben unverändert.
4. Kein Anruf, kein Join, kein realer Live-Stream erzeugt; angezeigte Transkripte stammen ausschließlich vom vorhandenen autorisierten Backend.

## Gates / Einschränkungen
- Der AST/JS-Syntaxcheck von App-Shell, Session und Ledger im isolierten JS-V8-Harness ist grün. Weitere Node-/CSP-Tests dieses **kombinierten** Quellstands und Quellhash-Beweis noch ausstehend.
- Der frühere AWS-CodeBuild #1 mit 43/43 und #2 mit 47/47 validiert **nicht** diesen neuen Integrationsstand.
- Github-Actions-Jobs bei Mission-Child #371 schlugen bereits ohne Steps fehl (Runner-/CI-Problem nicht abschließend geklärt). Keine automatische Freigabe daraus ableiten.
- Das bestehende AWS-Review-Projekt ist SHA-pinned auf #371. Für kombinierte Quelle nur nach Change-Set-Prüfung / Kostenfreigabe einmalig aktualisieren und test-only starten; vorhandene breite `stewaro-web-staging`-Delivery mit S3 `--delete` nicht starten.
- Vor öffentlicher Freigabe: exakte Account/App-Stage-Asset-Hash-Parität, bestehender Zugang / einmaliger Handoff, legitimer signierter Safari-Test iPhone, cross-account/Call-ID-Zugriffssperre, Logout, sichtbare ASR-Verzögerung/Call-State, Release-Rollback. Keine Credentials im Chat.
- Prod-Veröffentlichung **0%**. Kein manueller Eingriff des Klienten oder laufender Telefonkosten durch diesen PR.

**Nächste Integration:** Nach vollständiger Prüfung des Child-PR gezielt in Draft #363 integrieren (nicht in Website main), exakte kombinierte SHA und Account/App-Quellbundle erneut prüfen. Autorisierte Staging- und iPhone-E2E danach.
