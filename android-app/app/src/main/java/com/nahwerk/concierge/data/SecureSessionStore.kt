package com.nahwerk.concierge.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest
import java.util.Locale

class SecureSessionStore(context: Context) {
    companion object {
        private const val ACCESS_TOKEN = "access_token"
        private const val REFRESH_TOKEN = "refresh_token"
        private const val EXPIRES_AT = "expires_at"
        private const val ACCOUNT_KEY = "account_key"

        fun accountKeyFor(email: String): String {
            val normalized = email.trim().lowercase(Locale.ROOT)
            require(normalized.isNotBlank()) { "account_identity_required" }
            val digest = MessageDigest.getInstance("SHA-256").digest(normalized.toByteArray(Charsets.UTF_8))
            return digest.joinToString("") { "%02x".format(it) }
        }
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "nahwerk_mobile_session",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun save(
        accessToken: String,
        refreshToken: String,
        expiresInSeconds: Long,
        accountKey: String? = this.accountKey()
    ) {
        require(accessToken.isNotBlank()) { "access_token_required" }
        require(refreshToken.isNotBlank()) { "refresh_token_required" }
        val expiresAt = (System.currentTimeMillis() / 1000L) + expiresInSeconds.coerceAtLeast(0L)
        val editor = prefs.edit()
            .putString(ACCESS_TOKEN, accessToken)
            .putString(REFRESH_TOKEN, refreshToken)
            .putLong(EXPIRES_AT, expiresAt)
        if (!accountKey.isNullOrBlank()) editor.putString(ACCOUNT_KEY, accountKey)
        editor.commit()
    }

    fun accessToken(): String? = prefs.getString(ACCESS_TOKEN, null)
    fun refreshToken(): String? = prefs.getString(REFRESH_TOKEN, null)
    fun expiresAt(): Long = prefs.getLong(EXPIRES_AT, 0L)
    fun accountKey(): String? = prefs.getString(ACCOUNT_KEY, null)?.takeIf { it.isNotBlank() }

    fun needsRefresh(skewSeconds: Long = 90L): Boolean {
        val now = System.currentTimeMillis() / 1000L
        return accessToken().isNullOrBlank() || expiresAt() <= now + skewSeconds
    }

    fun hasSession(): Boolean = !refreshToken().isNullOrBlank()

    fun clear() {
        prefs.edit().clear().commit()
    }
}
