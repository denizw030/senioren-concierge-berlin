package com.nahwerk.concierge.data

import android.content.Context
import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Thin client for the existing PROD PAYG quote approval/cancellation actions.
 * Pricing, authorization, expiration and execution truth remain server-owned.
 */
internal class PaygQuoteActionApi(context: Context) {
    private val sessions = SecureProductSessionStore(context.applicationContext)
    private val endpoint = BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/') + "/web-payg"

    suspend fun approve(quoteId: String): Result<Unit> = withContext(Dispatchers.IO) {
        mutate("approve_quote", quoteId)
    }

    suspend fun cancel(quoteId: String): Result<Unit> = withContext(Dispatchers.IO) {
        mutate("cancel_quote", quoteId)
    }

    private fun mutate(action: String, quoteId: String): Result<Unit> {
        val token = sessions.sessionToken()
            ?: return Result.failure(IllegalStateException("Die sichere PROD-Kontositzung ist abgelaufen."))
        val accountId = sessions.customerAccountId()
            ?: return Result.failure(IllegalStateException("Das PROD-Konto ist nicht eindeutig gebunden."))
        if (!uuid.matches(quoteId)) {
            return Result.failure(IllegalArgumentException("Der PAYG-Auftrag ist nicht eindeutig gebunden."))
        }
        if (!endpoint.startsWith("https://") || endpoint.contains("staging", ignoreCase = true)) {
            return Result.failure(IllegalStateException("Der PAYG-PROD-Vertrag ist nicht verfügbar."))
        }

        val payload = JSONObject()
            .put("action", action)
            .put("customer_account_id", accountId)
            .put("quote_id", quoteId)
        if (action == "cancel_quote") payload.put("reason", "android_customer_cancelled")

        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 12_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Cache-Control", "no-store")
        }
        return try {
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(payload.toString()) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = runCatching {
                JSONObject(stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty())
            }.getOrElse { JSONObject() }
            if (code in 200..299 && body.optBoolean("ok") && body.optString("quote_id") == quoteId) {
                Result.success(Unit)
            } else {
                Result.failure(IllegalStateException(readable(body, code)))
            }
        } catch (_: Exception) {
            Result.failure(IllegalStateException("PAYG-PROD ist gerade nicht erreichbar. Bitte erneut versuchen."))
        } finally {
            connection.disconnect()
        }
    }

    private fun readable(body: JSONObject, httpCode: Int): String = when (body.optString("status")) {
        "payg_state_not_authorized" -> "Du darfst diesen PAYG-Auftrag nicht freigeben."
        "quote_approval_failed" -> "Der Auftrag konnte nicht freigegeben werden. Er wurde nicht doppelt ausgeführt."
        "quote_cancel_failed" -> "Der Auftrag konnte nicht storniert werden. Bitte Status aktualisieren."
        "invalid_session" -> "Die sichere PROD-Kontositzung ist abgelaufen."
        else -> if (httpCode == 401) "Die sichere PROD-Kontositzung ist abgelaufen."
        else "Der PAYG-Auftrag konnte nicht eindeutig verarbeitet werden."
    }

    private companion object {
        val uuid = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
    }
}
