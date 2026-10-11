# STEWARO Mission V1 — geschützte Safari E2E-Abnahme (Gate 5.4)

Stand 11.10.2026. **Nur Testvertrag und sichere Vorbereitung, keine Ausführung eines echten Safari-/Staging-/Produktivtests.** Eigentümer muss geschützte Staging-Umgebung und legitim angemeldete Testidentität(en) freigeben. Keine echten Klientendaten oder Zugangstokens in Issue-/Chat-/CI-Protokolle kopieren. Keine echten Telefonanrufe, neuen Provider-Jobs, Abrechnungen, AWS Builds, ChangeSets oder Deployments.

## Unveränderliche Quellgrenze

- App-Integrations-Draft: `denizw030/senioren-concierge-berlin`, PR #372; basiert auf geschütztem Account/App-Parent #363. Aktuellen PR-HEAD immer vor einem Test neu lesen. Die ASR-/Telefonhistorie ist **read-only**.
- Platform-Mission: `denizw030/nahwerk-platform`, PR #1198. MASTER-Koordination PR #1199. Nur MASTER pflegt den technischen Progress-Ledger.
- Bestätigtes AWS-Quelltest-Ergebnis **Build #3: 74/74 PASS** gehört ausschließlich zum früheren App-SHA `35f13c03e75c5559585c24d5a71dec8b80fded36`. Dieses Ergebnis **nicht** auf aktuelle/future HEADs übertragen. Der lokale Quelltest des nachfolgenden Auth-Fixes ist kein AWS- oder Safari-E2E.
- URL-Ziel: `https://account.stewaro.com` Anmeldung → `https://app.stewaro.com` App → **same-origin** `/telefonate/ausgehend/`. Öffentliche Marketingseite darf keine Klienten-Transkripte anzeigen.
- Auth-Session-Cookie/Storage und einmalige Handoff-Fragmente/Tokens niemals in Screenshots, Logs oder URL-Kopien veröffentlichen. Bei öffentlich erreichbarer Stage: **HOLD** bis Zugriffsschutz nachgewiesen. Keine Live-Prüfung mit persönlichen Klientendaten.

## Pflichtvorprüfung für einen autorisierten Staging-/Safari-Termin

1. Berechtigter Owner bestätigt **explizit** die geschützte Test-Stage, die Identität des Test-Klienten und bei Datenschutz-Negativtests eine getrennte, freigegebene zweite Testidentität. Vorhandene Produktionssessions/Accounts nicht für Probeänderungen verwenden.
2. Techniker prüft **read-only** exakte GitHub-HEAD-SHA (PR #372 + Parent #363) sowie die ausgelieferten Stage-Asset-Bytes, HTML-Referenzen, CSP, Auth-Bootstrap und Fallback/Entfernung des Stage-Bundles. SHA-Abgleich **pro Datei**, nicht nur der Versionsparameter `?v=`.
3. Browser-/iPhone-Test muss **Safari auf echtem iPhone** und den genehmigten Stage-Zugang verwenden. Browser-Simulation, Node, Build-Erfolg und reproduzierte API-Mocks gelten nur als Vorprüfung.
4. Keine `start call`, `join conference`, `create job`, SIP-Dial-, OpenAI-Live- oder Provider-Aktion. Bereits vorhandene **synthetische** Testverläufe dürfen nur gelesen werden. Falls kein sauberer nichtproduktiver Datenbestand vorhanden ist, diesen Schritt nicht durchführen und nicht als PASS deklarieren.

## Vorab festgelegte vier Schritte von Gate 5.4 (keine Umgewichtung)

| Schritt | Erfolgskriterium | Status |
|---|---|---|
| 5.4.1 | Autorisierte und isolierte Safari-Testsession + Stage-Zugriff freigegeben und belegt | **OFFEN** |
| 5.4.2 | Account→App Einmal-Handoff korrekt, verbrauchte/ungültige Transfer-Capability gesperrt, kein Token im sichtbaren URL-/Log-Pfad | **OFFEN** |
| 5.4.3 | Eigene synthetische Anrufauftragsliste/Statuspolling/ASR angezeigt; Sichtbarkeit, Hintergrund→Vordergrund, Timeout, Refresh, Sessionwechsel geprüft | **OFFEN** |
| 5.4.4 | Fremde Call-ID / fremde Testidentität / anonyme Ansicht negativ getestet; bei HTTP 401/403/409 alle privaten DOM-Daten entfernt; schriftliche E2E-Abnahme | **OFFEN** |

## Negative und Recovery-Fälle (keine Änderungen an Fremdkonten)

- Ungültige, abgelaufene oder erneut verwendete Handoff-Capability: kein App-Zugang, keine Session in URL, fail-closed Account-Neuanmeldung.
- Nach Logout oder Sessionablauf: Verlauf, Live-Liste, Transkript und BFCache-Restore dürfen keine privaten alten Inhalte zeigen. Fetch-Antworten, die während Identitätswechsel A→B fertig werden, dürfen A-Daten nicht rendern.
- Gültige aber fremde UUID-Call-ID: Backend verweigert fremden Datensatz oder liefert kein autorisiertes Ergebnis; keine Fehlerdetails mit Fremdidentität anzeigen. **Nur** synthetische Testdaten und bewilligte Testidentitäten einsetzen.
- Eindeutig ungültige Mitgliedschaft 403/409, Session 401: globale private Ansicht leeren, Polling stoppen, zum zentralen Login. Offline/503: kein erfolgreicher Anruf oder Auftrag behaupten, keine personenbezogenen Inhalte nach einem Identitätswechsel weiter anzeigen.
- Bisheriger Auftragsstatus `Vorgemerkt` → `Anruf läuft` → `Telefonat beendet` darf **nur** aus echten vorhandenen Backend-Aufzeichnungen kommen. Ohne diese Datensätze keinen Übergang simulieren und als live akzeptieren.
- ASR-Text als automatisch erkannt kennzeichnen, keine Audioaufnahme oder Echtzeitgarantie behaupten; kein aus technischer Gesprächsdauer abgeleiteter bestätigter Arzttermin oder erledigter Auftrag.

## Prüfbeleg und Rollback-Gate

Je erlaubter Stage-Prüfung nur die **nichtsensitiven** Daten erfassen: Uhrzeit, anonymisierte Testidentität-ID (keine geheimen Sessionwerte), getesteter iPhone/Safari-Stand, App-/Parent-Git-SHA, Stage-Asset-SHA-Werte, HTTP-Statusklassen, beobachtete UI-Grenzen, Fehlerbilder, unabhängiger Reproduktionsversuch und sichere Rollback-Methode. Kein PASS ohne wirklichen Lauf auf freigegebenem Ziel. Staging-Rollback muss den letzten gültigen Stand wiederherstellen und die neuen Assets aus dem Cache entfernen können. Ein Stage-GREEN gestattet **nicht** automatisch PROD.

**Sicherheitssperre:** Kosten-, Telefon-, CloudFormation- oder öffentliche Release-Aktionen bedürfen separater ausdrücklicher Freigabe. Bei nicht erreichbarer geschützter Stage, fehlender Auth-Testfreigabe oder ausstehender Hash-Parität bleiben 5.4.1 bis 5.4.4 offen; Mission-Fortschritt 60 %, Prod 0 %.
