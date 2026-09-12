package com.nahwerk.concierge.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Stores the separate PROD customer-product session issued by web-session-secure.
 * This is deliberately independent from the existing mobile Core session so the
 * app can consume current PROD account/PAYG/Safety/Family contracts without
 * changing the shared backend or the already established Concierge transport.
 */
class SecureProductSessionStore(context: Context) {
    companion object {
        private const val SESSION_TOKEN = "session_token"
        private const val EXPIRES_AT_MS = "expires_at_ms"
        private const val CUSTOMER_ACCOUNT_ID = "customer_account_id"
        private const val ENROLLMENT_REQUIRED = "enrollment_required"
        private const val MFA_TOKEN = "mfa_token"
        private const val MFA_METHOD = "mfa_method"
        private const val MFA_METHODS = "mfa_methods"
        private const val MFA_CHALLENGE_ID = "mfa_challenge_id"
        private const val MFA_MASKED_PHONE = "mfa_masked_phone"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "nahwerk_prod_customer_session",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveSession(
        token: String,
        expiresAtMs: Long,
        customerAccountId: String?,
        enrollmentRequired: Boolean
    ) {
        require(token.isNotBlank()) { "product_session_token_required" }
        prefs.edit()
            .putString(SESSION_TOKEN, token)
            .putLong(EXPIRES_AT_MS, expiresAtMs)
            .putString(CUSTOMER_ACCOUNT_ID, customerAccountId.orEmpty())
            .putBoolean(ENROLLMENT_REQUIRED, enrollmentRequired)
            .remove(MFA_TOKEN)
            .remove(MFA_METHOD)
            .remove(MFA_METHODS)
            .remove(MFA_CHALLENGE_ID)
            .remove(MFA_MASKED_PHONE)
            .commit()
    }

    fun savePendingMfa(
        token: String,
        method: String,
        methods: List<String>,
        challengeId: String?,
        maskedPhone: String?
    ) {
        prefs.edit()
            .putString(MFA_TOKEN, token)
            .putString(MFA_METHOD, method)
            .putString(MFA_METHODS, methods.joinToString(","))
            .putString(MFA_CHALLENGE_ID, challengeId.orEmpty())
            .putString(MFA_MASKED_PHONE, maskedPhone.orEmpty())
            .commit()
    }

    fun updatePendingMfa(method: String, challengeId: String?, maskedPhone: String?) {
        prefs.edit()
            .putString(MFA_METHOD, method)
            .putString(MFA_CHALLENGE_ID, challengeId.orEmpty())
            .putString(MFA_MASKED_PHONE, maskedPhone.orEmpty())
            .commit()
    }

    fun sessionToken(): String? = prefs.getString(SESSION_TOKEN, null)?.takeIf { it.isNotBlank() }
    fun customerAccountId(): String? = prefs.getString(CUSTOMER_ACCOUNT_ID, null)?.takeIf { it.isNotBlank() }
    fun enrollmentRequired(): Boolean = prefs.getBoolean(ENROLLMENT_REQUIRED, false)
    fun setEnrollmentRequired(value: Boolean) { prefs.edit().putBoolean(ENROLLMENT_REQUIRED, value).commit() }

    fun hasValidSession(nowMs: Long = System.currentTimeMillis(), skewMs: Long = 60_000L): Boolean =
        !sessionToken().isNullOrBlank() && prefs.getLong(EXPIRES_AT_MS, 0L) > nowMs + skewMs

    fun pendingMfaToken(): String? = prefs.getString(MFA_TOKEN, null)?.takeIf { it.isNotBlank() }
    fun pendingMfaMethod(): String? = prefs.getString(MFA_METHOD, null)?.takeIf { it.isNotBlank() }
    fun pendingMfaMethods(): List<String> = prefs.getString(MFA_METHODS, "").orEmpty()
        .split(',').map(String::trim).filter(String::isNotBlank)
    fun pendingMfaChallengeId(): String? = prefs.getString(MFA_CHALLENGE_ID, null)?.takeIf { it.isNotBlank() }
    fun pendingMfaMaskedPhone(): String? = prefs.getString(MFA_MASKED_PHONE, null)?.takeIf { it.isNotBlank() }
    fun hasPendingMfa(): Boolean = !pendingMfaToken().isNullOrBlank()

    fun clearPendingMfa() {
        prefs.edit()
            .remove(MFA_TOKEN)
            .remove(MFA_METHOD)
            .remove(MFA_METHODS)
            .remove(MFA_CHALLENGE_ID)
            .remove(MFA_MASKED_PHONE)
            .commit()
    }

    fun clear() { prefs.edit().clear().commit() }
}
