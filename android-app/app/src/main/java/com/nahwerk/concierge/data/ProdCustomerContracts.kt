package com.nahwerk.concierge.data

internal data class ProductAuthState(
    val authenticated: Boolean = false,
    val mfaRequired: Boolean = false,
    val mfaMethod: String? = null,
    val mfaMethods: List<String> = emptyList(),
    val maskedPhone: String? = null,
    val enrollmentRequired: Boolean = false,
    val error: String? = null
)

internal data class RegistrationInput(
    val firstName: String,
    val lastName: String,
    val email: String,
    val phone: String,
    val password: String,
    val conciergeChoice: String = "nilo"
)

internal data class RegistrationState(
    val ok: Boolean,
    val status: String,
    val requestId: String? = null,
    val error: String? = null
)

internal data class CustomerProfile(
    val firstName: String,
    val lastName: String,
    val email: String,
    val whatsappNumber: String,
    val customerAccountId: String,
    val customerNumber: String,
    val brand: String,
    val planCode: String,
    val planName: String,
    val monthlyPriceCents: Long?,
    val appDialogueLimit: Int?,
    val whatsappDialogueLimit: Int?,
    val appDialoguesUsed: Int?,
    val whatsappDialoguesUsed: Int?,
    val usagePeriodStart: String?,
    val usagePeriodEnd: String?
)

internal data class PaymentMethodSummary(
    val id: String,
    val provider: String,
    val methodType: String,
    val brand: String?,
    val last4: String?,
    val expMonth: Int?,
    val expYear: Int?,
    val isDefault: Boolean,
    val status: String
)

internal data class PaygUsageEntry(
    val id: String,
    val rateCode: String,
    val quantity: Double,
    val unit: String,
    val actualCost: Double?,
    val currency: String,
    val occurredAt: String?,
    val canonicalActionId: String?
)

internal data class PaygQuote(
    val id: String,
    val description: String,
    val amountCents: Long,
    val currency: String,
    val status: String,
    val expiresAt: String?
)

internal data class PaygSnapshot(
    val enabled: Boolean,
    val configured: Boolean,
    val billingBlocked: Boolean,
    val billingBlockedReason: String?,
    val dailyLimitCents: Long?,
    val monthlyLimitCents: Long?,
    val walletStatus: String,
    val balanceCents: Long,
    val reservedCents: Long,
    val availableCents: Long,
    val currency: String,
    val paymentMethods: List<PaymentMethodSummary>,
    val usage: List<PaygUsageEntry>,
    val quotes: List<PaygQuote>,
    val setupAvailable: Boolean,
    val webhookConfigured: Boolean
)

internal data class SafetyContact(
    val name: String,
    val phone: String,
    val relationship: String
)

internal data class SafetySnapshot(
    val enabled: Boolean,
    val checkinTimes: List<String>,
    val timezone: String,
    val nextCheckinAt: String?,
    val contacts: List<SafetyContact>,
    val canWrite: Boolean
)

internal data class FamilyActor(
    val actorPersonId: String,
    val displayName: String,
    val role: String,
    val isPayer: Boolean,
    val canViewUsage: Boolean,
    val canManagePlan: Boolean,
    val managePreferences: Boolean,
    val manageSafety: Boolean,
    val hasWildcardPermission: Boolean
)

internal data class ManagedPerson(
    val id: String,
    val relationship: String,
    val status: String,
    val displayName: String
)

internal data class FamilyInvitation(
    val id: String,
    val firstName: String,
    val lastName: String,
    val relationship: String,
    val preferredLanguage: String,
    val state: String,
    val expiresAt: String?
)

internal data class FamilySnapshot(
    val actors: List<FamilyActor>,
    val managedPeople: List<ManagedPerson>,
    val invitations: List<FamilyInvitation>
)

internal data class CustomerProductSnapshot(
    val profile: CustomerProfile,
    val payg: PaygSnapshot,
    val safety: SafetySnapshot,
    val family: FamilySnapshot
)

internal data class MfaEnrollmentStart(
    val ok: Boolean,
    val enrollmentToken: String? = null,
    val secret: String? = null,
    val uri: String? = null,
    val error: String? = null
)

internal data class MfaEnrollmentResult(
    val ok: Boolean,
    val recoveryCodes: List<String> = emptyList(),
    val error: String? = null
)

internal data class FamilyInvitationInput(
    val firstName: String,
    val lastName: String,
    val relationship: String,
    val whatsappNumber: String,
    val preferredLanguage: String,
    val conciergeChoice: String? = null,
    val formOfAddress: String? = null,
    val personalMessage: String? = null,
    val contactConsentAttested: Boolean
)

internal object ProdCustomerPolicy {
    private val emailPattern = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    private val timePattern = Regex("^(?:[01]\\d|2[0-3]):[0-5]\\d$")

    fun normalizedEmail(value: String): String = value.trim().lowercase()
    fun validEmail(value: String): Boolean = emailPattern.matches(normalizedEmail(value))
    fun validRegistrationPassword(value: String): Boolean = value.length in 15..128
    fun validVerificationCode(value: String): Boolean = value.filter(Char::isDigit).length == 6
    fun validCheckinTimes(values: List<String>, enabled: Boolean): Boolean {
        val clean = values.map(String::trim).filter(String::isNotBlank)
        return clean.size <= 4 && (!enabled || clean.isNotEmpty()) && clean.all(timePattern::matches)
    }

    fun euro(cents: Long, currency: String = "EUR"): String {
        val sign = if (cents < 0) "-" else ""
        val abs = kotlin.math.abs(cents)
        return if (currency.equals("EUR", true)) "$sign${abs / 100},${(abs % 100).toString().padStart(2, '0')} €"
        else "$sign${abs / 100}.${(abs % 100).toString().padStart(2, '0')} $currency"
    }
}
