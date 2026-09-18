import Combine
import Foundation
import Security

enum AllowedUIActionType: String, CaseIterable {
    case signUp = "SIGN_UP"
    case signIn = "SIGN_IN"
    case configureConcierge = "CONFIGURE_CONCIERGE"
    case connectEmail = "CONNECT_EMAIL"
    case configureSafety = "CONFIGURE_SAFETY"
    case showUsage = "SHOW_USAGE"

    static func validated(_ raw: String) -> AllowedUIActionType? {
        AllowedUIActionType(rawValue: raw.trimmingCharacters(in: .whitespacesAndNewlines).uppercased())
    }
}

struct RawUIAction: Codable, Identifiable, Equatable {
    let id: String?
    let type: String
    let label: String?

    var stableID: String {
        id?.isEmpty == false ? id! : "\(type):\(label ?? "")"
    }

    var allowedType: AllowedUIActionType? {
        AllowedUIActionType.validated(type)
    }
}

struct CoreTextMessage: Codable, Equatable {
    let type: String?
    let text: String?
    let semanticRole: String?

    enum CodingKeys: String, CodingKey {
        case type
        case text
        case semanticRole = "semantic_role"
    }
}

struct CoreEnvelope: Codable, Equatable {
    let conversationID: String?
    let responseState: String?
    let messages: [CoreTextMessage]?
    let uiActions: [RawUIAction]?

    enum CodingKeys: String, CodingKey {
        case conversationID = "conversation_id"
        case responseState = "response_state"
        case messages
        case uiActions = "ui_actions"
    }

    var customerText: String {
        (messages ?? [])
            .filter { ($0.type ?? "text").lowercased() == "text" }
            .compactMap { $0.text?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")
    }

    var allowedActions: [RawUIAction] {
        (uiActions ?? []).filter { $0.allowedType != nil }
    }
}

struct AppChatResponse: Codable {
    let ok: Bool?
    let environment: String?
    let authoritative: Bool?
    let core: CoreEnvelope?
    let guestToken: String?

    enum CodingKeys: String, CodingKey {
        case ok
        case environment
        case authoritative
        case core
        case guestToken = "guest_token"
    }
}

struct SessionCheckResponse: Codable {
    let ok: Bool?
    let status: String?
}

struct IdentitySnapshot: Codable {
    let personID: String?
    let customerAccountID: String?
    let customerMemberID: String?

    enum CodingKeys: String, CodingKey {
        case personID = "person_id"
        case customerAccountID = "customer_account_id"
        case customerMemberID = "customer_member_id"
    }
}

struct PersonaSnapshot: Codable {
    let key: String?
    let personaKey: String?
    let displayName: String?
    let name: String?
    let imageURL: String?

    enum CodingKeys: String, CodingKey {
        case key
        case personaKey = "persona_key"
        case displayName = "display_name"
        case name
        case imageURL = "image_url"
    }

    var customerName: String {
        [displayName, name, personaKey, key]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first(where: { !$0.isEmpty }) ?? "NAHWERK Concierge"
    }
}

struct ConversationSnapshot: Codable {
    let conversationID: String?
    let activeTaskID: String?

    enum CodingKeys: String, CodingKey {
        case conversationID = "conversation_id"
        case activeTaskID = "active_task_id"
    }
}

struct AppMeResponse: Codable {
    let ok: Bool?
    let environment: String?
    let authoritative: Bool?
    let identity: IdentitySnapshot?
    let persona: PersonaSnapshot?
    let conversation: ConversationSnapshot?
}

struct LoginResponse: Codable {
    let ok: Bool?
    let status: String?
    let sessionToken: String?
    let customerAccountID: String?
    let expiresAt: String?
    let mfaRequired: Bool?
    let mfaToken: String?
    let mfaMethod: String?
    let mfaMethods: [String]?
    let challengeID: String?
    let maskedPhone: String?

