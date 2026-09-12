# NAHWERK Web / Kundenkonto — READY_FOR_SHARED_WRITE

Stand: 2026-09-12

`READY_FOR_SHARED_WRITE = YES`

`READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E = NO`

Die Website-eigenen Arbeiten sind bis an die veröffentlichten PROD-Verträge abgeschlossen. Die folgenden Restpunkte benötigen den Shared Platform/Core/CAO/Billing-Slot und dürfen nicht im Browser erfunden werden.

## 1. Browserfähiger PROD Web Concierge Gateway

Fresh PROD-Befund:

- `nahwerk-concierge-core` v43 ist ACTIVE.
- Core v1 akzeptiert `channel = WEB` im generischen Turn-Vertrag.
- `adapter_core_route_web` ist in PROD weiterhin `enabled=false`, `rollout_percent=0`, `mode=shadow_only`.
- `central_orchestrator_authoritative` ist weiterhin deaktiviert.
- Die Core-Route ist service-authentifiziert und darf nicht mit Service-Credentials aus dem Browser aufgerufen werden.
- Es existiert weiterhin keine aktive browserfähige PROD-Web-Concierge-Edge-Function.

Minimaler Shared-Vertrag:

1. PROD-Web-Gateway validiert ausschließlich die bestehende Web-Session serverseitig.
2. `person_id`, `customer_account_id` und `customer_member_id` werden ausschließlich serverseitig aus Session/Kontobindung aufgelöst.
3. Gateway erzeugt/bindet kanonische `channel_session_id`, `channel_subject_id`, `source_message_id` und `correlation_id`.
4. Gateway ruft serverseitig `nahwerk-concierge-core /v1/core/turn` mit `contract_version=core-v1` und `channel=WEB` auf.
5. Conversation, Task, Memory, Approval, Action, CAO und Verification bleiben vollständig Core/CAO-eigen.
6. `adapter_core_route_web` wird für reale Webkunden autoritativ freigegeben: `shadow=false`, `deliver=true`, `authoritative=true`.
7. Pending Approvals bleiben exakt an Core-Approval/Action gebunden; keine lose Browser-Zustimmung.
8. Wiederholungen sind über Source-Message-/Idempotenzvertrag genau-einmal-sicher.
9. Verifizierte Provider-/CAO-Ergebnisse werden wieder als autoritative Core-v1-Ausgabe an den Webkanal geliefert.

Website-Stand:

- `web-concierge.html` ist authentifiziert und fail-closed.
- Shadow/STAGING ist inert/gesperrt.
- `assets/web-customer-concierge.js` rendert die veröffentlichte Core-v1-Struktur.
- Ausgabe erscheint nur bei `delivery_hints.shadow === false`, `delivery_hints.deliver === true`, `channel === WEB`.
- Keine Website-Business-Logic und keine Service-Secrets.

## 2. Zahlungsmethode entfernen

Fresh PROD-Befund:

- `web-payg` kann Zahlungsmethoden anlegen/synchronisieren.
- Fresh DB-Inventar enthält weiterhin nur `payg_register_payment_method_v1`; keine Remove-/Detach-/Deactivate-Payment-Method-Funktion.

Minimaler Shared-Vertrag:

1. Session-/Account-autorisierte `remove_payment_method`/äquivalente Aktion im bestehenden PAYG-PROD-Vertrag.
2. Zahlungsmethode muss serverseitig dem Konto gehören.
3. Stripe-Detach und PAYG-Datenbankzustand werden sicher reconciliert.
4. Letzte Zahlungsmethode, offene Holds und laufende Aufträge werden serverseitig geprüft.
5. Aktion ist idempotent und liefert erst nach bestätigtem Detach den autoritativen neuen Payment-State.

Website-Stand:

- Remove-UI existiert, bleibt ohne Backend-Vertrag disabled und kann keinen Fake-Erfolg erzeugen.

## 3. PAYG Verbraucherrecht / Consent

Fresh Website-/Legal-Stand:

- Betreiberangaben auf aktuellem `main` sind vorhanden: Anbieter/Inhaber, ladungsfähige Anschrift und geschäftliche E-Mail.
- `widerruf.html` wurde auf diese realen Angaben und den aktuellen PAYG-Stand aktualisiert; keine Unternehmer-Platzhalter mehr.
- Betrag und Leistung stehen unmittelbar an `Kostenpflichtig freigeben – <Betrag>`.
- Für einzelne PAYG-Aufträge wird keine unnötige Abo-/Dauerschuldlogik eingebaut.
- Website besitzt jetzt einen fail-closed Consumer-Rights-Gate.

Erforderlicher Shared-Vertrag `payg-consumer-rights-v1`:

Der autoritative `web-payg` GET-State muss erst dann folgende Fähigkeiten als `true` melden, wenn sie real funktionieren:

```json
{
  "consumer_rights": {
    "contract_version": "payg-consumer-rights-v1",
    "electronic_withdrawal_function": true,
    "electronic_withdrawal_url": "https://nahwerkconcierge.com/<produktive-funktion>",
    "immediate_performance_consent_evidence": true,
    "order_confirmation_durable_medium": true
  }
}
```

Shared Umsetzung muss mindestens:

1. eine echte elektronische Widerrufsfunktion mit Bestätigung und unverzüglicher Eingangsbestätigung auf dauerhaftem Datenträger bereitstellen;
2. die beiden ausdrücklichen Sofortausführungs-Erklärungen beweissicher an Quote/Auftrag/Person binden;
3. bei `approve_quote` das Website-Feld `consumer_rights_evidence` autoritativ validieren und speichern;
4. Vertrags-/Bestellbestätigung im erforderlichen Umfang auf dauerhaftem Datenträger bereitstellen;
5. niemals nur Client-Zeitstempel oder Client-Flags als alleinigen Beweis behandeln.

Website-Stand:

- Solange dieser Vertrag fehlt, werden `approve_quote`-Requests zusätzlich browserseitig fail-closed blockiert.
- Ablehnen einer Quote bleibt möglich.
- Sobald der Vertrag autoritativ bereitsteht, zeigt die Website vor der Kostenfreigabe die beiden ausdrücklichen Erklärungen und übermittelt die Evidence an den bestehenden PAYG-Endpunkt.
- Der Link `Vertrag widerrufen` wird nur aus einer autoritativ bestätigten NAHWERK-HTTPS-URL dargestellt.

## 4. Reales Kunden-E2E

Erst nach Abschluss der Shared-Punkte 1–3 und separater Owner-Freigabe:

Login → PAYG aktiv → echte Zahlungsmethode → Web-Concierge-Auftrag → serverseitige Quote → Betrag sehen → Sofortausführungs-Erklärungen → ausdrücklich kostenpflichtig freigeben → Core/CAO führt genau eine Aktion aus → genau eine Belastung/Wallet-Buchung → verifiziertes Ergebnis im Web → Kosten/Nutzung im Konto.

Dieser Website-Strang löst keine echte Zahlung und keine externe kostenpflichtige Aktion aus.
