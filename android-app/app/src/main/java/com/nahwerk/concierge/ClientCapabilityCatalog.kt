package com.nahwerk.concierge

internal enum class ClientCapabilityId {
    LOGIN_SESSION,
    ACCOUNT_CONTEXT,
    CONCIERGE_CHAT,
    CONVERSATION_CONTINUITY,
    TASK_STATE,
    USAGE_LIMITS,
    PERSONAL_DATA,
    SAFETY,
    FAMILY,
    NOTIFICATIONS,
    VOICE_HANDOFF,
    WHATSAPP_CONTINUITY,
    BILLING_SUBSCRIPTION,
    ERROR_HANDLING,
    OFFLINE_RETRY,
    LOGOUT_SESSION_EXPIRY,
    DEEP_LINKS_NAVIGATION
}

internal enum class ClientCapabilityStatus {
    READY,
    PARTIAL,
    MISSING,
    BLOCKED_BY_PLATFORM,
    BLOCKED_BY_WEBSITE,
    BLOCKED_BY_AUTH,
    BLOCKED_BY_BILLING,
    BLOCKED_BY_VOICE,
    BLOCKED_BY_OTHER
}

internal data class ClientCapability(
    val id: ClientCapabilityId,
    val title: String,
    val status: ClientCapabilityStatus,
    val frontend: String,
    val contract: String,
    val endpoint: String,
    val staging: String,
    val prod: String,
    val failClosed: String,
    val remainingWork: String
)

/**
 * Android-client inventory only. This catalog does not grant backend authority and deliberately
 * contains no invented shared API contract. READY here means the client-owned responsibility is
 * implemented; it never means an external backend capability is productive.
 */
