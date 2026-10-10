# STEWARO Mission v1 – Live-Verfolgung ausgehender Anrufe

Status: SOURCE CANDIDATE, nicht produktiv bereitgestellt.

Klienten sollen in ihrem authentifizierten Portal den aktuellen Status eines beauftragten ausgehenden Anrufs und das bereits tatsächlich gespeicherte, eindeutig gebundene automatische Gesprächstranskript verfolgen. Quelle bleibt ausschließlich der bestehende Endpunkt `/phone/outbound` beziehungsweise `/phone/outbound/transcript?call_id=...` mit identischem Konto-/Mitglied-/Personen-/Call-Job-/SIP-Binding.

Keine neuen Anrufe, kein Join, keine Kosten, kein Mitschnitt und keine erfundene Echtzeitgarantie. Live-Anzeige nur lesend, sichere Sitzung erforderlich, keine Tokens in URLs oder persistenter Speicherung. Leere, verspätete und fehlerhafte Spracherkennung klar kenntlich machen. Auth-Fehler müssen personenbezogene Ansicht entfernen. Sichtbares Browsertab darf pollend aktualisieren; im Hintergrund nicht fortlaufend abrufen.

Offen: Frontend-Implementierung, Quelltests, sicherer AWS-Release, realer Klienten-Safari-Test, separate zustimmungsgebundene Zuschaltung mit Camille.
