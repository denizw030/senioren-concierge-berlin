package com.nahwerk.concierge.data

import android.content.Context
import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.util.UUID

internal data class PaymentMethodCheckout(
    val checkoutUrl: String,
    val checkoutSessionId: String
)

/**
 * Thin client for the server-owned Stripe Checkout contract. Card data is never
 * collected or stored by the Android app; Stripe's hosted page owns entry and
 * confirmation. The app only creates and later synchronizes the server-bound
 * Checkout Session.
 */
internal class PaygCheckoutApi(context: Context) {
    private val sessions = SecureProductSessionStore(context.applicationContext)
    private val endpoint = BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/') + "/web-payg-checkout"

    suspend fun createPaymentMethodCheckout(): Result<PaymentMethodCheckout> = withContext(Dispatchers.IO) {
        val token = sessions.sessionToken()
            ?: return@withContext Result.failure(IllegalStateException("Die sichere PROD-Kontositzung ist abgelaufen."))
        val accountId = sessions.customerAccountId()
            ?: return@withContext Result.failure(IllegalStateException("Das PROD-Konto ist nicht eindeutig gebunden."))
        val payload = JSONObject()
            .put("action", "payment_method_checkout")
            .put("customer_account_id", accountId)
            .put("idempotency_key", "android-payment-method-${UUID.randomUUID()}")
        val response = post(token, payload)
        if (response.first !in 200..299 || response.second.optBoolean("ok") != true) {
            return@withContext Result.failure(IllegalStateException(readable(response.second)))
        }
        val url = response.second.optString("checkout_url")
        val sessionId = response.second.optString("checkout_session_id")
        if (!isTrustedStripeCheckoutUrl(url) || !sessionId.startsWith("cs_")) {
            return@withContext Result.failure(IllegalStateException("Stripe-Checkout wurde nicht eindeutig bestätigt."))
        }
        Result.success(PaymentMethodCheckout(url, sessionId))
    }

    suspend fun syncPaymentMethod(checkoutSessionId: String): Result<Unit> = withContext(Dispatchers.IO) {
        if (!checkoutSessionId.startsWith("cs_")) {
            return@withContext Result.failure(IllegalArgumentException("Ungültige Checkout-Sitzung."))
        }
        val token = sessions.sessionToken()
            ?: return@withContext Result.failure(IllegalStateException("Die sichere PROD-Kontositzung ist abgelaufen."))
        val accountId = sessions.customerAccountId()
            ?: return@withContext Result.failure(IllegalStateException("Das PROD-Konto ist nicht eindeutig gebunden."))
        val response = post(
            token,
            JSONObject()
                .put("action", "sync_payment_method_checkout")
                .put("customer_account_id", accountId)
                .put("checkout_session_id", checkoutSessionId)
        )
        if (response.first !in 200..299 || response.second.optBoolean("ok") != true || response.second.optString("status") != "payment_method_ready") {
            return@withContext Result.failure(IllegalStateException(readable(response.second)))
        }
        Result.success(Unit)
    }

    private fun isTrustedStripeCheckoutUrl(value: String): Boolean = runCatching {
        val uri = URI(value)
        uri.scheme.equals("https", ignoreCase = true) &&
            uri.host.equals("checkout.stripe.com", ignoreCase = true) &&
            uri.userInfo == null
    }.getOrDefault(false)

    private fun post(token: String, payload: JSONObject): Pair<Int, JSONObject> {
        if (!endpoint.startsWith("https://") || endpoint.contains("staging", ignoreCase = true)) {
            return 503 to JSONObject().put("status", "prod_checkout_not_configured")
        }
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 12_000
            readTimeout = 25_000
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
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            code to runCatching { JSONObject(text) }.getOrElse { JSONObject().put("status", "invalid_server_response") }
        } catch (e: Exception) {
            503 to JSONObject().put("status", "network_unavailable")
        } finally {
            connection.disconnect()
        }
    }

    private fun readable(body: JSONObject): String = when (body.optString("status")) {
        "payg_not_active" -> "Bitte PAYG zuerst aktivieren."
        "stripe_not_configured" -> "Stripe Live ist serverseitig noch nicht verfügbar."
        "invalid_session" -> "Die sichere PROD-Kontositzung ist abgelaufen."
        "payment_method_register_failed" -> "Die Zahlungsmethode konnte serverseitig nicht übernommen werden."
        "setup_checkout_not_complete" -> "Die Stripe-Bestätigung ist noch nicht abgeschlossen."
        "network_unavailable" -> "PROD ist gerade nicht erreichbar. Bitte erneut versuchen."
        else -> "Die sichere Zahlungsmethoden-Verwaltung konnte nicht abgeschlossen werden."
    }
}
