package com.nahwerk.concierge.data

import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class NahwerkApi(
    private val sessions: SecureSessionStore,
    private val pendingChats: PendingChatStore
) {
    private data class HttpResult(val status: Int, val body: String)

    private suspend fun request(
        method: String,
        url: String,
        body: JSONObject? = null,
        bearer: String? = null,
        extraHeaders: Map<String, String> = emptyMap()
    ): HttpResult = withContext(Dispatchers.IO) {
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
        if (body != null) {
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        }
        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        connection.disconnect()
        HttpResult(status, text)
    }

    suspend fun login(email: String, password: String): AuthResult {
        val body = JSONObject().put("email", email.trim()).put("password", password)
        val r = request("POST", BuildConfig.AUTH_BASE_URL + "/login", body)
        val j = r.body.toJson()
        if (r.status !in 200..299 || j?.optBoolean("ok") != true) {
            return AuthResult(false, j?.optString("error") ?: "Anmeldung fehlgeschlagen")
        }
        val access = j.optString("access_token")
        val refresh = j.optString("refresh_token")
        val expires = j.optLong("expires_in", 3600L)
        if (access.isBlank() || refresh.isBlank()) return AuthResult(false, "Ungültige Sitzung")
        sessions.save(access, refresh, expires)
        return AuthResult(true)
    }

    suspend fun requestPasswordReset(email: String): Boolean {
        val r = request(
            "POST",
            BuildConfig.AUTH_BASE_URL + "/reset",
            JSONObject().put("email", email.trim())
        )
        return r.status in 200..299
    }

    private suspend fun refreshSession(): Boolean {
        val refresh = sessions.refreshToken() ?: return false
        val r = request(
            "POST",
            BuildConfig.AUTH_BASE_URL + "/refresh",
            JSONObject().put("refresh_token", refresh)
        )
        val j = r.body.toJson() ?: return false
        if (r.status !in 200..299 || !j.optBoolean("ok")) {
            sessions.clear()
            return false
        }
        val access = j.optString("access_token")
        val nextRefresh = j.optString("refresh_token")
        if (access.isBlank() || nextRefresh.isBlank()) {
            sessions.clear()
            return false
        }
        sessions.save(access, nextRefresh, j.optLong("expires_in", 3600L))
        return true
    }

    private suspend fun authorizedRequest(
        method: String,
        path: String,
        body: JSONObject? = null,
        extraHeaders: Map<String, String> = emptyMap()
    ): HttpResult {
        if (sessions.needsRefresh() && !refreshSession()) return HttpResult(401, "")
        var token = sessions.accessToken() ?: return HttpResult(401, "")
        var result = request(method, BuildConfig.GATEWAY_BASE_URL + path, body, token, extraHeaders)
        if (result.status == 401 && refreshSession()) {
            token = sessions.accessToken() ?: return HttpResult(401, "")
            result = request(method, BuildConfig.GATEWAY_BASE_URL + path, body, token, extraHeaders)
        }
        return result
    }

    suspend fun loadHome(): Result<HomeContext> {
        val r = authorizedRequest("GET", "/mobile/me")
        val j = r.body.toJson()
        if (r.status !in 200..299 || j?.optBoolean("ok") != true) {
            return Result.failure(IllegalStateException(j?.optString("error") ?: "Konto konnte nicht geladen werden"))
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

    fun createChatRequest(text: String): PendingChatRequest = pendingChats.create(text)

    fun pendingChatRequest(): PendingChatRequest? = pendingChats.current()

    suspend fun sendText(request: PendingChatRequest): ConciergeResult {
        val body = JSONObject()
            .put("message", request.message)
            .put("source_message_id", request.sourceMessageId)
        val r = authorizedRequest(
            method = "POST",
            path = "/mobile/chat",
            body = body,
            extraHeaders = ChatRequestContract.headers(request)
        )
        val j = r.body.toJson()
        val shadow = j?.optJSONObject("shadow_core")
        val shadowDuplicate = if (shadow?.has("duplicate") == true) shadow.optBoolean("duplicate") else null
        val idempotencyVerified = if (shadow?.has("idempotency_verified") == true) {
            shadow.optBoolean("idempotency_verified")
        } else null

        if (r.status !in 200..299 || j?.optBoolean("ok") != true) {
            return ConciergeResult(
                ok = false,
                error = j?.optString("error") ?: "Concierge nicht erreichbar",
                sourceMessageId = request.sourceMessageId,
                shadowDuplicate = shadowDuplicate,
                idempotencyVerified = idempotencyVerified
            )
        }

        check(pendingChats.clear(request.sourceMessageId)) { "pending_chat_clear_failed" }
        return ConciergeResult(
            ok = true,
            text = j.optString("reply"),
            intent = j.optJSONObject("result")?.optString("intent"),
            sourceMessageId = request.sourceMessageId,
            shadowDuplicate = shadowDuplicate,
            idempotencyVerified = idempotencyVerified
        )
    }

    suspend fun createReminder(input: ReminderInput): Result<Reminder> {
        val r = authorizedRequest(
            "POST",
            "/mobile/reminders",
            JSONObject().put("text", input.title).put("remind_at", input.dueAt)
        )
        val j = r.body.toJson()
        val rem = j?.optJSONObject("reminder")
        if (r.status !in 200..299 || j?.optBoolean("ok") != true || rem == null) {
            return Result.failure(IllegalStateException(j?.optString("error") ?: "Erinnerung konnte nicht erstellt werden"))
        }
        return Result.success(
            Reminder(
                rem.optString("id"),
                rem.optString("reminder_text"),
                rem.optString("remind_at"),
                rem.optString("status")
            )
        )
    }

    fun logout() {
        pendingChats.clearAll()
        sessions.clear()
    }

    fun hasSession(): Boolean = sessions.hasSession()

    private fun parseReminders(array: JSONArray?): List<Reminder> {
        if (array == null) return emptyList()
        return buildList {
            for (i in 0 until array.length()) {
                val o = array.optJSONObject(i) ?: continue
                add(Reminder(o.optString("id"), o.optString("reminder_text"), o.optString("remind_at"), o.optString("status")))
            }
        }
    }

    private fun String.toJson(): JSONObject? = try {
        if (isBlank()) null else JSONObject(this)
    } catch (_: Exception) {
        null
    }
}