    enum CodingKeys: String, CodingKey {
        case ok
        case status
        case sessionToken = "session_token"
        case customerAccountID = "customer_account_id"
        case expiresAt = "expires_at"
        case mfaRequired = "mfa_required"
        case mfaToken = "mfa_token"
        case mfaMethod = "mfa_method"
        case mfaMethods = "mfa_methods"
        case challengeID = "challenge_id"
        case maskedPhone = "masked_phone"
    }
}

struct RegistrationResponse: Codable {
    let ok: Bool?
    let status: String?
    let requestID: String?

    enum CodingKeys: String, CodingKey {
        case ok
        case status
        case requestID = "request_id"
    }
}

struct HistoryThread: Codable, Identifiable, Equatable {
    let threadID: String
    let title: String?
    let preview: String?
    let updatedAt: String?

    var id: String { threadID }

    enum CodingKeys: String, CodingKey {
        case threadID = "thread_id"
        case title
        case preview
        case updatedAt = "updated_at"
    }
}

struct HistoryThreadsResponse: Codable {
    let ok: Bool?
    let threads: [HistoryThread]?
}

struct HistoryMessage: Codable, Identifiable, Equatable {
    let idValue: String?
    let role: String?
    let content: String?
    let text: String?
    let channel: String?
    let createdAt: String?
    let receivedAt: String?

    var id: String {
        idValue ?? "\(role ?? ""):\(createdAt ?? receivedAt ?? ""):\(content ?? text ?? "")"
    }

    enum CodingKeys: String, CodingKey {
        case idValue = "id"
        case role
        case content
        case text
        case channel
        case createdAt = "created_at"
        case receivedAt = "received_at"
    }

