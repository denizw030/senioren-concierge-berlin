# NAHWERK Web / Kundenkonto — READY_FOR_SHARED_WRITE

Stand: 2026-09-12

`READY_FOR_SHARED_WRITE = YES`

`READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E = NO`

Die Website-eigenen Arbeiten sind bis an die aktuell veröffentlichten PROD-Verträge abgeschlossen. Die folgenden Punkte dürfen nicht in der Website erfunden werden und benötigen den Shared Platform/Core/CAO/Billing-Slot.

## 1. Browserfähiger PROD Web Concierge Gateway

Fresh PROD-Befund:

- `nahwerk-concierge-core` v43 ist ACTIVE.
- Core v1 akzeptiert `channel = WEB` im generischen Turn-Vertrag.
- Core v1 liefert bereits die kanonischen Felder `response_id`, `conversation_id`, `turn_id`, `active_task_id`, `response_state`, `messages`, `pending_approval`, `action_refs`, `error`, `state_version`, `correlation_id`.
- Die aktuelle Core-Delivery-Entscheidung ist autoritativ jedoch ausschließlich für den freigegebenen WhatsApp-Pfad. Für alle anderen Kanäle fällt sie auf `CHANNEL_NOT_ENABLED_FOR_AUTHORITATIVE_DELIVERY` zurück.
- Die Core-Route ist service-authentifiziert und darf nicht mit Service-Credentials aus einem Browser aufgerufen werden.
- Es existiert aktuell keine aktive browserfähige PROD-Web-Concierge-Edge-Function.

Minimaler Shared-Vertrag:

1. Ein PROD-Web-Gateway validiert ausschließlich die bestehende `scb_web_session` serverseitig.
2. Es löst `person_id`, `customer_account_id` und `customer_member_id` ausschließlich serverseitig aus der Session/Kontobindung auf. Browser-übermittelte fremde IDs dürfen keine Autorität besitzen.
3. Es erzeugt stabile `channel_session_id`, `channel_subject_id`, `source_message_id` und `correlation_id` bzw. akzeptiert nur den im Vertrag vorgesehenen ungefährlichen Clientanteil.
4. Es ruft serverseitig den zentralen `nahwerk-concierge-core /v1/core/turn` mit `contract_version = core-v1` und `channel = WEB` unter Service-Authentisierung auf.
5. Conversation, Task, Memory, Approval, Action und Ausführung bleiben vollständig Core/CAO-eigen. Der Gateway enthält keine parallele Business Logic.
6. `adapter_core_route_web` und die Core-Delivery-Entscheidung werden für normale reale Webkunden autoritativ freigegeben: `shadow=false`, `deliver=true`, `authoritative=true`.
7. Der Gateway gibt ausschließlich die autoritative, kundenfähige Core-v1-Ausgabe zurück. Shadow-/Testausgaben bleiben unzustellbar.
8. Pending Approval muss an die vom Core gelieferten `approval_id`/Action-Bindings gekoppelt bleiben; keine lose Browser-Zustimmung.
9. Wiederholte Browserrequests müssen über den kanonischen Source-Message-/Idempotenzvertrag genau einmal wirken.
10. Der Browser muss nach Provider-/CAO-Ausführung den verifizierten Core-Zustand bzw. das verifizierte Ergebnis abrufen/erhalten können, ohne lokal einen Erfolg zu erfinden.

Website-Stand dazu:

- `web-concierge.html` ist authentifiziert und fail-closed.
- Der alte Shadow/STAGING-Pfad ist entfernt/inert.
- `assets/web-customer-concierge.js` rendert bereits exakt die veröffentlichte `core-v1` Response-Struktur.
- Eine Response wird nur dargestellt, wenn `delivery_hints.shadow === false`, `delivery_hints.deliver === true` und `delivery_hints.channel === WEB`.
- Senden bleibt ohne den veröffentlichten Gateway-Request-Vertrag absichtlich deaktiviert.

## 2. Zahlungsmethode entfernen

Fresh PROD-Befund:

