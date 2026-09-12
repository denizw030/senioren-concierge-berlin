package com.nahwerk.concierge.data

import android.content.Context
import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.util.UUID

internal class AppGatewaySessionExpiredException : IllegalStateException("Deine sichere Sitzung ist abgelaufen. Bitte erneut anmelden.")

internal data class AppHomeSnapshot(
    val personId: String,
    val customerAccountId: String,
    val conversationId: String?,
    val activeTaskId: String?,
    val activeTaskStatus: String?,
    val pendingApproval: Boolean,
    val reminderCountActive: Int,
    val reminders: List<AppReminder>
)

internal data class AppReminder(
    val id: String,
    val text: String,
    val remindAt: String,
    val status: String
)

internal data class AppCoreReply(
    val message: String,
    val responseState: String,
    val conversationId: String?,
    val activeTaskId: String?,
    val actionDispatched: Boolean
)

internal class AppGatewayApi(context: Context) {
    companion object {
        private const val PROD_HOST = "djicahhmnnamtjuqedqd.supabase.co"
        private const val GATEWAY_SLUG = "nahwerk-app-gateway"
    }

    private val sessions = SecureProductSessionStore(context.applicationContext)
    private val gatewayBaseUrl = "${BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/')}/$GATEWAY_SLUG"

    private data class HttpJson(val code: Int, val body: JSONObject)

    init {
        val uri = runCatching { URI(gatewayBaseUrl) }.getOrNull()
        require(uri?.scheme == "https" && uri.host == PROD_HOST && !gatewayBaseUrl.contains("staging", ignoreCase = true)) {
            "prod_app_gateway_required"
        }
    }

    suspend fun loadHome(): Result<AppHomeSnapshot> = withContext(Dispatchers.IO) {
        resultRequest("mobile/me", "GET") { body ->
            val identity = body.optJSONObject("identity") ?: error("identity_missing")
            val conversation = body.optJSONObject("conversation")
            val reminders = parseReminders(body.optJSONArray("reminders"))
            AppHomeSnapshot(
                personId = identity.optString("person_id"),
                customerAccountId = identity.optString("customer_account_id"),
                conversationId = conversation?.optString("conversation_id")?.takeIf(String::isNotBlank),
                activeTaskId = conversation?.optString("active_task_id")?.takeIf(String::isNotBlank),
                activeTaskStatus = conversation?.optString("active_task_status")?.takeIf(String::isNotBlank),
                pendingApproval = body.has("pending_approval") && !body.isNull("pending_approval"),
                reminderCountActive = body.optInt("reminder_count_active", reminders.count { it.status == "active" }),
                reminders = reminders
            )
        }
    }

    suspend fun loadReminders(): Result<List<AppReminder>> = withContext(Dispatchers.IO) {
        resultRequest("mobile/reminders", "GET") { parseReminders(it.optJSONArray("reminders")) }
    }

    suspend fun sendConcierge(message: String): Result<AppCoreReply> = withContext(Dispatchers.IO) {
        val clean = message.trim()
        if (clean.isBlank()) return@withContext Result.failure(IllegalArgumentException("Bitte eine Nachricht eingeben."))
        resultRequest(
            "mobile/chat",
            "POST",
            JSONObject()
                .put("message", clean)
                .put("source_message_id", UUID.randomUUID().toString())
                .put("correlation_id", "android-${UUID.randomUUID()}")
        ) { parseCoreReply(it) }
    }

    suspend fun createReminder(text: String, remindAtIso: String): Result<AppCoreReply> = withContext(Dispatchers.IO) {
        val clean = text.trim()
        if (clean.isBlank() || remindAtIso.isBlank()) {
            return@withContext Result.failure(IllegalArgumentException("Text und Zeitpunkt sind erforderlich."))
        }
        resultRequest(
            "mobile/reminders",
            "POST",
            JSONObject()
                .put("text", clean)
                .put("remind_at", remindAtIso)
                .put("source_message_id", UUID.randomUUID().toString())
        ) { parseCoreReply(it) }
    }

