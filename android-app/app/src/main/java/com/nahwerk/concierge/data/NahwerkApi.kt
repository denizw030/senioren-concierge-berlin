package com.nahwerk.concierge.data

import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException
import javax.net.ssl.SSLException

class NahwerkApi(
    private val sessions: SecureSessionStore,
    private val pendingChats: PendingChatStore,
    private val authBaseUrl: String = BuildConfig.AUTH_BASE_URL,
    private val gatewayBaseUrl: String = BuildConfig.GATEWAY_BASE_URL
) {
    private data class HttpResult(val status: Int, val body: String)
    private enum class RefreshOutcome { SUCCESS, AUTH_REJECTED, TRANSIENT_FAILURE }

    private suspend fun request(
        method: String,
        url: String,
        body: JSONObject? = null,
        bearer: String? = null,
        extraHeaders: Map<String, String> = emptyMap()
    ): HttpResult = withContext(Dispatchers.IO) {
        require(url.startsWith("https://") || BuildConfig.DEBUG) { "secure_transport_required" }
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 35_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            extraHeaders.forEach { (name, value) -> setRequestProperty(name, value) }
            if (!bearer.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $bearer")
            doInput = true
            if (body != null) doOutput = true
        }
        try {
            if (body != null) {
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            HttpResult(status, stream?.bufferedReader()?.use { it.readText() }.orEmpty())
        } finally {
            connection.disconnect()
        }
    }

    suspend fun login(email: String, password: String): AuthResult {
        val normalizedEmail = email.trim()
        if (normalizedEmail.isBlank() || password.isBlank()) return AuthResult(false, "E-Mail und Passwort werden benötigt.")
        val r = try {
            request("POST", authBaseUrl + "/login", JSONObject().put("email", normalizedEmail).put("password", password))
        } catch (e: Exception) {
            return AuthResult(false, networkMessage(e, "Anmeldung derzeit nicht erreichbar."))
        }
        val j = r.body.toJson()
        if (r.status !in 200..299 || j?.optBoolean("ok") != true) {
            return AuthResult(false, authError(r.status))
        }
        val access = j.optString("access_token")
        val refresh = j.optString("refresh_token")
        val expires = j.optLong("expires_in", 3600L)
        if (access.isBlank() || refresh.isBlank()) return AuthResult(false, "Die Anmeldung lieferte keine gültige Sitzung.")

        val accountKey = SecureSessionStore.accountKeyFor(normalizedEmail)
        if (pendingChats.hasAnyPending() && pendingChats.current(accountKey) == null) {
            pendingChats.clearAll()
        }
        sessions.save(access, refresh, expires, accountKey)
        return AuthResult(true)
    }

    suspend fun requestPasswordReset(email: String): Boolean {
        if (email.isBlank()) return false
        return try {
            val r = request("POST", authBaseUrl + "/reset", JSONObject().put("email", email.trim()))
            r.status in 200..299
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun refreshSession(): RefreshOutcome {
        val refresh = sessions.refreshToken() ?: run {
            sessions.clear()
            return RefreshOutcome.AUTH_REJECTED
        }
        val r = try {
            request("POST", authBaseUrl + "/refresh", JSONObject().put("refresh_token", refresh))
        } catch (_: Exception) {
            return RefreshOutcome.TRANSIENT_FAILURE
        }

        if (r.status == 400 || r.status == 401 || r.status == 403 || r.status == 422) {
            sessions.clear()
            return RefreshOutcome.AUTH_REJECTED
        }
        if (r.status !in 200..299) return RefreshOutcome.TRANSIENT_FAILURE

        val j = r.body.toJson() ?: return RefreshOutcome.TRANSIENT_FAILURE
        if (!j.optBoolean("ok")) return RefreshOutcome.TRANSIENT_FAILURE
        val access = j.optString("access_token")
        val nextRefresh = j.optString("refresh_token")
        if (access.isBlank() || nextRefresh.isBlank()) return RefreshOutcome.TRANSIENT_FAILURE
        sessions.save(access, nextRefresh, j.optLong("expires_in", 3600L))
        return RefreshOutcome.SUCCESS
    }

    private suspend fun authorizedRequest(
        method: String,
        path: String,
        body: JSONObject? = null,
        extraHeaders: Map<String, String> = emptyMap()
    ): HttpResult {
        if (sessions.needsRefresh()) {
            when (refreshSession()) {
                RefreshOutcome.AUTH_REJECTED -> return HttpResult(401, errorJson("session_expired"))
                RefreshOutcome.TRANSIENT_FAILURE -> {
                    if (sessions.accessToken().isNullOrBlank()) {
                        return HttpResult(503, errorJson("session_refresh_temporarily_unavailable"))
                    }
                }
                RefreshOutcome.SUCCESS -> Unit
            }
        }

        var token = sessions.accessToken() ?: return HttpResult(401, errorJson("session_expired"))
        var result = request(method, gatewayBaseUrl + path, body, token, extraHeaders)
        if (result.status == 401) {
            when (refreshSession()) {
                RefreshOutcome.SUCCESS -> {
                    token = sessions.accessToken() ?: return HttpResult(401, errorJson("session_expired"))
                    result = request(method, gatewayBaseUrl + path, body, token, extraHeaders)
                }
                RefreshOutcome.AUTH_REJECTED -> return HttpResult(401, errorJson("session_expired"))
                RefreshOutcome.TRANSIENT_FAILURE -> return HttpResult(503, errorJson("session_refresh_temporarily_unavailable"))
            }
        }
        return result
    }

    suspend fun loadHome(): Result<HomeContext> {
        val r = try {
            authorizedRequest("GET", "/mobile/me")
        } catch (e: Exception) {
            return Result.failure(IllegalStateException(networkMessage(e, "Konto konnte nicht geladen werden.")))
        }
        val j = r.body.toJson()
        if (r.status !in 200..299 || j?.optBoolean("ok") != true) {
            val message = when (r.status) {
                401 -> "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."
                503 -> "Die Sitzung konnte vorübergehend nicht erneuert werden. Bitte erneut versuchen."
                else -> "Konto konnte nicht geladen werden."
            }
            return Result.failure(IllegalStateException(message))
        }
        val c = j.optJSONObject("concierge") ?: JSONObject()
        val id = c.optString("id", "nilo")
        val concierge = ConciergeProfile(
            id = id,
            name = c.optString("name", "Nilo"),
            voice = c.optString("voice", "cedar"),
            imageUrl = "https://nahwerkconcierge.com/assets/concierges/large/$id.webp"
        )
        return Result.success(
            HomeContext(
                greeting = j.optString("greeting", "Was darf ich für dich tun?"),
                concierge = concierge,
                memoryCount = j.optJSONArray("memory")?.length() ?: 0,
                openLoopCount = j.optJSONArray("open_loops")?.length() ?: 0,
                reminders = parseReminders(j.optJSONArray("reminders"))
            )
        )
    }

    fun createChatRequest(text: String): PendingChatRequest {
        val accountKey = sessions.accountKey() ?: error("account_identity_missing")
        return pendingChats.create(text, accountKey)
    }

    fun pendingChatRequest(): PendingChatRequest? {
        val accountKey = sessions.accountKey() ?: return null
        return pendingChats.current(accountKey)
    }

    fun discardPendingChat(sourceMessageId: String): Boolean {
        val accountKey = sessions.accountKey() ?: return false
        return pendingChats.clear(sourceMessageId, accountKey)
    }

    suspend fun sendText(request: PendingChatRequest): ConciergeResult {
        val accountKey = sessions.accountKey()
            ?: return ConciergeResult(false, error = "Bitte melde dich erneut an.", sourceMessageId = request.sourceMessageId)
        if (!pendingChats.isOwnedBy(request.sourceMessageId, accountKey)) {
            return ConciergeResult(false, error = "Diese ausstehende Nachricht gehört nicht zur aktuellen Sitzung.", sourceMessageId = request.sourceMessageId)
        }

        val body = JSONObject()
            .put("message", request.message)
            .put("source_message_id", request.sourceMessageId)
            .put("correlation_id", request.correlationId)
        val r = try {
            authorizedRequest("POST", "/mobile/chat", body, ChatRequestContract.headers(request))
        } catch (e: Exception) {
            return ConciergeResult(false, error = networkMessage(e, "Concierge derzeit nicht erreichbar."), sourceMessageId = request.sourceMessageId)
        }
        val j = r.body.toJson()
        val shadow = j?.optJSONObject("shadow_core")
        val shadowDuplicate = if (shadow?.has("duplicate") == true) shadow.optBoolean("duplicate") else null
        val idempotencyVerified = if (shadow?.has("idempotency_verified") == true) shadow.optBoolean("idempotency_verified") else null

        if (r.status !in 200..299 || j?.optBoolean("ok") != true) {
            val error = when (r.status) {
                401 -> "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."
                503 -> "Die Sitzung konnte vorübergehend nicht erneuert werden. Die Nachricht bleibt für einen sicheren Retry erhalten."
                else -> j?.optString("error")?.takeIf { it.isNotBlank() } ?: "Concierge derzeit nicht erreichbar."
            }
            return ConciergeResult(false, error = error, sourceMessageId = request.sourceMessageId, shadowDuplicate = shadowDuplicate, idempotencyVerified = idempotencyVerified)
        }

        val reply = j.optString("reply").trim()
        if (reply.isBlank()) {
            return ConciergeResult(
                ok = false,
                error = "Der Concierge hat keine bestätigte Antwort geliefert. Die Nachricht bleibt für einen sicheren Retry erhalten.",
                sourceMessageId = request.sourceMessageId,
                shadowDuplicate = shadowDuplicate,
                idempotencyVerified = idempotencyVerified
            )
        }
        if (!pendingChats.clear(request.sourceMessageId, accountKey)) {
            return ConciergeResult(false, error = "Die Antwort wurde empfangen, konnte aber lokal nicht sicher bestätigt werden. Bitte nicht erneut senden.", sourceMessageId = request.sourceMessageId)
        }
        return ConciergeResult(
            ok = true,
            text = reply,
            intent = j.optJSONObject("result")?.optString("intent"),
            sourceMessageId = request.sourceMessageId,
            shadowDuplicate = shadowDuplicate,
            idempotencyVerified = idempotencyVerified
        )
    }

    suspend fun createReminder(input: ReminderInput): Result<Reminder> {
        val r = try {
            authorizedRequest("POST", "/mobile/reminders", JSONObject().put("text", input.title).put("remind_at", input.dueAt))
        } catch (e: Exception) {
            return Result.failure(IllegalStateException(networkMessage(e, "Erinnerung konnte nicht erstellt werden.")))
        }
        val j = r.body.toJson()
        val rem = j?.optJSONObject("reminder")
        if (r.status !in 200..299 || j?.optBoolean("ok") != true || rem == null) {
            return Result.failure(IllegalStateException("Erinnerung konnte nicht erstellt werden."))
        }
        return Result.success(Reminder(rem.optString("id"), rem.optString("reminder_text"), rem.optString("remind_at"), rem.optString("status")))
    }

    fun logout() {
        pendingChats.clearAll()
        sessions.clear()
    }

    fun hasSession(): Boolean = sessions.hasSession()
    fun accountKey(): String? = sessions.accountKey()

    private fun parseReminders(array: JSONArray?): List<Reminder> {
        if (array == null) return emptyList()
        return buildList {
            for (i in 0 until array.length()) {
                val o = array.optJSONObject(i) ?: continue
                add(Reminder(o.optString("id"), o.optString("reminder_text"), o.optString("remind_at"), o.optString("status")))
            }
        }
    }

    private fun authError(status: Int): String = when (status) {
        400, 401, 403, 422 -> "E-Mail oder Passwort ist nicht korrekt."
        429 -> "Zu viele Anmeldeversuche. Bitte versuche es später erneut."
        in 500..599 -> "Anmeldung vorübergehend nicht verfügbar."
        else -> "Anmeldung fehlgeschlagen."
    }

    private fun networkMessage(error: Exception, fallback: String): String = when (error) {
        is SocketTimeoutException -> "Die Verbindung hat zu lange gedauert. Bitte erneut versuchen."
        is UnknownHostException, is ConnectException -> "Keine Verbindung zum NAHWERK-Dienst. Bitte Internetverbindung prüfen."
        is SSLException -> "Die sichere Verbindung konnte nicht hergestellt werden."
        else -> fallback
    }

    private fun errorJson(error: String): String = JSONObject().put("error", error).toString()

    private fun String.toJson(): JSONObject? = try {
        if (isBlank()) null else JSONObject(this)
    } catch (_: Exception) {
        null
    }
}