- `web-payg` kann Zahlungsmethoden anlegen/synchronisieren und eine neue bestätigte Methode als Standard registrieren.
- In den veröffentlichten DB-/Edge-Verträgen existiert keine `remove`, `detach`, `delete` oder `deactivate payment method` Aktion.

Minimaler Shared-Vertrag:

1. Session-/Account-autorisierte Aktion im bestehenden PAYG-PROD-Vertrag, nicht in der Website.
2. Die Zahlungsmethode muss serverseitig dem echten Kundenkonto zugeordnet sein.
3. Stripe-Detach/Deaktivierung und PAYG-Datenbankzustand müssen atomar bzw. sicher reconciliert werden.
4. Regeln für letzte Zahlungsmethode, offene Wallet-Holds, laufende Aufträge oder sonstige Zahlungsabhängigkeiten werden ausschließlich serverseitig entschieden.
5. Aktion ist idempotent und liefert danach den autoritativen Payment-Method-State bzw. einen stabilen kundenfähigen Ablehnungsgrund.

Website-Stand dazu:

- Die Entfernen-Oberfläche ist vorbereitet, bleibt aber sichtbar fail-closed und löst keinen lokalen Fake-Remove aus.

## 3. Paid Legal / elektronischer Widerruf / sofortige Ausführung

Website-Stand:

- Der konkrete PAYG-Betrag steht unmittelbar an `Kostenpflichtig freigeben – <Betrag>`.
- Die Freigabe verlangt eine weitere ausdrückliche Bestätigung und wird anschließend aus PROD neu geladen.
- `widerruf.html`, Datenschutz und Impressum sind erreichbar.
- Für reines auftragsbezogenes PAYG wird keine neue Abo-/Kündigungslogik erfunden. § 312k BGB betrifft entgeltliche Dauerschuldverhältnisse.

Shared-/Legal-Blocker:

1. Für online geschlossene Fernabsatzverträge braucht die Online-Oberfläche während der Widerrufsfrist eine echte elektronische Widerrufsfunktion (`Vertrag widerrufen` → Vertragsidentifikation/Kontaktweg → `Widerruf bestätigen`) mit sofortiger Eingangsbestätigung auf dauerhaftem Datenträger.
2. Soll eine entgeltliche Dienstleistung vor Ablauf der Widerrufsfrist beginnen, muss der erforderliche ausdrückliche Wunsch/Zustimmung und die Kenntnis über das Erlöschen bei vollständiger Vertragserfüllung beweissicher an der Bestellung/Ausführung gebunden werden, soweit das konkrete Vertragsmodell dies erfordert.
3. Die aktuelle `payg_approve_action_quote_v1` speichert nur Quote-Approval und Zeitpunkt; sie besitzt keinen Vertrag für diese separaten Verbraucherrechtserklärungen.
4. Die Vertragsbestätigung/Bestellinformationen müssen im erforderlichen Umfang dauerhaft bereitgestellt bzw. übermittelt werden, bevor die Leistung ausgeführt wird.
5. Die aktuelle Hauptseite `widerruf.html` enthält noch einen leeren Unternehmer-Kontaktplatzhalter. Der separate Legal-PR #25 besitzt dieselbe Legal-Datei, ist aber DRAFT/veraltet und darf nicht blind über aktuellen `main` gelegt werden.
6. Vor dem Paid-Consumer-Launch muss außerdem die erforderliche Anbieter-Kontaktinformation final verifiziert werden; insbesondere ist aktuell keine verifizierte geschäftliche Telefonnummer auf der veröffentlichten Anbieterinformation vorhanden.

## 4. Reales Kunden-E2E nach Shared-Freigabe

Erst nach Abschluss der Punkte 1–3:

Registrierung → Login → PAYG aktivieren → echte Zahlungsmethode → Web-Concierge-Auftrag → serverseitige Quote → konkreten Betrag sehen → ausdrücklich kostenpflichtig freigeben → Core/CAO führt genau eine Aktion aus → genau eine Belastung/Wallet-Buchung → verifiziertes Ergebnis im Web → Kosten/Nutzung im Konto.

Der erste reale Test benötigt weiterhin eine separate Owner-Freigabe. Dieser Website-Strang löst keine echte Zahlung und keine externe kostenpflichtige Aktion aus.