    var customerText: String {
        let raw = content ?? text ?? ""
        return raw.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct HistoryMessagesResponse: Codable {
    let ok: Bool?
    let threadID: String?
    let messages: [HistoryMessage]?

    enum CodingKeys: String, CodingKey {
        case ok
        case threadID = "thread_id"
        case messages
    }
}

enum NAHWERKAPIError: LocalizedError, Equatable {
    case invalidResponse
    case server(String)
    case sessionRequired
    case canonicalNewChatUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "NAHWERK hat keine gültige Antwort geliefert."
        case .server(let code):
            return "Die Anfrage konnte gerade nicht abgeschlossen werden (\(code))."
        case .sessionRequired:
            return "Bitte melde dich erneut an."
        case .canonicalNewChatUnavailable:
            return "Ein neuer gespeicherter Chat kann erst gestartet werden, wenn der zentrale Conversation-Endpunkt freigegeben ist."
        }
    }
}

actor NAHWERKAPI {
    static let production = NAHWERKAPI(
        functionsBaseURL: URL(string: "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1")!
    )

    private let functionsBaseURL: URL
    private let session: URLSession
    private let decoder = JSONDecoder()

    init(functionsBaseURL: URL, session: URLSession = .shared) {
        precondition(functionsBaseURL.scheme == "https")
        precondition(functionsBaseURL.host == "djicahhmnnamtjuqedqd.supabase.co")
        self.functionsBaseURL = functionsBaseURL
        self.session = session
    }

    func login(email: String, password: String) async throws -> LoginResponse {
        try await perform(
            path: "web-login-secure",
            method: "POST",
            json: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), "password": password]
        )
    }

    func beginMFA(token: String, method: String) async throws -> LoginResponse {
        try await perform(
            path: "web-login-secure",
            method: "POST",
            json: ["mfa_token": token, "mfa_method": method]
        )
    }

    func verifyMFA(token: String, method: String, code: String, challengeID: String?) async throws -> LoginResponse {
        var body: [String: Any] = [
            "mfa_token": token,
            "mfa_method": method,
            "code": code.filter(\.isNumber).prefix(6).description
        ]
        if let challengeID, !challengeID.isEmpty {
            body["challenge_id"] = challengeID
        }
        return try await perform(path: "web-login-secure", method: "POST", json: body)
    }

    func checkSession(token: String) async throws -> Bool {
        let response: SessionCheckResponse = try await perform(
            path: "web-session-secure",
            method: "POST",
            token: token,
            json: ["action": "check"]
        )
        return response.ok == true && response.status == "session_valid"
    }

    func logout(token: String) async {
        let _: SessionCheckResponse? = try? await perform(
            path: "web-session-secure",
            method: "POST",
            token: token,
            json: ["action": "logout"]
        )
    }

    func register(firstName: String, lastName: String, email: String, phone: String, password: String) async throws -> RegistrationResponse {
        let cleanFirst = firstName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanLast = lastName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let fullName = [cleanFirst, cleanLast].filter { !$0.isEmpty }.joined(separator: " ")

        return try await perform(
            path: "web-registration-secure",
            method: "POST",
            json: [
                "product": "prime",
                "package": "FREE",
                "registration_type": "self",
                "account_holder_name": fullName,
                "account_holder_salutation": "DU",
                "account_holder_first_name": cleanFirst,
                "account_holder_last_name": cleanLast,
                "email": cleanEmail,
                "phone": cleanPhone,
                "supported_person_name": fullName,
                "supported_person_salutation": "DU",
                "supported_person_first_name": cleanFirst,
                "supported_person_last_name": cleanLast,
                "relationship": "Ich selbst",
                "supported_whatsapp": cleanPhone,
                "form_of_address": "DU",
                "initial_notes": "",
                "contact_consent": true,
                "safety_enabled": false,
                "checkin_times": "",
                "trusted_contact_name": "",
                "trusted_contact_phone": "",
                "account_holder_web_only": false,
                "web_password": password,
                "web_password_repeat": password
            ]
        )
    }

    func verifyRegistration(
        requestID: String,
        verificationCode: String,
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        password: String
    ) async throws -> RegistrationResponse {
        try await perform(
            path: "web-registration-secure",
            method: "POST",
            json: [
                "request_id": requestID,
                "verification_code": verificationCode.filter(\.isNumber).prefix(6).description,
                "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
                "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
                "first_name": firstName.trimmingCharacters(in: .whitespacesAndNewlines),
                "last_name": lastName.trimmingCharacters(in: .whitespacesAndNewlines),
                "web_password": password,
                "web_password_repeat": password
            ]
        )
    }

    func loadMe(token: String) async throws -> AppMeResponse {
        try await perform(path: "nahwerk-app-gateway/mobile/me", method: "GET", token: token)
    }

    func sendAuthenticatedChat(token: String, message: String) async throws -> AppChatResponse {
        try await perform(
            path: "nahwerk-app-gateway/mobile/chat",
            method: "POST",
            token: token,
            json: [
                "message": message,
                "source_message_id": UUID().uuidString.lowercased(),
                "correlation_id": "ios-\(UUID().uuidString.lowercased())"
            ]
        )
    }

    func transcribeVoiceMemo(token: String, fileURL: URL) async throws -> String {
        let audio = try Data(contentsOf: fileURL)
        guard !audio.isEmpty, audio.count <= 8 * 1024 * 1024 else {
            throw NAHWERKAPIError.server("AUDIO_SIZE_INVALID")
        }

        let url = functionsBaseURL.appendingPathComponent("nahwerk-audio-input")
        guard url.scheme == "https", url.host == "djicahhmnnamtjuqedqd.supabase.co" else {
            throw NAHWERKAPIError.invalidResponse
        }

        let boundary = "nahwerk-voice-\(UUID().uuidString.lowercased())"
        var body = Data()

        func append(_ value: String) {
            if let data = value.data(using: .utf8) {
                body.append(data)
            }
        }

        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"audio\"; filename=\"voice-memo.m4a\"\r\n")
        append("Content-Type: audio/mp4\r\n\r\n")
        body.append(audio)
        append("\r\n--\(boundary)--\r\n")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 55
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw NAHWERKAPIError.invalidResponse
        }
        if http.statusCode == 401 {
            throw NAHWERKAPIError.sessionRequired
        }
        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let code = (object?["error"] as? String) ?? "HTTP_\(http.statusCode)"
            throw NAHWERKAPIError.server(code)
        }

        guard let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              object["ok"] as? Bool == true,
              let transcript = object["transcript"] as? String else {
            throw NAHWERKAPIError.invalidResponse
        }

        let clean = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else {
            throw NAHWERKAPIError.invalidResponse
        }
        return clean
    }

    func sendGuestChat(message: String) async throws -> AppChatResponse {
        let cleanMessage = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanMessage.isEmpty else {
            throw NAHWERKAPIError.invalidResponse
        }

        let installationID = GuestCredentialStore.installationID()
        let existingToken = GuestCredentialStore.guestToken()

        func request(guestToken: String?) async throws -> AppChatResponse {
            var body: [String: Any] = [
                "message": cleanMessage,
                "installation_id": installationID,
                "source_message_id": UUID().uuidString.lowercased(),
                "correlation_id": "ios-guest-\(UUID().uuidString.lowercased())"
            ]
            if let guestToken, !guestToken.isEmpty {
                body["guest_token"] = guestToken
            }

            return try await perform(
                path: "nahwerk-app-gateway/mobile/guest-chat",
                method: "POST",
                json: body
            )
        }

        func persist(_ response: AppChatResponse) -> AppChatResponse {
            if let token = response.guestToken, !token.isEmpty {
                GuestCredentialStore.setGuestToken(token)
            }
            return response
        }

        do {
            return persist(try await request(guestToken: existingToken))
        } catch NAHWERKAPIError.sessionRequired where existingToken != nil {
            GuestCredentialStore.clearGuestToken()
            return persist(try await request(guestToken: nil))
        } catch let error as NAHWERKAPIError {
            if existingToken != nil,
               case .server(let code) = error,
               ["GUEST_SESSION_INVALID", "GUEST_SESSION_EXPIRED"].contains(code) {
                GuestCredentialStore.clearGuestToken()
                return persist(try await request(guestToken: nil))
            }
            throw error
        }
    }

    func historyThreads(token: String) async throws -> [HistoryThread] {
        let response: HistoryThreadsResponse = try await perform(
            path: "nahwerk-web-gateway/web/history",
            method: "GET",
            token: token
        )
        return response.threads ?? []
    }

    func historyMessages(token: String, threadID: String) async throws -> [HistoryMessage] {
        let response: HistoryMessagesResponse = try await perform(
            path: "nahwerk-web-gateway/web/history",
            method: "GET",
            token: token,
            query: [URLQueryItem(name: "thread_id", value: threadID)]
        )
        return response.messages ?? []
    }

    func perform<T: Decodable>(
        path: String,
        method: String,
        token: String? = nil,
        json: [String: Any]? = nil,
        query: [URLQueryItem] = []
    ) async throws -> T {
        var components = URLComponents(
            url: functionsBaseURL.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        )
        if !query.isEmpty {
            components?.queryItems = query
        }
        guard let url = components?.url else {
            throw NAHWERKAPIError.invalidResponse
        }

        guard url.scheme == "https", url.host == "djicahhmnnamtjuqedqd.supabase.co" else {
            throw NAHWERKAPIError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 40
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")

        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let json {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: json)
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw NAHWERKAPIError.invalidResponse
        }

        if http.statusCode == 401 {
            throw NAHWERKAPIError.sessionRequired
        }

        guard (200..<300).contains(http.statusCode) else {
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let code = (object?["error"] as? String) ?? (object?["status"] as? String) ?? "HTTP_\(http.statusCode)"
            throw NAHWERKAPIError.server(code)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NAHWERKAPIError.invalidResponse
        }
    }
}


