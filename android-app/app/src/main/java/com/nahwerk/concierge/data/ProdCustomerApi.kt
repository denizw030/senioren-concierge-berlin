package com.nahwerk.concierge.data

import android.content.Context
import com.nahwerk.concierge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.util.UUID

internal class ProdCustomerApi(context: Context) {
    private val sessions = SecureProductSessionStore(context.applicationContext)
    private val baseUrl = BuildConfig.CUSTOMER_PRODUCT_BASE_URL.trimEnd('/')

    private data class HttpJson(val code: Int, val body: JSONObject)

    fun hasSession(): Boolean = sessions.hasValidSession()
    fun hasPendingMfa(): Boolean = sessions.hasPendingMfa()
    fun enrollmentRequired(): Boolean = sessions.enrollmentRequired()
    fun pendingAuthState(): ProductAuthState = ProductAuthState(
        authenticated = hasSession(),
        mfaRequired = sessions.hasPendingMfa(),
        mfaMethod = sessions.pendingMfaMethod(),
        mfaMethods = sessions.pendingMfaMethods(),
        maskedPhone = sessions.pendingMfaMaskedPhone(),
        enrollmentRequired = sessions.enrollmentRequired()
    )

    suspend fun authenticate(email: String, password: String): ProductAuthState = withContext(Dispatchers.IO) {
        if (baseUrl.isBlank()) return@withContext ProductAuthState(error = "PROD-Produkt-API ist nicht konfiguriert.")
        val response = request(
            path = "web-login-secure",
            method = "POST",
            payload = JSONObject().put("email", ProdCustomerPolicy.normalizedEmail(email)).put("password", password),
            authenticated = false
        )
        handleLoginResponse(response)
    }

    suspend fun beginLoginMfa(method: String): ProductAuthState = withContext(Dispatchers.IO) {
        val token = sessions.pendingMfaToken()
            ?: return@withContext ProductAuthState(error = "Keine offene Sicherheitsbestätigung vorhanden.")
        val response = request(
            "web-login-secure",
            "POST",
            JSONObject().put("mfa_token", token).put("mfa_method", method),
            authenticated = false
        )
        val body = response.body
        if (response.code in 200..299 && body.optBoolean("ok") && body.optString("status") == "mfa_challenge_ready") {
            val resolvedMethod = body.optString("mfa_method", method)
            sessions.updatePendingMfa(
                resolvedMethod,
                body.optString("challenge_id").takeIf(String::isNotBlank),
                body.optString("masked_phone").takeIf(String::isNotBlank)
            )
            return@withContext pendingAuthState()
        }
        ProductAuthState(error = readableError(body, response.code))
    }

    suspend fun verifyLoginMfa(code: String): ProductAuthState = withContext(Dispatchers.IO) {
        val token = sessions.pendingMfaToken()
            ?: return@withContext ProductAuthState(error = "Keine offene Sicherheitsbestätigung vorhanden.")
        val method = sessions.pendingMfaMethod()?.takeUnless { it == "choice" }
            ?: return@withContext ProductAuthState(error = "Bitte zuerst die Bestätigungsmethode auswählen.")
        val payload = JSONObject()
            .put("mfa_token", token)
            .put("mfa_method", method)
            .put("code", code.filter(Char::isDigit).take(6))
        sessions.pendingMfaChallengeId()?.let { payload.put("challenge_id", it) }
        val response = request("web-login-secure", "POST", payload, authenticated = false)
        handleLoginResponse(response)
    }

    fun clearLocalSession() = sessions.clear()

