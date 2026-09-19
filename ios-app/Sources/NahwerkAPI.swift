import Foundation

enum NahwerkAPIError: LocalizedError {
    case invalidResponse
    case server(String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "NAHWERK hat eine ungültige Antwort geliefert."
        case .server(let message): return message
        case .unauthorized: return "Deine Sitzung ist nicht mehr gültig."
        }
    }
}

struct LoginResult {
    let authenticated: Bool
    let mfaRequired: Bool
    let status: String
}

struct ChatReply {
    let text: String
    let responseState: String
}

struct ChatHistoryMessage: Identifiable {
    let id: String
    let role: String
    let text: String
    let channel: String
    let at: String
}

struct ChatHistoryThread {
    let id: String
    let title: String
    let channels: [String]
}

struct ChannelHistoryResult {
    let hasCalls: Bool
    let hasEmail: Bool
    let messages: [ChatHistoryMessage]
}

final class NahwerkAPI {
    static let shared = NahwerkAPI()

    private let functionsBase = URL(string: "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/")!
    private let gatewayBase = URL(string: "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-app-gateway/")!
    private let session = URLSession(configuration: .ephemeral)

    private init() {}

    func login(email: String, password: String, store: SessionStore) async throws -> LoginResult {
        let body: [String: Any] = ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), "password": password]
        let json = try await request(url: functionsBase.appendingPathComponent("web-login-secure"), method: "POST", body: body)
        return try await MainActor.run { try applyLogin(json, store: store) }
    }

    func beginMFA(method: String, store: SessionStore) async throws -> LoginResult {
        guard let token = await MainActor.run(body: { store.pendingMfaToken }) else { throw NahwerkAPIError.invalidResponse }
        let body: [String: Any] = ["mfa_token": token, "mfa_method": method]
        let json = try await request(url: functionsBase.appendingPathComponent("web-login-secure"), method: "POST", body: body)
        return try await MainActor.run { try applyLogin(json, store: store) }
    }

    func verifyMFA(code: String, store: SessionStore) async throws -> LoginResult {
        let state = await MainActor.run { (store.pendingMfaToken, store.pendingMfaMethod, store.pendingChallengeId) }
        guard let token = state.0, let method = state.1, method != "choice" else { throw NahwerkAPIError.invalidResponse }
        var body: [String: Any] = [
            "mfa_token": token,
            "mfa_method": method,
            "code": String(code.filter(\.isNumber).prefix(6))
        ]
        if let challenge = state.2 { body["challenge_id"] = challenge }
        let json = try await request(url: functionsBase.appendingPathComponent("web-login-secure"), method: "POST", body: body)
        return try await MainActor.run { try applyLogin(json, store: store) }
    }

    func guestChat(message: String) async throws -> ChatReply {
        let defaults = UserDefaults.standard
        let installationKey = "nahwerk-ios-installation-id"
        let guestKey = "nahwerk-ios-guest-token"
        let installation = defaults.string(forKey: installationKey) ?? "ios-" + UUID().uuidString.lowercased()
        defaults.set(installation, forKey: installationKey)
        var body: [String: Any] = [
            "message": message,
            "installation_id": installation,
            "source_message_id": "ios-guest-" + UUID().uuidString.lowercased()
        ]
        if let guest = defaults.string(forKey: guestKey), !guest.isEmpty { body["guest_token"] = guest }
        let json = try await request(url: gatewayBase.appendingPathComponent("mobile/guest-chat"), method: "POST", body: body)
        if let guest = json["guest_token"] as? String, !guest.isEmpty { defaults.set(guest, forKey: guestKey) }
        return try parseChat(json)
    }

    func chat(message: String, store: SessionStore) async throws -> ChatReply {
        guard let token = await MainActor.run(body: { store.sessionToken }) else { throw NahwerkAPIError.unauthorized }
        let body: [String: Any] = [
            "message": message,
            "source_message_id": "ios-" + UUID().uuidString.lowercased(),
            "correlation_id": "ios:" + UUID().uuidString.lowercased()
        ]
        let json = try await request(url: gatewayBase.appendingPathComponent("mobile/chat"), method: "POST", body: body, bearer: token)
        return try parseChat(json)
    }

    func loadHome(store: SessionStore) async throws -> [String: Any] {
        guard let token = await MainActor.run(body: { store.sessionToken }) else { throw NahwerkAPIError.unauthorized }
        return try await request(url: gatewayBase.appendingPathComponent("mobile/me"), method: "GET", bearer: token)
    }

    func loadHistoryThreads(store: SessionStore) async throws -> [ChatHistoryThread] {
        guard let token = await MainActor.run(body: { store.sessionToken }) else { throw NahwerkAPIError.unauthorized }
        let json = try await request(url: gatewayBase.appendingPathComponent("mobile/history"), method: "GET", bearer: token)
        let rows = json["threads"] as? [[String: Any]] ?? []
        return rows.compactMap { row in
            guard let id = row["thread_id"] as? String, !id.isEmpty else { return nil }
            let channels = row["channels"] as? [String] ?? []
            return ChatHistoryThread(
                id: id,
                title: (row["title"] as? String) ?? "Chat",
                channels: channels.map { $0.uppercased() }
            )
        }
    }

    func loadHistoryMessages(threadId: String, store: SessionStore) async throws -> [ChatHistoryMessage] {
        guard let token = await MainActor.run(body: { store.sessionToken }) else { throw NahwerkAPIError.unauthorized }
        var components = URLComponents(url: gatewayBase.appendingPathComponent("mobile/history"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "thread_id", value: threadId)]
        guard let url = components.url else { throw NahwerkAPIError.invalidResponse }
        let json = try await request(url: url, method: "GET", bearer: token)
        return parseHistoryMessages(json["messages"])
    }

    func loadChannelHistory(channel: String, store: SessionStore, summaryOnly: Bool = false) async throws -> ChannelHistoryResult {
        guard let token = await MainActor.run(body: { store.sessionToken }) else { throw NahwerkAPIError.unauthorized }
        var components = URLComponents(url: gatewayBase.appendingPathComponent("mobile/channel-history"), resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "channel", value: channel.uppercased())]
        if summaryOnly { items.append(URLQueryItem(name: "summary", value: "1")) }
        components.queryItems = items
        guard let url = components.url else { throw NahwerkAPIError.invalidResponse }
        let json = try await request(url: url, method: "GET", bearer: token)
        return ChannelHistoryResult(
            hasCalls: (json["has_calls"] as? Bool) == true,
            hasEmail: (json["has_email"] as? Bool) == true,
            messages: parseHistoryMessages(json["messages"])
        )
    }

    private func parseHistoryMessages(_ value: Any?) -> [ChatHistoryMessage] {
        let rows = value as? [[String: Any]] ?? []
        return rows.compactMap { row in
            guard
                let role = row["role"] as? String,
                let text = row["text"] as? String,
                !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            else { return nil }
            return ChatHistoryMessage(
                id: (row["id"] as? String) ?? UUID().uuidString.lowercased(),
                role: role.lowercased(),
                text: text,
                channel: ((row["channel"] as? String) ?? "").uppercased(),
                at: (row["at"] as? String) ?? ""
            )
        }
    }

    @MainActor
    private func applyLogin(_ json: [String: Any], store: SessionStore) throws -> LoginResult {
        guard (json["ok"] as? Bool) == true else {
            throw NahwerkAPIError.server((json["status"] as? String) ?? "Anmeldung fehlgeschlagen.")
        }
        let status = (json["status"] as? String) ?? ""
        switch status {
        case "logged_in":
            guard let token = json["session_token"] as? String, !token.isEmpty else { throw NahwerkAPIError.invalidResponse }
            store.saveSession(token)
            return LoginResult(authenticated: true, mfaRequired: false, status: status)
        case "mfa_required", "mfa_challenge_ready":
            guard let token = json["mfa_token"] as? String, !token.isEmpty else { throw NahwerkAPIError.invalidResponse }
            let methods = json["mfa_methods"] as? [String] ?? []
            store.savePendingMfa(
                token: token,
                method: json["mfa_method"] as? String ?? "choice",
                methods: methods,
                challengeId: json["challenge_id"] as? String,
                maskedPhone: json["masked_phone"] as? String
            )
            return LoginResult(authenticated: false, mfaRequired: true, status: status)
        default:
            throw NahwerkAPIError.server("Die Anmeldung konnte nicht abgeschlossen werden.")
        }
    }

    private func parseChat(_ json: [String: Any]) throws -> ChatReply {
        guard (json["ok"] as? Bool) == true, let core = json["core"] as? [String: Any] else {
            let message = (json["error"] as? String) ?? "Der Concierge ist gerade nicht erreichbar."
            throw NahwerkAPIError.server(message)
        }
        let messages = core["messages"] as? [[String: Any]] ?? []
        let text = messages.compactMap { $0["text"] as? String }.filter { !$0.isEmpty }.joined(separator: "\n")
        guard !text.isEmpty else { throw NahwerkAPIError.invalidResponse }
        return ChatReply(text: text, responseState: core["response_state"] as? String ?? "UNKNOWN")
    }

    private func request(url: URL, method: String, body: [String: Any]? = nil, bearer: String? = nil) async throws -> [String: Any] {
        guard url.scheme == "https", url.host == "djicahhmnnamtjuqedqd.supabase.co" else { throw NahwerkAPIError.invalidResponse }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 35
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        if let bearer { request.setValue("Bearer " + bearer, forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NahwerkAPIError.invalidResponse }
        let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        if http.statusCode == 401 { throw NahwerkAPIError.unauthorized }
        guard (200...299).contains(http.statusCode) else {
            throw NahwerkAPIError.server((object["error"] as? String) ?? (object["status"] as? String) ?? "NAHWERK ist gerade nicht erreichbar.")
        }
        return object
    }
}
