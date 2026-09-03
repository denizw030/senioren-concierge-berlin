package com.nahwerk.concierge.data

data class Session(
    val accessToken: String,
    val refreshToken: String,
    val expiresAtEpochSeconds: Long
)

data class AuthResult(
    val ok: Boolean,
    val error: String? = null
)

data class ConciergeProfile(
    val id: String,
    val name: String,
    val voice: String,
    val imageUrl: String
)

data class HomeContext(
    val greeting: String,
    val concierge: ConciergeProfile,
    val memoryCount: Int,
    val openLoopCount: Int,
    val reminders: List<Reminder>
)

data class PendingChatRequest(
    val sourceMessageId: String,
    val correlationId: String,
    val message: String,
    val createdAtEpochMillis: Long
)

data class ConciergeResult(
    val ok: Boolean,
    val text: String? = null,
    val error: String? = null,
    val intent: String? = null,
    val sourceMessageId: String? = null,
    val shadowDuplicate: Boolean? = null,
    val idempotencyVerified: Boolean? = null
)

data class Reminder(
    val id: String,
    val title: String,
    val dueAt: String?,
    val status: String
)

data class ReminderInput(
    val title: String,
    val dueAt: String
)

data class ChatMessage(
    val role: String,
    val text: String
)