enum GuestCredentialStore {
    private static let service = "NAHWERK_GUEST_V1"
    private static let installationAccount = "installation"
    private static let tokenAccount = "guest-token"

    static func installationID() -> String {
        if let existing = read(account: installationAccount), !existing.isEmpty {
            return existing
        }
        let created = UUID().uuidString.lowercased()
        write(created, account: installationAccount)
        return created
    }

    static func guestToken() -> String? {
        read(account: tokenAccount)
    }

    static func setGuestToken(_ token: String) {
        guard !token.isEmpty else { return }
        write(token, account: tokenAccount)
    }

    static func clearGuestToken() {
        delete(account: tokenAccount)
    }

    private static func read(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    private static func write(_ value: String, account: String) {
        guard let data = value.data(using: .utf8) else { return }
        let key: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let attrs: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemUpdate(key as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            var insert = key
            attrs.forEach { insert[$0.key] = $0.value }
            SecItemAdd(insert as CFDictionary, nil)
        }
    }

    private static func delete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}

struct PendingMFA: Codable, Equatable {
    var token: String
    var method: String
    var methods: [String]
    var challengeID: String?
    var maskedPhone: String?
}

struct StoredSession: Codable, Equatable {
    var token: String?
    var expiresAt: Date?
    var customerAccountID: String?
    var pendingMFA: PendingMFA?
}

@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var state = StoredSession()

