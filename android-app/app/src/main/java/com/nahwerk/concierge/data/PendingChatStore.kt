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

    fun create(message: String): PendingChatRequest {
        check(current() == null) { "pending_chat_must_be_resolved_before_new_send" }
        val request = ChatRequestContract.create(message)
        val persisted = prefs.edit()
            .putString(SOURCE_MESSAGE_ID, request.sourceMessageId)
            .putString(CORRELATION_ID, request.correlationId)
            .putString(MESSAGE, request.message)
            .putLong(CREATED_AT, request.createdAtEpochMillis)
            .commit()
        check(persisted) { "pending_chat_persist_failed" }
        return request
    }

    fun current(): PendingChatRequest? {
        val sourceMessageId = prefs.getString(SOURCE_MESSAGE_ID, null)?.trim().orEmpty()
        val correlationId = prefs.getString(CORRELATION_ID, null)?.trim().orEmpty()
        val message = prefs.getString(MESSAGE, null)?.trim().orEmpty()
        val createdAt = prefs.getLong(CREATED_AT, 0L)
        if (sourceMessageId.isBlank() || correlationId.isBlank() || message.isBlank() || createdAt <= 0L) return null
        return PendingChatRequest(sourceMessageId, correlationId, message, createdAt)
    }

    fun clear(sourceMessageId: String): Boolean {
        val current = current() ?: return true
        if (current.sourceMessageId != sourceMessageId) return false
        return prefs.edit()
            .remove(SOURCE_MESSAGE_ID)
            .remove(CORRELATION_ID)
            .remove(MESSAGE)
            .remove(CREATED_AT)
            .commit()
    }

    fun clearAll() {
        prefs.edit().clear().commit()
    }
}
