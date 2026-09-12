package com.nahwerk.concierge.data

import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

internal data class PaymentReadinessSnapshot(
    val production: Boolean,
    val provider: String,
    val keyMode: String,
    val apiReachable: Boolean,
    val apiLivemode: Boolean?,
    val liveConfirmed: Boolean,
    val webhookSecretConfigured: Boolean,
    val webhookEndpointConfigured: Boolean,
    val webhookEndpointEnabled: Boolean,
    val webhookRequiredEventsComplete: Boolean,
    val paymentReady: Boolean,
    val error: String?
)

internal object PaymentReadinessPolicy {
    fun confirmedReady(
        production: Boolean,
        provider: String,
        keyMode: String,
        apiReachable: Boolean,
        apiLivemode: Boolean?,
        liveConfirmed: Boolean,
        webhookSecretConfigured: Boolean,
        webhookEndpointConfigured: Boolean,
        webhookEndpointEnabled: Boolean,
        webhookRequiredEventsComplete: Boolean,
        serverPaymentReady: Boolean
    ): Boolean = production &&
        provider.equals("stripe", ignoreCase = true) &&
        keyMode == "live" &&
        apiReachable &&
        apiLivemode == true &&
        liveConfirmed &&
        webhookSecretConfigured &&
        webhookEndpointConfigured &&
        webhookEndpointEnabled &&
        webhookRequiredEventsComplete &&
        serverPaymentReady
}

/**
 * Read-only PROD readiness probe. It never creates a Checkout Session, charge,
 * PaymentIntent or payment-method mutation. Unknown/incomplete responses fail closed.
 */
internal class PaymentReadinessApi(
    private val baseUrl: String = BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/')
) {
    suspend fun load(): Result<PaymentReadinessSnapshot> = withContext(Dispatchers.IO) {
        if (baseUrl.isBlank() || !baseUrl.startsWith("https://") || baseUrl.contains("staging", ignoreCase = true)) {
            return@withContext Result.failure(IllegalStateException("PROD-Zahlungsprüfung ist nicht sicher konfiguriert."))
        }
        val connection = (URL("$baseUrl/web-payg-readiness").openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 12_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
        }
        try {
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val body = runCatching { JSONObject(text) }.getOrNull()
                ?: return@withContext Result.failure(IllegalStateException("Zahlungsbereitschaft konnte nicht bestätigt werden."))
            if (code !in 200..299 || !body.optBoolean("ok")) {
                return@withContext Result.failure(IllegalStateException("Zahlungsbereitschaft konnte nicht bestätigt werden."))
            }

            val production = body.optBoolean("production", false)
            val provider = body.optString("provider")
            val keyMode = body.optString("key_mode")
            val apiReachable = body.optBoolean("api_reachable", false)
            val apiLivemode = if (body.has("api_livemode") && !body.isNull("api_livemode")) body.optBoolean("api_livemode") else null
            val liveConfirmed = body.optBoolean("live_confirmed", false)
            val webhookSecretConfigured = body.optBoolean("webhook_secret_configured", false)
            val webhookEndpointConfigured = body.optBoolean("webhook_endpoint_configured", false)
            val webhookEndpointEnabled = body.optBoolean("webhook_endpoint_enabled", false)
            val webhookRequiredEventsComplete = body.optBoolean("webhook_required_events_complete", false)
            val serverPaymentReady = body.optBoolean("payment_ready", false)
            val paymentReady = PaymentReadinessPolicy.confirmedReady(
                production = production,
                provider = provider,
                keyMode = keyMode,
                apiReachable = apiReachable,
                apiLivemode = apiLivemode,
                liveConfirmed = liveConfirmed,
                webhookSecretConfigured = webhookSecretConfigured,
                webhookEndpointConfigured = webhookEndpointConfigured,
                webhookEndpointEnabled = webhookEndpointEnabled,
                webhookRequiredEventsComplete = webhookRequiredEventsComplete,
                serverPaymentReady = serverPaymentReady
            )
            Result.success(
                PaymentReadinessSnapshot(
                    production = production,
                    provider = provider,
                    keyMode = keyMode,
                    apiReachable = apiReachable,
                    apiLivemode = apiLivemode,
                    liveConfirmed = liveConfirmed,
                    webhookSecretConfigured = webhookSecretConfigured,
                    webhookEndpointConfigured = webhookEndpointConfigured,
                    webhookEndpointEnabled = webhookEndpointEnabled,
                    webhookRequiredEventsComplete = webhookRequiredEventsComplete,
                    paymentReady = paymentReady,
                    error = body.optString("error").takeIf(String::isNotBlank)
                )
            )
        } catch (_: Exception) {
            Result.failure(IllegalStateException("Zahlungsbereitschaft konnte nicht bestätigt werden."))
        } finally {
            connection.disconnect()
        }
    }
}
