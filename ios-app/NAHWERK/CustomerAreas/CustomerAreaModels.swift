import Foundation

struct CustomerProfileValue: Codable, Equatable {
    let firstName: String?
    let lastName: String?
    let email: String?
    let whatsappNumber: String?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case email
        case whatsappNumber = "whatsapp_number"
    }
}

struct CustomerPlanValue: Codable, Equatable {
    let code: String?
    let name: String?
    let monthlyPriceCents: Int?
    let appDialogueLimit: Int?
    let whatsappDialogueLimit: Int?

    enum CodingKeys: String, CodingKey {
        case code
        case name
        case monthlyPriceCents = "monthly_price_cents"
        case appDialogueLimit = "app_dialogue_limit"
        case whatsappDialogueLimit = "whatsapp_dialogue_limit"
    }
}

struct CustomerUsageValue: Codable, Equatable {
    let appDialoguesUsed: Int?
    let whatsappDialoguesUsed: Int?
    let periodStart: String?
    let periodEnd: String?

    enum CodingKeys: String, CodingKey {
        case appDialoguesUsed = "app_dialogues_used"
        case whatsappDialoguesUsed = "whatsapp_dialogues_used"
        case periodStart = "period_start"
        case periodEnd = "period_end"
    }
}

struct CustomerProfileResponse: Codable {
    let ok: Bool?
    let customerNumber: String?
    let profile: CustomerProfileValue?
    let plan: CustomerPlanValue?
    let usage: CustomerUsageValue?

    enum CodingKeys: String, CodingKey {
        case ok
        case customerNumber = "customer_number"
        case profile
        case plan
        case usage
    }
}

struct SafetyContactValue: Codable, Equatable {
    let name: String?
    let phone: String?
    let relationship: String?
}

struct SafetyValue: Codable, Equatable {
    let enabled: Bool?
    let checkinTimes: [String]?
    let timezone: String?
    let nextCheckinAt: String?
    let contacts: [SafetyContactValue]?

    enum CodingKeys: String, CodingKey {
        case enabled
        case checkinTimes = "checkin_times"
        case timezone
        case nextCheckinAt = "next_checkin_at"
        case contacts
    }
}

struct SafetyResponse: Codable {
    let ok: Bool?
    let safety: SafetyValue?
    let canWrite: Bool?

    enum CodingKeys: String, CodingKey {
        case ok
        case safety
        case canWrite = "can_write"
    }
}

struct EmailAccountValue: Codable, Identifiable, Equatable {
    let connectionID: String?
    let provider: String?
    let providerLabel: String?
    let accountDisplayHint: String?
    let state: String?
    let status: String?

    var id: String {
        connectionID ?? "\(provider ?? "email"):\(accountDisplayHint ?? "")"
    }

    var isConnected: Bool {
        (state ?? status ?? "").uppercased() == "CONNECTED"
    }

    enum CodingKeys: String, CodingKey {
        case connectionID = "connection_id"
        case provider
        case providerLabel = "provider_label"
        case accountDisplayHint = "account_display_hint"
        case state
        case status
    }
}

struct EmailAccountsResponse: Codable {
    let ok: Bool?
    let accounts: [EmailAccountValue]?
}

struct EmailSummaryValue: Codable, Equatable {
    let recent: Int?
    let today: Int?
    let unread: Int?
    let important: Int?
    let needsReply: Int?
    let invoices: Int?

    enum CodingKeys: String, CodingKey {
        case recent
        case today
        case unread
        case important
        case needsReply = "needs_reply"
        case invoices
    }
}

struct EmailDashboardResponse: Codable {
    let ok: Bool?
    let summary: EmailSummaryValue?
}

extension NAHWERKAPI {
    func loadCustomerProfile(token: String) async throws -> CustomerProfileResponse {
        try await perform(path: "web-profile", method: "GET", token: token)
    }

    func loadSafety(token: String) async throws -> SafetyResponse {
        try await perform(path: "web-managed-safety-context", method: "GET", token: token)
    }

    func loadEmailAccounts(token: String) async throws -> EmailAccountsResponse {
        try await perform(
            path: "nahwerk-email-runtime/email/concierge/accounts-overview",
            method: "GET",
            token: token
        )
    }

    func loadEmailDashboard(token: String) async throws -> EmailDashboardResponse {
        try await perform(
            path: "nahwerk-email-runtime/email/concierge/dashboard",
            method: "GET",
            token: token
        )
    }
}
