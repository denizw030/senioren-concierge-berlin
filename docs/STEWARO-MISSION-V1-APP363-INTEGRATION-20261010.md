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

## Mission v1 Sicherheitsnachtrag 11.10.2026 — gesperrte Berechtigung sofort ausblenden

**Geltungsbereich:** Nur der bestehende Draft-Integrationsbranch #372; Account-Parent #363, Login, FIDEL Chat, Mein Tag und vorhandene Telefonaufträge bleiben unangetastet. Keine Änderungen an Produktiv-/Staging-Diensten, AWS oder dem Supabase-Backend.

Der tatsächliche History-Backendvertrag `supabase/functions/account-security-auth-cleanup-temp/index.ts` verwendet `401` bei ungültiger Sitzung, `403` bei ungültiger Identität und `409` bei fehlender oder mehrdeutiger Klientenmitgliedschaft. Der bisherige Mission-Leseclient behandelte nur `401` als Datenschutz-/Neuanmeldungsgrenze. Der aktualisierte `assets/stewaro-outbound-ledger-v1.js` behandelt jetzt **401, 403 und 409 stets als `AUTH_REQUIRED`**. Bei verlorener Berechtigung werden private Verlaufskarten, aktive Telefonlisten und Transkript-DOM vollständig entfernt, automatische Polls gestoppt, die Ansicht für alte/in-flight-Antworten gesperrt und eine neue Anmeldung angeboten. Ein Serverfehler wie `503` bleibt eine verfügbarkeitsbedingte Fehlermeldung ohne Erfolgsbehauptung. **Keine API schreibt Daten und kein Anruf wird ausgelöst.**

Das geänderte Browser-JavaScript wird über `/assets/stewaro-outbound-ledger-v1.js?v=9` cache-sicher geladen. Bestehende E2E- und Quelltests wurden nicht abgeschaltet. Die vier tatsächlich aus GitHub gelesenen Testdateien wurden in einer isolierten JavaScript-V8-Ausführung mit expliziten Node-`fs`/`assert`/`vm`-Mocks geprüft: **15/15 Session/Privacy + 5/5 Telefonportal + 4/4 App-Entry + 2/2 App-Integration = 26/26 PASS**. Dies ist ausdrücklich **kein nativer Node-Lauf, kein neu getesteter AWS-CodeBuild-Commit und kein authentifizierter Safari-E2E-Nachweis**.

**Exakter Build-Provenance-STOP:** AWS CodeBuild #3 mit **74/74 PASS** ist nachweislich nur auf dem vorherigen, originalen Website-PR-#372-SHA `35f13c03e75c5559585c24d5a71dec8b80fded36` gelaufen. **Der nach diesem Sicherheitsfix neu entstehende #372-HEAD ist nicht AWS-validiert**. Nicht behaupten, der ursprüngliche Build decke spätere Source-Änderungen ab. Vor realer Staging-/Produktivfreigabe den dann aktuellen Integrations-HEAD erneut gegen Tests, Hashes und Rollback nachweisen; kein automatischer neuer kostenpflichtiger Build. Gate 5.4 (legitime Anmeldung, einmaliger Handoff, echte Status-/ASR-Anzeige, cross-account/Call-ID-Negativfälle) bleibt offen. Mission technischer Stand 60 %, Produktivfreigabe 0 %; kein zusätzlicher Fortschritt allein durch diesen Quellfix.

## Nachtrag: Transkript-Berechtigungsentzug + verbindlicher E2E-Vertrag (11.10.2026)

Der vorherige 401/403/409-Fix am gemeinsamen `get()` deckte einen **zweiten Anzeige-Pfad** noch nicht vollständig ab: Bei einem Berechtigungsverlust während `show()` (Anklicken eines einzelnen Gesprächsverlaufs) zeigte die App einen lokalen Anmeldelink, ließ aber andere bereits gerenderte private Verlaufs-/Live-Inhalte kurzzeitig sichtbar. Im selben PR #372 ist dieser Pfad nun **fail-closed**: jede `AUTH_REQUIRED`-Antwort aus einer Transkript-Anforderung führt sofort zum gemeinsamen `relogin()`, das `viewActive=false` setzt, Polling abbricht und History-/Live-/Transkript-Knoten entfernt. Bei gewöhnlichem 503-Netzfehler bleibt eine neutrale Fehlermeldung statt einer erfolgreichen Ausführung. Ausstehende Anfragen nach A→B-Sessionwechsel werden ebenfalls als Auth-Verlust behandelt. Kein Backend-, Account-#363-, Telefonprovider-, AWS- oder Produktiv-Write.

Versionsgebundene Browser-Ressource: `/assets/stewaro-outbound-ledger-v1.js?v=10`. Zum Testzeitpunkt wurden die **vier tatsächlichen aktuellen GitHub-Testdateien** via isoliertem JS-V8-Harness (Node-`fs/assert/vm` gemockt) erfolgreich ausgeführt: **18/18** Privacy/Session inklusive Transkriptentzug und A→B-Wechsel, **5/5** Outbound-Portal, **4/4** App-Entry, **2/2** geschützte App363-Integration, **zusammen 29/29 PASS**. Das ist keine native Node-Ausführung, keine AWS-CodeBuild-Freigabe und kein echter iPhone-Safari-Test.

Die verbindliche, noch nicht ausgeführte Gate-5.4-Abnahme ist in `docs/STEWARO-MISSION-V1-SAFARI-E2E-ABNAHME-20261011.md` festgeschrieben. Vor jeder Auth-/Stage-/Safari-Prüfung vollständige Code- und Asset-SHA-Neuprüfung gegen den dann aktuellen PR-#372-HEAD. Der ursprüngliche AWS Build #3 **74/74 PASS** gilt unverändert **nur** für Commit `35f13c03e75c5559585c24d5a71dec8b80fded36`, nicht für nachfolgende Commits. Gate 5.4 bleibt 0/4, Mission 60 %, Prod 0 %. Kein neuer CodeBuild/ChangeSet, kein echter Anruf, keine Veröffentlichung.