    suspend fun register(input: RegistrationInput): RegistrationState = withContext(Dispatchers.IO) {
        if (!ProdCustomerPolicy.validEmail(input.email)) return@withContext RegistrationState(false, "invalid_email", error = "Bitte eine gültige E-Mail-Adresse eingeben.")
        if (!ProdCustomerPolicy.validRegistrationPassword(input.password)) return@withContext RegistrationState(false, "invalid_password", error = "Das Passwort muss mindestens 15 Zeichen lang sein.")
        if (input.firstName.isBlank() || input.lastName.isBlank()) return@withContext RegistrationState(false, "invalid_name", error = "Vor- und Nachname sind erforderlich.")

        val fullName = listOf(input.firstName.trim(), input.lastName.trim()).joinToString(" ")
        val payload = JSONObject()
            .put("product", "prime")
            .put("concierge_profile", "PRIME_MARTIN")
            .put("concierge_choice", input.conciergeChoice)
            .put("package", "FREE")
            .put("registration_type", "self")
            .put("account_holder_name", fullName)
            .put("account_holder_salutation", "DU")
            .put("account_holder_first_name", input.firstName.trim())
            .put("account_holder_last_name", input.lastName.trim())
            .put("email", ProdCustomerPolicy.normalizedEmail(input.email))
            .put("phone", input.phone.trim())
            .put("supported_person_name", fullName)
            .put("supported_person_salutation", "DU")
            .put("supported_person_first_name", input.firstName.trim())
            .put("supported_person_last_name", input.lastName.trim())
            .put("relationship", "Ich selbst")
            .put("supported_whatsapp", input.phone.trim())
            .put("form_of_address", "DU")
            .put("initial_notes", "")
            .put("contact_consent", true)
            .put("safety_enabled", false)
            .put("checkin_times", "")
            .put("trusted_contact_name", "")
            .put("trusted_contact_phone", "")
            .put("account_holder_web_only", false)
            .put("web_password", input.password)
            .put("web_password_repeat", input.password)

        val response = request("web-registration-secure", "POST", payload, authenticated = false)
        registrationState(response)
    }