    private inline fun <T> resultRequest(
        path: String,
        method: String,
        payload: JSONObject? = null,
        parser: (JSONObject) -> T
    ): Result<T> = try {
        val response = request(path, method, payload)
        if (response.code == 401) {
            sessions.clear()
            Result.failure(AppGatewaySessionExpiredException())
        } else if (response.code !in 200..299 || response.body.optBoolean("ok") == false) {
            Result.failure(IllegalStateException(readableError(response.body, response.code)))
        } else if (response.body.optString("environment") != "PROD" || response.body.optBoolean("authoritative", true) == false) {
            Result.failure(IllegalStateException("PROD-Antwort konnte nicht autoritativ bestätigt werden."))
        } else Result.success(parser(response.body))
    } catch (e: Exception) {
        Result.failure(e)
    }

    private fun request(path: String, method: String, payload: JSONObject? = null): HttpJson {
        val token = sessions.sessionToken()
            ?: return HttpJson(401, JSONObject().put("error", "SESSION_REQUIRED"))
        if (!sessions.hasValidSession()) return HttpJson(401, JSONObject().put("error", "SESSION_INVALID"))

        val url = URL("$gatewayBaseUrl/${path.trimStart('/')}")
        require(url.protocol == "https" && url.host == PROD_HOST) { "prod_app_gateway_required" }
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12_000
            readTimeout = 40_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            setRequestProperty("Authorization", "Bearer $token")
            if (payload != null) doOutput = true
        }
        return try {
            if (payload != null) connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(payload.toString()) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val body = runCatching { JSONObject(text) }.getOrElse { JSONObject().put("error", "INVALID_SERVER_RESPONSE") }
            HttpJson(code, body)
        } catch (e: Exception) {
            HttpJson(503, JSONObject().put("error", "NETWORK_UNAVAILABLE").put("detail", e.javaClass.simpleName))
        } finally {
            connection.disconnect()
        }
    }

    private fun parseCoreReply(body: JSONObject): AppCoreReply {
        val core = body.optJSONObject("core") ?: error("core_response_missing")
        val messages = core.optJSONArray("messages")
        val text = buildList {
            if (messages != null) for (i in 0 until messages.length()) {
                messages.optJSONObject(i)?.optString("text")?.trim()?.takeIf(String::isNotBlank)?.let(::add)
            }
        }.joinToString("\n")
        if (text.isBlank()) error("core_message_missing")
        return AppCoreReply(
            message = text,
            responseState = core.optString("response_state", "UNKNOWN"),
            conversationId = core.optString("conversation_id").takeIf(String::isNotBlank),
            activeTaskId = core.optString("active_task_id").takeIf(String::isNotBlank),
            actionDispatched = body.optJSONObject("dispatch")?.optBoolean("dispatched", false) == true
        )
    }

    private fun parseReminders(array: JSONArray?): List<AppReminder> {
        if (array == null) return emptyList()
        return (0 until array.length()).mapNotNull { index ->
            val item = array.optJSONObject(index) ?: return@mapNotNull null
            AppReminder(
                id = item.optString("id"),
                text = item.optString("reminder_text"),
                remindAt = item.optString("remind_at"),
                status = item.optString("status")
            )
        }
    }

    private fun readableError(body: JSONObject, code: Int): String = when (body.optString("error", "REQUEST_FAILED")) {
        "APP_AUTHORITATIVE_ROUTE_DISABLED" -> "Der App-Concierge ist momentan nicht verfügbar. Bitte erneut versuchen."
        "CAO_APP_ROUTE_DISABLED" -> "Die Auftragsausführung ist momentan nicht verfügbar. Es wurde nichts ausgeführt."
        "NETWORK_UNAVAILABLE" -> "PROD ist gerade nicht erreichbar. Bitte erneut versuchen."
        else -> "PROD-Anfrage fehlgeschlagen (${body.optString("error", "REQUEST_FAILED")}, HTTP $code)."
    }
}
