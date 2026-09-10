package com.nahwerk.concierge.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject

data class ChatUiSnapshot(
    val messages: List<ChatMessage> = emptyList(),
    val draft: String = ""
)

class SecureChatUiStore(context: Context) {
    companion object {
        private const val OWNER_ACCOUNT_KEY = "owner_account_key"
        private const val MESSAGES_JSON = "messages_json"
        private const val DRAFT = "draft"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "nahwerk_mobile_chat_ui",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun save(ownerAccountKey: String, messages: List<ChatMessage>, draft: String): Boolean {
        require(ownerAccountKey.isNotBlank()) { "chat_ui_owner_required" }
        val encoded = JSONArray().apply {
            messages.forEach { message ->
                put(
                    JSONObject()
                        .put("role", message.role)
                        .put("text", message.text)
                        .put("source_message_id", message.sourceMessageId ?: JSONObject.NULL)
                )
            }
        }.toString()
        return prefs.edit()
            .putString(OWNER_ACCOUNT_KEY, ownerAccountKey)
            .putString(MESSAGES_JSON, encoded)
            .putString(DRAFT, draft)
            .commit()
    }

    fun restore(ownerAccountKey: String): ChatUiSnapshot {
        if (ownerAccountKey.isBlank()) return ChatUiSnapshot()
        if (prefs.getString(OWNER_ACCOUNT_KEY, null) != ownerAccountKey) return ChatUiSnapshot()
        val draft = prefs.getString(DRAFT, null).orEmpty()
        val encoded = prefs.getString(MESSAGES_JSON, null).orEmpty()
        if (encoded.isBlank()) return ChatUiSnapshot(draft = draft)
        val messages = runCatching {
            val array = JSONArray(encoded)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val role = item.optString("role")
                    val text = item.optString("text")
                    if (role.isBlank() || text.isBlank()) continue
                    val source = item.optString("source_message_id").takeIf { it.isNotBlank() && it != "null" }
                    add(ChatMessage(role, text, source))
                }
            }
        }.getOrDefault(emptyList())
        return ChatUiSnapshot(messages = messages, draft = draft)
    }

    fun clear(): Boolean = prefs.edit().clear().commit()
}