    suspend fun verifyRegistration(input: RegistrationInput, requestId: String, code: String): RegistrationState = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("request_id", requestId)
            .put("verification_code", code.filter(Char::isDigit).take(6))
            .put("email", ProdCustomerPolicy.normalizedEmail(input.email))
            .put("web_password", input.password)
            .put("web_password_repeat", input.password)
            .put("phone", input.phone.trim())
            .put("first_name", input.firstName.trim())
            .put("last_name", input.lastName.trim())
        registrationState(request("web-registration-secure", "POST", payload, authenticated = false))
    }

    suspend fun loadProfile(): Result<CustomerProfile> = withContext(Dispatchers.IO) {
        authenticatedResult("web-profile", "GET") { parseProfile(it) }
    }

    suspend fun updateProfile(firstName: String, lastName: String): Result<CustomerProfile> = withContext(Dispatchers.IO) {
        authenticatedResult(
            "web-profile",
            "POST",
            JSONObject().put("first_name", firstName.trim()).put("last_name", lastName.trim())
        ) { parseProfile(it) }
    }

    suspend fun loadPayg(): Result<PaygSnapshot> = withContext(Dispatchers.IO) {
        val account = sessions.customerAccountId()
        val suffix = if (account.isNullOrBlank()) "" else "?customer_account_id=$account"
        authenticatedResult("web-payg$suffix", "GET") { parsePayg(it) }
    }

    suspend fun setPaygEnabled(enabled: Boolean, dailyLimitCents: Long? = null, monthlyLimitCents: Long? = null): Result<PaygSnapshot> = withContext(Dispatchers.IO) {
        val account = sessions.customerAccountId().orEmpty()
        val payload = JSONObject()
            .put("action", if (enabled) "activate" else "deactivate")
            .put("customer_account_id", account)
        if (enabled) {
            dailyLimitCents?.let { payload.put("daily_limit_cents", it) }
            monthlyLimitCents?.let { payload.put("monthly_limit_cents", it) }
        }
        val response = request("web-payg", "POST", payload, authenticated = true)
        if (response.code !in 200..299 || response.body.optBoolean("ok") == false) {
            if (response.code == 401) sessions.clear()
            return@withContext Result.failure(IllegalStateException(readableError(response.body, response.code)))
        }
        loadPayg()
    }

    suspend fun loadSafety(): Result<SafetySnapshot> = withContext(Dispatchers.IO) {
        val account = sessions.customerAccountId()
        val suffix = if (account.isNullOrBlank()) "" else "?customer_account_id=$account"
        authenticatedResult("web-managed-safety-context$suffix", "GET") { parseSafety(it) }
    }

    suspend fun saveSafety(snapshot: SafetySnapshot): Result<SafetySnapshot> = withContext(Dispatchers.IO) {
        if (!ProdCustomerPolicy.validCheckinTimes(snapshot.checkinTimes, snapshot.enabled)) {
            return@withContext Result.failure(IllegalArgumentException("Bitte 1–4 gültige Zeiten im Format HH:MM verwenden."))
        }
        val contacts = JSONArray()
        snapshot.contacts.forEach { contact ->
            contacts.put(JSONObject().put("name", contact.name.trim()).put("phone", contact.phone.trim()).put("relationship", contact.relationship.trim()))
        }
        val payload = JSONObject()
            .put("customer_account_id", sessions.customerAccountId().orEmpty())
            .put("enabled", snapshot.enabled)
            .put("checkin_times", JSONArray(snapshot.checkinTimes.map(String::trim).filter(String::isNotBlank)))
            .put("contacts", contacts)
            .put("timezone", snapshot.timezone.ifBlank { "Europe/Berlin" })
        authenticatedResult("web-managed-safety-context", "PUT", payload) { parseSafety(it) }
    }

    suspend fun loadFamily(): Result<FamilySnapshot> = withContext(Dispatchers.IO) {
        try {
            val account = sessions.customerAccountId()
            val suffix = if (account.isNullOrBlank()) "" else "?customer_account_id=$account"
            val permissions = request("web-family-permissions$suffix", "GET", authenticated = true)
            if (permissions.code !in 200..299 || !permissions.body.optBoolean("ok")) throw IllegalStateException(readableError(permissions.body, permissions.code))

            val people = request("nahwerk-family-access/operator/managed-people", "GET", authenticated = true)
            val invites = request("nahwerk-family-access/family/invitations", "GET", authenticated = true)
            val actors = parseFamilyActors(permissions.body.optJSONArray("actors"))
            val managed = if (people.code in 200..299 && people.body.optBoolean("ok")) parseManagedPeople(people.body.optJSONArray("people")) else emptyList()
            val invitations = if (invites.code in 200..299 && invites.body.optBoolean("ok")) parseInvitations(invites.body.optJSONArray("invitations")) else emptyList()
            Result.success(FamilySnapshot(actors, managed, invitations))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun setFamilyPermission(actorPersonId: String, permission: String, enabled: Boolean): Result<FamilySnapshot> = withContext(Dispatchers.IO) {
        val response = request(
            "web-family-permissions",
            "PUT",
            JSONObject()
                .put("customer_account_id", sessions.customerAccountId().orEmpty())
                .put("actor_person_id", actorPersonId)
                .put("permission", permission)
                .put("enabled", enabled),
            authenticated = true
        )
        if (response.code !in 200..299 || !response.body.optBoolean("ok")) {
            return@withContext Result.failure(IllegalStateException(readableError(response.body, response.code)))
        }
        loadFamily()
    }

    suspend fun createFamilyInvitation(input: FamilyInvitationInput): Result<FamilySnapshot> = withContext(Dispatchers.IO) {
        if (!input.contactConsentAttested) return@withContext Result.failure(IllegalArgumentException("Kontakt-Einwilligung ist erforderlich."))
        val payload = JSONObject()
            .put("first_name", input.firstName.trim())
            .put("last_name", input.lastName.trim())
            .put("relationship", input.relationship.trim().uppercase())
            .put("whatsapp_number", input.whatsappNumber.trim())
            .put("preferred_language", input.preferredLanguage.trim())
            .put("contact_consent_attested", true)
            .put("entitlements", JSONArray())
        input.conciergeChoice?.takeIf(String::isNotBlank)?.let { payload.put("concierge_choice", it) }
        input.formOfAddress?.takeIf(String::isNotBlank)?.let { payload.put("form_of_address", it) }
        input.personalMessage?.takeIf(String::isNotBlank)?.let { payload.put("personal_message", it) }
        val response = request(
            "nahwerk-family-access/operator/managed-people/invitations",
            "POST",
            payload,
            authenticated = true,
            headers = mapOf("Idempotency-Key" to "android-family-${UUID.randomUUID()}")
        )
        if (response.code !in 200..299 || !response.body.optBoolean("ok")) {
            return@withContext Result.failure(IllegalStateException(readableError(response.body, response.code)))
        }
        loadFamily()
    }

    suspend fun revokeFamilyInvitation(invitationId: String): Result<FamilySnapshot> = withContext(Dispatchers.IO) {
        val response = request(
            "nahwerk-family-access/family/invitations/$invitationId/revoke",
            "POST",
            JSONObject().put("reason", "android_customer_revoke"),
            authenticated = true
        )
        if (response.code !in 200..299 || !response.body.optBoolean("ok")) {
            return@withContext Result.failure(IllegalStateException(readableError(response.body, response.code)))
        }
        loadFamily()
    }

    suspend fun startTotpEnrollment(password: String): MfaEnrollmentStart = withContext(Dispatchers.IO) {
        val response = request(
            "web-mfa-manage",
            "POST",
            JSONObject().put("action", "enroll_start").put("method", "totp").put("password", password),
            authenticated = true
        )
        val body = response.body
        if (response.code in 200..299 && body.optBoolean("ok") && body.optString("status") == "mfa_enrollment_started") {
            MfaEnrollmentStart(
                true,
                enrollmentToken = body.optString("enrollment_token").takeIf(String::isNotBlank),
                secret = body.optString("secret").takeIf(String::isNotBlank),
                uri = body.optString("uri").takeIf(String::isNotBlank)
            )
        } else MfaEnrollmentStart(false, error = readableError(body, response.code))
    }

    suspend fun verifyTotpEnrollment(enrollmentToken: String, code: String): MfaEnrollmentResult = withContext(Dispatchers.IO) {
        val response = request(
            "web-mfa-manage",
            "POST",
            JSONObject()
                .put("action", "enroll_verify")
                .put("method", "totp")
                .put("enrollment_token", enrollmentToken)
                .put("code", code.filter(Char::isDigit).take(6)),
            authenticated = true
        )
        val body = response.body
        if (response.code in 200..299 && body.optBoolean("ok") && body.optString("status") == "mfa_enabled") {
            sessions.setEnrollmentRequired(false)
            val codes = body.optJSONArray("recovery_codes").toStringList()
            MfaEnrollmentResult(true, recoveryCodes = codes)
        } else MfaEnrollmentResult(false, error = readableError(body, response.code))
    }

    private fun handleLoginResponse(response: HttpJson): ProductAuthState {
        val body = response.body
        if (response.code !in 200..299 || !body.optBoolean("ok")) {
            return ProductAuthState(error = readableError(body, response.code))
        }
        return when (body.optString("status")) {
            "logged_in" -> {
                val token = body.optString("session_token")
                if (token.isBlank()) return ProductAuthState(error = "PROD-Sitzung wurde ohne Token bestätigt.")
                sessions.saveSession(
                    token = token,
                    expiresAtMs = parseInstantMs(body.optString("expires_at")) ?: (System.currentTimeMillis() + 11 * 60 * 60 * 1000L),
                    customerAccountId = body.optString("customer_account_id").takeIf(String::isNotBlank),
                    enrollmentRequired = body.optBoolean("enrollment_required", false)
                )
                ProductAuthState(authenticated = true, enrollmentRequired = sessions.enrollmentRequired())
            }
            "mfa_required", "mfa_challenge_ready" -> {
                val mfaToken = body.optString("mfa_token")
                if (mfaToken.isBlank()) return ProductAuthState(error = "Sicherheitsbestätigung konnte nicht gebunden werden.")
                val methods = body.optJSONArray("mfa_methods").toStringList()
                sessions.savePendingMfa(
                    token = mfaToken,
                    method = body.optString("mfa_method", "choice"),
                    methods = methods,
                    challengeId = body.optString("challenge_id").takeIf(String::isNotBlank),
                    maskedPhone = body.optString("masked_phone").takeIf(String::isNotBlank)
                )
                pendingAuthState()
            }
            else -> ProductAuthState(error = readableError(body, response.code))
        }
    }

    private fun registrationState(response: HttpJson): RegistrationState {
        val body = response.body
        val status = body.optString("status", if (response.code in 200..299) "ok" else "registration_failed")
        return if (response.code in 200..299 && body.optBoolean("ok")) {
            RegistrationState(true, status, body.optString("request_id").takeIf(String::isNotBlank))
        } else RegistrationState(false, status, error = readableError(body, response.code))
    }

    private inline fun <T> authenticatedResult(
        path: String,
        method: String,
        payload: JSONObject? = null,
        parser: (JSONObject) -> T
    ): Result<T> {
        return try {
            val response = request(path, method, payload, authenticated = true)
            if (response.code == 401) sessions.clear()
            if (response.code !in 200..299 || response.body.optBoolean("ok") == false) {
                Result.failure(IllegalStateException(readableError(response.body, response.code)))
            } else Result.success(parser(response.body))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun request(
        path: String,
        method: String,
        payload: JSONObject? = null,
        authenticated: Boolean,
        headers: Map<String, String> = emptyMap()
    ): HttpJson {
        if (baseUrl.isBlank() || !baseUrl.startsWith("https://")) return HttpJson(503, JSONObject().put("status", "prod_api_not_configured"))
        val connection = (URL("$baseUrl/${path.trimStart('/')}").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            headers.forEach { (key, value) -> setRequestProperty(key, value) }
            if (authenticated) {
                val token = sessions.sessionToken()
                if (token.isNullOrBlank()) return HttpJson(401, JSONObject().put("status", "product_session_required"))
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (payload != null) doOutput = true
        }
        return try {
            if (payload != null) connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(payload.toString()) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            HttpJson(code, runCatching { JSONObject(text) }.getOrElse { JSONObject().put("status", "invalid_server_response") })
        } catch (e: Exception) {
            HttpJson(503, JSONObject().put("status", "network_unavailable").put("detail", e.javaClass.simpleName))
        } finally {
            connection.disconnect()
        }
    }

    private fun parseProfile(body: JSONObject): CustomerProfile {
        val profile = body.optJSONObject("profile") ?: error("profile_missing")
        val plan = body.optJSONObject("plan")
        val usage = body.optJSONObject("usage")
        return CustomerProfile(
            firstName = profile.optString("first_name"),
            lastName = profile.optString("last_name"),
            email = profile.optString("email"),
            whatsappNumber = profile.optString("whatsapp_number"),
            customerAccountId = body.optString("customer_account_id"),
            customerNumber = body.optString("customer_number"),
            brand = body.optString("brand"),
            planCode = plan?.optString("code").orEmpty(),
            planName = plan?.optString("name").orEmpty(),
            monthlyPriceCents = plan?.optLongOrNull("monthly_price_cents"),
            appDialogueLimit = plan?.optIntOrNull("app_dialogue_limit"),
            whatsappDialogueLimit = plan?.optIntOrNull("whatsapp_dialogue_limit"),
            appDialoguesUsed = usage?.optIntOrNull("app_dialogues_used"),
            whatsappDialoguesUsed = usage?.optIntOrNull("whatsapp_dialogues_used"),
            usagePeriodStart = usage?.optString("period_start")?.takeIf(String::isNotBlank),
            usagePeriodEnd = usage?.optString("period_end")?.takeIf(String::isNotBlank)
        )
    }

    private fun parsePayg(body: JSONObject): PaygSnapshot {
        val payg = body.optJSONObject("payg") ?: JSONObject()
        val wallet = body.optJSONObject("wallet") ?: JSONObject()
        val provider = body.optJSONObject("payment_provider") ?: JSONObject()
        val methods = body.optJSONArray("payment_methods").objects().map { item ->
            PaymentMethodSummary(
                id = item.optString("id"), provider = item.optString("provider"), methodType = item.optString("method_type"),
                brand = item.optString("brand").takeIf(String::isNotBlank), last4 = item.optString("last4").takeIf(String::isNotBlank),
                expMonth = item.optIntOrNull("exp_month"), expYear = item.optIntOrNull("exp_year"),
                isDefault = item.optBoolean("is_default"), status = item.optString("status")
            )
        }
        val usage = body.optJSONArray("usage").objects().map { item ->
            PaygUsageEntry(
                id = item.optString("id"), rateCode = item.optString("rate_code"), quantity = item.optDouble("quantity", 0.0),
                unit = item.optString("unit"), actualCost = item.optDoubleOrNull("actual_cost"), currency = item.optString("currency", "EUR"),
                occurredAt = item.optString("occurred_at").takeIf(String::isNotBlank), canonicalActionId = item.optString("canonical_action_id").takeIf(String::isNotBlank)
            )
        }
        val quotes = body.optJSONArray("quotes").objects().map { item ->
            PaygQuote(
                id = item.optString("id"), description = item.optString("description"), amountCents = item.optLong("amount_cents", 0L),
                currency = item.optString("currency", "EUR"), status = item.optString("status"), expiresAt = item.optString("expires_at").takeIf(String::isNotBlank)
            )
        }
        return PaygSnapshot(
            enabled = payg.optBoolean("enabled"), configured = payg.optBoolean("configured"), billingBlocked = payg.optBoolean("billing_blocked"),
            billingBlockedReason = payg.optString("billing_blocked_reason").takeIf(String::isNotBlank),
            dailyLimitCents = payg.optLongOrNull("daily_limit_cents"), monthlyLimitCents = payg.optLongOrNull("monthly_limit_cents"),
            walletStatus = wallet.optString("status", "UNKNOWN"), balanceCents = wallet.optLong("balance_cents", 0L),
            reservedCents = wallet.optLong("reserved_cents", 0L), availableCents = wallet.optLong("available_cents", 0L),
            currency = wallet.optString("currency", "EUR"), paymentMethods = methods, usage = usage, quotes = quotes,
            setupAvailable = provider.optBoolean("setup_available"), webhookConfigured = provider.optBoolean("webhook_configured")
        )
    }

    private fun parseSafety(body: JSONObject): SafetySnapshot {
        val safety = body.optJSONObject("safety") ?: error("safety_missing")
        val contacts = safety.optJSONArray("contacts").objects().map { item ->
            SafetyContact(item.optString("name"), item.optString("phone"), item.optString("relationship"))
        }
        return SafetySnapshot(
            enabled = safety.optBoolean("enabled"),
            checkinTimes = safety.optJSONArray("checkin_times").toStringList(),
            timezone = safety.optString("timezone", "Europe/Berlin"),
            nextCheckinAt = safety.optString("next_checkin_at").takeIf(String::isNotBlank),
            contacts = contacts,
            canWrite = body.optBoolean("can_write", false)
        )
    }

    private fun parseFamilyActors(array: JSONArray?): List<FamilyActor> = array.objects().map { item ->
        FamilyActor(
            actorPersonId = item.optString("actor_person_id"), displayName = item.optString("display_name"), role = item.optString("role"),
            isPayer = item.optBoolean("is_payer"), canViewUsage = item.optBoolean("can_view_usage"), canManagePlan = item.optBoolean("can_manage_plan"),
            managePreferences = item.optBoolean("manage_preferences"), manageSafety = item.optBoolean("manage_safety"), hasWildcardPermission = item.optBoolean("has_wildcard_permission")
        )
    }

    private fun parseManagedPeople(array: JSONArray?): List<ManagedPerson> = array.objects().map { item ->
        val recipient = item.optJSONObject("recipient") ?: JSONObject()
        val displayName = listOf(recipient.optString("first_name"), recipient.optString("last_name")).filter(String::isNotBlank).joinToString(" ")
        ManagedPerson(item.optString("id"), item.optString("relationship"), item.optString("status"), displayName.ifBlank { "Verknüpfte Person" })
    }

    private fun parseInvitations(array: JSONArray?): List<FamilyInvitation> = array.objects().map { item ->
        FamilyInvitation(
            id = item.optString("id"), firstName = item.optString("first_name"), lastName = item.optString("last_name"),
            relationship = item.optString("relationship"), preferredLanguage = item.optString("preferred_language"), state = item.optString("state"),
            expiresAt = item.optString("expires_at").takeIf(String::isNotBlank)
        )
    }

    private fun readableError(body: JSONObject, code: Int): String {
        return when (val status = body.optString("status", body.optString("error", "request_failed"))) {
            "invalid_credentials" -> "E-Mail oder Passwort sind nicht korrekt."
            "too_many_attempts" -> "Zu viele Versuche. Bitte später erneut versuchen."
            "invalid_session", "session_required", "product_session_required" -> "Die sichere PROD-Kontositzung ist abgelaufen. Bitte erneut bestätigen."
            "mfa_enrollment_required" -> "Bitte zuerst die Sicherheitsbestätigung einrichten."
            "safety_permission_required", "write_not_authorized" -> "Für diese Safety-Änderung fehlt die Berechtigung."
            "payg_not_active" -> "PAYG muss zuerst aktiviert werden."
            "billing_blocked" -> "PAYG ist für dieses Konto derzeit gesperrt."
            "stripe_not_configured" -> "Zahlungsanbieter ist serverseitig noch nicht vollständig konfiguriert."
            "contact_consent_required" -> "Die Einwilligung zum Kontakt ist erforderlich."
            "network_unavailable" -> "PROD ist gerade nicht erreichbar. Bitte erneut versuchen."
            else -> "PROD-Anfrage fehlgeschlagen ($status, HTTP $code)."
        }
    }

    private fun parseInstantMs(value: String): Long? = runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()

    private fun JSONArray?.objects(): List<JSONObject> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { optJSONObject(it) }
    }

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { optString(it).takeIf(String::isNotBlank) }
    }

    private fun JSONObject.optLongOrNull(key: String): Long? = if (!has(key) || isNull(key)) null else optLong(key)
    private fun JSONObject.optIntOrNull(key: String): Int? = if (!has(key) || isNull(key)) null else optInt(key)
    private fun JSONObject.optDoubleOrNull(key: String): Double? = if (!has(key) || isNull(key)) null else optDouble(key)
}
