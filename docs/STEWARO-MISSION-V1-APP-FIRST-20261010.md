# STEWARO Mission v1 — Live-Telefonate App-first (2026-10-10)

**Status: SOURCE CANDIDATE ONLY. Kein Live-Release, keine AWS-Mutation, keine Testtelefonate.**

## Kanonische Produktzuständigkeit

`denizw030/nahwerk-platform/config/brands.yaml` trennt die STEWARO-Produkte verbindlich:

- `https://stewaro.com`: öffentliche Website / Informationen.
- `https://account.stewaro.com`: Anmeldung, Konto, persönliche Einstellungen.
- `https://app.stewaro.com`: **authentifizierte FIDEL-Produktanwendung**.

Der spätere Primärzugang zur Live-Telefonansicht ist damit **App → Übersicht → Telefon → „Telefonaufträge live verfolgen“**. Die bestehende Routenimplementierung `/telefonate/ausgehend/` wird **auf dem App-Host** wiederverwendet; die vollständige Zieladresse nach gesonderter geschützter AWS-Freigabe lautet `https://app.stewaro.com/telefonate/ausgehend/`. Keine öffentliche Telefon-Transkriptanzeige auf der Marketing-Site; bestehende Legacy-/Website-Routen werden in diesem isolierten Source-Patch nicht entfernt.

## Änderungen in diesem child branch

Branch `feature/stewaro-mission-v1-app-first-entry-20261010`, Basis **unverändertes** Website Draft PR #370, Commit `2482e2c689fba9046e58e5dcd9cdc7c7cf69c8fb`.

1. `assets/stewaro-app-shell.js`: Erst **nach erfolgreichem bestehendem App-Authentifizierungs-Boot** wird ein rein navigierender Link beim Telefon-Bereich der App-Übersicht eingefügt. Bereits vorhandene `account.stewaro.com/telefonannahme`-Einstellung bleibt separat. Die Datei wird ohnehin auf Nicht-App-Hosts am Anfang mit `location.hostname !== "app.stewaro.com"` beendet.
2. `assets/stewaro-phone-session-v1.js`: Der bisherige, nur auf der öffentlichen Website funktionierende Login-Rücksprung wird für den **exakten** App-Host an `https://account.stewaro.com/anmelden?produkt=senioren&next=app` angepasst. Token bleibt am App-Origin in vorhandener SessionStorage-Struktur; keine Tokens in URL, Query, Redirect, Logs oder Cross-Origin Storage. Website- und Account-Legacy-Loginpfad bleiben `/anmelden`.
3. `tests/stewaro-mission-app-entry-v1.test.mjs`: Prüft App-Host-Grenze, Auth-Boot-Reihenfolge, App-Login, Legacy-Login und read-only ASR-Darstellung.

## Kollisionen / Releasesperren

- **Geschützter paralleler Account/App Integrations-PR #363** bearbeitet bereits `assets/stewaro-app-shell.js`. **Nicht direkt in #363 oder main mergen**, bevor aktuelle Quellstände bewusst zusammengeführt und alle App-/Account-Tests neu auf dem exakten gemeinsamen SHA bestanden sind.
- **Prüf-CodeBuild ist auf den unveränderten Website-PR-370-SHA `2482e2c689fba9046e58e5dcd9cdc7c7cf69c8fb` fixiert.** Er testet den **Elternstand**, nicht automatisch diesen child-Branch. Kein stilles Verschieben des Pins. Nach erfolgreichem Eltern-CodeBuild ist für diesen child-Branch eine erneute **source-pinned**, read-only Testausführung vorzubereiten.
- CloudFormation-Stack `stewaro-mission-v1-review-only` und seine drei Ressourcen sind **vom Eigentümer anhand AWS-Konsole als CREATE_COMPLETE beobachtet**. Ein tatsächlicher CodeBuild-Job oder seine Logs sind **nicht** über einen direkten AWS-Connector in diesem Chat abrufbar; keinen Erfolg erfinden.
- Bestehende Delivery-Pipeline `stewaro-web-staging` **nicht** triggern: das Buildspec führt CloudFormation, S3 `--delete` und CloudFront-Invalidierungen aus.
- Der App-Host kann statische Pfade aus dem Website-Repo bekommen, aber AWS-Staging und **die tatsächliche Erreichbarkeit dieses konkreten Pfads** bleiben unbewiesen. Source-Test ≠ deployed/hosted.
- Vor öffentlichem Release: iPhone-Safari authentifiziertes Account→App-Handoff, Session-Kontobindung, fremde Call-IDs verweigert, realer Queued/Live/Ended-Status und tatsächlich ankommendes ASR, Logout/Expiry/Tab-Wechsel und Rollback. **Zuschaltung/Conference** ist ein späterer getrennter Zustimmungs-/E2E-Gate.
- Keine kostenpflichtigen Telefonanbieter-Aktionen. **Mission-v1-Produktivfreigabe 0 %.**

## Quellprüfungen

Ein V8-basierter statischer/isolierter Test der app-first Regeln (App-Host-Grenze, tatsächlicher Login-Href bei App und Legacy-Host, Auth-Boot-Einbindung, kein öffentlicher Transkriptpfad) ergibt **4/4 PASS**; beide geänderten Browser-JS-Dateien bestehen den V8-Syntaxcheck. Die neue Node-Testdatei und die vollständigen Website-CI-/Browser-/AWS-Tests **wurden nicht** in Node oder AWS ausgeführt. **Keine Behauptung eines grünen Builds.**

**Kanonischer Status-Delta an MASTER:** Live-Telefonanzeige gehört zum App-Produkt; Entwurfsquelle app-first child Branch, kein live deployment, keine Änderung an Konto- oder AWS-Runtime-Autorität, App/Auth/Source-Pin-Collision-Gates offen.