    private static let service = "NAHWERK_SESSION_V1"
    private static let account = "customer"

    init() {
        state = Self.loadKeychain() ?? StoredSession()
        if let expiresAt = state.expiresAt, expiresAt <= Date() {
            clear()
        }
    }

    var isAuthenticated: Bool {
        validToken != nil
    }

    var validToken: String? {
        guard let token = state.token, !token.isEmpty,
              let expiresAt = state.expiresAt, expiresAt > Date() else {
            return nil
        }
        return token
    }

    func apply(_ response: LoginResponse) {
        if response.status == "logged_in",
           response.ok == true,
           let token = response.sessionToken,
           let expires = Self.parseISO(response.expiresAt) {
            state = StoredSession(
                token: token,
                expiresAt: expires,
                customerAccountID: response.customerAccountID,
                pendingMFA: nil
            )
            persist()
            return
        }

        if (response.status == "mfa_required" || response.status == "mfa_challenge_ready"),
           let mfaToken = response.mfaToken {
            state.pendingMFA = PendingMFA(
                token: mfaToken,
                method: response.mfaMethod ?? "choice",
                methods: response.mfaMethods ?? [],
                challengeID: response.challengeID,
                maskedPhone: response.maskedPhone
            )
            persist()
        }
    }

    func updatePendingMFA(from response: LoginResponse) {
        guard let token = response.mfaToken ?? state.pendingMFA?.token else { return }
        state.pendingMFA = PendingMFA(
            token: token,
            method: response.mfaMethod ?? state.pendingMFA?.method ?? "choice",
            methods: response.mfaMethods ?? state.pendingMFA?.methods ?? [],
            challengeID: response.challengeID ?? state.pendingMFA?.challengeID,
            maskedPhone: response.maskedPhone ?? state.pendingMFA?.maskedPhone
        )
        persist()
    }

    func clear() {
        state = StoredSession()
        Self.deleteKeychain()
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(state) else { return }
        Self.writeKeychain(data)
    }

    private static func parseISO(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
    }

    private static func loadKeychain() -> StoredSession? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else {
            return nil
        }
        return try? JSONDecoder().decode(StoredSession.self, from: data)
    }

    private static func writeKeychain(_ data: Data) {
        let key: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let attrs: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemUpdate(key as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            var insert = key
            attrs.forEach { insert[$0.key] = $0.value }
            SecItemAdd(insert as CFDictionary, nil)
        }
    }

    private static func deleteKeychain() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}