internal object ClientCapabilityCatalog {
    val all: List<ClientCapability> = listOf(
        ClientCapability(
            ClientCapabilityId.LOGIN_SESSION,
            "Login / Session",
            ClientCapabilityStatus.PARTIAL,
            "Login, Reset, Refresh, verschlüsselte Session und Logout vorhanden.",
            "Bestehender Mobile-Auth-Contract; keine lokale Identity-Autorität.",
            "/login · /reset · /refresh",
            "Konkreter STAGING-Transport vorhanden.",
            "Produktive Mobile-Auth-Aktivierung nicht bestätigt.",
            "Ohne bestätigte Session kein Zugriff auf geschützte Screens.",
            "Produktions-Endpunkte und Session-Lifecycle durch Auth-Owner freigeben."
        ),
        ClientCapability(
            ClientCapabilityId.ACCOUNT_CONTEXT,
            "Account Context",
            ClientCapabilityStatus.PARTIAL,
            "Home-Kontext mit Loading-, Retry- und Fehlerzuständen vorhanden.",
            "Backend bleibt Quelle für Account-/Person-Kontext.",
            "GET /mobile/me",
            "Konkreter STAGING-Transport vorhanden.",
            "Produktive Mobile-Gateway-Aktivierung nicht bestätigt.",
            "Fehlender oder ungültiger Kontext wird nicht lokal ergänzt.",
            "Shared Mobile-Gateway-Freigabe nach Platform-Write-Lock."
        ),
        ClientCapability(
            ClientCapabilityId.CONCIERGE_CHAT,
            "Concierge Chat",
            ClientCapabilityStatus.PARTIAL,
            "Text-Chat, Pending-State, stabiler Retry und verschlüsselte UI-Persistenz vorhanden.",
            "Core entscheidet; Android erzeugt keine Task-/Approval-Semantik.",
            "POST /mobile/chat",
            "Konkreter STAGING-Transport mit stabiler Request-Identität vorhanden.",
            "Produktive Mobile-Gateway-Aktivierung nicht bestätigt.",
            "Unbestätigte Antwort bleibt pending; kein Fake-Erfolg.",
            "Produktions-Aktivierung und kanonische Continuity separat freigeben."
        ),
        ClientCapability(
            ClientCapabilityId.CONVERSATION_CONTINUITY,
            "Conversation Continuity",
            ClientCapabilityStatus.BLOCKED_BY_PLATFORM,
            "Lokale verschlüsselte UI-Fortsetzung vorhanden; nicht kanonisch.",
            "Kanonische History muss vom zentralen Core kommen.",
            "Kein aktivierter Android-History-Endpunkt.",
            "Kein versionierter Read-Contract im Client aktiviert.",
            "Nicht verfügbar.",
            "Lokale UI-Historie wird nie als Core-Historie ausgegeben.",
            "Exakten History-/Resume-Contract nach Platform-Lock integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.TASK_STATE,
            "Task State",
            ClientCapabilityStatus.BLOCKED_BY_PLATFORM,
            "Client zeigt nur bereits bestätigte Open-Loop-Anzahl; keine Task-Details.",
            "Task-/Execution-State bleibt Core-owned.",
            "Kein aktivierter Android-Task-Read-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Unknown bleibt unknown; keine lokale Completed/Failed-Ableitung.",
            "Versionierten Task-/Execution-Read-Contract integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.USAGE_LIMITS,
            "Usage / Limits",
            ClientCapabilityStatus.BLOCKED_BY_BILLING,
            "App-eigener Statusscreen vorhanden; keine erfundenen Verbrauchswerte.",
            "Usage und Entitlements müssen aus Billing/Usage-Backend kommen.",
            "Kein bestätigter Android-Usage-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Ohne Backendwert wird weder 0 noch verfügbar behauptet.",
            "Read-only Usage-/Limit-Contract durch Billing-Owner bereitstellen."
        ),
        ClientCapability(
            ClientCapabilityId.PERSONAL_DATA,
            "Persönliche Daten",
            ClientCapabilityStatus.BLOCKED_BY_AUTH,
            "App-eigener Statusscreen vorhanden; keine lokalen Profilmutationen.",
            "Person-/Account-Daten und Änderungsrechte bleiben Auth/Platform-owned.",
            "Kein bestätigter Android-Profil-Read/Write-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Keine Felder werden aus Namen, E-Mail oder lokaler UI als kanonisch erfunden.",
            "Autorisierte Read-/Update-Contracts nach Auth-Write-Lock integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.SAFETY,
            "Safety",
            ClientCapabilityStatus.BLOCKED_BY_PLATFORM,
            "Fail-closed Statusscreen vorhanden; keine Safety-Aktion im Client.",
            "Safety-State und Eskalation bleiben ausschließlich Backend/Core-owned.",
            "Kein aktivierter Android-Safety-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Unknown wird niemals als sicher, bestätigt oder erledigt interpretiert.",
            "Display-/Continuation-Contract nach Safety/Platform-Lock integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.FAMILY,
            "Family",
            ClientCapabilityStatus.BLOCKED_BY_PLATFORM,
            "Fail-closed Statusscreen vorhanden; keine lokale Relationship-Autorität.",
            "Membership, Rollen und Rechte bleiben backend-owned.",
            "Kein aktivierter Android-Family-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Namen oder Telefonnummern erzeugen keine Family-Berechtigung.",
            "Read-/Permission-Contract nach Platform-Lock integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.NOTIFICATIONS,
            "Notifications",
            ClientCapabilityStatus.BLOCKED_BY_PLATFORM,
            "Client-Surface und Deep-Link-Ziele sind vorbereitet; kein Device-Token-Upload.",
            "Event-, Token- und Delivery-Semantik muss serverseitig bestätigt werden.",
            "Kein aktivierter Push-Registration-Endpunkt.",
            "Keine Registrierung ausgelöst.",
            "Nicht verfügbar.",
            "Ohne bestätigten Contract werden keine Push-Erfolge oder Zustellungen behauptet.",
            "Device-Token/Event-/Deep-Link-Contract nach Platform-Lock integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.VOICE_HANDOFF,
            "Voice Entry / Handoff",
            ClientCapabilityStatus.BLOCKED_BY_VOICE,
            "Statusscreen vorhanden; Mikrofonberechtigung wird nicht vorab angefordert.",
            "Voice bleibt beim aktiven Voice-/Core-Strang.",
            "Kein aktivierter Android-Audio-/Handoff-Transport.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Keine Aufnahme, kein Call und kein Handoff ohne bestätigten Contract.",
            "Nach Voice-Lock exakten Audio-/Handoff-Contract integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.WHATSAPP_CONTINUITY,
            "WhatsApp Continuity",
            ClientCapabilityStatus.BLOCKED_BY_PLATFORM,
            "Statusscreen vorhanden; Android besitzt keine Cross-Channel-Wahrheit.",
            "One Person → One Conversation → One Core bleibt maßgeblich.",
            "Kein separater Android-WhatsApp-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Kein lokales Zusammenführen oder Duplizieren von WhatsApp-Conversation-State.",
            "Kanonischen Cross-Channel-Read/Resume-Contract integrieren."
        ),
        ClientCapability(
            ClientCapabilityId.BILLING_SUBSCRIPTION,
            "Billing / Subscription",
            ClientCapabilityStatus.BLOCKED_BY_BILLING,
            "Read-only Statusscreen vorhanden; keine Kauf-/Payment-Aktion.",
            "Entitlements, Plan und Zahlungen bleiben Billing-owned.",
            "Kein aktivierter Android-Billing-Endpunkt.",
            "Nicht aktiviert.",
            "Nicht verfügbar.",
            "Kein Tarif, Preis oder Payment-Erfolg wird lokal autoritativ gesetzt.",
            "Read-only Entitlement-Contract zuerst; Mutation separat freigeben."
        ),
        ClientCapability(
            ClientCapabilityId.ERROR_HANDLING,
            "Error Handling",
            ClientCapabilityStatus.READY,
            "Loading-, Empty-, Error-, Retry- und Pending-Zustände vorhanden.",
            "Reine Client-Verantwortung; keine Business-Autorität.",
            "Client-lokal.",
            "Aktiv.",
            "Client-seitig bereit.",
            "Ambige Antworten werden nicht zu Erfolg hochgestuft.",
            "Keine Shared-Restarbeit."
        ),
        ClientCapability(
            ClientCapabilityId.OFFLINE_RETRY,
            "Offline / Retry",
            ClientCapabilityStatus.READY,
            "Netzwerkstatus-Banner plus persistenter sicherer Chat-Retry vorhanden.",
            "Transportfehler ändern keine Core-Wahrheit.",
            "Client-lokal plus bestehende Mobile-Transporte.",
            "Aktiv.",
            "Client-seitig bereit.",
            "Pending Request behält dieselbe Request-Identität; keine Doppel-Ausführung.",
            "Keine Shared-Restarbeit."
        ),
        ClientCapability(
            ClientCapabilityId.LOGOUT_SESSION_EXPIRY,
            "Logout / Session Expiry",
            ClientCapabilityStatus.READY,
            "Logout löscht Session/Pending-State; abgelaufene Session fällt auf Login zurück.",
            "Client reagiert auf bestehenden Auth-Contract; keine eigene Session-Autorität.",
            "Client-lokal + /refresh.",
            "Aktiv.",
            "Client-seitig bereit; PROD-Auth selbst bleibt separat partial.",
            "401/abgelehnte Refresh-Session wird nicht weiterverwendet.",
            "Keine App-eigene Restarbeit."
        ),
        ClientCapability(
            ClientCapabilityId.DEEP_LINKS_NAVIGATION,
            "Deep Links / Navigation",
            ClientCapabilityStatus.READY,
            "App-interne nahwerk://app Ziele routen nur zu bestehenden oder fail-closed Screens.",
            "Deep Links transportieren keine Business-Autorität und keine kanonischen IDs.",
            "Client-lokal.",
            "Aktiv.",
            "Client-seitig bereit.",
            "Unauthenticated Deep Links bleiben am Login-Gate; keine Aktion wird ausgeführt.",
            "Push-spezifische Deep-Link-Events bleiben bis zum Notification-Contract blockiert."
        )
    )

    fun byId(id: ClientCapabilityId): ClientCapability = all.first { it.id == id }
}
