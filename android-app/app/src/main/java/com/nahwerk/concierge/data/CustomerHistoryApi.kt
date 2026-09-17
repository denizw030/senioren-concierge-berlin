package com.nahwerk.concierge.data

import android.content.Context
import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

internal class CustomerHistorySessionExpiredException : IllegalStateException("Deine sichere Sitzung ist abgelaufen. Bitte erneut anmelden.")

internal data class CustomerHistoryMessage(
    val id: String,
    val role: String,
    val text: String,
    val channel: String,
    val at: String
)

internal data class CustomerHistoryThread(
    val id: String,
    val title: String,
    val preview: String,
    val updatedAt: String,
    val channels: List<String>
)

internal class CustomerHistoryApi(context: Context) {
    companion object {
        private const val PROD_HOST = "djicahhmnnamtjuqedqd.supabase.co"
        // PROD runtime alias: the project function quota is currently full, so the canonical
        // nahwerk-customer-history implementation runs in a retired 410/GONE slot.
        private const val HISTORY_SLUG = "account-security-auth-cleanup-temp"
    }

    private val sessions = SecureProductSessionStore(context.applicationContext)
    private val baseUrl = "${BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/')}/$HISTORY_SLUG"

    init {
        val uri = runCatching { URI(baseUrl) }.getOrNull()
        require(uri?.scheme == "https" && uri.host == PROD_HOST && !baseUrl.contains("staging", ignoreCase = true)) {
            "prod_customer_history_required"
        }
    }

    suspend fun loadThreads(): Result<List<CustomerHistoryThread>> = withContext(Dispatchers.IO) {
        request("text/threads").mapCatching { body ->
            val rows = body.optJSONArray("threads") ?: return@mapCatching emptyList()
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.optJSONObject(index) ?: continue
                    val channels = row.optJSONArray("channels")
                    add(
                        CustomerHistoryThread(
                            id = row.optString("thread_id"),
                            title = row.optString("title", "NAHWERK Concierge"),
                            preview = row.optString("preview"),
                            updatedAt = row.optString("updated_at"),
                            channels = buildList {
                                if (channels != null) for (i in 0 until channels.length()) {
                                    channels.optString(i).takeIf(String::isNotBlank)?.let(::add)
                                }
                            }
                        )
                    )
                }
            }
        }
    }

    suspend fun loadMessages(threadId: String): Result<List<CustomerHistoryMessage>> = withContext(Dispatchers.IO) {
        if (threadId.isBlank()) return@withContext Result.success(emptyList())
        request("text/messages?thread_id=${java.net.URLEncoder.encode(threadId, Charsets.UTF_8.name())}").mapCatching { body ->
            val rows = body.optJSONArray("messages") ?: return@mapCatching emptyList()
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.optJSONObject(index) ?: continue
                    val text = row.optString("text").trim()
                    if (text.isBlank()) continue
                    add(
                        CustomerHistoryMessage(
                            id = row.optString("id", "history-$index"),
                            role = row.optString("role"),
                            text = text,
                            channel = row.optString("channel").uppercase(),
                            at = row.optString("at")
                        )
                    )
                }
            }
        }
    }

    private fun request(path: String): Result<JSONObject> {
        val token = sessions.sessionToken()
            ?: return Result.failure(CustomerHistorySessionExpiredException())
        if (!sessions.hasValidSession()) {
            sessions.clear()
            return Result.failure(CustomerHistorySessionExpiredException())
        }
        val url = URL("$baseUrl/${path.trimStart('/')}")
        require(url.protocol == "https" && url.host == PROD_HOST) { "prod_customer_history_required" }
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 12_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            setRequestProperty("Authorization", "Bearer $token")
        }
        return try {
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val body = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
            when {
                code == 401 -> {
                    sessions.clear()
                    Result.failure(CustomerHistorySessionExpiredException())
                }
                code !in 200..299 || body.optBoolean("ok") != true ->
                    Result.failure(IllegalStateException("Hauptverlauf konnte nicht geladen werden."))
                body.optString("environment") != "PROD" || body.optBoolean("authoritative", true) == false ->
                    Result.failure(IllegalStateException("PROD-Verlauf konnte nicht bestätigt werden."))
                else -> Result.success(body)
            }
        } catch (error: Exception) {
            Result.failure(IllegalStateException("Hauptverlauf ist gerade nicht erreichbar.", error))
        } finally {
            connection.disconnect()
        }
    }
}
