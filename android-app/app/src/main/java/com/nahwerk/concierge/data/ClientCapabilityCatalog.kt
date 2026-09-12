package com.nahwerk.concierge.data

enum class ClientCapabilityKey {
    REGISTRATION,
    USAGE_LIMITS,
    PERSONAL_DATA,
    PAYG,
    PAYMENT_METHODS,
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
    PROD_BOUND,
    PROD_READ_ONLY,
    UI_READY_BACKEND_BLOCKED
}

data class ClientCapabilityDescriptor(
    val key: ClientCapabilityKey,
    val title: String,
    val summary: String,
    val testTag: String,
    val readiness: ClientSurfaceReadiness,
    val backendAuthorityAvailable: Boolean,
    val productionReady: Boolean,
    val maySubmitAuthorityBearingAction: Boolean
)

object ClientCapabilityCatalog {
    private fun liveWrite(key: ClientCapabilityKey, title: String, summary: String, tag: String) =
        ClientCapabilityDescriptor(key, title, summary, tag, ClientSurfaceReadiness.PROD_BOUND, true, true, true)

    private fun liveRead(key: ClientCapabilityKey, title: String, summary: String, tag: String) =
        ClientCapabilityDescriptor(key, title, summary, tag, ClientSurfaceReadiness.PROD_READ_ONLY, true, true, false)

    private fun blocked(key: ClientCapabilityKey, title: String, summary: String, tag: String) =
        ClientCapabilityDescriptor(key, title, summary, tag, ClientSurfaceReadiness.UI_READY_BACKEND_BLOCKED, false, false, false)

    val accountSurfaces: List<ClientCapabilityDescriptor> = listOf(
        liveWrite(
            ClientCapabilityKey.REGISTRATION,
            "Registrierung",
            "FREE-Selbstregistrierung, Verifizierung und Auth-Bootstrap laufen über den bestätigten PROD-Vertrag.",
            "capability_registration"
        ),
        liveWrite(
            ClientCapabilityKey.PERSONAL_DATA,
            "Persönliche Daten",
            "Profil, Tarif und Nutzung kommen aus PROD; die vorhandenen freigegebenen Profilfelder können sicher gespeichert werden.",
            "capability_personal_data"
        ),
        liveWrite(
            ClientCapabilityKey.PAYG,
            "PAYG",
            "Status, Wallet, Limits und Aktivierung werden ausschließlich über den autoritativen PAYG-PROD-Vertrag gesteuert.",
            "capability_payg"
        ),
        liveWrite(
            ClientCapabilityKey.PAYMENT_METHODS,
            "Zahlungsmethoden",
            "Vorhandene Methoden werden aus PROD geladen; neue Methoden werden über servergebundenes Stripe Checkout bestätigt.",
            "capability_payment_methods"
        ),
        liveRead(
            ClientCapabilityKey.USAGE_LIMITS,
            "Kosten & Nutzung",
            "Verbrauch, PAYG-Kosten, Quotes und Limits werden ohne Schätzwerte aus dem PROD-Ledger angezeigt.",
            "capability_usage_limits"
        ),
        liveWrite(
            ClientCapabilityKey.SAFETY,
            "Sicherheit",
            "Safety-Status, Zeiten und Kontakte werden aus PROD geladen und über den bestehenden sicheren Vertrag gespeichert.",
            "capability_safety"
        ),
        liveWrite(
            ClientCapabilityKey.FAMILY,
            "Familie",
            "Rollen, Berechtigungen, verwaltete Personen und Einladungen nutzen die vorhandenen Family-PROD-Verträge.",
            "capability_family"
        ),
        blocked(
            ClientCapabilityKey.BILLING_SUBSCRIPTION,
            "Tarif & Abo",
            "Tarif- oder Abo-Wechsel gehören nicht zum aktuellen PAYG-Kundenflow und bleiben ohne separaten freigegebenen PROD-Vertrag gesperrt.",
            "capability_billing"
        ),
        blocked(
            ClientCapabilityKey.NOTIFICATIONS,
            "Benachrichtigungen",
            "Geräte-Push bleibt aus, bis ein Notification-Contract bestätigt ist.",
            "capability_notifications"
        )
    )

    val channelSurfaces: List<ClientCapabilityDescriptor> = listOf(
        blocked(
            ClientCapabilityKey.VOICE_HANDOFF,
            "Telefon & Voice",
            "Voice bleibt ein anderer Kanal desselben zentralen Core. Die App aktiviert keinen eigenen Voice-Task-State.",
            "capability_voice"
        ),
        blocked(
            ClientCapabilityKey.WHATSAPP_CONTINUITY,
            "WhatsApp-Kontinuität",
            "Kanalwechsel dürfen nur dieselbe kanonische Conversation fortsetzen; lokale App-Historie wird nicht zur Backend-Wahrheit.",
            "capability_whatsapp"
        ),
        blocked(
            ClientCapabilityKey.CONVERSATION_HISTORY,
            "Gesprächsverlauf",
            "Lokale UI-Persistenz bleibt nicht-kanonisch. Server-Verlauf benötigt weiterhin einen bestätigten Conversation-History-Read-Contract.",
            "capability_history"
        ),
        blocked(
            ClientCapabilityKey.TASK_STATE,
            "Vorgänge & Ausführungen",
            "Task-/Execution-Details benötigen weiterhin einen zentralen Core-Read-Contract.",
            "capability_task_state"
        )
    )

    val all: List<ClientCapabilityDescriptor> = accountSurfaces + channelSurfaces

    fun forKey(key: ClientCapabilityKey): ClientCapabilityDescriptor =
        all.first { it.key == key }
}
