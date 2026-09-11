package com.nahwerk.concierge.data

enum class ClientCapabilityKey {
    USAGE_LIMITS,
    PERSONAL_DATA,
    SAFETY,
    FAMILY,
    NOTIFICATIONS,
    VOICE_HANDOFF,
    WHATSAPP_CONTINUITY,
    BILLING_SUBSCRIPTION,
    CONVERSATION_HISTORY,
    TASK_STATE
}

enum class ClientSurfaceReadiness {
    UI_READY_BACKEND_BLOCKED
}

data class ClientCapabilityDescriptor(
    val key: ClientCapabilityKey,
    val title: String,
    val summary: String,
    val testTag: String,
    val readiness: ClientSurfaceReadiness = ClientSurfaceReadiness.UI_READY_BACKEND_BLOCKED,
    val backendAuthorityAvailable: Boolean = false,
    val productionReady: Boolean = false,
    val maySubmitAuthorityBearingAction: Boolean = false
)

object ClientCapabilityCatalog {
    val accountSurfaces: List<ClientCapabilityDescriptor> = listOf(
        ClientCapabilityDescriptor(
            ClientCapabilityKey.USAGE_LIMITS,
            "Nutzung & Limits",
            "Die App-Oberfläche ist vorbereitet. Verbindliche Verbrauchs- und Limitwerte werden erst nach bestätigtem Billing-/Usage-Contract angezeigt.",
            "capability_usage_limits"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.PERSONAL_DATA,
            "Persönliche Daten",
            "Änderungen bleiben gesperrt, bis ein bestätigter Account-Data- und Autorisierungsvertrag für die App vorliegt.",
            "capability_personal_data"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.SAFETY,
            "Sicherheit",
            "Die App trifft keine Safety-Entscheidung. Status und Aktionen werden erst aus einem bestätigten Backend-Contract freigeschaltet.",
            "capability_safety"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.FAMILY,
            "Familie",
            "Beziehungen, Rollen und Berechtigungen werden ausschließlich aus dem kanonischen Family-Contract geladen.",
            "capability_family"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.NOTIFICATIONS,
            "Benachrichtigungen",
            "Die Oberfläche ist vorbereitet. Geräte-Registrierung und Zustellung bleiben aus, bis der Notification-Contract bestätigt ist.",
            "capability_notifications"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.BILLING_SUBSCRIPTION,
            "Abo & Abrechnung",
            "Keine Zahlung und keine Abo-Änderung wird aus der App gestartet, solange der produktive Billing-Contract fehlt.",
            "capability_billing"
        )
    )

    val channelSurfaces: List<ClientCapabilityDescriptor> = listOf(
        ClientCapabilityDescriptor(
            ClientCapabilityKey.VOICE_HANDOFF,
            "Telefon & Voice",
            "Voice bleibt ein anderer Kanal desselben zentralen Core. Die App aktiviert keinen eigenen Voice-Task-State.",
            "capability_voice"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.WHATSAPP_CONTINUITY,
            "WhatsApp-Kontinuität",
            "Kanalwechsel dürfen nur dieselbe kanonische Conversation fortsetzen; lokale App-Historie wird nicht zur Backend-Wahrheit.",
            "capability_whatsapp"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.CONVERSATION_HISTORY,
            "Gesprächsverlauf",
            "Lokale UI-Persistenz bleibt nicht-kanonisch. Server-Verlauf wird erst nach bestätigtem Conversation-History-Contract geladen.",
            "capability_history"
        ),
        ClientCapabilityDescriptor(
            ClientCapabilityKey.TASK_STATE,
            "Vorgänge & Ausführungen",
            "Die App stellt Task-State erst dar, wenn der zentrale Core einen bestätigten, app-fähigen Read-Contract liefert.",
            "capability_task_state"
        )
    )

    val all: List<ClientCapabilityDescriptor> = accountSurfaces + channelSurfaces

    fun forKey(key: ClientCapabilityKey): ClientCapabilityDescriptor =
        all.first { it.key == key }
}
