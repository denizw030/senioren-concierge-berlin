package com.nahwerk.concierge.data

import android.content.Context
import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

internal class CustomerEmailSessionExpiredException : IllegalStateException("Deine sichere Sitzung ist abgelaufen. Bitte erneut anmelden.")

internal data class CustomerEmailConnection(
    val id: String,
    val provider: String,
    val providerLabel: String,
    val accountDisplayHint: String?,
    val state: String,
    val connectedAt: String?,
    val reauthRequired: Boolean,
    val conciergeAvailable: Boolean
)

internal data class CustomerEmailStatus(
    val connections: List<CustomerEmailConnection>
) {
    val connectedCount: Int get() = connections.count { it.state == "CONNECTED" }
}

internal class CustomerEmailApi(context: Context) {
    companion object {
        private const val PROD_HOST = "djicahhmnnamtjuqedqd.supabase.co"
        private const val EMAIL_RUNTIME_SLUG = "nahwerk-email-runtime"
    }

    private val sessions = SecureProductSessionStore(context.applicationContext)
    private val baseUrl = "${BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/')}/$EMAIL_RUNTIME_SLUG"

    init {
        val uri = runCatching { URI(baseUrl) }.getOrNull()
        require(uri?.scheme == "https" && uri.host == PROD_HOST && !baseUrl.contains("staging", ignoreCase = true)) {
            "prod_email_runtime_required"
        }
    }

    suspend fun loadConnections(): Result<CustomerEmailStatus> = withContext(Dispatchers.IO) {
        val token = sessions.sessionToken()
            ?: return@withContext Result.failure(CustomerEmailSessionExpiredException())
        if (!sessions.hasValidSession()) {
            sessions.clear()
            return@withContext Result.failure(CustomerEmailSessionExpiredException())
        }

        val url = URL("$baseUrl/email/connections")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 12_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            setRequestProperty("Authorization", "Bearer $token")
        }

        try {
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val body = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
            when {
                code == 401 -> {
                    sessions.clear()
                    Result.failure(CustomerEmailSessionExpiredException())
                }
                code !in 200..299 || body.optBoolean("ok") != true ->
                    Result.failure(IllegalStateException("E-Mail-Status konnte gerade nicht geladen werden."))
                else -> Result.success(parseStatus(body))
            }
        } catch (error: Exception) {
            Result.failure(IllegalStateException("E-Mail-Status ist gerade nicht erreichbar.", error))
        } finally {
            connection.disconnect()
        }
    }

    private fun parseStatus(body: JSONObject): CustomerEmailStatus {
        val rows = body.optJSONArray("connections") ?: return CustomerEmailStatus(emptyList())
        val items = buildList {
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                val state = row.optString("state", "ERROR").uppercase()
                add(
                    CustomerEmailConnection(
                        id = row.optString("connection_id"),
                        provider = row.optString("provider").uppercase(),
                        providerLabel = row.optString("provider_label").ifBlank {
                            row.optString("provider").ifBlank { "E-Mail" }
                        },
                        accountDisplayHint = row.optString("account_display_hint").takeIf(String::isNotBlank),
                        state = state,
                        connectedAt = row.optString("connected_at").takeIf(String::isNotBlank),
                        reauthRequired = row.optBoolean("reauth_required", state == "REAUTH_REQUIRED"),
                        conciergeAvailable = row.optBoolean("email_concierge_available", state == "CONNECTED")
                    )
                )
            }
        }
        return CustomerEmailStatus(items)
    }
}
