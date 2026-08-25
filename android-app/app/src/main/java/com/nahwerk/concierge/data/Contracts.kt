package com.nahwerk.concierge.data

/** Client-only contracts. No production endpoint is invented here. */
interface AuthApi {
    suspend fun login(email: String, password: String): AuthResult
    suspend fun logout(): Boolean
    suspend fun requestPasswordReset(email: String): Boolean
}
interface ConciergeApi { suspend fun sendText(text: String): ConciergeResult }
interface ReminderApi { suspend fun list(): List<Reminder>; suspend fun create(input: ReminderInput): Reminder }
interface MemoryApi
interface FamilyApi
interface ActionsApi
interface NotificationsApi

data class AuthResult(val ok: Boolean, val sessionToken: String? = null, val expiresAt: String? = null)
data class ConciergeResult(val ok: Boolean, val text: String? = null)
data class Reminder(val id: String, val title: String, val dueAt: String?)
data class ReminderInput(val title: String, val dueAt: String?)
