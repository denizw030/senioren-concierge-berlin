package com.nahwerk.concierge.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class PendingChatStore(context: Context) {
    companion object {
        private const val SOURCE_MESSAGE_ID = "source_message_id"
        private const val CORRELATION_ID = "correlation_id"
        private const val MESSAGE = "message"
        private const val CREATED_AT = "created_at"
        private const val OWNER_ACCOUNT_KEY = "owner_account_key"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "nahwerk_mobile_pending_chat",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun create(message: String, ownerAccountKey: String): PendingChatRequest {
        require(ownerAccountKey.isNotBlank()) { "pending_chat_owner_required" }
        check(rawCurrent() == null) { "pending_chat_must_be_resolved_before_new_send" }
        val request = ChatRequestContract.create(message)
        val persisted = prefs.edit()
            .putString(SOURCE_MESSAGE_ID, request.sourceMessageId)
            .putString(CORRELATION_ID, request.correlationId)
            .putString(MESSAGE, request.message)
            .putLong(CREATED_AT, request.createdAtEpochMillis)
            .putString(OWNER_ACCOUNT_KEY, ownerAccountKey)
            .commit()
        check(persisted) { "pending_chat_persist_failed" }
        return request
    }

    fun current(ownerAccountKey: String): PendingChatRequest? {
        if (ownerAccountKey.isBlank()) return null
        if (prefs.getString(OWNER_ACCOUNT_KEY, null) != ownerAccountKey) return null
        return rawCurrent()
    }

    fun hasAnyPending(): Boolean = rawCurrent() != null

    fun hasPendingForOtherAccount(ownerAccountKey: String): Boolean {
        val raw = rawCurrent() ?: return false
        val owner = prefs.getString(OWNER_ACCOUNT_KEY, null).orEmpty()
        return raw.sourceMessageId.isNotBlank() && owner != ownerAccountKey
    }

    fun isOwnedBy(sourceMessageId: String, ownerAccountKey: String): Boolean {
        val current = current(ownerAccountKey) ?: return false
        return current.sourceMessageId == sourceMessageId
    }

    fun clear(sourceMessageId: String, ownerAccountKey: String): Boolean {
        val current = current(ownerAccountKey) ?: return false
        if (current.sourceMessageId != sourceMessageId) return false
        return clearAllInternal()
    }

    fun clearAll() {
        clearAllInternal()
    }

    private fun rawCurrent(): PendingChatRequest? {
        val sourceMessageId = prefs.getString(SOURCE_MESSAGE_ID, null)?.trim().orEmpty()
        val correlationId = prefs.getString(CORRELATION_ID, null)?.trim().orEmpty()
        val message = prefs.getString(MESSAGE, null)?.trim().orEmpty()
        val createdAt = prefs.getLong(CREATED_AT, 0L)
        if (sourceMessageId.isBlank() || correlationId.isBlank() || message.isBlank() || createdAt <= 0L) return null
        return PendingChatRequest(sourceMessageId, correlationId, message, createdAt)
    }

    private fun clearAllInternal(): Boolean = prefs.edit().clear().commit()
}
