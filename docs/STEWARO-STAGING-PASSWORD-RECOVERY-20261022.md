# STEWARO — STAGING-Testpasswort: sicherer Wiederherstellungsplan (22.10.2026)

**Status:** Quellvorbereitung auf gestapeltem Draft, NICHT ausgeliefert; Reset-Schaltfläche ist absichtlich deaktiviert. Bestehendes STAGING-/PROD-Login bleibt unverändert.

**Primärbefund:** Im getrennten Supabase-Projekt `btqklftjmwtqqqdmwlnk` existiert das bestätigte Testkonto. Am 20.10.2026 um 20:26 und 20:31 (Berlin) antwortete der Auth-Server auf `POST /token` jeweils mit HTTP 400 / `Invalid login credentials`. Die Ursache (falsches Passwort oder Eingabefehler) ist nicht genauer belegbar. Das ursprüngliche Passwort ist nicht rücklesbar. Quelle: Plattform Launch-Nachtrag `docs/STEWARO-LAUNCH-LATEST-20261020.md` im Entscheidungs-Draft #1222.

## Freigaben vor einer sicheren Recovery
1. **Ohne Änderungen** im Dashboard genau dieses STAGING-Projekt unter **Authentication → URL Configuration** öffnen. Die exakte künftig zu verwendende Callback-Adresse `https://d2h3bbcracss71.cloudfront.net/web-concierge/stage-password-reset.html` muss ausdrücklich als Redirect erlaubt sein; zusätzlich die Site URL prüfen. **Keine PROD-/Operator-/PROD-DATA-Ziele**.
2. Die STAGING-Recovery-E-Mail-Vorlage prüfen: Links dürfen nicht auf den beobachteten `NAHWERK Operator · PROD DATA`-Bildschirm führen. Solange unklar: weder Wiederherstellungsmail auslösen noch bestehende Konfigurationen ändern.
3. Eine isolierte, geprüfte Callback-Seite nur auf der vorhandenen App-STAGING-Distribution als separate spätere Änderung vorbereiten (sensible Linkdaten aus Browser-URL entfernen; STAGING-Identität serverseitig prüfen; Passwort nur gegen STAGING Auth ändern). Dieser Draft enthält **noch keine aktive Callback-Verarbeitung**.
4. Vor Versand der ersten Mail: source-tests, exakte Datei-/Host-Allowlist, Hash-/SHA-Pin, bestehender Bucket und S3-Versionierungs-Rollback sowie separate Freigabe für eine **App-STAGING-only** Veröffentlichung. Bisheriges Deployment nicht wiederholen, es umfasst die Callback-Seite nicht.
5. Nach erfolgreicher isolierter Prüfung die bestehende Quellflagge `STAGE_RECOVERY_ENABLED=false` bewusst auf `true` ändern, kontrolliert ausliefern und ausschließlich mit eigenem STAGING-Testkonto testen. Neue Testkonten nicht erstellen. Keine Passwörter oder Auth-Tokens an Chat/GitHub senden.

**Fallback ohne Quelländerung:** Wenn der Nutzer sich an das selbst gewählte Testpasswort erinnert, auf der bestehenden AWS-STAGING-Test-App nur dieses Passwort eingeben. Das Passwort niemals auslesen oder im Chat erfragen.

**Grenzen:** Keine neue Infrastruktur, kein Upgrade, keine PROD-Aufrufe, keine GitHub Actions, kein Reset-Mailversand, keine Änderung an Auth-Sicherheitsrichtlinien. Launch ohne 3D, FIDEL-Voice weiter gesperrt. MASTER technisch 68 % (Ledger `as_of 2026-10-11`); 69 % erst nach tatsächlich abgenommener, genehmigter Safari-/Identitätsprüfung (Gate 5.4.1).
