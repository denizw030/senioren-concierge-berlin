package com.nahwerk.concierge.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureSessionStore(context: Context) {
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

    fun save(accessToken: String, refreshToken: String, expiresInSeconds: Long) {
        val expiresAt = (System.currentTimeMillis() / 1000L) + expiresInSeconds
        prefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .putLong("expires_at", expiresAt)
            .apply()
    }

    fun accessToken(): String? = prefs.getString("access_token", null)
    fun refreshToken(): String? = prefs.getString("refresh_token", null)
    fun expiresAt(): Long = prefs.getLong("expires_at", 0L)

    fun needsRefresh(skewSeconds: Long = 90L): Boolean {
        val now = System.currentTimeMillis() / 1000L
        return accessToken().isNullOrBlank() || expiresAt() <= now + skewSeconds
    }

    fun hasSession(): Boolean = !refreshToken().isNullOrBlank()

    fun clear() {
        prefs.edit().clear().apply()
    }
}
